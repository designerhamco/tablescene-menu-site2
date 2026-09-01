import assert from "node:assert/strict";
import test from "node:test";

import {
  getStoreOperationAccess,
  hasAvailableStoreOperation,
  isCurrentPickupQueueOperationsSite,
  isCurrentSmartCallOperationsSite,
  isStoreOperationsTemplate,
} from "./operations-dashboard";

test("멀티페이지 Dining만 스마트호출 매장 운영에 포함한다", () => {
  assert.equal(isStoreOperationsTemplate("cafe_design_a"), false);
  assert.equal(isStoreOperationsTemplate("dining_aube_table_a"), true);
  assert.equal(isStoreOperationsTemplate("dining_aube_table_b"), true);
  assert.equal(isStoreOperationsTemplate("display_menu_a"), false);
});

test("owner and manager operation access follows runtime gates", () => {
  const ownerAccess = getStoreOperationAccess({
    accessRole: "owner",
    templateKey: "dining_aube_table_a",
    tableManagementEnabled: true,
    callManagementEnabled: true,
    pickupQueueEnabled: false,
  });
  const managerAccess = getStoreOperationAccess({
    accessRole: "manager",
    templateKey: "dining_aube_table_a",
    tableManagementEnabled: true,
    callManagementEnabled: true,
    pickupQueueEnabled: false,
  });

  assert.deepEqual(ownerAccess, { orders: false, calls: true, tables: true, sales: false, pickup: false });
  assert.deepEqual(managerAccess, ownerAccess);
  assert.equal(hasAvailableStoreOperation(ownerAccess), true);
});

test("staff permissions and unavailable runtime gates fail closed", () => {
  assert.deepEqual(
    getStoreOperationAccess({
      accessRole: "order_staff",
      templateKey: "dining_aube_table_a",
      tableManagementEnabled: true,
      callManagementEnabled: true,
      pickupQueueEnabled: false,
    }),
    { orders: false, calls: true, tables: false, sales: false, pickup: false },
  );

  const disabledAccess = getStoreOperationAccess({
    accessRole: "owner",
    templateKey: "dining_aube_table_a",
    tableManagementEnabled: false,
    callManagementEnabled: false,
    pickupQueueEnabled: false,
  });
  assert.equal(hasAvailableStoreOperation(disabledAccess), false);
});

test("operations only list published, active multi-page menus with Smart Call access", () => {
  const eligible = {
    accessRole: "owner" as const,
    templateKey: "dining_aube_table_a",
    menuSiteStatus: "published",
    lifecycleState: "active",
    lifecycleReason: "active",
    canPreview: true,
    tableManagementEnabled: true,
    callManagementEnabled: true,
    pickupQueueEnabled: false,
  };

  assert.equal(isCurrentSmartCallOperationsSite(eligible), true);
  assert.equal(isCurrentSmartCallOperationsSite({ ...eligible, menuSiteStatus: "draft" }), false);
  assert.equal(isCurrentSmartCallOperationsSite({ ...eligible, lifecycleState: "expired_holding" }), false);
  assert.equal(isCurrentSmartCallOperationsSite({ ...eligible, templateKey: "cafe_design_a" }), false);
  assert.equal(isCurrentSmartCallOperationsSite({ ...eligible, templateKey: "display_menu_a" }), false);
  assert.equal(isCurrentSmartCallOperationsSite({ ...eligible, tableManagementEnabled: false }), false);
  assert.equal(isCurrentSmartCallOperationsSite({ ...eligible, callManagementEnabled: false }), false);
  assert.equal(isCurrentSmartCallOperationsSite({ ...eligible, accessRole: "viewer" }), false);
});

test("Display 수동 대기번호는 별도 runtime과 권한으로만 매장 운영에 포함한다", () => {
  const eligible = {
    accessRole: "owner" as const,
    templateKey: "display_menu_a",
    menuSiteStatus: "published",
    lifecycleState: "active",
    lifecycleReason: "active",
    canPreview: true,
    tableManagementEnabled: false,
    callManagementEnabled: false,
    pickupQueueEnabled: true,
  };
  assert.equal(isCurrentPickupQueueOperationsSite(eligible), true);
  assert.equal(isCurrentPickupQueueOperationsSite({ ...eligible, templateKey: "dining_aube_table_a" }), false);
  assert.equal(isCurrentPickupQueueOperationsSite({ ...eligible, pickupQueueEnabled: false }), false);
  assert.equal(isCurrentPickupQueueOperationsSite({ ...eligible, accessRole: "viewer" }), false);
  assert.deepEqual(getStoreOperationAccess(eligible), {
    orders: false,
    calls: false,
    tables: false,
    sales: false,
    pickup: true,
  });
});
