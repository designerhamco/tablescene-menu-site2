import {SectionHeader} from "@/app/components/ui/section-header";
import OrderSettingsCategories from "@/components/mypage/OrderSettingsCategories";
import OrderReadyNotificationSettings from "@/components/mypage/OrderReadyNotificationSettings";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import StoreOperationsShell from "@/components/mypage/StoreOperationsShell";
import { ContentPanel } from "@/app/components/ui/content-panel";
import OperationalSoundSettings from "@/components/mypage/OperationalSoundSettings";
import OperationFeatureNavigation from "@/components/mypage/OperationFeatureNavigation";
import { loadOperationSettingsPage } from "@/lib/server/operation-settings-page";
import OrderSettingsForm from "../../order-settings/OrderSettingsForm";

export const metadata: Metadata = { title: "주문 설정 | 아티메뉴", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function OrderSettingsPage({ params, searchParams }: { params: Promise<{ menuId: string }>; searchParams?: Promise<{ tab?: string | string[] }> }) {
  const { menuId } = await params;
  const query = await searchParams;
  // Keep bookmarks working; the destination enforces table.manage as before.
  if ((Array.isArray(query?.tab) ? query.tab[0] : query?.tab) === "devices") {
    redirect(`/mypage/menus/${menuId}/tables`);
  }
  const { operations, site, data, canManageDevices } = await loadOperationSettingsPage(menuId, "orders", { includeDevices: false });
  return <StoreOperationsShell sites={operations.sites} selectedSite={site} activeSection="order-settings">
    <div className="site-stack-content">
      <SectionHeader title="주문 관리"/>
      <OperationFeatureNavigation menuId={menuId} feature="orders" settings historyAvailable={site.operationAccess.orders} canConfigure={site.isOwner} canManageDevices={canManageDevices} />
      <OrderSettingsCategories payment={<>
      {data ? <ContentPanel><OrderSettingsForm menuId={menuId} section="orders" settings={data.settings} runtime={data.runtime} published={site.status === "published"} activeTablesReady={site.activeTablesReady} /></ContentPanel> : <ContentPanel as="aside" surface="notice" density="compact"><p className="type-body-sm">주문 사용 설정은 사장님이 변경할 수 있습니다. {canManageDevices ? "기기 연결은 ‘테이블·키오스크 관리’에서 관리하세요." : "이 브라우저의 주문 알림음은 ‘주문 알림’에서 설정할 수 있습니다."}</p></ContentPanel>}
      </>} notifications={data || site.operationAccess.orders ? <OperationalSoundSettings menuSiteId={menuId} kind="orders" /> : null} ready={<OrderReadyNotificationSettings />} />
    </div>
  </StoreOperationsShell>;
}
