"use client";
import Link from "next/link";
import { Button } from "@/app/components/ui/button";
import OrderHistoryFilters from "@/components/mypage/OrderHistoryFilters";
import {orderHistoryHref,isCurrentOrder} from "@/lib/order-history-query";
import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ContentPanel } from "@/app/components/ui/content-panel";
import { RefreshButton } from "@/app/components/ui/refresh-button";
import { TableCell } from "@/app/components/ui/table";
import OperationsHistoryTable from "@/components/mypage/OperationsHistoryTable";
import { Badge } from "@/app/components/ui/badge";
import OperationalArrivalAlert from "@/components/mypage/OperationalArrivalAlert";
import OperationsHistoryViews from "@/components/mypage/OperationsHistoryViews";
import ActionFeedbackToast from "@/components/ui/ActionFeedbackToast";
import { CUSTOMER_ORDER_STATUS_LABELS } from "@/lib/customer-order-history";
import { shouldRefreshArrivalDashboard } from "@/lib/dashboard-arrival-alerts";
import { formatKoreanDateTime } from "@/lib/korean-date-time";
import type { OperationsFloorPlan } from "@/lib/operations-history";
import type { OrderDashboardPageData } from "@/lib/server/order-management-service";
import { initialOrderManagementActionState } from "./action-state";
import { mutateOrderAction } from "./actions";
const STATUS_LABELS: Record<string, string> = CUSTOMER_ORDER_STATUS_LABELS;
const PAYMENT_LABELS: Record<string, string> = {
  unpaid: "미결제",
  manual_paid: "외부 결제 완료",
  paid: "PG 결제 완료",
  cancelled: "결제 취소",
  refunded: "환불 완료",
};
const formatAmount = (value: number) => `${value.toLocaleString("ko-KR")}원`;
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
function OrderReceipt({
  order,
  menuSiteName,
}: {
  order: OrderDashboardPageData["orders"][number];
  menuSiteName: string;
}) {
  return (
    <section className="mx-auto max-w-[80mm] bg-white p-6 font-mono text-black">
      <h1 className="type-content-title text-center">{menuSiteName}</h1>
      <p className="mt-1 text-center text-copy">
        주문 #{order.orderNumber} · {order.tableLabel}
      </p>
      <p className="mt-1 text-center text-support">
        {formatKoreanDateTime(order.createdAt)}
      </p>
      <div className="my-4 border-t border-dashed border-black" />
      {order.items.map((item) => (
        <div key={item.id} className="mb-3 text-copy">
          <div className="flex justify-between gap-3">
            <span>
              {item.name} × {item.quantity}
            </span>
            <span>{formatAmount(item.lineTotal)}</span>
          </div>
          {item.options.map((option) => (
            <p
              key={`${item.id}-${option.groupName}-${option.valueName}`}
              className="text-support"
            >
              + {option.groupName}: {option.valueName}
            </p>
          ))}
        </div>
      ))}
      <div className="my-4 border-t border-dashed border-black" />
      <p className="flex justify-between text-copy font-medium">
        <span>합계</span>
        <span>{formatAmount(order.totalAmount)}</span>
      </p>
      <p className="mt-3 text-support">
        주문: {STATUS_LABELS[order.status] ?? order.status} / 결제:{" "}
        {PAYMENT_LABELS[order.paymentStatus] ?? order.paymentStatus}
      </p>
      {order.requestText ? (
        <p className="mt-2 text-support">요청: {order.requestText}</p>
      ) : null}
    </section>
  );
}

