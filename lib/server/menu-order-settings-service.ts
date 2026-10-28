import "server-only";
import { getDiningTemplateTier } from "@/lib/dining-product-tiers";
import { isCallRuntimeEnabledForSite } from "@/lib/call-runtime";
import { isTableManagementRuntimeEnabledForSite } from "@/lib/table-management-runtime";
import { isOrderDashboardRuntimeEnabledForSite } from "@/lib/order-dashboard-runtime";
import { isPostpayOrderRuntimeEnabledForSite } from "@/lib/postpay-order-runtime";
import {
  requireMenuSitePermission,
  requireMenuSiteWriteAccess,
} from "./menu-site-access-service";
import { createAdminClient } from "@/lib/supabase/admin";
import { MenuSiteAccessError } from "@/lib/menu-site-permissions";
import {
  readMenuOrderSettings,
  mergeMenuOrderSettingsSection,
  type MenuOrderSettingsSection,
  type MenuOrderSettings,
} from "@/lib/menu-order-settings";
import type { Json } from "@/lib/supabase/types";
export async function loadMenuOrderSettings(menuId: string) {
  const context = await requireMenuSitePermission(menuId, "menu.read");
  if (!context.isOwner)
    throw new MenuSiteAccessError(
      "MENU_SITE_PERMISSION_DENIED",
      "주문 설정은 사장님만 변경할 수 있습니다.",
      403,
    );
  const { data, error } = await createAdminClient()
    .from("menu_sites")
    .select("id,name,settings,updated_at,template_key")
    .eq("id", menuId)
    .eq("user_id", context.actorUserId)
    .single();
  if (error || !data) throw new Error("메뉴판 설정을 불러오지 못했습니다.");
  const { data: courses, error: coursesError } = await createAdminClient()
    .from("menu_categories")
    .select("id,name,course_price,course_price_visible,visible")
    .eq("menu_site_id", menuId)
    .gt("course_price", 0)
    .order("sort_order");
  if (coursesError) throw new Error("코스 정보를 불러오지 못했습니다.");
  return {
    site: data,
    courses: courses ?? [],
    settings: readMenuOrderSettings(data.settings),
    callService: getDiningTemplateTier(data.template_key) === "multi" ? "dining" as const : "basic" as const,
    runtime: {
      calls: isCallRuntimeEnabledForSite(menuId) && isTableManagementRuntimeEnabledForSite(menuId),
      orders: isPostpayOrderRuntimeEnabledForSite(menuId) && isTableManagementRuntimeEnabledForSite(menuId),
      tables: isTableManagementRuntimeEnabledForSite(menuId),
      dashboard: isOrderDashboardRuntimeEnabledForSite(menuId),
    },
  };
}
export async function saveMenuOrderSettings(
  menuId: string,
  input: MenuOrderSettings,
  section: MenuOrderSettingsSection,
) {
  const permission = await requireMenuSitePermission(menuId, "menu.edit");
  if (!permission.isOwner)
    throw new MenuSiteAccessError(
      "MENU_SITE_PERMISSION_DENIED",
      "주문 설정은 사장님만 변경할 수 있습니다.",
      403,
    );
  const { context, supabase } = await requireMenuSiteWriteAccess(
    menuId,
    "menu.edit",
    "menu_order_settings",
  );
  const { site, courses, settings } = await loadMenuOrderSettings(menuId);
  const next = mergeMenuOrderSettingsSection(settings, input, section);
  if (
    section === "orders" && next.orderableCourseIds.some(
      (id) => !courses.some((course) => course.id === id),
    )
  )
    throw new Error("코스 주문 설정을 다시 확인해 주세요.");
  if (site.template_key === "display_menu_a")
    throw new Error("디스플레이는 주문 기능을 지원하지 않습니다.");
  if (section === "orders" && next.orderEnabled && !next.postpayEnabled)
    throw new Error(
      "현재는 후불 주문을 사용해야 합니다. 선결제는 준비 중입니다.",
    );
  const enabled = section === "orders" ? next.orderEnabled : next.callEnabled;
  if (enabled) {
    if (!isTableManagementRuntimeEnabledForSite(menuId))
      throw new Error("테이블 기능 연결 후 테이블을 등록·활성화해 주세요.");
    const { data: table, error: tableError } = await createAdminClient().from("menu_tables")
      .select("id").eq("menu_site_id", menuId).eq("status", "active").limit(1).maybeSingle();
    if (tableError) throw new Error("테이블 상태를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    if (!table) throw new Error("활성 테이블을 먼저 준비해 주세요. 테이블·QR 관리에서 등록·활성화할 수 있습니다.");
  }
  const root =
    site.settings &&
    typeof site.settings === "object" &&
    !Array.isArray(site.settings)
      ? site.settings
      : {};
  let query = supabase
    .from("menu_sites")
    .update({ settings: { ...root, table_order: next } as Json })
    .eq("id", menuId)
    .eq("user_id", context.actorUserId);
  query = site.updated_at
    ? query.eq("updated_at", site.updated_at)
    : query.is("updated_at", null);
  const { data, error } = await query.select("id").maybeSingle();
  if (error || !data)
    throw new Error(
      "설정이 변경됐거나 저장하지 못했습니다. 새로고침 후 다시 시도해 주세요.",
    );
  return next;
}
