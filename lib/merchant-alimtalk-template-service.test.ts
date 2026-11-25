import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import { ORDER_READY_TEMPLATE_CONTENT } from "./order-ready-message";
type Row = Record<string, unknown>;
const menu = "33333333-3333-4333-8333-333333333333", actor = "11111111-1111-4111-8111-111111111111";
const harness = { owner: true, busy: false, lostClaim: false, row: {} as Row, operations: [] as string[], getDb() { return {
  rpc(name: string, args: Record<string, string>) {
    assert.equal(name, "reserve_menu_alimtalk_template"); assert.equal(args.p_menu_id, menu); assert.equal(args.p_actor_id, actor);
    harness.operations.push("reserve");
    return { async single() { if (harness.busy) return { data: null, error: { message: "TEMPLATE_BUSY" } };
      harness.row = { ...harness.row, template_status: "checking", template_check_id: "66666666-6666-4666-8666-666666666666" };
      return { data: { ...harness.row }, error: null }; } };
  },
  from(table: string) {
    assert.equal(table, "menu_alimtalk_channels"); let patch: Row = {}; const filters: Row = {};
    const q = { update(p: Row) { patch = p; return q; }, eq(k: string, v: unknown) { filters[k] = v; return q; },
      is(k: string, v: unknown) { filters[k] = v; return q; }, select() { return q; }, async maybeSingle() {
        assert.equal(filters.menu_site_id, menu); assert.equal(filters.actor_id, actor); assert.equal(filters.state, "connected");
        assert.equal(filters.sender_key, "a".repeat(40)); assert.equal(filters.template_check_id, harness.row.template_check_id);
        harness.operations.push(patch.template_registration_started_at ? "claim-post" : "save");
        if (harness.lostClaim || !Object.entries(filters).every(([k,v]) => harness.row[k] === v)) return { data: null, error: null };
        Object.assign(harness.row, patch); return { data: { ...harness.row }, error: null };
      } }; return q;
  },
}; } };
(globalThis as typeof globalThis & { templateTest: typeof harness }).templateTest = harness;
const bundle = await build({ entryPoints: [fileURLToPath(new URL("./server/merchant-alimtalk-template-service.ts", import.meta.url))], bundle: true,
  platform: "node", format: "esm", write: false, plugins: [{ name: "isolated-db", setup(b) {
    b.onResolve({ filter: /^(server-only|.*menu-site-access-service)$/ }, a => ({ path: a.path, namespace: "test" }));
    b.onLoad({ filter: /.*/, namespace: "test" }, a => ({ contents: a.path === "server-only" ? "export {};"
      : `export async function requireMenuSiteWriteAccess(id,permission,surface){if(id!=='${menu}'||permission!=='menu.edit'||surface!=='menu_order_settings')throw new Error('SCOPE');return {context:{isOwner:globalThis.templateTest.owner,actorUserId:'${actor}'},supabase:globalThis.templateTest.getDb()};}` }));
  } }] });
