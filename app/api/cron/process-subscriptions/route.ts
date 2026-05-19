import { NextResponse } from "next/server";

import { getSubscriptionProduct, type SubscriptionProduct } from "@/lib/billing-products";
import { payWithBillingKey, PortOneBillingError } from "@/lib/portone-billing";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/types";

export const runtime = "nodejs";

type ProcessSubscriptionsRequest = {
  dryRun?: unknown;
  execute?: unknown;
};

type ProcessSubscriptionsOptions = {
  dryRun: boolean;
  execute: boolean;
  trigger: "get" | "post";
};

type DueSubscription = {
  id: string;
  user_id: string;
  menu_site_id: string | null;
  business_profile_id: string | null;
  product_key: string;
  plan_type: string;
  billing_cycle: string;
  billing_key_ref: string | null;
  status: string;
  amount: number | null;
  currency: string | null;
  portone_payment_id: string | null;
  next_billing_at: string | null;
  last_paid_at: string | null;
  cancel_at_period_end: boolean | null;
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string | null;
};

type BusinessProfile = {
  id: string;
  business_registration_number: string | null;
  business_name: string | null;
  representative_name: string | null;
};

type CronItem = {
  subscriptionId: string;
  productKey: string;
  action:
    | "would_charge"
    | "would_cancel_at_period_end"
    | "charged"
    | "canceled_at_period_end"
    | "skipped_duplicate"
    | "skipped_invalid_product"
    | "skipped_missing_billing_key"
    | "failed";
  amount?: number;
  nextBillingAt?: string | null;
  paymentId?: string;
  message?: string;
};

const SUBSCRIPTION_PRODUCT_KEYS = [
  "business_basic_monthly",
  "business_basic_yearly",
  "business_display_monthly",
  "business_display_yearly",
] as const;

function jsonResponse(payload: Record<string, unknown>, status = 200) {
  return NextResponse.json(payload, { status });
}

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const [scheme, token] = authorization.split(" ");

  if (scheme?.toLowerCase() === "bearer" && token) {
    return token.trim();
  }

  return "";
}

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;

  const headerSecret = request.headers.get("x-cron-secret")?.trim() ?? "";
  return getBearerToken(request) === cronSecret || headerSecret === cronSecret;
}

function getBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function isSubscriptionCronExecuteEnabled() {
  return process.env.ENABLE_SUBSCRIPTION_CRON_EXECUTE === "true";
}

async function parseRequestBody(request: Request): Promise<ProcessSubscriptionsRequest> {
  try {
    return (await request.json()) as ProcessSubscriptionsRequest;
  } catch {
    return {};
  }
}

function addBillingCycle(date: Date, billingCycle: string) {
  const next = new Date(date);

  if (billingCycle === "yearly") {
    next.setFullYear(next.getFullYear() + 1);
  } else {
    next.setMonth(next.getMonth() + 1);
  }

  return next;
}

function getPeriodStart(subscription: DueSubscription, now: Date) {
  const candidates = [
    subscription.current_period_end,
    subscription.next_billing_at,
    subscription.last_paid_at,
    subscription.created_at,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const date = new Date(candidate);
    if (Number.isFinite(date.getTime())) return date;
  }

  return now;
}

function createRenewalPaymentId(subscription: DueSubscription, periodStart: Date) {
  const dateKey = periodStart.toISOString().slice(0, 10).replaceAll("-", "");
  return `sub_${subscription.id}_${dateKey}`;
}

function getOrderName(product: SubscriptionProduct) {
  const serviceLabel = product.serviceType === "display" ? "Display" : "Basic";
  return product.billingCycle === "yearly" ? `TableScene ${serviceLabel} 사업자 연 결제` : `TableScene ${serviceLabel} 사업자 월 결제`;
}

function getSafePortOneMessage(error: unknown) {
  if (error instanceof PortOneBillingError) {
    return error.safeDebug.portoneMessage ?? error.message;
  }

  return error instanceof Error ? error.message : "정기 결제에 실패했습니다.";
}

