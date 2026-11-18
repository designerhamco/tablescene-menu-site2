import { redirect } from "next/navigation";
import { ContentPanel } from "@/app/components/ui/content-panel";
import { SectionHeader } from "@/app/components/ui/section-header";
import { NavigationTabs } from "@/app/components/ui/navigation-tabs";
import { Badge } from "@/app/components/ui/badge";
import { CUSTOMER_ORDER_STATUS_LABELS } from "@/lib/customer-order-history";
import StoreOperationsShell from "./StoreOperationsShell";
import OperationsViewLayout from "./OperationsViewLayout";
import OperationsDashboardRefresh from "./OperationsDashboardRefresh";
import AllMenuStatusOverview from "./AllMenuStatusOverview";
import DashboardList from "./OperationsDashboardList";
import InfoTooltip from "@/components/ui/InfoTooltip";
import OrderDashboard from "@/app/mypage/menus/[menuId]/orders/OrderDashboard";
import CallDashboard from "@/app/mypage/menus/[menuId]/calls/CallDashboard";
import { ALL_MENU_SITE_ID, allMenuListFloor, allMenuOperationSites, type AllMenuFeature } from "@/lib/all-menu-operations";
import type { OrderHistorySearch } from "@/lib/order-history-query";
import { formatKoreanDateTime } from "@/lib/korean-date-time";
import { isStoreOperationsAvailable } from "@/lib/product-focus-policy";
import { listAllMenuOrders, listAllMenuCalls } from "@/lib/server/all-menu-operations-service";
import { getStoreOperationsContext, type StoreOperationsSite } from "@/lib/server/store-operations-context";
import { createClient } from "@/lib/supabase/server";
import { loadAllMenuOperationOverviews } from "@/lib/server/operation-overview-service";
import type { OperationSiteOverview } from "@/lib/operation-overview";
import { operationMenuTargets } from "@/lib/operation-menu-targets";
import OperationMenuTarget from "./OperationMenuTarget";

function LoadNotice({ failures }: { failures: string[] }) {
  return failures.length ? <ContentPanel surface="notice" density="compact"><p role="alert" className="type-body-sm break-words">{failures.join(", ")}의 내역을 불러오지 못했습니다. 표시된 건수에는 포함되지 않습니다. 새로고침해 주세요.</p></ContentPanel> : null;
}

function EmptyScope({ feature }: { feature: AllMenuFeature }) {
  return <p role="status" className="type-body-sm site-copy-muted">{feature === "orders" ? "주문" : "호출"}을 통합 관리할 수 있는 메뉴판이 없습니다.</p>;
}

