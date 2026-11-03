import "server-only";
import { isUuid } from "@/lib/postpay-order-runtime";
import { isAubeTableTemplate, validateAubeTablePublishStructure } from "@/lib/aube-table";
import { requireMenuSiteWriteAccess } from "./menu-site-access-service";
import type { Json } from "@/lib/supabase/types";

function disableReception(settings: Json): Json {
  const root = settings && typeof settings === "object" && !Array.isArray(settings) ? settings : {};
  const preferences = root.table_order && typeof root.table_order === "object" && !Array.isArray(root.table_order) ? root.table_order : {};
  return { ...root, table_order: { ...preferences, orderEnabled: false, callEnabled: false } };
}

/** Both the editor and dashboard use this publication boundary. No order/session rows are changed. */
export async function setMenuPublicationStatus(menuId: string, status: "draft" | "published", expectedPublished?: boolean) {
  if (!isUuid(menuId) || !["draft", "published"].includes(status)) throw new Error("공개 상태를 확인해 주세요.");
  const { supabase } = await requireMenuSiteWriteAccess(menuId, "menu.publish", "menu_editor_action");
  const { data: site, error: readError } = await supabase.from("menu_sites")
    .select("id,slug,status,published_at,restaurant_name,template_key,settings,updated_at").eq("id", menuId).maybeSingle();
  if (readError || !site || !["draft", "published"].includes(site.status)) throw new Error("메뉴판 공개 상태를 불러오지 못했습니다.");
  if (expectedPublished !== undefined && (site.status === "published") !== expectedPublished) throw new Error("다른 화면에서 공개 상태가 변경되었습니다. 새로고침된 상태를 확인해 주세요.");
  if (status === "published") {
    if (!site.restaurant_name?.trim()) throw new Error("공개하려면 실제 매장명을 먼저 입력해 주세요.");
    if (!site.slug) throw new Error("공개하려면 공개 메뉴판 주소를 먼저 설정해 주세요.");
    const isDining = isAubeTableTemplate(site.template_key);
    const [pages, categories, items] = await Promise.all([
      supabase.from("menu_pages").select("id", { count: "exact", head: true }).eq("menu_site_id", menuId),
      supabase.from("menu_categories").select("id", { count: "exact", head: true }).eq("menu_site_id", menuId),
      supabase.from("menu_items").select("id", { count: "exact", head: true }).eq("menu_site_id", menuId),
    ]);
    if (pages.error || categories.error || items.error) throw new Error("공개 전 필수 데이터 확인 중 오류가 발생했습니다.");
    if ((pages.count ?? 0) < 1) throw new Error("공개하려면 페이지를 1개 이상 등록해 주세요.");
    if (!isDining && (categories.count ?? 0) < 1) throw new Error("공개하려면 카테고리를 1개 이상 등록해 주세요.");
    if ((items.count ?? 0) < 1) throw new Error("공개하려면 메뉴 아이템을 1개 이상 등록해 주세요.");
    if (isDining) {
      const [pageRows, categoryRows, itemRows] = await Promise.all([
        supabase.from("menu_pages").select("id,title,visible,sort_order").eq("menu_site_id", menuId),
        supabase.from("menu_categories").select("id,menu_page_id,name,visible").eq("menu_site_id", menuId),
        supabase.from("menu_items").select("id,category_id,menu_page_id,visible").eq("menu_site_id", menuId),
      ]);
      if (pageRows.error || categoryRows.error || itemRows.error) throw new Error("오브 테이블 메뉴 구조를 확인하지 못했습니다.");
      const structureError = validateAubeTablePublishStructure({ pages: pageRows.data ?? [], categories: categoryRows.data ?? [], items: itemRows.data ?? [] });
      if (structureError) throw new Error(structureError);
    }
  }
  const timestamp = new Date().toISOString();
  let query = supabase.from("menu_sites").update({
    status,
    published_at: status === "published" ? site.published_at ?? timestamp : site.published_at,
    updated_at: timestamp,
    // Republish starts with reception OFF; saving an already-public menu preserves its flags.
    ...(status === "draft" || site.status !== "published" ? { settings: disableReception(site.settings) } : {}),
  }).eq("id", menuId).eq("status", site.status);
  query = site.updated_at ? query.eq("updated_at", site.updated_at) : query.is("updated_at", null);
  const { data, error } = await query.select("id").maybeSingle();
  if (error || !data) throw new Error("공개 상태나 메뉴 설정이 변경됐거나 저장하지 못했습니다. 새로고침 후 다시 시도해 주세요.");
  return { slug: site.slug, published: status === "published" };
}
