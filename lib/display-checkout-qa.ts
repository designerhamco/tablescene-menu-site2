import { getAllTemplates } from "@/lib/templates";
import {
  DISPLAY_CHECKOUT_QA_MOCK_BILLING_PREFIX,
  DISPLAY_CHECKOUT_QA_TEMPLATE_KEY,
} from "@/lib/display-checkout-qa-constants";

export function isDisplayCheckoutQaEnabled() {
  return process.env.NODE_ENV !== "production" && process.env.ENABLE_DISPLAY_CHECKOUT_QA === "true";
}

export function getDisplayCheckoutQaTemplates() {
  if (!isDisplayCheckoutQaEnabled()) return [];
  return getAllTemplates().filter((template) => template.key === DISPLAY_CHECKOUT_QA_TEMPLATE_KEY);
}

export function isDisplayCheckoutQaMockBillingKey(value: string | null | undefined) {
  return Boolean(value?.startsWith(DISPLAY_CHECKOUT_QA_MOCK_BILLING_PREFIX));
}
