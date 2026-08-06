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
  "sales.read",
  "staff.manage",
  "billing.read",
  "billing.manage",
  "menu.archive",
] as const;

export type MenuSitePermission = (typeof MENU_SITE_PERMISSIONS)[number];

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

export function getPermissionsForAccessRole(role: unknown): ReadonlySet<MenuSitePermission> {
  if (!isMenuSiteAccessRole(role)) {
    return new Set<MenuSitePermission>();
  }

  return new Set<MenuSitePermission>(MENU_SITE_PERMISSION_MATRIX[role]);
}

function isMenuSiteAccessContext(value: unknown): value is MenuSiteAccessContext {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<MenuSiteAccessContext>;
  return typeof candidate.menuSiteId === "string"
    && typeof candidate.actorUserId === "string"
    && isMenuSiteAccessRole(candidate.accessRole)
    && typeof candidate.staffAccessAllowed === "boolean";
}

export function hasMenuSitePermission(
  contextOrRole: MenuSiteAccessContext | MenuSiteAccessRole | unknown,
  permission: MenuSitePermission,
) {
  if (isMenuSiteAccessContext(contextOrRole)) {
    if (!contextOrRole.isOwner && !contextOrRole.staffAccessAllowed) {
      return false;
    }

    return getPermissionsForAccessRole(contextOrRole.accessRole).has(permission);
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
