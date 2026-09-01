import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import StoreOperationsShell from "@/components/mypage/StoreOperationsShell";
import { MenuSiteAccessError } from "@/lib/menu-site-permissions";
import {
  listPickupQueueDashboard,
  PickupQueueServiceError,
} from "@/lib/server/pickup-queue-service";
import { getStoreOperationsContext } from "@/lib/server/store-operations-context";

import PickupQueueDashboard from "./PickupQueueDashboard";

export const metadata: Metadata = {
  title: "대기번호 | 아티메뉴",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PickupQueuePage({ params }: { params: Promise<{ menuId: string }> }) {
  const { menuId } = await params;
  let data;
  try {
    data = await listPickupQueueDashboard(menuId);
  } catch (error) {
    if (error instanceof MenuSiteAccessError) {
      if (error.code === "AUTH_REQUIRED") {
        redirect(`/sign-in?next=${encodeURIComponent(`/mypage/menus/${menuId}/pickup`)}`);
      }
      if (error.status === 404) notFound();
      if (error.code === "MENU_SITE_PERMISSION_DENIED") {
        redirect(`/mypage/operations?site=${encodeURIComponent(menuId)}&message=permission-denied&feature=pickup`);
      }
    }
    if (error instanceof PickupQueueServiceError) {
      if (error.code === "INVALID_INPUT" || error.code === "QUEUE_NOT_FOUND") notFound();
      if (error.code === "QUEUE_UNAVAILABLE") redirect(`/mypage/operations?site=${encodeURIComponent(menuId)}`);
    }
    throw error;
  }

  const operationsContext = await getStoreOperationsContext(menuId);
  const selectedSite = operationsContext.sites.find((site) => site.menuSiteId === menuId) ?? null;
  if (!selectedSite?.operationAccess.pickup) redirect("/mypage/operations");

  return (
    <StoreOperationsShell sites={operationsContext.sites} selectedSite={selectedSite} activeSection="pickup">
      <div className="space-y-8">
        <header>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">{data.menuSite.name}</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight">대기번호</h2>
          <p className="mt-3 max-w-3xl break-keep text-sm font-medium leading-relaxed text-zinc-500">
            번호를 직접 등록하고 준비 완료 시 고객 대기판의 픽업 요청 영역으로 이동합니다.
          </p>
        </header>
        <PickupQueueDashboard
          menuSiteId={data.menuSite.id}
          slug={data.menuSite.slug}
          businessDate={data.businessDate}
          entries={data.entries}
        />
      </div>
    </StoreOperationsShell>
  );
}
