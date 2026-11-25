import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import { ORDER_READY_TEMPLATE_CONTENT } from "./order-ready-message";
const bundle = await build({ entryPoints: [fileURLToPath(new URL("./server/order-alimtalk-config-service.ts", import.meta.url))], bundle: true,
  platform: "node", format: "esm", write: false, plugins: [{ name: "server", setup(b) {
    b.onResolve({ filter: /^(server-only|.*supabase\/admin)$/ }, a => ({ path: a.path, namespace: "test" }));
    b.onLoad({ filter: /.*/, namespace: "test" }, a => ({ contents: a.path === "server-only" ? "export {};" : "export function createAdminClient(){throw new Error('DB must be explicit');}" }));
  } }] });
const { resolveMerchantAlimtalkConfig } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].contents).toString("base64")}`) as typeof import("./server/order-alimtalk-config-service");
test("each menu uses its own verified channel; legacy global pilot values cannot override routing", async t => {
  const saved = { ...process.env }; t.after(() => { process.env = saved; });
  Object.assign(process.env, { ORDER_ALIMTALK_ENABLED: "true", ORDER_ALIMTALK_NHN_APP_KEY: "fake-app", ORDER_ALIMTALK_NHN_SECRET_KEY: "fake-secret",
    ORDER_ALIMTALK_NHN_SENDER_KEY: "f".repeat(40), ORDER_ALIMTALK_NHN_CHANNEL_ID: "@아티메뉴", ORDER_ALIMTALK_MENU_SITE_ID: "legacy-pilot" });
  const db = { from(table: string) {
    let id: string;
    const query = { select() { return query; }, eq(key: string, val: string) { assert.equal(key, table === "menu_sites" ? "id" : "menu_site_id"); id = val; return query; },
      async maybeSingle() { const owner = id === "A" ? "owner-A" : "owner-B"; return { error: null, data: table === "menu_sites" ? { user_id: owner }
        : { actor_id: owner, channel_id: `@매장${id}`, sender_key: (id === "A" ? "a" : "b").repeat(40), state: "connected", verified_at: "2026-11-25",
          sending_enabled: true, template_code: "cooking_ready_v1", template_status: "approved", template_content: ORDER_READY_TEMPLATE_CONTENT } }; } };
    return query;
  } } as unknown as NonNullable<Parameters<typeof resolveMerchantAlimtalkConfig>[1]>;
  const a = await resolveMerchantAlimtalkConfig("A", db), b = await resolveMerchantAlimtalkConfig("B", db);
  assert.equal(a?.senderKey, "a".repeat(40)); assert.equal(a?.channelId, "@매장A");
  assert.equal(b?.senderKey, "b".repeat(40)); assert.equal(b?.channelId, "@매장B");
  assert.notEqual(a?.channelOwnerId, b?.channelOwnerId);
  process.env.ORDER_ALIMTALK_ENABLED = "false";
  assert.equal(await resolveMerchantAlimtalkConfig("A", db), null);
});
