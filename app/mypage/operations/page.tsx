import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import StoreOperationsShell from "@/components/mypage/StoreOperationsShell";
import { listCallDashboard } from "@/lib/server/call-management-service";
import { listMenuTables } from "@/lib/server/menu-table-management-service";
import { listOrderDashboard } from "@/lib/server/order-management-service";
import { getSalesSummaryDashboard } from "@/lib/server/sales-summary-service";
import { getStoreOperationsContext } from "@/lib/server/store-operations-context";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "매장 운영 | 아티메뉴",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchParams = Promise<{
  site?: string | string[];
  message?: string | string[];
  feature?: string | string[];
}>;

const OPERATION_FEATURE_LABELS = {
  orders: "주문관리",
  calls: "호출관리",
  tables: "테이블관리",
  sales: "매출요약",
} as const;

const ORDER_STATUS_LABELS: Record<string, string> = {
  received: "접수",
  accepted: "조리 전",
  cooking: "조리 중",
  ready: "조리 완료",
  served: "제공 완료",
  cancelled: "취소",
};

const CALL_STATUS_LABELS: Record<string, string> = {
  pending: "대기",
  acknowledged: "확인",
  completed: "완료",
  cancelled: "취소",
};

function getSingleSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getOperationFeatureLabel(value: string | undefined) {
  if (!value || !Object.prototype.hasOwnProperty.call(OPERATION_FEATURE_LABELS, value)) {
    return "해당 메뉴";
  }

  return OPERATION_FEATURE_LABELS[value as keyof typeof OPERATION_FEATURE_LABELS];
}

