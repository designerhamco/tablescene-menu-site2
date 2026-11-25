import { getCatalogDesign } from "./catalog-designs";
import { templateCatalog } from "./templates";
import { getDiningTemplateTier } from "./dining-product-tiers";
import type { MenuTemplateService } from "./menu-design-policy";

export type MenuTemplateSubscription = {
  id: string; user_id: string; menu_site_id: string | null; product_key: string;
  status: string; current_period_end: string | null; trial_ends_at: string | null;
};

/** Template access does not depend on an old paid design tier or contract version.
 * It still requires an owned menu, an unexpired subscription and the same service.
 */
export function resolveMenuTemplateEntitlement(subscription: MenuTemplateSubscription, site: {
  id: string; user_id: string; template_key: string | null;
}, userId: string, now = Date.now()) {
  if (subscription.user_id !== userId || site.user_id !== userId || subscription.menu_site_id !== site.id) return null;
  if (subscription.status !== "active" && subscription.status !== "trialing") return null;
  const end = subscription.status === "trialing" ? subscription.trial_ends_at : subscription.current_period_end;
  if (!end || !Number.isFinite(Date.parse(end)) || Date.parse(end) <= now) return null;
  const registered = templateCatalog.find(template => template.key === site.template_key);
  const siteService = getCatalogDesign(site.template_key)?.service ?? (registered ? registered.service === "display" ? "display" : getDiningTemplateTier(registered.key) === "multi" ? "dining" : "basic" : site.template_key === "basic" ? "basic" : undefined);
  const service: MenuTemplateService | undefined = ["business_basic_single_monthly", "business_basic_single_yearly"].includes(subscription.product_key) ? "basic"
    : ["business_basic_multi_monthly", "business_basic_multi_yearly"].includes(subscription.product_key) ? "dining"
    : ["business_display_monthly", "business_display_yearly"].includes(subscription.product_key) ? "display"
    : ["business_basic_monthly", "business_basic_yearly"].includes(subscription.product_key) && siteService !== "display" ? siteService : undefined;
  if (!service || service !== siteService) return null;
  return { subscriptionId: subscription.id, service, access: "all" as const };
}
