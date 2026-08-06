import assert from "node:assert/strict";
import test from "node:test";

import { getPermissionsForAccessRole, type MenuSiteAccessContext } from "./menu-site-permissions";
import { buildStaffWriteAuditEntry } from "./staff-write-audit";

function context(role: "owner" | "manager" | "editor"): MenuSiteAccessContext {
  return {
    menuSiteId: "site-a",
    actorUserId: `${role}-user`,
    accessRole: role,
    isOwner: role === "owner",
    memberRole: role === "owner" ? null : role,
    membershipId: role === "owner" ? null : `${role}-membership`,
    permissions: getPermissionsForAccessRole(role),
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
