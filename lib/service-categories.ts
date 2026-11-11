import { getTemplateCapabilities } from "./template-capabilities";
import { getSupportedServices } from "./template-types";

export const SERVICE_CATEGORY_LABELS = {
  basic: "베이직",
  dining: "다이닝",
  display: "디스플레이",
} as const;

export type ServiceCategory = keyof typeof SERVICE_CATEGORY_LABELS;

const productCategories: Readonly<Record<string, ServiceCategory>> = {
  personal_trial_basic_1month: "basic",
  business_basic_single_monthly: "basic",
  business_basic_single_yearly: "basic",
  business_basic_multi_monthly: "dining",
  business_basic_multi_yearly: "dining",
  business_display_monthly: "display",
  business_display_yearly: "display",
};

/** Presentation only. Keep persisted product keys, contracts and service types intact. */
export function getServiceCategory({ productKey, planType, templateKey }: {
  productKey?: string | null;
  planType?: string | null;
  templateKey?: string | null;
}): ServiceCategory | null {
  const product = productKey?.trim() ?? "";
  if (Object.hasOwn(productCategories, product)) return productCategories[product];
  if (planType === "business_display" || getSupportedServices(templateKey).includes("display")) return "display";
  if (getSupportedServices(templateKey).includes("basic")) {
    return getTemplateCapabilities(templateKey).multiPage?.enabled ? "dining" : "basic";
  }
  // Legacy business_basic products covered both services. Do not guess without a template.
  return null;
}

export function getServiceCategoryLabel(category: ServiceCategory) {
  return SERVICE_CATEGORY_LABELS[category];
}
