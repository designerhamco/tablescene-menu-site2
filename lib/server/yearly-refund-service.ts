import "server-only";

import { isOwnerRuntimeActor } from "@/lib/owner-runtime-access";

import {
  businessBasicMonthlyProduct,
  businessBasicYearlyProduct,
  businessDisplayMonthlyProduct,
  businessDisplayYearlyProduct,
} from "@/lib/payments";
import { cancelPortOnePayment, getPortOnePayment, getPortOnePaymentAmountSummary, PortOneBillingError } from "@/lib/portone-billing";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database, Json } from "@/lib/supabase/types";

const DAY_MS = 24 * 60 * 60 * 1000;
const RETENTION_DAYS_AFTER_REFUND = 90;
const MIDTERM_CANCELLATION_FEE_RATE = 0.1;
const REFUND_CALCULATION_VERSION = "yearly_discount_clawback_midterm_fee_v2";

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

type AdminClient = ReturnType<typeof createAdminClient>;
type RefundRequestRow = Database["public"]["Tables"]["refund_requests"]["Row"];
type RefundRequestInsert = Database["public"]["Tables"]["refund_requests"]["Insert"];
type RefundRequestUpdate = Database["public"]["Tables"]["refund_requests"]["Update"];

type YearlyRefundProductKey = keyof typeof yearlyRefundProductPairs;

type BusinessSubscriptionForRefund = {
  id: string;
  user_id: string;
  menu_site_id: string | null;
  business_profile_id: string | null;
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

type PaymentForRefund = {
  id: string;
  order_id: string | null;
  payment_id: string | null;
  portone_payment_id: string | null;
  product_key: string | null;
  status: string;
  amount: number;
  created_at: string;
};

type ServiceEntitlementForRefund = {
  id: string;
  status: string | null;
};

export type YearlyRefundQuote = {
  subscriptionId: string;
  menuSiteId: string | null;
  serviceEntitlementId: string | null;
  productKey: YearlyRefundProductKey;
  serviceType: "basic" | "display";
  billingCycle: "yearly";
  paymentRowId: string;
  orderId: string | null;
  portonePaymentId: string;
  paidAmount: number;
  annualPrice: number;
  monthlyListPrice: number;
  billingStartedAt: string;
  nextBillingAt: string;
  refundBasisDate: string;
  usedDays: number;
  totalDays: number;
  remainingDays: number;
  monthlyBasisUsedAmount: number;
  annualBasisUsedAmount: number;
  discountClawbackAmount: number;
  preFeeRefundAmount: number;
  midtermCancellationFeeRate: number;
  midtermCancellationFeeAmount: number;
  estimatedRefundAmount: number;
  canAutoRefundLater: boolean;
  reasonIfNotRefundable: string | null;
  roundingPolicy: string;
  customerNotice: string;
  calculationVersion: typeof REFUND_CALCULATION_VERSION;
};

export type ConfirmYearlyRefundResult =
  | {
      status: "completed";
      message: string;
      refundRequestId: string;
      finalRefundAmount: number;
      menuSiteId: string | null;
    }
  | {
      status: "needs_review";
      message: string;
      refundRequestId: string;
      finalRefundAmount: number | null;
      menuSiteId: string | null;
    };

export class YearlyRefundError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
  ) {
    super(message);
  }
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

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeCustomerReason(value: unknown) {
  const normalized = getString(value);
  return normalized ? normalized.slice(0, 500) : null;
}

function sanitizeFailureReason(value: unknown) {
  const message = value instanceof Error ? value.message : String(value ?? "unknown");
  return message
    .replace(/billing-key-[A-Za-z0-9_-]+/g, "billing-key-***")
    .replace(/channel-key-[A-Za-z0-9_-]+/g, "channel-key-***")
    .replace(/store-[A-Za-z0-9_-]+/g, "store-***")
    .slice(0, 500);
}

