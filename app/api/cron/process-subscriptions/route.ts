import { NextResponse } from "next/server";

import { getSubscriptionProduct, type SubscriptionProduct } from "@/lib/billing-products";
import { buildPaymentFailedEmail } from "@/lib/notification-email-templates";
import {
  buildDataRetentionStartedNoticeMessage,
  getDataRetentionStartedNoticeTitle,
  getDataRetentionStartedPeriodKey,
  getPaymentFailedPeriodKey,
} from "@/lib/notification-events";
import { payWithBillingKey, PortOneBillingError } from "@/lib/portone-billing";
import {
  getPaidSubscriptionDataRetentionUntil,
  getPaymentIssueDataRetentionUntil,
  isRetentionEndedAfterKstDday,
} from "@/lib/service-retention-policy";
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

type RetentionEntitlement = {
  id: string;
  user_id: string | null;
  menu_site_id: string | null;
  subscription_id: string | null;
  plan_type: string | null;
  product_key: string | null;
  billing_type: string | null;
  status: string | null;
  access_expires_at: string | null;
  expired_at: string | null;
  data_retention_until: string | null;
  deleted_scheduled_at: string | null;
};

type RetentionMaintenanceResult = {
  retentionStarted: number;
  pendingDeleteEntitlements: number;
  archivedMenuSites: number;
  alreadyPendingDelete: number;
  anomalies: Array<{
    type: "legacy_missing_retention" | "stale_active_entitlement" | "expired_access_without_retention_date";
    entitlementId: string;
    menuSiteId: string | null;
    status: string | null;
    accessExpiresAt: string | null;
  }>;
  errors: string[];
};

const SUBSCRIPTION_PRODUCT_KEYS = [
  "business_basic_monthly",
  "business_basic_yearly",
  "business_display_monthly",
  "business_display_yearly",
] as const;
const BUSINESS_PLAN_TYPES = ["business_basic", "business_display"] as const;
const PAYMENT_ISSUE_STATUSES = ["past_due", "payment_failed", "failed", "needs_action"] as const;

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
  if (product.serviceType === "display") {
    return product.billingCycle === "yearly" ? "메뉴링크 디스플레이 연결제" : "메뉴링크 디스플레이 월결제";
  }

  return product.billingCycle === "yearly" ? "메뉴링크 베이직 연결제" : "메뉴링크 베이직 월결제";
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

async function getMenuSiteForNotice(adminSupabase: ReturnType<typeof createAdminClient>, menuSiteId: string | null) {
  if (!menuSiteId) return null;

  const { data, error } = await adminSupabase
    .from("menu_sites")
    .select("id, name, slug")
    .eq("id", menuSiteId)
    .maybeSingle();

  if (error) return null;
  return data as { id: string; name: string | null; slug: string | null } | null;
}

async function hasExistingPayment(adminSupabase: ReturnType<typeof createAdminClient>, paymentId: string) {
  const [{ data: existingOrder }, { data: existingPayment }] = await Promise.all([
    adminSupabase.from("orders").select("id").eq("payment_id", paymentId).maybeSingle(),
    adminSupabase.from("payments").select("id").eq("payment_id", paymentId).maybeSingle(),
  ]);

  return Boolean(existingOrder || existingPayment);
}

