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
    settings: {table_order:{orderEnabled:true,callEnabled:true,postpayEnabled:true}},
    ...overrides,
  });
}

test("다이닝은 세션·운영 연결·사장님 설정이 모두 충족되면 호출과 주문을 연다", () => {
  const capabilityState = createCapabilityState({ templateKey: "dining_aube_table_a" });
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

test("베이직도 명시적으로 활성화한 테이블 주문과 호출을 지원한다", () => {
  const singlePage = createCapabilityState();

  assert.equal(singlePage.orderEnabled, true);
  assert.equal(singlePage.callEnabled, true);
});

test("다이닝의 두 기능을 매장 설정에서 각각 끌 수 있다", () => {
  const callOnly = createCapabilityState({
    templateKey: "dining_aube_table_a",
    settings: {table_order:{callEnabled:true}},
    postpayOrderRuntimeEnabled: true,
    callRuntimeEnabled: true,
  });

  assert.deepEqual(callOnly, {
    supportsExperience: true,
    orderEnabled: false,
    callEnabled: true,
  });
});

test("owner opt-in, runtime, table session and known template are all required", () => {
  for (const overrides of [{settings:{}},{settings:{table_order:{orderEnabled:"true",callEnabled:"true"}}},{postpayOrderRuntimeEnabled:false,callRuntimeEnabled:false},{templateKey:"not-a-template"}]) {
    const state=createCapabilityState(overrides);assert.equal(state.orderEnabled,false);assert.equal(state.callEnabled,false);
  }
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
