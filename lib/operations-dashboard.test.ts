import assert from "node:assert/strict";
import test from "node:test";

import {
  getStoreOperationAccess,
  hasAvailableStoreOperation,
  isCurrentPickupQueueOperationsSite,
  isCurrentSmartCallOperationsSite,
  isStoreOperationsTemplate,
} from "./operations-dashboard";

test("디자인 메뉴판 집중 기간에는 모든 매장 운영 템플릿을 닫는다", () => {
  assert.equal(isStoreOperationsTemplate("cafe_design_a"), false);
  assert.equal(isStoreOperationsTemplate("dining_aube_table_a"), false);
  assert.equal(isStoreOperationsTemplate("dining_aube_table_b"), false);
  assert.equal(isStoreOperationsTemplate("display_menu_a"), false);
});

test("owner and manager operation access stays closed despite runtime inputs", () => {
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

  assert.deepEqual(ownerAccess, { orders: false, calls: false, tables: false, sales: false, pickup: false });
  assert.deepEqual(managerAccess, ownerAccess);
  assert.equal(hasAvailableStoreOperation(ownerAccess), false);
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
    { orders: false, calls: false, tables: false, sales: false, pickup: false },
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

test("per-member operation overrides control each visible management surface", () => {
  const access = getStoreOperationAccess({
    accessRole: "manager",
    permissions: ["menu.read", "table.manage"],
    templateKey: "dining_aube_table_a",
    tableManagementEnabled: true,
    callManagementEnabled: true,
    pickupQueueEnabled: false,
  });

  assert.deepEqual(access, {
    orders: false,
    calls: false,
    tables: false,
    sales: false,
    pickup: false,
  });
  assert.equal(isCurrentSmartCallOperationsSite({
    accessRole: "manager",
    permissions: ["menu.read", "table.manage"],
    templateKey: "dining_aube_table_a",
    menuSiteStatus: "published",
    lifecycleState: "active",
    lifecycleReason: "active",
    canPreview: true,
    tableManagementEnabled: true,
    callManagementEnabled: true,
    pickupQueueEnabled: false,
  }), false);
});

test("operations list excludes previously eligible multi-page menus", () => {
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

  assert.equal(isCurrentSmartCallOperationsSite(eligible), false);
  assert.equal(isCurrentSmartCallOperationsSite({ ...eligible, menuSiteStatus: "draft" }), false);
  assert.equal(isCurrentSmartCallOperationsSite({ ...eligible, lifecycleState: "expired_holding" }), false);
  assert.equal(isCurrentSmartCallOperationsSite({ ...eligible, templateKey: "cafe_design_a" }), false);
  assert.equal(isCurrentSmartCallOperationsSite({ ...eligible, templateKey: "display_menu_a" }), false);
  assert.equal(isCurrentSmartCallOperationsSite({ ...eligible, tableManagementEnabled: false }), false);
  assert.equal(isCurrentSmartCallOperationsSite({ ...eligible, callManagementEnabled: false }), false);
  assert.equal(isCurrentSmartCallOperationsSite({ ...eligible, accessRole: "viewer" }), false);
});

test("Display 메뉴판의 대기번호 운영도 닫는다", () => {
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
  assert.equal(isCurrentPickupQueueOperationsSite(eligible), false);
  assert.equal(isCurrentPickupQueueOperationsSite({ ...eligible, templateKey: "dining_aube_table_a" }), false);
  assert.equal(isCurrentPickupQueueOperationsSite({ ...eligible, pickupQueueEnabled: false }), false);
  assert.equal(isCurrentPickupQueueOperationsSite({ ...eligible, accessRole: "viewer" }), false);
  assert.deepEqual(getStoreOperationAccess(eligible), {
    orders: false,
    calls: false,
    tables: false,
    sales: false,
    pickup: false,
  });
});
