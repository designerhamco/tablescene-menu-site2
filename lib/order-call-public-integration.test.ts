import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPublicOrderCallEntryConfig,
  getOrderCallEntryVisibility,
  getPublicOrderCallCapabilityState,
} from "../components/public-menu/order-call/types";
import { assertStaffCallTransition, getNextStaffCallStatus } from "./call-management";
import {
  assertOrderStatusTransition,
  canMarkManualPayment,
  getNextOrderStatus,
} from "./order-management";
import { parsePostpayOrderPayload } from "./postpay-order-payload";

const MENU_SITE_ID = "11111111-1111-4111-8111-111111111111";
const SESSION_ID = "22222222-2222-4222-8222-222222222222";
const REQUEST_ID = "33333333-3333-4333-8333-333333333333";
const ITEM_ID = "44444444-4444-4444-8444-444444444444";
const OPTION_ID = "55555555-5555-4555-8555-555555555555";

function createCapabilityState(overrides: Partial<Parameters<typeof getPublicOrderCallCapabilityState>[0]> = {}) {
  return getPublicOrderCallCapabilityState({
    templateKey: "cafe_design_a",
    planType: "business_basic",
    hasValidTableSession: true,
    postpayOrderRuntimeEnabled: true,
    callRuntimeEnabled: true,
    ...overrides,
  });
}

test("public Order and Call become interactive only after every shared gate passes", () => {
  const capabilityState = createCapabilityState();
  const config = buildPublicOrderCallEntryConfig({
    capabilityState,
    menuSiteId: MENU_SITE_ID,
    storeName: "AUBE COFFEE",
    tableSession: { id: SESSION_ID, tableLabel: "TABLE 3" },
    cartScope: "visit-session-scope",
    orderCatalog: [],
  });

  assert.ok(config);
  assert.deepEqual(getOrderCallEntryVisibility(config), {
    showHeader: true,
    showLanguage: true,
    showTableLabel: true,
    showCall: true,
    showCart: true,
  });
});

test("missing session, non-business access, and Display templates fail closed before catalog UI", () => {
  assert.deepEqual(createCapabilityState({ hasValidTableSession: false }), {
    supportsExperience: true,
    orderEnabled: false,
    callEnabled: false,
  });
  assert.deepEqual(createCapabilityState({ planType: "personal_trial" }), {
    supportsExperience: true,
    orderEnabled: false,
    callEnabled: false,
  });

  const displayState = createCapabilityState({ templateKey: "display_menu_a" });
  assert.deepEqual(displayState, {
    supportsExperience: false,
    orderEnabled: false,
    callEnabled: false,
  });
  assert.equal(buildPublicOrderCallEntryConfig({
    capabilityState: displayState,
    menuSiteId: MENU_SITE_ID,
    storeName: "SUMMER BLUE",
    tableSession: { id: SESSION_ID, tableLabel: "DISPLAY" },
    cartScope: "should-not-render",
    orderCatalog: [],
  }), undefined);
});

test("Order-only and Call-only entitlements remain independent after shared session validation", () => {
  const orderOnly = createCapabilityState({ callRuntimeEnabled: false });
  const callOnly = createCapabilityState({ postpayOrderRuntimeEnabled: false });

  assert.equal(orderOnly.orderEnabled, true);
  assert.equal(orderOnly.callEnabled, false);
  assert.equal(callOnly.orderEnabled, false);
  assert.equal(callOnly.callEnabled, true);
});

test("one local table visit can submit a bounded order and complete both staff workflows", () => {
  const order = parsePostpayOrderPayload({
    menuSiteId: MENU_SITE_ID,
    clientRequestId: REQUEST_ID,
    requestText: "  냅킨 부탁드립니다.  ",
    lines: [{ menuItemId: ITEM_ID, quantity: 2, optionValueIds: [OPTION_ID] }],
  });
  assert.equal(order.requestText, "냅킨 부탁드립니다.");
  assert.equal(order.lines[0]?.quantity, 2);

  let orderStatus: unknown = "received";
  for (const next of ["accepted", "cooking", "ready", "served"] as const) {
    assert.equal(getNextOrderStatus(orderStatus), next);
    orderStatus = assertOrderStatusTransition(orderStatus, next);
  }
  assert.equal(getNextOrderStatus(orderStatus), null);
  assert.equal(canMarkManualPayment(orderStatus, "unpaid"), true);

  assert.equal(getNextStaffCallStatus("pending"), "acknowledged");
  const acknowledged = assertStaffCallTransition("pending", "acknowledged");
  assert.equal(assertStaffCallTransition(acknowledged, "completed"), "completed");
  assert.equal(getNextStaffCallStatus("completed"), null);
  assert.equal(getNextStaffCallStatus("cancelled"), null);
});
