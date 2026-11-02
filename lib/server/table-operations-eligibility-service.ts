import "server-only";

import { isPaidTableOperationsEligible } from "@/lib/table-operations-eligibility";
import { getMenuSiteAccessStateForMenuSite } from "@/lib/server/menu-site-access-service";
import { createAdminClient } from "@/lib/supabase/admin";

export async function hasPaidTableOperationsAccess(menuSiteId: string) {
  const access = await getMenuSiteAccessStateForMenuSite({ menuSiteId });
  if (!access || access.planType !== "business_basic" || !access.canEdit || !access.canUseWriteActions) return false;
  const { data, error } = await createAdminClient().from("menu_sites")
    .select("template_key").eq("id", menuSiteId).maybeSingle();
  return !error && Boolean(data) && isPaidTableOperationsEligible(access, data?.template_key);
}
