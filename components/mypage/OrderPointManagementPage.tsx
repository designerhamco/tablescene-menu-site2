import { loadOrderPointDeviceSettings } from "@/lib/server/order-point-device-settings";
import { notFound, redirect } from "next/navigation";

import StoreOperationsShell from "@/components/mypage/StoreOperationsShell";
import { MenuSiteAccessError } from "@/lib/menu-site-permissions";
import { isStoreOperationsAvailable } from "@/lib/product-focus-policy";
import { listMenuTables } from "@/lib/server/menu-table-management-service";
import { MenuTableManagementError } from "@/lib/server/menu-table-management-service";
import { getStoreOperationsContext } from "@/lib/server/store-operations-context";
import { loadMenuFloorPlan } from "@/lib/server/menu-floor-plan-service";
import { retainRegisteredFloorPoints } from "@/lib/menu-floor-plan";
import { saveFloorPlanAction } from "@/app/mypage/menus/[menuId]/tables/floor-plan-actions";
import MenuTableManager from "@/app/mypage/menus/[menuId]/tables/MenuTableManager";
import { ContentPanel } from "@/app/components/ui/content-panel";
import type { OrderPointKind } from "@/lib/order-point-policy";

export default async function OrderPointManagementPage({ params, kind = "table" }: { params: Promise<{ menuId: string }>; kind?: OrderPointKind }) {
  const section = "tables";
  const noun = "테이블·키오스크";
  if (!isStoreOperationsAvailable()) redirect("/mypage?tab=menus");
  const { menuId } = await params;
  if (kind === "kiosk") redirect(`/mypage/menus/${menuId}/tables`);
  const operationsContext = await getStoreOperationsContext(menuId).catch((error: unknown) => {
    if (error instanceof MenuSiteAccessError && error.code === "AUTH_REQUIRED") {
      redirect(`/sign-in?next=${encodeURIComponent(`/mypage/menus/${menuId}/${section}`)}`);
    }
    throw error;
  });
  const selectedSite = operationsContext.sites.find((site) => site.menuSiteId === menuId) ?? null;
  if (!selectedSite || !selectedSite.permissions.includes("table.manage")) redirect("/mypage/operations");
  let data = null;
  try {
    if (selectedSite.tableSetupAvailable) data = await listMenuTables(menuId, { includeArchived: true });
  } catch (error) {
    if (error instanceof MenuSiteAccessError) {
      if (error.code === "AUTH_REQUIRED") redirect(`/sign-in?next=${encodeURIComponent(`/mypage/menus/${menuId}/${section}`)}`);
      if (error.status === 404) notFound();
      if (error.code === "MENU_SITE_PERMISSION_DENIED") {
        redirect(`/mypage/operations?site=${encodeURIComponent(menuId)}&message=permission-denied&feature=${section}`);
      }
    }
    if (error instanceof MenuTableManagementError) {
      if (error.code === "INVALID_INPUT") notFound();
      if (error.code === "MENU_SITE_UNAVAILABLE") redirect(`/mypage/operations?site=${encodeURIComponent(menuId)}`);
    }
    throw error;
  }

  const floorPlan = data ? await loadMenuFloorPlan(menuId) : null;
  if (floorPlan && data) floorPlan.document = retainRegisteredFloorPoints(floorPlan.document, data.tables);
  const deviceState = data?.tables.length ? await loadOrderPointDeviceSettings(menuId) : null;
  const connectionState = { available: deviceState?.connectionsAvailable ?? true, connections: deviceState?.connections.map(({ tableId, device }) => ({ tableId, device })) ?? [] };
  return (
    <StoreOperationsShell sites={operationsContext.sites} selectedSite={selectedSite} activeSection={section}>
      <div className="site-stack-content">
        <header className="site-stack-title">
          <p className="type-label text-zinc-500">{selectedSite.name}</p>
          <h2 className="type-subsection-title">{noun} 관리</h2>
        </header>
        {data ? (
          <MenuTableManager key={menuId} menuSiteId={data.menuSite.id} tables={data.tables.map(({ id, label, status, kind, policy, policyAvailable }) => ({ id, label, status, kind, policy, policyAvailable }))}
            saveFloorPlanAction={saveFloorPlanAction.bind(null, menuId)} floorPlan={floorPlan ?? undefined} archivedTables={data.archivedTables} pointSettingsAvailable={data.pointSettingsAvailable} canDelete={selectedSite.isOwner} canConfigure={selectedSite.isOwner} published={data.menuSite.status === "published"} deviceSetup={deviceState} connectionState={connectionState} />
        ) : (
          <ContentPanel>
            <div className="site-stack-title">
            <h3 className="type-subsection-title">{noun} 관리를 사용할 수 없습니다</h3>
            <p className="type-body-sm site-copy-muted">{noun} 관리는 유효한 베이직·다이닝 이용권에서 사용할 수 있습니다. 이용권이 유효한데도 이 안내가 보이면 잠시 후 다시 시도해 주세요.</p>
            </div>
          </ContentPanel>
        )}
      </div>
    </StoreOperationsShell>
  );
}
