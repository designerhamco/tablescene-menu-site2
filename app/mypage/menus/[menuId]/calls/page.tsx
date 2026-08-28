import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { MenuSiteAccessError } from "@/lib/menu-site-permissions";
import {
  CallManagementError,
  listCallDashboard,
} from "@/lib/server/call-management-service";

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
    }
    if (error instanceof CallManagementError) {
      if (error.code === "INVALID_INPUT" || error.code === "CALL_NOT_FOUND") notFound();
      if (error.code === "DASHBOARD_UNAVAILABLE") {
        redirect(`/mypage/operations?site=${encodeURIComponent(menuId)}`);
      }
    }
    throw error;
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-10 text-zinc-950 md:px-8 md:py-16">
      <div className="mx-auto max-w-5xl space-y-8">
        <header>
          <Link href={`/mypage/operations?site=${encodeURIComponent(menuId)}`} className="text-sm font-black text-emerald-700 hover:text-emerald-900">
            ← 매장 운영으로 돌아가기
          </Link>
          <p className="mt-6 text-xs font-black uppercase tracking-[0.18em] text-emerald-700">{data.menuSite.name}</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight md:text-5xl">호출관리</h1>
          <p className="mt-3 max-w-3xl break-keep text-sm font-medium leading-relaxed text-zinc-500">
            테이블의 직원 호출을 접수 확인하고 완료합니다. 손님이 취소한 호출과 완료 이력도 함께 확인할 수 있습니다.
          </p>
        </header>
        <CallDashboard menuSiteId={data.menuSite.id} calls={data.calls} />
      </div>
    </main>
  );
}