async function createDataRetentionStartedNotification({
  adminSupabase,
  subscription,
  dataRetentionUntil,
  nowIso,
}: {
  adminSupabase: ReturnType<typeof createAdminClient>;
  subscription: DueSubscription;
  dataRetentionUntil: string;
  nowIso: string;
}) {
  if (!subscription.menu_site_id) return;

  const periodKey = getDataRetentionStartedPeriodKey(subscription.id, dataRetentionUntil);
  const { data: existingEvent, error: existingEventError } = await adminSupabase
    .from("notification_events" as never)
    .select("id")
    .eq("user_id" as never, subscription.user_id as never)
    .eq("menu_site_id" as never, subscription.menu_site_id as never)
    .eq("event_type" as never, "data_retention_started" as never)
    .eq("channel" as never, "email" as never)
    .contains("metadata" as never, { period_key: periodKey } as never)
    .maybeSingle();

  if (existingEventError && existingEventError.code !== "PGRST116") {
    throw new Error(`DATA_RETENTION_STARTED_DUPLICATE_CHECK_FAILED: ${existingEventError.message}`);
  }

  if (existingEvent) return;

  const menuSite = await getMenuSiteForNotice(adminSupabase, subscription.menu_site_id);
  const menuSiteName = menuSite?.name?.trim() || "메뉴판";
  const slug = menuSite?.slug ?? null;

  const { error } = await adminSupabase
    .from("notification_events" as never)
    .insert({
      user_id: subscription.user_id,
      menu_site_id: subscription.menu_site_id,
      subscription_id: subscription.id,
      event_type: "data_retention_started",
      channel: "email",
      title: getDataRetentionStartedNoticeTitle({ menuSiteName, slug, retentionUntil: dataRetentionUntil }),
      message: buildDataRetentionStartedNoticeMessage({ menuSiteName, slug, retentionUntil: dataRetentionUntil }),
      status: "pending",
      scheduled_for: nowIso,
      metadata: {
        period_key: periodKey,
        retention_until: dataRetentionUntil,
        menu_site_name: menuSiteName,
        slug,
        product_key: subscription.product_key,
        billing_cycle: subscription.billing_cycle,
        source: "process-subscriptions",
      },
    } as never);

  if (error && error.code !== "42P01") {
    throw new Error(`DATA_RETENTION_STARTED_EVENT_INSERT_FAILED: ${error.message}`);
  }
}

async function createPaymentFailedNotification({
  adminSupabase,
  subscription,
  product,
  paymentId,
  periodStart,
  failureMessage,
}: {
  adminSupabase: ReturnType<typeof createAdminClient>;
  subscription: DueSubscription;
  product: SubscriptionProduct;
  paymentId: string;
  periodStart: Date;
  failureMessage: string;
}) {
  const billingPeriod = periodStart.toISOString().slice(0, 10);
  const periodKey = getPaymentFailedPeriodKey(subscription.id, billingPeriod);
  const { data: existingEvent, error: existingEventError } = await adminSupabase
    .from("notification_events" as never)
    .select("id")
    .eq("user_id" as never, subscription.user_id as never)
    .eq("subscription_id" as never, subscription.id as never)
    .eq("event_type" as never, "payment_failed" as never)
    .eq("channel" as never, "email" as never)
    .contains("metadata" as never, { period_key: periodKey } as never)
    .maybeSingle();

  if (existingEventError && existingEventError.code !== "PGRST116") {
    throw new Error(`PAYMENT_FAILED_DUPLICATE_CHECK_FAILED: ${existingEventError.message}`);
  }

  if (existingEvent) return;

  const email = buildPaymentFailedEmail();

  const { error } = await adminSupabase
    .from("notification_events" as never)
    .insert({
      user_id: subscription.user_id,
      menu_site_id: subscription.menu_site_id,
      subscription_id: subscription.id,
      event_type: "payment_failed",
      channel: "email",
      title: email.subject,
      message: email.text,
      status: "pending",
      scheduled_for: new Date().toISOString(),
      metadata: {
        period_key: periodKey,
        subscription_id: subscription.id,
        menu_site_id: subscription.menu_site_id,
        product_key: product.productKey,
        amount: product.amount,
        billing_period: billingPeriod,
        payment_id: paymentId,
        failure_message: failureMessage,
        source: "process-subscriptions",
      },
    } as never);

  if (error && error.code !== "42P01") {
    throw new Error(`PAYMENT_FAILED_EVENT_INSERT_FAILED: ${error.message}`);
  }
}

