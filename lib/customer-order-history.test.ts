import assert from "node:assert/strict";
import test from "node:test";
import { canCustomerCancelOrder, getCustomerPaymentLabel, parsePreviewOrderHistory, parseCustomerOrderHistory } from "./customer-order-history";

test("customers can cancel only unpaid received orders; staff privileges are not inherited", () => {
  for (const status of ["received", "accepted", "cooking", "ready", "served", "cancelled", "unknown"]) {
    for (const payment of ["unpaid", "paid", "manual_paid", "refunded", undefined]) {
      assert.equal(canCustomerCancelOrder(status, payment), status === "received" && payment === "unpaid");
    }
  }
});
test("payment presentation distinguishes unpaid, collected and unknown values", () => {
  assert.equal(getCustomerPaymentLabel("unpaid"), "결제 전");
  assert.equal(getCustomerPaymentLabel("manual_paid"), "결제 완료");
  assert.equal(getCustomerPaymentLabel("paid"), "결제 완료");
  assert.equal(getCustomerPaymentLabel("unexpected"), "결제 상태 확인 필요");
});
test("stale or corrupted preview storage cannot break the history screen", () => {
  const valid = { id: "preview1", orderNumber: 1, tableLabel: "Table 1", createdAt: "2026-10-20T03:00:00Z", status: "received", paymentStatus: "unpaid", totalAmount: 1000,
    lines: [{ name: "메뉴", quantity: 1, unitPrice: 1000, options: [] }] };
  assert.deepEqual(parsePreviewOrderHistory("bad json"), []);
  assert.deepEqual(parsePreviewOrderHistory('{"orders":[]}'), []);
  assert.deepEqual(parsePreviewOrderHistory(JSON.stringify([null, valid, {...valid, status: "toString"}, {...valid, createdAt: "bad"}, {...valid, lines: [null]}])), [valid]);
});

test("live history rejects corrupt or duplicate orders and strips private fields", () => {
  const order = {id: "11111111-1111-4111-8111-111111111111", orderNumber: 12, tableLabel: "테이블 1", createdAt: "2026-10-22T03:00:00Z", status: "received", paymentStatus: "unpaid", totalAmount: 11000,
    lines: [{name: "주문 당시 상품명", quantity: 2, unitPrice: 5500, options: ["온도: ICE"], privateOptionKey: "secret"}], ownerId: "private"};
  const result = parseCustomerOrderHistory({orders: [order], hasMore: false});
  assert.equal(result.orders[0].lines[0].name, "주문 당시 상품명");
  assert.equal("ownerId" in result.orders[0], false);
  assert.equal("privateOptionKey" in result.orders[0].lines[0], false);
  for (const value of [null, {orders: [order]}, {orders: [order, order], hasMore: false}, {orders: [{...order, example: true}], hasMore: false}, {orders: [{...order, status: "toString"}], hasMore: false}, {orders: [{...order, id: "-".repeat(36)}], hasMore: false}]) assert.throws(() => parseCustomerOrderHistory(value));
});
