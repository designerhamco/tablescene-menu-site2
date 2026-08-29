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

test("멀티페이지 스마트호출은 사업자 테이블 세션과 runtime gate를 모두 통과해야 열린다", () => {
  const capabilityState = createCapabilityState({ templateKey: "cafe_brew_chapter_a" });
  const config = buildPublicOrderCallEntryConfig({
    capabilityState,
    menuSiteId: MENU_SITE_ID,
    storeName: "AUBE COFFEE",
    tableSession: { id: SESSION_ID, tableLabel: "TABLE 3" },
    cartScope: "visit-session-scope",
    orderCatalog: [],
    callItems: [{ key: "water", label: "물 요청", sortOrder: 0, active: true }],
  });

  assert.ok(config);
  assert.deepEqual(config.callItems, [{ key: "water", label: "물 요청", sortOrder: 0, active: true }]);
  assert.deepEqual(getOrderCallEntryVisibility(config), {
    showHeader: true,
    showLanguage: true,
    showTableLabel: true,
    showCall: true,
    showCart: false,
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

test("단일페이지는 runtime 환경값과 무관하게 Order와 스마트호출을 닫는다", () => {
  const singlePage = createCapabilityState();

  assert.equal(singlePage.orderEnabled, false);
  assert.equal(singlePage.callEnabled, false);
});

test("멀티페이지 다이닝은 Order runtime이 켜져 있어도 스마트호출만 사용할 수 있다", () => {
  const callOnly = createCapabilityState({
    templateKey: "cafe_brew_chapter_a",
    postpayOrderRuntimeEnabled: true,
    callRuntimeEnabled: true,
  });

  assert.deepEqual(callOnly, {
    supportsExperience: true,
    orderEnabled: false,
    callEnabled: true,
  });
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
