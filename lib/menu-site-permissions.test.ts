import assert from "node:assert/strict";
import test from "node:test";

import {
  assertMenuSitePermission,
  getPermissionsForAccessRole,
  hasMenuSitePermission,
  MENU_SITE_PERMISSIONS,
  MenuSiteAccessError,
  type MenuSiteAccessContext,
  type MenuSiteAccessRole,
  type MenuSitePermission,
} from "./menu-site-permissions";
import {
  isMenuSiteStaffAccessAllowed,
  resolveAccessibleMenuSiteIdsForActor,
  resolveAccessibleMenuSiteListAccessForActor,
  resolveMenuSiteAccessContextForActor,
  type MenuSiteAccessLoaders,
  type MenuSiteLifecycleSnapshot,
  type MenuSiteMembershipCandidate,
} from "./menu-site-access-resolver";

const ROLE_EXPECTATIONS: Record<MenuSiteAccessRole, readonly MenuSitePermission[]> = {
  owner: MENU_SITE_PERMISSIONS,
  manager: [
    "menu.read",
    "menu.edit",
    "menu.publish",
    "ai.use",
    "qr.manage",
    "table.manage",
    "order.read",
    "order.manage",
    "order.cancel_unpaid",
    "payment.manual",
    "call.manage",
    "sales.read",
  ],
  editor: ["menu.read", "menu.edit", "ai.use"],
  order_staff: [
    "menu.read",
    "order.read",
    "order.manage",
    "order.cancel_unpaid",
    "payment.manual",
    "call.manage",
  ],
  viewer: ["menu.read"],
};

const ACTIVE_LIFECYCLE: MenuSiteLifecycleSnapshot = {
  menuSiteId: "menu-a",
  menuSiteStatus: "published",
  lifecycleState: "active",
  reason: "active",
  canPreview: true,
};

const INACTIVE_LIFECYCLE: MenuSiteLifecycleSnapshot = {
  menuSiteId: "menu-a",
  menuSiteStatus: "archived",
  lifecycleState: "expired_holding",
  reason: "archived_menu_site",
  canPreview: true,
};

function sortedPermissions(role: unknown) {
  return [...getPermissionsForAccessRole(role)].sort();
}

function activeMembership(overrides: Partial<MenuSiteMembershipCandidate> = {}): MenuSiteMembershipCandidate {
  return {
    id: "member-a",
    menuSiteId: "menu-a",
    userId: "user-a",
    role: "editor",
    status: "active",
    ...overrides,
  };
}

function loaders(overrides: Partial<MenuSiteAccessLoaders> = {}): MenuSiteAccessLoaders {
  return {
    findOwnedMenuSite: async () => null,
    findActiveMembership: async () => activeMembership(),
    loadLifecycleAccess: async () => ACTIVE_LIFECYCLE,
    ...overrides,
  };
}

function context(role: MenuSiteAccessRole, staffAccessAllowed = true): MenuSiteAccessContext {
  const isOwner = role === "owner";
  return {
    menuSiteId: "menu-a",
    actorUserId: "user-a",
    accessRole: role,
    isOwner,
    memberRole: isOwner ? null : role,
    membershipId: isOwner ? null : "member-a",
    permissions: getPermissionsForAccessRole(role),
    menuSiteStatus: "published",
    lifecycleState: staffAccessAllowed ? "active" : "expired_holding",
    staffAccessAllowed,
  };
}

for (const role of Object.keys(ROLE_EXPECTATIONS) as MenuSiteAccessRole[]) {
  test(`${role} permission matrix matches the approved contract`, () => {
    assert.deepEqual(sortedPermissions(role), [...ROLE_EXPECTATIONS[role]].sort());
  });
}

test("unknown roles fail closed", () => {
  assert.deepEqual(sortedPermissions("administrator"), []);
  assert.equal(hasMenuSitePermission("administrator", "menu.read"), false);
});

test("inactive staff contexts cannot use otherwise granted permissions", () => {
  assert.equal(hasMenuSitePermission(context("manager", false), "menu.read"), false);
});

test("permission assertion returns an authorized context", () => {
  const authorized = context("editor");
  assert.equal(assertMenuSitePermission(authorized, "menu.edit"), authorized);
});

test("permission assertion throws a typed denial", () => {
  assert.throws(
    () => assertMenuSitePermission(context("viewer"), "menu.edit"),
    (error) => error instanceof MenuSiteAccessError
      && error.code === "MENU_SITE_PERMISSION_DENIED"
      && error.status === 403,
  );
});

