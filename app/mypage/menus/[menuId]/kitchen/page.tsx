import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import OperationsViewLayout from "@/components/mypage/OperationsViewLayout";
import StoreOperationsShell from "@/components/mypage/StoreOperationsShell";
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
  let data;
  try {
    data = await listKitchenDashboard(menuId);
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
        <KitchenDashboard key={menuId} menuSiteId={menuId} orders={data.orders} canManage={data.canManage} />
      </OperationsViewLayout>
    </StoreOperationsShell>
  );
}