function formatAmount(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

async function loadOptionalDashboard<T>(
  enabled: boolean,
  label: string,
  loader: () => Promise<T>,
): Promise<T | null> {
  if (!enabled) return null;

  try {
    return await loader();
  } catch (error) {
    console.warn("[store-operations-dashboard] summary load failed", {
      label,
      message: error instanceof Error ? error.message : "unknown",
    });
    return null;
  }
}

export default async function StoreOperationsPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/sign-in?next=${encodeURIComponent("/mypage/operations")}`);
  }

  const resolvedSearchParams = await searchParams;
  const requestedSiteId = getSingleSearchParam(resolvedSearchParams.site);
  const messageCode = getSingleSearchParam(resolvedSearchParams.message);
  const requestedFeature = getSingleSearchParam(resolvedSearchParams.feature);
  const permissionNotice = messageCode === "permission-denied"
    ? `${getOperationFeatureLabel(requestedFeature)}에 접근할 권한이 없습니다. 사장에게 직원 역할 변경을 요청해 주세요.`
    : null;
  const operationsContext = await getStoreOperationsContext(requestedSiteId);
  const selectedSite = operationsContext.selectedSite;

  if (!selectedSite) {
    return (
      <StoreOperationsShell sites={operationsContext.sites} selectedSite={null} activeSection="dashboard">
        <div className="space-y-5">
          {permissionNotice ? <PermissionNotice message={permissionNotice} /> : null}
          <article className="rounded-3xl border border-zinc-200 bg-white p-8 text-center shadow-sm md:p-12">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">NO ACTIVE SMART CALL MENU</p>
            <h2 className="mt-3 text-2xl font-black tracking-tight">운영 가능한 스마트호출 메뉴판이 없습니다</h2>
            <p className="mx-auto mt-3 max-w-xl break-keep text-sm font-medium leading-relaxed text-zinc-500">
              현재 공개 중이고 이용 기간과 스마트호출 기능이 활성화된 멀티페이지 다이닝 메뉴판만 표시됩니다.
            </p>
            <Link
              href="/mypage?tab=menus"
              className="mt-6 inline-flex items-center justify-center rounded-full bg-zinc-950 px-5 py-3 text-sm font-black text-white transition-colors hover:bg-zinc-800"
            >
              나의 메뉴판 확인
            </Link>
          </article>
        </div>
      </StoreOperationsShell>
    );
  }

  const access = selectedSite.operationAccess;
  const [orderData, callData, tableData, salesData] = await Promise.all([
    loadOptionalDashboard(access.orders, "orders", () => listOrderDashboard(selectedSite.menuSiteId)),
    loadOptionalDashboard(access.calls, "calls", () => listCallDashboard(selectedSite.menuSiteId)),
    loadOptionalDashboard(access.tables, "tables", () => listMenuTables(selectedSite.menuSiteId)),
    loadOptionalDashboard(access.sales, "sales", () => getSalesSummaryDashboard(selectedSite.menuSiteId)),
  ]);

  const activeOrders = orderData?.orders.filter((order) => order.status !== "served" && order.status !== "cancelled") ?? [];
  const pendingCalls = callData?.calls.filter((call) => call.status === "pending") ?? [];
  const activeTables = tableData?.tables.filter((table) => table.status === "active") ?? [];
  const recentOrders = orderData?.orders.slice(0, 5) ?? [];
  const recentCalls = callData?.calls.slice(0, 5) ?? [];

  return (
    <StoreOperationsShell sites={operationsContext.sites} selectedSite={selectedSite} activeSection="dashboard">
      <div className="space-y-6">
        {permissionNotice ? <PermissionNotice message={permissionNotice} /> : null}
        <header>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">DASHBOARD</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight">{selectedSite.name} 운영 현황</h2>
          <p className="mt-3 break-keep text-sm font-medium leading-relaxed text-zinc-500">
            현재 호출 상태와 테이블 운영 현황을 빠르게 확인합니다.
          </p>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="매장 운영 요약">
          <SummaryCard
            label="진행 중 주문"
            value={orderData ? `${activeOrders.length.toLocaleString("ko-KR")}건` : "확인 불가"}
            detail={orderData ? `최근 주문 ${orderData.orders.length.toLocaleString("ko-KR")}건 기준` : "주문 정보를 불러오지 못했습니다."}
            href={access.orders ? `/mypage/menus/${selectedSite.menuSiteId}/orders` : null}
          />
          <SummaryCard
            label="대기 중 호출"
            value={callData ? `${pendingCalls.length.toLocaleString("ko-KR")}건` : access.calls ? "확인 불가" : "이용 불가"}
            detail={callData ? `호출 이력 ${callData.calls.length.toLocaleString("ko-KR")}건` : "호출 기능 활성화 시 표시됩니다."}
            href={access.calls ? `/mypage/menus/${selectedSite.menuSiteId}/calls` : null}
          />
          <SummaryCard
            label="운영 테이블"
            value={tableData ? `${activeTables.length.toLocaleString("ko-KR")}개` : access.tables ? "확인 불가" : "이용 불가"}
            detail={tableData ? `등록 테이블 ${tableData.tables.length.toLocaleString("ko-KR")}개` : "테이블 기능 활성화 시 표시됩니다."}
            href={access.tables ? `/mypage/menus/${selectedSite.menuSiteId}/tables` : null}
          />
          <SummaryCard
            label="오늘 결제 완료액"
            value={salesData ? formatAmount(salesData.summary.today.collectedAmount) : access.sales ? "확인 불가" : "이용 불가"}
            detail={salesData ? `결제 완료 ${salesData.summary.today.paidOrderCount.toLocaleString("ko-KR")}건` : "매출 조회 권한이 있으면 표시됩니다."}
            href={access.sales ? `/mypage/menus/${selectedSite.menuSiteId}/sales` : null}
          />
        </section>

        <section className="grid gap-5 xl:grid-cols-2">
          <DashboardList
            title="최근 주문"
            emptyLabel={orderData ? "접수된 주문이 없습니다." : "주문 정보를 불러오지 못했습니다."}
            href={access.orders ? `/mypage/menus/${selectedSite.menuSiteId}/orders` : null}
            hasItems={recentOrders.length > 0}
          >
            {recentOrders.map((order) => (
              <li key={order.id} className="flex items-center justify-between gap-4 border-t border-zinc-100 px-5 py-4 first:border-t-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black">주문 #{order.orderNumber} · {order.tableLabel}</p>
                  <p className="mt-1 text-xs font-bold text-zinc-400">{ORDER_STATUS_LABELS[order.status] ?? order.status}</p>
                </div>
                <p className="shrink-0 text-sm font-black">{formatAmount(order.totalAmount)}</p>
              </li>
            ))}
          </DashboardList>

          <DashboardList
            title="최근 호출"
            emptyLabel={callData ? "접수된 호출이 없습니다." : access.calls ? "호출 정보를 불러오지 못했습니다." : "호출 기능을 이용하지 않는 메뉴판입니다."}
            href={access.calls ? `/mypage/menus/${selectedSite.menuSiteId}/calls` : null}
            hasItems={recentCalls.length > 0}
          >
            {recentCalls.map((call) => (
              <li key={call.id} className="flex items-center justify-between gap-4 border-t border-zinc-100 px-5 py-4 first:border-t-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black">호출 #{call.callNumber} · {call.tableLabel}</p>
                  <p className="mt-1 text-xs font-bold text-zinc-400">
                    {call.requestLabel} · {new Date(call.createdAt).toLocaleString("ko-KR")}
                  </p>
                </div>
                <p className="shrink-0 text-xs font-black text-zinc-500">{CALL_STATUS_LABELS[call.status] ?? call.status}</p>
              </li>
            ))}
          </DashboardList>
        </section>
      </div>
    </StoreOperationsShell>
  );
}

function PermissionNotice({ message }: { message: string }) {
  return (
    <p className="rounded-2xl border border-amber-100 bg-amber-50 px-5 py-4 text-sm font-bold leading-relaxed text-amber-800" role="status">
      {message}
    </p>
  );
}

function SummaryCard({ label, value, detail, href }: { label: string; value: string; detail: string; href: string | null }) {
  const content = (
    <>
      <p className="text-xs font-black text-zinc-400">{label}</p>
      <p className="mt-3 text-2xl font-black tracking-tight">{value}</p>
      <p className="mt-2 break-keep text-xs font-bold leading-relaxed text-zinc-500">{detail}</p>
    </>
  );

  return href ? (
    <Link href={href} className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm transition-colors hover:border-zinc-300 hover:bg-zinc-50">
      {content}
    </Link>
  ) : (
    <article className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">{content}</article>
  );
}

function DashboardList({
  title,
  emptyLabel,
  href,
  hasItems,
  children,
}: {
  title: string;
  emptyLabel: string;
  href: string | null;
  hasItems: boolean;
  children: React.ReactNode;
}) {
  return (
    <article className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-zinc-100 px-5 py-4">
        <h3 className="text-lg font-black">{title}</h3>
        {href ? <Link href={href} className="text-xs font-black text-zinc-500 hover:text-zinc-950">전체보기</Link> : null}
      </div>
      {hasItems ? <ul>{children}</ul> : <p className="px-5 py-10 text-center text-sm font-bold text-zinc-400">{emptyLabel}</p>}
    </article>
  );
}
