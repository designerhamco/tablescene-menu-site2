import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";

type AdminClient = ReturnType<typeof createAdminClient>;

export const BASIC_MENU_SITE_LIMIT = 3;

const BASIC_PRODUCT_KEYS = new Set(["business_basic_monthly", "business_basic_yearly"]);
const PERSONAL_TRIAL_PLAN_TYPES = new Set(["personal_trial", "personal_trial_basic_1month"]);
const COUNTABLE_MENU_STATUSES = new Set(["draft", "published"]);

export type ActiveBasicSubscriptionForMenuLimit = Pick<
  Database["public"]["Tables"]["business_subscriptions"]["Row"],
  | "id"
  | "user_id"
  | "menu_site_id"
  | "business_profile_id"
  | "product_key"
  | "plan_type"
  | "billing_cycle"
  | "status"
  | "current_period_start"
  | "current_period_end"
  | "next_billing_at"
  | "created_at"
>;

export type BasicMenuSiteLimitState = {
  limit: number;
  usedCount: number;
  nextSlot: number;
  canCreate: boolean;
  activeBasicSubscriptionCount: number;
  activeBasicSubscription: ActiveBasicSubscriptionForMenuLimit | null;
  activeBasicSubscriptions: ActiveBasicSubscriptionForMenuLimit[];
  isPersonalTrialLimited: boolean;
};

function isActiveBasicSubscription(subscription: ActiveBasicSubscriptionForMenuLimit | null | undefined) {
  return (
    subscription?.status === "active" &&
    (subscription.plan_type === "business_basic" || BASIC_PRODUCT_KEYS.has(subscription.product_key ?? ""))
  );
}

function isCountableMenuStatus(status: string | null | undefined) {
  return status ? COUNTABLE_MENU_STATUSES.has(status) : false;
}

function isPersonalTrialPlanType(planType: string | null | undefined) {
  return planType ? PERSONAL_TRIAL_PLAN_TYPES.has(planType) : false;
}

