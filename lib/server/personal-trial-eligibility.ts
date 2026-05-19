import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { personalTrialBasicProduct } from "@/lib/payments";

type PersonalTrialEntitlementRow = {
  id: string | null;
  menu_site_id: string | null;
  status: string | null;
  plan_type: string | null;
  product_key?: string | null;
};

type PersonalTrialMenuSiteRow = {
  id: string | null;
  status: string | null;
  settings: unknown;
};

function isMissingPersonalTrialSource(error: { code?: string; message?: string } | null | undefined, relationName: string) {
  const message = error?.message ?? "";
  return error?.code === "42P01" || message.includes(relationName) || message.includes("does not exist");
}

function getRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export async function hasUsedPersonalTrial(userId: string) {
  const adminSupabase = createAdminClient();

  const { data: entitlements, error: entitlementsError } = await adminSupabase
    .from("service_entitlements")
    .select("id, menu_site_id, status, plan_type, product_key")
    .eq("user_id", userId)
    .or(`plan_type.eq.personal_trial,product_key.eq.${personalTrialBasicProduct.product_key}`);

  if (entitlementsError && !isMissingPersonalTrialSource(entitlementsError, "service_entitlements")) {
    throw Object.assign(new Error(entitlementsError.message || "개인 체험 이용 이력 확인에 실패했습니다."), {
      code: entitlementsError.code,
      details: entitlementsError.details,
      hint: entitlementsError.hint,
    });
  }

  const existingEntitlement = ((entitlements ?? []) as PersonalTrialEntitlementRow[]).find((entitlement) => {
    return entitlement.plan_type === "personal_trial" || entitlement.product_key === personalTrialBasicProduct.product_key;
  });

  if (existingEntitlement) {
    return {
      used: true,
      existingMenuSiteId: existingEntitlement.menu_site_id ?? undefined,
      existingEntitlementStatus: existingEntitlement.status ?? undefined,
      reason: "service_entitlement_exists",
    };
  }

  const { data: menuSites, error: menuSitesError } = await adminSupabase
    .from("menu_sites")
    .select("id, status, settings")
    .eq("user_id", userId);

  if (menuSitesError) {
    if (isMissingPersonalTrialSource(menuSitesError, "menu_sites")) {
      return { used: false };
    }

    throw Object.assign(new Error(menuSitesError.message || "개인 체험 메뉴판 확인에 실패했습니다."), {
      code: menuSitesError.code,
      details: menuSitesError.details,
      hint: menuSitesError.hint,
    });
  }

  const existingMenuSite = ((menuSites ?? []) as PersonalTrialMenuSiteRow[]).find((menuSite) => {
    const settings = getRecord(menuSite.settings);
    return settings.plan_type === "personal_trial" || settings.product_key === personalTrialBasicProduct.product_key;
  });

  if (existingMenuSite) {
    return {
      used: true,
      existingMenuSiteId: existingMenuSite.id ?? undefined,
      existingEntitlementStatus: existingMenuSite.status ?? undefined,
      reason: "menu_site_settings_exists",
    };
  }

  return { used: false };
}
