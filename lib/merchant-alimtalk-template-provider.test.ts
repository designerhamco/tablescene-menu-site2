import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import { ORDER_READY_TEMPLATE_CONTENT } from "./order-ready-message";
const bundle = await build({ entryPoints: [fileURLToPath(new URL("./server/merchant-alimtalk-template-provider.ts", import.meta.url))], bundle: true,
  platform: "node", format: "esm", write: false, plugins: [{ name: "server-only", setup(b) {
    b.onResolve({ filter: /^server-only$/ }, () => ({ path: "server-only", namespace: "test" }));
    b.onLoad({ filter: /.*/, namespace: "test" }, () => ({ contents: "export {};" }));
  } }] });
const { createMerchantTemplateProvider } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].contents).toString("base64")}`) as typeof import("./server/merchant-alimtalk-template-provider");
const binding = { senderKey: "b".repeat(40), channelId: "@점주매장" }, ok = { isSuccessful: true, resultCode: 0 };
const provider = createMerchantTemplateProvider({ appKey: "fake-app", secretKey: "fake-secret" });
const template = { ...binding, plusFriendId: binding.channelId, templateCode: "cooking_ready_v1", templateContent: ORDER_READY_TEMPLATE_CONTENT,
  templateMessageType: "BA", templateEmphasizeType: "NONE", status: "TSC03", block: false, dormant: false };
function mock(t: test.TestContext, row: object | null = template, total = row ? 1 : 0) {
  const calls: string[] = [];
  t.mock.method(globalThis, "fetch", async (url: string, init: RequestInit) => {
    const u = new URL(url); calls.push(`${init.method} ${u.pathname}`);
    assert(!u.pathname.includes("/messages")); assert(u.pathname.includes(binding.senderKey));
    if (init.method === "POST") {
      const body = JSON.parse(String(init.body)); assert.equal(body.templateContent, ORDER_READY_TEMPLATE_CONTENT);
      assert.equal(body.templateCode, "cooking_ready_v1"); assert.equal(body.categoryCode, "002001"); assert(!body.recipientList);
      return Response.json({ header: ok });
    }
    if (u.pathname.endsWith("/templates/cooking_ready_v1")) return Response.json({ header: ok, template: row });
    if (u.pathname.endsWith("/templates")) return Response.json({ header: ok, templateListResponse: { totalCount: total, templates: row ? [row] : [] } });
    return Response.json({ header: ok, sender: { ...binding, plusFriendId: binding.channelId, categoryCode: "01100040001",
      status: "YSC03", kakaoStatus: "A", kakaoProfileStatus: "A", block: false, dormant: false } });
  }); return calls;
}
test("approved fixed template is read from the exact merchant profile without writes", async t => {
  const calls = mock(t); assert.deepEqual(await provider.inspect(binding), { status: "approved", content: ORDER_READY_TEMPLATE_CONTENT });
  assert.equal(calls.length, 3); assert(calls.every(c => c.startsWith("GET")));
});
for (const [name, patch, state] of [
  ["pending", { status: "TSC02" }, "pending"], ["rejected", { status: "TSC04" }, "rejected"],
  ["blocked", { block: true }, "blocked"], ["dormant", { dormant: true }, "blocked"],
  ["changed copy", { templateContent: "별도 문구" }, "conflict"], ["buttons", { buttons: [{}] }, "conflict"],
] as const) test(`${name} is reflected without overwriting or sending`, async t => {
  const calls = mock(t, { ...template, ...patch }); assert.equal((await provider.inspect(binding)).status, state);
  assert(calls.every(c => c.startsWith("GET")));
});
test("another sender and incomplete template pages are rejected", async t => {
  mock(t, { ...template, senderKey: "a".repeat(40) }); await assert.rejects(provider.inspect(binding), /일치하지/);
});
test("a partial list cannot be interpreted as a missing template", async t => {
  mock(t, null, 2); await assert.rejects(provider.inspect(binding), /목록/);
});
test("registration is a fixed information-only template with no customer message", async t => {
  const calls = mock(t, null); assert.equal((await provider.inspect(binding)).status, "missing"); await provider.register(binding);
  assert.equal(calls.filter(c => c.startsWith("POST")).length, 1);
});
