import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";

type MenuSiteRow = Pick<
  Database["public"]["Tables"]["menu_sites"]["Row"],
  "id" | "user_id" | "slug" | "status" | "settings"
>;

type ServiceEntitlementRow = {
  id: string;
  menu_site_id: string;
  plan_type: string | null;
  status: string | null;
  access_expires_at: string | null;
  data_retention_until: string | null;
  deleted_scheduled_at: string | null;
  created_at: string | null;
};

type BusinessSubscriptionRow = {
  id: string;
  menu_site_id: string | null;
  status: string | null;
  current_period_end: string | null;
  next_billing_at: string | null;
  created_at: string | null;
};

export type MenuSiteAccessReason =
  | "active"
  | "archived_menu_site"
  | "personal_trial_expired"
  | "personal_trial_pending_delete"
  | "inactive_entitlement"
  | "no_menu_site";

export type MenuSiteLifecycleState =
  | "active"
  | "payment_issue"
  | "expired_holding"
  | "pending_delete"
  | "deleted"
  | "unknown";

export type MenuSiteAccessState = {
  menuSiteId: string;
  menuSiteStatus: string | null;
  entitlementStatus: string | null;
  planType: string | null;
  canEdit: boolean;
  canUseWriteActions: boolean;
  canOwnerPreview: boolean;
  canPreview: boolean;
  canPublish: boolean;
  canViewPublic: boolean;
  canDownloadQr: boolean;
  canUseAi: boolean;
  canConvertToBusiness: boolean;
  isReadOnly: boolean;
  isPendingDelete: boolean;
  statusLabel: string;
  message: string | null;
  ctaLabel: string | null;
  lifecycleState: MenuSiteLifecycleState;
  reason: MenuSiteAccessReason;
};

export const MENU_SITE_INACTIVE_EDIT_MESSAGE =
  "서비스 이용 기간이 종료되었거나 결제 확인이 필요해 편집과 공개가 제한되었습니다. 결제를 재개하면 기존 메뉴판을 이어서 사용할 수 있습니다.";
export const MENU_SITE_INACTIVE_PUBLISH_MESSAGE =
  "서비스 이용 기간이 종료되었거나 결제 확인이 필요해 공개 상태를 변경할 수 없습니다. 결제를 재개한 뒤 다시 이용해주세요.";
export const MENU_SITE_INACTIVE_AI_MESSAGE =
  "현재 메뉴판은 서비스 이용 기간이 종료되어 AI 기능을 사용할 수 없습니다.";

const PERSONAL_TRIAL_PLAN_TYPES = new Set(["personal_trial", "personal_trial_basic_1month"]);
const BUSINESS_PLAN_TYPES = new Set(["business_basic", "business_display"]);
const INACTIVE_STATUSES = new Set(["expired", "archived", "pending_delete", "canceled", "cancelled", "failed", "payment_failed", "past_due"]);
const PAYMENT_BLOCKED_SUBSCRIPTION_STATUSES = new Set(["failed", "payment_failed", "past_due"]);

function toTime(value: string | null | undefined) {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : time;
}

function getSettingsPlanType(settings: MenuSiteRow["settings"]) {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) return null;
  const record = settings as Record<string, unknown>;
  const value = record.plan_type ?? record.source_plan_type ?? record.creation_plan_type;
  return typeof value === "string" ? value : null;
}

function isPersonalTrialPlan(planType: string | null | undefined) {
  return !!planType && PERSONAL_TRIAL_PLAN_TYPES.has(planType);
}

function isBusinessPlan(planType: string | null | undefined) {
  return !!planType && BUSINESS_PLAN_TYPES.has(planType);
}

function pickRelevantEntitlement(entitlements: ServiceEntitlementRow[]) {
  const activeBusiness = entitlements.find((entitlement) => entitlement.status === "active" && isBusinessPlan(entitlement.plan_type));
  if (activeBusiness) return activeBusiness;

  const activePersonalTrial = entitlements.find(
    (entitlement) => entitlement.status === "active" && isPersonalTrialPlan(entitlement.plan_type),
  );
  if (activePersonalTrial) return activePersonalTrial;

  const pendingDelete = entitlements.find((entitlement) => entitlement.status === "pending_delete" || entitlement.deleted_scheduled_at);
  if (pendingDelete) return pendingDelete;

  const personalTrial = entitlements.find((entitlement) => isPersonalTrialPlan(entitlement.plan_type));
  if (personalTrial) return personalTrial;

  return entitlements[0] ?? null;
}

