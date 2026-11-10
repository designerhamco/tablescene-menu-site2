import {SectionHeader} from "@/app/components/ui/section-header";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import StoreOperationsShell from "@/components/mypage/StoreOperationsShell";
import Link from "next/link";
import RepresentativeQrCard from "@/components/mypage/RepresentativeQrCard";
import { MenuSiteAccessError } from "@/lib/menu-site-permissions";
import { isStoreOperationsAvailable } from "@/lib/product-focus-policy";
import { getMenuQrManagementPageData } from "@/lib/server/menu-qr-management-service";
import { MenuTableManagementError } from "@/lib/server/menu-table-management-service";
import { getStoreOperationsContext } from "@/lib/server/store-operations-context";
import { ContentPanel } from "@/app/components/ui/content-panel";
import MenuTableQrManager from "./MenuTableQrManager";

export const metadata: Metadata = {
  title: "QR 관리 | 아티메뉴",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function MenuQrManagementPage({ params }: { params: Promise<{ menuId: string }> }) {
  if (!isStoreOperationsAvailable()) redirect("/mypage?tab=menus");
  const { menuId } = await params;
  const operationsContext = await getStoreOperationsContext(menuId).catch((error: unknown) => {
    if (error instanceof MenuSiteAccessError && error.code === "AUTH_REQUIRED") {
      redirect(`/sign-in?next=${encodeURIComponent(`/mypage/menus/${menuId}/qr`)}`);
    }
    throw error;
  });
  const selectedSite = operationsContext.sites.find((site) => site.menuSiteId === menuId) ?? null;
  if (!selectedSite || !selectedSite.canManageQr) redirect("/mypage/operations");
  let data = null;
  try {
    data = await getMenuQrManagementPageData(menuId);
  } catch (error) {
    if (error instanceof MenuSiteAccessError) {
      if (error.code === "AUTH_REQUIRED") redirect(`/sign-in?next=${encodeURIComponent(`/mypage/menus/${menuId}/qr`)}`);
      if (error.status === 404) notFound();
      if (error.code === "MENU_SITE_PERMISSION_DENIED") {
        redirect(`/mypage/operations?site=${encodeURIComponent(menuId)}&message=permission-denied&feature=qr`);
      }
    }
    if (error instanceof MenuTableManagementError) {
      if (error.code === "INVALID_INPUT") notFound();
      if (error.code === "MENU_SITE_UNAVAILABLE") redirect(`/mypage/operations?site=${encodeURIComponent(menuId)}`);
    }
    throw error;
  }

  return (
    <StoreOperationsShell sites={operationsContext.sites} selectedSite={selectedSite} activeSection="qr">
      <div className="site-stack-content">
        <SectionHeader title="QR 관리"/>
        {data ? <>
          <RepresentativeQrCard data={data} />
          {data.canManageTables ? (
            <MenuTableQrManager published={data.menuSite.status === "published"} menuSiteId={data.menuSite.id} menuSlug={data.menuSite.slug} publicBaseUrl={data.publicBaseUrl} tables={data.tables} canConnectDevices={selectedSite.tableSetupAvailable && selectedSite.permissions.includes("table.manage")} />
          ) : <ContentPanel><div className="site-stack-title"><h3 className="type-subsection-title">테이블별 QR</h3><p className="type-body-sm site-copy-muted">{data.tableQrUnavailableReason}</p></div></ContentPanel>}
          {selectedSite.permissions.includes("table.manage") ? <Link href={`/mypage/menus/${menuId}/tables`} className="site-button site-button-outline">테이블 등록·관리로 이동</Link> : null}
        </> : null}
      </div>
    </StoreOperationsShell>
  );
}
