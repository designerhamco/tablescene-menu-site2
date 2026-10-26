import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import OfficialSiteNavbar from "@/components/layout/OfficialSiteNavbar";
import Footer from "@/app/components/layout/Footer";
import { loadMenuOrderSettings } from "@/lib/server/menu-order-settings-service";
import { MenuSiteAccessError } from "@/lib/menu-site-permissions";
import OrderCatalogSettings from "./OrderCatalogSettings";
import { loadMenuOrderCatalogSettings } from "@/lib/server/menu-order-catalog-settings-service";
import OrderSettingsForm from "./OrderSettingsForm";
import CallItemManager from "../calls/CallItemManager";
import { listStaffCallItems } from "@/lib/server/call-item-service";
export const metadata = {
  title: "주문·호출 설정 | 아티메뉴",
  robots: { index: false, follow: false },
};
export default async function OrderSettingsPage({
  params,
}: {
  params: Promise<{ menuId: string }>;
}) {
  const { menuId } = await params;
  let data;
  try {
    data = await loadMenuOrderSettings(menuId);
  } catch (e) {
    if (e instanceof MenuSiteAccessError) {
      if (e.code === "AUTH_REQUIRED")
        redirect(
          "/sign-in?next=" +
            encodeURIComponent("/mypage/menus/" + menuId + "/order-settings"),
        );
      notFound();
    }
    throw e;
  }
  if (data.site.template_key === "display_menu_a") notFound();
  const [items, callItems] = await Promise.all([loadMenuOrderCatalogSettings(menuId), listStaffCallItems({menuSiteId: menuId, includeInactive: true})]);
  return (
    <>
      <OfficialSiteNavbar />
      <main className="site-management-scope site-container site-page-spacing">
        <Link
          className="text-copy text-zinc-500"
          href={"/mypage/menus/" + menuId + "/edit"}
        >
          메뉴판 관리로
        </Link>
        <h1 className="type-page-title mt-5">주문·호출 설정</h1>
        <p className="type-page-description mt-4 text-zinc-500">{data.site.name}</p>
        <OrderSettingsForm
          menuId={menuId}
          settings={data.settings}
          courses={data.courses}
          runtime={data.runtime}
        />
        <div className="mt-10">
          <CallItemManager key={callItems.map(item => `${item.key}:${item.label}:${item.active}:${item.sortOrder}`).join("|")} menuSiteId={menuId} items={callItems} service={data.callService} />
        </div>
        <OrderCatalogSettings menuId={menuId} items={items} />
        <div className="mt-12 flex flex-wrap gap-4">
          {data.runtime.tables ? <Link className="site-button site-button-rounded site-button-secondary" href={"/mypage/menus/" + menuId + "/tables"}>테이블·QR 관리</Link> : null}
          {data.runtime.calls ? <Link className="site-button site-button-rounded site-button-secondary" href={"/mypage/menus/" + menuId + "/calls"}>호출관리</Link> : null}
          {data.runtime.dashboard ? <Link className="site-button site-button-rounded site-button-secondary" href={"/mypage/menus/" + menuId + "/orders"}>주문관리</Link> : null}

        </div>
      </main>
      <Footer />
    </>
  );
}