async function createRenewalRecords({
  adminSupabase,
  subscription,
  product,
  paymentId,
  businessProfile,
  portonePayment,
}: {
  adminSupabase: ReturnType<typeof createAdminClient>;
  subscription: DueSubscription;
  product: SubscriptionProduct;
  paymentId: string;
  businessProfile: BusinessProfile | null;
  portonePayment?: unknown;
}) {
  const rawPayload = JSON.parse(
    JSON.stringify({
      payment_type: product.paymentType,
      billing_cycle: product.billingCycle,
      product_key: product.productKey,
      plan_type: product.planType,
      renewal: true,
      subscription_id: subscription.id,
      portone_payment_id: paymentId,
      portone_payment: portonePayment ?? null,
    })
  ) as Json;
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
  const dataRetentionUntil = getPaidSubscriptionDataRetentionUntil(accessExpiresAt);
  if (!dataRetentionUntil) {
    throw new Error("DATA_RETENTION_UNTIL_CALCULATION_FAILED");
  }

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
      data_retention_until: dataRetentionUntil,
      deleted_scheduled_at: null,
    })
    .eq("subscription_id", subscription.id);

  if (subscription.menu_site_id) {
    entitlementQuery = entitlementQuery.eq("menu_site_id", subscription.menu_site_id);
  }

  const { error: entitlementError } = await entitlementQuery;

  if (entitlementError) {
    throw new Error(`SERVICE_ENTITLEMENT_EXPIRE_FAILED: ${entitlementError.message}`);
  }

  if (subscription.menu_site_id) {
    const { error: menuSiteError } = await adminSupabase
      .from("menu_sites")
      .update({ status: "archived" })
      .eq("id", subscription.menu_site_id);

    if (menuSiteError) {
      throw new Error(`MENU_SITE_ARCHIVE_FAILED: ${menuSiteError.message}`);
    }
  }

  try {
    await createDataRetentionStartedNotification({ adminSupabase, subscription, dataRetentionUntil, nowIso });
  } catch (error) {
    console.error("[cron/process-subscriptions] data_retention_started notification failed", {
      subscriptionId: subscription.id,
      userId: subscription.user_id,
      menuSiteId: subscription.menu_site_id,
      message: error instanceof Error ? error.message : "unknown",
    });
  }
}

async function markSubscriptionPastDue(adminSupabase: ReturnType<typeof createAdminClient>, subscriptionId: string) {
  await adminSupabase
    .from("business_subscriptions" as never)
    .update(({ status: "past_due" }) as never)
    .eq("id" as never, subscriptionId as never);
  // TODO(subscription-renewal): add grace-period expiration, retry, and customer notification policies.
}

function createEmptyRetentionMaintenanceResult(): RetentionMaintenanceResult {
  return {
    retentionStarted: 0,
    pendingDeleteEntitlements: 0,
    archivedMenuSites: 0,
    alreadyPendingDelete: 0,
    anomalies: [],
    errors: [],
  };
}

function isPastIso(value: string | null | undefined, now: Date) {
  if (!value) return false;
  const time = Date.parse(value);
  return Number.isFinite(time) && time <= now.getTime();
}

function getUniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

async function archiveBusinessMenuSites(adminSupabase: ReturnType<typeof createAdminClient>, menuSiteIds: string[]) {
  const ids = getUniqueStrings(menuSiteIds);
  if (ids.length === 0) {
    return { count: 0, error: null };
  }

  const { error } = await adminSupabase
    .from("menu_sites")
    .update({ status: "archived" })
    .in("id", ids);

  return { count: error ? 0 : ids.length, error };
}

