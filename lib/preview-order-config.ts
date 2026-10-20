import type { OrderCallEntryConfig } from "@/components/public-menu/order-call/types";
import type { PublicMenuTemplateProps } from "@/components/menu-templates/types";
import { buildMenuPreviewOrderCatalog } from "./menu-preview-experience";
import { translateMenuText } from "./menu-ui-copy";
import { isAubeTableTemplate } from "./aube-table";
import { getPreviewStaffCallItems } from "./staff-call-preview";
export function buildInteractivePreviewConfig(
  data: Pick<
    PublicMenuTemplateProps,
    | "locale"
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
    orderCatalog: catalog.map(item => ({ ...item, optionGroups: item.optionGroups.map(group => ({ ...group, name: translateMenuText(group.name, data.locale) })) })),
    checkoutModes: ["postpay", "prepay"],
    previewOnly: true,
    callItems: getPreviewStaffCallItems(isAubeTableTemplate(data.menuSite.template_key) ? "dining" : "basic").map(item => ({ ...item, label: translateMenuText(item.label, data.locale) })),
  };
}
