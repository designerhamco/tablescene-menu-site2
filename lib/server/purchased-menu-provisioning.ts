import type { SupabaseClient } from "@supabase/supabase-js";

import { createStarterMenuData } from "@/lib/menu-starter-presets";
import type { Database } from "@/lib/supabase/types";

type EnsurePurchasedMenuStarterInput = {
  menuSiteId: string;
  templateKey?: string | null;
  restaurantCategory?: string | null;
  templateCategory?: string | null;
  productKey?: string | null;
};

export async function ensurePurchasedMenuStarter(
  supabase: SupabaseClient<Database>,
  {
    menuSiteId,
    templateKey,
    restaurantCategory,
    templateCategory,
    productKey,
  }: EnsurePurchasedMenuStarterInput
) {
  const result = await createStarterMenuData(
    supabase,
    menuSiteId,
    templateKey,
    restaurantCategory,
    templateCategory,
    productKey
  );

  if (result.created) return result;

  const [pages, categories, items] = await Promise.all([
    supabase.from("menu_pages").select("id", { count: "exact", head: true }).eq("menu_site_id", menuSiteId),
    supabase.from("menu_categories").select("id", { count: "exact", head: true }).eq("menu_site_id", menuSiteId),
    supabase.from("menu_items").select("id", { count: "exact", head: true }).eq("menu_site_id", menuSiteId),
  ]);
  const queryError = pages.error ?? categories.error ?? items.error;

  if (queryError) {
    throw new Error(`복구 대상 스타터 상태 확인에 실패했습니다: ${queryError.message}`);
  }

  if ((pages.count ?? 0) === 0 || (categories.count ?? 0) === 0 || (items.count ?? 0) === 0) {
    throw new Error("메뉴판 스타터가 부분적으로만 생성되어 자동 복구할 수 없습니다. 관리자 확인이 필요합니다.");
  }

  return result;
}
