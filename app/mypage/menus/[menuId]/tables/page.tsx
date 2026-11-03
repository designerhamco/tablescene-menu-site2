import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import StoreOperationsShell from "@/components/mypage/StoreOperationsShell";
import { MenuSiteAccessError } from "@/lib/menu-site-permissions";
import { isStoreOperationsAvailable } from "@/lib/product-focus-policy";
import { listMenuTables } from "@/lib/server/menu-table-management-service";
import { MenuTableManagementError } from "@/lib/server/menu-table-management-service";
import { getStoreOperationsContext } from "@/lib/server/store-operations-context";
import MenuTableManager from "./MenuTableManager";
import { ContentPanel } from "@/app/components/ui/content-panel";
import { cookies, headers } from "next/headers";
import { getCurrentTableTerminalId } from "@/lib/server/table-terminal-service";
import { TABLE_VISIT_SESSION_COOKIE } from "@/lib/table-qr-session-tokens";
import { getConfiguredPublicMenuOrigin } from "@/lib/menu-url";

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
  let connectedTableId: string | null = null;
  let connectionStatusAvailable = true;
  try {
    if (selectedSite.tableSetupAvailable) data = await listMenuTables(menuId, { includeArchived: true });
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

  if (data) {
    const [cookieStore, requestHeaders] = await Promise.all([cookies(), headers()]);
    try {
      connectedTableId = await getCurrentTableTerminalId(menuId, cookieStore.get(TABLE_VISIT_SESSION_COOKIE)?.value, requestHeaders.get("user-agent") ?? "");
    } catch {
      connectionStatusAvailable = false;
    }
  }

  return (
    <StoreOperationsShell sites={operationsContext.sites} selectedSite={selectedSite} activeSection="tables">
      <div className="site-stack-content">
        <header className="site-stack-title">
          <p className="type-label text-zinc-500">{selectedSite.name}</p>
          <h2 className="type-subsection-title">테이블 관리</h2>
          <p className="type-body-sm site-copy-muted">테이블을 등록·활성화한 뒤 주문과 호출 사용 여부를 각각 설정해 주세요.</p>
        </header>
        {data ? (
          <MenuTableManager menuSiteId={data.menuSite.id}
            tables={data.tables.map(({ id, label, status, qrPath }) => ({ id, label, status, qrPath: selectedSite.canManageQr ? qrPath : undefined }))}
            archivedTables={data.archivedTables} connectedTableId={connectedTableId} connectionStatusAvailable={connectionStatusAvailable}
            publicBaseUrl={getConfiguredPublicMenuOrigin()} menuPublished={data.menuSite.status === "published"} />
        ) : (
          <ContentPanel>
            <div className="site-stack-title">
            <h3 className="type-subsection-title">테이블 관리를 사용할 수 없습니다</h3>
            <p className="type-body-sm site-copy-muted">테이블 관리는 유효한 베이직·다이닝 이용권에서 사용할 수 있습니다. 이용권이 유효한데도 이 안내가 보이면 잠시 후 다시 시도해 주세요.</p>
            </div>
          </ContentPanel>
        )}
      </div>
    </StoreOperationsShell>
  );
}
