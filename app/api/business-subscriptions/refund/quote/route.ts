import { NextResponse } from "next/server";

import {
  businessBasicMonthlyProduct,
  businessBasicYearlyProduct,
  businessDisplayMonthlyProduct,
  businessDisplayYearlyProduct,
} from "@/lib/payments";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;

const yearlyRefundProductPairs = {
  business_basic_yearly: {
    serviceType: "basic",
    monthlyProduct: businessBasicMonthlyProduct,
    annualProduct: businessBasicYearlyProduct,
  },
  business_display_yearly: {
    serviceType: "display",
    monthlyProduct: businessDisplayMonthlyProduct,
    annualProduct: businessDisplayYearlyProduct,
  },
} as const;

type YearlyRefundProductKey = keyof typeof yearlyRefundProductPairs;

type BusinessSubscriptionForQuote = {
  id: string;
  user_id: string;
  menu_site_id: string | null;
  product_key: string;
  plan_type: string;
  billing_cycle: string;
  status: string;
  amount: number;
  currency: string;
  portone_payment_id: string | null;
  next_billing_at: string | null;
  last_paid_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
  created_at: string | null;
};

type PaymentForQuote = {
  id: string;
  order_id: string | null;
  payment_id: string | null;
  portone_payment_id: string | null;
  product_key: string | null;
  status: string;
  amount: number;
  created_at: string;
};

function jsonError(code: string, message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, code, message, ...extra }, { status });
}

function parseBody(value: unknown) {
  if (!value || typeof value !== "object") return { subscriptionId: null };
  const subscriptionId = (value as { subscriptionId?: unknown }).subscriptionId;
  return {
    subscriptionId: typeof subscriptionId === "string" && subscriptionId.trim() ? subscriptionId.trim() : null,
  };
}

function isYearlyRefundProductKey(value: string): value is YearlyRefundProductKey {
  return Object.prototype.hasOwnProperty.call(yearlyRefundProductPairs, value);
}

function parseDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function diffDaysCeil(start: Date, end: Date) {
  return Math.max(0, Math.ceil((end.getTime() - start.getTime()) / DAY_MS));
}

function prorateCeil(amount: number, usedDays: number, totalDays: number) {
  if (totalDays <= 0 || usedDays <= 0 || amount <= 0) return 0;
  return Math.ceil((amount * usedDays) / totalDays);
}

