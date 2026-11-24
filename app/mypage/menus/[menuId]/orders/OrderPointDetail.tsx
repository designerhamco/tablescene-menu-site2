"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Checkbox } from "@/app/components/ui/checkbox";
import { DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { MessageCircle, PrinterFill } from "@/app/components/ui/site-icon";
import OrderCookingFlag from "@/components/mypage/OrderCookingFlag";
import OrderStage from "@/components/mypage/OrderStage";
import { formatAmount, PAYMENT_LABELS } from "@/components/mypage/OrderReceipt";
import { getKitchenOptionLabels } from "@/lib/kitchen-order";
import { formatElapsedMinutes, formatKoreanClockTime, formatKoreanDateTime } from "@/lib/korean-date-time";
import type { OrderDashboardOrder, OrderDashboardPageData } from "@/lib/server/order-management-service";
import { initialOrderManagementActionState, type OrderManagementActionState } from "./action-state";
import OrderPointOperationDialog, { canPrintPointOrder, isPointOrderOperationAllowed, type PointOrderOperation, type PointOrderMutation } from "./OrderPointOperationDialog";
import styles from "./OrderPointDetail.module.css";

type Order = OrderDashboardOrder;

function OrderTimes({ order, now }: { order: Order; now: number | null }) {
  const clock = formatKoreanClockTime(order.createdAt);
  const elapsed = order.status === "served" || order.status === "cancelled" ? null : formatElapsedMinutes(order.createdAt, now);
  return (
    <p className="type-body-sm">
      주문시각{" "}{clock
        ? <time dateTime={order.createdAt} title={formatKoreanDateTime(order.createdAt)}>{clock}</time>
        : "–"}
      {elapsed && <span className="site-copy-muted"> · 주문 후 {elapsed}</span>}
    </p>
  );
}

function PointOrderItems({ order }: { order: Order }) {
  return (
    <ul className="site-stack-detail">
      {order.items.map(item => {
        const options = getKitchenOptionLabels(item.options);
        const trackCooking = ["cooking", "ready", "served"].includes(order.status);
        const done = order.status === "ready" || order.status === "served" || item.cookingDone === true;
        return (
          <li key={item.id} className="site-stack-detail">
            <div className={`${styles.itemLine} type-body-sm`}>
              <div className={styles.itemDescription}>
                <span className="min-w-0 break-words">
                  {item.name}{item.priceNote ? ` (${item.priceNote})` : ""} × {item.quantity}
                </span>
                {trackCooking && <span role="img" aria-label={done ? "조리 완료" : "조리 미완성"} className={styles.flagSlot}>
                  <OrderCookingFlag done={done} />
                </span>}
              </div>
              <span className={styles.amount}>{formatAmount(item.lineTotal)}</span>
            </div>
            {options.product && <p className="type-caption site-copy-muted break-words">상품옵션 · {options.product}</p>}
            {options.price && <p className="type-caption site-copy-muted break-words">가격옵션 · {options.price}</p>}
          </li>
        );
      })}
    </ul>
  );
}

export default function OrderPointDetail({ pointLabel, menuSiteId, orders, permissions, onPrint, mutateAction }: {
  pointLabel: string;
  menuSiteId: string;
  orders: Order[];
  permissions: OrderDashboardPageData["permissions"];
  onPrint: (orders: Order[]) => void;
  mutateAction: PointOrderMutation;
}) {
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string> | null>(null);
  const [operation, setOperation] = useState<PointOrderOperation | null>(null);
  const [completedOperation, setCompletedOperation] = useState<OrderManagementActionState>();
  const [now, setNow] = useState<number | null>(null);
  const operationTrigger = useRef<HTMLButtonElement | null>(null);
  const header = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setNow(Date.now()));
    const tick = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearInterval(tick);
    };
  }, []);

  const [pickupFeedback, submit, pending] = useActionState(async (previous: OrderManagementActionState, form: FormData): Promise<OrderManagementActionState> => {
    try {
      setCompletedOperation(undefined);
      return await mutateAction(previous, form);
    } catch {
      return { status: "error", orderId: String(form.get("orderId") ?? ""), message: "주문 처리를 저장하지 못했어요. 연결을 확인하고 다시 시도해 주세요." };
    }
  }, initialOrderManagementActionState);

  const feedback = completedOperation ?? pickupFeedback;
  const ordered = [...orders].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || b.orderNumber - a.orderNumber);
  const lead = ordered.find(order => order.status !== "served" && order.status !== "cancelled") ?? ordered[0];
  const selected = ordered.filter(order => selectedIds === null || selectedIds.has(order.id));
  const allSelected = ordered.length > 0 && selected.length === ordered.length;
  const selectedOrder = selected.length === 1 ? selected[0] : undefined;
  const activeOrder = operation ? ordered.find(order => order.id === operation.orderId) : undefined;
  const total = selected.reduce((amount, order) => amount + order.totalAmount, 0);

  const canCancel = isPointOrderOperationAllowed(selectedOrder, permissions, "cancel");
  const canPay = isPointOrderOperationAllowed(selectedOrder, permissions, "payment");

  function selectOrder(id: string, checked: boolean) {
    setSelectedIds(previous => {
      const next = new Set(previous ?? ordered.map(order => order.id));
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  return (
    <>
      <div className={styles.layout}>
        <header className="site-stack-copy">
          <DialogHeader reserveCloseButton className="text-left">
            <div className="site-stack-detail">
              {lead && <p className="type-caption site-copy-muted">주문번호 #{lead.orderNumber}</p>}
              <div className="site-action-row">
                <DialogTitle ref={header} tabIndex={-1}>{pointLabel} 주문 내역</DialogTitle>
                {lead && <span className="type-label"><OrderStage status={lead.status} /></span>}
              </div>
            </div>
          </DialogHeader>
          {ordered.length > 0 && (
            <div className="site-action-row" data-distribution="between">
              <p className="type-label">주문 총 {ordered.length}건</p>
              <label className="site-action-row type-label" data-wrap="nowrap">
                <Checkbox shape="circle" disabled={pending} checked={allSelected || (selected.length > 0 ? "indeterminate" : false)}
                  onCheckedChange={() => setSelectedIds(allSelected ? new Set() : null)} />
                전체선택
              </label>
            </div>
          )}
        </header>
        {!ordered.length ? (
          <div className="site-stack-copy">
            {feedback.message && <p role="status" className="type-body-sm">{feedback.message}</p>}
            <p className="type-body-sm site-copy-muted">현재 조건에 맞는 내역이 없습니다.</p>
          </div>
        ) : (
          <>
            <div className={styles.orders} role="region" aria-label="주문 목록" tabIndex={0}>
              {ordered.map(order => (
                <article key={order.id} className={styles.order} aria-label={`주문 #${order.orderNumber}`}>
                  <div className="site-action-row" data-distribution="between">
                    <div className="site-action-row">
                      <Checkbox shape="circle" aria-label={`주문 #${order.orderNumber} 선택`} disabled={pending}
                        checked={selectedIds === null || selectedIds.has(order.id)}
                        onCheckedChange={checked => selectOrder(order.id, checked === true)} />
                      <h3 className="type-label">#{order.orderNumber}</h3>
                      <span className="type-label"><OrderStage status={order.status} /></span>
                      <span className="type-caption site-copy-muted">{PAYMENT_LABELS[order.paymentStatus] ?? order.paymentStatus}</span>
                    </div>
                    <div className="site-action-row" data-wrap="nowrap">
                      <Button type="button" variant="ghost" size="icon" iconSize="compact"
                        disabled={!canPrintPointOrder(order) || pending} aria-label={`주문 #${order.orderNumber} 청구서 인쇄`}
                        title={canPrintPointOrder(order) ? "청구서 인쇄" : "조리 시작 후 인쇄할 수 있습니다."} onClick={() => onPrint([order])}><PrinterFill /></Button>
                      {(order.status === "ready" || order.status === "served") && (
                        <Button type="button" variant="outline" size="compact" disabled title="알림톡 연동 준비 중"><MessageCircle /> 알림톡</Button>
                      )}
                    </div>
                  </div>
                  <OrderTimes order={order} now={now} />
                  <p className="type-caption site-copy-muted">주문내역 ({order.items.length}개)</p>
                  <PointOrderItems order={order} />
                  {order.cancellationReason && <p className="type-body-sm break-words">취소 사유 · {order.cancellationReason}</p>}
                  <div className="site-action-row type-label" data-distribution="between">
                    <span>합계</span><strong className={styles.amount}>{formatAmount(order.totalAmount)}</strong>
                  </div>
                  {permissions.canManage && order.nextStatus === "served" && (
                    <form action={submit} className="site-action-row" data-distribution="end">
                      <input type="hidden" name="menuSiteId" value={menuSiteId} />
                      <input type="hidden" name="orderId" value={order.id} />
                      <input type="hidden" name="nextStatus" value="served" />
                      <Button type="submit" name="intent" value="transition" size="compact" disabled={pending}>
                        픽업·서빙 완료
                      </Button>
                    </form>
                  )}
                </article>
              ))}
            </div>
            <footer className={styles.footer}>
              <div className="site-action-row type-label" data-distribution="between" aria-live="polite">
                <span>총 합계 <span className="type-caption site-copy-muted">({selected.length}건 선택)</span></span>
                <strong className={styles.amount}>{formatAmount(total)}</strong>
              </div>
              {feedback.message && !operation && <p role="status" className="type-body-sm">{feedback.message}</p>}
              <div className="site-action-row" data-distribution="end">
                {permissions.canMarkManualPayment && ordered.some(order => order.paymentStatus === "unpaid") && (
                  <Button type="button" variant="secondary" disabled={pending || !canPay}
                    title={canPay ? undefined : "픽업·서빙이 끝난 미결제 주문 한 건을 선택해 주세요."}
                    onClick={event => {
                      if (!selectedOrder) return;
                      operationTrigger.current = event.currentTarget;
                      setOperation({ kind: "payment", orderId: selectedOrder.id });
                    }}>결제하기</Button>
                )}
                {permissions.canCancelUnpaid && (
                  <Button type="button" variant="outline-danger" disabled={pending || !canCancel}
                    title={canCancel ? undefined : "조리전 상태의 미결제 주문 한 건을 선택해 주세요."}
                    onClick={event => {
                      if (!selectedOrder) return;
                      operationTrigger.current = event.currentTarget;
                      setOperation({ kind: "cancel", orderId: selectedOrder.id });
                    }}>주문취소</Button>
                )}
                <Button type="button" variant="outline" disabled={pending || !selected.length || !selected.every(canPrintPointOrder)}
                  title="조리가 시작된 주문만 인쇄할 수 있습니다." onClick={() => onPrint(selected)}><PrinterFill /> 청구서 인쇄</Button>
              </div>
            </footer>
          </>
        )}
      </div>
      {operation && (
        <OrderPointOperationDialog key={operation.orderId} operation={operation} order={activeOrder}
          pointLabel={pointLabel} menuSiteId={menuSiteId} permissions={permissions} mutateAction={mutateAction}
          close={() => setOperation(null)} onSuccess={setCompletedOperation} onCloseAutoFocus={event => {
            event.preventDefault();
            const trigger = operationTrigger.current;
            if (trigger?.isConnected && !trigger.disabled) trigger.focus();
            else header.current?.focus();
          }} />
      )}
    </>
  );
}
