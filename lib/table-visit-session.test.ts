import assert from "node:assert/strict";
import test from "node:test";

const sessionModule = await import(
  new URL("./table-qr-session-tokens.ts", import.meta.url).href
) as typeof import("./table-qr-session-tokens");

const {
  createTableVisitSessionMaterial,
  getTableVisitSessionCookieMaxAge,
  hashTableVisitUserAgent,
  isTableVisitSessionUsable,
  shouldTouchTableVisitSession,
  TABLE_VISIT_SESSION_COOKIE_SECURITY,
} = sessionModule;

const NOW = new Date("2026-08-06T00:00:00.000Z");
const USER_AGENT = "ArtiMenu QA Browser/1.0";

test("visit-session material is hash-only and expires after at most 12 hours", () => {
  const material = createTableVisitSessionMaterial({ userAgent: USER_AGENT, now: NOW });

  assert.match(material.rawToken, /^[A-Za-z0-9_-]{43}$/);
  assert.match(material.tokenHash, /^[0-9a-f]{64}$/);
  assert.match(material.userAgentHash, /^[0-9a-f]{64}$/);
  assert.notEqual(material.rawToken, material.tokenHash);
  assert.equal(material.expiresAt.toISOString(), "2026-08-06T12:00:00.000Z");
});

test("session validation binds menu site, user agent, expiry, and revocation", () => {
  const userAgentHash = hashTableVisitUserAgent(USER_AGENT);
  const record = {
    menuSiteId: "site-a",
    menuTableId: "table-a",
    userAgentHash,
    expiresAt: "2026-08-06T12:00:00.000Z",
    lastSeenAt: "2026-08-06T00:00:00.000Z",
    revokedAt: null,
  };

  assert.equal(isTableVisitSessionUsable(record, { expectedMenuSiteId: "site-a", userAgentHash, now: NOW }), true);
  assert.equal(isTableVisitSessionUsable(record, { expectedMenuSiteId: "site-b", userAgentHash, now: NOW }), false);
  assert.equal(isTableVisitSessionUsable(record, { expectedMenuSiteId: "site-a", userAgentHash: hashTableVisitUserAgent("other"), now: NOW }), false);
  assert.equal(isTableVisitSessionUsable({ ...record, revokedAt: NOW.toISOString() }, { expectedMenuSiteId: "site-a", userAgentHash, now: NOW }), false);
  assert.equal(isTableVisitSessionUsable(record, { expectedMenuSiteId: "site-a", userAgentHash, now: new Date(record.expiresAt) }), false);
});

test("cookie policy stays HttpOnly, Secure, Lax and never outlives the DB session", () => {
  assert.deepEqual(TABLE_VISIT_SESSION_COOKIE_SECURITY, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
  });
  assert.equal(getTableVisitSessionCookieMaxAge("2026-08-06T12:00:00.000Z", NOW), 12 * 60 * 60);
  assert.equal(getTableVisitSessionCookieMaxAge("2026-08-05T23:59:59.000Z", NOW), 0);
});

test("last-seen writes are throttled to five-minute intervals", () => {
  assert.equal(shouldTouchTableVisitSession("2026-08-05T23:56:00.000Z", NOW), false);
  assert.equal(shouldTouchTableVisitSession("2026-08-05T23:55:00.000Z", NOW), true);
});

test("missing or oversized user agents fail closed", () => {
  assert.throws(() => hashTableVisitUserAgent(""), /Invalid table visit user agent/);
  assert.throws(() => hashTableVisitUserAgent("x".repeat(1025)), /Invalid table visit user agent/);
});
