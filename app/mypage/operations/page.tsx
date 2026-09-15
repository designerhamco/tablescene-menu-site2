import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import StoreOperationsShell from "@/components/mypage/StoreOperationsShell";
import { formatKoreanDateTime } from "@/lib/korean-date-time";
import { listCallDashboard } from "@/lib/server/call-management-service";
import { listMenuTables } from "@/lib/server/menu-table-management-service";
import { listPickupQueueDashboard } from "@/lib/server/pickup-queue-service";
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
  tables: "테이블·QR관리",
  sales: "매출요약",
  pickup: "대기번호",
} as const;

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
          <article className="site-card p-8 text-center md:p-12">
            <h2 className="type-subsection-title">운영 가능한 메뉴판이 없습니다</h2>
            <p className="mx-auto mt-3 max-w-xl break-keep text-sm font-medium leading-relaxed text-zinc-500">
              현재 공개 중이고 이용 기간이 유효한 멀티페이지 또는 Display 메뉴판만 표시됩니다.
            </p>
            <Link
              href="/mypage?tab=menus"
              className="site-button site-button-primary mt-6"
            >
              나의 메뉴판 확인
            </Link>
          </article>
        </div>
      </StoreOperationsShell>
    );
  }

  const access = selectedSite.operationAccess;
  const [callData, tableData, pickupData] = await Promise.all([
    loadOptionalDashboard(access.calls, "calls", () => listCallDashboard(selectedSite.menuSiteId)),
    loadOptionalDashboard(access.tables, "tables", () => listMenuTables(selectedSite.menuSiteId)),
    loadOptionalDashboard(access.pickup, "pickup", () => listPickupQueueDashboard(selectedSite.menuSiteId)),
  ]);

  const pendingCalls = callData?.calls.filter((call) => call.status === "pending") ?? [];
  const activeTables = tableData?.tables.filter((table) => table.status === "active") ?? [];
  const recentCalls = callData?.calls.slice(0, 5) ?? [];
  const activePickup = pickupData?.entries.filter((entry) => entry.status === "waiting" || entry.status === "ready") ?? [];

  return (
    <StoreOperationsShell sites={operationsContext.sites} selectedSite={selectedSite} activeSection="dashboard">
      <div className="space-y-6">
        {permissionNotice ? <PermissionNotice message={permissionNotice} /> : null}
        <header>
          <h2 className="type-subsection-title">{selectedSite.name} 운영 현황</h2>
          <p className="type-body-sm mt-3 break-keep text-zinc-500">
            현재 호출과 테이블, 대기번호 현황을 빠르게 확인합니다.
          </p>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="매장 운영 요약">
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
            label="활성 대기번호"
            value={pickupData ? `${activePickup.length.toLocaleString("ko-KR")}건` : access.pickup ? "확인 불가" : "이용 불가"}
            detail={pickupData ? `오늘 등록 ${pickupData.entries.length.toLocaleString("ko-KR")}건` : "Display 대기번호 활성화 시 표시됩니다."}
            href={access.pickup ? `/mypage/menus/${selectedSite.menuSiteId}/pickup` : null}
          />
        </section>

        <section>
          <DashboardList
            title="최근 호출"
            emptyLabel={callData ? "접수된 호출이 없습니다." : access.calls ? "호출 정보를 불러오지 못했습니다." : "호출 기능을 이용하지 않는 메뉴판입니다."}
            href={access.calls ? `/mypage/menus/${selectedSite.menuSiteId}/calls` : null}
            hasItems={recentCalls.length > 0}
          >
            {recentCalls.map((call) => (
              <li key={call.id} className="flex items-center justify-between gap-4 border-t border-zinc-100 px-4 py-4 first:border-t-0 sm:px-5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">호출 #{call.callNumber} · {call.tableLabel}</p>
                  <p className="mt-1 text-xs font-bold text-zinc-400">
                    {call.requestLabel} · {formatKoreanDateTime(call.createdAt)}
                  </p>
                </div>
                <p className="shrink-0 text-xs font-bold text-zinc-500">{CALL_STATUS_LABELS[call.status] ?? call.status}</p>
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
    <p className="site-notice site-notice-warning" role="status">
      {message}
    </p>
  );
}

function SummaryCard({ label, value, detail, href }: { label: string; value: string; detail: string; href: string | null }) {
  const content = (
    <>
      <p className="type-caption text-zinc-400">{label}</p>
      <p className="type-content-title mt-3 tabular-nums">{value}</p>
      <p className="type-caption mt-2 break-keep text-zinc-500">{detail}</p>
    </>
  );

  return href ? (
    <Link href={href} className="site-card site-card-interactive p-5">
      {content}
    </Link>
  ) : (
    <article className="site-card p-5">{content}</article>
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
    <article className="site-card overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-zinc-100 px-4 py-4 sm:px-5">
        <h3 className="type-content-title">{title}</h3>
        {href ? <Link href={href} className="text-xs font-bold text-zinc-500 hover:text-zinc-950">전체보기</Link> : null}
      </div>
      {hasItems ? <ul>{children}</ul> : <p className="px-5 py-10 text-center text-sm font-bold text-zinc-400">{emptyLabel}</p>}
    </article>
  );
}
