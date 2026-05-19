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

export type MenuSiteAccessReason =
  | "active"
  | "archived_menu_site"
  | "personal_trial_expired"
  | "personal_trial_pending_delete"
  | "inactive_entitlement"
  | "no_menu_site";

export type MenuSiteAccessState = {
  menuSiteId: string;
  menuSiteStatus: string | null;
  entitlementStatus: string | null;
  planType: string | null;
  canEdit: boolean;
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
  reason: MenuSiteAccessReason;
};

export const MENU_SITE_INACTIVE_EDIT_MESSAGE =
  "체험 기간이 종료되어 편집과 공개가 제한되었습니다. 사업자 플랜으로 전환하면 기존 메뉴판을 이어서 사용할 수 있습니다.";
export const MENU_SITE_INACTIVE_PUBLISH_MESSAGE =
  "체험 기간이 종료되어 공개 상태를 변경할 수 없습니다. 사업자 플랜으로 전환 후 다시 이용해주세요.";
export const MENU_SITE_INACTIVE_AI_MESSAGE =
  "현재 메뉴판은 서비스 이용 기간이 종료되어 AI 기능을 사용할 수 없습니다.";

const PERSONAL_TRIAL_PLAN_TYPES = new Set(["personal_trial", "personal_trial_basic_1month"]);
const BUSINESS_PLAN_TYPES = new Set(["business_basic", "business_display"]);
const INACTIVE_STATUSES = new Set(["expired", "archived", "pending_delete", "canceled", "cancelled"]);

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

function buildAccessState(menuSite: MenuSiteRow, entitlements: ServiceEntitlementRow[]): MenuSiteAccessState {
  const now = Date.now();
  const entitlement = pickRelevantEntitlement(entitlements);
  const settingsPlanType = getSettingsPlanType(menuSite.settings);
  const planType = entitlement?.plan_type ?? settingsPlanType;
  const entitlementStatus = entitlement?.status ?? null;
  const accessExpiresAt = toTime(entitlement?.access_expires_at);
  const isArchivedMenuSite = menuSite.status === "archived";
  const isPendingDelete = entitlementStatus === "pending_delete" || Boolean(entitlement?.deleted_scheduled_at);
  const isExpiredPersonalTrial =
    isPersonalTrialPlan(planType) &&
    (isPendingDelete ||
      entitlementStatus === "expired" ||
      entitlementStatus === "archived" ||
      (entitlementStatus === "active" && accessExpiresAt !== null && accessExpiresAt <= now));
  const hasActiveService =
    !isArchivedMenuSite &&
    (entitlement
      ? entitlementStatus === "active" && !isPendingDelete && !isExpiredPersonalTrial
      : menuSite.status !== "archived");

  if (isPendingDelete) {
    return {
      menuSiteId: menuSite.id,
      menuSiteStatus: menuSite.status,
      entitlementStatus,
      planType,
      canEdit: false,
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
      reason: "personal_trial_pending_delete",
    };
  }

  if (isArchivedMenuSite || isExpiredPersonalTrial || (entitlement && INACTIVE_STATUSES.has(entitlementStatus ?? ""))) {
    const isPersonalTrial = isPersonalTrialPlan(planType);
    return {
      menuSiteId: menuSite.id,
      menuSiteStatus: menuSite.status,
      entitlementStatus,
      planType,
      canEdit: false,
      canPreview: true,
      canPublish: false,
      canViewPublic: false,
      canDownloadQr: false,
      canUseAi: false,
      canConvertToBusiness: isPersonalTrial,
      isReadOnly: true,
      isPendingDelete: false,
      statusLabel: isArchivedMenuSite ? "보관됨" : "체험 기간 종료",
      message: MENU_SITE_INACTIVE_EDIT_MESSAGE,
      ctaLabel: isPersonalTrial ? "사업자 플랜으로 전환하고 복구" : null,
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
    canPreview: hasActiveService,
    canPublish: hasActiveService,
    canViewPublic,
    canDownloadQr: canViewPublic,
    canUseAi: hasActiveService,
    canConvertToBusiness: false,
    isReadOnly: !hasActiveService,
    isPendingDelete: false,
    statusLabel: menuSite.status === "published" ? "공개중" : menuSite.status === "draft" ? "비공개" : "보관됨",
    message: null,
    ctaLabel: null,
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

  const entitlements = await listEntitlements(menuSite.id);
  return buildAccessState(menuSite as MenuSiteRow, entitlements);
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

  const entitlements = await listEntitlements(menuSite.id);
  return buildAccessState(menuSite as MenuSiteRow, entitlements);
}
