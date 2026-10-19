import { getDiningTemplateFeatures, getDiningTemplateTier } from "@/lib/dining-product-tiers";
import { templateSubscriptionPricing } from "@/lib/template-subscription-pricing";
import { getTemplatePreviewRouteKey, resolveTemplatePreviewRouteKey, templateCatalog, type TemplateCatalogItem } from "@/lib/templates";

// Detail pages are a public sales surface: unknown, retired and hidden designs
// must never fall back to the catalog's default template.
export function getPublicTemplateDetail(routeKey: string) {
  const key = resolveTemplatePreviewRouteKey(routeKey);
  return templateCatalog.find(template => template.key === key && template.status === "available") ?? null;
}

export function getTemplateDetailHref(templateKey: string) {
  return `/templates/${getTemplatePreviewRouteKey(templateKey)}`;
}

export function getTemplateDetailInfo(template: TemplateCatalogItem) {
  const display = template.service === "display";
  const multiPage = !display && getDiningTemplateTier(template.key) === "multi";
  const features = getDiningTemplateFeatures(template.key);
  const pricing = display ? templateSubscriptionPricing.display : multiPage ? templateSubscriptionPricing.multiPage : templateSubscriptionPricing.singlePage;
  const productKey = display ? "business_display_monthly" : multiPage ? "business_basic_multi_monthly" : "business_basic_single_monthly";
  return {
    display,
    multiPage,
    features,
    pricing,
    serviceLabel: display ? "디스플레이" : multiPage ? "다이닝" : "베이직",
    formatLabel: display ? "TV·모니터 메뉴판" : multiPage ? "멀티페이지 메뉴판" : "원페이지 메뉴판",
    previewHref: `${getTemplateDetailHref(template.key)}/preview`,
    startHref: display ? `/apply/display?template=${template.key}` : `/apply/basic?product=${productKey}&template=${template.key}`,
    listHref: display ? "/apply?plan=display" : multiPage ? "/apply?plan=dining" : "/apply",
    image: `/template-previews/${getTemplatePreviewRouteKey(template.key)}.jpg`,
  };
}
