import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_MENU_ORDER_SETTINGS, mergeMenuOrderSettingsSection } from "./menu-order-settings";

test("호출 저장은 폼에 없거나 변조된 주문·코스·결제 값을 덮어쓰지 않는다", () => {
  const current = { ...DEFAULT_MENU_ORDER_SETTINGS, orderEnabled: true, mobilePrepayVisible: true, customerCheckout: "both" as const, terminalOrderEnabled: false, customerPhone: "optional" as const, orderableCourseIds: ["course-1"] };
  const result = mergeMenuOrderSettingsSection(current, { ...DEFAULT_MENU_ORDER_SETTINGS, callEnabled: true, postpayEnabled: false }, "calls");
  assert.deepEqual(result, { ...current, callEnabled: true });
  assert.equal(current.callEnabled, false);
});

test("주문 저장은 다른 창에서 바뀐 호출 사용 여부를 보존한다", () => {
  const current = { ...DEFAULT_MENU_ORDER_SETTINGS, callEnabled: true, orderableCourseIds: ["legacy-course"] };
  const result = mergeMenuOrderSettingsSection(current, { ...DEFAULT_MENU_ORDER_SETTINGS, orderEnabled: true, orderableCourseIds: ["course-2"] }, "orders");
  assert.deepEqual(result, { ...current, orderEnabled: true });
});