async function findPaidPayment({
  paymentId,
  userId,
}: {
  paymentId: string;
  userId: string;
}) {
  const adminSupabase = createAdminClient();

  const { data, error } = await adminSupabase
    .from("payments")
    .select("id, order_id, payment_id, portone_payment_id, product_key, status, amount, created_at")
    .eq("user_id", userId)
    .or(`payment_id.eq.${paymentId},portone_payment_id.eq.${paymentId}`)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error("PAYMENT_QUERY_FAILED");
  }

  return (data?.[0] ?? null) as PaymentForQuote | null;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return jsonError("UNAUTHORIZED", "로그인이 필요합니다.", 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const { subscriptionId } = parseBody(body);
  if (!subscriptionId) {
    return jsonError("SUBSCRIPTION_ID_REQUIRED", "구독 정보를 확인할 수 없습니다.");
  }

  const adminSupabase = createAdminClient();
  const { data: subscriptionData, error: subscriptionError } = await adminSupabase
    .from("business_subscriptions" as never)
    .select(
      "id, user_id, menu_site_id, product_key, plan_type, billing_cycle, status, amount, currency, portone_payment_id, next_billing_at, last_paid_at, current_period_start, current_period_end, cancel_at_period_end, created_at",
    )
    .eq("id" as never, subscriptionId as never)
    .eq("user_id" as never, user.id as never)
    .maybeSingle();

  if (subscriptionError) {
    return jsonError("SUBSCRIPTION_QUERY_FAILED", "구독 정보를 불러오지 못했습니다.", 500);
  }

  const subscription = subscriptionData as unknown as BusinessSubscriptionForQuote | null;
  if (!subscription) {
    return jsonError("SUBSCRIPTION_NOT_FOUND", "구독을 찾을 수 없습니다.", 404);
  }

  if (subscription.status !== "active") {
    return jsonError("SUBSCRIPTION_NOT_ACTIVE", "이용 중인 연 정기결제만 예상 환불금액을 계산할 수 있습니다.", 409, {
      reasonIfNotRefundable: "active 상태가 아닙니다.",
    });
  }

  if (subscription.billing_cycle !== "yearly" || !isYearlyRefundProductKey(subscription.product_key)) {
    return jsonError("YEARLY_SUBSCRIPTION_REQUIRED", "연 정기결제 상품만 예상 환불금액을 계산할 수 있습니다.", 409, {
      reasonIfNotRefundable: "연 정기결제 상품이 아닙니다.",
    });
  }

  if (!subscription.portone_payment_id) {
    return jsonError("PAYMENT_ID_REQUIRED", "결제번호를 확인하지 못해 자동 계산이 어렵습니다.", 409, {
      reasonIfNotRefundable: "구독에 연결된 결제번호가 없습니다.",
    });
  }

  const productPair = yearlyRefundProductPairs[subscription.product_key];
  let payment: PaymentForQuote | null;
  try {
    payment = await findPaidPayment({
      paymentId: subscription.portone_payment_id,
      userId: user.id,
    });
  } catch {
    return jsonError("PAYMENT_QUERY_FAILED", "결제 기록을 확인하지 못해 자동 계산이 어렵습니다.", 500);
  }

  if (!payment || payment.status !== "paid") {
    return jsonError("PAID_PAYMENT_REQUIRED", "결제완료 기록을 확인하지 못해 자동 계산이 어렵습니다.", 409, {
      reasonIfNotRefundable: "결제완료 기록이 없습니다.",
    });
  }

  if (payment.product_key && payment.product_key !== subscription.product_key) {
    return jsonError("PAYMENT_PRODUCT_MISMATCH", "결제 상품 정보가 구독 정보와 일치하지 않아 자동 계산이 어렵습니다.", 409, {
      reasonIfNotRefundable: "결제 상품 정보가 구독 정보와 일치하지 않습니다.",
    });
  }

  if (payment.amount !== subscription.amount) {
    return jsonError("PAYMENT_AMOUNT_MISMATCH", "결제금액이 구독 금액과 일치하지 않아 자동 계산이 어렵습니다.", 409, {
      reasonIfNotRefundable: "결제금액이 구독 금액과 일치하지 않습니다.",
    });
  }

  const billingStartedAt =
    parseDate(subscription.current_period_start) ??
    parseDate(subscription.last_paid_at) ??
    parseDate(payment.created_at) ??
    parseDate(subscription.created_at);
  const nextBillingAt = parseDate(subscription.next_billing_at) ?? parseDate(subscription.current_period_end);

  if (!billingStartedAt || !nextBillingAt || nextBillingAt.getTime() <= billingStartedAt.getTime()) {
    return jsonError("BILLING_PERIOD_REQUIRED", "이용 기간을 확인하지 못해 자동 계산이 어렵습니다.", 409, {
      reasonIfNotRefundable: "결제 시작일 또는 다음 결제 예정일이 없습니다.",
    });
  }

  const refundBasisDate = new Date();
  const totalDays = Math.max(1, diffDaysCeil(billingStartedAt, nextBillingAt));
  const usedDays = Math.min(totalDays, diffDaysCeil(billingStartedAt, refundBasisDate));
  const remainingDays = Math.max(0, totalDays - usedDays);
  const monthlyListPrice = productPair.monthlyProduct.amount;
  const annualPrice = productPair.annualProduct.amount;
  const paidAmount = payment.amount || subscription.amount || annualPrice;
  const monthlyBasisUsedAmount = prorateCeil(monthlyListPrice * 12, usedDays, totalDays);
  const annualBasisUsedAmount = prorateCeil(paidAmount, usedDays, totalDays);
  const discountClawbackAmount = Math.max(0, monthlyBasisUsedAmount - annualBasisUsedAmount);
  const estimatedRefundAmount = Math.max(0, paidAmount - monthlyBasisUsedAmount);
  const reasonIfNotRefundable = estimatedRefundAmount > 0 ? null : "사용 기간 기준 재정산 금액이 결제금액 이상입니다.";

  return NextResponse.json({
    ok: true,
    quote: {
      subscriptionId: subscription.id,
      menuSiteId: subscription.menu_site_id,
      productKey: subscription.product_key,
      serviceType: productPair.serviceType,
      billingCycle: subscription.billing_cycle,
      paymentRowId: payment.id,
      orderId: payment.order_id,
      portonePaymentId: payment.portone_payment_id ?? payment.payment_id ?? subscription.portone_payment_id,
      paidAmount,
      annualPrice,
      monthlyListPrice,
      billingStartedAt: billingStartedAt.toISOString(),
      nextBillingAt: nextBillingAt.toISOString(),
      refundBasisDate: refundBasisDate.toISOString(),
      usedDays,
      totalDays,
      remainingDays,
      monthlyBasisUsedAmount,
      annualBasisUsedAmount,
      discountClawbackAmount,
      estimatedRefundAmount,
      canAutoRefundLater: estimatedRefundAmount > 0,
      reasonIfNotRefundable,
      roundingPolicy: "월결제 기준 사용료는 원 단위 올림으로 계산합니다.",
      customerNotice:
        "연결제는 월결제 대비 할인된 연 정기결제 상품입니다. 중도해지 시 사용한 기간은 월결제 기준 금액으로 재정산되며, 예상 환불금액은 다음 단계에서 고객 확인 후 확정됩니다.",
    },
  });
}
