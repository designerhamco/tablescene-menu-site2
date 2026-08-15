import "server-only";

import { isOwnerRuntimeActor } from "@/lib/owner-runtime-access";
import { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

type BusinessSubscriptionRow = {
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
  cancel_at_period_end: boolean | null;
  cancel_requested_at: string | null;
  canceled_at: string | null;
  cancellation_reason: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type MenuSiteSummary = {
  id: string;
  name: string | null;
  slug: string | null;
  status: string | null;
};

type ServiceEntitlementSummary = {
  id: string;
  status: string | null;
  access_expires_at: string | null;
  subscription_id: string | null;
};

export type BusinessSubscriptionManagementDetail = BusinessSubscriptionRow & {
  menuSite: MenuSiteSummary | null;
  serviceEntitlement: ServiceEntitlementSummary | null;
};

export class BusinessSubscriptionManagementError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

function normalizeCancellationReason(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized ? normalized.slice(0, 500) : null;
}

function isMissingCancellationColumn(error: { code?: string; message?: string } | null | undefined) {
  const message = error?.message ?? "";
  return error?.code === "42703" || message.includes("cancel_at_period_end") || message.includes("current_period_end");
}

async function getSubscription(adminSupabase: AdminClient, subscriptionId: string, userId: string) {
  const { data, error } = await adminSupabase
    .from("business_subscriptions" as never)
    .select(
      "id, user_id, menu_site_id, business_profile_id, product_key, plan_type, billing_cycle, status, amount, currency, portone_payment_id, next_billing_at, last_paid_at, cancel_at_period_end, cancel_requested_at, canceled_at, cancellation_reason, current_period_start, current_period_end, created_at, updated_at",
    )
    .eq("id" as never, subscriptionId as never)
    .eq("user_id" as never, userId as never)
    .maybeSingle();

  if (error) {
    if (isMissingCancellationColumn(error)) {
      throw new BusinessSubscriptionManagementError(
        "MIGRATION_REQUIRED",
        "business_subscriptions 구독 관리 컬럼 migration 적용이 필요합니다.",
        500,
      );
    }

    throw new BusinessSubscriptionManagementError("SUBSCRIPTION_QUERY_FAILED", "구독 정보를 불러오지 못했습니다.", 500);
  }

  const subscription = data as unknown as BusinessSubscriptionRow | null;
  return isOwnerRuntimeActor(userId, subscription) ? subscription : null;
}

async function getMenuSite(adminSupabase: AdminClient, menuSiteId: string | null) {
  if (!menuSiteId) return null;

  const { data, error } = await adminSupabase
    .from("menu_sites")
    .select("id, name, slug, status")
    .eq("id", menuSiteId)
    .maybeSingle();

  if (error) return null;
  return data as MenuSiteSummary | null;
}

async function getServiceEntitlement(adminSupabase: AdminClient, subscriptionId: string, menuSiteId: string | null) {
  let query = adminSupabase
    .from("service_entitlements")
    .select("id, status, access_expires_at, subscription_id")
    .eq("subscription_id", subscriptionId)
    .limit(1);

  if (menuSiteId) {
    query = query.or(`menu_site_id.eq.${menuSiteId},subscription_id.eq.${subscriptionId}`);
  }

  const { data, error } = await query.maybeSingle();
  if (error) return null;

  return data as ServiceEntitlementSummary | null;
}

export async function getBusinessSubscriptionManagementDetail({
  subscriptionId,
  userId,
  adminSupabase = createAdminClient(),
}: {
  subscriptionId: string;
  userId: string;
  adminSupabase?: AdminClient;
}): Promise<BusinessSubscriptionManagementDetail> {
  const subscription = await getSubscription(adminSupabase, subscriptionId, userId);
  if (!subscription) {
    throw new BusinessSubscriptionManagementError("SUBSCRIPTION_NOT_FOUND", "구독을 찾을 수 없습니다.", 404);
  }

  const [menuSite, serviceEntitlement] = await Promise.all([
    getMenuSite(adminSupabase, subscription.menu_site_id),
    getServiceEntitlement(adminSupabase, subscription.id, subscription.menu_site_id),
  ]);

  return { ...subscription, menuSite, serviceEntitlement };
}

export async function scheduleBusinessSubscriptionCancellation({
  subscriptionId,
  userId,
  reason,
}: {
  subscriptionId: string;
  userId: string;
  reason?: unknown;
}) {
  const adminSupabase = createAdminClient();
  const subscription = await getSubscription(adminSupabase, subscriptionId, userId);

  if (!subscription) {
    throw new BusinessSubscriptionManagementError("SUBSCRIPTION_NOT_FOUND", "구독을 찾을 수 없습니다.", 404);
  }

  if (subscription.status !== "active") {
    throw new BusinessSubscriptionManagementError("SUBSCRIPTION_NOT_ACTIVE", "이용 중인 구독만 해지 예약할 수 있습니다.");
  }

  if (subscription.cancel_at_period_end) {
    return { alreadyScheduled: true };
  }

  // The renewal cron prioritizes this flag over billing-key checks and expires
  // the subscription and matching service entitlement at period end.
  const { error } = await adminSupabase
    .from("business_subscriptions" as never)
    .update(({
      cancel_at_period_end: true,
      cancel_requested_at: new Date().toISOString(),
      cancellation_reason: normalizeCancellationReason(reason),
    }) as never)
    .eq("id" as never, subscriptionId as never)
    .eq("user_id" as never, userId as never);

  if (error) {
    throw new BusinessSubscriptionManagementError("CANCELLATION_UPDATE_FAILED", "구독 해지 예약에 실패했습니다.", 500);
  }

  return { alreadyScheduled: false };
}

export async function resumeBusinessSubscriptionCancellation({
  subscriptionId,
  userId,
}: {
  subscriptionId: string;
  userId: string;
}) {
  const adminSupabase = createAdminClient();
  const subscription = await getSubscription(adminSupabase, subscriptionId, userId);

  if (!subscription) {
    throw new BusinessSubscriptionManagementError("SUBSCRIPTION_NOT_FOUND", "구독을 찾을 수 없습니다.", 404);
  }

  if (!subscription.cancel_at_period_end) {
    return { alreadyActive: true };
  }

  const { error } = await adminSupabase
    .from("business_subscriptions" as never)
    .update(({
      cancel_at_period_end: false,
      cancel_requested_at: null,
      cancellation_reason: null,
    }) as never)
    .eq("id" as never, subscriptionId as never)
    .eq("user_id" as never, userId as never);

  if (error) {
    throw new BusinessSubscriptionManagementError("RESUME_UPDATE_FAILED", "해지 예약 취소에 실패했습니다.", 500);
  }

  return { alreadyActive: false };
}