async function startRetentionForPaymentIssueSubscriptions({
  adminSupabase,
  dryRun,
  execute,
  now,
}: {
  adminSupabase: ReturnType<typeof createAdminClient>;
  dryRun: boolean;
  execute: boolean;
  now: Date;
}): Promise<RetentionMaintenanceResult> {
  const result = createEmptyRetentionMaintenanceResult();
  const nowIso = now.toISOString();
  const { data, error } = await adminSupabase
    .from("business_subscriptions" as never)
    .select("id, user_id, menu_site_id, business_profile_id, product_key, plan_type, billing_cycle, billing_key_ref, status, amount, currency, portone_payment_id, next_billing_at, last_paid_at, cancel_at_period_end, current_period_start, current_period_end, created_at")
    .in("status" as never, [...PAYMENT_ISSUE_STATUSES] as never)
    .in("product_key" as never, [...SUBSCRIPTION_PRODUCT_KEYS] as never);

  if (error) {
    result.errors.push(`결제 이슈 구독 조회 실패: ${error.message}`);
    return result;
  }

  const subscriptions = ((data ?? []) as unknown as DueSubscription[]).filter((subscription) =>
    isPastIso(subscription.current_period_end ?? subscription.next_billing_at, now)
  );

  for (const subscription of subscriptions) {
    if (!subscription.menu_site_id) continue;

    const { data: entitlementRows, error: entitlementError } = await adminSupabase
      .from("service_entitlements")
      .select("id, user_id, menu_site_id, subscription_id, plan_type, product_key, billing_type, status, access_expires_at, expired_at, data_retention_until, deleted_scheduled_at")
      .eq("subscription_id", subscription.id)
      .eq("menu_site_id", subscription.menu_site_id)
      .eq("status", "active")
      .in("plan_type", [...BUSINESS_PLAN_TYPES])
      .lte("access_expires_at", nowIso);

    if (entitlementError) {
      result.errors.push(`결제 이슈 entitlement 조회 실패(${subscription.id}): ${entitlementError.message}`);
      continue;
    }

    const entitlements = (entitlementRows ?? []) as RetentionEntitlement[];
    if (entitlements.length === 0) continue;

    const dataRetentionUntil = getPaymentIssueDataRetentionUntil(nowIso);
    if (!dataRetentionUntil) {
      result.errors.push(`보관 종료일 계산 실패(${subscription.id})`);
      continue;
    }

    result.retentionStarted += entitlements.length;

    if (dryRun || !execute) {
      continue;
    }

    const { error: updateError } = await adminSupabase
      .from("service_entitlements")
      .update({
        status: "expired",
        expired_at: nowIso,
        data_retention_until: dataRetentionUntil,
        deleted_scheduled_at: null,
      })
      .in("id", entitlements.map((entitlement) => entitlement.id));

    if (updateError) {
      result.errors.push(`결제 이슈 entitlement 보관 전환 실패(${subscription.id}): ${updateError.message}`);
      continue;
    }

    const archiveResult = await archiveBusinessMenuSites(adminSupabase, [subscription.menu_site_id]);
    if (archiveResult.error) {
      result.errors.push(`결제 이슈 메뉴판 보관 전환 실패(${subscription.menu_site_id}): ${archiveResult.error.message}`);
    } else {
      result.archivedMenuSites += archiveResult.count;
    }

    try {
      await createDataRetentionStartedNotification({ adminSupabase, subscription, dataRetentionUntil, nowIso });
    } catch (notificationError) {
      result.errors.push(notificationError instanceof Error ? notificationError.message : "결제 이슈 보관 시작 알림 이벤트 생성 실패");
    }
  }

  return result;
}

