import type { PublicMenuItem } from "@/components/menu-templates/types";
import type { OrderCallEntryConfig, PostpayOrderCatalogItem } from "@/components/public-menu/order-call/types";

function normalizePreviewPrice(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null;
  return Math.round(value < 1000 ? value * 1000 : value);
}

export function buildMenuPreviewOrderCatalog(items: PublicMenuItem[]): PostpayOrderCatalogItem[] {
  return items.flatMap((item) => {
    const price = normalizePreviewPrice(item.price);
    if (item.visible === false || item.is_sold_out || item.price_visible === false || price === null) return [];

    return [{
      id: item.id,
      name: item.name,
      price,
      imageUrl: item.image_url ?? undefined,
      optionGroups: [],
    }];
  });
}

export function buildMenuPreviewOrderCallConfig({
  menuSiteId,
  storeName,
  catalog,
}: {
  menuSiteId: string;
  storeName: string;
  catalog: PostpayOrderCatalogItem[];
}): OrderCallEntryConfig {
  return {
    mode: "active",
    orderEnabled: true,
    callEnabled: true,
    hasValidTableSession: true,
    orderingOpen: true,
    languageSlotEnabled: true,
    storeName,
    tableLabel: "TABLE 3 · 화면 미리보기",
    cartCount: 0,
    menuSiteId,
    cartScope: "menu-preview-order-flow",
    orderCatalog: catalog,
    checkoutMode: "prepay",
    checkoutModes: ["prepay", "postpay"],
    previewOnly: true,
  };
}
