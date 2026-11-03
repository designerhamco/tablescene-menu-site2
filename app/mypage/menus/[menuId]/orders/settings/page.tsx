import { redirect } from "next/navigation";
import type { Metadata } from "next";
import StoreOperationsShell from "@/components/mypage/StoreOperationsShell";
import { ContentPanel } from "@/app/components/ui/content-panel";
import OperationalSoundSettings from "@/components/mypage/OperationalSoundSettings";
import OrderPointReceptionSettings from "@/components/mypage/OrderPointReceptionSettings";
import PaymentTerminalSettings from "@/components/mypage/PaymentTerminalSettings";
import OperationFeatureNavigation from "@/components/mypage/OperationFeatureNavigation";
import { loadOperationSettingsPage } from "@/lib/server/operation-settings-page";
import OrderSettingsForm from "../../order-settings/OrderSettingsForm";
import { loadPaymentTerminalPreparations } from "@/lib/server/payment-terminal-preparation-service";

export const metadata: Metadata = { title: "주문 설정 | 아티메뉴", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function OrderSettingsPage({ params, searchParams }: { params: Promise<{ menuId: string }>; searchParams?: Promise<{ tab?: string | string[] }> }) {
  const { menuId } = await params;
  const query = await searchParams;
  const tab = Array.isArray(query?.tab) ? query.tab[0] : query?.tab;
  const devicesPanel = tab === "devices", paymentPanel = tab === "payments";
  const { operations, site, data, points, deviceSetup, canManageDevices, pointSettings, pointRuntime } = await loadOperationSettingsPage(menuId, "orders", { includeDevices: devicesPanel, includeConfiguration: !paymentPanel });
  if (devicesPanel && !site.isOwner && !canManageDevices) redirect(`/mypage/menus/${menuId}/orders/settings`);
  if (paymentPanel && !site.isOwner) redirect(`/mypage/menus/${menuId}/orders/settings`);
  let paymentSetup = { available: false, preparations: [] } as Awaited<ReturnType<typeof loadPaymentTerminalPreparations>>;
  let paymentLoadError: string | null = null;
  if (paymentPanel) {
    try { paymentSetup = await loadPaymentTerminalPreparations(menuId); }
    catch { paymentLoadError = "준비 정보를 불러오지 못했습니다. 새로고침 후 다시 확인해 주세요. 불러오기 전에는 저장할 수 없습니다."; }
  }
  return <StoreOperationsShell sites={operations.sites} selectedSite={site} activeSection={paymentPanel ? "order-payments" : devicesPanel ? "order-devices" : "order-settings"}>
    <div className="site-stack-content">
      <header className="site-stack-title"><p className="type-label site-copy-muted">{site.name}</p><h2 className="type-subsection-title">주문관리</h2></header>
      <OperationFeatureNavigation menuId={menuId} feature="orders" settings historyAvailable={site.operationAccess.orders} canConfigure={site.isOwner} canManageDevices={canManageDevices} panel={paymentPanel ? "payments" : devicesPanel ? "devices" : "settings"} />
      {!devicesPanel && !paymentPanel ? <>
      {data ? <ContentPanel><OrderSettingsForm menuId={menuId} section="orders" settings={data.settings} runtime={data.runtime} published={site.status === "published"} activeTablesReady={site.activeTablesReady} /></ContentPanel> : <ContentPanel as="aside" surface="notice" density="compact"><p className="type-body-sm">주문 사용 설정은 사장님이 변경할 수 있습니다. {canManageDevices ? "기기 연결은 ‘기기별 설정’ 탭에서 관리하세요." : "이 브라우저의 주문 알림음은 아래에서 설정할 수 있습니다."}</p></ContentPanel>}
      {data || site.operationAccess.orders ? <OperationalSoundSettings menuSiteId={menuId} kind="orders" /> : null}
      </> : null}
      {paymentPanel ? <PaymentTerminalSettings menuSiteId={menuId} preparations={paymentSetup.preparations} storageAvailable={paymentSetup.available} loadError={paymentLoadError} /> : null}
      {devicesPanel && (data || canManageDevices) ? <OrderPointReceptionSettings menuSiteId={menuId} feature="orders" points={points}
        settings={pointSettings} runtime={pointRuntime.orders} published={site.status === "published"} deviceSetup={deviceSetup} canManageQr={site.canManageQr} readOnly={!site.isOwner} /> : null}
    </div>
  </StoreOperationsShell>;
}
