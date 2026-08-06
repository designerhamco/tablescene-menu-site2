import assert from "node:assert/strict";
import test from "node:test";

const orderManagement = await import(
  new URL("./order-management.ts", import.meta.url).href
) as typeof import("./order-management");

test("order status transitions are forward-only and terminal states stay terminal", () => {
  assert.equal(orderManagement.assertOrderStatusTransition("received", "accepted"), "accepted");
  assert.equal(orderManagement.assertOrderStatusTransition("accepted", "cooking"), "cooking");
  assert.equal(orderManagement.assertOrderStatusTransition("cooking", "ready"), "ready");
  assert.equal(orderManagement.assertOrderStatusTransition("ready", "served"), "served");
  assert.throws(() => orderManagement.assertOrderStatusTransition("received", "cooking"), /\uBCC0\uACBD\uD560 \uC218/);
  assert.throws(() => orderManagement.assertOrderStatusTransition("served", "ready"), /\uBCC0\uACBD\uD560 \uC218/);
});

test("unpaid cancellation is blocked after service or payment", () => {
  assert.equal(orderManagement.canCancelUnpaidOrder("received", "unpaid"), true);
  assert.equal(orderManagement.canCancelUnpaidOrder("ready", "unpaid"), true);
  assert.equal(orderManagement.canCancelUnpaidOrder("served", "unpaid"), false);
  assert.equal(orderManagement.canCancelUnpaidOrder("received", "manual_paid"), false);
  assert.equal(orderManagement.normalizeCancellationReason("  재료 소진  "), "재료 소진");
  assert.throws(() => orderManagement.normalizeCancellationReason(" "), /1\uC790/);
});

test("manual payment accepts only external card terminal or cash", () => {
  assert.equal(orderManagement.canMarkManualPayment("served", "unpaid"), true);
  assert.equal(orderManagement.canMarkManualPayment("cancelled", "unpaid"), false);
  assert.equal(orderManagement.canMarkManualPayment("accepted", "paid"), false);
  assert.equal(orderManagement.normalizeManualPaymentMethod("manual_card"), "manual_card");
  assert.equal(orderManagement.normalizeManualPaymentMethod("manual_cash"), "manual_cash");
  assert.throws(() => orderManagement.normalizeManualPaymentMethod("pg"), /\uCE74\uB4DC \uB2E8\uB9D0\uAE30/);
});

test("order dashboard runtime is default-off and site allowlisted", async () => {
  const runtime = await import(
    new URL("./order-dashboard-runtime.ts", import.meta.url).href
  ) as typeof import("./order-dashboard-runtime");
  const siteId = "11111111-1111-4111-8111-111111111111";
  assert.equal(runtime.isOrderDashboardRuntimeEnabled(undefined), false);
  assert.equal(runtime.isOrderDashboardRuntimeEnabledForSite(siteId, {
    enabled: true,
    allowedSiteIds: new Set([siteId]),
  }), true);
  assert.equal(runtime.isOrderDashboardRuntimeEnabledForSite(siteId, {
    enabled: false,
    allowedSiteIds: new Set([siteId]),
  }), false);
});
