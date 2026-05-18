import { NextResponse } from "next/server";

import { getAiCreditPack } from "@/lib/ai-credits";
import { getAiCreditBalanceForMenuSite, purchaseAiCredits } from "@/lib/server/ai-credits-service";
import { portOneMockEnabled, requirePortOneApiSecret } from "@/lib/portone";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";

export const runtime = "nodejs";

type CompleteAiCreditPurchaseRequest = {
  paymentId?: unknown;
  productKey?: unknown;
  product_key?: unknown;
  menuSiteId?: unknown;
};

type PortOnePayment = {
  id?: string;
  paymentId?: string;
  status?: string;
  orderName?: string;
  currency?: string;
  amount?: number | {
    total?: number;
    paid?: number;
  };
  paidAmount?: number;
  customData?: Record<string, unknown>;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, message }, { status });
}

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getPaymentAmount(payment: PortOnePayment) {
  if (typeof payment.amount === "number") return payment.amount;
  if (typeof payment.amount?.total === "number") return payment.amount.total;
  if (typeof payment.amount?.paid === "number") return payment.amount.paid;
  if (typeof payment.paidAmount === "number") return payment.paidAmount;
  return null;
}

async function getPortOnePayment(paymentId: string) {
  const apiSecret = requirePortOneApiSecret();
  const response = await fetch(`https://api.portone.io/payments/${encodeURIComponent(paymentId)}`, {
    method: "GET",
    headers: {
      Authorization: `PortOne ${apiSecret}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`PortOne 결제 조회에 실패했습니다. 상태 코드: ${response.status}`);
  }

  return (await response.json()) as PortOnePayment;
}

function createMockPortOnePayment(paymentId: string, productKey: string, amount: number) {
  if (!portOneMockEnabled || !paymentId.startsWith("mock_ai_credit_")) {
    throw new Error("mock AI 크레딧 결제 검증은 development 환경에서 PORTONE_MOCK_ENABLED=true와 mock_ai_credit_ paymentId로만 사용할 수 있습니다.");
  }

  return {
    id: paymentId,
    paymentId,
    status: "PAID",
    currency: "KRW",
    amount,
    customData: {
      product_key: productKey,
      payment_type: "one_time",
      purpose: "ai_credit_purchase",
      mock: true,
    },
  } satisfies PortOnePayment;
}

async function verifyAiCreditPayment(paymentId: string, productKey: string, amount: number) {
  const payment = portOneMockEnabled && paymentId.startsWith("mock_ai_credit_")
    ? createMockPortOnePayment(paymentId, productKey, amount)
    : await getPortOnePayment(paymentId);
  const verifiedPaymentId = payment.id ?? payment.paymentId;
  const verifiedAmount = getPaymentAmount(payment);
  const customData = payment.customData as Record<string, unknown> | undefined;
  const customProductKey = customData?.["product_key"] ?? customData?.["productKey"];
  const customPurpose = customData?.["purpose"];

  if (verifiedPaymentId && verifiedPaymentId !== paymentId) {
    throw new Error("조회한 결제 ID가 요청한 paymentId와 일치하지 않습니다.");
  }

  if (payment.status !== "PAID") {
    throw new Error(`결제가 완료 상태가 아닙니다. 현재 상태: ${payment.status ?? "unknown"}`);
  }

  if (verifiedAmount !== amount) {
    throw new Error(`결제 금액이 일치하지 않습니다. 요청 금액: ${amount}, 결제 금액: ${verifiedAmount ?? "unknown"}`);
  }

  if (payment.currency && payment.currency !== "KRW" && payment.currency !== "CURRENCY_KRW") {
    throw new Error(`결제 통화가 일치하지 않습니다. 결제 통화: ${payment.currency}`);
  }

  if (customProductKey && customProductKey !== productKey) {
    throw new Error("결제 요청의 product_key와 완료 요청의 product_key가 일치하지 않습니다.");
  }

  if (customPurpose && customPurpose !== "ai_credit_purchase") {
    throw new Error("AI 크레딧 충전 결제가 아닙니다.");
  }

  return payment;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return jsonError("로그인이 필요합니다.", 401);
  }

  let body: CompleteAiCreditPurchaseRequest;

  try {
    body = (await request.json()) as CompleteAiCreditPurchaseRequest;
  } catch {
    return jsonError("요청 본문이 올바른 JSON이 아닙니다.");
  }

  const paymentId = getString(body.paymentId);
  const productKey = getString(body.product_key) || getString(body.productKey);
  const menuSiteId = getString(body.menuSiteId);
  const product = getAiCreditPack(productKey);

  if (!paymentId) return jsonError("paymentId가 없습니다.");
  if (!menuSiteId) return jsonError("AI 크레딧을 충전할 메뉴판 정보가 없습니다.");
  if (!product) return jsonError("AI 크레딧 충전 상품이 올바르지 않습니다.");

  const adminSupabase = createAdminClient();
  const { data: menuSite, error: menuSiteError } = await adminSupabase
    .from("menu_sites")
    .select("id, user_id")
    .eq("id", menuSiteId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (menuSiteError) return jsonError(`메뉴판 확인에 실패했습니다: ${menuSiteError.message}`, 500);
  if (!menuSite) return jsonError("AI 크레딧을 충전할 수 있는 메뉴판을 찾지 못했습니다.", 404);

  const { data: existingTransaction, error: existingTransactionError } = await adminSupabase
    .from("ai_credit_transactions" as never)
    .select("id")
    .eq("payment_id" as never, paymentId as never)
    .eq("transaction_type" as never, "purchase" as never)
    .maybeSingle();

  if (existingTransactionError) {
    return jsonError(`AI 크레딧 결제 이력 확인에 실패했습니다: ${existingTransactionError.message}`, 500);
  }

  if (existingTransaction) {
    const balance = await getAiCreditBalanceForMenuSite(menuSiteId);
    return NextResponse.json({
      ok: true,
      message: "이미 처리된 AI 크레딧 충전 결제입니다.",
      alreadyProcessed: true,
      balance,
    });
  }

  try {
    await verifyAiCreditPayment(paymentId, product.productKey, product.amount);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "AI 크레딧 결제 검증에 실패했습니다.", 502);
  }

  const rawPayload = {
    payment_type: product.paymentType,
    product_key: product.productKey,
    credits: product.credits,
    purpose: "ai_credit_purchase",
  } satisfies Json;

  const { data: order, error: orderError } = await adminSupabase
    .from("orders")
    .insert({
      user_id: user.id,
      menu_site_id: menuSiteId,
      product_key: product.productKey,
      order_name: product.name,
      payment_id: paymentId,
      buyer_email: user.email,
      status: "paid",
      total_amount: product.amount,
      raw_payload: rawPayload,
    })
    .select("id")
    .single();

  if (orderError || !order) {
    return jsonError(`AI 크레딧 주문 기록 저장에 실패했습니다: ${orderError?.message ?? "unknown"}`, 500);
  }

  const { error: paymentError } = await adminSupabase.from("payments").insert({
    user_id: user.id,
    order_id: (order as { id: string }).id,
    product_key: product.productKey,
    payment_id: paymentId,
    portone_payment_id: paymentId,
    status: "paid",
    amount: product.amount,
    raw_payload: rawPayload,
  });

  if (paymentError) {
    return jsonError(`AI 크레딧 결제 기록 저장에 실패했습니다: ${paymentError.message}`, 500);
  }

  try {
    const balance = await purchaseAiCredits({
      adminSupabase,
      userId: user.id,
      menuSiteId,
      credits: product.credits,
      productKey: product.productKey,
      paymentId,
      orderId: (order as { id: string }).id,
    });

    return NextResponse.json({
      ok: true,
      message: "AI 크레딧 충전이 완료되었습니다.",
      productKey: product.productKey,
      credits: product.credits,
      balance,
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "AI 크레딧 충전 처리에 실패했습니다.", 500);
  }
}