export async function getBasicMenuSiteLimitState({
  adminSupabase = createAdminClient(),
  userId,
}: {
  adminSupabase?: AdminClient;
  userId: string;
}): Promise<BasicMenuSiteLimitState> {
  const { data: subscriptions, error: subscriptionsError } = await adminSupabase
    .from("business_subscriptions")
    .select("id, user_id, menu_site_id, business_profile_id, product_key, plan_type, billing_cycle, status, current_period_start, current_period_end, next_billing_at, created_at")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (subscriptionsError) {
    throw new Error(`BASIC_MENU_LIMIT_SUBSCRIPTION_QUERY_FAILED: ${subscriptionsError.message}`);
  }

  const activeBasicSubscriptions = ((subscriptions ?? []) as ActiveBasicSubscriptionForMenuLimit[]).filter(isActiveBasicSubscription);
  const activeBasicSubscriptionIds = activeBasicSubscriptions.map((subscription) => subscription.id);

  if (activeBasicSubscriptions.length === 0) {
    const { data: trialEntitlements, error: trialEntitlementsError } = await adminSupabase
      .from("service_entitlements")
      .select("menu_site_id, plan_type, status")
      .eq("user_id", userId)
      .eq("status", "active");

    if (trialEntitlementsError) {
      throw new Error(`BASIC_MENU_LIMIT_TRIAL_ENTITLEMENT_QUERY_FAILED: ${trialEntitlementsError.message}`);
    }

    const trialMenuSiteIds = new Set(
      (trialEntitlements ?? [])
        .filter((entitlement) => isPersonalTrialPlanType(entitlement.plan_type))
        .map((entitlement) => entitlement.menu_site_id)
        .filter((menuSiteId): menuSiteId is string => Boolean(menuSiteId)),
    );

    if (trialMenuSiteIds.size > 0) {
      const { data: trialMenuSites, error: trialMenuSitesError } = await adminSupabase
        .from("menu_sites")
        .select("id, status")
        .in("id", Array.from(trialMenuSiteIds));

      if (trialMenuSitesError) {
        throw new Error(`BASIC_MENU_LIMIT_TRIAL_MENU_SITE_QUERY_FAILED: ${trialMenuSitesError.message}`);
      }

      const usedCount = (trialMenuSites ?? []).filter((site) => isCountableMenuStatus(site.status)).length;

      return {
        limit: 1,
        usedCount,
        nextSlot: 1,
        canCreate: false,
        activeBasicSubscriptionCount: 0,
        activeBasicSubscription: null,
        activeBasicSubscriptions: [],
        isPersonalTrialLimited: usedCount > 0,
      };
    }

    return {
      limit: 0,
      usedCount: 0,
      nextSlot: 1,
      canCreate: false,
      activeBasicSubscriptionCount: 0,
      activeBasicSubscription: null,
      activeBasicSubscriptions: [],
      isPersonalTrialLimited: false,
    };
  }

  const menuSiteIdsBySubscription = new Map<string, Set<string>>();
  const allBasicMenuSiteIds = new Set<string>();

  for (const subscription of activeBasicSubscriptions) {
    const menuSiteIds = new Set<string>();
    if (subscription.menu_site_id) {
      menuSiteIds.add(subscription.menu_site_id);
      allBasicMenuSiteIds.add(subscription.menu_site_id);
    }
    menuSiteIdsBySubscription.set(subscription.id, menuSiteIds);
  }

  const { data: entitlements, error: entitlementsError } = await adminSupabase
    .from("service_entitlements")
    .select("menu_site_id, plan_type, status, subscription_id")
    .eq("user_id", userId)
    .in("subscription_id", activeBasicSubscriptionIds)
    .eq("plan_type", "business_basic")
    .eq("status", "active");

  if (entitlementsError) {
    throw new Error(`BASIC_MENU_LIMIT_ENTITLEMENT_QUERY_FAILED: ${entitlementsError.message}`);
  }

  for (const entitlement of entitlements ?? []) {
    if (entitlement.menu_site_id && entitlement.subscription_id) {
      menuSiteIdsBySubscription.get(entitlement.subscription_id)?.add(entitlement.menu_site_id);
      allBasicMenuSiteIds.add(entitlement.menu_site_id);
    }
  }

  const totalLimit = activeBasicSubscriptions.length * BASIC_MENU_SITE_LIMIT;

  if (allBasicMenuSiteIds.size === 0) {
    return {
      limit: totalLimit,
      usedCount: 0,
      nextSlot: 1,
      canCreate: true,
      activeBasicSubscriptionCount: activeBasicSubscriptions.length,
      activeBasicSubscription: activeBasicSubscriptions[0] ?? null,
      activeBasicSubscriptions,
      isPersonalTrialLimited: false,
    };
  }

  const { data: menuSites, error: menuSitesError } = await adminSupabase
    .from("menu_sites")
    .select("id, status, template_key")
    .in("id", Array.from(allBasicMenuSiteIds));

  if (menuSitesError) {
    throw new Error(`BASIC_MENU_LIMIT_MENU_SITE_QUERY_FAILED: ${menuSitesError.message}`);
  }

  const countableMenuSiteIds = new Set(
    (menuSites ?? [])
      .filter((site) => isCountableMenuStatus(site.status))
      .map((site) => site.id),
  );
  const usedCount = countableMenuSiteIds.size;
  const nextSlot = Math.min(usedCount + 1, totalLimit);
  const subscriptionUsage = activeBasicSubscriptions.map((subscription) => {
    const subscriptionMenuSiteIds = menuSiteIdsBySubscription.get(subscription.id) ?? new Set<string>();
    const usedBySubscription = Array.from(subscriptionMenuSiteIds).filter((menuSiteId) => countableMenuSiteIds.has(menuSiteId)).length;
    return { subscription, usedBySubscription };
  });
  const activeBasicSubscription = subscriptionUsage.find(({ usedBySubscription }) => usedBySubscription < BASIC_MENU_SITE_LIMIT)?.subscription ?? null;

  return {
    limit: totalLimit,
    usedCount,
    nextSlot,
    canCreate: usedCount < totalLimit && Boolean(activeBasicSubscription),
    activeBasicSubscriptionCount: activeBasicSubscriptions.length,
    activeBasicSubscription,
    activeBasicSubscriptions,
    isPersonalTrialLimited: false,
  };
}

export function getBasicMenuCreateLabel(state: BasicMenuSiteLimitState | null | undefined) {
  if (state?.isPersonalTrialLimited) return `체험 메뉴판 ${state.usedCount}/${state.limit}개 사용 중`;
  if (!state?.activeBasicSubscription) return "새 메뉴판 만들기";
  if (!state.canCreate) return `메뉴판 ${state.usedCount}/${state.limit}개 사용 중`;
  return `새 메뉴판 만들기 ${state.nextSlot}/${state.limit}`;
}
