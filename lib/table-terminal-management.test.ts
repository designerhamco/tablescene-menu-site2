import * as orderPointName from "./order-point-name";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import * as tokens from "./table-qr-session-tokens";
import { normalizeMenuTableId } from "./menu-table-validation";
import { getPublicMenuPath } from "./menu-url";
import * as deviceInfo from "./terminal-device-info";
import { isPaidTableOperationsEligible } from "./table-operations-eligibility";

const menuId = "11111111-1111-4111-8111-111111111111";
const tableId = "22222222-2222-4222-8222-222222222222";
const otherTableId = "33333333-3333-4333-8333-333333333333";
const connectionId = "44444444-4444-4444-8444-444444444444";
const token = "a".repeat(43), userAgent = "Test tablet browser";
function moduleWith<T>(path: string, dependencies: Record<string, unknown>): T {
  const code = ts.transpileModule(readFileSync(new URL(`../${path}`, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const loaded = { exports: {} };
  new Function("require", "module", "exports", code)((name: string) => { assert.ok(name in dependencies, name); return dependencies[name]; }, loaded, loaded.exports);
  return loaded.exports as T;
}
function serviceFixture({ channel = "terminal", expired = false, revoked = false, denied = false, published = true, fail = false, eligible = true, missingMetadata = false, missingRpc = false } = {}) {
  const row: Record<string, unknown> = { id: connectionId, menu_site_id: menuId, menu_table_id: tableId, token_hash: tokens.hashTableAccessToken(token), user_agent_hash: tokens.hashTableVisitUserAgent(userAgent), access_channel: channel, revoked_at: revoked ? "2020-01-01" : null, expires_at: expired ? "2020-01-01" : "2099-01-01", created_at: "2026-11-01", device_info: { kind: "태블릿", os: "iPadOS 27.0.1", model: "iPad Pro 11", browser: "Safari" } };
  const filters: [string, string, unknown][] = [], writes: unknown[] = [], permissions: unknown[] = [];
  let reads = 0;
  const registrations: Array<[string, Record<string, unknown>]> = [];
  const db = { from(name: string) {
    if (name === "menu_sites") return { select() { return this; }, eq() { return this; }, async maybeSingle() { return { data: { slug: "store", status: published ? "published" : "draft", template_key: "cafe_design_a" }, error: null }; } };
    if (name === "menu_tables") return { select() { return this; }, eq() { return this; }, async maybeSingle() { return { data: { id: tableId, status: "active" }, error: null }; } };
    assert.equal(name, "table_visit_sessions"); reads++;
    const scoped: [string, string, unknown][] = [];
    let mutation: unknown;
    let columns = "";
    const query = {
      select(value: string) { columns = value; return this; },
      order() { return this; }, limit() { return this; },
      update(value: unknown) { mutation = value; return this; },
      eq(key: string, value: unknown) { scoped.push(["eq", key, value]); filters.push(["eq", key, value]); return this; },
      is(key: string, value: unknown) { scoped.push(["eq", key, value]); filters.push(["eq", key, value]); return this; },
      gt(key: string, value: string) { scoped.push(["gt", key, value]); filters.push(["gt", key, value]); return this; },
      async maybeSingle() {
        const match = scoped.every(([op, key, value]) => op === "gt" ? String(row[key]) > String(value) : row[key] === value);
        if (mutation && match && !fail) writes.push(mutation);
        return { data: match ? row : null, error: fail ? { message: "query failed" } : null };
      },
      then(resolve: (value: unknown) => unknown) {
        const match = scoped.every(([op, key, value]) => op === "gt" ? String(row[key]) > String(value) : row[key] === value);
        const error = fail ? { code: "08006", message: "query failed" } : missingMetadata && columns.includes("device_info") ? { code: "42703", message: "device_info missing" } : null;
        const data = match ? [{ ...row, ...(missingMetadata ? { device_info: undefined } : {}) }] : [];
        return Promise.resolve(resolve({ data, error, count: data.length }));
      },
    };
    return query;
  }, async rpc(name: string, args: Record<string, unknown>) {
    registrations.push([name, args]);
    return { data: connectionId, error: fail ? { code: "42501" } : missingRpc && name.endsWith("with_device") ? { code: "PGRST202" } : null };
  } };
  const service = moduleWith<typeof import("./server/table-terminal-service")>("lib/server/table-terminal-service.ts", {
    "server-only": {}, "@/lib/supabase/admin": { createAdminClient: () => db },
    "@/lib/server/menu-site-access-service": {
      requireMenuSitePermission: async (...args: unknown[]) => { permissions.push(args); if (denied) throw new Error("permission denied"); },
      requireMenuSiteWriteAccess: async (...args: unknown[]) => { permissions.push(args); if (denied) throw new Error("permission denied"); },
      getMenuSiteAccessStateForMenuSite: async () => ({ canEdit: eligible, canUseWriteActions: eligible, canViewPublic: true, planType: "business_basic" }),
    },
    "@/lib/table-management-runtime": { isTableManagementRuntimeEnabledForSite: () => true },
    "@/lib/menu-table-management": { normalizeMenuTableId }, "@/lib/table-qr-session-tokens": tokens,
    "@/lib/menu-url": { getPublicMenuPath },
    "@/lib/terminal-device-info": deviceInfo, "@/lib/table-operations-eligibility": { isPaidTableOperationsEligible },
  });
  return { service, filters, writes, permissions, registrations, reads: () => reads };
}

test("새 연결은 정리한 기기 정보를 등록하며 SQL 미적용 때만 기존 등록 RPC로 호환한다", async () => {
  const f = serviceFixture();
  const registered = await f.service.registerTableTerminal(menuId, tableId, userAgent, token, { kind: "태블릿", os: "iPadOS 27", model: "iPad Pro 11", browser: "Safari", credential: "drop" });
  assert.match(registered.path, /mode=terminal/); assert.equal(f.registrations.length, 1);
  assert.deepEqual(f.registrations[0][1].p_device_info, { kind: "태블릿", os: "iPadOS 27", model: "iPad Pro 11", browser: "Safari" });
  assert.equal(f.registrations[0][1].p_previous_token_hash, tokens.hashTableAccessToken(token));
  const legacy = serviceFixture({ missingRpc: true }); await legacy.service.registerTableTerminal(menuId, tableId, userAgent);
  assert.deepEqual(legacy.registrations.map(row => row[0]), ["register_table_terminal_visit_with_device", "register_table_terminal_visit"]);
  const failed = serviceFixture({ fail: true }); await assert.rejects(failed.service.registerTableTerminal(menuId, tableId, userAgent)); assert.equal(failed.registrations.length, 1);
});

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

test("기기 목록은 매장 terminal만 반환하고 인증값을 노출하지 않으며 이전 연결도 보존한다", async () => {
  const f = serviceFixture();
  const list = await f.service.listTableTerminalConnections(menuId, token, userAgent);
  assert.equal(list.length, 1); assert.equal(list[0].current, true); assert.equal(list[0].device?.model, "iPad Pro 11");
  assert.doesNotMatch(JSON.stringify(list), /token_hash|user_agent_hash|expires_at/);
  assert.equal((await f.service.listTableTerminalConnections(menuId, undefined, userAgent))[0].current, false);
  assert.equal((await serviceFixture({ missingMetadata: true }).service.listTableTerminalConnections(menuId, token, userAgent))[0].device, null);
  for (const options of [{ channel: "customer" }, { expired: true }, { revoked: true }]) assert.deepEqual(await serviceFixture(options).service.listTableTerminalConnections(menuId, token, userAgent), []);
  for (const options of [{ denied: true }, { eligible: false }, { fail: true }]) await assert.rejects(serviceFixture(options).service.listTableTerminalConnections(menuId, token, userAgent));
  assert.deepEqual(f.writes, []);
});

test("다른 기기의 연결 해제는 지정 매장·테이블·terminal 한 건만 바꾸고 현재 기기 여부를 구분한다", async () => {
  const f = serviceFixture();
  assert.deepEqual(await f.service.revokeTableTerminalConnection(menuId, tableId, connectionId, undefined, "PC browser"), { current: false });
  assert.equal(f.writes.length, 1);
  const current = serviceFixture({ published: false });
  assert.deepEqual(await current.service.revokeTableTerminalConnection(menuId, tableId, connectionId, token, userAgent), { current: true });
  for (const [options, target, selected] of [[{}, otherTableId, connectionId], [{}, tableId, otherTableId], [{ channel: "customer" }, tableId, connectionId], [{ expired: true }, tableId, connectionId], [{ revoked: true }, tableId, connectionId], [{ denied: true }, tableId, connectionId], [{ eligible: false }, tableId, connectionId]] as const) {
    const bad = serviceFixture(options); await assert.rejects(bad.service.revokeTableTerminalConnection(menuId, target, selected, token, userAgent)); assert.deepEqual(bad.writes, []);
  }
});

test("메뉴판 열기는 선택한 테이블 연결과 공개 상태를 다시 확인한다", async () => {
  const f = serviceFixture();
  assert.equal(await f.service.getTableTerminalMenuPath(menuId, tableId, token, userAgent), "/menu/store?mode=terminal");
  await assert.rejects(f.service.getTableTerminalMenuPath(menuId, otherTableId, token, userAgent), /먼저/);
  await assert.rejects(serviceFixture({ published: false }).service.getTableTerminalMenuPath(menuId, tableId, token, userAgent), /공개/);
  assert.deepEqual(f.writes, []);
});

function actionFixture({ registerFailed = false, rejected = false, logoutFailed = false, revokedCurrent = false, featureFailed = false, notOwner = false, rollbackFailed = false, restoreConflict = false } = {}) {
  const events: unknown[] = [];
  let signOuts = 0, deleted = 0, set = 0;
  class ConnectionError extends Error {}
  class AccessError extends Error {}
  class ManagementError extends Error { code = "TABLE_CONFLICT"; }
  const dependencies = {
    "@/lib/order-point-name": orderPointName,
    "next/cache": { revalidatePath() {} }, "next/headers": { cookies: async () => ({ get: () => ({ value: token }), set: () => { set++; }, delete: () => { deleted++; } }), headers: async () => ({ get: () => userAgent }) },
    "next/navigation": { redirect(path: string) { throw { redirect: path }; } },
    "@/lib/supabase/server": { createClient: async () => ({ auth: { signOut: async () => { events.push("logout"); signOuts++; return { error: logoutFailed ? new Error("logout failed") : null }; } } }) },
    "@/lib/server/table-terminal-service": { TableTerminalConnectionError: ConnectionError, registerTableTerminal: async () => { events.push("connect"); if (registerFailed) throw new ConnectionError("연결 실패"); return { token, expiresAt: "2099-01-01", path: "/unused" }; }, getTableTerminalMenuPath: async () => { if (rejected) throw new ConnectionError("먼저 연결해 주세요."); return "/menu/store?mode=terminal"; }, unregisterTableTerminal: async () => { events.push("rollback"); if (rollbackFailed) throw new Error("rollback failed"); if (rejected) throw new ConnectionError("연결되지 않은 테이블"); }, revokeTableTerminalConnection: async () => { if (rejected) throw new ConnectionError("해제 실패"); return { current: revokedCurrent }; } },
    "@/lib/table-qr-session-tokens": tokens, "@/lib/menu-site-permissions": { MenuSiteAccessError: AccessError },
    "@/lib/server/menu-site-access-service": { requireMenuSitePermission: async () => { events.push("owner"); return {isOwner:!notOwner}; } },
    "@/lib/server/menu-table-management-service": { MenuTableManagementError: ManagementError, restoreMenuTable: async () => { if (restoreConflict) throw new ManagementError("중복 이름"); return { id: tableId, label: "복원 이름" }; }, resumeMenuTable: async () => {events.push("resume");}, setOrderPointFeature: async (input:unknown) => {events.push(input);if(featureFailed) throw new Error("concurrent change");} }, "./action-state": { initialMenuTableActionState: { status: "idle", message: "", tableId: null, qrPath: null } },
  };
  const actions = moduleWith<typeof import("../app/mypage/menus/[menuId]/tables/actions")>("app/mypage/menus/[menuId]/tables/actions.ts", dependencies);
  const submit = (intent: string, fields:Record<string,string> = {}) => { const data = new FormData(); data.set("menuSiteId", menuId); data.set("tableId", tableId); data.set("intent", intent); for(const [key,value] of Object.entries(fields)) data.set(key,value); return actions.mutateMenuTableAction({ status: "idle", message: "", tableId: null, qrPath: null }, data); };
  return { submit, events, counts: () => ({ signOuts, deleted, set }) };
}

test("연결 저장은 관리자 로그인을 유지하고 연결 쿠키와 성공 상태만 반환한다", async () => {
  const f = actionFixture({ logoutFailed: true });
  const result = await f.submit("register-terminal");
  assert.equal(result.status, "success"); assert.equal(result.tableId, tableId); assert.equal(result.qrPath, null);
  assert.equal(result.message, "기기를 연결했습니다.");
  assert.deepEqual(f.counts(), { signOuts: 0, deleted: 0, set: 1 });
  assert.deepEqual(f.events, ["connect"]);
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

test("다른 기기를 해제하는 관리자는 자신의 쿠키·관리자 로그인 상태를 유지한다", async () => {
  for (const revokedCurrent of [false, true]) {
    const f = actionFixture({ revokedCurrent }); assert.equal((await f.submit("revoke-terminal-connection")).status, "success");
    assert.deepEqual(f.counts(), { signOuts: 0, deleted: revokedCurrent ? 1 : 0, set: 0 });
  }
  const failed = actionFixture({ rejected: true }); assert.equal((await failed.submit("revoke-terminal-connection")).status, "error"); assert.equal(failed.counts().deleted, 0);
});


test("토글 연결 저장은 권한·CAS 확인 후 기능을 켜고 관리자 화면을 유지한다",async()=>{
  for(const feature of ["orders","calls"]) {
    const f=actionFixture();
    const result = await f.submit("register-terminal",{enableFeature:feature,enableExpectedEnabled:"false",pointStatus:"active"});
    assert.equal(result.status,"success");assert.equal(result.tableId,tableId);assert.match(result.message,feature==="orders"?/주문을 켰습니다/:/호출을 켰습니다/);
    assert.deepEqual(f.events,["owner","connect",{menuSiteId:menuId,tableId,channel:"terminal",feature,enabled:true,expectedEnabled:false,expectedStatus:"active"}]);
    assert.deepEqual(f.counts(),{signOuts:0,deleted:0,set:1});
  }
  const denied=actionFixture({notOwner:true});assert.equal((await denied.submit("register-terminal",{enableFeature:"calls",enableExpectedEnabled:"false",pointStatus:"active"})).status,"error");assert.deepEqual(denied.events,["owner"]);
  const invalid=actionFixture();assert.equal((await invalid.submit("register-terminal",{enableFeature:"invalid",enableExpectedEnabled:"false",pointStatus:"active"})).status,"error");assert.deepEqual(invalid.events,[]);
  const resumed=actionFixture();assert.equal((await resumed.submit("register-terminal",{enableFeature:"calls",enableExpectedEnabled:"true",pointStatus:"disabled"})).status,"success");assert.deepEqual(resumed.events.slice(0,3),["owner","resume","connect"]);assert.deepEqual(resumed.events[3],{menuSiteId:menuId,tableId,channel:"terminal",feature:"calls",enabled:true,expectedEnabled:false,expectedStatus:"active"});
});
test("연결 후 설정 저장 실패는 새 연결을 해제하며 로그아웃·쿠키·성공 전환을 하지 않는다",async()=>{
  for(const rollbackFailed of [false,true]) {
    const f=actionFixture({featureFailed:true,rollbackFailed});
    const result=await f.submit("register-terminal",{enableFeature:"calls",enableExpectedEnabled:"false",pointStatus:"active"});
    assert.equal(result.status,"error");assert.equal(f.events.at(-1),"rollback");assert.deepEqual(f.counts(),{signOuts:0,deleted:0,set:0});
    assert.match(result.message,rollbackFailed?/해제하지 못했습니다/:/새 기기 연결을 해제했습니다/);
  }
});

test("연결 실패는 관리자 세션과 기존 연결 쿠키를 변경하지 않는다",async()=>{
 const f=actionFixture({registerFailed:true});
 assert.equal((await f.submit("register-terminal")).status,"error");
 assert.deepEqual(f.counts(),{signOuts:0,deleted:0,set:0});
});


test("복원 이름의 서버 중복 오류는 항목과 입력값을 포함해 지속 필드 오류로 반환한다",async()=>{
  const result=await actionFixture({restoreConflict:true}).submit("restore",{label:"1번 테이블"});
  assert.equal(result.status,"error");assert.equal(result.tableId,tableId);
  assert.deepEqual(result.labelError,{value:"1번 테이블",message:orderPointName.ORDER_POINT_DUPLICATE_NAME_MESSAGE});
});
