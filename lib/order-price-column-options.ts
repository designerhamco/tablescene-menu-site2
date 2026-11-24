import type { PublicMenuCategory, PublicMenuItem, PublicMenuTimeSale } from "@/components/menu-templates/types";
import type { PostpayOrderCatalogOptionGroup } from "@/components/public-menu/order-call/types";
import { isMenuTimeSaleActive } from "@/lib/menu-time-sale-display";

/** Scoped orders use the saved numeric price of the selected visible column. */
export function getOrderPriceColumnOptions(
  item: Pick<PublicMenuItem, "id" | "category_id" | "priceColumnValues">,
  category: Pick<PublicMenuCategory, "id" | "priceColumns"> | undefined,
  timeSales: PublicMenuTimeSale[],
  now: number,
): { price: number; group: PostpayOrderCatalogOptionGroup } | null {
  if (!category || category.id !== item.category_id) return null;
  const sales = timeSales.filter(sale => isMenuTimeSaleActive(sale, now));
  const variants = category.priceColumns.flatMap(column => {
    const value = item.priceColumnValues.find(entry => entry.priceColumnId === column.id);
    const basePrice = value?.price;
    if (!column.visible || !value?.visible || basePrice == null || !Number.isInteger(basePrice) || basePrice < 0) return [];
    const price = sales.flatMap(sale => sale.items).find(target =>
      target.visible && target.menuItemId === item.id && target.priceColumnId === column.id
      && target.salePrice != null && target.salePrice > 0 && target.salePrice < basePrice
    )?.salePrice ?? basePrice;
    return [{ id: value.id, name: column.label, priceColumnId: column.id, price }];
  });
  if (variants.length === 0) return null;
  const price = Math.min(...variants.map(variant => variant.price));
  return {
    price,
    group: {
      id: item.id + "-price",
      name: "가격 옵션",
      isRequired: true,
      minSelections: 1,
      maxSelections: 1,
      values: variants.map(({ price: variantPrice, ...variant }) => ({ ...variant, priceDelta: variantPrice - price })),
    },
  };
}