export default async function AllMenuOperationsPage({ feature, search = {} }: { feature: AllMenuFeature; search?: OrderHistorySearch }) {
  if (!isStoreOperationsAvailable()) redirect("/mypage?tab=menus");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(`/mypage/operations/${feature}`)}`);
  const { sites } = await getStoreOperationsContext();
  const history = feature === "orders" && search.tab === "history";
  const path = `/mypage/operations/${feature}`;
  const orders = feature === "orders" ? await listAllMenuOrders(sites, search) : null;
  const calls = feature === "calls" ? await listAllMenuCalls(sites) : null;
  const result = orders ?? calls!;
  const loaded = result.siteCount > result.failures.length;
  const settingsTargets = operationMenuTargets(sites, feature === "orders" ? "order-settings" : "call-settings");
  const itemTargets = feature === "calls" ? operationMenuTargets(sites, "call-items") : [];
  return <StoreOperationsShell sites={sites} selectedSite={null} allMenus activeSection={feature}>
    <OperationsViewLayout title={feature === "orders" ? "주문 관리" : "호출 관리"} selectable={false} help={<InfoTooltip label="전체 메뉴판 통합 관리 안내"><p>권한이 있는 베이직·다이닝 메뉴판의 내역을 함께 표시합니다. 처리 권한과 알림 설정은 메뉴판별로 적용됩니다.</p><p>{feature === "calls" ? "메뉴판별 최근 100건을 표시하며 15초마다 갱신합니다." : history ? "선택한 기간의 주문 이력을 전체 메뉴판 기준으로 조회합니다." : "진행 중·미결제 주문은 날짜와 관계없이 15초마다 갱신합니다."}</p><p>테이블·QR·접수 설정은 운영할 메뉴판을 개별 선택해서 관리해 주세요.</p></InfoTooltip>}>
      {feature === "orders" || settingsTargets.length || itemTargets.length ? <div className="site-stack-block">{feature === "orders" ? <NavigationTabs label="주문관리 화면" purpose="page" items={[
        { label: "현재 주문", href: path, active: !history },
        { label: "주문 이력", href: `${path}?tab=history`, active: history },
      ]}/> : null}
      {settingsTargets.length || itemTargets.length ? <div className="site-action-row">
        {settingsTargets.length ? <OperationMenuTarget label={feature === "orders" ? "주문 설정" : "호출 설정"} items={settingsTargets}/> : null}
        {itemTargets.length ? <OperationMenuTarget label="호출 항목 설정" items={itemTargets}/> : null}
      </div> : null}</div> : null}
      <LoadNotice failures={result.failures}/>
      {!result.siteCount ? <EmptyScope feature={feature}/> : null}
      {orders && loaded ? <OrderDashboard menuSiteId={ALL_MENU_SITE_ID} menuSiteName="전체 메뉴판" floorPlan={allMenuListFloor}
        orders={orders.orders} view={orders.view} recordSources={orders.sources} arrivalGroups={orders.arrivals} historyPath={path}
        permissions={{ canManage: false, canCancelUnpaid: false, canMarkManualPayment: false }}/> : null}
      {calls && loaded ? <CallDashboard menuSiteId={ALL_MENU_SITE_ID} calls={calls.calls} floorPlan={allMenuListFloor} recordSources={calls.sources} arrivalGroups={calls.arrivals}/> : null}
      {result.failures.length && !loaded ? <OperationsDashboardRefresh/> : null}
    </OperationsViewLayout>
  </StoreOperationsShell>;
}

export async function AllMenuOperationsDashboard({ sites }: { sites: StoreOperationsSite[] }) {
  const [orders, calls, overviews] = await Promise.all([listAllMenuOrders(sites), listAllMenuCalls(sites), loadAllMenuOperationOverviews(sites)]);
  return <StoreOperationsShell sites={sites} selectedSite={null} allMenus activeSection="dashboard">
    <AllMenuOperationsDashboardContent sites={sites} orders={orders} calls={calls} overviews={overviews}/>
  </StoreOperationsShell>;
}

export function AllMenuOperationsDashboardContent({ sites, orders, calls, overviews }: {
  sites: StoreOperationsSite[];
  orders: Awaited<ReturnType<typeof listAllMenuOrders>>;
  calls: Awaited<ReturnType<typeof listAllMenuCalls>>;
  overviews: OperationSiteOverview[];
}) {
  const orderSites = allMenuOperationSites(sites, "orders"), callSites = allMenuOperationSites(sites, "calls");
  const callStatuses: Record<string, string> = { pending: "대기", acknowledged: "확인", completed: "완료", cancelled: "취소" };
  return <div className="site-stack-group">
      <SectionHeader title="운영 대시보드"/>
      <LoadNotice failures={[...new Set([...orders.failures, ...calls.failures])]}/>
      {overviews.some(item => item.failed) ? <ContentPanel surface="notice" density="compact"><p role="alert" className="type-body-sm break-words">{overviews.filter(item => item.failed).map(item => item.site.name || "이름 없는 메뉴판").join(", ")}의 운영 상태 일부를 불러오지 못했습니다. 확인 가능한 정보만 표시합니다. 새로고침해 주세요.</p></ContentPanel> : null}
      <AllMenuStatusOverview overviews={overviews} activity={{
        orders: orders.siteCount ? orders.failures.length === orders.siteCount ? null : orders.orders.filter(order => order.status !== "served" && order.status !== "cancelled").length : undefined,
        calls: calls.siteCount ? calls.failures.length === calls.siteCount ? null : calls.calls.filter(call => call.status === "pending").length : undefined,
      }}/>
      <OperationsDashboardRefresh/>
      <div className="site-card-grid xl:grid-cols-2">
        <DashboardList title="최근 주문 내역" href={orderSites.length ? "/mypage/operations/orders" : null} hasItems={orders.orders.length > 0} emptyLabel={orders.failures.length ? "주문 정보를 불러오지 못했습니다." : "진행 중·미결제 주문이 없습니다."}>
          {orders.orders.slice(0, 5).map(order => <li key={order.id} className="site-content-heading-row site-content-divider">
            <div className="site-stack-copy min-w-0"><p className="type-label break-words">{orders.sources[order.id]?.menuSiteName} · 주문 #{order.orderNumber} · {order.tableLabel}</p><p className="type-body-sm">{order.totalAmount.toLocaleString("ko-KR")}원</p><p className="type-caption site-copy-muted">{formatKoreanDateTime(order.createdAt)}</p></div><Badge>{CUSTOMER_ORDER_STATUS_LABELS[order.status as keyof typeof CUSTOMER_ORDER_STATUS_LABELS] ?? order.status}</Badge>
          </li>)}
        </DashboardList>
        <DashboardList title="최근 호출 내역" href={callSites.length ? "/mypage/operations/calls" : null} hasItems={calls.calls.length > 0} emptyLabel={calls.failures.length ? "호출 정보를 불러오지 못했습니다." : "접수된 호출이 없습니다."}>
          {calls.calls.slice(0, 5).map(call => <li key={call.id} className="site-content-heading-row site-content-divider">
            <div className="site-stack-copy min-w-0"><p className="type-label break-words">{calls.sources[call.id]?.menuSiteName} · 호출 #{call.callNumber} · {call.tableLabel}</p><p className="type-body-sm break-words">{call.requestLabel}</p><p className="type-caption site-copy-muted">{formatKoreanDateTime(call.createdAt)}</p></div><Badge>{callStatuses[call.status] ?? call.status}</Badge>
          </li>)}
        </DashboardList>
      </div>
    </div>;
}
