"use client";

import { useActionState } from "react";
import { Button } from "@/app/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { formatAmount } from "@/components/mypage/OrderReceipt";
import { canCancelTableOrder, canRecordTableOrderPayment } from "@/lib/order-management";
import type { OrderDashboardOrder, OrderDashboardPageData } from "@/lib/server/order-management-service";
import { initialOrderManagementActionState, type OrderManagementActionState } from "./action-state";

type Order = OrderDashboardOrder;
export type PointOrderOperation = { kind: "payment" | "cancel"; orderId: string };
export type PointOrderMutation = (previous: OrderManagementActionState, form: FormData) => Promise<OrderManagementActionState>;

export function isPointOrderOperationAllowed(order: Order | undefined, permissions: OrderDashboardPageData["permissions"], kind: PointOrderOperation["kind"]) {
  if (!order) return false;
  if (kind === "cancel") return order.canCancelUnpaid && permissions.canCancelUnpaid && canCancelTableOrder(order.status, order.paymentStatus);
  return order.canMarkManualPayment && permissions.canMarkManualPayment && canRecordTableOrderPayment(order.status, order.paymentStatus);
}

export function canPrintPointOrder(order: Pick<Order, "status">) {
  return ["cooking", "ready", "served"].includes(order.status);
}

export default function OrderPointOperationDialog({ operation, order, pointLabel, menuSiteId, permissions, mutateAction, close, onSuccess, onCloseAutoFocus }: {
  operation: PointOrderOperation;
  order: Order | undefined;
  pointLabel: string;
  menuSiteId: string;
  permissions: OrderDashboardPageData["permissions"];
  mutateAction: PointOrderMutation;
  close: () => void;
  onSuccess?: (result: OrderManagementActionState) => void;
  onCloseAutoFocus: (event: Event) => void;
}) {
  const [feedback, submit, pending] = useActionState(async (previous: OrderManagementActionState, form: FormData) => {
    try {
      const result = await mutateAction(previous, form);
      if (result.status === "success") {
        onSuccess?.(result);
        close();
      }
      return result;
    } catch {
      return { status: "error" as const, orderId: operation.orderId, message: "주문 처리를 저장하지 못했어요. 연결을 확인하고 다시 시도해 주세요." };
    }
  }, initialOrderManagementActionState);
  const payment = operation.kind === "payment";
  const allowed = isPointOrderOperationAllowed(order, permissions, operation.kind);
  return (
    <Dialog open onOpenChange={open => { if (!open && !pending) close(); }}>
      <DialogContent scrollable className="print:hidden" onCloseAutoFocus={onCloseAutoFocus}>
        <DialogHeader reserveCloseButton>
          <DialogTitle>{payment ? "결제하기" : "주문취소"}</DialogTitle>
          <DialogDescription>{pointLabel}{order && ` · 주문 #${order.orderNumber}`}</DialogDescription>
        </DialogHeader>
        <form action={submit} className="site-stack-block">
          <input type="hidden" name="source" value="table-detail" />
          <input type="hidden" name="menuSiteId" value={menuSiteId} />
          <input type="hidden" name="orderId" value={operation.orderId} />
          {order && (payment ? (
            <>
              <div className="site-action-row type-label" data-distribution="between"><span>결제 금액</span><strong>{formatAmount(order.totalAmount)}</strong></div>
              <label className="site-field-stack">
                <span className="type-label">외부에서 결제한 방법</span>
                <select name="method" className="site-field">
                  <option value="manual_card">기존 카드 단말기</option>
                  <option value="manual_cash">현금</option>
                </select>
              </label>
            </>
          ) : (
            <label className="site-field-stack">
              <span className="type-label">취소 사유</span>
              <textarea name="reason" minLength={1} maxLength={500} required rows={2} className="site-field" />
            </label>
          ))}
          {feedback.status === "error" && <p role="alert" className="type-body-sm">{feedback.message}</p>}
          {!allowed && <p role="status" className="type-body-sm">주문 상태가 바뀌었어요. 주문 내역을 확인해 주세요.</p>}
          <div className="site-action-row" data-distribution="end">
            <Button type="button" variant="outline" disabled={pending} onClick={close}>닫기</Button>
            <Button type="submit" name="intent" value={payment ? "manual-payment" : "cancel"}
              disabled={pending || !allowed} variant={payment ? "default" : "destructive"}>
              {payment ? "결제 완료 기록" : "주문취소"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
