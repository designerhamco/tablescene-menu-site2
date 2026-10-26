import type { Metadata } from "next";
import StoreOperationsShell from "@/components/mypage/StoreOperationsShell";
import OperationFeatureNavigation from "@/components/mypage/OperationFeatureNavigation";
import { loadOperationSettingsPage } from "@/lib/server/operation-settings-page";
import { loadMenuOrderCatalogSettings } from "@/lib/server/menu-order-catalog-settings-service";
import OrderSettingsForm from "../../order-settings/OrderSettingsForm";
import OrderCatalogSettings from "../../order-settings/OrderCatalogSettings";

export const metadata: Metadata = { title: "주문 설정 | 아티메뉴", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function OrderSettingsPage({ params }: { params: Promise<{ menuId: string }> }) {
  const { menuId } = await params;
  const { operations, site, data } = await loadOperationSettingsPage(menuId, "orders");
  // Order settings always require the owner; the loader verifies this before reads.
  if (!data) throw new Error("주문 설정을 불러오지 못했습니다.");
  const items = await loadMenuOrderCatalogSettings(menuId);
  return <StoreOperationsShell sites={operations.sites} selectedSite={site} activeSection="order-settings">
    <div className="space-y-8">
      <header><p className="type-label text-zinc-500">{site.name}</p><h2 className="type-subsection-title mt-2">주문관리</h2></header>
      <OperationFeatureNavigation menuId={menuId} feature="orders" settings historyAvailable={site.operationAccess.orders} canConfigure />
      <section className="site-section p-5 md:p-6"><OrderSettingsForm menuId={menuId} section="orders" settings={data.settings} courses={data.courses} runtime={data.runtime} /></section>
      <OrderCatalogSettings menuId={menuId} items={items} />
    </div>
  </StoreOperationsShell>;
}
