import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

// Runs the real orchestration and NHN adapter against isolated DB responses and
// mocked HTTP. Never loads .env files, contacts NHN or writes operating data.
type Row = Record<string, unknown>;
const menuId = "33333333-3333-4333-8333-333333333333";
const orderId = "22222222-2222-4222-8222-222222222222";
const pointId = "44444444-4444-4444-8444-444444444444";
const actorId = "11111111-1111-4111-8111-111111111111";
const harness = {
  authorized: true, dashboard: true, conflictOnInsert: false,
  order: {} as Row, attempts: [] as Row[], operations: [] as { table: string; kind: string }[],
  getDb() {
    return { from(table: string) {
      let kind = "select", patch: Row = {}, fields = "";
      const filters: [string, unknown][] = [];
      const chain = {
        select(value: string) { fields = value; return chain; },
        insert(value: Row) { kind = "insert"; patch = value; return chain; },
        update(value: Row) { kind = "update"; patch = value; return chain; },
        eq(key: string, value: unknown) { filters.push([key, value]); return chain; },
        in(key: string, values: unknown[]) { filters.push([key, values]); return chain; },
        is(key: string, value: unknown) { filters.push([key, value]); return chain; },
        order() { return chain; }, limit() { return chain; },
        async single() { const result = run(); return { ...result, data: result.data?.[0] ?? null }; },
        async maybeSingle() { const result = run(); return { ...result, data: result.data?.[0] ?? null }; },
        then(resolve: (value: unknown) => unknown) { return Promise.resolve(run()).then(resolve); },
      };
      function run(): { data: Row[] | null; error: { code: string } | null } {
        harness.operations.push({ table, kind });
        if (kind === "insert") {
          assert.equal(table, "menu_order_alimtalk_attempts");
          assert.equal(patch.menu_site_id, menuId); assert.equal(patch.order_id, orderId);
          const competing = harness.conflictOnInsert;
          harness.conflictOnInsert = false;
          const row = { ...patch, id: randomUUID(), status: "pending", provider_message_id: null,
            submission_started_at: null, created_at: new Date().toISOString() };
          if (competing) {
            harness.attempts.push(row);
            return { data: null, error: { code: "23505" } };
          }
          if (harness.attempts.some(a => a.status === "pending")) return { data: null, error: { code: "23505" } };
          harness.attempts.push(row);
          return { data: [row], error: null };
        }
        let rows: Row[];
        if (table === "menu_order_alimtalk_attempts") rows = [...harness.attempts].sort((a, b) => Number(b.attempt_no) - Number(a.attempt_no));
        else if (table === "menu_customer_orders") rows = [harness.order];
        else if (table === "menu_sites") rows = [{ id: menuId, restaurant_name: "샘플 매장", business_name: null, name: "테스트 메뉴판" }];
        else if (table === "menu_tables") rows = [{ id: pointId, menu_site_id: menuId, label: "테이블 1" }];
        else if (table === "menu_floor_plans") rows = [];
        else throw new Error("Unexpected test table");
        if (table !== "menu_sites") assert(filters.some(([key, value]) => key === "menu_site_id" && value === menuId), `${table} must be scoped to the menu`);
        const matched = rows.filter(row => filters.every(([key, value]) => Array.isArray(value) ? value.includes(row[key]) : row[key] === value));
        if (kind === "update") for (const row of matched) Object.assign(row, patch);
        assert(fields.length > 0 || kind === "update");
        return { data: fields.includes("menu_order_alimtalk_attempts(")
          ? matched.map(row => ({ ...row, menu_order_alimtalk_attempts: [...harness.attempts].sort((a, b) => Number(b.attempt_no) - Number(a.attempt_no)).slice(0, 1) }))
          : matched, error: null };
      }
      return chain;
    } };
  },
};
const slot = globalThis as typeof globalThis & { orderAlimtalkTest: typeof harness };
slot.orderAlimtalkTest = harness;
const bundle = await build({
  entryPoints: [fileURLToPath(new URL("./server/order-ready-alimtalk-service.ts", import.meta.url))],
  bundle: true, platform: "node", format: "esm", write: false,
  plugins: [{ name: "order-alimtalk-test", setup(b) {
    b.onResolve({ filter: /^(server-only|.*menu-site-access-service|.*supabase\/admin|.*server\/order-management-service)$/ }, args => ({ path: args.path, namespace: "test" }));
    b.onLoad({ filter: /.*/, namespace: "test" }, args => ({ contents: args.path === "server-only" ? "export {};"
      : args.path.endsWith("supabase/admin") ? "export const createAdminClient=()=>globalThis.orderAlimtalkTest.getDb();"
      : args.path.endsWith("order-management-service") ? `export async function assertDashboardEnabled(menu){if(menu!=='${menuId}')throw new Error('MENU_SCOPE');if(!globalThis.orderAlimtalkTest.dashboard)throw new Error('DASHBOARD_DISABLED');}`
      : `export async function requireMenuSitePermission(){if(!globalThis.orderAlimtalkTest.authorized)throw new Error('PERMISSION_DENIED');}
         export async function requireMenuSiteWriteAccess(menu,permission,surface){
           if(menu!=='${menuId}'||permission!=='order.manage'||surface!=='order_alimtalk')throw new Error('WRITE_SCOPE');
           await requireMenuSitePermission();return {context:{actorUserId:'${actorId}'},supabase:globalThis.orderAlimtalkTest.getDb()};}` }));
  } }],
});
const { handleOrderAlimtalk, listOrderAlimtalkDetails } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].contents).toString("base64")}`) as typeof import("./server/order-ready-alimtalk-service");
const ok = { isSuccessful: true, resultCode: 0 };
function setup(t: test.TestContext, scenario: "success" | "unapproved" | "timeout" | "reject-first" | "served-during-prepare" = "success") {
  const saved = { ...process.env }; t.after(() => { process.env = saved; });
  Object.assign(process.env, { ORDER_ALIMTALK_ENABLED: "true", ORDER_ALIMTALK_MENU_SITE_ID: menuId,
    ORDER_ALIMTALK_NHN_APP_KEY: "fake-app", ORDER_ALIMTALK_NHN_SECRET_KEY: "fake-secret",
    ORDER_ALIMTALK_NHN_SENDER_KEY: "a".repeat(40), ORDER_ALIMTALK_NHN_CHANNEL_ID: "@샘플매장", ORDER_ALIMTALK_NHN_TEMPLATE_CODE: "cooking_ready_v1" });
  harness.authorized = true; harness.dashboard = true; harness.conflictOnInsert = false; harness.operations = []; harness.attempts = [];
  harness.order = { id: orderId, menu_site_id: menuId, status: "ready", notification_phone: "01000000000", order_number: 301,
    menu_table_id: pointId, service_table_id: null };
  const calls: { method: string; path: string }[] = [];
  let sends = 0;
  t.mock.method(globalThis, "fetch", async (url: string, init: RequestInit) => {
    const path = new URL(url).pathname; calls.push({ method: init.method ?? "GET", path });
    if (path.includes("/templates/")) {
      if (scenario === "served-during-prepare") harness.order.status = "served";
      return Response.json({ header: ok, template: {
        plusFriendId: "@샘플매장", senderKey: "a".repeat(40), templateCode: "cooking_ready_v1",
        status: scenario === "unapproved" ? "TSC02" : "TSC03", block: false, dormant: false,
        templateMessageType: "BA", templateEmphasizeType: "NONE", templateContent: "[#{매장명}] #{룸명} #{테이블명} #{주문번호}",
      } });
    }
    if (path.endsWith("/messages")) {
      sends++;
      assert.equal(init.method, "POST");
      const body = JSON.parse(String(init.body));
      assert.equal(body.recipientList[0].resendParameter.isResend, false);
      assert.deepEqual(body.recipientList[0].templateParameter, { 매장명: "샘플 매장", 룸명: "룸 미지정", 테이블명: "테이블 1", 주문번호: "301" });
      assert(harness.attempts.at(-1)?.submission_started_at, "submission must be reserved before HTTP POST");
      if (scenario === "timeout") throw new Error("simulated lost receipt");
      if (scenario === "reject-first" && sends === 1) return Response.json({ header: { isSuccessful: false, resultCode: -1001 } }, { status: 400 });
      return Response.json({ header: ok, message: { requestId: "test-request", sendResults: [{ recipientSeq: 1, recipientNo: "01000000000", resultCode: 0 }] } });
    }
    assert(path.endsWith("/messages/test-request/1"));
    return Response.json({ header: ok, message: { requestId: "test-request", recipientSeq: 1, senderKey: "a".repeat(40),
      templateCode: "cooking_ready_v1", messageStatus: "COMPLETED", resultCode: "1000" } });
  });
  return calls;
}
const send = (expectedAttemptId: string | null = null) => handleOrderAlimtalk(menuId, { intent: "send", orderId, expectedAttemptId });

test("disabled sending, unauthorized staff and disabled operations cannot submit a message", async t => {
  const calls = setup(t);
  process.env.ORDER_ALIMTALK_ENABLED = "false";
  await assert.rejects(send(), /발송 설정/);
  assert.equal(harness.operations.length, 0);
  process.env.ORDER_ALIMTALK_ENABLED = "true"; harness.authorized = false;
  await assert.rejects(send(), /PERMISSION_DENIED/);
  harness.authorized = true; harness.dashboard = false;
  await assert.rejects(send(), /DASHBOARD_DISABLED/);
  assert.equal(calls.length, 0); assert.equal(harness.attempts.length, 0);
});
test("unapproved live-template shape stops before submission and leaves the ready order untouched", async t => {
  const calls = setup(t, "unapproved");
  assert.equal((await send()).status, "failed");
  assert(!calls.some(c => c.method === "POST"));
  assert.equal(harness.attempts[0].submission_started_at, null);
  assert.equal(harness.order.status, "ready");
});
test("acceptance, delivery confirmation and physical serving remain separate", async t => {
  const calls = setup(t);
  const accepted = await send(); assert.equal(accepted.status, "pending");
  const delivered = await handleOrderAlimtalk(menuId, { intent: "check", orderId, expectedAttemptId: accepted.id });
  assert.equal(delivered.status, "sent"); assert.equal(harness.order.status, "ready");
  assert.equal(calls.filter(c => c.method === "POST").length, 1);
  assert(!harness.operations.some(o => o.table === "menu_customer_orders" && o.kind === "update"));
});
test("pausing new messages preserves history and allows an accepted receipt to finish", async t => {
  const calls = setup(t);
  const accepted = await send();
  process.env.ORDER_ALIMTALK_ENABLED = "false";
  const pending = (await listOrderAlimtalkDetails(menuId, [orderId])).get(orderId);
  assert.equal(pending?.sendingEnabled, false);
  assert.equal(pending?.attempt?.id, accepted.id);
  assert.equal(pending?.attempt?.status, "pending");
  const delivered = await handleOrderAlimtalk(menuId, { intent: "check", orderId, expectedAttemptId: accepted.id });
  assert.equal(delivered.status, "sent");
  const history = (await listOrderAlimtalkDetails(menuId, [orderId])).get(orderId);
  assert.equal(history?.attempt?.status, "sent");
  await assert.rejects(send(delivered.id), /발송 설정/);
  assert.equal(calls.filter(c => c.method === "POST").length, 1);
  harness.authorized = false;
  await assert.rejects(listOrderAlimtalkDetails(menuId, [orderId]), /PERMISSION_DENIED/);
});
test("a rejected attempt can be resent once; stale clicks reuse the latest pending attempt", async t => {
  const calls = setup(t, "reject-first");
  const failed = await send(); assert.equal(failed.status, "failed");
  const retried = await send(failed.id); assert.equal(retried.status, "pending"); assert.equal(retried.number, 2);
  assert.deepEqual(await send(failed.id), retried);
  assert.equal(harness.attempts.length, 2); assert.equal(calls.filter(c => c.method === "POST").length, 2);
  assert.equal(harness.order.status, "ready");
});
test("a lost receipt stays pending and never automatically resubmits", async t => {
  const calls = setup(t, "timeout");
  const uncertain = await send(); assert.equal(uncertain.status, "pending");
  assert.deepEqual(await send(uncertain.id), uncertain);
  harness.attempts[0].created_at = new Date(Date.now() - 120_000).toISOString();
  await assert.rejects(handleOrderAlimtalk(menuId, { intent: "check", orderId, expectedAttemptId: uncertain.id }), /NHN 발송 내역/);
  assert.equal(calls.filter(c => c.method === "POST").length, 1);
});
test("an order served while the template loads is not submitted", async t => {
  const calls = setup(t, "served-during-prepare");
  assert.equal((await send()).status, "failed");
  assert.equal(harness.order.status, "served"); assert(!calls.some(c => c.method === "POST"));
});
test("a competing DB reservation is reused without another provider request", async t => {
  const calls = setup(t); harness.conflictOnInsert = true;
  const result = await send(); assert.equal(result.status, "pending");
  assert.equal(harness.attempts.length, 1); assert.equal(calls.length, 0);
});
