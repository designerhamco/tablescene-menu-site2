import assert from "node:assert/strict";
import test from "node:test";

import type { MenuSiteAccessContext } from "./menu-site-permissions";

const { buildStaffWriteAuditEntry } = await import(
  new URL("./staff-write-audit.ts", import.meta.url).href
) as typeof import("./staff-write-audit");

function context(role: "owner" | "manager" | "editor" | "order_staff"): MenuSiteAccessContext {
  return {
    menuSiteId: "site-a",
    actorUserId: `${role}-user`,
    accessRole: role,
    isOwner: role === "owner",
    memberRole: role === "owner" ? null : role,
    membershipId: role === "owner" ? null : `${role}-membership`,
    permissions: new Set(
      role === "manager"
        ? ["menu.edit", "table.manage"]
        : role === "editor"
          ? ["menu.edit", "ai.use"]
          : role === "order_staff"
            ? ["order.read", "order.manage", "order.cancel_unpaid", "payment.manual"]
            : [],
    ),
    menuSiteStatus: "published",
    lifecycleState: "active",
    staffAccessAllowed: true,
  };
}

test("owner writes do not create staff audit rows", () => {
  assert.equal(buildStaffWriteAuditEntry(context("owner"), "menu.edit", "menu_editor_action"), null);
});

test("staff write audit attributes actor, role, permission, surface, and membership", () => {
  assert.deepEqual(buildStaffWriteAuditEntry(context("editor"), "ai.use", "menu_editor_action"), {
    menu_site_id: "site-a",
    actor_user_id: "editor-user",
    actor_role: "editor",
    action: "staff.write_authorized",
    target_type: "menu_site",
    target_id: "site-a",
    metadata: {
      permission: "ai.use",
      surface: "menu_editor_action",
      membership_id: "editor-membership",
    },
  });
});

test("manager table writes use the shared fail-closed audit surface", () => {
  assert.deepEqual(buildStaffWriteAuditEntry(context("manager"), "table.manage", "menu_table_management"), {
    menu_site_id: "site-a",
    actor_user_id: "manager-user",
    actor_role: "manager",
    action: "staff.write_authorized",
    target_type: "menu_site",
    target_id: "site-a",
    metadata: {
      permission: "table.manage",
      surface: "menu_table_management",
      membership_id: "manager-membership",
    },
  });
});

test("order staff mutations use permission-specific audit surfaces", () => {
  const entry = buildStaffWriteAuditEntry(
    context("order_staff"),
    "payment.manual",
    "order_manual_payment",
  );

  assert.equal(entry?.metadata.permission, "payment.manual");
  assert.equal(entry?.metadata.surface, "order_manual_payment");
  assert.equal(entry?.actor_role, "order_staff");
});

test("call acknowledgement is attributed to the acting order staff member", () => {
  const entry = buildStaffWriteAuditEntry(
    context("order_staff"),
    "call.manage",
    "call_acknowledgement",
  );

  assert.equal(entry?.metadata.permission, "call.manage");
  assert.equal(entry?.metadata.surface, "call_acknowledgement");
  assert.equal(entry?.actor_role, "order_staff");
});

test("call item configuration uses the shared call permission audit surface", () => {
  const entry = buildStaffWriteAuditEntry(
    context("manager"),
    "call.manage",
    "call_item_configuration",
  );

  assert.equal(entry?.metadata.permission, "call.manage");
  assert.equal(entry?.metadata.surface, "call_item_configuration");
  assert.equal(entry?.actor_role, "manager");
});

test("수동 대기번호 변경은 담당 직원과 전용 permission을 감사한다", () => {
  const entry = buildStaffWriteAuditEntry(
    context("order_staff"),
    "pickup.manage",
    "pickup_queue_transition",
  );

  assert.equal(entry?.metadata.permission, "pickup.manage");
  assert.equal(entry?.metadata.surface, "pickup_queue_transition");
  assert.equal(entry?.actor_role, "order_staff");
});
