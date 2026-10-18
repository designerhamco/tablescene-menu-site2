import type {
  PublicMenuCategory,
  PublicMenuItem,
  PublicMenuItemPriceOption,
  PublicMenuTimeSale,
} from "@/components/menu-templates/types";
import type {
  OrderCallEntryConfig,
  PostpayOrderCatalogItem,
} from "@/components/public-menu/order-call/types";
import { isMenuTimeSaleActive } from "@/lib/menu-time-sale-display";
import type { SupportedLocale } from "@/lib/locales";

const PREVIEW_TABLE_LABELS: Record<SupportedLocale, string> = {
  ko: "TABLE 3 · 화면 미리보기",
  en: "TABLE 3 · SCREEN PREVIEW",
  zh: "TABLE 3 · 屏幕预览",
  ja: "TABLE 3 · 画面プレビュー",
};

function normalizePreviewPrice(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0)
    return null;
  return Math.round(value < 1000 ? value * 1000 : value);
}

/** Preview prices mirror visible variants; no mutation or real order is sent. */
export function buildMenuPreviewOrderCatalog(
  items: PublicMenuItem[],
  categories: PublicMenuCategory[] = [],
  priceOptions: PublicMenuItemPriceOption[] = [],
  timeSales: PublicMenuTimeSale[] = [],
  now = Date.now(),
): PostpayOrderCatalogItem[] {
  const categoriesById = new Map(
    categories.map((category) => [category.id, category]),
  );
  const sales = timeSales.filter((sale) => isMenuTimeSaleActive(sale, now));
  const priceFor = (
    item: PublicMenuItem,
    raw: number | null,
    columnId: string | null,
  ) => {
    const base = normalizePreviewPrice(raw);
    if (base == null || item.price_label) return base;
    const target = sales
      .flatMap((sale) => sale.items)
      .find(
        (target) =>
          target.menuItemId === item.id &&
          target.priceColumnId === columnId &&
          target.visible &&
          target.salePrice != null &&
          target.salePrice > 0 &&
          target.salePrice < base,
      );
    return target?.salePrice ?? base;
  };
  const catalog: PostpayOrderCatalogItem[] = items.flatMap((item) => {
    const category = categoriesById.get(item.category_id ?? "");
    if (
      item.visible === false ||
      category?.visible === false ||
      item.is_sold_out ||
      item.price_visible === false
    )
      return [];
    const visibleColumns = new Map(
      category?.priceColumns
        .filter((column) => column.visible)
        .map((column) => [column.id, column]) ?? [],
    );
    const columns = item.priceColumnValues.flatMap((value) => {
      const column = visibleColumns.get(value.priceColumnId);
      const price = value.visible
        ? priceFor(item, value.price, value.priceColumnId)
        : null;
      return column && price != null
        ? [{ id: value.id, name: column.label, price }]
        : [];
    });
    const legacyOptions = priceOptions
      .filter(
        (option) => option.menu_item_id === item.id && option.visible !== false,
      )
      .sort((a, b) => a.sort_order - b.sort_order)
      .flatMap((option) => {
        const price = normalizePreviewPrice(option.price);
        return price != null
          ? [{ id: option.id, name: option.label, price }]
          : [];
      });
    const variants = columns.length ? columns : legacyOptions;
    const price = variants.length
      ? Math.min(...variants.map((v) => v.price))
      : priceFor(item, item.price, null);
    if (price == null) return [];
    return [
      {
        id: item.id,
        name: item.name,
        price,
        imageUrl: item.image_url ?? undefined,
        optionGroups:
          variants.length > 1
            ? [
                {
                  id: item.id + "-price",
                  name: "메뉴 옵션",
                  isRequired: true,
                  minSelections: 1,
                  maxSelections: 1,
                  values: variants.map((value) => ({
                    id: value.id,
                    name: value.name,
                    priceDelta: value.price - price,
                  })),
                },
              ]
            : [],
      },
    ];
  });
  for (const category of categories) {
    if (
      category.visible !== false &&
      category.course_price_visible !== false &&
      category.course_price != null &&
      category.course_price > 0
    )
      catalog.push({
        id: "course:" + category.id,
        name: category.name + " · 코스",
        price: category.course_price,
        optionGroups: [],
      });
  }
  return catalog;
}

export function buildMenuPreviewOrderCallConfig({
  menuSiteId,
  storeName,
  templateKey,
  locale = "ko",
}: {
  menuSiteId: string;
  storeName: string;
  templateKey: string;
  locale?: SupportedLocale;
}): OrderCallEntryConfig {
  void templateKey;

  return {
    mode: "active",
    orderEnabled: false,
    callEnabled: false,
    hasValidTableSession: true,
    orderingOpen: false,
    languageSlotEnabled: true,
    storeName,
    tableLabel: PREVIEW_TABLE_LABELS[locale],
    cartCount: 0,
    menuSiteId,
    orderCatalog: [],
    previewOnly: true,
    callItems: [],
  };
}