function buildIdempotencyKey(quote: YearlyRefundQuote) {
  return `yearly-refund:${quote.subscriptionId}:${quote.portonePaymentId}:${quote.calculationVersion}`;
}

async function findPaidPayment({
  adminSupabase,
  paymentId,
  userId,
}: {
  adminSupabase: AdminClient;
  paymentId: string;
  userId: string;
}) {
  const { data, error } = await adminSupabase
    .from("payments")
    .select("id, order_id, payment_id, portone_payment_id, product_key, status, amount, created_at")
    .eq("user_id", userId)
    .or(`payment_id.eq.${paymentId},portone_payment_id.eq.${paymentId}`)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    throw new YearlyRefundError("PAYMENT_QUERY_FAILED", "결제 기록을 확인하지 못해 자동 계산이 어렵습니다.", 500);
  }

  return (data?.[0] ?? null) as PaymentForRefund | null;
}

async function findServiceEntitlement({
  adminSupabase,
  subscriptionId,
  menuSiteId,
}: {
  adminSupabase: AdminClient;
  subscriptionId: string;
  menuSiteId: string | null;
}) {
  let query = adminSupabase
    .from("service_entitlements")
    .select("id, status")
    .eq("subscription_id", subscriptionId)
    .limit(1);

  if (menuSiteId) {
    query = query.or(`subscription_id.eq.${subscriptionId},menu_site_id.eq.${menuSiteId}`);
  }

  const { data, error } = await query.maybeSingle();
  if (error) return null;

  return data as ServiceEntitlementForRefund | null;
}

