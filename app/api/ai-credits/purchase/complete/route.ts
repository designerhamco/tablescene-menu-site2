import { NextResponse } from "next/server";

import { getAiCreditPack } from "@/lib/ai-credits";
import { getAiCreditBalanceForUser, purchaseAiCredits } from "@/lib/server/ai-credits-service";
import { createInAppNotificationOnce } from "@/lib/server/in-app-notification-service";
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

type DebugStep =
  | "auth_user_check"
  | "request_body_parse"
  | "product_key_validation"
  | "context_menu_site_check"
  | "portone_payment_fetch"
  | "portone_payment_status_check"
  | "amount_validation"
  | "duplicate_payment_check"
  | "order_upsert_or_insert"
  | "payment_upsert_or_insert"
  | "ai_credit_grant_rpc"
  | "ai_credit_transaction_check"
  | "final_response";

type SafeError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

type DebugContext = {
  step: DebugStep;
  debugCode: string;
  productKey?: string;
  paymentId?: string;
  userId?: string;
  error?: SafeError | Error | null;
  portoneStatus?: string;
  portoneMessage?: string;
  expectedAmount?: number;
  actualAmount?: number | null;
};

const AI_CREDIT_PROCESSING_MESSAGE =
  "AI 크레딧 결제 확인 중 문제가 발생했습니다. 결제가 완료되었는데 크레딧이 반영되지 않았다면 고객지원으로 문의해주세요.";

async function createAiCreditPurchasedNotification({
  userId,
  paymentId,
  orderId,
  productKey,
  credits,
  balance,
}: {
  userId: string;
  paymentId: string;
  orderId?: string | null;
  productKey: string;
  credits: number;
  balance: {
    totalRemainingCredits: number;
    remainingCredits: number;
  };
}) {
  try {
    const result = await createInAppNotificationOnce({
      userId,
      eventType: "ai_credit_purchased",
      title: "AI 크레딧이 충전되었습니다.",
      message: `AI 크레딧 ${credits.toLocaleString("ko-KR")}개가 계정에 충전되었습니다.`,
      href: "/mypage?tab=ai-credits",
      periodKey: `ai_credit_purchased:${paymentId}`,
      metadata: {
        payment_id: paymentId,
        order_id: orderId ?? null,
        product_key: productKey,
        credits,
        balance: {
          total_remaining_credits: balance.totalRemainingCredits,
          remaining_credits: balance.remainingCredits,
        },
      },
    });

    if (!result.ok) {
      console.error("[ai-credits/purchase/complete] ai_credit_purchased in-app notification failed", {
        userId,
        paymentId,
        orderId,
        error: result.error,
      });
    }
  } catch (error) {
    console.error("[ai-credits/purchase/complete] ai_credit_purchased in-app notification failed", {
      userId,
      paymentId,
      orderId,
      error: error instanceof Error ? error.message : error,
    });
  }
}

function readSafeError(error: SafeError | Error | null | undefined) {
  const source = error as SafeError | undefined;
  return {
    code: source?.code,
    message: error?.message,
    details: source?.details,
    hint: source?.hint,
  };
}

function jsonError(message: string, status = 400, context?: DebugContext) {
  const payload: Record<string, unknown> = { ok: false, message };

  if (process.env.NODE_ENV !== "production" && context) {
    const safeError = readSafeError(context.error);
    payload.step = context.step;
    payload.debugCode = context.debugCode;
    payload.safeDebug = {
      productKey: context.productKey,
      hasPaymentId: Boolean(context.paymentId),
      paymentId: context.paymentId,
      hasUserId: Boolean(context.userId),
      supabaseCode: safeError.code,
      supabaseMessage: safeError.message,
      supabaseDetails: safeError.details,
      supabaseHint: safeError.hint,
      portoneStatus: context.portoneStatus,
      portoneMessage: context.portoneMessage,
      expectedAmount: context.expectedAmount,
      actualAmount: context.actualAmount,
    };
  }

  return NextResponse.json(payload, { status });
}

