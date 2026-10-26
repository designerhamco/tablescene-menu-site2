import "server-only";
import { notFound, redirect } from "next/navigation";
import { MenuSiteAccessError } from "@/lib/menu-site-permissions";
import { isStoreOperationsAvailable } from "@/lib/product-focus-policy";
import { isStoreOperationsTemplate } from "@/lib/operations-dashboard";
import { requireMenuSitePermission } from "./menu-site-access-service";
import { loadMenuOrderSettings } from "./menu-order-settings-service";
import { getStoreOperationsContext } from "./store-operations-context";

export async function loadOperationSettingsPage(menuId: string, feature: "orders" | "calls") {
  if (!isStoreOperationsAvailable()) redirect("/mypage?tab=menus");
  const path = `/mypage/menus/${menuId}/${feature}/settings`;
  try {
    const access = await requireMenuSitePermission(menuId, feature === "calls" ? "call.manage" : "menu.read");
    if (feature === "orders" && !access.isOwner)
      throw new MenuSiteAccessError("MENU_SITE_PERMISSION_DENIED", "주문 설정은 사장님만 변경할 수 있습니다.", 403);
    const operations = await getStoreOperationsContext(menuId);
    const site = operations.sites.find(item => item.menuSiteId === menuId);
    if (!site || !isStoreOperationsTemplate(site.templateKey)) notFound();
    if (!site.isOwner && !site.operationAccess[feature])
      redirect(`/mypage/operations?site=${encodeURIComponent(menuId)}&message=permission-denied&feature=${feature}`);
    const data = access.isOwner ? await loadMenuOrderSettings(menuId) : null;
    return { operations, site, data };
  } catch (error) {
    if (error instanceof MenuSiteAccessError) {
      if (error.code === "AUTH_REQUIRED") redirect(`/sign-in?next=${encodeURIComponent(path)}`);
      if (error.status === 404) notFound();
      redirect(`/mypage/operations?site=${encodeURIComponent(menuId)}&message=permission-denied&feature=${feature}`);
    }
    throw error;
  }
}