export default function OrderDashboard({
  menuSiteId,
  menuSiteName,
  orders,
  permissions,
  floorPlan, view, onHistoryFilterApply, autoRefresh = true,
}: {
  view?: OrderDashboardPageData["view"];
  onHistoryFilterApply?: (filters: import("@/lib/order-history-query").OrderHistoryFilters)=>void; autoRefresh?:boolean;
  menuSiteId: string;
  menuSiteName: string;
  orders: Order[];
  permissions: OrderDashboardPageData["permissions"];
  floorPlan: OperationsFloorPlan;
}) {
  const history=view?.kind === "history";
  const router = useRouter();
  const [refreshing, refresh] = useTransition();
  const [state, action, pending] = useActionState(
    mutateOrderAction,
    initialOrderManagementActionState,
  );
  const [printOrderId, setPrintOrderId] = useState<string | null>(null);
  const [backgroundPollingEnabled, setBackgroundPollingEnabled] =
    useState(false);
  const printOrder = orders.find((order) => order.id === printOrderId) ?? null;
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
    if (!printOrder) return;
    const clear = () => setPrintOrderId(null);
    window.addEventListener("afterprint", clear, { once: true });
    const timer = window.setTimeout(() => window.print(), 0);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("afterprint", clear);
    };
  }, [printOrder]);
  function detail(order: Order) {
    return (
      <ContentPanel
        as="article"
        key={order.id}
        aria-label={`주문 #${order.orderNumber}`}
      >
        <div className="site-content-heading-row">
          <div className="site-stack-copy">
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
          onClick={() => setPrintOrderId(order.id)}
          className="site-button site-button-outline"
        >
          브라우저 영수증 인쇄
        </button>
        {permissions.canManage && order.nextStatus ? (
          <form
            action={action}
            className="site-stack-block site-content-divider"
          >
            <input type="hidden" name="menuSiteId" value={menuSiteId} />
            <input type="hidden" name="orderId" value={order.id} />
            <input type="hidden" name="nextStatus" value={order.nextStatus} />
            <p className="type-label">
              다음 단계: {STATUS_LABELS[order.nextStatus]}
            </p>
            <div className="site-action-row">
              <button
                name="intent"
                value="transition"
                disabled={pending}
                className="site-button site-button-primary"
              >
                상태 변경
              </button>
            </div>
          </form>
        ) : null}
        {permissions.canMarkManualPayment && order.canMarkManualPayment ? (
          <form
            action={action}
            className="site-stack-block site-content-divider"
          >
            <input type="hidden" name="menuSiteId" value={menuSiteId} />
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
        {permissions.canCancelUnpaid && order.canCancelUnpaid ? (
          <form
            action={action}
            className="site-stack-block site-content-divider"
          >
            <input type="hidden" name="menuSiteId" value={menuSiteId} />
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
  return (
    <>
      {printOrder ? (
        <div className="hidden print:block">
          <OrderReceipt order={printOrder} menuSiteName={menuSiteName} />
        </div>
      ) : null}
      <div className="site-stack-group print:hidden">
        <ActionFeedbackToast
          message={state.message}
          tone={state.status === "success" ? "success" : "error"}
          eventKey={state}
        />
        {!history && autoRefresh ? <OperationalArrivalAlert
          menuSiteId={menuSiteId}
          kind="orders"
          arrivalIds={orders
            .filter((order) => order.status !== "cancelled")
            .map((order) => order.id)}
          onBackgroundPollingChange={setBackgroundPollingEnabled}
        /> : null}
        {history && view ? <OrderHistoryFilters key={JSON.stringify(view.filters)} path={`/mypage/menus/${menuSiteId}/orders`} filters={view.filters} tables={view.tables} error={view.error} onApply={onHistoryFilterApply}/> : null}
        <div className="site-content-heading-row">
            <div className="site-stack-title">
              <p className="type-label">
                {view?.error ? "조회 조건을 확인해 주세요." : history ? "주문 이력" : "현재 주문"} {!view?.error ? ` ${history ? (view?.totalCount ?? orders.length).toLocaleString("ko-KR") : orders.length.toLocaleString("ko-KR")}건` : ""}
              </p>
              <p className="type-body-sm site-copy-muted">
                {history ? `${view?.filters.from} ~ ${view?.filters.to} · 한국 시간 기준 · 현재 페이지 ${orders.length}건` : "진행 중·미결제 주문을 날짜와 관계없이 15초마다 갱신합니다."}
              </p>
            </div>
            <RefreshButton
              loading={refreshing}
              onClick={() => refresh(() => router.refresh())}
            />
        </div>
        {state.message ? (
          <ContentPanel as="aside" surface="notice" density="compact">
            <p role="status" className="type-body-sm">
              {state.message}
            </p>
          </ContentPanel>
        ) : null}
        {!view?.error ? <OperationsHistoryViews
          listOnly={history}
          noun="주문"
          floorPlan={floorPlan}
          records={orders.map((order) => ({
            id: order.id,
            pointId: order.tableId,
            pointLabel: order.tableLabel,
            summary: order.items
              .map((item) => `${item.name} × ${item.quantity}`)
              .join(", "),
            options: order.items
              .flatMap((item) =>
                item.options.map(
                  (option) => `${option.groupName}: ${option.valueName}`,
                ),
              )
              .join(" · "),
            time: formatKoreanDateTime(order.createdAt),
            status: `${STATUS_LABELS[order.status] ?? order.status} · ${PAYMENT_LABELS[order.paymentStatus] ?? order.paymentStatus}`,
            attention:
              isCurrentOrder(order),
            orderStatusLabel: STATUS_LABELS[order.status] ?? order.status,
            paymentStatusLabel: PAYMENT_LABELS[order.paymentStatus] ?? order.paymentStatus,
            orderNumber: order.orderNumber,
            createdAt: order.createdAt,
            amount: formatAmount(order.totalAmount),
            processing: order.status !== "served" && order.status !== "cancelled",
            unpaid: order.paymentStatus === "unpaid" && order.status !== "cancelled",
          }))}
          renderList={(open) => <OperationsHistoryTable noun="주문" floorPlan={floorPlan} records={orders} includeEmptyPoints={!history} renderRecord={order => <>
                        <TableCell>#{order.orderNumber}</TableCell>
                        <TableCell>
                          <OrderItems order={order} />
                        </TableCell>
                        <TableCell>
                          {formatKoreanDateTime(order.createdAt)}
                        </TableCell>
                        <TableCell>
                          <div className="site-stack-copy">
                            <Badge>
                              {STATUS_LABELS[order.status] ?? order.status}
                            </Badge>
                            <Badge>
                              {PAYMENT_LABELS[order.paymentStatus] ??
                                order.paymentStatus}
                            </Badge>
                            <p>{formatAmount(order.totalAmount)}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <button
                            type="button"
                            className="site-button site-button-outline site-button-compact"
                            aria-label={`주문 #${order.orderNumber} 상세·처리`}
                            onClick={() => open(order.id)}
                          >
                            상세·처리
                          </button>
                        </TableCell>
          </>} />}
          renderDetail={(ids) => (
            <div className="site-stack-group">
              {orders.filter((order) => ids.includes(order.id)).map(detail)}
            </div>
          )}
        /> : null}
        {history && view && !view.error ? <div className="site-action-row" aria-label="주문 이력 페이지 이동">
          {view.newerCursor ? <Button variant="outline" asChild><Link href={orderHistoryHref(`/mypage/menus/${menuSiteId}/orders`,view.filters,{cursor:view.newerCursor,direction:"newer"})}>이전 페이지</Link></Button> : null}
          {view.olderCursor ? <Button variant="outline" asChild><Link href={orderHistoryHref(`/mypage/menus/${menuSiteId}/orders`,view.filters,{cursor:view.olderCursor,direction:"older"})}>다음 페이지</Link></Button> : null}
          {view.newerCursor || view.olderCursor ? <Button variant="outline" asChild><Link href={orderHistoryHref(`/mypage/menus/${menuSiteId}/orders`,view.filters)}>처음 페이지</Link></Button> : null}
        </div> : null}
      </div>
    </>
  );
}
