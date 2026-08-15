import type { PublicMenuCategory, PublicMenuItem } from "@/components/menu-templates/types";
import type { OrderCallEntryConfig, PostpayOrderCatalogItem } from "@/components/public-menu/order-call/types";

function normalizePreviewPrice(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null;
  return Math.round(value < 1000 ? value * 1000 : value);
}

export function buildMenuPreviewOrderCatalog(items: PublicMenuItem[], categories: PublicMenuCategory[] = []): PostpayOrderCatalogItem[] {
  const categoriesById = new Map(categories.map((category) => [category.id, category]));

  return items.flatMap((item) => {
    const category = categoriesById.get(item.category_id ?? "");
    const visibleColumns = new Map(category?.priceColumns.filter((column) => column.visible).map((column) => [column.id, column]) ?? []);
    const optionValues = item.priceColumnValues.flatMap((value) => {
      const column = visibleColumns.get(value.priceColumnId);
      const optionPrice = value.visible ? normalizePreviewPrice(value.price) : null;
      if (!column || optionPrice === null) return [];
      return [{ id: value.id, name: column.label, optionPrice }];
    });
    const price = optionValues.length > 1
      ? Math.min(...optionValues.map((value) => value.optionPrice))
      : normalizePreviewPrice(item.price);
    if (item.visible === false || item.is_sold_out || item.price_visible === false || price === null) return [];

    return [{
      id: item.id,
      name: item.name,
      price,
      imageUrl: item.image_url ?? undefined,
      optionGroups: optionValues.length > 1 ? [{
        id: `${item.id}-price`,
        name: "메뉴 옵션",
        isRequired: true,
        minSelections: 1,
        maxSelections: 1,
        values: optionValues.map((value) => ({
          id: value.id,
          name: value.name,
          priceDelta: value.optionPrice - price,
        })),
      }] : [],
    }];
  });
}

export function buildMenuPreviewOrderCallConfig({
  menuSiteId,
  storeName,
  catalog,
  pgEnabled,
}: {
  menuSiteId: string;
  storeName: string;
  catalog: PostpayOrderCatalogItem[];
  pgEnabled: boolean;
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
    checkoutMode: pgEnabled ? "prepay" : "postpay",
    checkoutModes: pgEnabled ? ["prepay", "postpay"] : ["postpay"],
    previewOnly: true,
  };
}
