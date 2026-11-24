import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import OrderReceptionControl from "@/components/mypage/OrderReceptionControl";
import OperationsViewLayout from "@/components/mypage/OperationsViewLayout";
import StoreOperationsShell from "@/components/mypage/StoreOperationsShell";
import { floorMemberships } from "@/lib/menu-floor-plan";
import { loadOperationsFloorPlan } from "@/lib/server/operations-floor-plan-service";
import { MenuSiteAccessError } from "@/lib/menu-site-permissions";
import { isStoreOperationsAvailable } from "@/lib/product-focus-policy";
import { listKitchenDashboard, OrderManagementError } from "@/lib/server/order-management-service";
import { getStoreOperationsContext } from "@/lib/server/store-operations-context";
import KitchenDashboard from "./KitchenDashboard";

export const metadata: Metadata = {
  title: "주방 대시보드 | 아티메뉴",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function KitchenDashboardPage({ params }: {
  params: Promise<{ menuId: string }>;
}) {
  if (!isStoreOperationsAvailable()) redirect("/mypage?tab=menus");

  const { menuId } = await params;
  const operationsHref = `/mypage/operations?site=${encodeURIComponent(menuId)}`;
  let data, floor;
  try {
    [data, floor] = await Promise.all([listKitchenDashboard(menuId), loadOperationsFloorPlan(menuId, "orders")]);
  } catch (error) {
    if (error instanceof MenuSiteAccessError) {
      if (error.code === "AUTH_REQUIRED") {
        redirect(`/sign-in?next=${encodeURIComponent(`/mypage/menus/${menuId}/kitchen`)}`);
      }
      if (error.status === 404) notFound();
      if (error.code === "MENU_SITE_PERMISSION_DENIED") {
        redirect(`${operationsHref}&message=permission-denied&feature=orders`);
      }
    }
    if (error instanceof OrderManagementError) {
      if (error.code === "INVALID_INPUT") notFound();
      if (error.code === "DASHBOARD_UNAVAILABLE") redirect(operationsHref);
    }
    throw error;
  }

  const { sites } = await getStoreOperationsContext(menuId);
  const selectedSite = sites.find(site => site.menuSiteId === menuId);
  if (!selectedSite?.operationAccess.orders) redirect("/mypage/operations");


  return (
    <StoreOperationsShell sites={sites} selectedSite={selectedSite} activeSection="kitchen">
      <OperationsViewLayout title="주방 대시보드" selectable={false}>
        <KitchenDashboard key={menuId} menuSiteId={menuId} menuSiteName={data.menuSiteName} orders={data.orders} canManage={data.canManage}
          rooms={floor.document.rooms}
          receptionControl={<OrderReceptionControl menuId={menuId} canConfigure={selectedSite.canConfigure}
            published={selectedSite.status === "published"} activeTablesReady={selectedSite.activeTablesReady} />}
          roomIdByTable={Object.fromEntries(floorMemberships(floor.document).map(({ pointId, roomId }) => [pointId, roomId]))} />
      </OperationsViewLayout>
    </StoreOperationsShell>
  );
}
