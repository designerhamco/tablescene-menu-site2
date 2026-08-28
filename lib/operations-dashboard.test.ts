import assert from "node:assert/strict";
import test from "node:test";

import {
  getStoreOperationAccess,
  hasAvailableStoreOperation,
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
