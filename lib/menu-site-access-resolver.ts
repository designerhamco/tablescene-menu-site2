import {
  getPermissionsForAccessRole,
  hasMenuSitePermission,
  isMenuSiteMemberRole,
  MenuSiteAccessError,
  type MenuSiteAccessContext,
  type MenuSiteAccessRole,
  type MenuSiteMemberRole,
} from "./menu-site-permissions";

export type MenuSiteOwnerCandidate = {
  id: string;
  userId: string;
};

export type MenuSiteMembershipCandidate = {
  id: string;
  menuSiteId: string;
  userId: string;
  role: unknown;
  status: string;
};

export type MenuSiteLifecycleSnapshot = {
  menuSiteId: string;
  menuSiteStatus: string | null;
  lifecycleState: string | null;
  reason: string | null;
  canPreview: boolean;
};

export type MenuSiteAccessLoaders = {
  findOwnedMenuSite: (actorUserId: string, menuSiteId: string) => Promise<MenuSiteOwnerCandidate | null>;
  findActiveMembership: (actorUserId: string, menuSiteId: string) => Promise<MenuSiteMembershipCandidate | null>;
  loadLifecycleAccess: (menuSiteId: string) => Promise<MenuSiteLifecycleSnapshot | null>;
};

export type AccessibleMenuSiteIdLoaders = {
  listOwnedMenuSiteIds: (actorUserId: string) => Promise<string[]>;
  listActiveMemberships: (actorUserId: string) => Promise<MenuSiteMembershipCandidate[]>;
  loadLifecycleAccess: (menuSiteId: string) => Promise<MenuSiteLifecycleSnapshot | null>;
};

export type AccessibleMenuSiteIds = {
  ownedMenuSiteIds: string[];
  memberMenuSiteIds: string[];
  allMenuSiteIds: string[];
};

export type AccessibleMenuSiteListAccess = {
  menuSiteId: string;
  accessRole: MenuSiteAccessRole;
  isOwner: boolean;
  memberRole: MenuSiteMemberRole | null;
  membershipId: string | null;
};

export function isMenuSiteStaffAccessAllowed(snapshot: MenuSiteLifecycleSnapshot | null) {
  return snapshot?.lifecycleState === "active"
    && snapshot.reason === "active"
    && snapshot.canPreview
    && snapshot.menuSiteStatus !== "archived";
}

function accessDenied() {
  return new MenuSiteAccessError(
    "MENU_SITE_ACCESS_DENIED",
    "메뉴판을 찾을 수 없거나 접근 권한이 없습니다.",
    404,
  );
}

function menuSiteNotFound() {
  return new MenuSiteAccessError(
    "MENU_SITE_NOT_FOUND",
    "메뉴판을 찾을 수 없거나 접근 권한이 없습니다.",
    404,
  );
}

function staffAccessInactive() {
  return new MenuSiteAccessError(
    "MENU_SITE_STAFF_ACCESS_INACTIVE",
    "현재 서비스 상태에서는 직원 권한으로 메뉴판에 접근할 수 없습니다.",
    403,
  );
}

function createContext({
  menuSiteId,
  actorUserId,
  accessRole,
  membershipId,
  lifecycle,
}: {
  menuSiteId: string;
  actorUserId: string;
  accessRole: "owner" | MenuSiteMemberRole;
  membershipId: string | null;
  lifecycle: MenuSiteLifecycleSnapshot;
}): MenuSiteAccessContext {
  const isOwner = accessRole === "owner";
  return {
    menuSiteId,
    actorUserId,
    accessRole,
    isOwner,
    memberRole: isOwner ? null : accessRole,
    membershipId: isOwner ? null : membershipId,
    permissions: getPermissionsForAccessRole(accessRole),
    menuSiteStatus: lifecycle.menuSiteStatus,
    lifecycleState: lifecycle.lifecycleState,
    staffAccessAllowed: isMenuSiteStaffAccessAllowed(lifecycle),
  };
}

