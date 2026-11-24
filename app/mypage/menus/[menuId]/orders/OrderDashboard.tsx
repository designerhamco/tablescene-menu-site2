"use client";
import Link from "next/link";
import { createPortal } from "react-dom";
import type { OrderSettlementGroup } from "@/lib/order-settlement";
import type { ManualOrderActions } from "@/lib/manual-order";
import OrderTableWorkspace from "./OrderTableWorkspace";
import { Button } from "@/app/components/ui/button";
import OrderHistoryFilters from "@/components/mypage/OrderHistoryFilters";
import {orderHistoryHref,isCurrentOrder} from "@/lib/order-history-query";
import { useActionState, useEffect, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ContentPanel } from "@/app/components/ui/content-panel";
import { RefreshButton } from "@/app/components/ui/refresh-button";
import { TableCell } from "@/app/components/ui/table";
import OperationsHistoryTable from "@/components/mypage/OperationsHistoryTable";
import { Badge } from "@/app/components/ui/badge";
import OperationalArrivalAlert from "@/components/mypage/OperationalArrivalAlert";
import OperationsHistoryViews from "@/components/mypage/OperationsHistoryViews";
import { useLiveOrderStatuses } from "@/components/mypage/useLiveOrderStatuses";
import ActionFeedbackToast from "@/components/ui/ActionFeedbackToast";
import OrderReceipt, { STATUS_LABELS, PAYMENT_LABELS, formatAmount } from "@/components/mypage/OrderReceipt";
import { shouldRefreshArrivalDashboard } from "@/lib/dashboard-arrival-alerts";
import { formatKoreanDateTime } from "@/lib/korean-date-time";
import type { OperationsFloorPlan } from "@/lib/operations-history";
import type { OrderDashboardPageData } from "@/lib/server/order-management-service";
import type { OperationRecordSources, OperationArrivalGroup } from "@/lib/all-menu-operations";
import { initialOrderManagementActionState } from "./action-state";
import { mutateOrderAction } from "./actions";
type Order = OrderDashboardPageData["orders"][number];
function OrderItems({ order }: { order: Order }) {
  return (
    <div className="site-stack-block">
      {order.items.map((item) => (
        <div key={item.id} className="site-stack-copy">
          <p className="type-item-title break-words">
            {item.name} × {item.quantity}
          </p>
          {item.options.map((option, index) => (
            <p key={index} className="type-body-sm site-copy-muted break-words">
              {option.groupName}: {option.valueName}
              {option.priceDelta !== 0
                ? ` (${option.priceDelta > 0 ? "+" : ""}${formatAmount(option.priceDelta)})`
                : ""}
            </p>
          ))}
          <p className="type-body-sm">단가 {formatAmount(item.unitPrice)} · 상품 금액 {formatAmount(item.lineTotal)}</p>
        </div>
      ))}
    </div>
  );
}
export default function OrderDashboard({
  menuSiteId,
  menuSiteName,
  orders: serverOrders,
  permissions,
  floorPlan, view, onHistoryFilterApply, autoRefresh = true,
  recordSources, arrivalGroups, historyPath, receptionControl, manualOrderActions, moveAction, settlementAction, settlementGroups = [], mutationAction = mutateOrderAction,
}: {
  manualOrderActions?: ManualOrderActions;
  settlementAction?: typeof mutateOrderAction;
  settlementGroups?: OrderSettlementGroup[];
  moveAction?: typeof mutateOrderAction;
  mutationAction?: typeof mutateOrderAction;
  receptionControl?: ReactNode;
  recordSources?: OperationRecordSources;
  arrivalGroups?: OperationArrivalGroup[];
  historyPath?: string;
  view?: OrderDashboardPageData["view"];
  onHistoryFilterApply?: (filters: import("@/lib/order-history-query").OrderHistoryFilters)=>void; autoRefresh?:boolean;
  menuSiteId: string;
  menuSiteName: string;
  orders: Order[];
  permissions: OrderDashboardPageData["permissions"];
  floorPlan: OperationsFloorPlan;
}) {
  const history=view?.kind === "history";
  const tableWorkspace = !history && !recordSources;
  const orders = useLiveOrderStatuses(serverOrders, menuSiteId, recordSources, history);
  const path = historyPath ?? `/mypage/menus/${menuSiteId}/orders`;
  const router = useRouter();
  const [refreshing, refresh] = useTransition();
  const [state, action, pending] = useActionState(
    mutationAction,
    initialOrderManagementActionState,
  );
  const [printOrders, setPrintOrders] = useState<Order[]>([]);
  const [backgroundPollingEnabled, setBackgroundPollingEnabled] =
    useState(false);
  useEffect(() => {
    if(history||!autoRefresh)return;
    const timer = window.setInterval(() => {
      if (
        shouldRefreshArrivalDashboard({
          pageVisible: document.visibilityState === "visible",
          browserNotificationsEnabled: backgroundPollingEnabled,
          mutationPending: pending,
        })
      )
        router.refresh();
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [backgroundPollingEnabled, pending, router, history, autoRefresh]);
  useEffect(() => {
    if (!printOrders.length) return;
    const clear = () => setPrintOrders([]);
    window.addEventListener("afterprint", clear, { once: true });
    const timer = window.setTimeout(() => window.print(), 0);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("afterprint", clear);
    };
  }, [printOrders]);
  function detail(order: Order) {
    const source = recordSources?.[order.id];
    const recordMenuSiteId = source?.menuSiteId ?? menuSiteId;
    const recordPermissions = recordSources ? source?.permissions : permissions;
    return (
      <ContentPanel
        as="article"
        key={order.id}
        aria-label={`주문 #${order.orderNumber}`}
      >
        <div className="site-content-heading-row">
          <div className="site-stack-copy">
            {recordSources ? <p className="type-label break-words">{source?.menuSiteName ?? "확인 불가"}</p> : null}
            <h3 className="type-content-title">
              주문 #{order.orderNumber} · {order.tableLabel}
            </h3>
            <p className="type-caption site-copy-muted">
              {formatKoreanDateTime(order.createdAt)}
            </p>
            <div className="site-action-row">
              <Badge>{STATUS_LABELS[order.status] ?? order.status}</Badge>
              <Badge>
                {PAYMENT_LABELS[order.paymentStatus] ?? order.paymentStatus}
              </Badge>
            </div>
          </div>
          <p className="type-metric">{formatAmount(order.totalAmount)}</p>
        </div>
        <OrderItems order={order} />
        {order.requestText ? (
          <p className="type-body-sm">요청사항: {order.requestText}</p>
        ) : null}
        {order.cancellationReason ? (
          <p className="type-body-sm">취소 사유: {order.cancellationReason}</p>
        ) : null}
        <button
          type="button"
          onClick={() => setPrintOrders([order])}
          className="site-button site-button-outline"
        >
          브라우저 영수증 인쇄
        </button>
        {recordPermissions?.canManage && order.nextStatus ? (
          <form
            action={action}
            className="site-stack-block site-content-divider"
          >
            <input type="hidden" name="menuSiteId" value={recordMenuSiteId} />
            <input type="hidden" name="orderId" value={order.id} />
            <input type="hidden" name="nextStatus" value={order.nextStatus} />
            {order.nextStatus !== "served" && <p className="type-label">
              다음 단계: {STATUS_LABELS[order.nextStatus]}
            </p>}
            <div className="site-action-row">
              <button
                name="intent"
                value="transition"
                disabled={pending}
                className="site-button site-button-primary"
              >
                {order.nextStatus === "served" ? "픽업·서빙 완료" : "상태 변경"}
              </button>
            </div>
          </form>
        ) : null}
        {recordPermissions?.canMarkManualPayment && order.canMarkManualPayment ? (
          <form
            action={action}
            className="site-stack-block site-content-divider"
          >
            <input type="hidden" name="menuSiteId" value={recordMenuSiteId} />
            <input type="hidden" name="orderId" value={order.id} />
            <label className="site-field-stack">
              <span className="type-label">외부 결제 완료</span>
              <select name="method" className="site-field w-full">
                <option value="manual_card">기존 카드 단말기</option>
                <option value="manual_cash">현금</option>
              </select>
            </label>
            <div className="site-action-row">
              <button
                name="intent"
                value="manual-payment"
                disabled={pending}
                className="site-button site-button-outline"
              >
                결제 완료 기록
              </button>
            </div>
          </form>
        ) : null}
        {recordPermissions?.canCancelUnpaid && order.canCancelUnpaid ? (
          <form
            action={action}
            className="site-stack-block site-content-divider"
          >
            <input type="hidden" name="menuSiteId" value={recordMenuSiteId} />
            <input type="hidden" name="orderId" value={order.id} />
            <label className="site-field-stack">
              <span className="type-label">미결제 주문 취소</span>
              <textarea
                name="reason"
                required
                maxLength={500}
                rows={2}
                placeholder="취소 사유"
                className="site-field w-full resize-none"
              />
            </label>
            <div className="site-action-row">
              <button
                name="intent"
                value="cancel"
                disabled={pending}
                className="site-button site-button-outline-danger"
              >
                주문 취소
              </button>
            </div>
          </form>
        ) : null}
      </ContentPanel>
    );
  }
  const records = orders.map(order => ({
    id: order.id,
    pointId: order.tableId,
    pointLabel: order.tableLabel,
    summary: order.items.map(item => `${item.name} × ${item.quantity}`).join(", "),
    time: formatKoreanDateTime(order.createdAt),
    status: `${STATUS_LABELS[order.status] ?? order.status} · ${PAYMENT_LABELS[order.paymentStatus] ?? order.paymentStatus}`,
    attention: isCurrentOrder(order),
    orderStatus: order.status,
    orderNumber: order.orderNumber,
    createdAt: order.createdAt,
    totalAmount: order.totalAmount,
    itemCount: order.items.reduce((count, item) => count + item.quantity, 0),
    processing: order.status !== "served" && order.status !== "cancelled",
    unpaid: order.paymentStatus === "unpaid" && order.status !== "cancelled",
  }));
  const list = (
    <OperationsHistoryViews
      listOnly
      noun="주문"
      floorPlan={floorPlan}
      records={records}
      renderList={open => (
        <OperationsHistoryTable noun="주문" floorPlan={floorPlan} records={orders} recordSources={recordSources}
          includeEmptyPoints={!history && !recordSources} renderRecord={order => (
            <>
              <TableCell>#{order.orderNumber}</TableCell>
              <TableCell><OrderItems order={order} /></TableCell>
              <TableCell>{formatKoreanDateTime(order.createdAt)}</TableCell>
              <TableCell>
                <div className="site-stack-copy">
                  <Badge>{STATUS_LABELS[order.status] ?? order.status}</Badge>
                  <Badge>{PAYMENT_LABELS[order.paymentStatus] ?? order.paymentStatus}</Badge>
                  <p>{formatAmount(order.totalAmount)}</p>
                </div>
              </TableCell>
              <TableCell>
                <Button type="button" variant="outline" size="compact" aria-label={`주문 #${order.orderNumber} 상세·처리`}
                  onClick={() => open(order.id)}>상세·처리</Button>
              </TableCell>
            </>
          )} />
      )}
      renderDetail={ids => (
        <div className="site-stack-group">
          {orders.filter(order => ids.includes(order.id)).map(detail)}
        </div>
      )}
    />
  );

  return (
    <>
      {printOrders.length > 0 && createPortal(
        <div className="hidden print:block" data-order-receipt-print>
          {printOrders.map(order => (
            <OrderReceipt key={order.id} order={order} menuSiteName={recordSources?.[order.id]?.menuSiteName ?? menuSiteName} />
          ))}
        </div>,
        document.body,
      )}
      <div className="site-stack-group print:hidden">
        <ActionFeedbackToast
          message={state.message}
          tone={state.status === "success" ? "success" : "error"}
          eventKey={state}
        />
        {!history && autoRefresh ? <OperationalArrivalAlert
          menuSiteId={menuSiteId}
          arrivalGroups={arrivalGroups}
          kind="orders"
          arrivalIds={orders
            .filter(order => isCurrentOrder(order))
            .map((order) => order.id)}
          onBackgroundPollingChange={setBackgroundPollingEnabled}
        /> : null}
        {history && view ? <OrderHistoryFilters key={JSON.stringify(view.filters)} path={path} filters={view.filters} tables={view.tables} error={view.error} onApply={onHistoryFilterApply}/> : null}
        {!tableWorkspace && <div className="site-content-heading-row">
            <div className="site-stack-title">
              <p className="type-label">
                {view?.error ? "조회 조건을 확인해 주세요." : history ? "주문 이력" : "현재 주문"} {!view?.error ? ` ${history ? (view?.totalCount ?? orders.length).toLocaleString("ko-KR") : orders.length.toLocaleString("ko-KR")}건` : ""}
              </p>
              {history?<p className="type-body-sm site-copy-muted">{`${view?.filters.from} ~ ${view?.filters.to} · 한국 시간 기준 · 현재 페이지 ${orders.length}건`}</p>:null}
            </div>
            <RefreshButton
              loading={refreshing}
              onClick={() => refresh(() => router.refresh())}
            />
        </div>}
        {state.message ? (
          <ContentPanel as="aside" surface="notice" density="compact">
            <p role="status" className="type-body-sm">
              {state.message}
            </p>
          </ContentPanel>
        ) : null}
        {!view?.error && (tableWorkspace ? (
          <OrderTableWorkspace menuSiteId={menuSiteId} floorPlan={floorPlan} records={records} orders={orders}
            permissions={permissions} receptionControl={receptionControl} mutateAction={mutationAction}
            transitionAction={action} pending={pending} onPrint={setPrintOrders} manualOrderActions={manualOrderActions} moveAction={moveAction} settlementAction={settlementAction} settlementGroups={settlementGroups}
            refreshControl={<Button variant="outline" size="compact" disabled={refreshing}
              aria-busy={refreshing} onClick={() => refresh(() => router.refresh())}>{refreshing ? "새로고침 중" : "새로고침"}</Button>} />
        ) : list)}
        {history && view && !view.error ? <div className="site-action-row" aria-label="주문 이력 페이지 이동">
          {view.newerCursor ? <Button variant="outline" asChild><Link href={orderHistoryHref(path,view.filters,{cursor:view.newerCursor,direction:"newer"})}>이전 페이지</Link></Button> : null}
          {view.olderCursor ? <Button variant="outline" asChild><Link href={orderHistoryHref(path,view.filters,{cursor:view.olderCursor,direction:"older"})}>다음 페이지</Link></Button> : null}
          {view.newerCursor || view.olderCursor ? <Button variant="outline" asChild><Link href={orderHistoryHref(path,view.filters)}>처음 페이지</Link></Button> : null}
        </div> : null}
      </div>
    </>
  );
}
