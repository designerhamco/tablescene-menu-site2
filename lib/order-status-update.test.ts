import assert from "node:assert/strict";
import { test } from "node:test";
import { applyOrderStatusUpdate, readOrderStatusUpdate } from "./order-status-update";
import type { OrderDashboardOrder } from "./server/order-management-service";

const cookingOrder: OrderDashboardOrder = {
  id: "order", tableId: "table", orderNumber: 101, tableLabel: "테이블 1",
  status: "cooking", nextStatus: null, paymentStatus: "unpaid", paymentMethod: null,
  requestText: null, totalAmount: 0, currency: "KRW", createdAt: "2026-11-24T00:00:00.123456+00:00",
  updatedAt: "2026-11-24T00:00:01.123456+00:00", statusUpdatedBy: null,
  paymentCompletedBy: null, paymentCompletedAt: null, cancellationReason: null,
  canCancelUnpaid: true, canMarkManualPayment: true, items: [],
};

test("조리완료 이벤트만으로 열린 주문의 픽업·서빙 액션을 표시하고 오래된 이벤트는 무시한다", () => {
  const update = readOrderStatusUpdate({
    menuSiteId: "menu",
    orderUpdate: { orderId: "order", status: "ready", updatedAt: "2026-11-24T00:00:01.123457+00:00" },
  });
  assert.ok(update);
  const ready = applyOrderStatusUpdate(cookingOrder, update);
  assert.equal(ready.status, "ready");
  assert.equal(ready.nextStatus, "served");
  assert.strictEqual(applyOrderStatusUpdate(ready, update), ready);
  assert.strictEqual(applyOrderStatusUpdate(ready, { ...update, status: "cooking", updatedAt: cookingOrder.updatedAt }), ready);
  const served = applyOrderStatusUpdate(ready, { ...update, status: "served", updatedAt: "2026-11-24T09:00:02.123456+09:00" });
  assert.equal(served.status, "served");
  assert.equal(served.nextStatus, null);
  assert.equal(served.canCancelUnpaid, false);
});

test("이전 알림 형식, 메뉴 체크 알림, 잘못된 상태는 주문 행 변경에 사용하지 않는다", () => {
  assert.equal(readOrderStatusUpdate({ menuSiteId: "menu" }), null);
  assert.equal(readOrderStatusUpdate({ menuSiteId: "menu", itemProgress: true }), null);
  assert.equal(readOrderStatusUpdate({ menuSiteId: "menu", orderUpdate: { status: "wrong" } }), null);
});

test("결합 주문에 픽업·서빙 완료 이벤트가 와도 개별 결제는 열리지 않는다", () => {
  const order = { ...cookingOrder, settlementGroupId: "group", canMarkManualPayment: false };
  const served = applyOrderStatusUpdate(order, {
    menuSiteId: "menu", orderId: order.id, status: "served", updatedAt: "2026-11-24T00:00:05+00:00",
  });
  assert.equal(served.status, "served");
  assert.equal(served.canMarkManualPayment, false);
});