export async function resolveMenuSiteAccessContextForActor({
  menuSiteId,
  actorUserId,
  loaders,
}: {
  menuSiteId: string;
  actorUserId: string;
  loaders: MenuSiteAccessLoaders;
}): Promise<MenuSiteAccessContext> {
  if (!actorUserId) {
    throw new MenuSiteAccessError("AUTH_REQUIRED", "로그인이 필요합니다.", 401);
  }

  const ownerCandidate = await loaders.findOwnedMenuSite(actorUserId, menuSiteId);
  if (ownerCandidate?.id === menuSiteId && ownerCandidate.userId === actorUserId) {
    const lifecycle = await loaders.loadLifecycleAccess(menuSiteId);
    if (!lifecycle || lifecycle.menuSiteId !== menuSiteId) throw menuSiteNotFound();

    return createContext({
      menuSiteId,
      actorUserId,
      accessRole: "owner",
      membershipId: null,
      lifecycle,
    });
  }

  const membership = await loaders.findActiveMembership(actorUserId, menuSiteId);
  if (
    !membership
    || membership.menuSiteId !== menuSiteId
    || membership.userId !== actorUserId
    || membership.status !== "active"
    || !isMenuSiteMemberRole(membership.role)
  ) {
    throw accessDenied();
  }

  const lifecycle = await loaders.loadLifecycleAccess(menuSiteId);
  if (!lifecycle || lifecycle.menuSiteId !== menuSiteId) throw menuSiteNotFound();
  if (!isMenuSiteStaffAccessAllowed(lifecycle)) throw staffAccessInactive();

  return createContext({
    menuSiteId,
    actorUserId,
    accessRole: membership.role,
    membershipId: membership.id,
    lifecycle,
  });
}

function uniqueSortedIds(values: string[]) {
  return [...new Set(values.filter((value) => typeof value === "string" && value.length > 0))].sort();
}

export async function resolveAccessibleMenuSiteListAccessForActor({
  actorUserId,
  loaders,
}: {
  actorUserId: string;
  loaders: AccessibleMenuSiteIdLoaders;
}): Promise<AccessibleMenuSiteListAccess[]> {
  if (!actorUserId) {
    throw new MenuSiteAccessError("AUTH_REQUIRED", "로그인이 필요합니다.", 401);
  }

  const [ownedRows, membershipRows] = await Promise.all([
    loaders.listOwnedMenuSiteIds(actorUserId),
    loaders.listActiveMemberships(actorUserId),
  ]);
  const ownedMenuSiteIds = uniqueSortedIds(ownedRows);
  const ownedSet = new Set(ownedMenuSiteIds);
  const membershipByMenuSiteId = new Map<string, MenuSiteMembershipCandidate>();

  for (const membership of membershipRows) {
    if (
      membership.userId !== actorUserId
      || membership.status !== "active"
      || !isMenuSiteMemberRole(membership.role)
      || !hasMenuSitePermission(membership.role, "menu.read")
      || membership.menuSiteId.length === 0
      || ownedSet.has(membership.menuSiteId)
      || membershipByMenuSiteId.has(membership.menuSiteId)
    ) {
      continue;
    }

    membershipByMenuSiteId.set(membership.menuSiteId, membership);
  }

  const memberEntries = await Promise.all(
    [...membershipByMenuSiteId.values()]
      .sort((left, right) => left.menuSiteId.localeCompare(right.menuSiteId))
      .map(async (membership): Promise<AccessibleMenuSiteListAccess | null> => {
        const lifecycle = await loaders.loadLifecycleAccess(membership.menuSiteId);

        if (!isMenuSiteStaffAccessAllowed(lifecycle) || !isMenuSiteMemberRole(membership.role)) {
          return null;
        }

        return {
          menuSiteId: membership.menuSiteId,
          accessRole: membership.role,
          isOwner: false,
          memberRole: membership.role,
          membershipId: membership.id,
        };
      }),
  );

  return [
    ...ownedMenuSiteIds.map((menuSiteId): AccessibleMenuSiteListAccess => ({
      menuSiteId,
      accessRole: "owner",
      isOwner: true,
      memberRole: null,
      membershipId: null,
    })),
    ...memberEntries.filter((entry): entry is AccessibleMenuSiteListAccess => entry !== null),
  ];
}

export async function resolveAccessibleMenuSiteIdsForActor({
  actorUserId,
  loaders,
}: {
  actorUserId: string;
  loaders: AccessibleMenuSiteIdLoaders;
}): Promise<AccessibleMenuSiteIds> {
  const accessEntries = await resolveAccessibleMenuSiteListAccessForActor({ actorUserId, loaders });
  const ownedMenuSiteIds = accessEntries
    .filter((entry) => entry.isOwner)
    .map((entry) => entry.menuSiteId)
    .sort();
  const memberMenuSiteIds = accessEntries
    .filter((entry) => !entry.isOwner)
    .map((entry) => entry.menuSiteId)
    .sort();

  return {
    ownedMenuSiteIds,
    memberMenuSiteIds,
    allMenuSiteIds: uniqueSortedIds([...ownedMenuSiteIds, ...memberMenuSiteIds]),
  };
}