test("owner identity takes priority over a membership row", async () => {
  let membershipCalls = 0;
  const resolved = await resolveMenuSiteAccessContextForActor({
    menuSiteId: "menu-a",
    actorUserId: "user-a",
    loaders: loaders({
      findOwnedMenuSite: async () => ({ id: "menu-a", userId: "user-a" }),
      findActiveMembership: async () => {
        membershipCalls += 1;
        return activeMembership({ role: "viewer" });
      },
    }),
  });

  assert.equal(resolved.accessRole, "owner");
  assert.equal(resolved.membershipId, null);
  assert.equal(membershipCalls, 0);
});

test("an active valid membership resolves its exact role", async () => {
  const resolved = await resolveMenuSiteAccessContextForActor({
    menuSiteId: "menu-a",
    actorUserId: "user-a",
    loaders: loaders({
      findActiveMembership: async () => activeMembership({ role: "order_staff" }),
    }),
  });

  assert.equal(resolved.accessRole, "order_staff");
  assert.equal(resolved.memberRole, "order_staff");
  assert.equal(resolved.membershipId, "member-a");
});

test("revoked memberships are denied before lifecycle lookup", async () => {
  let lifecycleCalls = 0;
  await assert.rejects(
    resolveMenuSiteAccessContextForActor({
      menuSiteId: "menu-a",
      actorUserId: "user-a",
      loaders: loaders({
        findActiveMembership: async () => activeMembership({ status: "revoked" }),
        loadLifecycleAccess: async () => {
          lifecycleCalls += 1;
          return ACTIVE_LIFECYCLE;
        },
      }),
    }),
    (error) => error instanceof MenuSiteAccessError && error.code === "MENU_SITE_ACCESS_DENIED",
  );
  assert.equal(lifecycleCalls, 0);
});

test("a membership for another menu site is denied", async () => {
  await assert.rejects(
    resolveMenuSiteAccessContextForActor({
      menuSiteId: "menu-a",
      actorUserId: "user-a",
      loaders: loaders({
        findActiveMembership: async () => activeMembership({ menuSiteId: "menu-b" }),
      }),
    }),
    (error) => error instanceof MenuSiteAccessError && error.code === "MENU_SITE_ACCESS_DENIED",
  );
});

test("a membership for another actor is denied", async () => {
  await assert.rejects(
    resolveMenuSiteAccessContextForActor({
      menuSiteId: "menu-a",
      actorUserId: "user-a",
      loaders: loaders({
        findActiveMembership: async () => activeMembership({ userId: "user-b" }),
      }),
    }),
    (error) => error instanceof MenuSiteAccessError && error.code === "MENU_SITE_ACCESS_DENIED",
  );
});

test("staff access is blocked for archived or retention lifecycle states", async () => {
  await assert.rejects(
    resolveMenuSiteAccessContextForActor({
      menuSiteId: "menu-a",
      actorUserId: "user-a",
      loaders: loaders({ loadLifecycleAccess: async () => INACTIVE_LIFECYCLE }),
    }),
    (error) => error instanceof MenuSiteAccessError && error.code === "MENU_SITE_STAFF_ACCESS_INACTIVE",
  );
});

test("the staff lifecycle gate requires every active signal", () => {
  assert.equal(isMenuSiteStaffAccessAllowed(ACTIVE_LIFECYCLE), true);
  assert.equal(isMenuSiteStaffAccessAllowed({ ...ACTIVE_LIFECYCLE, canPreview: false }), false);
  assert.equal(isMenuSiteStaffAccessAllowed({ ...ACTIVE_LIFECYCLE, reason: "inactive_entitlement" }), false);
  assert.equal(isMenuSiteStaffAccessAllowed({ ...ACTIVE_LIFECYCLE, menuSiteStatus: "archived" }), false);
});

test("accessible IDs merge ownership and active staff membership without duplicates", async () => {
  const resolved = await resolveAccessibleMenuSiteIdsForActor({
    actorUserId: "user-a",
    loaders: {
      listOwnedMenuSiteIds: async () => ["menu-owned", "menu-shared", "menu-owned"],
      listActiveMemberships: async () => [
        activeMembership({ id: "member-shared", menuSiteId: "menu-shared", role: "viewer" }),
        activeMembership({ id: "member-active", menuSiteId: "menu-active", role: "manager" }),
        activeMembership({ id: "member-duplicate", menuSiteId: "menu-active", role: "editor" }),
      ],
      loadLifecycleAccess: async (menuSiteId) => ({ ...ACTIVE_LIFECYCLE, menuSiteId }),
    },
  });

  assert.deepEqual(resolved.ownedMenuSiteIds, ["menu-owned", "menu-shared"]);
  assert.deepEqual(resolved.memberMenuSiteIds, ["menu-active"]);
  assert.deepEqual(resolved.allMenuSiteIds, ["menu-active", "menu-owned", "menu-shared"]);
});

