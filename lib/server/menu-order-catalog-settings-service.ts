import "server-only";
import {
  requireMenuSitePermission,
  requireMenuSiteWriteAccess,
} from "./menu-site-access-service";
import { createAdminClient } from "@/lib/supabase/admin";
import { MenuSiteAccessError } from "@/lib/menu-site-permissions";
import {
  parseMenuItemOrderConfiguration,
  type MenuItemOrderConfiguration,
} from "@/lib/menu-order-configuration";
import type { Json } from "@/lib/supabase/types";

export type OrderCatalogSettingsItem = MenuItemOrderConfiguration & {
  name: string;
  visible: boolean;
  soldOut: boolean;
};
async function requireOwner(menuId: string) {
  const context = await requireMenuSitePermission(menuId, "menu.read");
  if (!context.isOwner)
    throw new MenuSiteAccessError(
      "MENU_SITE_PERMISSION_DENIED",
      "주문 상품 설정은 사장님만 변경할 수 있습니다.",
      403,
    );
  return context;
}
export async function loadMenuOrderCatalogSettings(
  menuId: string,
): Promise<OrderCatalogSettingsItem[]> {
  await requireOwner(menuId);
  const db = createAdminClient();
  const [items, groups, values] = await Promise.all([
    db
      .from("menu_items")
      .select("id,name,updated_at,price,orderable,visible,is_sold_out")
      .eq("menu_site_id", menuId)
      .order("sort_order"),
    db
      .from("menu_order_option_groups")
      .select("id,menu_item_id,name,is_required,max_selections")
      .eq("menu_site_id", menuId)
      .eq("status", "active")
      .order("display_order"),
    db
      .from("menu_order_option_values")
      .select("id,option_group_id,name,price_delta")
      .eq("menu_site_id", menuId)
      .eq("status", "active")
      .order("display_order"),
  ]);
  if (items.error || groups.error || values.error)
    throw new Error("주문 상품 설정을 불러오지 못했습니다.");
  return (items.data ?? []).map((item) => ({
    id: item.id,
    name: item.name,
    updatedAt: item.updated_at!,
    price: item.price ?? 0,
    orderable: item.orderable,
    visible: item.visible !== false,
    soldOut: Boolean(item.is_sold_out),
    groups: (groups.data ?? [])
      .filter((g) => g.menu_item_id === item.id)
      .map((group) => ({
        id: group.id,
        name: group.name,
        required: group.is_required,
        multiple: group.max_selections > 1,
        values: (values.data ?? [])
          .filter((v) => v.option_group_id === group.id)
          .map((value) => ({
            id: value.id,
            name: value.name,
            priceDelta: value.price_delta,
          })),
      })),
  }));
}
export async function saveMenuItemOrderConfiguration(
  menuId: string,
  raw: unknown,
) {
  const context = await requireOwner(menuId);
  const configuration = parseMenuItemOrderConfiguration(raw);
  const { supabase } = await requireMenuSiteWriteAccess(
    menuId,
    "menu.edit",
    "menu_order_settings",
  );
  const { data, error } = await supabase.rpc(
    "replace_menu_item_order_options" as never,
    {
      p_menu_site_id: menuId,
      p_menu_item_id: configuration.id,
      p_actor_user_id: context.actorUserId,
      p_expected_updated_at: configuration.updatedAt,
      p_orderable: configuration.orderable,
      p_price: configuration.price,
      p_groups: configuration.groups as unknown as Json,
    } as never,
  );
  if (error?.code === "PGRST202")
    throw new Error(
      "주문 옵션 저장 연결을 준비 중입니다. 운영 연결 완료 후 저장할 수 있습니다.",
    );
  if (error?.code === "40001")
    throw new Error(
      "다른 창에서 상품이 변경됐습니다. 새로고침 후 다시 저장해 주세요.",
    );
  if (error || typeof data !== "string")
    throw new Error("주문 옵션을 저장하지 못했습니다.");
  return data;
}
