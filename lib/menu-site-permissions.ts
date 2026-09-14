export const MENU_SITE_PERMISSIONS = [
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
  "pickup.manage",
  "sales.read",
  "staff.manage",
  "billing.read",
  "billing.manage",
  "menu.archive",
] as const;

export type MenuSitePermission = (typeof MENU_SITE_PERMISSIONS)[number];

export const MENU_SITE_OWNER_ONLY_PERMISSIONS = [
  "staff.manage",
  "billing.read",
  "billing.manage",
  "menu.archive",
] as const satisfies readonly MenuSitePermission[];

export const MENU_SITE_DELEGABLE_PERMISSIONS = MENU_SITE_PERMISSIONS.filter(
  (permission) => !(MENU_SITE_OWNER_ONLY_PERMISSIONS as readonly MenuSitePermission[]).includes(permission),
);

export type MenuSitePermissionOverrides = {
  allow: readonly MenuSitePermission[];
  deny: readonly MenuSitePermission[];
};

export const MENU_SITE_MEMBER_ROLES = [
  "manager",
  "editor",
  "order_staff",
  "viewer",
] as const;

export type MenuSiteMemberRole = (typeof MENU_SITE_MEMBER_ROLES)[number];
export type MenuSiteAccessRole = "owner" | MenuSiteMemberRole;

export const MENU_SITE_PERMISSION_MATRIX = {
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
    "pickup.manage",
    "sales.read",
  ],
  editor: [
    "menu.read",
    "menu.edit",
    "ai.use",
  ],
  order_staff: [
    "menu.read",
    "order.read",
    "order.manage",
    "order.cancel_unpaid",
    "payment.manual",
    "call.manage",
    "pickup.manage",
  ],
  viewer: ["menu.read"],
} as const satisfies Readonly<Record<MenuSiteAccessRole, readonly MenuSitePermission[]>>;

export type MenuSiteAccessContext = {
  menuSiteId: string;
  actorUserId: string;
  accessRole: MenuSiteAccessRole;
  isOwner: boolean;
  memberRole: MenuSiteMemberRole | null;
  membershipId: string | null;
  permissions: ReadonlySet<MenuSitePermission>;
  menuSiteStatus: string | null;
  lifecycleState: string | null;
  staffAccessAllowed: boolean;
};

export type MenuSiteAccessErrorCode =
  | "AUTH_REQUIRED"
  | "MENU_SITE_ACCESS_DENIED"
  | "MENU_SITE_PERMISSION_DENIED"
  | "MENU_SITE_STAFF_ACCESS_INACTIVE"
  | "MENU_SITE_NOT_FOUND"
  | "MENU_SITE_ACCESS_CHECK_FAILED";

export class MenuSiteAccessError extends Error {
  constructor(
    public readonly code: MenuSiteAccessErrorCode,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "MenuSiteAccessError";
  }
}

export function isMenuSiteMemberRole(value: unknown): value is MenuSiteMemberRole {
  return typeof value === "string" && (MENU_SITE_MEMBER_ROLES as readonly string[]).includes(value);
}

export function isMenuSiteAccessRole(value: unknown): value is MenuSiteAccessRole {
  return value === "owner" || isMenuSiteMemberRole(value);
}

export function isMenuSitePermission(value: unknown): value is MenuSitePermission {
  return typeof value === "string" && (MENU_SITE_PERMISSIONS as readonly string[]).includes(value);
}

export function normalizeMenuSitePermissionOverrides(value: unknown): MenuSitePermissionOverrides {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { allow: [], deny: [] };
  }

  const candidate = value as { allow?: unknown; deny?: unknown };
  const delegable = new Set<MenuSitePermission>(MENU_SITE_DELEGABLE_PERMISSIONS);
  const normalize = (entries: unknown) => [...new Set(
    (Array.isArray(entries) ? entries : [])
      .filter(isMenuSitePermission)
      .filter((permission) => permission !== "menu.read" && delegable.has(permission)),
  )];

  return {
    allow: normalize(candidate.allow),
    deny: normalize(candidate.deny),
  };
}

export function resolvePermissionsForAccessRole(
  role: unknown,
  overrides?: unknown,
): ReadonlySet<MenuSitePermission> {
  if (!isMenuSiteAccessRole(role)) {
    return new Set<MenuSitePermission>();
  }

  const permissions = new Set<MenuSitePermission>(MENU_SITE_PERMISSION_MATRIX[role]);
  if (role === "owner") return permissions;

  const normalizedOverrides = normalizeMenuSitePermissionOverrides(overrides);
  for (const permission of normalizedOverrides.allow) permissions.add(permission);
  for (const permission of normalizedOverrides.deny) permissions.delete(permission);

  // Active staff must retain read access so restricted menu items can remain
  // visible with an explanatory disabled state instead of disappearing.
  permissions.add("menu.read");
  return permissions;
}

export function getPermissionsForAccessRole(role: unknown): ReadonlySet<MenuSitePermission> {
  return resolvePermissionsForAccessRole(role);
}

function isMenuSiteAccessContext(value: unknown): value is MenuSiteAccessContext {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<MenuSiteAccessContext>;
  return typeof candidate.menuSiteId === "string"
    && typeof candidate.actorUserId === "string"
    && isMenuSiteAccessRole(candidate.accessRole)
    && typeof candidate.staffAccessAllowed === "boolean"
    && typeof candidate.permissions?.has === "function";
}

export function hasMenuSitePermission(
  contextOrRole: MenuSiteAccessContext | MenuSiteAccessRole | unknown,
  permission: MenuSitePermission,
) {
  if (isMenuSiteAccessContext(contextOrRole)) {
    if (!contextOrRole.isOwner && !contextOrRole.staffAccessAllowed) {
      return false;
    }

    return contextOrRole.permissions.has(permission);
  }

  return getPermissionsForAccessRole(contextOrRole).has(permission);
}

export function assertMenuSitePermission(
  context: MenuSiteAccessContext,
  permission: MenuSitePermission,
): MenuSiteAccessContext {
  if (!hasMenuSitePermission(context, permission)) {
    throw new MenuSiteAccessError(
      "MENU_SITE_PERMISSION_DENIED",
      "이 작업을 수행할 권한이 없습니다.",
      403,
    );
  }

  return context;
}
