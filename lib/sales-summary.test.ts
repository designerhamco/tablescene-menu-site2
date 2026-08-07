import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const salesSummary = await import(
  new URL("./sales-summary.ts", import.meta.url).href
) as typeof import("./sales-summary");

test("KST month boundaries are converted to UTC exactly", () => {
  const window = salesSummary.getKstMonthWindow(new Date("2026-08-15T12:00:00.000Z"));
  assert.equal(window.startIso, "2026-07-31T15:00:00.000Z");
  assert.equal(window.endIso, "2026-08-31T15:00:00.000Z");
  assert.equal(window.daysInMonth, 31);
});

test("daily and monthly totals use KST dates and completed-payment timestamps", () => {
  const summary = salesSummary.buildSalesMonthSummary({
    now: new Date("2026-08-07T02:00:00.000Z"),
    createdOrders: [
      { id: "one", occurredAt: "2026-08-06T14:59:59.000Z", totalAmount: 12000, status: "cancelled", paymentStatus: "unpaid", paymentMethod: null },
      { id: "two", occurredAt: "2026-08-06T15:00:00.000Z", totalAmount: 8000, status: "served", paymentStatus: "manual_paid", paymentMethod: "manual_card" },
      { id: "three", occurredAt: "2026-08-07T01:00:00.000Z", totalAmount: 5000, status: "received", paymentStatus: "paid", paymentMethod: "pg" },
    ],
    paidOrders: [
      { id: "two", occurredAt: "2026-08-06T15:00:00.000Z", totalAmount: 8000, status: "served", paymentStatus: "manual_paid", paymentMethod: "manual_card" },
      { id: "three", occurredAt: "2026-08-07T01:30:00.000Z", totalAmount: 5000, status: "received", paymentStatus: "paid", paymentMethod: "pg" },
    ],
    paidOrderItems: [
      { orderId: "two", name: "아메리카노", quantity: 2, lineTotal: 6000 },
      { orderId: "three", name: "아메리카노", quantity: 1, lineTotal: 3000 },
      { orderId: "three", name: "라테", quantity: 1, lineTotal: 5000 },
      { orderId: "not-paid", name: "제외", quantity: 100, lineTotal: 100000 },
    ],
  });

  assert.deepEqual(summary.today, {
    date: "2026-08-07",
    orderCount: 2,
    paidOrderCount: 2,
    collectedAmount: 13000,
  });
  assert.deepEqual(summary.monthTotals, {
    orderCount: 3,
    paidOrderCount: 2,
    collectedAmount: 13000,
  });
  assert.equal(summary.days[5]?.orderCount, 1);
  assert.deepEqual(summary.paymentMethods, [
    { method: "manual_card", orderCount: 1, collectedAmount: 8000 },
    { method: "pg", orderCount: 1, collectedAmount: 5000 },
  ]);
  assert.deepEqual(summary.orderStates, {
    cancelledOrderCount: 1,
    cancelledOrderAmount: 12000,
    unpaidOrderCount: 0,
    unpaidOrderAmount: 0,
  });
  assert.deepEqual(summary.topItems[0], { name: "아메리카노", quantity: 3, collectedAmount: 9000 });
});

test("invalid and negative payment amounts are excluded without hiding order counts", () => {
  const summary = salesSummary.buildSalesMonthSummary({
    now: new Date("2026-08-07T02:00:00.000Z"),
    createdOrders: [{ id: "one", occurredAt: "2026-08-07T00:00:00.000Z", totalAmount: -1, status: "received", paymentStatus: "unpaid", paymentMethod: null }],
    paidOrders: [
      { id: "one", occurredAt: "2026-08-07T00:00:00.000Z", totalAmount: -1, status: "received", paymentStatus: "paid", paymentMethod: "pg" },
      { id: "two", occurredAt: "invalid", totalAmount: 1000, status: "received", paymentStatus: "paid", paymentMethod: "pg" },
    ],
  });
  assert.equal(summary.today.orderCount, 1);
  assert.equal(summary.today.paidOrderCount, 0);
  assert.equal(summary.today.collectedAmount, 0);
  assert.deepEqual(summary.paymentMethods, []);
});

test("sales data access reauthorizes before using the server-only client", async () => {
  const service = await readFile(
    new URL("./server/sales-summary-service.ts", import.meta.url),
    "utf8",
  );
  const functionBody = service.slice(service.indexOf("export async function getSalesSummaryDashboard"));
  assert.ok(functionBody.indexOf("requireMenuSitePermission(menuSiteId, \"sales.read\")") >= 0);
  assert.ok(functionBody.indexOf("requireMenuSitePermission(menuSiteId, \"sales.read\")") < functionBody.indexOf("createAdminClient()"));
  assert.match(functionBody, /\.eq\("menu_site_id", menuSiteId\)/);
  assert.match(functionBody, /\.in\("payment_status", \["manual_paid", "paid"\]\)/);
});