function pickRelevantSubscription(subscriptions: BusinessSubscriptionRow[]) {
  const activeSubscription = subscriptions.find((subscription) => subscription.status === "active");
  if (activeSubscription) return activeSubscription;

  return subscriptions.find((subscription) => PAYMENT_BLOCKED_SUBSCRIPTION_STATUSES.has(subscription.status ?? "")) ?? subscriptions[0] ?? null;
}

function getSubscriptionAccessTime(subscription: BusinessSubscriptionRow | null | undefined) {
  return toTime(subscription?.current_period_end) ?? toTime(subscription?.next_billing_at);
}

function buildAccessState(menuSite: MenuSiteRow, entitlements: ServiceEntitlementRow[], subscriptions: BusinessSubscriptionRow[]): MenuSiteAccessState {
  const now = Date.now();
  const entitlement = pickRelevantEntitlement(entitlements);
  const subscription = pickRelevantSubscription(subscriptions);
  const settingsPlanType = getSettingsPlanType(menuSite.settings);
  const planType = entitlement?.plan_type ?? settingsPlanType;
  const entitlementStatus = entitlement?.status ?? null;
  const subscriptionStatus = subscription?.status ?? null;
  const accessExpiresAt = toTime(entitlement?.access_expires_at);
  const subscriptionAccessExpiresAt = getSubscriptionAccessTime(subscription);
  const isArchivedMenuSite = menuSite.status === "archived";
  const isPendingDelete = entitlementStatus === "pending_delete" || Boolean(entitlement?.deleted_scheduled_at);
  const hasPaymentIssue = PAYMENT_BLOCKED_SUBSCRIPTION_STATUSES.has(subscriptionStatus ?? "");
  const isAccessExpired = accessExpiresAt !== null && accessExpiresAt <= now;
  const hasValidAccessWindow = accessExpiresAt === null
    ? subscriptionStatus === "active" && subscriptionAccessExpiresAt !== null && subscriptionAccessExpiresAt > now
    : !isAccessExpired;
  const isExpiredPersonalTrial =
    isPersonalTrialPlan(planType) &&
    (isPendingDelete ||
      entitlementStatus === "expired" ||
      entitlementStatus === "archived" ||
      (entitlementStatus === "active" && isAccessExpired));
  const hasActiveService =
    !isArchivedMenuSite &&
    !hasPaymentIssue &&
    Boolean(entitlement) &&
    entitlementStatus === "active" &&
    hasValidAccessWindow &&
    !isPendingDelete &&
    !isExpiredPersonalTrial;

  if (isPendingDelete) {
    return {
      menuSiteId: menuSite.id,
      menuSiteStatus: menuSite.status,
      entitlementStatus,
      planType,
      canEdit: false,
      canUseWriteActions: false,
      canOwnerPreview: false,
      canPreview: false,
      canPublish: false,
      canViewPublic: false,
      canDownloadQr: false,
      canUseAi: false,
      canConvertToBusiness: false,
      isReadOnly: true,
      isPendingDelete: true,
      statusLabel: "복구 기간 종료",
      message: "복구 가능 기간이 종료되었습니다. 고객지원으로 문의해주세요.",
      ctaLabel: "고객지원 문의",
      lifecycleState: "pending_delete",
      reason: "personal_trial_pending_delete",
    };
  }

  if (isArchivedMenuSite || hasPaymentIssue || isExpiredPersonalTrial || (entitlement && INACTIVE_STATUSES.has(entitlementStatus ?? "")) || !hasActiveService) {
    const isPersonalTrial = isPersonalTrialPlan(planType);
    const lifecycleState: MenuSiteLifecycleState = hasPaymentIssue ? "payment_issue" : "expired_holding";
    return {
      menuSiteId: menuSite.id,
      menuSiteStatus: menuSite.status,
      entitlementStatus: hasPaymentIssue ? subscriptionStatus : entitlementStatus,
      planType,
      canEdit: false,
      canUseWriteActions: false,
      canOwnerPreview: true,
      canPreview: true,
      canPublish: false,
      canViewPublic: false,
      canDownloadQr: false,
      canUseAi: false,
      canConvertToBusiness: isPersonalTrial,
      isReadOnly: true,
      isPendingDelete: false,
      statusLabel: hasPaymentIssue ? "결제 확인 필요" : isArchivedMenuSite ? "보관됨" : isPersonalTrial ? "체험 기간 종료" : "서비스 기간 종료",
      message: MENU_SITE_INACTIVE_EDIT_MESSAGE,
      ctaLabel: isPersonalTrial ? "사업자 플랜으로 전환하고 복구" : null,
      lifecycleState,
      reason: isArchivedMenuSite ? "archived_menu_site" : isPersonalTrial ? "personal_trial_expired" : "inactive_entitlement",
    };
  }

  const canViewPublic = hasActiveService && menuSite.status === "published";
  return {
    menuSiteId: menuSite.id,
    menuSiteStatus: menuSite.status,
    entitlementStatus,
    planType,
    canEdit: hasActiveService,
    canUseWriteActions: hasActiveService,
    canOwnerPreview: hasActiveService,
    canPreview: hasActiveService,
    canPublish: hasActiveService,
    canViewPublic,
    canDownloadQr: canViewPublic,
    canUseAi: hasActiveService,
    canConvertToBusiness: false,
    isReadOnly: !hasActiveService,
    isPendingDelete: false,
    statusLabel: menuSite.status === "published" ? "공개중" : menuSite.status === "draft" ? "작성중" : "보관됨",
    message: null,
    ctaLabel: null,
    lifecycleState: "active",
    reason: "active",
  };
}

