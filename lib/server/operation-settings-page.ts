import "server-only";
import { notFound, redirect } from "next/navigation";
import { MenuSiteAccessError } from "@/lib/menu-site-permissions";
import { isStoreOperationsAvailable } from "@/lib/product-focus-policy";
import { isStoreOperationsTemplate } from "@/lib/operations-dashboard";
import { requireMenuSitePermission } from "./menu-site-access-service";
import { DEFAULT_MENU_ORDER_SETTINGS } from "@/lib/menu-order-settings";
import { loadMenuOrderSettings, loadOperationReceptionSummary } from "./menu-order-settings-service";
import { loadOrderPointDeviceSettings } from "./order-point-device-settings";
import { listMenuTables } from "./menu-table-management-service";
import { getStoreOperationsContext } from "./store-operations-context";

export async function loadOperationSettingsPage(menuId: string, feature: "orders" | "calls", options: { includeConfiguration?: boolean; includeDevices?: boolean } = {}) {
  if (!isStoreOperationsAvailable()) redirect("/mypage?tab=menus");
  const path = `/mypage/menus/${menuId}/${feature}/settings`;
  try {
    const access = await requireMenuSitePermission(menuId, feature === "calls" ? "call.manage" : "menu.read").catch(error => {
      // Moving connections must not remove the existing table.manage capability.
      if (feature === "calls" && error instanceof MenuSiteAccessError && error.code === "MENU_SITE_PERMISSION_DENIED")
        return requireMenuSitePermission(menuId, "table.manage");
      throw error;
    });
    const operations = await getStoreOperationsContext(menuId);
    const site = operations.sites.find(item => item.menuSiteId === menuId);
    if (!site || !isStoreOperationsTemplate(site.templateKey)) notFound();
    const canManageDevices = site.tableSetupAvailable && site.permissions?.includes("table.manage") === true;
    if (feature === "orders" && !access.isOwner && !canManageDevices && !(site.operationAccess.orders && site.permissions?.includes("order.read")))
      throw new MenuSiteAccessError("MENU_SITE_PERMISSION_DENIED", "주문 설정은 사장님만 변경할 수 있습니다.", 403);
    if (!site.isOwner && !site.operationAccess[feature] && !canManageDevices)
      redirect(`/mypage/operations?site=${encodeURIComponent(menuId)}&message=permission-denied&feature=${feature}`);
    const data = access.isOwner && options.includeConfiguration !== false ? await loadMenuOrderSettings(menuId) : null;
    // Existing point/device permission stays independent of owner-only global settings.
    // Null distinguishes unavailable data from a genuinely empty registration list.
    const pointData = options.includeConfiguration !== false && options.includeDevices !== false && (data || canManageDevices) && site.tableSetupAvailable
      ? await listMenuTables(menuId).catch(() => null)
      : null;
    const points = pointData?.tables.map(({ id, label, status, kind, policy, policyAvailable }) => ({
      id, label, status, kind, policy, policyAvailable,
    })) ?? null;
    const deviceSetup = points?.length ? await loadOrderPointDeviceSettings(menuId) : null;
    const receptionSummary = !data && pointData ? await loadOperationReceptionSummary(menuId).catch(() => null) : null;
    const pointSettings = data?.settings ?? { ...DEFAULT_MENU_ORDER_SETTINGS,
      orderEnabled: receptionSummary?.orderEnabled ?? null, callEnabled: receptionSummary?.callEnabled ?? null,
      terminalOrderEnabled: receptionSummary?.terminalOrderEnabled, customerCheckout: receptionSummary?.customerCheckout,
    };
    const pointRuntime = data?.runtime ?? receptionSummary?.runtime ?? { orders: false, calls: false };
    return { operations, site, data, points, deviceSetup, canManageDevices, pointSettings, pointRuntime };
  } catch (error) {
    if (error instanceof MenuSiteAccessError) {
      if (error.code === "AUTH_REQUIRED") redirect(`/sign-in?next=${encodeURIComponent(path)}`);
      if (error.status === 404) notFound();
      redirect(`/mypage/operations?site=${encodeURIComponent(menuId)}&message=permission-denied&feature=${feature}`);
    }
    throw error;
  }
}