function aiCreditProcessingError(context: DebugContext, status = 500) {
  logSafeAiCreditError(context);
  return jsonError(AI_CREDIT_PROCESSING_MESSAGE, status, context);
}

function logSafeAiCreditError({
  step,
  debugCode,
  error,
  productKey,
  paymentId,
  userId,
  portoneStatus,
  portoneMessage,
}: {
  step: string;
  debugCode?: string;
  error?: SafeError | Error | null | undefined;
  productKey?: string;
  paymentId?: string;
  userId?: string;
  portoneStatus?: string;
  portoneMessage?: string;
}) {
  const safeError = readSafeError(error);
  console.error("[ai-credits/purchase/complete]", {
    step,
    debugCode,
    userId,
    paymentId,
    productKey,
    supabaseCode: safeError.code,
    supabaseMessage: safeError.message,
    supabaseDetails: safeError.details,
    supabaseHint: safeError.hint,
    portoneStatus,
    portoneMessage,
    hasPaymentId: Boolean(paymentId),
    hasUserId: Boolean(userId),
  });
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

class PortOneVerificationError extends Error {
  step: DebugStep;
  debugCode: string;
  portoneStatus?: string;
  actualAmount?: number | null;

  constructor({
    message,
    step,
    debugCode,
    portoneStatus,
    actualAmount,
  }: {
    message: string;
    step: DebugStep;
    debugCode: string;
    portoneStatus?: string;
    actualAmount?: number | null;
  }) {
    super(message);
    this.step = step;
    this.debugCode = debugCode;
    this.portoneStatus = portoneStatus;
    this.actualAmount = actualAmount;
  }
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
    throw new PortOneVerificationError({
      message: `PortOne 결제 조회에 실패했습니다. 상태 코드: ${response.status}`,
      step: "portone_payment_fetch",
      debugCode: "PORTONE_PAYMENT_FETCH_FAILED",
      portoneStatus: String(response.status),
    });
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
    throw new PortOneVerificationError({
      message: "조회한 결제 ID가 요청한 paymentId와 일치하지 않습니다.",
      step: "portone_payment_fetch",
      debugCode: "PORTONE_PAYMENT_ID_MISMATCH",
      portoneStatus: payment.status,
      actualAmount: verifiedAmount,
    });
  }

  if (payment.status !== "PAID") {
    throw new PortOneVerificationError({
      message: `결제가 완료 상태가 아닙니다. 현재 상태: ${payment.status ?? "unknown"}`,
      step: "portone_payment_status_check",
      debugCode: "PORTONE_PAYMENT_NOT_PAID",
      portoneStatus: payment.status,
      actualAmount: verifiedAmount,
    });
  }

  if (verifiedAmount !== amount) {
    throw new PortOneVerificationError({
      message: `결제 금액이 일치하지 않습니다. 요청 금액: ${amount}, 결제 금액: ${verifiedAmount ?? "unknown"}`,
      step: "amount_validation",
      debugCode: "PORTONE_AMOUNT_MISMATCH",
      portoneStatus: payment.status,
      actualAmount: verifiedAmount,
    });
  }

  if (payment.currency && payment.currency !== "KRW" && payment.currency !== "CURRENCY_KRW") {
    throw new PortOneVerificationError({
      message: `결제 통화가 일치하지 않습니다. 결제 통화: ${payment.currency}`,
      step: "amount_validation",
      debugCode: "PORTONE_CURRENCY_MISMATCH",
      portoneStatus: payment.status,
      actualAmount: verifiedAmount,
    });
  }

  if (customProductKey && customProductKey !== productKey) {
    throw new PortOneVerificationError({
      message: "결제 요청의 product_key와 완료 요청의 product_key가 일치하지 않습니다.",
      step: "product_key_validation",
      debugCode: "PORTONE_PRODUCT_KEY_MISMATCH",
      portoneStatus: payment.status,
      actualAmount: verifiedAmount,
    });
  }

  if (customPurpose && customPurpose !== "ai_credit_purchase") {
    throw new PortOneVerificationError({
      message: "AI 크레딧 충전 결제가 아닙니다.",
      step: "product_key_validation",
      debugCode: "PORTONE_PURPOSE_MISMATCH",
      portoneStatus: payment.status,
      actualAmount: verifiedAmount,
    });
  }

  return payment;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return jsonError("로그인이 필요합니다.", 401, {
      step: "auth_user_check",
      debugCode: "AUTH_USER_REQUIRED",
    });
  }

  let body: CompleteAiCreditPurchaseRequest;

  try {
    body = (await request.json()) as CompleteAiCreditPurchaseRequest;
  } catch (error) {
    return jsonError("요청 본문이 올바른 JSON이 아닙니다.", 400, {
      step: "request_body_parse",
      debugCode: "REQUEST_BODY_PARSE_FAILED",
      error: error instanceof Error ? error : null,
      userId: user.id,
    });
  }

  const paymentId = getString(body.paymentId);
  const productKey = getString(body.product_key) || getString(body.productKey);
  const menuSiteId = getString(body.menuSiteId);
  const product = getAiCreditPack(productKey);

  if (!paymentId) {
    return jsonError("paymentId가 없습니다.", 400, {
      step: "request_body_parse",
      debugCode: "PAYMENT_ID_REQUIRED",
      productKey,
      userId: user.id,
    });
  }
  if (!product) {
    return jsonError("AI 크레딧 충전 상품이 올바르지 않습니다.", 400, {
      step: "product_key_validation",
      debugCode: "INVALID_AI_CREDIT_PRODUCT_KEY",
      productKey,
      paymentId,
      userId: user.id,
    });
  }

  const adminSupabase = createAdminClient();
  let contextMenuSiteId: string | null = null;

  if (menuSiteId) {
    const { data: menuSite, error: menuSiteError } = await adminSupabase
      .from("menu_sites")
      .select("id, user_id")
      .eq("id", menuSiteId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (menuSiteError) {
      return aiCreditProcessingError({
        step: "context_menu_site_check",
        debugCode: "CONTEXT_MENU_SITE_CHECK_FAILED",
        error: menuSiteError,
        productKey,
        paymentId,
        userId: user.id,
      });
    }
    if (!menuSite) {
      return jsonError("AI 크레딧 충전 요청의 메뉴판 context를 확인하지 못했습니다.", 404, {
        step: "context_menu_site_check",
        debugCode: "CONTEXT_MENU_SITE_NOT_FOUND",
        productKey,
        paymentId,
        userId: user.id,
      });
    }
    contextMenuSiteId = menuSite.id;
  }

  const { data: existingTransaction, error: existingTransactionError } = await adminSupabase
    .from("ai_credit_transactions" as never)
    .select("id")
    .eq("payment_id" as never, paymentId as never)
    .eq("transaction_type" as never, "purchase" as never)
    .maybeSingle();

  if (existingTransactionError) {
    return aiCreditProcessingError({
      step: "ai_credit_transaction_check",
      debugCode: "AI_CREDIT_TRANSACTION_CHECK_FAILED",
      error: existingTransactionError,
      productKey,
      paymentId,
      userId: user.id,
    });
  }

  if (existingTransaction) {
    const balance = await getAiCreditBalanceForUser(user.id);
    await createAiCreditPurchasedNotification({
      userId: user.id,
      paymentId,
      productKey: product.productKey,
      credits: product.credits,
      balance,
    });

    return NextResponse.json({
      ok: true,
      message: "이미 처리된 AI 크레딧 충전 결제입니다.",
      alreadyProcessed: true,
      balance,
    });
  }

  let verifiedPayment: PortOnePayment;

  try {
    verifiedPayment = await verifyAiCreditPayment(paymentId, product.productKey, product.amount);
  } catch (error) {
    const verificationError = error instanceof PortOneVerificationError ? error : null;
    const step = verificationError?.step ?? "portone_payment_fetch";
    const debugCode = verificationError?.debugCode ?? "PORTONE_PAYMENT_VERIFY_FAILED";
    logSafeAiCreditError({
      step,
      debugCode,
      error: error instanceof Error ? error : null,
      productKey,
      paymentId,
      userId: user.id,
      portoneStatus: verificationError?.portoneStatus,
      portoneMessage: error instanceof Error ? error.message : undefined,
    });
    return jsonError(error instanceof Error ? error.message : "AI 크레딧 결제 검증에 실패했습니다.", 502, {
      step,
      debugCode,
      error: error instanceof Error ? error : null,
      productKey,
      paymentId,
      userId: user.id,
      portoneStatus: verificationError?.portoneStatus,
      portoneMessage: error instanceof Error ? error.message : undefined,
      expectedAmount: product.amount,
      actualAmount: verificationError?.actualAmount,
    });
  }

  const rawPayload = JSON.parse(
    JSON.stringify({
      payment_type: product.paymentType,
      product_key: product.productKey,
      credits: product.credits,
      purpose: "ai_credit_purchase",
      portone_payment: verifiedPayment,
    })
  ) as Json;

  const { data: existingOrder, error: existingOrderError } = await adminSupabase
    .from("orders")
    .select("id")
    .eq("payment_id", paymentId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingOrderError) {
    return aiCreditProcessingError({
      step: "duplicate_payment_check",
      debugCode: "ORDER_DUPLICATE_CHECK_FAILED",
      error: existingOrderError,
      productKey,
      paymentId,
      userId: user.id,
    });
  }

  let order = existingOrder as { id: string } | null;
  if (!order) {
    const { data: insertedOrder, error: orderError } = await adminSupabase
      .from("orders")
      .insert({
        user_id: user.id,
        menu_site_id: contextMenuSiteId,
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

    if (orderError) {
      return aiCreditProcessingError({
        step: "order_upsert_or_insert",
        debugCode: "ORDER_INSERT_FAILED",
        error: orderError,
        productKey,
        paymentId,
        userId: user.id,
      });
    }

    order = insertedOrder as { id: string } | null;
  }

  if (!order) {
    return aiCreditProcessingError({
      step: "order_upsert_or_insert",
      debugCode: "ORDER_INSERT_NO_ROW_RETURNED",
      error: new Error("No order row returned."),
      productKey,
      paymentId,
      userId: user.id,
    });
  }

  const { data: existingPayment, error: existingPaymentError } = await adminSupabase
    .from("payments")
    .select("id")
    .eq("payment_id", paymentId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingPaymentError) {
    return aiCreditProcessingError({
      step: "duplicate_payment_check",
      debugCode: "PAYMENT_DUPLICATE_CHECK_FAILED",
      error: existingPaymentError,
      productKey,
      paymentId,
      userId: user.id,
    });
  }

  if (!existingPayment) {
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
      return aiCreditProcessingError({
        step: "payment_upsert_or_insert",
        debugCode: "PAYMENT_INSERT_FAILED",
        error: paymentError,
        productKey,
        paymentId,
        userId: user.id,
      });
    }
  }

  try {
    const balance = await purchaseAiCredits({
      adminSupabase,
      userId: user.id,
      menuSiteId: contextMenuSiteId,
      credits: product.credits,
      productKey: product.productKey,
      paymentId,
      orderId: (order as { id: string }).id,
    });

    await createAiCreditPurchasedNotification({
      userId: user.id,
      paymentId,
      orderId: (order as { id: string }).id,
      productKey: product.productKey,
      credits: product.credits,
      balance,
    });

    return NextResponse.json({
      ok: true,
      message: "AI 크레딧 충전이 완료되었습니다.",
      productKey: product.productKey,
      credits: product.credits,
      balance,
    });
  } catch (error) {
    return aiCreditProcessingError({
      step: "ai_credit_grant_rpc",
      debugCode: "AI_CREDIT_GRANT_RPC_FAILED",
      error: error instanceof Error ? error : null,
      productKey,
      paymentId,
      userId: user.id,
    });
  }
}
