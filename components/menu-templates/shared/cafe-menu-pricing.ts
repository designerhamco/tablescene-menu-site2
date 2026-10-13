// Extracted without changing the existing rendering or fit formulas.
import type { PublicMenuTemplateProps } from "@/components/menu-templates/types";
import { formatMenuPriceByMode } from "@/lib/menu-price-format";
import { MENU_LIMITS } from "@/lib/menu-starter-presets";
import { type TemplateCapabilities } from "@/lib/template-capabilities";
import { formatMenuPrice } from "@/types/menu";
import { type CafeDesignAPriceDisplayMode, type CafeDesignAPriceToken, type MenuCategory, type MenuItem, type PriceOption, type PublicItemPriceColumnValue } from "@/components/menu-templates/shared/cafe-template-types";


export function getItemPriceOptions(priceOptions: PublicMenuTemplateProps["priceOptions"], itemId: string, maxOptions: number = MENU_LIMITS.maxPriceOptionsPerItem) {
  return priceOptions
    .filter((option) => option.menu_item_id === itemId && option.visible !== false)
    .sort((a, b) => a.sort_order - b.sort_order)
    .slice(0, maxOptions);
}


export function formatPriceOption(option: PriceOption, priceDisplayMode: CafeDesignAPriceDisplayMode = null) {
  const rawPrice = option.price as unknown;
  if (priceDisplayMode) {
    if (typeof rawPrice === "number" && Number.isFinite(rawPrice)) return formatMenuPriceByMode(rawPrice, priceDisplayMode);
    if (typeof rawPrice === "string" && rawPrice.trim()) {
      const numericPrice = Number(rawPrice.replace(/,/g, ""));
      return Number.isFinite(numericPrice) ? formatMenuPriceByMode(numericPrice, priceDisplayMode) : "";
    }
    return "";
  }

  const priceLabel = option.price_label?.trim();
  if (priceLabel) return priceLabel;

  if (typeof rawPrice === "number" && Number.isFinite(rawPrice)) {
    return new Intl.NumberFormat("ko-KR").format(rawPrice) + "원";
  }
  if (typeof rawPrice === "string" && rawPrice.trim()) {
    const numericPrice = Number(rawPrice.replace(/,/g, ""));
    if (!Number.isFinite(numericPrice)) return rawPrice.trim();
    return new Intl.NumberFormat("ko-KR").format(numericPrice) + "원";
  }

  return "";
}


function getItemPriceTokens(
  item: MenuItem,
  priceOptions: PublicMenuTemplateProps["priceOptions"],
  capabilities: TemplateCapabilities,
  priceDisplayMode: CafeDesignAPriceDisplayMode = null,
): CafeDesignAPriceToken[] {
  if (item.price_visible === false) return [];

  const maxOptions = capabilities.maxPriceOptionsPerItem ?? MENU_LIMITS.maxPriceOptionsPerItem;
  const visibleOptions = capabilities.priceOptions ? getItemPriceOptions(priceOptions, item.id, maxOptions) : [];
  if (visibleOptions.length > 0) {
    const optionTokens = visibleOptions
      .map((option) => ({
        label: option.label.trim(),
        price: formatPriceOption(option, priceDisplayMode),
      }))
      .filter((token) => token.label || token.price);

    return optionTokens.map((token) => ({
      label: token.label,
      price: token.price,
    }));
  }

  const priceLabel = item.price_label?.trim() ?? "";
  const price = priceLabel || (priceDisplayMode ? formatMenuPriceByMode(item.price, priceDisplayMode) : formatMenuPrice(item));
  if (!price) return [];
  const priceNote = item.priceNote?.trim() ?? "";

  return [
    {
      label: priceNote,
      price,
    },
  ];
}


export function getVisibleCategoryPriceColumns(category: MenuCategory) {
  return category.priceColumns
    .filter((column) => column.visible)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .slice(0, 3);
}


function getVisibleItemPriceColumnValueMap(item: MenuItem, category: MenuCategory) {
  const visibleColumnIds = new Set(getVisibleCategoryPriceColumns(category).map((column) => column.id));
  const values = new Map<string, PublicItemPriceColumnValue>();

  for (const value of item.priceColumnValues) {
    if (!value.visible || value.price == null || !visibleColumnIds.has(value.priceColumnId)) continue;
    values.set(value.priceColumnId, value);
  }

  return values;
}


function formatPriceColumnValue(value: PublicItemPriceColumnValue, priceDisplayMode: CafeDesignAPriceDisplayMode = null) {
  if (priceDisplayMode) {
    return typeof value.price === "number" && Number.isFinite(value.price) ? formatMenuPriceByMode(value.price, priceDisplayMode) : "";
  }

  const priceLabel = value.priceLabel?.trim();
  if (priceLabel) return priceLabel;

  if (typeof value.price === "number" && Number.isFinite(value.price)) {
    return new Intl.NumberFormat("ko-KR").format(value.price) + "원";
  }

  return "";
}


export function getItemPriceColumnTokens(
  item: MenuItem,
  category: MenuCategory,
  priceDisplayMode: CafeDesignAPriceDisplayMode = null,
): CafeDesignAPriceToken[] {
  if (item.price_visible === false) return [];

  const columns = getVisibleCategoryPriceColumns(category);
  if (columns.length === 0) return [];

  const valueByColumnId = getVisibleItemPriceColumnValueMap(item, category);
  if (valueByColumnId.size === 0) return [];

  return columns.map((column) => {
    const value = valueByColumnId.get(column.id);
    const price = value ? formatPriceColumnValue(value, priceDisplayMode) : "";
    return {
      label: column.label.trim(),
      price,
      priceColumnId: column.id,
      originalPrice: value?.price ?? null,
    };
  });
}


export function getItemPriceTokensForCategory(
  item: MenuItem,
  category: MenuCategory,
  priceOptions: PublicMenuTemplateProps["priceOptions"],
  capabilities: TemplateCapabilities,
  priceDisplayMode: CafeDesignAPriceDisplayMode = null,
) {
  const columnPriceTokens = getItemPriceColumnTokens(item, category, priceDisplayMode);
  if (columnPriceTokens.some((token) => token.price)) {
    return {
      priceTokens: columnPriceTokens,
      usesPriceColumns: true,
    };
  }

  return {
    priceTokens: getItemPriceTokens(item, priceOptions, capabilities, priceDisplayMode),
    usesPriceColumns: false,
  };
}