async function listEntitlements(menuSiteId: string) {
  const adminSupabase = createAdminClient();
  const { data, error } = await adminSupabase
    .from("service_entitlements")
    .select("id, menu_site_id, plan_type, status, access_expires_at, data_retention_until, deleted_scheduled_at, created_at")
    .eq("menu_site_id", menuSiteId)
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("[menu-access] failed to load service entitlements", { menuSiteId, message: error.message, code: error.code });
    return [];
  }

  return (data ?? []) as ServiceEntitlementRow[];
}

async function listBusinessSubscriptions(menuSiteId: string) {
  const adminSupabase = createAdminClient();
  const { data, error } = await adminSupabase
    .from("business_subscriptions" as never)
    .select("id, menu_site_id, status, current_period_end, next_billing_at, created_at")
    .eq("menu_site_id" as never, menuSiteId as never)
    .order("created_at" as never, { ascending: false } as never);

  if (error) {
    console.warn("[menu-access] failed to load business subscriptions", { menuSiteId, message: error.message, code: error.code });
    return [];
  }

  return (data ?? []) as unknown as BusinessSubscriptionRow[];
}

export async function getMenuSiteAccessStateForMenuSite({
  menuSiteId,
  userId,
}: {
  menuSiteId: string;
  userId?: string;
}) {
  const adminSupabase = createAdminClient();
  let query = adminSupabase.from("menu_sites").select("id, user_id, slug, status, settings").eq("id", menuSiteId);
  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data: menuSite, error } = await query.maybeSingle();
  if (error) {
    console.warn("[menu-access] failed to load menu site", { menuSiteId, message: error.message, code: error.code });
    return null;
  }

  if (!menuSite) return null;

  const [entitlements, subscriptions] = await Promise.all([
    listEntitlements(menuSite.id),
    listBusinessSubscriptions(menuSite.id),
  ]);
  return buildAccessState(menuSite as MenuSiteRow, entitlements, subscriptions);
}

export async function getMenuSiteAccessStateBySlug(slug: string) {
  const adminSupabase = createAdminClient();
  const { data: menuSite, error } = await adminSupabase
    .from("menu_sites")
    .select("id, user_id, slug, status, settings")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.warn("[menu-access] failed to load menu site by slug", { slug, message: error.message, code: error.code });
    return null;
  }

  if (!menuSite) return null;

  const [entitlements, subscriptions] = await Promise.all([
    listEntitlements(menuSite.id),
    listBusinessSubscriptions(menuSite.id),
  ]);
  return buildAccessState(menuSite as MenuSiteRow, entitlements, subscriptions);
}
