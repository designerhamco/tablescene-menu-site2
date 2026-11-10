import OperationsViewLayout from "@/components/mypage/OperationsViewLayout";
import InfoTooltip from "@/components/ui/InfoTooltip";
import type { OrderHistorySearch } from "@/lib/order-history-query";
import { loadOperationsFloorPlan } from "@/lib/server/operations-floor-plan-service";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import StoreOperationsShell from "@/components/mypage/StoreOperationsShell";
import OperationFeatureNavigation from "@/components/mypage/OperationFeatureNavigation";
import { MenuSiteAccessError } from "@/lib/menu-site-permissions";
import { isStoreOperationsAvailable } from "@/lib/product-focus-policy";
import {
  listOrderDashboard,
  OrderManagementError,
} from "@/lib/server/order-management-service";
import { getStoreOperationsContext } from "@/lib/server/store-operations-context";

import OrderDashboard from "./OrderDashboard";

export const metadata: Metadata = {
  title: "주문관리 | 아티메뉴",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function OrderDashboardPage({
  params, searchParams,
}: {
  params: Promise<{ menuId: string }>;
  searchParams: Promise<OrderHistorySearch>;
}) {
  if (!isStoreOperationsAvailable()) redirect("/mypage?tab=menus");

  const { menuId } = await params;
  const query=await searchParams;
  let data;

  try {
    data = await listOrderDashboard(menuId,query);
  } catch (error) {
    if (error instanceof MenuSiteAccessError) {
      if (error.code === "AUTH_REQUIRED") {
        redirect(`/sign-in?next=${encodeURIComponent(`/mypage/menus/${menuId}/orders`)}`);
      }
      if (error.status === 404) notFound();
      if (error.code === "MENU_SITE_PERMISSION_DENIED") {
        redirect(`/mypage/operations?site=${encodeURIComponent(menuId)}&message=permission-denied&feature=orders`);
      }
    }
    if (error instanceof OrderManagementError) {
      if (error.code === "INVALID_INPUT" || error.code === "ORDER_NOT_FOUND") notFound();
      if (error.code === "DASHBOARD_UNAVAILABLE") {
        redirect(`/mypage/operations?site=${encodeURIComponent(menuId)}`);
      }
    }
    throw error;
  }

  const operationsContext = await getStoreOperationsContext(menuId);
  const selectedSite = operationsContext.sites.find((site) => site.menuSiteId === menuId) ?? null;
  if (!selectedSite?.operationAccess.orders) {
    redirect("/mypage/operations");
  }

  const floorPlan = await loadOperationsFloorPlan(menuId, "orders");

  return (
    <StoreOperationsShell sites={operationsContext.sites} selectedSite={selectedSite} activeSection="orders">
      <OperationsViewLayout title="주문 관리" selectable={data.view?.kind!=="history"} help={<InfoTooltip label="주문 관리 안내"><p>ArtiMenu는 이 후불 흐름에서 카드 승인을 수행하지 않습니다.</p><p>진행 중·미결제 주문은 날짜와 관계없이 15초마다 갱신합니다. 테이블·키오스크를 선택하면 전체 주문과 처리 상태를 확인할 수 있습니다.</p></InfoTooltip>}>

        <OperationFeatureNavigation menuId={menuId} feature="orders" settings={false} orderHistory={data.view?.kind === "history"} historyAvailable={selectedSite.operationAccess.orders} canConfigure={selectedSite.isOwner} canManageDevices={selectedSite.tableSetupAvailable && selectedSite.permissions.includes("table.manage")} />
        <OrderDashboard floorPlan={floorPlan} menuSiteId={data.menuSite.id} menuSiteName={data.menuSite.name} orders={data.orders} view={data.view} permissions={data.permissions} />
      </OperationsViewLayout>
    </StoreOperationsShell>
  );
}