async function markRetentionEndedBusinessEntitlements({
  adminSupabase,
  dryRun,
  execute,
  now,
}: {
  adminSupabase: ReturnType<typeof createAdminClient>;
  dryRun: boolean;
  execute: boolean;
  now: Date;
}): Promise<RetentionMaintenanceResult> {
  const result = createEmptyRetentionMaintenanceResult();
  const nowIso = now.toISOString();
  const { data, error } = await adminSupabase
    .from("service_entitlements")
    .select("id, user_id, menu_site_id, subscription_id, plan_type, product_key, billing_type, status, access_expires_at, expired_at, data_retention_until, deleted_scheduled_at")
    .in("plan_type", [...BUSINESS_PLAN_TYPES])
    .in("status", ["expired", "archived", "payment_failed", "past_due", "failed", "pending_delete"]);

  if (error) {
    result.errors.push(`유료 보관 종료 entitlement 조회 실패: ${error.message}`);
    return result;
  }

  const entitlements = (data ?? []) as RetentionEntitlement[];
  const alreadyPending = entitlements.filter((entitlement) => entitlement.status === "pending_delete");
  const dueEntitlements = entitlements.filter((entitlement) => {
    if (entitlement.status === "pending_delete") return false;
    const retentionEndsAt = entitlement.data_retention_until ?? entitlement.deleted_scheduled_at;
    return isRetentionEndedAfterKstDday(retentionEndsAt, now);
  });
  const anomalyEntitlements = entitlements.filter((entitlement) => {
    if (entitlement.status === "pending_delete") return false;
    if (entitlement.data_retention_until || entitlement.deleted_scheduled_at) return false;
    return isPastIso(entitlement.access_expires_at, now);
  });

  result.alreadyPendingDelete = alreadyPending.length;
  result.anomalies.push(
    ...anomalyEntitlements.map((entitlement) => ({
      type: "expired_access_without_retention_date" as const,
      entitlementId: entitlement.id,
      menuSiteId: entitlement.menu_site_id,
      status: entitlement.status,
      accessExpiresAt: entitlement.access_expires_at,
    }))
  );

  if (dueEntitlements.length === 0) {
    return result;
  }

  result.pendingDeleteEntitlements = dueEntitlements.length;

  if (dryRun || !execute) {
    return result;
  }

  const dueIds = dueEntitlements.map((entitlement) => entitlement.id);
  const dueIdsMissingDeletedScheduledAt = dueEntitlements
    .filter((entitlement) => !entitlement.deleted_scheduled_at)
    .map((entitlement) => entitlement.id);

  const { error: updateError } = await adminSupabase
    .from("service_entitlements")
    .update({ status: "pending_delete" })
    .in("id", dueIds);

  if (updateError) {
    result.errors.push(`유료 보관 종료 pending_delete 전환 실패: ${updateError.message}`);
    return result;
  }

  if (dueIdsMissingDeletedScheduledAt.length > 0) {
    const { error: deletedAtError } = await adminSupabase
      .from("service_entitlements")
      .update({ deleted_scheduled_at: nowIso })
      .in("id", dueIdsMissingDeletedScheduledAt);

    if (deletedAtError) {
      result.errors.push(`유료 보관 종료 삭제 예정 시각 업데이트 실패: ${deletedAtError.message}`);
    }
  }

  const archiveResult = await archiveBusinessMenuSites(
    adminSupabase,
    dueEntitlements.map((entitlement) => entitlement.menu_site_id).filter((menuSiteId): menuSiteId is string => Boolean(menuSiteId))
  );
  if (archiveResult.error) {
    result.errors.push(`유료 보관 종료 메뉴판 보관 상태 전환 실패: ${archiveResult.error.message}`);
  } else {
    result.archivedMenuSites += archiveResult.count;
  }

  return result;
}

