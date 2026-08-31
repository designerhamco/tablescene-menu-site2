import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import StoreOperationsShell from "@/components/mypage/StoreOperationsShell";
import { MenuSiteAccessError } from "@/lib/menu-site-permissions";
import {
  CallManagementError,
  listCallDashboard,
} from "@/lib/server/call-management-service";
import { getStoreOperationsContext } from "@/lib/server/store-operations-context";

import CallDashboard from "./CallDashboard";

export const metadata: Metadata = {
  title: "호출관리 | 아티메뉴",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CallDashboardPage({
  params,
}: {
  params: Promise<{ menuId: string }>;
}) {
  const { menuId } = await params;
  let data;
  try {
    data = await listCallDashboard(menuId);
  } catch (error) {
    if (error instanceof MenuSiteAccessError) {
      if (error.code === "AUTH_REQUIRED") {
        redirect(`/sign-in?next=${encodeURIComponent(`/mypage/menus/${menuId}/calls`)}`);
      }
      if (error.status === 404) notFound();
      if (error.code === "MENU_SITE_PERMISSION_DENIED") {
        redirect(`/mypage/operations?site=${encodeURIComponent(menuId)}&message=permission-denied&feature=calls`);
      }
    }
    if (error instanceof CallManagementError) {
      if (error.code === "INVALID_INPUT" || error.code === "CALL_NOT_FOUND") notFound();
      if (error.code === "DASHBOARD_UNAVAILABLE") {
        redirect(`/mypage/operations?site=${encodeURIComponent(menuId)}`);
      }
    }
    throw error;
  }

  const operationsContext = await getStoreOperationsContext(menuId);
  const selectedSite = operationsContext.sites.find((site) => site.menuSiteId === menuId) ?? null;
  if (!selectedSite?.operationAccess.calls) {
    redirect("/mypage/operations");
  }

  return (
    <StoreOperationsShell sites={operationsContext.sites} selectedSite={selectedSite} activeSection="calls">
      <div className="space-y-8">
        <header>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">{data.menuSite.name}</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight">호출관리</h2>
          <p className="mt-3 max-w-3xl break-keep text-sm font-medium leading-relaxed text-zinc-500">
            테이블의 직원 호출을 접수 확인하고 완료합니다. 손님이 취소한 호출과 완료 이력도 함께 확인할 수 있습니다.
          </p>
        </header>
        <CallDashboard menuSiteId={data.menuSite.id} calls={data.calls} callItems={data.callItems} />
      </div>
    </StoreOperationsShell>
  );
}
