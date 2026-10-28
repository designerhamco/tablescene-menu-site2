import type { Metadata } from "next";
import StoreOperationsShell from "@/components/mypage/StoreOperationsShell";
import OperationFeatureNavigation from "@/components/mypage/OperationFeatureNavigation";
import { loadOperationSettingsPage } from "@/lib/server/operation-settings-page";
import { listStaffCallItems } from "@/lib/server/call-item-service";
import { getDiningTemplateTier } from "@/lib/dining-product-tiers";
import CallItemManager from "../CallItemManager";
import OrderSettingsForm from "../../order-settings/OrderSettingsForm";

export const metadata: Metadata = { title: "호출 설정 | 아티메뉴", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function CallSettingsPage({ params }: { params: Promise<{ menuId: string }> }) {
  const { menuId } = await params;
  const { operations, site, data } = await loadOperationSettingsPage(menuId, "calls");
  const items = await listStaffCallItems({ menuSiteId: menuId, includeInactive: true });
  return <StoreOperationsShell sites={operations.sites} selectedSite={site} activeSection="call-settings">
    <div className="space-y-8">
      <header><p className="type-label text-zinc-500">{site.name}</p><h2 className="type-subsection-title mt-2">호출관리</h2></header>
      <OperationFeatureNavigation menuId={menuId} feature="calls" settings historyAvailable={site.operationAccess.calls} canConfigure />
      {data ? <section className="site-section p-5 md:p-6"><OrderSettingsForm menuId={menuId} section="calls" settings={data.settings} runtime={data.runtime} activeTablesReady={site.activeTablesReady} /></section>
        : <p className="site-notice">호출 사용 여부는 사장님이 변경할 수 있습니다. 허용된 호출 항목을 아래에서 관리하세요.</p>}
      <CallItemManager key={JSON.stringify(items)} menuSiteId={menuId} items={items} service={getDiningTemplateTier(site.templateKey) === "multi" ? "dining" : "basic"} />
    </div>
  </StoreOperationsShell>;
}