async function findStaleActiveEntitlementAnomalies(adminSupabase: ReturnType<typeof createAdminClient>, now: Date) {
  const { data, error } = await adminSupabase
    .from("service_entitlements")
    .select("id, user_id, menu_site_id, subscription_id, plan_type, product_key, billing_type, status, access_expires_at, expired_at, data_retention_until, deleted_scheduled_at")
    .eq("status", "active")
    .in("plan_type", [...BUSINESS_PLAN_TYPES])
    .lte("access_expires_at", now.toISOString())
    .is("data_retention_until", null)
    .is("deleted_scheduled_at", null);

  if (error) {
    return {
      anomalies: [],
      error: `stale active entitlement 조회 실패: ${error.message}`,
    };
  }

  return {
    anomalies: ((data ?? []) as RetentionEntitlement[]).map((entitlement) => ({
      type: "stale_active_entitlement" as const,
      entitlementId: entitlement.id,
      menuSiteId: entitlement.menu_site_id,
      status: entitlement.status,
      accessExpiresAt: entitlement.access_expires_at,
    })),
    error: null,
  };
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
      data_retention_until: null,
      deleted_scheduled_at: null,
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
    const billingPayment = await payWithBillingKey({
      paymentId,
      billingKey: subscription.billing_key_ref,
      orderName: getOrderName(product),
      amount: product.amount,
      customer: {
        id: subscription.user_id,
        name: businessProfile?.business_name ?? undefined,
      },
    });
    await createRenewalRecords({ adminSupabase, subscription, product, paymentId, businessProfile, portonePayment: billingPayment.rawPayment });
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
    const failureMessage = getSafePortOneMessage(error);
    await markSubscriptionPastDue(adminSupabase, subscription.id);
    try {
      await createPaymentFailedNotification({
        adminSupabase,
        subscription,
        product,
        paymentId,
        periodStart,
        failureMessage,
      });
    } catch (notificationError) {
      console.error("[cron/process-subscriptions] payment_failed notification failed", {
        subscriptionId: subscription.id,
        userId: subscription.user_id,
        paymentId,
        message: notificationError instanceof Error ? notificationError.message : "unknown",
      });
    }
    return {
      subscriptionId: subscription.id,
      productKey: subscription.product_key,
      action: "failed",
      amount: product.amount,
      nextBillingAt: subscription.next_billing_at,
      paymentId,
      message: failureMessage,
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

  const paymentIssueRetentionResult = await startRetentionForPaymentIssueSubscriptions({
    adminSupabase,
    dryRun,
    execute,
    now,
  });
  const retentionEndedResult = await markRetentionEndedBusinessEntitlements({
    adminSupabase,
    dryRun,
    execute,
    now,
  });
  const staleActiveResult = await findStaleActiveEntitlementAnomalies(adminSupabase, now);
  const lifecycleAnomalies = [
    ...paymentIssueRetentionResult.anomalies,
    ...retentionEndedResult.anomalies,
    ...staleActiveResult.anomalies,
  ];
  const lifecycleErrors = [
    ...paymentIssueRetentionResult.errors,
    ...retentionEndedResult.errors,
    ...(staleActiveResult.error ? [staleActiveResult.error] : []),
  ];

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
    paymentIssueRetentionStarted: paymentIssueRetentionResult.retentionStarted,
    businessPendingDeleteEntitlements: retentionEndedResult.pendingDeleteEntitlements,
    businessAlreadyPendingDeleteEntitlements: retentionEndedResult.alreadyPendingDelete,
    lifecycleArchivedMenuSites: paymentIssueRetentionResult.archivedMenuSites + retentionEndedResult.archivedMenuSites,
    lifecycleAnomalies: lifecycleAnomalies.length,
    lifecycleErrors: lifecycleErrors.length,
  };

  console.info("[cron/process-subscriptions] completed", summary);

  return jsonResponse({
    ok: true,
    ...summary,
    items,
    lifecycleMaintenance: {
      paymentIssueRetentionStarted: paymentIssueRetentionResult.retentionStarted,
      businessPendingDeleteEntitlements: retentionEndedResult.pendingDeleteEntitlements,
      alreadyPendingDeleteEntitlements: retentionEndedResult.alreadyPendingDelete,
      archivedMenuSites: paymentIssueRetentionResult.archivedMenuSites + retentionEndedResult.archivedMenuSites,
      anomalies: lifecycleAnomalies.slice(0, 50),
      errors: lifecycleErrors,
      notes: [
        "D-Day는 KST 기준 마지막 복구 가능일로 유지하고, 다음날부터 pending_delete 대상으로 봅니다.",
        "access_expires_at이 지났지만 보관 종료일이 없는 legacy/stale entitlement는 자동 삭제하지 않고 anomaly로 보고합니다.",
      ],
    },
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
