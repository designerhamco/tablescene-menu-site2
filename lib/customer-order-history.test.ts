import assert from "node:assert/strict";
import test from "node:test";
import { canCustomerCancelOrder, getCustomerPaymentLabel, parsePreviewOrderHistory } from "./customer-order-history";

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
