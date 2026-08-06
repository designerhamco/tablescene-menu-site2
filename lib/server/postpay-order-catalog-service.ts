import "server-only";

import { createHash } from "node:crypto";

import type { PostpayOrderCatalogItem } from "@/components/public-menu/order-call/types";
import { isPostpayOrderRuntimeEnabledForSite } from "@/lib/postpay-order-runtime";
import { createAdminClient } from "@/lib/supabase/admin";

export function createPostpayCartScope(tableVisitSessionId: string) {
  return createHash("sha256").update(tableVisitSessionId, "utf8").digest("hex").slice(0, 24);
}

export async function getPostpayOrderCatalog(menuSiteId: string): Promise<PostpayOrderCatalogItem[]> {
  if (!isPostpayOrderRuntimeEnabledForSite(menuSiteId)) return [];

  const supabase = createAdminClient();
  const [itemsResult, groupsResult, valuesResult] = await Promise.all([
    supabase
      .from("menu_items")
      .select("id, name, price, image_url, sort_order")
      .eq("menu_site_id", menuSiteId)
      .eq("visible", true)
      .eq("price_visible", true)
      .eq("orderable", true)
      .eq("is_sold_out", false)
      .order("sort_order")
      .limit(500),
    supabase
      .from("menu_order_option_groups")
      .select("id, menu_item_id, name, is_required, min_selections, max_selections, display_order")
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

  const valuesByGroup = new Map<string, PostpayOrderCatalogItem["optionGroups"][number]["values"]>();
  for (const value of valuesResult.data ?? []) {
    const values = valuesByGroup.get(value.option_group_id) ?? [];
    values.push({ id: value.id, name: value.name, priceDelta: value.price_delta });
    valuesByGroup.set(value.option_group_id, values);
  }

  const groupsByItem = new Map<string, PostpayOrderCatalogItem["optionGroups"]>();
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

  return (itemsResult.data ?? []).map((item) => ({
    id: item.id,
    name: item.name,
    price: item.price,
    imageUrl: item.image_url ?? undefined,
    optionGroups: groupsByItem.get(item.id) ?? [],
  }));
}
