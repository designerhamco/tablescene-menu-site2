import "server-only";

import { readMenuOrderSettings } from "@/lib/menu-order-settings";
import type { PublicMenuTemplateProps } from "@/components/menu-templates/types";
import { isMenuTimeSaleActive } from "@/lib/menu-time-sale-display";
import { createHash } from "node:crypto";

import type { PostpayOrderCatalogItem } from "@/components/public-menu/order-call/types";
import { isPostpayOrderRuntimeEnabledForSite } from "@/lib/postpay-order-runtime";
import { createAdminClient } from "@/lib/supabase/admin";

export function createPostpayCartScope(tableVisitSessionId: string) {
  return createHash("sha256")
    .update(tableVisitSessionId, "utf8")
    .digest("hex")
    .slice(0, 24);
}

export async function getPostpayOrderCatalog(
  menuSiteId: string,
  publicData?: Pick<
    PublicMenuTemplateProps,
    "categories" | "timeSales" | "menuSite" | "initialNowMs"
  >,
): Promise<PostpayOrderCatalogItem[]> {
  if (!isPostpayOrderRuntimeEnabledForSite(menuSiteId)) return [];

  const supabase = createAdminClient();
  const [itemsResult, groupsResult, valuesResult] = await Promise.all([
    supabase
      .from("menu_items")
      .select(
        "id, name, price, price_label, category_id, image_url, sort_order",
      )
      .eq("menu_site_id", menuSiteId)
      .eq("visible", true)
      .eq("price_visible", true)
      .eq("orderable", true)
      .eq("is_sold_out", false)
      .order("sort_order")
      .limit(500),
    supabase
      .from("menu_order_option_groups")
      .select(
        "id, menu_item_id, name, is_required, min_selections, max_selections, display_order",
      )
      .eq("menu_site_id", menuSiteId)
      .eq("status", "active")
      .order("display_order")
      .limit(1000),
    supabase
      .from("menu_order_option_values")
      .select("id, option_group_id, name, price_delta, display_order")
      .eq("menu_site_id", menuSiteId)
      .eq("status", "active")
      .order("display_order")
      .limit(5000),
  ]);

  if (itemsResult.error || groupsResult.error || valuesResult.error) return [];

  const valuesByGroup = new Map<
    string,
    PostpayOrderCatalogItem["optionGroups"][number]["values"]
  >();
  for (const value of valuesResult.data ?? []) {
    const values = valuesByGroup.get(value.option_group_id) ?? [];
    values.push({
      id: value.id,
      name: value.name,
      priceDelta: value.price_delta,
    });
    valuesByGroup.set(value.option_group_id, values);
  }

  const groupsByItem = new Map<
    string,
    PostpayOrderCatalogItem["optionGroups"]
  >();
  for (const group of groupsResult.data ?? []) {
    const groups = groupsByItem.get(group.menu_item_id) ?? [];
    groups.push({
      id: group.id,
      name: group.name,
      isRequired: group.is_required,
      minSelections: group.min_selections,
      maxSelections: group.max_selections,
      values: valuesByGroup.get(group.id) ?? [],
    });
    groupsByItem.set(group.menu_item_id, groups);
  }

  const catalog: PostpayOrderCatalogItem[] = (itemsResult.data ?? [])
    .filter(
      (item) =>
        !item.category_id ||
        !publicData ||
        publicData.categories.some(
          (category) =>
            category.id === item.category_id && category.visible !== false,
        ),
    )
    .map((item) => ({
      id: item.id,
      name: item.name,
      price: !item.price_label
        ? (publicData?.timeSales
            .filter((sale) =>
              isMenuTimeSaleActive(sale, publicData.initialNowMs),
            )
            .flatMap((sale) => sale.items)
            .find(
              (target) =>
                target.menuItemId === item.id &&
                target.priceColumnId == null &&
                target.visible &&
                target.salePrice != null &&
                target.salePrice > 0 &&
                target.salePrice < item.price,
            )?.salePrice ?? item.price)
        : item.price,
      imageUrl: item.image_url ?? undefined,
      optionGroups: groupsByItem.get(item.id) ?? [],
    }));
  const preferences = readMenuOrderSettings(publicData?.menuSite.settings);
  for (const course of publicData?.categories ?? []) {
    if (
      preferences.orderableCourseIds.includes(course.id) &&
      course.visible !== false &&
      course.course_price_visible !== false &&
      course.course_price != null &&
      course.course_price > 0
    )
      catalog.push({
        id: "course:" + course.id,
        name: course.name + " · 코스",
        price: course.course_price,
        optionGroups: [],
      });
  }
  return catalog;
}