async function getBusinessProfile(adminSupabase: ReturnType<typeof createAdminClient>, businessProfileId: string | null) {
  if (!businessProfileId) return null;

  const { data, error } = await adminSupabase
    .from("business_profiles")
    .select("id, business_registration_number, business_name, representative_name")
    .eq("id", businessProfileId)
    .maybeSingle();

  if (error) return null;
  return data as BusinessProfile | null;
}

async function hasExistingPayment(adminSupabase: ReturnType<typeof createAdminClient>, paymentId: string) {
  const [{ data: existingOrder }, { data: existingPayment }] = await Promise.all([
    adminSupabase.from("orders").select("id").eq("payment_id", paymentId).maybeSingle(),
    adminSupabase.from("payments").select("id").eq("payment_id", paymentId).maybeSingle(),
  ]);

  return Boolean(existingOrder || existingPayment);
}

async function createRenewalRecords({
  adminSupabase,
  subscription,
  product,
  paymentId,
  businessProfile,
}: {
  adminSupabase: ReturnType<typeof createAdminClient>;
  subscription: DueSubscription;
  product: SubscriptionProduct;
  paymentId: string;
  businessProfile: BusinessProfile | null;
}) {
  const rawPayload = {
    payment_type: product.paymentType,
    billing_cycle: product.billingCycle,
    product_key: product.productKey,
    plan_type: product.planType,
    renewal: true,
    subscription_id: subscription.id,
    portone_payment_id: paymentId,
  } satisfies Json;
  const { data: order, error: orderError } = await adminSupabase
    .from("orders")
    .insert({
      user_id: subscription.user_id,
      menu_site_id: subscription.menu_site_id,
      product_key: product.productKey,
      order_name: getOrderName(product),
      payment_id: paymentId,
      customer_name: businessProfile?.business_name ?? null,
      buyer_name: businessProfile?.representative_name ?? null,
      business_name: businessProfile?.business_name ?? null,
      business_number: businessProfile?.business_registration_number ?? null,
      raw_payload: rawPayload,
      status: "paid",
      total_amount: product.amount,
    })
    .select("id")
    .single();

  if (orderError || !order) {
    throw new Error(`ORDER_INSERT_FAILED: ${orderError?.message ?? "no order row returned"}`);
  }

  const { error: paymentError } = await adminSupabase.from("payments").insert({
    user_id: subscription.user_id,
    order_id: (order as { id: string }).id,
    product_key: product.productKey,
    payment_id: paymentId,
    portone_payment_id: paymentId,
    status: "paid",
    amount: product.amount,
    raw_payload: rawPayload,
  });

  if (paymentError) {
    throw new Error(`PAYMENT_INSERT_FAILED: ${paymentError.message}`);
  }
}

async function expireSubscriptionAtPeriodEnd({
  adminSupabase,
  subscription,
  periodStart,
}: {
  adminSupabase: ReturnType<typeof createAdminClient>;
  subscription: DueSubscription;
  periodStart: Date;
}) {
  const nowIso = new Date().toISOString();
  const accessExpiresAt = (subscription.current_period_end ?? subscription.next_billing_at ?? periodStart.toISOString());

  const { error: subscriptionError } = await adminSupabase
    .from("business_subscriptions" as never)
    .update(({
      status: "expired",
      canceled_at: nowIso,
      next_billing_at: null,
      cancel_at_period_end: false,
    }) as never)
    .eq("id" as never, subscription.id as never);

  if (subscriptionError) {
    throw new Error(`SUBSCRIPTION_EXPIRE_FAILED: ${subscriptionError.message}`);
  }

  let entitlementQuery = adminSupabase
    .from("service_entitlements")
    .update({
      status: "expired",
      expired_at: nowIso,
      access_expires_at: accessExpiresAt,
    })
    .eq("subscription_id", subscription.id);

  if (subscription.menu_site_id) {
    entitlementQuery = entitlementQuery.eq("menu_site_id", subscription.menu_site_id);
  }

  const { error: entitlementError } = await entitlementQuery;

  if (entitlementError) {
    throw new Error(`SERVICE_ENTITLEMENT_EXPIRE_FAILED: ${entitlementError.message}`);
  }
}

