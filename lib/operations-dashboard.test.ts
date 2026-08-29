import assert from "node:assert/strict";
import test from "node:test";

import {
  getStoreOperationAccess,
  hasAvailableStoreOperation,
  isCurrentSmartCallOperationsSite,
  isStoreOperationsTemplate,
} from "./operations-dashboard";

test("멀티페이지 Dining만 스마트호출 매장 운영에 포함한다", () => {
  assert.equal(isStoreOperationsTemplate("cafe_design_a"), false);
  assert.equal(isStoreOperationsTemplate("cafe_brew_chapter_a"), true);
  assert.equal(isStoreOperationsTemplate("display_menu_a"), false);
});

test("owner and manager operation access follows runtime gates", () => {
  const ownerAccess = getStoreOperationAccess({
    accessRole: "owner",
    templateKey: "cafe_brew_chapter_a",
    tableManagementEnabled: true,
    callManagementEnabled: true,
  });
  const managerAccess = getStoreOperationAccess({
    accessRole: "manager",
    templateKey: "cafe_brew_chapter_a",
    tableManagementEnabled: true,
    callManagementEnabled: true,
  });

  assert.deepEqual(ownerAccess, { orders: false, calls: true, tables: true, sales: false });
  assert.deepEqual(managerAccess, ownerAccess);
  assert.equal(hasAvailableStoreOperation(ownerAccess), true);
});

test("staff permissions and unavailable runtime gates fail closed", () => {
  assert.deepEqual(
    getStoreOperationAccess({
      accessRole: "order_staff",
      templateKey: "cafe_brew_chapter_a",
      tableManagementEnabled: true,
      callManagementEnabled: true,
    }),
    { orders: false, calls: true, tables: false, sales: false },
  );

  const disabledAccess = getStoreOperationAccess({
    accessRole: "owner",
    templateKey: "cafe_brew_chapter_a",
    tableManagementEnabled: false,
    callManagementEnabled: false,
  });
  assert.equal(hasAvailableStoreOperation(disabledAccess), false);
});

test("operations only list published, active multi-page menus with Smart Call access", () => {
  const eligible = {
    accessRole: "owner" as const,
    templateKey: "cafe_brew_chapter_a",
    menuSiteStatus: "published",
    lifecycleState: "active",
    lifecycleReason: "active",
    canPreview: true,
    tableManagementEnabled: true,
    callManagementEnabled: true,
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
