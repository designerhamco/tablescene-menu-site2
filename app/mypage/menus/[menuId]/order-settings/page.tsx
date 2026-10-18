import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import OfficialSiteNavbar from "@/components/layout/OfficialSiteNavbar";
import Footer from "@/app/components/layout/Footer";
import { loadMenuOrderSettings } from "@/lib/server/menu-order-settings-service";
import { MenuSiteAccessError } from "@/lib/menu-site-permissions";
import OrderCatalogSettings from "./OrderCatalogSettings";
import { loadMenuOrderCatalogSettings } from "@/lib/server/menu-order-catalog-settings-service";
import OrderSettingsForm from "./OrderSettingsForm";
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
  const items = await loadMenuOrderCatalogSettings(menuId);
  return (
    <>
      <OfficialSiteNavbar />
      <main className="site-container site-page-spacing">
        <Link
          className="text-sm text-zinc-500"
          href={"/mypage/menus/" + menuId + "/edit"}
        >
          메뉴판 관리로
        </Link>
        <h1 className="type-page-title mt-5">주문·호출 설정</h1>
        <p className="site-body mt-4 text-zinc-500">{data.site.name}</p>
        <OrderSettingsForm
          menuId={menuId}
          settings={data.settings}
          courses={data.courses}
        />
        <OrderCatalogSettings menuId={menuId} items={items} />
        <div className="mt-12 flex flex-wrap gap-4">
          <Link
            className="site-button site-button-secondary"
            href={"/mypage/menus/" + menuId + "/tables"}
          >
            테이블·QR 관리
          </Link>
          <Link
            className="site-button site-button-secondary"
            href={"/mypage/menus/" + menuId + "/orders"}
          >
            주문관리
          </Link>
          <Link
            className="site-button site-button-secondary"
            href="/qa/table-order"
          >
            후불 주문 테스트
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
