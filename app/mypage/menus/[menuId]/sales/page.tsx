import {SectionHeader} from "@/app/components/ui/section-header";
import InfoTooltip from "@/components/ui/InfoTooltip";
import type { Metadata } from "next";
import StoreSalesSummary from "@/components/mypage/StoreSalesSummary";
import { notFound, redirect } from "next/navigation";

import StoreOperationsShell from "@/components/mypage/StoreOperationsShell";
import { MenuSiteAccessError } from "@/lib/menu-site-permissions";
import { isStoreOperationsAvailable } from "@/lib/product-focus-policy";
import {
  getSalesSummaryDashboard,
  SalesSummaryError,
} from "@/lib/server/sales-summary-service";
import { getStoreOperationsContext } from "@/lib/server/store-operations-context";

export const metadata: Metadata = {
  title: "매출 관리 | 아티메뉴",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SalesSummaryPage({
  params,
}: {
  params: Promise<{ menuId: string }>;
}) {
  if (!isStoreOperationsAvailable()) redirect("/mypage?tab=menus");

  const { menuId } = await params;
  let data;

  try {
    data = await getSalesSummaryDashboard(menuId);
  } catch (error) {
    if (error instanceof MenuSiteAccessError) {
      if (error.code === "AUTH_REQUIRED") {
        redirect(`/sign-in?next=${encodeURIComponent(`/mypage/menus/${menuId}/sales`)}`);
      }
      if (error.status === 404) notFound();
      if (error.code === "MENU_SITE_PERMISSION_DENIED") {
        redirect(`/mypage/operations?site=${encodeURIComponent(menuId)}&message=permission-denied&feature=sales`);
      }
    }
    if (error instanceof SalesSummaryError) {
      if (error.code === "INVALID_INPUT" || error.code === "MENU_SITE_NOT_FOUND") notFound();
      if (error.code === "DASHBOARD_UNAVAILABLE") {
        redirect(`/mypage/operations?site=${encodeURIComponent(menuId)}`);
      }
    }
    throw error;
  }

  const operationsContext = await getStoreOperationsContext(menuId);
  const selectedSite = operationsContext.sites.find((site) => site.menuSiteId === menuId) ?? null;
  if (!selectedSite?.operationAccess.sales) {
    redirect("/mypage/operations");
  }

  return <StoreOperationsShell sites={operationsContext.sites} selectedSite={selectedSite} activeSection="sales">
    <div className="site-stack-content">
      <SectionHeader title="매출 관리" help={<InfoTooltip label="매출 집계 안내"><p>접수 주문과 실제 결제 완료액을 구분하며, 결제 취소·환불 내역은 완료액에서 제외합니다.</p></InfoTooltip>}/>
      <StoreSalesSummary summary={data.summary} menuId={menuId} ordersAvailable={selectedSite.operationAccess.orders} />
    </div>
  </StoreOperationsShell>;
}
