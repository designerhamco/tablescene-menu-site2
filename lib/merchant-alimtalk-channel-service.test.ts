import assert from "node:assert/strict";
import test from "node:test";
import { ORDER_READY_TEMPLATE_CONTENT } from "./order-ready-message";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";

type Query = { patch?: Record<string, unknown>; filters: Record<string, unknown> };
const fixture = {
  menu_site_id: "33333333-3333-4333-8333-333333333333", actor_id: "11111111-1111-4111-8111-111111111111",
  channel_id: "@샘플매장", category_code: "01100040001", masked_phone: "010-****-0000" as string | null, state: "pending",
  challenge_id: "44444444-4444-4444-8444-444444444444", requested_at: new Date().toISOString(), expires_at: new Date(Date.now() + 600_000).toISOString(),
  verified_at: null as string | null, verify_attempts: 0, request_count: 1, request_window_started_at: new Date().toISOString(),
  sender_key: null as string | null, sending_enabled: false,
  verification_method: "kakao_token", template_code: "cooking_ready_v1", template_status: "unregistered",
  template_content: null as string | null, template_checked_at: null as string | null,
  template_check_id: null as string | null, template_check_started_at: null as string | null, template_registration_started_at: null as string | null,
};
const harness = {
  context: { isOwner: true, actorUserId: fixture.actor_id },
  row: { ...fixture }, queries: [] as Query[], rpcs: [] as { name: string; args: Record<string, unknown> }[],
  getDb() {
    return {
      rpc(name: string, args: Record<string, unknown>) {
        harness.rpcs.push({ name, args });
        return { async single() {
          harness.row = name === "reserve_menu_alimtalk_template"
            ? { ...harness.row, template_status: "checking", template_check_id: "66666666-6666-4666-8666-666666666666" }
            : name === "link_existing_menu_alimtalk_channel"
            ? { ...harness.row, state: "connected", masked_phone: null, sender_key: String(args.p_sender_key), verified_at: new Date().toISOString(), verification_method: "operator_binding" }
            : { ...harness.row, state: name.endsWith("verification") ? "verifying" : "requesting", verify_attempts: name.endsWith("verification") ? 1 : 0 };
          return { data: { ...harness.row }, error: null };
        } };
      },
      from(table: string) {
        assert.equal(table, "menu_alimtalk_channels");
        const query: Query = { filters: {} };
        function result() {
          harness.queries.push(query);
          if (query.patch) harness.row = { ...harness.row, ...query.patch };
          return { data: { ...harness.row }, error: null };
        }
        const chain = {
          select() { return chain; }, update(patch: Query["patch"]) { query.patch = patch; return chain; },
          eq(key: string, value: unknown) { query.filters[key] = value; return chain; },
          in(key: string, value: unknown) { query.filters[key] = value; return chain; },
          async maybeSingle() { return result(); }, then(resolve: (value: unknown) => unknown) { return Promise.resolve(result()).then(resolve); },
        };
        return chain;
      },
    };
  },
};
const slot = globalThis as typeof globalThis & { merchantChannelTest: typeof harness };
slot.merchantChannelTest = harness;
const bundle = await build({ entryPoints: [fileURLToPath(new URL("./server/merchant-alimtalk-channel-service.ts", import.meta.url))],
  bundle: true, platform: "node", format: "esm", write: false,
  plugins: [{ name: "service-test", setup(b) {
    b.onResolve({ filter: /^(server-only|.*menu-site-access-service|.*supabase\/admin)$/ }, args => ({ path: args.path, namespace: "test" }));
    b.onLoad({ filter: /.*/, namespace: "test" }, args => ({ contents: args.path === "server-only" ? "export {};" : args.path.endsWith("supabase/admin")
      ? "export const createAdminClient=()=>globalThis.merchantChannelTest.getDb();"
      : `export const requireMenuSitePermission=async()=>globalThis.merchantChannelTest.context;
         export const requireMenuSiteWriteAccess=async()=>({context:globalThis.merchantChannelTest.context,supabase:globalThis.merchantChannelTest.getDb()});` }));
  } }],
});
const service = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].contents).toString("base64")}`) as typeof import("./server/merchant-alimtalk-channel-service");
const ok = { isSuccessful: true, resultCode: 0 };
function setup(t: test.TestContext, rejected = false) {
  harness.context = { isOwner: true, actorUserId: fixture.actor_id };
  harness.row = { ...fixture }; harness.queries = []; harness.rpcs = [];
  const saved = { ...process.env };
  t.after(() => { process.env = saved; });
  process.env.ORDER_ALIMTALK_ENABLED = "false";
  process.env.ORDER_ALIMTALK_NHN_APP_KEY = "fake-app";
  process.env.ORDER_ALIMTALK_NHN_SECRET_KEY = "fake-secret";
  delete process.env.ORDER_ALIMTALK_NHN_EXISTING_OWNER_ID;
  t.mock.method(globalThis, "fetch", async (url: string) => {
    if (url.endsWith("/templates/cooking_ready_v1")) return Response.json({ header: ok, template: {
      senderKey: "a".repeat(40), plusFriendId: fixture.channel_id, templateCode: "cooking_ready_v1", templateContent: ORDER_READY_TEMPLATE_CONTENT,
      templateMessageType: "BA", templateEmphasizeType: "NONE", status: "TSC03", block: false, dormant: false,
    } });
    if (url.includes("/templates?")) return Response.json({ header: ok, templateListResponse: { totalCount: 1, templates: [{
      senderKey: "a".repeat(40), plusFriendId: fixture.channel_id, templateCode: "cooking_ready_v1", templateContent: ORDER_READY_TEMPLATE_CONTENT,
      templateMessageType: "BA", templateEmphasizeType: "NONE", status: "TSC03", block: false, dormant: false,
    }] } });
    if (url.endsWith("/sender/categories")) return Response.json({ header: ok, categories: [{ code: "011", name: "음식점", subCategories: [{ code: "0004", name: "카페", subCategories: [{ code: "0001", name: "카페" }] }] }] });
    if (url.endsWith("/senders")) return Response.json({ header: ok });
    if (url.endsWith("/senders/" + "a".repeat(40))) return Response.json({ header: ok, sender: {
      plusFriendId: fixture.channel_id, senderKey: "a".repeat(40), categoryCode: fixture.category_code,
      status: "YSC03", kakaoStatus: "A", kakaoProfileStatus: "A", block: false, dormant: false,
    } });
    assert(url.endsWith("/sender/token")); // No customer /messages endpoint is permitted in this suite.
    return Response.json(rejected ? { header: { isSuccessful: false, resultCode: -1008 } }
      : { header: ok, sender: { plusFriendId: fixture.channel_id, senderKey: "a".repeat(40), status: "YSC03" } });
  });
}
const verify = { intent: "verify" as const, challengeId: fixture.challenge_id, token: "123456" };

test("staff cannot read or mutate merchant channel credentials", async t => {
  setup(t); harness.context.isOwner = false;
  await assert.rejects(service.loadMerchantChannelPage(fixture.menu_site_id), /사장님만/);
  await assert.rejects(service.handleMerchantChannel(fixture.menu_site_id, verify), /사장님만/);
  assert.equal(harness.queries.length + harness.rpcs.length, 0);
});
test("page rejects channel proof inherited from a former owner", async t => {
  setup(t); harness.row.actor_id = "22222222-2222-4222-8222-222222222222";
  const page = await service.loadMerchantChannelPage(fixture.menu_site_id);
  assert.equal(page.available, false); assert.equal(page.connection, null);
});
test("request persists only masked phone, with exact menu, owner and challenge guards", async t => {
  setup(t);
  const result = await service.handleMerchantChannel(fixture.menu_site_id, { intent: "request", channelId: fixture.channel_id, adminPhone: "010-0000-0000", categoryCode: fixture.category_code });
  assert.equal(result.connection?.state, "pending");
  assert.equal(harness.rpcs[0].args.p_masked_phone, "010-****-0000");
  assert(!JSON.stringify(harness.rpcs).includes("01000000000"));
  assert.deepEqual(harness.queries[0].filters, { menu_site_id: fixture.menu_site_id, actor_id: fixture.actor_id, challenge_id: fixture.challenge_id, state: "requesting" });
});
test("wrong OTP restores pending, consumes attempt and never stores a sender key", async t => {
  setup(t, true);
  const result = await service.handleMerchantChannel(fixture.menu_site_id, verify);
  assert.match(result.error!, /인증번호/);
  assert.equal(result.connection?.state, "pending");
  assert.equal(result.connection?.attemptsRemaining, 4);
  assert(!harness.queries.some(row => row.patch?.sender_key));
});
test("verified proof stores server key but returns neither key nor OTP; sending remains false", async t => {
  setup(t);
  const result = await service.handleMerchantChannel(fixture.menu_site_id, verify);
  assert.equal(result.connection?.state, "connected");
  assert.equal(result.connection?.sendingEnabled, false);
  assert.equal(harness.row.sender_key, "a".repeat(40));
  assert.doesNotMatch(JSON.stringify(result), /aaaaaaa|123456|fake-secret|actor_id/);
  assert.deepEqual(harness.queries[0].filters, { menu_site_id: fixture.menu_site_id, actor_id: fixture.actor_id, challenge_id: fixture.challenge_id, state: "verifying" });
});

function approveExisting() {
  process.env.ORDER_ALIMTALK_MENU_SITE_ID = fixture.menu_site_id;
  process.env.ORDER_ALIMTALK_NHN_EXISTING_OWNER_ID = fixture.actor_id;
  process.env.ORDER_ALIMTALK_NHN_CHANNEL_ID = fixture.channel_id;
  process.env.ORDER_ALIMTALK_NHN_SENDER_KEY = "a".repeat(40);
}
test("existing channels cannot be attached without an explicit operator-approved owner binding", async t => {
  setup(t);
  await assert.rejects(service.handleMerchantChannel(fixture.menu_site_id, { intent: "connect-existing" }), /승인된 기존 채널/);
  assert.equal(harness.rpcs.length, 0);
});
test("existing proof returns no secret and persists via a single owner-scoped RPC without registering again", async t => {
  setup(t); approveExisting();
  const result = await service.handleMerchantChannel(fixture.menu_site_id, { intent: "connect-existing" });
  assert.equal(result.connection?.state, "connected");
  assert.equal(result.connection?.verificationMethod, "operator_binding");
  assert.equal(result.connection?.maskedPhone, null);
  assert.equal(result.connection?.sendingEnabled, false);
  assert.doesNotMatch(JSON.stringify(result), /aaaaaaa|fake-secret|actor_id/);
  assert.deepEqual(harness.rpcs.filter(r => r.name === "link_existing_menu_alimtalk_channel"), [{ name: "link_existing_menu_alimtalk_channel", args: {
    p_menu_id: fixture.menu_site_id, p_actor_id: fixture.actor_id, p_channel_id: fixture.channel_id,
    p_category_code: fixture.category_code, p_sender_key: "a".repeat(40),
  } }]);
  assert.equal(result.connection?.template?.status, "approved");
});
test("another owner or menu cannot claim the approved existing profile", async t => {
  setup(t); approveExisting();
  harness.context.actorUserId = "22222222-2222-4222-8222-222222222222";
  await assert.rejects(service.handleMerchantChannel(fixture.menu_site_id, { intent: "connect-existing" }), /승인된 기존 채널/);
  harness.context.actorUserId = fixture.actor_id;
  await assert.rejects(service.handleMerchantChannel(fixture.challenge_id, { intent: "connect-existing" }), /승인된 기존 채널/);
  assert.equal(harness.rpcs.length, 0);
});
