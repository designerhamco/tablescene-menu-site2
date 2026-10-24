import { getDefaultDesignReview } from "./menu-design-policy";
import type { MenuPageData } from "./menu-page-data";
import { readMenuOrderSettings } from "./menu-order-settings";
import { getDiningTemplateFeatures } from "./dining-product-tiers";

const record = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};

/** Customer previews show saved content/settings; catalog experiments never apply here. */
export function buildSavedMenuPreview(source: MenuPageData) {
  const settings = record(source.menuSite.settings);
  const design = getDefaultDesignReview(typeof settings.menu_design_id === "string" ? settings.menu_design_id : undefined, source.menuSite.template_key ?? "");
  const order = readMenuOrderSettings(settings);
  const capabilities = getDiningTemplateFeatures(source.menuSite.template_key);
  return {
    data: source,
    design,
    features: {
      call: capabilities.smartCall && order.callEnabled,
      order: capabilities.order && order.orderEnabled && order.postpayEnabled,
    },
  };
}
