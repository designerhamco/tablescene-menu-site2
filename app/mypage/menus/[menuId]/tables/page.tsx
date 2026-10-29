import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import StoreOperationsShell from "@/components/mypage/StoreOperationsShell";
import Link from "next/link";
import { MenuSiteAccessError } from "@/lib/menu-site-permissions";
import { isStoreOperationsAvailable } from "@/lib/product-focus-policy";
import { listMenuTables } from "@/lib/server/menu-table-management-service";
import { MenuTableManagementError } from "@/lib/server/menu-table-management-service";
import { getStoreOperationsContext } from "@/lib/server/store-operations-context";
import MenuTableManager from "./MenuTableManager";

export const metadata: Metadata = {
  title: "테이블 관리 | 아티메뉴",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function MenuTableManagementPage({ params }: { params: Promise<{ menuId: string }> }) {
  if (!isStoreOperationsAvailable()) redirect("/mypage?tab=menus");
  const { menuId } = await params;
  const operationsContext = await getStoreOperationsContext(menuId).catch((error: unknown) => {
    if (error instanceof MenuSiteAccessError && error.code === "AUTH_REQUIRED") {
      redirect(`/sign-in?next=${encodeURIComponent(`/mypage/menus/${menuId}/tables`)}`);
    }
    throw error;
  });
  const selectedSite = operationsContext.sites.find((site) => site.menuSiteId === menuId) ?? null;
  if (!selectedSite || !selectedSite.permissions.includes("table.manage")) redirect("/mypage/operations");
  let data = null;
  try {
    if (selectedSite.tableSetupAvailable) data = await listMenuTables(menuId);
  } catch (error) {
    if (error instanceof MenuSiteAccessError) {
      if (error.code === "AUTH_REQUIRED") redirect(`/sign-in?next=${encodeURIComponent(`/mypage/menus/${menuId}/tables`)}`);
      if (error.status === 404) notFound();
      if (error.code === "MENU_SITE_PERMISSION_DENIED") {
        redirect(`/mypage/operations?site=${encodeURIComponent(menuId)}&message=permission-denied&feature=tables`);
      }
    }
    if (error instanceof MenuTableManagementError) {
      if (error.code === "INVALID_INPUT") notFound();
      if (error.code === "MENU_SITE_UNAVAILABLE") redirect(`/mypage/operations?site=${encodeURIComponent(menuId)}`);
    }
    throw error;
  }

  return (
    <StoreOperationsShell sites={operationsContext.sites} selectedSite={selectedSite} activeSection="tables">
      <div className="space-y-8">
        <header>
          <p className="type-label text-zinc-500">{selectedSite.name}</p>
          <h2 className="type-subsection-title mt-2">테이블 관리</h2>
          <p className="type-body-sm mt-3 max-w-3xl break-keep text-zinc-500">테이블을 등록·활성화한 뒤 주문과 호출 사용 여부를 각각 설정해 주세요. QR 다운로드와 교체는 QR 관리에서 할 수 있습니다.</p>
        </header>
        {selectedSite.canManageQr ? <Link href={`/mypage/menus/${menuId}/qr`} className="site-button site-button-outline">QR 관리로 이동</Link> : null}
        {data ? (
          <MenuTableManager menuSiteId={data.menuSite.id} tables={data.tables.map(({ id, label, status }) => ({ id, label, status }))} />
        ) : (
          <section className="site-section p-5 sm:p-6">
            <h3 className="type-subsection-title">테이블 기능 연결 대기</h3>
            <p className="type-body-sm mt-3 text-zinc-500">이 메뉴판의 테이블 기능이 아직 연결되지 않았습니다. 연결이 완료되면 이곳에서 테이블을 등록할 수 있습니다.</p>
          </section>
        )}
      </div>
    </StoreOperationsShell>
  );
}
