import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import * as tokens from "./table-qr-session-tokens";
import { normalizeMenuTableId } from "./menu-table-validation";
import { getPublicMenuPath } from "./menu-url";

const menuId = "11111111-1111-4111-8111-111111111111";
const tableId = "22222222-2222-4222-8222-222222222222";
const otherTableId = "33333333-3333-4333-8333-333333333333";
const token = "a".repeat(43), userAgent = "Test tablet browser";
function moduleWith<T>(path: string, dependencies: Record<string, unknown>): T {
  const code = ts.transpileModule(readFileSync(new URL(`../${path}`, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const loaded = { exports: {} };
  new Function("require", "module", "exports", code)((name: string) => { assert.ok(name in dependencies, name); return dependencies[name]; }, loaded, loaded.exports);
  return loaded.exports as T;
}
function serviceFixture({ channel = "terminal", expired = false, revoked = false, denied = false, published = true, fail = false } = {}) {
  const row: Record<string, unknown> = { id: "session", menu_site_id: menuId, menu_table_id: tableId, token_hash: tokens.hashTableAccessToken(token), user_agent_hash: tokens.hashTableVisitUserAgent(userAgent), access_channel: channel, revoked_at: revoked ? "2020-01-01" : null, expires_at: expired ? "2020-01-01" : "2099-01-01" };
  const filters: [string, string, unknown][] = [], writes: unknown[] = [], permissions: unknown[] = [];
  let reads = 0;
  const db = { from(name: string) {
    if (name === "menu_sites") return { select() { return this; }, eq() { return this; }, async maybeSingle() { return { data: { slug: "store", status: published ? "published" : "draft" }, error: null }; } };
    assert.equal(name, "table_visit_sessions"); reads++;
    const scoped: [string, string, unknown][] = [];
    let mutation: unknown;
    const query = {
      select() { return this; },
      update(value: unknown) { mutation = value; return this; },
      eq(key: string, value: unknown) { scoped.push(["eq", key, value]); filters.push(["eq", key, value]); return this; },
      is(key: string, value: unknown) { scoped.push(["eq", key, value]); filters.push(["eq", key, value]); return this; },
      gt(key: string, value: string) { scoped.push(["gt", key, value]); filters.push(["gt", key, value]); return this; },
      async maybeSingle() {
        const match = scoped.every(([op, key, value]) => op === "gt" ? String(row[key]) > String(value) : row[key] === value);
        if (mutation && match && !fail) writes.push(mutation);
        return { data: match ? { id: row.id, menu_table_id: row.menu_table_id } : null, error: fail ? { message: "query failed" } : null };
      },
    };
    return query;
  } };
  const service = moduleWith<typeof import("./server/table-terminal-service")>("lib/server/table-terminal-service.ts", {
    "server-only": {}, "@/lib/supabase/admin": { createAdminClient: () => db },
    "@/lib/server/menu-site-access-service": {
      requireMenuSitePermission: async (...args: unknown[]) => { permissions.push(args); if (denied) throw new Error("permission denied"); },
      requireMenuSiteWriteAccess: async (...args: unknown[]) => { permissions.push(args); if (denied) throw new Error("permission denied"); },
      getMenuSiteAccessStateForMenuSite: async () => ({ canUseWriteActions: true, canViewPublic: true, planType: "business_basic" }),
    },
    "@/lib/table-management-runtime": { isTableManagementRuntimeEnabledForSite: () => true },
    "@/lib/menu-table-management": { normalizeMenuTableId }, "@/lib/table-qr-session-tokens": tokens,
    "@/lib/menu-url": { getPublicMenuPath },
  });
  return { service, filters, writes, permissions, reads: () => reads };
}

test("현재 태블릿 상태 조회는 유효한 동일 매장·기기 terminal 연결만 반환하며 세션을 갱신하지 않는다", async () => {
  const f = serviceFixture();
  assert.equal(await f.service.getCurrentTableTerminalId(menuId, undefined, userAgent), null);
  assert.equal(f.reads(), 0);
  assert.equal(await f.service.getCurrentTableTerminalId(menuId, token, userAgent), tableId);
  assert.equal(await f.service.getCurrentTableTerminalId(menuId, token, "another browser"), null);
  assert.deepEqual(f.writes, []);
  for (const options of [{ channel: "customer" }, { expired: true }, { revoked: true }]) {
    assert.equal(await serviceFixture(options).service.getCurrentTableTerminalId(menuId, token, userAgent), null);
  }
  await assert.rejects(serviceFixture({ denied: true }).service.getCurrentTableTerminalId(menuId, token, userAgent), /permission denied/);
  await assert.rejects(serviceFixture({ fail: true }).service.getCurrentTableTerminalId(menuId, token, userAgent), /연결 상태/);
});

test("연결 해제는 현재 기기의 선택한 테이블만 대상으로 하고 다른 테이블·손님 세션·만료·권한 없음은 거부한다", async () => {
  const f = serviceFixture();
  await f.service.unregisterTableTerminal(menuId, tableId, token, userAgent);
  assert.equal(f.writes.length, 1);
  assert.ok(f.filters.some(([, key, value]) => key === "menu_table_id" && value === tableId));
  assert.ok(f.filters.some(([, key, value]) => key === "access_channel" && value === "terminal"));
  for (const [options, target, browser] of [[{}, otherTableId, userAgent], [{}, tableId, "other browser"], [{ channel: "customer" }, tableId, userAgent], [{ expired: true }, tableId, userAgent], [{ revoked: true }, tableId, userAgent], [{ denied: true }, tableId, userAgent]] as const) {
    const bad = serviceFixture(options);
    await assert.rejects(bad.service.unregisterTableTerminal(menuId, target, token, browser));
    assert.deepEqual(bad.writes, []);
  }
});

test("메뉴판 열기는 선택한 테이블 연결과 공개 상태를 다시 확인한다", async () => {
  const f = serviceFixture();
  assert.equal(await f.service.getTableTerminalMenuPath(menuId, tableId, token, userAgent), "/menu/store?mode=terminal");
  await assert.rejects(f.service.getTableTerminalMenuPath(menuId, otherTableId, token, userAgent), /먼저/);
  await assert.rejects(serviceFixture({ published: false }).service.getTableTerminalMenuPath(menuId, tableId, token, userAgent), /공개/);
  assert.deepEqual(f.writes, []);
});

function actionFixture({ rejected = false, logoutFailed = false } = {}) {
  let signOuts = 0, deleted = 0, set = 0;
  class ConnectionError extends Error {}
  class AccessError extends Error {}
  const dependencies = {
    "next/cache": { revalidatePath() {} }, "next/headers": { cookies: async () => ({ get: () => ({ value: token }), set: () => { set++; }, delete: () => { deleted++; } }), headers: async () => ({ get: () => userAgent }) },
    "next/navigation": { redirect(path: string) { throw { redirect: path }; } },
    "@/lib/supabase/server": { createClient: async () => ({ auth: { signOut: async () => { signOuts++; return { error: logoutFailed ? new Error("logout failed") : null }; } } }) },
    "@/lib/server/table-terminal-service": { TableTerminalConnectionError: ConnectionError, registerTableTerminal: async () => ({ token, expiresAt: "2099-01-01", path: "/unused" }), getTableTerminalMenuPath: async () => { if (rejected) throw new ConnectionError("먼저 연결해 주세요."); return "/menu/store?mode=terminal"; }, unregisterTableTerminal: async () => { if (rejected) throw new ConnectionError("연결되지 않은 테이블"); } },
    "@/lib/table-qr-session-tokens": tokens, "@/lib/menu-site-permissions": { MenuSiteAccessError: AccessError },
    "@/lib/server/menu-table-management-service": { MenuTableManagementError: AccessError }, "./action-state": { initialMenuTableActionState: { status: "idle", message: "", tableId: null, qrPath: null } },
  };
  const actions = moduleWith<typeof import("../app/mypage/menus/[menuId]/tables/actions")>("app/mypage/menus/[menuId]/tables/actions.ts", dependencies);
  const submit = (intent: string) => { const data = new FormData(); data.set("menuSiteId", menuId); data.set("tableId", tableId); data.set("intent", intent); return actions.mutateMenuTableAction({ status: "idle", message: "", tableId: null, qrPath: null }, data); };
  return { submit, counts: () => ({ signOuts, deleted, set }) };
}

test("연결 버튼은 관리자 로그아웃과 연결 쿠키 저장 후 자동으로 메뉴판을 연다", async () => {
  const f = actionFixture();
  await assert.rejects(f.submit("register-terminal"), error => { assert.deepEqual(error, { redirect: "/unused" }); return true; });
  assert.deepEqual(f.counts(), { signOuts: 1, deleted: 0, set: 1 });
  const failed = actionFixture({ logoutFailed: true });
  assert.equal((await failed.submit("register-terminal")).status, "error");
  assert.equal(failed.counts().set, 0);
});

test("연결된 메뉴판을 다시 열 때도 관리자 로그아웃 후 손님용 화면으로 이동한다", async () => {
  const f = actionFixture();
  await assert.rejects(f.submit("open-terminal-menu"), error => { assert.deepEqual(error, { redirect: "/menu/store?mode=terminal" }); return true; });
  assert.equal(f.counts().signOuts, 1);
  const rejected = actionFixture({ rejected: true });
  assert.equal((await rejected.submit("open-terminal-menu")).status, "error");
  assert.equal(rejected.counts().signOuts, 0);
  assert.equal((await actionFixture({ logoutFailed: true }).submit("open-terminal-menu")).status, "error");
});

test("연결 해제가 거부되면 현재 기기의 연결 쿠키를 지우지 않는다", async () => {
  const rejected = actionFixture({ rejected: true });
  assert.equal((await rejected.submit("unregister-terminal")).status, "error");
  assert.equal(rejected.counts().deleted, 0);
  const success = actionFixture();
  assert.equal((await success.submit("unregister-terminal")).status, "success");
  assert.equal(success.counts().deleted, 1);
});
