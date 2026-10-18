import type { OrderCallEntryConfig } from "@/components/public-menu/order-call/types";
import type { PublicMenuTemplateProps } from "@/components/menu-templates/types";
import { buildMenuPreviewOrderCatalog } from "./menu-preview-experience";
import { getDefaultStaffCallItems } from "./call-items";
export function buildInteractivePreviewConfig(
  data: Pick<
    PublicMenuTemplateProps,
    | "menuSite"
    | "items"
    | "categories"
    | "priceOptions"
    | "timeSales"
    | "initialNowMs"
  >,
  callEnabled: boolean,
  orderEnabled: boolean,
): OrderCallEntryConfig | undefined {
  if (!callEnabled && !orderEnabled) return undefined;
  const catalog = buildMenuPreviewOrderCatalog(
    data.items,
    data.categories,
    data.priceOptions,
    data.timeSales,
    data.initialNowMs,
  );
  return {
    mode: "active",
    callEnabled,
    orderEnabled,
    hasValidTableSession: true,
    orderingOpen: orderEnabled,
    languageSlotEnabled: true,
    tableLabel: "Table 1",
    storeName: data.menuSite.restaurant_name || data.menuSite.name,
    menuSiteId: data.menuSite.id,
    cartScope: "preview",
    orderCatalog: catalog,
    checkoutModes: ["postpay", "prepay"],
    previewOnly: true,
    callItems: getDefaultStaffCallItems(),
  };
}
