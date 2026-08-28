import assert from "node:assert/strict";
import test from "node:test";

import {
  getStoreOperationAccess,
  hasAvailableStoreOperation,
  isCurrentOrderOperationsSite,
  isStoreOperationsTemplate,
} from "./operations-dashboard";

test("Dining templates are eligible for store operations while Display stays excluded", () => {
  assert.equal(isStoreOperationsTemplate("cafe_design_a"), true);
  assert.equal(isStoreOperationsTemplate("display_menu_a"), false);
});

test("owner and manager operation access follows runtime gates", () => {
  const ownerAccess = getStoreOperationAccess({
    accessRole: "owner",
    templateKey: "cafe_design_a",
    tableManagementEnabled: true,
    orderDashboardEnabled: true,
    callManagementEnabled: true,
  });
  const managerAccess = getStoreOperationAccess({
    accessRole: "manager",
    templateKey: "cafe_design_a",
    tableManagementEnabled: true,
    orderDashboardEnabled: true,
    callManagementEnabled: true,
  });

  assert.deepEqual(ownerAccess, { orders: true, calls: true, tables: true, sales: true });
  assert.deepEqual(managerAccess, ownerAccess);
  assert.equal(hasAvailableStoreOperation(ownerAccess), true);
});

test("staff permissions and unavailable runtime gates fail closed", () => {
  assert.deepEqual(
    getStoreOperationAccess({
      accessRole: "order_staff",
      templateKey: "cafe_design_a",
      tableManagementEnabled: true,
      orderDashboardEnabled: true,
      callManagementEnabled: true,
    }),
    { orders: true, calls: true, tables: false, sales: false },
  );

  const disabledAccess = getStoreOperationAccess({
    accessRole: "owner",
    templateKey: "cafe_design_a",
    tableManagementEnabled: false,
    orderDashboardEnabled: false,
    callManagementEnabled: false,
  });
  assert.equal(hasAvailableStoreOperation(disabledAccess), false);
});

test("operations only list published, active Dining menus with Order access", () => {
  const eligible = {
    accessRole: "owner" as const,
    templateKey: "cafe_design_a",
    menuSiteStatus: "published",
    lifecycleState: "active",
    lifecycleReason: "active",
    canPreview: true,
    postpayOrderEnabled: true,
    orderDashboardEnabled: true,
  };

  assert.equal(isCurrentOrderOperationsSite(eligible), true);
  assert.equal(isCurrentOrderOperationsSite({ ...eligible, menuSiteStatus: "draft" }), false);
  assert.equal(isCurrentOrderOperationsSite({ ...eligible, lifecycleState: "expired_holding" }), false);
  assert.equal(isCurrentOrderOperationsSite({ ...eligible, templateKey: "display_menu_a" }), false);
  assert.equal(isCurrentOrderOperationsSite({ ...eligible, postpayOrderEnabled: false }), false);
  assert.equal(isCurrentOrderOperationsSite({ ...eligible, orderDashboardEnabled: false }), false);
  assert.equal(isCurrentOrderOperationsSite({ ...eligible, accessRole: "viewer" }), false);
});
