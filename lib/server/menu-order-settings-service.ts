import "server-only";
import { isPaidTableOperationsEligible } from "@/lib/table-operations-eligibility";
import { getDiningTemplateTier } from "@/lib/dining-product-tiers";
import { isCallRuntimeEnabledForSite } from "@/lib/call-runtime";
import { isTableManagementRuntimeEnabledForSite } from "@/lib/table-management-runtime";
import { isOrderDashboardRuntimeEnabledForSite } from "@/lib/order-dashboard-runtime";
import { isPostpayOrderRuntimeEnabledForSite } from "@/lib/postpay-order-runtime";
import {
  getMenuSiteAccessStateForMenuSite,
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

export async function loadOperationReceptionSummary(menuId: string) {
  const context = await requireMenuSitePermission(menuId, "menu.read");
  const canReadOrders = context.permissions.has("order.read");
  const canReadCalls = context.permissions.has("call.manage");
  if (!canReadOrders && !canReadCalls) throw new Error("운영 현황을 확인할 권한이 없습니다.");
  const { data, error } = await createAdminClient().from("menu_sites").select("settings").eq("id", menuId).maybeSingle();
  if (error || !data) throw new Error("사용 설정을 불러오지 못했습니다.");
  const settings = readMenuOrderSettings(data.settings);
  return { orderEnabled: canReadOrders ? settings.orderEnabled : null, callEnabled: canReadCalls ? settings.callEnabled : null,
    terminalOrderEnabled: canReadOrders ? settings.terminalOrderEnabled : undefined, customerCheckout: canReadOrders ? settings.customerCheckout : undefined,
    runtime: { orders: isPostpayOrderRuntimeEnabledForSite(menuId) && isTableManagementRuntimeEnabledForSite(menuId), calls: isCallRuntimeEnabledForSite(menuId) && isTableManagementRuntimeEnabledForSite(menuId) } };
}
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
    .select("id,name,status,settings,updated_at,template_key")
    .eq("id", menuId)
    .eq("user_id", context.actorUserId)
    .single();
  if (error || !data) throw new Error("메뉴판 설정을 불러오지 못했습니다.");
  const access = await getMenuSiteAccessStateForMenuSite({ menuSiteId: menuId });
  const eligible = isPaidTableOperationsEligible(access, data.template_key);
  return {
    site: data,
    settings: readMenuOrderSettings(data.settings),
    callService: getDiningTemplateTier(data.template_key) === "multi" ? "dining" as const : "basic" as const,
    runtime: {
      calls: eligible && isCallRuntimeEnabledForSite(menuId) && isTableManagementRuntimeEnabledForSite(menuId),
      orders: eligible && isPostpayOrderRuntimeEnabledForSite(menuId) && isTableManagementRuntimeEnabledForSite(menuId),
      tables: eligible && isTableManagementRuntimeEnabledForSite(menuId),
      dashboard: eligible && isOrderDashboardRuntimeEnabledForSite(menuId),
    },
  };
}
export async function saveMenuOrderSettings(
  menuId: string,
  input: MenuOrderSettings,
  section: MenuOrderSettingsSection,
) {
  return writeMenuOrderSettings(menuId, section, (settings) => mergeMenuOrderSettingsSection(settings, input, section));
}

export async function setMenuOrderFeatureEnabled(
  menuId: string,
  section: MenuOrderSettingsSection,
  enabled: boolean,
  expectedEnabled: boolean,
) {
  if ((section !== "orders" && section !== "calls") || typeof enabled !== "boolean" || typeof expectedEnabled !== "boolean")
    throw new Error("변경할 사용 설정을 확인해 주세요.");
  return writeMenuOrderSettings(menuId, section, (settings) => {
    const key = section === "orders" ? "orderEnabled" : "callEnabled";
    if (settings[key] !== expectedEnabled)
      throw new Error("다른 화면에서 사용 설정이 변경되었습니다. 새로고침된 상태를 확인해 주세요.");
    // Read and change one flag in the same write flow. Do not replay checkout/phone
    // preferences supplied by a stale dashboard over newer detailed settings.
    return { ...settings, [key]: enabled };
  });
}

async function writeMenuOrderSettings(
  menuId: string,
  section: MenuOrderSettingsSection,
  resolveNext: (settings: MenuOrderSettings) => MenuOrderSettings,
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
  const { site, settings, runtime } = await loadMenuOrderSettings(menuId);
  const next = resolveNext(settings);
  if (site.template_key === "display_menu_a")
    throw new Error("디스플레이는 주문 기능을 지원하지 않습니다.");
  if (section === "orders" && next.orderEnabled && !next.postpayEnabled)
    throw new Error(
      "현재는 후불 주문을 사용해야 합니다. 선결제는 준비 중입니다.",
    );
  const enabled = section === "orders" ? next.orderEnabled : next.callEnabled;
  if (site.status !== "published") {
    if (enabled) throw new Error("메뉴판을 공개한 뒤 주문·호출 기능을 켤 수 있습니다.");
    next.orderEnabled = false;
    next.callEnabled = false;
  }
  if (enabled) {
    if (!runtime.tables)
      throw new Error("테이블 기능 연결 후 테이블을 등록·활성화해 주세요.");
    if (!runtime[section]) throw new Error("현재 이 기능을 사용할 수 없습니다. 잠시 후 다시 시도해 주세요.");
    const { data: table, error: tableError } = await createAdminClient().from("menu_tables")
      .select("id").eq("menu_site_id", menuId).eq("status", "active").limit(1).maybeSingle();
    if (tableError) throw new Error("테이블 상태를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    if (!table) throw new Error("활성 테이블 또는 키오스크를 먼저 준비해 주세요. 테이블·키오스크 관리에서 등록·활성화할 수 있습니다.");
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
  if (enabled) query = query.eq("status", "published");
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
