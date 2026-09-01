import { createHash, randomBytes } from "node:crypto";

export const MENU_TABLE_LIMIT = 100;
export const TABLE_VISIT_SESSION_MAX_AGE_SECONDS = 12 * 60 * 60;
export const TABLE_VISIT_SESSION_COOKIE = "menulink_table_visit";
export const TABLE_VISIT_SESSION_TOUCH_INTERVAL_SECONDS = 5 * 60;
export const TABLE_VISIT_SESSION_COOKIE_SECURITY = {
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  path: "/",
};

const TOKEN_BYTE_LENGTH = 32;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43,128}$/;
const TABLE_QR_PUBLIC_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const USER_AGENT_MAX_LENGTH = 1024;

export type TableVisitSessionRecord = {
  menuSiteId: string;
  menuTableId: string;
  userAgentHash: string;
  expiresAt: string;
  lastSeenAt: string;
  revokedAt: string | null;
};

export function createTableAccessToken() {
  return randomBytes(TOKEN_BYTE_LENGTH).toString("base64url");
}

export function isValidTableAccessToken(
  value: string | null | undefined,
): value is string {
  return typeof value === "string" && TOKEN_PATTERN.test(value);
}

export function isValidTableQrPublicId(
  value: string | null | undefined,
): value is string {
  return typeof value === "string" && TABLE_QR_PUBLIC_ID_PATTERN.test(value);
}

export function isValidTableQrIdentifier(
  value: string | null | undefined,
): value is string {
  return isValidTableAccessToken(value) || isValidTableQrPublicId(value);
}

export function hashTableAccessToken(token: string) {
  if (!isValidTableAccessToken(token)) {
    throw new TypeError("Invalid table access token.");
  }

  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function createTableVisitSessionExpiry(now: Date = new Date()) {
  return new Date(now.getTime() + TABLE_VISIT_SESSION_MAX_AGE_SECONDS * 1000);
}

export function normalizeTableVisitUserAgent(value: string | null | undefined) {
  const normalized = value?.trim() ?? "";
  if (!normalized || normalized.length > USER_AGENT_MAX_LENGTH) {
    throw new TypeError("Invalid table visit user agent.");
  }
  return normalized;
}

export function hashTableVisitUserAgent(value: string | null | undefined) {
  return createHash("sha256")
    .update(normalizeTableVisitUserAgent(value), "utf8")
    .digest("hex");
}

export function createTableVisitSessionMaterial({
  userAgent,
  now = new Date(),
  token = createTableAccessToken(),
}: {
  userAgent: string;
  now?: Date;
  token?: string;
}) {
  return {
    rawToken: token,
    tokenHash: hashTableAccessToken(token),
    userAgentHash: hashTableVisitUserAgent(userAgent),
    expiresAt: createTableVisitSessionExpiry(now),
  };
}

export function isTableVisitSessionUsable(
  record: TableVisitSessionRecord,
  {
    expectedMenuSiteId,
    userAgentHash,
    now = new Date(),
  }: {
    expectedMenuSiteId: string;
    userAgentHash: string;
    now?: Date;
  },
) {
  const expiresAt = Date.parse(record.expiresAt);
  return record.menuSiteId === expectedMenuSiteId
    && record.userAgentHash === userAgentHash
    && record.revokedAt === null
    && Number.isFinite(expiresAt)
    && expiresAt > now.getTime();
}

export function shouldTouchTableVisitSession(lastSeenAt: string, now = new Date()) {
  const lastSeen = Date.parse(lastSeenAt);
  return !Number.isFinite(lastSeen)
    || now.getTime() - lastSeen >= TABLE_VISIT_SESSION_TOUCH_INTERVAL_SECONDS * 1000;
}

export function getTableVisitSessionCookieMaxAge(expiresAt: string, now = new Date()) {
  const remainingSeconds = Math.floor((Date.parse(expiresAt) - now.getTime()) / 1000);
  if (!Number.isFinite(remainingSeconds)) return 0;
  return Math.max(0, Math.min(TABLE_VISIT_SESSION_MAX_AGE_SECONDS, remainingSeconds));
}

export function isReusableTableVisitSessionToken(value: string | null | undefined): value is string {
  return isValidTableAccessToken(value);
}

export function buildTableQrPath(identifier: string) {
  if (!isValidTableQrIdentifier(identifier)) {
    throw new TypeError("Invalid table QR identifier.");
  }

  return `/table/${identifier}`;
}
