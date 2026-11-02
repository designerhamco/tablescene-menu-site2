import { DESIGN_MENU_FOCUS_POLICY } from "@/lib/product-focus-policy";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isCallRuntimeEnabled(value = process.env.CALL_ENABLED) {
  return DESIGN_MENU_FOCUS_POLICY.smartCall && value?.trim().toLowerCase() === "true";
}

export function isCallRuntimeEnabledForSite(
  menuSiteId: string,
  {
    enabled = isCallRuntimeEnabled(),
  }: {
    enabled?: boolean;
  } = {},
) {
  return DESIGN_MENU_FOCUS_POLICY.smartCall
    && enabled
    && UUID_PATTERN.test(menuSiteId);
}
