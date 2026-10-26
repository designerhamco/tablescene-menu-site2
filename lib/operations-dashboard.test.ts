import assert from "node:assert/strict";
import test from "node:test";

import {
  getStoreOperationAccess,
  canConfigureStoreOperationsSite,
  hasAvailableStoreOperation,
  isCurrentPickupQueueOperationsSite,
  isCurrentSmartCallOperationsSite,
  isStoreOperationsTemplate,
} from "./operations-dashboard";

test("설정 준비는 미공개 메뉴의 사장에게만 열리며 운영 접수 권한을 부여하지 않는다", () => {
  const draft = { isOwner: true, templateKey: "cafe_design_a", status: "draft" };
  assert.equal(canConfigureStoreOperationsSite(draft), true);
  assert.equal(canConfigureStoreOperationsSite({ ...draft, isOwner: false }), false);
  assert.equal(canConfigureStoreOperationsSite({ ...draft, status: "archived" }), false);
  assert.equal(canConfigureStoreOperationsSite({ ...draft, templateKey: "display_menu_a" }), false);
  assert.equal(canConfigureStoreOperationsSite({ ...draft, templateKey: "unknown" }), false);
  assert.deepEqual(getStoreOperationAccess({ accessRole: "owner", templateKey: draft.templateKey, orderDashboardEnabled: false, tableManagementEnabled: false, callManagementEnabled: false, pickupQueueEnabled: false }), { orders: false, calls: false, tables: false, sales: false, pickup: false });
});

test("베이직·다이닝은 운영 대상이며 디스플레이는 제외한다", () => {
  assert.equal(isStoreOperationsTemplate("cafe_design_a"), true);
  assert.equal(isStoreOperationsTemplate("dining_aube_table_a"), true);
  assert.equal(isStoreOperationsTemplate("dining_aube_table_b"), true);
  assert.equal(isStoreOperationsTemplate("display_menu_a"), false);
});

test("owner and manager access requires runtime availability", () => {
  const ownerAccess = getStoreOperationAccess({
    accessRole: "owner",
    templateKey: "dining_aube_table_a",
    orderDashboardEnabled: true,
    tableManagementEnabled: true,
    callManagementEnabled: true,
    pickupQueueEnabled: false,
  });
  const managerAccess = getStoreOperationAccess({
    accessRole: "manager",
    templateKey: "dining_aube_table_a",
    orderDashboardEnabled: true,
    tableManagementEnabled: true,
    callManagementEnabled: true,
    pickupQueueEnabled: false,
  });

  assert.deepEqual(ownerAccess, { orders: true, calls: true, tables: true, sales: false, pickup: false });
  assert.deepEqual(managerAccess, ownerAccess);
  assert.equal(hasAvailableStoreOperation(ownerAccess), true);
});

test("staff permissions and unavailable runtime gates fail closed", () => {
  assert.deepEqual(
    getStoreOperationAccess({
      accessRole: "order_staff",
      templateKey: "dining_aube_table_a",
      orderDashboardEnabled: true,
    tableManagementEnabled: true,
      callManagementEnabled: true,
      pickupQueueEnabled: false,
    }),
    { orders: true, calls: true, tables: false, sales: false, pickup: false },
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
    orderDashboardEnabled: true,
    tableManagementEnabled: true,
    callManagementEnabled: true,
    pickupQueueEnabled: false,
  });

  assert.deepEqual(access, {
    orders: false,
    calls: false,
    tables: true,
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
    orderDashboardEnabled: true,
    tableManagementEnabled: true,
    callManagementEnabled: true,
    pickupQueueEnabled: false,
  }), true);
});

test("operations list excludes inactive, unauthorized and unsupported menus", () => {
  const eligible = {
    accessRole: "owner" as const,
    templateKey: "dining_aube_table_a",
    menuSiteStatus: "published",
    lifecycleState: "active",
    lifecycleReason: "active",
    canPreview: true,
    orderDashboardEnabled: true,
    tableManagementEnabled: true,
    callManagementEnabled: true,
    pickupQueueEnabled: false,
  };

  assert.equal(isCurrentSmartCallOperationsSite(eligible), true);
  assert.equal(isCurrentSmartCallOperationsSite({ ...eligible, menuSiteStatus: "draft" }), false);
  assert.equal(isCurrentSmartCallOperationsSite({ ...eligible, lifecycleState: "expired_holding" }), false);
  assert.equal(isCurrentSmartCallOperationsSite({ ...eligible, templateKey: "cafe_design_a" }), true);
  assert.equal(isCurrentSmartCallOperationsSite({ ...eligible, templateKey: "display_menu_a" }), false);
  assert.equal(isCurrentSmartCallOperationsSite({ ...eligible, tableManagementEnabled: false }), true);
  assert.equal(isCurrentSmartCallOperationsSite({ ...eligible, callManagementEnabled: false }), true);
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