async function markSubscriptionPastDue(adminSupabase: ReturnType<typeof createAdminClient>, subscriptionId: string) {
  await adminSupabase
    .from("business_subscriptions" as never)
    .update(({ status: "past_due" }) as never)
    .eq("id" as never, subscriptionId as never);
  // TODO(subscription-renewal): add grace-period expiration, retry, and customer notification policies.
}

async function markSubscriptionRenewed({
  adminSupabase,
  subscription,
  paymentId,
  periodStart,
  periodEnd,
}: {
  adminSupabase: ReturnType<typeof createAdminClient>;
  subscription: DueSubscription;
  paymentId: string;
  periodStart: Date;
  periodEnd: Date;
}) {
  const nowIso = new Date().toISOString();
  const { error: subscriptionError } = await adminSupabase
    .from("business_subscriptions" as never)
    .update(({
      status: "active",
      portone_payment_id: paymentId,
      last_paid_at: nowIso,
      next_billing_at: periodEnd.toISOString(),
      current_period_start: periodStart.toISOString(),
      current_period_end: periodEnd.toISOString(),
    }) as never)
    .eq("id" as never, subscription.id as never);

  if (subscriptionError) {
    throw new Error(`SUBSCRIPTION_RENEW_UPDATE_FAILED: ${subscriptionError.message}`);
  }

  let entitlementQuery = adminSupabase
    .from("service_entitlements")
    .update({
      status: "active",
      access_expires_at: periodEnd.toISOString(),
      expired_at: null,
    })
    .eq("subscription_id", subscription.id);

  if (subscription.menu_site_id) {
    entitlementQuery = entitlementQuery.eq("menu_site_id", subscription.menu_site_id);
  }

  const { error: entitlementError } = await entitlementQuery;

  if (entitlementError) {
    throw new Error(`SERVICE_ENTITLEMENT_RENEW_UPDATE_FAILED: ${entitlementError.message}`);
  }
}

async function processDueSubscription({
  adminSupabase,
  subscription,
  dryRun,
  execute,
  now,
}: {
  adminSupabase: ReturnType<typeof createAdminClient>;
  subscription: DueSubscription;
  dryRun: boolean;
  execute: boolean;
  now: Date;
}): Promise<CronItem> {
  const product = getSubscriptionProduct(subscription.product_key);
  const periodStart = getPeriodStart(subscription, now);
  const periodEnd = addBillingCycle(periodStart, subscription.billing_cycle);
  const paymentId = createRenewalPaymentId(subscription, periodStart);

  if (!product || product.paymentType !== "subscription") {
    return { subscriptionId: subscription.id, productKey: subscription.product_key, action: "skipped_invalid_product", nextBillingAt: subscription.next_billing_at };
  }

  if (subscription.cancel_at_period_end) {
    if (dryRun || !execute) {
      return {
        subscriptionId: subscription.id,
        productKey: subscription.product_key,
        action: "would_cancel_at_period_end",
        nextBillingAt: subscription.next_billing_at,
      };
    }

    await expireSubscriptionAtPeriodEnd({ adminSupabase, subscription, periodStart });
    return {
      subscriptionId: subscription.id,
      productKey: subscription.product_key,
      action: "canceled_at_period_end",
      nextBillingAt: null,
    };
  }

  if (!subscription.billing_key_ref) {
    return {
      subscriptionId: subscription.id,
      productKey: subscription.product_key,
      action: "skipped_missing_billing_key",
      amount: product.amount,
      nextBillingAt: subscription.next_billing_at,
    };
  }

  if (dryRun || !execute) {
    return {
      subscriptionId: subscription.id,
      productKey: subscription.product_key,
      action: "would_charge",
      amount: product.amount,
      nextBillingAt: periodEnd.toISOString(),
      paymentId,
    };
  }

  if (await hasExistingPayment(adminSupabase, paymentId)) {
    return {
      subscriptionId: subscription.id,
      productKey: subscription.product_key,
      action: "skipped_duplicate",
      amount: product.amount,
      nextBillingAt: subscription.next_billing_at,
      paymentId,
    };
  }

  try {
    const businessProfile = await getBusinessProfile(adminSupabase, subscription.business_profile_id);
    await payWithBillingKey({
      paymentId,
      billingKey: subscription.billing_key_ref,
      orderName: getOrderName(product),
      amount: product.amount,
      customer: {
        id: subscription.user_id,
        name: businessProfile?.business_name ?? undefined,
      },
    });
    await createRenewalRecords({ adminSupabase, subscription, product, paymentId, businessProfile });
    await markSubscriptionRenewed({ adminSupabase, subscription, paymentId, periodStart, periodEnd });

    return {
      subscriptionId: subscription.id,
      productKey: subscription.product_key,
      action: "charged",
      amount: product.amount,
      nextBillingAt: periodEnd.toISOString(),
      paymentId,
    };
  } catch (error) {
    await markSubscriptionPastDue(adminSupabase, subscription.id);
    return {
      subscriptionId: subscription.id,
      productKey: subscription.product_key,
      action: "failed",
      amount: product.amount,
      nextBillingAt: subscription.next_billing_at,
      paymentId,
      message: getSafePortOneMessage(error),
    };
  }
}