test("accessible IDs retain inactive owned sites but hide inactive staff sites", async () => {
  const resolved = await resolveAccessibleMenuSiteIdsForActor({
    actorUserId: "user-a",
    loaders: {
      listOwnedMenuSiteIds: async () => ["menu-owned-archived"],
      listActiveMemberships: async () => [
        activeMembership({ menuSiteId: "menu-staff-archived" }),
        activeMembership({ id: "member-active", menuSiteId: "menu-staff-active" }),
      ],
      loadLifecycleAccess: async (menuSiteId) => menuSiteId === "menu-staff-active"
        ? { ...ACTIVE_LIFECYCLE, menuSiteId }
        : { ...INACTIVE_LIFECYCLE, menuSiteId },
    },
  });

  assert.deepEqual(resolved.ownedMenuSiteIds, ["menu-owned-archived"]);
  assert.deepEqual(resolved.memberMenuSiteIds, ["menu-staff-active"]);
});

test("accessible list entries expose the exact staff role while preserving owner precedence", async () => {
  const resolved = await resolveAccessibleMenuSiteListAccessForActor({
    actorUserId: "user-a",
    loaders: {
      listOwnedMenuSiteIds: async () => ["menu-owned", "menu-shared"],
      listActiveMemberships: async () => [
        activeMembership({ id: "member-shared", menuSiteId: "menu-shared", role: "viewer" }),
        activeMembership({ id: "member-manager", menuSiteId: "menu-manager", role: "manager" }),
        activeMembership({ id: "member-editor", menuSiteId: "menu-editor", role: "editor" }),
      ],
      loadLifecycleAccess: async (menuSiteId) => ({ ...ACTIVE_LIFECYCLE, menuSiteId }),
    },
  });

  assert.deepEqual(resolved, [
    {
      menuSiteId: "menu-owned",
      accessRole: "owner",
      isOwner: true,
      memberRole: null,
      membershipId: null,
    },
    {
      menuSiteId: "menu-shared",
      accessRole: "owner",
      isOwner: true,
      memberRole: null,
      membershipId: null,
    },
    {
      menuSiteId: "menu-editor",
      accessRole: "editor",
      isOwner: false,
      memberRole: "editor",
      membershipId: "member-editor",
    },
    {
      menuSiteId: "menu-manager",
      accessRole: "manager",
      isOwner: false,
      memberRole: "manager",
      membershipId: "member-manager",
    },
  ]);
});

test("invalid membership candidates never reach privileged lifecycle loaders", async () => {
  const requestedLifecycleIds: string[] = [];
  const resolved = await resolveAccessibleMenuSiteIdsForActor({
    actorUserId: "user-a",
    loaders: {
      listOwnedMenuSiteIds: async () => [],
      listActiveMemberships: async () => [
        activeMembership({ menuSiteId: "menu-revoked", status: "revoked" }),
        activeMembership({ menuSiteId: "menu-other-user", userId: "user-b" }),
        activeMembership({ menuSiteId: "menu-unknown-role", role: "administrator" }),
        activeMembership({ menuSiteId: "menu-valid", role: "viewer" }),
      ],
      loadLifecycleAccess: async (menuSiteId) => {
        requestedLifecycleIds.push(menuSiteId);
        return { ...ACTIVE_LIFECYCLE, menuSiteId };
      },
    },
  });

  assert.deepEqual(requestedLifecycleIds, ["menu-valid"]);
  assert.deepEqual(resolved.memberMenuSiteIds, ["menu-valid"]);
});

test("authentication is required before any access loader runs", async () => {
  let loaderCalls = 0;
  await assert.rejects(
    resolveMenuSiteAccessContextForActor({
      menuSiteId: "menu-a",
      actorUserId: "",
      loaders: loaders({
        findOwnedMenuSite: async () => {
          loaderCalls += 1;
          return null;
        },
      }),
    }),
    (error) => error instanceof MenuSiteAccessError && error.code === "AUTH_REQUIRED",
  );
  assert.equal(loaderCalls, 0);
});
