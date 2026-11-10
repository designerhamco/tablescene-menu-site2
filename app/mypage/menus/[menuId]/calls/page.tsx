import OperationsViewLayout from "@/components/mypage/OperationsViewLayout";
import InfoTooltip from "@/components/ui/InfoTooltip";
import { loadOperationsFloorPlan } from "@/lib/server/operations-floor-plan-service";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import StoreOperationsShell from "@/components/mypage/StoreOperationsShell";
import OperationFeatureNavigation from "@/components/mypage/OperationFeatureNavigation";
import { MenuSiteAccessError } from "@/lib/menu-site-permissions";
import { isStoreOperationsAvailable } from "@/lib/product-focus-policy";
import {
  CallManagementError,
  listCallDashboard,
} from "@/lib/server/call-management-service";
import { getStoreOperationsContext } from "@/lib/server/store-operations-context";

import CallDashboard from "./CallDashboard";

export const metadata: Metadata = {
  title: "호출관리 | 아티메뉴",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CallDashboardPage({
  params,
}: {
  params: Promise<{ menuId: string }>;
}) {
  if (!isStoreOperationsAvailable()) redirect("/mypage?tab=menus");

  const { menuId } = await params;
  let data;
  try {
    data = await listCallDashboard(menuId);
  } catch (error) {
    if (error instanceof MenuSiteAccessError) {
      if (error.code === "AUTH_REQUIRED") {
        redirect(`/sign-in?next=${encodeURIComponent(`/mypage/menus/${menuId}/calls`)}`);
      }
      if (error.status === 404) notFound();
      if (error.code === "MENU_SITE_PERMISSION_DENIED") {
        redirect(`/mypage/operations?site=${encodeURIComponent(menuId)}&message=permission-denied&feature=calls`);
      }
    }
    if (error instanceof CallManagementError) {
      if (error.code === "INVALID_INPUT" || error.code === "CALL_NOT_FOUND") notFound();
      if (error.code === "DASHBOARD_UNAVAILABLE") {
        redirect(`/mypage/operations?site=${encodeURIComponent(menuId)}`);
      }
    }
    throw error;
  }

  const operationsContext = await getStoreOperationsContext(menuId);
  const selectedSite = operationsContext.sites.find((site) => site.menuSiteId === menuId) ?? null;
  if (!selectedSite?.operationAccess.calls) {
    redirect("/mypage/operations");
  }

  const floorPlan = await loadOperationsFloorPlan(menuId, "calls");

  return (
    <StoreOperationsShell sites={operationsContext.sites} selectedSite={selectedSite} activeSection="calls">
      <OperationsViewLayout title="호출 관리" help={<InfoTooltip label="호출 관리 안내"><p>최근 100건을 최신 호출부터 표시하며 15초마다 갱신합니다. 테이블·키오스크를 선택하면 호출 내역과 처리 상태를 확인할 수 있습니다.</p></InfoTooltip>}>
        <OperationFeatureNavigation menuId={menuId} feature="calls" settings={false} historyAvailable={selectedSite.operationAccess.calls} canConfigure />
        <CallDashboard floorPlan={floorPlan} menuSiteId={data.menuSite.id} calls={data.calls} />
      </OperationsViewLayout>
    </StoreOperationsShell>
  );
}
