import type { PublicMenuTimeSale } from "@/components/menu-templates/types";
import { isMenuTimeSaleActive } from "@/lib/menu-time-sale-display";

export type DisplayMenuTimeSaleTarget = PublicMenuTimeSale["items"][number];

export type DisplayMenuTimeSaleMatch = {
  promotion: PublicMenuTimeSale;
  item: DisplayMenuTimeSaleTarget | null;
  optionItemsByPriceColumnId: Map<string, DisplayMenuTimeSaleTarget>;
};

export function getActiveDisplayMenuTimeSalesByItemId(
  timeSales: PublicMenuTimeSale[],
  nowMs: number,
) {
  const matches = new Map<string, DisplayMenuTimeSaleMatch>();

  for (const promotion of timeSales) {
    if (!isMenuTimeSaleActive(promotion, nowMs)) continue;

    for (const target of promotion.items) {
      if (
        target.visible === false ||
        target.salePrice == null ||
        !Number.isFinite(target.salePrice) ||
        target.salePrice <= 0
      ) {
        continue;
      }

      let match = matches.get(target.menuItemId);
      if (!match) {
        match = {
          promotion,
          item: null,
          optionItemsByPriceColumnId: new Map(),
        };
        matches.set(target.menuItemId, match);
      }

      if (match.promotion.id !== promotion.id) continue;

      if (target.priceColumnId === null) {
        match.item ??= target;
      } else if (!match.optionItemsByPriceColumnId.has(target.priceColumnId)) {
        match.optionItemsByPriceColumnId.set(target.priceColumnId, target);
      }
    }
  }

  return matches;
}

export function canShowDisplayMenuTimeSale({
  item,
  target,
  hasPriceOptions,
}: {
  item: {
    is_sold_out: boolean;
    price_visible: boolean;
    price: number | null;
  };
  target: DisplayMenuTimeSaleTarget | null | undefined;
  hasPriceOptions: boolean;
}) {
  return Boolean(
    !hasPriceOptions &&
      item.is_sold_out !== true &&
      item.price_visible !== false &&
      typeof item.price === "number" &&
      Number.isFinite(item.price) &&
      item.price > 0 &&
      target?.visible !== false &&
      typeof target?.salePrice === "number" &&
      Number.isFinite(target.salePrice) &&
      target.salePrice > 0 &&
      target.salePrice < item.price,
  );
}