const { prepareMerchantAlimtalkTemplate } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].contents).toString("base64")}`) as typeof import("./server/merchant-alimtalk-template-service");
function setup(t: test.TestContext, mode: "missing" | "approved" | "conflict" | "timeout" = "missing") {
  const saved = { ...process.env }; t.after(() => { process.env = saved; });
  Object.assign(process.env, { ORDER_ALIMTALK_ENABLED: "false", ORDER_ALIMTALK_NHN_APP_KEY: "fake-app", ORDER_ALIMTALK_NHN_SECRET_KEY: "fake-secret" });
  harness.owner = true; harness.busy = false; harness.lostClaim = false; harness.operations = [];
  harness.row = { menu_site_id: menu, actor_id: actor, state: "connected", sender_key: "a".repeat(40), channel_id: "@샘플매장", category_code: "01100040001",
    template_registration_started_at: null, template_status: "unregistered", challenge_id: "44444444-4444-4444-8444-444444444444", verify_attempts: 0, sending_enabled: false };
  let posts = 0;
  t.mock.method(globalThis, "fetch", async (url: string, init: RequestInit) => {
    assert(!url.includes("/messages"));
    if (init.method === "POST") {
      assert(url.endsWith("/templates")); assert(harness.row.template_registration_started_at, "persist before POST"); posts++;
      if (mode === "timeout") throw new Error("lost response");
      return Response.json({ header: { isSuccessful: true, resultCode: 0 } });
    }
    if (url.endsWith("/templates/cooking_ready_v1")) return Response.json({ header: { isSuccessful: true, resultCode: 0 }, template: {
      senderKey: "a".repeat(40), plusFriendId: "@샘플매장", templateCode: "cooking_ready_v1", templateContent: mode === "conflict" ? "원래 매장의 다른 문구" : ORDER_READY_TEMPLATE_CONTENT,
      templateMessageType: "BA", templateEmphasizeType: "NONE", status: "TSC03", block: false, dormant: false,
    } });
    if (url.includes("/templates?")) {
      const rows = mode === "approved" || mode === "conflict" ? [{ senderKey: "a".repeat(40), plusFriendId: "@샘플매장", templateCode: "cooking_ready_v1",
        templateContent: mode === "conflict" ? "원래 매장의 다른 문구" : ORDER_READY_TEMPLATE_CONTENT,
        templateMessageType: "BA", templateEmphasizeType: "NONE", status: "TSC03", block: false, dormant: false }] : [];
      return Response.json({ header: { isSuccessful: true, resultCode: 0 }, templateListResponse: { totalCount: rows.length, templates: rows } });
    }
    return Response.json({ header: { isSuccessful: true, resultCode: 0 }, sender: { senderKey: "a".repeat(40), plusFriendId: "@샘플매장", categoryCode: "01100040001",
      status: "YSC03", kakaoStatus: "A", kakaoProfileStatus: "A", block: false, dormant: false } });
  }); return () => posts;
}
test("connected merchant automatically prepares fixed template with sending still off", async t => {
  const posts = setup(t); const result = await prepareMerchantAlimtalkTemplate(menu);
  assert.equal(result.connection?.template?.status, "pending"); assert.equal(result.connection?.sendingEnabled, false); assert.equal(posts(), 1);
  assert.deepEqual(harness.operations, ["reserve", "claim-post", "save"]);
  assert.doesNotMatch(JSON.stringify(result), /aaaaaaa|fake-secret|sender_key/);
});
test("approved existing copy is adopted without any registration or overwrite", async t => {
  const posts = setup(t, "approved"); const result = await prepareMerchantAlimtalkTemplate(menu);
  assert.equal(result.connection?.template?.status, "approved"); assert.equal(posts(), 0);
});
test("a lost registration receipt is queried only; subsequent clicks never repeat POST", async t => {
  const posts = setup(t, "timeout"); assert.equal((await prepareMerchantAlimtalkTemplate(menu)).connection?.template?.status, "unknown");
  assert.equal((await prepareMerchantAlimtalkTemplate(menu)).connection?.template?.status, "unknown"); assert.equal(posts(), 1);
});
test("conflicting copy is preserved and registration is not attempted", async t => {
  const posts = setup(t, "conflict"); assert.equal((await prepareMerchantAlimtalkTemplate(menu)).connection?.template?.status, "conflict"); assert.equal(posts(), 0);
});
test("staff, active leases and stale claims do not create a template", async t => {
  const posts = setup(t); harness.owner = false; assert.match((await prepareMerchantAlimtalkTemplate(menu)).error!, /사장님/);
  assert.equal(harness.operations.length, 0); harness.owner = true; harness.busy = true;
  assert.match((await prepareMerchantAlimtalkTemplate(menu)).error!, /확인 중/);
  harness.busy = false; harness.lostClaim = true; assert.match((await prepareMerchantAlimtalkTemplate(menu)).error!, /상태가 변경/); assert.equal(posts(), 0);
});

test("approval polling never registers a missing template", async t => {
  const posts = setup(t);
  const result = await prepareMerchantAlimtalkTemplate(menu, { registerMissing: false });
  assert.equal(result.connection?.template?.status, "unregistered");
  assert.equal(posts(), 0); assert(!harness.operations.includes("claim-post"));
});
