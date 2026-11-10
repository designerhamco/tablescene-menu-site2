import {SectionHeader} from "@/app/components/ui/section-header";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import StoreOperationsShell from "@/components/mypage/StoreOperationsShell";
import { ContentPanel } from "@/app/components/ui/content-panel";
import OperationalSoundSettings from "@/components/mypage/OperationalSoundSettings";
import OrderPointReceptionSettings from "@/components/mypage/OrderPointReceptionSettings";
import OperationFeatureNavigation from "@/components/mypage/OperationFeatureNavigation";
import { loadOperationSettingsPage } from "@/lib/server/operation-settings-page";
import { listStaffCallItems } from "@/lib/server/call-item-service";
import { getDiningTemplateTier } from "@/lib/dining-product-tiers";
import CallItemManager from "../CallItemManager";
import OrderSettingsForm from "../../order-settings/OrderSettingsForm";

export const metadata: Metadata = { title: "호출 설정 | 아티메뉴", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function CallSettingsPage({ params, searchParams }: { params: Promise<{ menuId: string }>; searchParams?: Promise<{ tab?: string | string[] }> }) {
  const { menuId } = await params;
  const query = await searchParams, tab = Array.isArray(query?.tab) ? query.tab[0] : query?.tab;
  const itemsPanel = tab === "items";
  const { operations, site, data, points, deviceSetup, canManageDevices, pointSettings, pointRuntime } = await loadOperationSettingsPage(menuId, "calls", { includeConfiguration: !itemsPanel });
  const canManageCallItems = site.permissions.includes("call.manage");
  if (itemsPanel && !canManageCallItems) redirect(`/mypage/menus/${menuId}/calls/settings`);
  const items = itemsPanel && canManageCallItems ? await listStaffCallItems({ menuSiteId: menuId, includeInactive: true }) : [];
  return <StoreOperationsShell sites={operations.sites} selectedSite={site} activeSection={itemsPanel ? "call-items" : "call-settings"}>
    <div className="site-stack-content">
      <SectionHeader title="호출 관리"/>
      <OperationFeatureNavigation menuId={menuId} feature="calls" settings historyAvailable={site.operationAccess.calls} canConfigure={site.isOwner} canManageDevices={canManageDevices} panel={itemsPanel ? "items" : "settings"} callItemsAvailable={canManageCallItems} />
      {!itemsPanel ? <>
      {data ? <ContentPanel><OrderSettingsForm menuId={menuId} section="calls" settings={data.settings} runtime={data.runtime} published={site.status === "published"} activeTablesReady={site.activeTablesReady} /></ContentPanel>
        : <ContentPanel as="aside" surface="notice" density="compact"><p className="type-body-sm">호출 사용 여부는 사장님이 변경할 수 있습니다. {canManageCallItems ? "호출 항목은 ‘호출 항목 설정’ 탭에서 관리할 수 있습니다." : "아래에서 허용된 기기 연결을 관리하세요."}</p></ContentPanel>}
      {data || site.operationAccess.calls ? <OperationalSoundSettings menuSiteId={menuId} kind="calls" /> : null}
      {data || canManageDevices ? <OrderPointReceptionSettings menuSiteId={menuId} feature="calls" points={points}
        settings={pointSettings} runtime={pointRuntime.calls} published={site.status === "published"} deviceSetup={deviceSetup} canManageQr={site.canManageQr} readOnly={!site.isOwner} /> : null}
      </> : null}
      {itemsPanel && canManageCallItems ? <CallItemManager key={JSON.stringify(items)} menuSiteId={menuId} items={items} service={getDiningTemplateTier(site.templateKey) === "multi" ? "dining" : "basic"} /> : null}
    </div>
  </StoreOperationsShell>;
}