export async function calculateYearlyRefundQuote({
  subscriptionId,
  userId,
  adminSupabase = createAdminClient(),
}: {
  subscriptionId: string;
  userId: string;
  adminSupabase?: AdminClient;
}) {
  const { data: subscriptionData, error: subscriptionError } = await adminSupabase
    .from("business_subscriptions")
    .select(
      "id, user_id, menu_site_id, business_profile_id, product_key, plan_type, billing_cycle, status, amount, currency, portone_payment_id, next_billing_at, last_paid_at, current_period_start, current_period_end, cancel_at_period_end, created_at",
    )
    .eq("id", subscriptionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (subscriptionError) {
    throw new YearlyRefundError("SUBSCRIPTION_QUERY_FAILED", "구독 정보를 불러오지 못했습니다.", 500);
  }

  const subscription = subscriptionData as BusinessSubscriptionForRefund | null;
  if (!isOwnerRuntimeActor(userId, subscription)) {
    throw new YearlyRefundError("SUBSCRIPTION_NOT_FOUND", "구독을 찾을 수 없습니다.", 404);
  }

  if (subscription.status !== "active") {
    throw new YearlyRefundError("SUBSCRIPTION_NOT_ACTIVE", "이용 중인 연 정기결제만 예상 환불금액을 계산할 수 있습니다.", 409);
  }

  if (subscription.billing_cycle !== "yearly" || !isYearlyRefundProductKey(subscription.product_key)) {
    throw new YearlyRefundError("YEARLY_SUBSCRIPTION_REQUIRED", "연 정기결제 상품만 예상 환불금액을 계산할 수 있습니다.", 409);
  }

  if (!subscription.portone_payment_id) {
    throw new YearlyRefundError("PAYMENT_ID_REQUIRED", "결제번호를 확인하지 못해 자동 계산이 어렵습니다.", 409);
  }

  const productPair = yearlyRefundProductPairs[subscription.product_key];
  const payment = await findPaidPayment({
    adminSupabase,
    paymentId: subscription.portone_payment_id,
    userId,
  });

  if (!payment || payment.status !== "paid") {
    throw new YearlyRefundError("PAID_PAYMENT_REQUIRED", "결제완료 기록을 확인하지 못해 자동 계산이 어렵습니다.", 409);
  }

  if (payment.product_key && payment.product_key !== subscription.product_key) {
    throw new YearlyRefundError("PAYMENT_PRODUCT_MISMATCH", "결제 상품 정보가 구독 정보와 일치하지 않아 자동 계산이 어렵습니다.", 409);
  }

  if (payment.amount !== subscription.amount) {
    throw new YearlyRefundError("PAYMENT_AMOUNT_MISMATCH", "결제금액이 구독 금액과 일치하지 않아 자동 계산이 어렵습니다.", 409);
  }

  const billingStartedAt =
    parseDate(subscription.current_period_start) ??
    parseDate(subscription.last_paid_at) ??
    parseDate(payment.created_at) ??
    parseDate(subscription.created_at);
  const nextBillingAt = parseDate(subscription.next_billing_at) ?? parseDate(subscription.current_period_end);

  if (!billingStartedAt || !nextBillingAt || nextBillingAt.getTime() <= billingStartedAt.getTime()) {
    throw new YearlyRefundError("BILLING_PERIOD_REQUIRED", "이용 기간을 확인하지 못해 자동 계산이 어렵습니다.", 409);
  }

  const serviceEntitlement = await findServiceEntitlement({
    adminSupabase,
    subscriptionId: subscription.id,
    menuSiteId: subscription.menu_site_id,
  });

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
  const preFeeRefundAmount = Math.max(0, paidAmount - monthlyBasisUsedAmount);
  const midtermCancellationFeeAmount = Math.ceil(preFeeRefundAmount * MIDTERM_CANCELLATION_FEE_RATE);
  const estimatedRefundAmount = Math.max(0, preFeeRefundAmount - midtermCancellationFeeAmount);
  const reasonIfNotRefundable = estimatedRefundAmount > 0 ? null : "사용 기간 기준 재정산 금액과 중도해지 수수료가 결제금액 이상입니다.";

  return {
    subscriptionId: subscription.id,
    menuSiteId: subscription.menu_site_id,
    serviceEntitlementId: serviceEntitlement?.id ?? null,
    productKey: subscription.product_key,
    serviceType: productPair.serviceType,
    billingCycle: "yearly",
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
    preFeeRefundAmount,
    midtermCancellationFeeRate: MIDTERM_CANCELLATION_FEE_RATE,
    midtermCancellationFeeAmount,
    estimatedRefundAmount,
    canAutoRefundLater: estimatedRefundAmount > 0,
    reasonIfNotRefundable,
    roundingPolicy: "월결제 기준 사용료와 중도해지 수수료는 원 단위 올림으로 계산합니다.",
    customerNotice:
      "연결제는 월결제 대비 할인된 연 정기결제 상품입니다. 중도해지 시 사용한 기간은 월결제 기준 금액으로 재정산되며, 잔여 환불 가능액에서 중도해지 수수료 10%가 공제됩니다.",
    calculationVersion: REFUND_CALCULATION_VERSION,
  } satisfies YearlyRefundQuote;
}

async function findExistingRefundRequest(adminSupabase: AdminClient, idempotencyKey: string) {
  const { data, error } = await adminSupabase
    .from("refund_requests")
    .select("id, status, final_refund_amount, menu_site_id")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (error) {
    throw new YearlyRefundError("REFUND_REQUEST_QUERY_FAILED", "환불 요청 상태를 확인하지 못했습니다.", 500);
  }

  return data as Pick<RefundRequestRow, "id" | "status" | "final_refund_amount" | "menu_site_id"> | null;
}

function buildRefundRequestInsert({
  quote,
  idempotencyKey,
  customerReason,
}: {
  quote: YearlyRefundQuote;
  idempotencyKey: string;
  customerReason: string | null;
}) {
  return {
    user_id: "",
    menu_site_id: quote.menuSiteId,
    business_subscription_id: quote.subscriptionId,
    service_entitlement_id: quote.serviceEntitlementId,
    order_id: quote.orderId,
    payment_id: quote.paymentRowId,
    portone_payment_id: quote.portonePaymentId,
    product_key: quote.productKey,
    service_type: quote.serviceType,
    currency: "KRW",
    billing_cycle: "yearly",
    request_type: "midterm_refund",
    status: "requested",
    calculation_version: quote.calculationVersion,
    refund_basis_date: quote.refundBasisDate,
    paid_amount: quote.paidAmount,
    monthly_list_price: quote.monthlyListPrice,
    annual_price: quote.annualPrice,
    used_days: quote.usedDays,
    total_days: quote.totalDays,
    monthly_basis_used_amount: quote.monthlyBasisUsedAmount,
    annual_basis_used_amount: quote.annualBasisUsedAmount,
    discount_clawback_amount: quote.discountClawbackAmount,
    estimated_refund_amount: quote.estimatedRefundAmount,
    final_refund_amount: null,
    customer_reason: customerReason,
    idempotency_key: idempotencyKey,
    metadata: {
      remaining_days: quote.remainingDays,
      pre_fee_refund_amount: quote.preFeeRefundAmount,
      midterm_cancellation_fee_rate: quote.midtermCancellationFeeRate,
      midterm_cancellation_fee_amount: quote.midtermCancellationFeeAmount,
      rounding_policy: quote.roundingPolicy,
      customer_notice: quote.customerNotice,
    },
    quoted_at: quote.refundBasisDate,
    requested_at: new Date().toISOString(),
    confirmed_at: new Date().toISOString(),
  } satisfies Omit<RefundRequestInsert, "user_id"> & { user_id: string };
}

async function createRefundRequest({
  adminSupabase,
  userId,
  quote,
  idempotencyKey,
  customerReason,
}: {
  adminSupabase: AdminClient;
  userId: string;
  quote: YearlyRefundQuote;
  idempotencyKey: string;
  customerReason: string | null;
}) {
  const payload = {
    ...buildRefundRequestInsert({ quote, idempotencyKey, customerReason }),
    user_id: userId,
  };
  const { data, error } = await adminSupabase.from("refund_requests").insert(payload).select("id, status").single();

  if (error) {
    if (error.code === "23505") {
      const existing = await findExistingRefundRequest(adminSupabase, idempotencyKey);
      if (existing) return existing;
    }

    throw new YearlyRefundError("REFUND_REQUEST_CREATE_FAILED", "환불 요청을 생성하지 못했습니다.", 500);
  }

  return data as Pick<RefundRequestRow, "id" | "status">;
}

async function updateRefundRequestStatus({
  adminSupabase,
  refundRequestId,
  update,
}: {
  adminSupabase: AdminClient;
  refundRequestId: string;
  update: RefundRequestUpdate;
}) {
  const { error } = await adminSupabase.from("refund_requests").update(update).eq("id", refundRequestId);

  if (error) {
    throw new YearlyRefundError("REFUND_REQUEST_UPDATE_FAILED", "환불 요청 상태를 저장하지 못했습니다.", 500);
  }
}

async function markNeedsReview({
  adminSupabase,
  refundRequestId,
  quote,
  reason,
  portOneResponse,
  portOneCancelId,
}: {
  adminSupabase: AdminClient;
  refundRequestId: string;
  quote: YearlyRefundQuote;
  reason: string;
  portOneResponse?: unknown;
  portOneCancelId?: string | null;
}): Promise<ConfirmYearlyRefundResult> {
  await updateRefundRequestStatus({
    adminSupabase,
    refundRequestId,
    update: {
      status: "needs_review",
      final_refund_amount: null,
      failure_reason: reason,
      portone_cancel_id: portOneCancelId ?? null,
      portone_response: portOneResponse ? (JSON.parse(JSON.stringify(portOneResponse)) as Json) : null,
      processed_at: new Date().toISOString(),
    },
  });

  return {
    status: "needs_review",
    message: "자동 환불 처리 확인이 필요합니다. 추가 결제나 재요청 없이 고객지원에서 확인 후 안내드리겠습니다.",
    refundRequestId,
    finalRefundAmount: null,
    menuSiteId: quote.menuSiteId,
  };
}

async function archiveRefundedService({
  adminSupabase,
  quote,
}: {
  adminSupabase: AdminClient;
  quote: YearlyRefundQuote;
}) {
  const now = new Date();
  const nowIso = now.toISOString();
  const retentionUntil = addDays(now, RETENTION_DAYS_AFTER_REFUND).toISOString();

  const { error: subscriptionError } = await adminSupabase
    .from("business_subscriptions")
    .update({
      status: "canceled",
      canceled_at: nowIso,
      cancel_at_period_end: false,
      cancel_requested_at: nowIso,
      cancellation_reason: "midterm_refund_completed",
      next_billing_at: null,
      current_period_end: nowIso,
    })
    .eq("id", quote.subscriptionId);

  if (subscriptionError) throw subscriptionError;

  let entitlementQuery = adminSupabase
    .from("service_entitlements")
    .update({
      status: "archived",
      access_expires_at: nowIso,
      expired_at: nowIso,
      data_retention_until: retentionUntil,
      deleted_scheduled_at: retentionUntil,
    })
    .eq("subscription_id", quote.subscriptionId);

  if (quote.serviceEntitlementId) {
    entitlementQuery = adminSupabase
      .from("service_entitlements")
      .update({
        status: "archived",
        access_expires_at: nowIso,
        expired_at: nowIso,
        data_retention_until: retentionUntil,
        deleted_scheduled_at: retentionUntil,
      })
      .eq("id", quote.serviceEntitlementId);
  }

  const { error: entitlementError } = await entitlementQuery;
  if (entitlementError) throw entitlementError;

  if (quote.menuSiteId) {
    const { error: menuSiteError } = await adminSupabase
      .from("menu_sites")
      .update({ status: "archived", updated_at: nowIso })
      .eq("id", quote.menuSiteId);

    if (menuSiteError) throw menuSiteError;
  }
}

export async function confirmYearlyRefund({
  subscriptionId,
  userId,
  customerReason,
  adminSupabase = createAdminClient(),
}: {
  subscriptionId: string;
  userId: string;
  customerReason?: unknown;
  adminSupabase?: AdminClient;
}): Promise<ConfirmYearlyRefundResult> {
  const quote = await calculateYearlyRefundQuote({ subscriptionId, userId, adminSupabase });

  if (quote.estimatedRefundAmount <= 0 || !quote.canAutoRefundLater) {
    throw new YearlyRefundError("REFUND_AMOUNT_NOT_POSITIVE", quote.reasonIfNotRefundable ?? "자동 환불 가능한 금액이 없습니다.", 409);
  }

  const idempotencyKey = buildIdempotencyKey(quote);
  const existing = await findExistingRefundRequest(adminSupabase, idempotencyKey);

  if (existing) {
    if (existing.status === "completed") {
      return {
        status: "completed",
        message: "이미 환불 처리가 완료된 요청입니다.",
        refundRequestId: existing.id,
        finalRefundAmount: existing.final_refund_amount ?? quote.estimatedRefundAmount,
        menuSiteId: existing.menu_site_id ?? quote.menuSiteId,
      };
    }

    return {
      status: "needs_review",
      message: "이미 처리 중인 환불 요청이 있습니다. 추가 요청 없이 고객지원 안내를 기다려주세요.",
      refundRequestId: existing.id,
      finalRefundAmount: existing.final_refund_amount,
      menuSiteId: existing.menu_site_id ?? quote.menuSiteId,
    };
  }

  const refundRequest = await createRefundRequest({
    adminSupabase,
    userId,
    quote,
    idempotencyKey,
    customerReason: normalizeCustomerReason(customerReason),
  });
  const refundRequestId = refundRequest.id;

  await updateRefundRequestStatus({
    adminSupabase,
    refundRequestId,
    update: {
      status: "processing",
      processed_at: null,
    },
  });

  let portOnePayment;
  try {
    portOnePayment = await getPortOnePayment({ paymentId: quote.portonePaymentId });
  } catch (error) {
    return markNeedsReview({
      adminSupabase,
      refundRequestId,
      quote,
      reason: sanitizeFailureReason(error),
    });
  }

  const amountSummary = getPortOnePaymentAmountSummary(portOnePayment);
  if (portOnePayment.status !== "PAID") {
    return markNeedsReview({
      adminSupabase,
      refundRequestId,
      quote,
      reason: `PortOne 결제 상태가 PAID가 아닙니다: ${portOnePayment.status ?? "unknown"}`,
      portOneResponse: portOnePayment,
    });
  }

  if (amountSummary.total !== quote.paidAmount && amountSummary.paid !== quote.paidAmount) {
    return markNeedsReview({
      adminSupabase,
      refundRequestId,
      quote,
      reason: `PortOne 결제 금액이 앱 결제금액과 일치하지 않습니다: ${amountSummary.total ?? amountSummary.paid ?? "unknown"}`,
      portOneResponse: portOnePayment,
    });
  }

  if (typeof amountSummary.cancelled === "number" && amountSummary.cancelled > 0) {
    return markNeedsReview({
      adminSupabase,
      refundRequestId,
      quote,
      reason: "이미 취소 또는 부분취소된 금액이 있어 자동 환불을 중단했습니다.",
      portOneResponse: portOnePayment,
    });
  }

  const currentCancellableAmount =
    typeof amountSummary.total === "number" && typeof amountSummary.cancelled === "number"
      ? Math.max(0, amountSummary.total - amountSummary.cancelled)
      : undefined;

  if (typeof currentCancellableAmount === "number" && quote.estimatedRefundAmount > currentCancellableAmount) {
    return markNeedsReview({
      adminSupabase,
      refundRequestId,
      quote,
      reason: "예상 환불금액이 PortOne 취소 가능 잔액을 초과합니다.",
      portOneResponse: portOnePayment,
    });
  }

  let cancelResult;
  try {
    cancelResult = await cancelPortOnePayment({
      paymentId: quote.portonePaymentId,
      amount: quote.estimatedRefundAmount,
      reason: "메뉴링크 연결제 중도해지 환불",
      currentCancellableAmount,
    });
  } catch (error) {
    return markNeedsReview({
      adminSupabase,
      refundRequestId,
      quote,
      reason: sanitizeFailureReason(error instanceof PortOneBillingError ? error.safeDebug.portoneMessage ?? error.message : error),
    });
  }

  if (cancelResult.status !== "SUCCEEDED") {
    return markNeedsReview({
      adminSupabase,
      refundRequestId,
      quote,
      reason: `PortOne 취소 상태가 즉시 완료되지 않았습니다: ${cancelResult.status}`,
      portOneResponse: cancelResult.rawCancellation,
      portOneCancelId: cancelResult.cancellationId,
    });
  }

  try {
    await archiveRefundedService({ adminSupabase, quote });
  } catch (error) {
    return markNeedsReview({
      adminSupabase,
      refundRequestId,
      quote,
      reason: `환불은 완료됐지만 서비스 보관 전환에 실패했습니다: ${sanitizeFailureReason(error)}`,
      portOneResponse: cancelResult.rawCancellation,
      portOneCancelId: cancelResult.cancellationId,
    });
  }

  await updateRefundRequestStatus({
    adminSupabase,
    refundRequestId,
    update: {
      status: "completed",
      final_refund_amount: quote.estimatedRefundAmount,
      portone_cancel_id: cancelResult.cancellationId,
      portone_response: JSON.parse(JSON.stringify(cancelResult.rawCancellation)) as Json,
      failure_reason: null,
      processed_at: new Date().toISOString(),
    },
  });

  return {
    status: "completed",
    message: "환불 처리가 접수되었습니다. 카드사 또는 결제수단에 따라 실제 취소 반영까지 영업일 기준 3~7일이 걸릴 수 있습니다.",
    refundRequestId,
    finalRefundAmount: quote.estimatedRefundAmount,
    menuSiteId: quote.menuSiteId,
  };
}
