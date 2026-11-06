import type { Metadata } from "next";
import Link from "next/link";
import { Bell, LayoutGrid, ShoppingBag, Ticket } from "lucide-react";
import { AnnouncementBar, MetricCard } from "@/app/components/ui/data-display";
import { redirect } from "next/navigation";

import InfoTooltip from "@/components/ui/InfoTooltip";
import StoreOperationsShell from "@/components/mypage/StoreOperationsShell";
import OperationFeatureToggle from "@/components/mypage/OperationFeatureToggle";
import OperationTableSetupNotice from "@/components/mypage/OperationTableSetupNotice";
import { ContentPanel } from "@/app/components/ui/content-panel";
import { Badge } from "@/app/components/ui/badge";
import { CUSTOMER_ORDER_STATUS_LABELS } from "@/lib/customer-order-history";
import OperationsDashboardRefresh from "@/components/mypage/OperationsDashboardRefresh";
import OperationStatusCards from "@/components/mypage/OperationStatusCards";
import { isStoreOperationsTemplate } from "@/lib/operations-dashboard";
import { loadMenuOrderSettings, loadOperationReceptionSummary } from "@/lib/server/menu-order-settings-service";
import { formatKoreanDateTime } from "@/lib/korean-date-time";
import { isStoreOperationsAvailable } from "@/lib/product-focus-policy";
import { listCallDashboard } from "@/lib/server/call-management-service";
import { listOrderDashboard } from "@/lib/server/order-management-service";
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
  tables: "테이블·키오스크 관리",
  kiosks: "테이블·키오스크 관리",
  sales: "매출 관리",
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
  if (!isStoreOperationsAvailable()) redirect("/mypage?tab=menus");

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
            <p className="mx-auto mt-3 max-w-xl break-keep text-copy font-medium leading-relaxed text-zinc-500">
              사장 계정의 베이직·다이닝 메뉴판에서 주문·호출 설정을 준비할 수 있습니다. 직원은 운영 중이며 권한이 부여된 메뉴판을 확인할 수 있습니다.
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
  const canReadTables = selectedSite.tableSetupAvailable && selectedSite.permissions.includes("table.manage");
  const [orderData, callData, tableData, pickupData, settingsData, receptionSummary] = await Promise.all([
    loadOptionalDashboard(access.orders, "orders", () => listOrderDashboard(selectedSite.menuSiteId)),
    loadOptionalDashboard(access.calls, "calls", () => listCallDashboard(selectedSite.menuSiteId)),
    loadOptionalDashboard(canReadTables, "tables", () => listMenuTables(selectedSite.menuSiteId)),
    loadOptionalDashboard(access.pickup, "pickup", () => listPickupQueueDashboard(selectedSite.menuSiteId)),
    loadOptionalDashboard(selectedSite.canConfigure, "settings", () => loadMenuOrderSettings(selectedSite.menuSiteId)),
    loadOptionalDashboard(!selectedSite.canConfigure && (access.orders || access.calls), "reception", () => loadOperationReceptionSummary(selectedSite.menuSiteId)),
  ]);

  const openOrders = orderData?.orders.filter((order) => !["served", "cancelled"].includes(order.status)) ?? [];
  const pendingCalls = callData?.calls.filter((call) => call.status === "pending") ?? [];
  const activeTables = tableData?.tables.filter((table) => table.status === "active") ?? [];
  const recentOrders = orderData?.orders.slice(0, 5) ?? [];
  const recentCalls = callData?.calls.slice(0, 5) ?? [];
  const activePickup = pickupData?.entries.filter((entry) => entry.status === "waiting" || entry.status === "ready") ?? [];

  return (
    <StoreOperationsShell sites={operationsContext.sites} selectedSite={selectedSite} activeSection="dashboard">
      <div className="site-stack-group">
        {permissionNotice ? <PermissionNotice message={permissionNotice} /> : null}
        <header className="site-stack-title">
          <h2 className="type-section-title">{selectedSite.name} 운영 현황</h2>
        </header>

        {isStoreOperationsTemplate(selectedSite.templateKey) ? <section className="site-stack-block" aria-label="주문·호출 사용 여부"><div className="site-action-row"><h3 className="type-subsection-title">주문·호출 사용 여부</h3>{selectedSite.canConfigure ? <InfoTooltip label="주문·호출 운영 안내"><p>메뉴판을 공개하고 테이블·키오스크를 등록한 뒤 전체 주문·호출을 켜 주세요. 기기별 허용과 연결은 테이블·키오스크 관리에서 변경합니다.</p><p>메뉴판을 비공개로 바꾸면 전체 주문·호출도 OFF로 저장됩니다. 기존 접수 내역은 유지됩니다.</p></InfoTooltip> : null}</div>
          <OperationTableSetupNotice menuId={selectedSite.menuSiteId}
          tableSetupAvailable={selectedSite.tableSetupAvailable} activeTablesReady={selectedSite.activeTablesReady}
          canManageTables={selectedSite.permissions.includes("table.manage")} />
          <OperationStatusCards key={`operation-status:${selectedSite.menuSiteId}`}
          menuId={selectedSite.menuSiteId} published={selectedSite.status === "published"}
          canPublish={selectedSite.permissions.includes("menu.publish")} canConfigure={selectedSite.canConfigure}
          permissions={{ orders: selectedSite.permissions.includes("order.read"), calls: selectedSite.permissions.includes("call.manage"), tables: canReadTables, edit: selectedSite.permissions.includes("menu.edit") }}
          historyAccess={access} settings={settingsData?.settings ?? receptionSummary}
          runtime={settingsData?.runtime ?? { orders: receptionSummary?.runtime.orders ?? false, calls: receptionSummary?.runtime.calls ?? false, tables: selectedSite.tableSetupAvailable }}
          activeTablesReady={selectedSite.activeTablesReady}
          tableCounts={tableData ? { registered: tableData.tables.filter(table => table.kind !== "kiosk").length, active: activeTables.filter(table => table.kind !== "kiosk").length, disabled: tableData.tables.filter(table => table.kind !== "kiosk" && table.status === "disabled").length } : null}
          kioskCounts={tableData ? { registered: tableData.tables.filter(table => table.kind === "kiosk").length, active: activeTables.filter(table => table.kind === "kiosk").length } : null}
          /></section> : (
        <section className="site-metric-grid" aria-label="매장 운영 요약">
          <MetricCard icon={<ShoppingBag />} tone="blue" surface="muted"
            label="진행 중 주문"
            value={orderData ? `${openOrders.length.toLocaleString("ko-KR")}건` : access.orders ? "확인 불가" : "이용 불가"}
            detail={orderData ? `최근 주문 ${orderData.orders.length.toLocaleString("ko-KR")}건` : "주문 기능 활성화 시 표시됩니다."}
            href={access.orders ? `/mypage/menus/${selectedSite.menuSiteId}/orders` : null}
            footer={selectedSite.canConfigure ? settingsData ? <OperationFeatureToggle menuId={selectedSite.menuSiteId} feature="orders"
              enabled={settingsData.settings.orderEnabled} canEnable={settingsData.runtime.orders} activeTablesReady={selectedSite.activeTablesReady} />
              : <p className="type-body-sm text-red-700" role="alert">사용 설정을 불러오지 못했습니다. 새로고침해 주세요.</p> : null}
          />
          <MetricCard icon={<Bell />} tone="brand" surface="muted"
            label="대기 중 호출"
            value={callData ? `${pendingCalls.length.toLocaleString("ko-KR")}건` : access.calls ? "확인 불가" : "이용 불가"}
            detail={callData ? `호출 이력 ${callData.calls.length.toLocaleString("ko-KR")}건` : "호출 기능 활성화 시 표시됩니다."}
            href={access.calls ? `/mypage/menus/${selectedSite.menuSiteId}/calls` : null}
            footer={selectedSite.canConfigure ? settingsData ? <OperationFeatureToggle menuId={selectedSite.menuSiteId} feature="calls"
              enabled={settingsData.settings.callEnabled} canEnable={settingsData.runtime.calls} activeTablesReady={selectedSite.activeTablesReady} />
              : <p className="type-body-sm text-red-700" role="alert">사용 설정을 불러오지 못했습니다. 새로고침해 주세요.</p> : null}
          />
          <MetricCard icon={<LayoutGrid />} tone="green" surface="muted"
            label="운영 테이블"
            value={tableData ? `${activeTables.length.toLocaleString("ko-KR")}개` : canReadTables ? "확인 불가" : "이용 불가"}
            detail={tableData ? `등록 테이블 ${tableData.tables.length.toLocaleString("ko-KR")}개` : selectedSite.canManageQr ? "대표 QR은 QR 관리에서 확인할 수 있습니다." : "테이블 기능 활성화 시 표시됩니다."}
            href={access.tables || selectedSite.canManageQr ? `/mypage/menus/${selectedSite.menuSiteId}/tables` : null}
          />
          <MetricCard icon={<Ticket />} tone="neutral" surface="muted"
            label="활성 대기번호"
            value={pickupData ? `${activePickup.length.toLocaleString("ko-KR")}건` : access.pickup ? "확인 불가" : "이용 불가"}
            detail={pickupData ? `오늘 등록 ${pickupData.entries.length.toLocaleString("ko-KR")}건` : "Display 대기번호 활성화 시 표시됩니다."}
            href={access.pickup ? `/mypage/menus/${selectedSite.menuSiteId}/pickup` : null}
            footer={<p className="type-body-sm text-zinc-600">사용 설정 보류</p>}
          />
        </section>)}

        <OperationsDashboardRefresh />
        <div className="site-card-grid xl:grid-cols-2">
          <DashboardList title="최근 주문 내역" emptyLabel={orderData ? "접수된 주문이 없습니다." : access.orders ? "주문 정보를 불러오지 못했습니다." : "현재 주문 내역을 확인할 수 없습니다."} href={access.orders ? `/mypage/menus/${selectedSite.menuSiteId}/orders` : null} hasItems={recentOrders.length > 0}>
            {recentOrders.map(order => <li key={order.id} className="site-content-heading-row site-content-divider">
              <div className="site-stack-copy min-w-0"><p className="type-label break-words">주문 #{order.orderNumber} · {order.tableLabel}</p><p className="type-body-sm">{order.totalAmount.toLocaleString("ko-KR")}원</p><p className="type-caption site-copy-muted">{formatKoreanDateTime(order.createdAt)}</p></div><Badge>{CUSTOMER_ORDER_STATUS_LABELS[order.status as keyof typeof CUSTOMER_ORDER_STATUS_LABELS] ?? order.status}</Badge>
            </li>)}
          </DashboardList>
          <DashboardList title="최근 호출 내역" emptyLabel={callData ? "접수된 호출이 없습니다." : access.calls ? "호출 정보를 불러오지 못했습니다." : "현재 호출 내역을 확인할 수 없습니다."} href={access.calls ? `/mypage/menus/${selectedSite.menuSiteId}/calls` : null} hasItems={recentCalls.length > 0}>
            {recentCalls.map(call => <li key={call.id} className="site-content-heading-row site-content-divider">
              <div className="site-stack-copy min-w-0"><p className="type-label break-words">호출 #{call.callNumber} · {call.tableLabel}</p><p className="type-body-sm break-words">{call.requestLabel}</p><p className="type-caption site-copy-muted">{formatKoreanDateTime(call.createdAt)}</p></div><Badge>{CALL_STATUS_LABELS[call.status] ?? call.status}</Badge>
            </li>)}
          </DashboardList>
        </div>


      </div>
    </StoreOperationsShell>
  );
}

function PermissionNotice({ message }: { message: string }) {
  return <AnnouncementBar label="권한 안내">{message}</AnnouncementBar>;
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
  return <ContentPanel as="article">
    <div className="site-content-heading-row"><h3 className="type-content-title">{title}</h3>{href ? <Link href={href} className="site-button site-button-outline">전체 보기</Link> : null}</div>
    {hasItems ? <ul className="site-stack-block">{children}</ul> : <p className="type-body-sm site-copy-muted">{emptyLabel}</p>}
  </ContentPanel>;
}
