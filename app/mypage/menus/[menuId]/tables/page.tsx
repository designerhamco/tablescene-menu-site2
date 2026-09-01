import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import StoreOperationsShell from "@/components/mypage/StoreOperationsShell";
import { MenuSiteAccessError } from "@/lib/menu-site-permissions";
import {
  listMenuTables,
  MenuTableManagementError,
} from "@/lib/server/menu-table-management-service";
import { getStoreOperationsContext } from "@/lib/server/store-operations-context";

import MenuTableManager from "./MenuTableManager";

export const metadata: Metadata = {
  title: "테이블·QR 관리 | 아티메뉴",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getConfiguredPublicBaseUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_PUBLIC_MENU_BASE_URL?.trim()
    || process.env.NEXT_PUBLIC_SITE_URL?.trim()
    || "";
  if (!configuredUrl) return null;

  try {
    return new URL(configuredUrl).origin;
  } catch {
    return null;
  }
}

export default async function MenuTableManagementPage({
  params,
}: {
  params: Promise<{ menuId: string }>;
}) {
  const { menuId } = await params;
  let data;

  try {
    data = await listMenuTables(menuId);
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

  const operationsContext = await getStoreOperationsContext(menuId);
  const selectedSite = operationsContext.sites.find((site) => site.menuSiteId === menuId) ?? null;
  if (!selectedSite?.operationAccess.tables) {
    redirect("/mypage/operations");
  }

  return (
    <StoreOperationsShell sites={operationsContext.sites} selectedSite={selectedSite} activeSection="tables">
      <div className="space-y-8">
        <header>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">{data.menuSite.name}</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight">테이블·QR 관리</h2>
          <p className="mt-3 max-w-3xl break-keep text-sm font-medium leading-relaxed text-zinc-500">
            대표 메뉴 QR과 실제 좌석별 QR을 한곳에서 관리합니다. 비활성·보관·QR 교체 시 기존 방문 세션은 서버에서 자동 종료됩니다.
          </p>
        </header>

        <MenuTableManager
          menuSiteId={data.menuSite.id}
          menuSlug={data.menuSite.slug}
          publicBaseUrl={getConfiguredPublicBaseUrl()}
          tables={data.tables}
        />
      </div>
    </StoreOperationsShell>
  );
}
