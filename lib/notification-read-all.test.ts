import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import { NextResponse } from "next/server";
import { isSameOriginRequest } from "./same-origin-request";
import { isDeletedAccountStatus } from "./account-status";
import { getNotificationDisplaySince, NOTIFICATION_VISIBLE_CHANNELS } from "./notification-display-policy";
import { applyNotificationsReadAll, getNotificationsReadAll } from "./notification-read-state";

type Row = { user_id: string; channel: string; status: string; read_at: string | null; created_at: string };
const now = "2026-11-03T12:00:00.000Z";
const recentCreatedAt = "2026-11-02T00:00:00Z";
const originalReadAt = "2025-01-01T00:00:00.000Z";
function fixture({ authenticated = true, deleted = false, fail = false } = {}) {
  const rows: Row[] = Array.from({ length: 1100 }, (_, i) => ({ user_id: "owner", channel: i % 2 ? "email" : "in_app", status: "sent", read_at: null, created_at: recentCreatedAt }));
  rows.push(
    { ...rows[0], created_at: getNotificationDisplaySince(now) },
    { ...rows[0], created_at: new Date(Date.parse(getNotificationDisplaySince(now)) - 1).toISOString() },
    { ...rows[0], user_id: "other" },
    { ...rows[0], status: "skipped" },
    { ...rows[0], channel: "sms" },
    { ...rows[0], read_at: originalReadAt },
    { ...rows[0], created_at: "2099-01-01T00:00:00Z" },
  );
  let queries = 0, updates = 0;
  const client = { auth: { getUser: async () => ({ data: { user: authenticated ? { id: "owner", app_metadata: { account_status: deleted ? "deleted" : "active" } } : null }, error: null }) }, from(table: string) {
    assert.equal(table, "notification_events"); queries++;
    const filters: ((row: Row) => boolean)[] = [];
    let values: Partial<Row>;
    return {
      update(next: Partial<Row>) { values = next; return this; },
      eq(key: keyof Row, value: unknown) { filters.push(row => row[key] === value); return this; },
      neq(key: keyof Row, value: unknown) { filters.push(row => row[key] !== value); return this; },
      in(key: keyof Row, value: unknown[]) { filters.push(row => value.includes(row[key])); return this; },
      is(key: keyof Row, value: unknown) { filters.push(row => row[key] === value); return this; },
      gte(key: keyof Row, value: string) { filters.push(row => Date.parse(String(row[key])) >= Date.parse(value)); return this; },
      lte(key: keyof Row, value: string) { filters.push(row => Date.parse(String(row[key])) <= Date.parse(value)); return this; },
      then(resolve: (value: unknown) => unknown) {
        if (!fail) for (const row of rows) if (filters.every(filter => filter(row))) { Object.assign(row, values); updates++; }
        return Promise.resolve(resolve({ error: fail ? { message: "database unavailable" } : null }));
      },
    };
  } };
  const source = readFileSync(new URL("../app/api/notifications/read-all/route.ts", import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const dependencies: Record<string, unknown> = { "next/server": { NextResponse }, "@/lib/supabase/server": { createClient: async () => client }, "@/lib/same-origin-request": { isSameOriginRequest }, "@/lib/account-status": { isDeletedAccountStatus }, "@/lib/notification-display-policy": { getNotificationDisplaySince, NOTIFICATION_VISIBLE_CHANNELS } };
  const loaded = { exports: {} };
  new Function("require", "module", "exports", "Date", code)((name: string) => { assert.ok(name in dependencies, name); return dependencies[name]; }, loaded, loaded.exports, class extends Date { constructor() { super(now); } });
  const { POST } = loaded.exports as { POST: (request: Request) => Promise<Response> };
  const call = (origin = "https://site.test") => POST(new Request("https://site.test/api/notifications/read-all", { method: "POST", headers: { origin }, body: JSON.stringify({ userId: "other" }) }));
  return { rows, call, queries: () => queries, updates: () => updates };
}

test("모두 읽기는 표시 개수 제한 없이 자기 계정의 최근 90일 미확인 알림만 처리하며 반복 요청은 기존 시각을 보존한다", async () => {
  const f = fixture();
  const response = await f.call(); assert.equal(response.status, 200);
  const body = await response.json(); assert.equal(body.ok, true); assert.equal(body.userId, "owner");
  assert.match(response.headers.get("cache-control") ?? "", /private, no-store/);
  assert.equal(f.updates(), 1101); assert.ok(f.rows.slice(0, 1101).every(row => row.read_at === body.readAt));
  assert.deepEqual(f.rows.slice(1101).map(row => row.read_at), [null, null, null, null, originalReadAt, null]);
  await f.call(); assert.equal(f.updates(), 1101); assert.ok(f.rows.slice(0, 1101).every(row => row.read_at === body.readAt));
});

test("모두 읽기는 타 출처·미인증·삭제 계정을 거부하고 갱신 실패를 성공으로 표시하지 않는다", async () => {
  const cross = fixture(); assert.equal((await cross.call("https://other.test")).status, 403); assert.equal(cross.queries(), 0);
  for (const options of [{ authenticated: false }, { deleted: true }]) { const f = fixture(options); assert.equal((await f.call()).status, 401); assert.equal(f.queries(), 0); }
  const f = fixture({ fail: true }); assert.equal((await f.call()).status, 500); assert.equal(f.updates(), 0);
});

test("클라이언트는 읽은 시각을 덮어쓰거나 요청 후 새로 도착한 알림을 읽음으로 바꾸지 않는다", () => {
  const items = [{ id: "recent", read_at: null, created_at: recentCreatedAt }, { id: "read", read_at: originalReadAt, created_at: recentCreatedAt }, { id: "new", read_at: null, created_at: "2099-01-01" }, { id: "expired", read_at: null, created_at: "2025-01-01" }];
  const next = applyNotificationsReadAll(items, now);
  assert.equal(next[0].read_at, now); assert.equal(next[1], items[1]); assert.equal(next[2], items[2]); assert.equal(next[3], items[3]);
  assert.equal(getNotificationsReadAll(new CustomEvent("read", { detail: { userId: "owner", readAt: "invalid" } })), null);
  assert.deepEqual(getNotificationsReadAll(new CustomEvent("read", { detail: { userId: "owner", readAt: originalReadAt } })), { userId: "owner", readAt: originalReadAt });
});

test("shared read-all action is dark and rendered only for the authoritative unread total", async () => {
  const { createElement } = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { NotificationPanel } = await import("../app/components/ui/notification-panel");
  const item = { id: "notice", title: "Notice", message: "Message", createdAt: recentCreatedAt, unread: true, href: "/faq" };
  const render = (items: typeof item[], unreadCount?: number, enabled = true) => renderToStaticMarkup(createElement(NotificationPanel, { items, unreadCount, onReadAll: enabled ? () => {} : undefined }));
  const visible = render([item]);
  assert.match(visible, /site-button-primary/);
  assert.match(visible, /site-notification-read-all-dock/);
  assert.match(visible, /data-read-all="true"/);
  for (const html of [render([]), render([{ ...item, unread: false }]), render([item], 0), render([item], 1, false)]) {
    assert.doesNotMatch(html, /site-notification-read-all-dock/);
    assert.doesNotMatch(html, /data-read-all=/);
  }
  // The total can include unread notifications outside the currently displayed page.
  assert.match(render([{ ...item, unread: false }], 12), /site-notification-read-all-dock/);
});
