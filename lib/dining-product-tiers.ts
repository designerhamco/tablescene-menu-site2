import { getTemplateCapabilities } from "@/lib/template-capabilities";

export type DiningTemplateTier = "single" | "multi";

const SINGLE_DINING_PRODUCT_KEYS = new Set([
  "personal_trial_basic_1month",
  "business_basic_single_monthly",
  "business_basic_single_yearly",
]);

const MULTI_DINING_PRODUCT_KEYS = new Set([
  "business_basic_multi_monthly",
  "business_basic_multi_yearly",
]);

const LEGACY_DINING_PRODUCT_KEYS = new Set([
  "business_basic_monthly",
  "business_basic_yearly",
]);

export function getDiningTemplateTier(templateKey: string | null | undefined): DiningTemplateTier {
  return getTemplateCapabilities(templateKey).multiPage?.enabled ? "multi" : "single";
}

export function getDiningProductTier(productKey: string | null | undefined): DiningTemplateTier | null {
  if (!productKey) return null;
  if (SINGLE_DINING_PRODUCT_KEYS.has(productKey)) return "single";
  if (MULTI_DINING_PRODUCT_KEYS.has(productKey)) return "multi";
  return null;
}

export function isLegacyDiningProductKey(productKey: string | null | undefined) {
  return Boolean(productKey && LEGACY_DINING_PRODUCT_KEYS.has(productKey));
}

export function isDiningProductCompatibleWithTemplate(
  productKey: string | null | undefined,
  templateKey: string | null | undefined,
) {
  if (isLegacyDiningProductKey(productKey)) return true;

  const productTier = getDiningProductTier(productKey);
  return productTier ? productTier === getDiningTemplateTier(templateKey) : true;
}

export function getDiningTierLabel(tier: DiningTemplateTier) {
  return tier === "multi" ? "멀티페이지" : "단일페이지";
}