async function processSubscriptions({ dryRun, execute, trigger }: ProcessSubscriptionsOptions) {
  const now = new Date();
  const adminSupabase = createAdminClient();

  const { data, error } = await adminSupabase
    .from("business_subscriptions" as never)
    .select("id, user_id, menu_site_id, business_profile_id, product_key, plan_type, billing_cycle, billing_key_ref, status, amount, currency, portone_payment_id, next_billing_at, last_paid_at, cancel_at_period_end, current_period_start, current_period_end, created_at")
    .eq("status" as never, "active" as never)
    .lte("next_billing_at" as never, now.toISOString() as never)
    .in("product_key" as never, [...SUBSCRIPTION_PRODUCT_KEYS] as never)
    .order("next_billing_at" as never, { ascending: true } as never);

  if (error) {
    console.error("[cron/process-subscriptions] due subscription query failed", {
      trigger,
      code: error.code,
      message: error.message,
    });
    return jsonResponse({ ok: false, message: "구독 갱신 대상을 조회하지 못했습니다." }, 500);
  }

  const dueSubscriptions = (data ?? []) as unknown as DueSubscription[];
  const items: CronItem[] = [];

  for (const subscription of dueSubscriptions) {
    const item = await processDueSubscription({ adminSupabase, subscription, dryRun, execute, now });
    items.push(item);
  }

  const summary = {
    trigger,
    dryRun,
    execute,
    executeEnabledForGet: isSubscriptionCronExecuteEnabled(),
    dueCount: dueSubscriptions.length,
    processed: items.length,
    charged: items.filter((item) => item.action === "charged").length,
    canceled: items.filter((item) => item.action === "canceled_at_period_end").length,
    failed: items.filter((item) => item.action === "failed").length,
    skipped: items.filter((item) => item.action.startsWith("skipped")).length,
  };

  console.info("[cron/process-subscriptions] completed", summary);

  return jsonResponse({
    ok: true,
    ...summary,
    items,
  });
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return jsonResponse({ ok: false, message: "Unauthorized" }, 401);
  }

  const execute = isSubscriptionCronExecuteEnabled();
  return processSubscriptions({
    trigger: "get",
    execute,
    dryRun: !execute,
  });
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return jsonResponse({ ok: false, message: "Unauthorized" }, 401);
  }

  const body = await parseRequestBody(request);
  const execute = getBoolean(body.execute, false);
  const dryRun = execute ? getBoolean(body.dryRun, false) : true;

  return processSubscriptions({
    trigger: "post",
    execute,
    dryRun,
  });
}
