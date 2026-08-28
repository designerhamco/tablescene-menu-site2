import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { MenuSiteAccessError } from "@/lib/menu-site-permissions";
import {
  listOrderDashboard,
  OrderManagementError,
} from "@/lib/server/order-management-service";

import OrderDashboard from "./OrderDashboard";

export const metadata: Metadata = {
  title: "주문관리 | 아티메뉴",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function OrderDashboardPage({
  params,
}: {
  params: Promise<{ menuId: string }>;
}) {
  const { menuId } = await params;
  let data;

  try {
    data = await listOrderDashboard(menuId);
  } catch (error) {
    if (error instanceof MenuSiteAccessError) {
      if (error.code === "AUTH_REQUIRED") {
        redirect(`/sign-in?next=${encodeURIComponent(`/mypage/menus/${menuId}/orders`)}`);
      }
      if (error.status === 404) notFound();
    }
    if (error instanceof OrderManagementError) {
      if (error.code === "INVALID_INPUT" || error.code === "ORDER_NOT_FOUND") notFound();
      if (error.code === "DASHBOARD_UNAVAILABLE") {
        redirect(`/mypage/operations?site=${encodeURIComponent(menuId)}`);
      }
    }
    throw error;
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-10 text-zinc-950 md:px-8 md:py-16">
      <div className="mx-auto max-w-6xl space-y-8">
        <header>
          <Link href={`/mypage/operations?site=${encodeURIComponent(menuId)}`} className="text-sm font-black text-emerald-700 hover:text-emerald-900">
            ← 매장 운영으로 돌아가기
          </Link>
          <p className="mt-6 text-xs font-black uppercase tracking-[0.18em] text-emerald-700">{data.menuSite.name}</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight md:text-5xl">주문관리</h1>
          <p className="mt-3 max-w-3xl break-keep text-sm font-medium leading-relaxed text-zinc-500">
            접수부터 제공까지의 상태와 외부 카드 단말기·현금 결제 완료를 관리합니다. ArtiMenu는 이 후불 흐름에서 카드 승인을 수행하지 않습니다.
          </p>
        </header>

        <OrderDashboard menuSiteId={data.menuSite.id} menuSiteName={data.menuSite.name} orders={data.orders} permissions={data.permissions} />
      </div>
    </main>
  );
}
