import "server-only";

import { SERVICE_DATA_RETENTION_DAYS } from "@/lib/service-retention-policy";
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
const KST_TIME_ZONE = "Asia/Seoul";
const DAY_MS = 1000 * 60 * 60 * 24;

function toTime(value: string | null | undefined) {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : time;
}

function getKstDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: KST_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }

  return { year, month, day };
}

function getKstDayStartTime(date: Date) {
  const parts = getKstDateParts(date);

  if (!parts) {
    return null;
  }

  return Date.UTC(parts.year, parts.month - 1, parts.day);
}

function getRemainingDaysUntilKst(value: string | null | undefined, now: Date = new Date()) {
  if (!value) return null;
  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return null;
  }

  const todayStart = getKstDayStartTime(now);
  const retentionStart = getKstDayStartTime(date);

  if (todayStart === null || retentionStart === null) {
    return null;
  }

  return Math.round((retentionStart - todayStart) / DAY_MS);
}

function getRetentionEndsAt(entitlement: ServiceEntitlementRow | null | undefined) {
  return entitlement?.data_retention_until ?? entitlement?.deleted_scheduled_at ?? null;
}

function getRetentionWindowState(entitlement: ServiceEntitlementRow | null | undefined) {
  const retentionEndsAt = getRetentionEndsAt(entitlement);
  const daysUntilRetentionEnds = getRemainingDaysUntilKst(retentionEndsAt);
  const isOpen =
    daysUntilRetentionEnds !== null &&
    daysUntilRetentionEnds >= 0 &&
    daysUntilRetentionEnds <= SERVICE_DATA_RETENTION_DAYS;

  return {
    retentionEndsAt,
    daysUntilRetentionEnds,
    isOpen,
    isExpiredOrDue: daysUntilRetentionEnds !== null && daysUntilRetentionEnds < 0,
  };
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

  const retentionScheduled = entitlements.find(
    (entitlement) => entitlement.status === "pending_delete" || entitlement.data_retention_until || entitlement.deleted_scheduled_at,
  );
  if (retentionScheduled) return retentionScheduled;

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
  const retentionWindow = getRetentionWindowState(entitlement);
  const isArchivedMenuSite = menuSite.status === "archived";
  const isPendingDelete = retentionWindow.isExpiredOrDue || (entitlementStatus === "pending_delete" && !retentionWindow.isOpen);
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
      statusLabel: "삭제됨",
      message: "보관 기간이 종료되어 미리보기를 사용할 수 없습니다. 복구 가능 기간이 종료되었습니다.",
      ctaLabel: null,
      lifecycleState: "pending_delete",
      reason: "personal_trial_pending_delete",
    };
  }

  if (isArchivedMenuSite || hasPaymentIssue || isExpiredPersonalTrial || (entitlement && INACTIVE_STATUSES.has(entitlementStatus ?? "")) || !hasActiveService) {
    const isPersonalTrial = isPersonalTrialPlan(planType);
    const canOwnerPreview = retentionWindow.isOpen;
    const lifecycleState: MenuSiteLifecycleState = canOwnerPreview
      ? hasPaymentIssue ? "payment_issue" : "expired_holding"
      : "pending_delete";

    if (!canOwnerPreview) {
      return {
        menuSiteId: menuSite.id,
        menuSiteStatus: menuSite.status,
        entitlementStatus: hasPaymentIssue ? subscriptionStatus : entitlementStatus,
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
        statusLabel: "삭제됨",
        message: "보관 기간이 종료되어 미리보기를 사용할 수 없습니다. 복구 가능 기간이 종료되었습니다.",
        ctaLabel: null,
        lifecycleState,
        reason: isArchivedMenuSite ? "archived_menu_site" : isPersonalTrial ? "personal_trial_pending_delete" : "inactive_entitlement",
      };
    }

    return {
      menuSiteId: menuSite.id,
      menuSiteStatus: menuSite.status,
      entitlementStatus: hasPaymentIssue ? subscriptionStatus : entitlementStatus,
      planType,
      canEdit: false,
      canUseWriteActions: false,
      canOwnerPreview,
      canPreview: canOwnerPreview,
      canPublish: false,
      canViewPublic: false,
      canDownloadQr: false,
      canUseAi: false,
      canConvertToBusiness: isPersonalTrial && canOwnerPreview,
      isReadOnly: true,
      isPendingDelete: false,
      statusLabel: hasPaymentIssue ? "결제 확인 필요" : isArchivedMenuSite ? "보관 중" : isPersonalTrial ? "체험 종료" : "서비스 기간 종료",
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
    statusLabel: menuSite.status === "published" ? "공개중" : menuSite.status === "draft" ? "작성중" : "보관 중",
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
