import { createHash, randomBytes } from "node:crypto";

export const MENU_TABLE_LIMIT = 100;
export const TABLE_VISIT_SESSION_MAX_AGE_SECONDS = 12 * 60 * 60;
export const TABLE_VISIT_SESSION_COOKIE = "menulink_table_visit";

const TOKEN_BYTE_LENGTH = 32;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43,128}$/;

export function createTableAccessToken() {
  return randomBytes(TOKEN_BYTE_LENGTH).toString("base64url");
}

export function isValidTableAccessToken(
  value: string | null | undefined,
): value is string {
  return typeof value === "string" && TOKEN_PATTERN.test(value);
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

export function buildTableQrPath(token: string) {
  if (!isValidTableAccessToken(token)) {
    throw new TypeError("Invalid table access token.");
  }

  return `/table/${token}`;
}
