import assert from "node:assert/strict";
import test from "node:test";
import { ORDER_READY_TEMPLATE_CONTENT } from "./order-ready-message";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const bundle = await build({
  entryPoints: [fileURLToPath(new URL("./server/order-ready-alimtalk-provider.ts", import.meta.url))],
  bundle: true, platform: "node", format: "esm", write: false,
  plugins: [{ name: "server-test", setup(b) {
    b.onResolve({ filter: /^server-only$/ }, () => ({ path: "server-only", namespace: "test" }));
    b.onLoad({ filter: /.*/, namespace: "test" }, () => ({ contents: "export {};" }));
  } }],
});
const { createOrderAlimtalkProvider, getOrderAlimtalkCredentials, isOrderAlimtalkSendingEnabled } = await import(
  `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].contents).toString("base64")}`
) as typeof import("./server/order-ready-alimtalk-provider");
const config = { appKey: "test-app", secretKey: "test-secret", senderKey: "a".repeat(40), channelId: "@아티메뉴", templateCode: "cooking_ready_v1" };
const base = `/alimtalk/v2.3/appkeys/${config.appKey}`;
const context = { phone: "01000000000", orderNumber: 201, storeName: "샘플 매장", roomName: "테라스", tableName: "테이블 2" };
const template = { plusFriendId: config.channelId, senderKey: config.senderKey, templateCode: config.templateCode,
  status: "TSC03", block: false, dormant: false, templateMessageType: "BA", templateEmphasizeType: "NONE",
  templateContent: ORDER_READY_TEMPLATE_CONTENT };
const ok = { isSuccessful: true, resultCode: 0 };
const prepared = { recipientNo: context.phone, templateParameter: { 매장명: "샘플 매장", 룸명: "테라스", 테이블명: "테이블 2", 주문번호: "201" } };
const receipt = "20261125-test-request:1";
const provider = createOrderAlimtalkProvider(config);

test("NHN template preparation checks approval and maps all four actual order values", async t => {
  t.mock.method(globalThis, "fetch", async (input: string, init: RequestInit) => {
    assert.equal(input, `https://kakaotalk-bizmessage.api.nhncloudservice.com${base}/senders/${config.senderKey}/templates/cooking_ready_v1`);
    assert.equal(new Headers(init.headers).get("X-Secret-Key"), config.secretKey);
    assert.equal(init.cache, "no-store");
    assert.equal(init.redirect, "error");
    return Response.json({ header: ok, template });
  });
  assert.deepEqual(await provider.prepare(context), prepared);
});

test("documented legacy plural template envelope remains compatible", async t => {
  t.mock.method(globalThis, "fetch", async () => Response.json({ header: ok, templates: template }));
  assert.deepEqual(await provider.prepare(context), prepared);
});

test("unapproved, blocked, dormant, wrong-channel and unsupported templates cannot be sent", async t => {
  let changed: object = template;
  t.mock.method(globalThis, "fetch", async () => Response.json({ header: ok, templates: changed }));
  for (const patch of [{ status: "TSC02" }, { block: true }, { dormant: true }, { senderKey: "b".repeat(40) },
    { plusFriendId: "@다른매장" }, { templateCode: "wrong" }, { templateMessageType: "AD" },
    { buttons: [{}] }, { quickReplies: [{}] }, { templateContent: "#{알수없는변수}" },
    { templateContent: "#{주문번호} #{전화번호}" }, { templateContent: "변수가 없는 문구" }]) {
    changed = { ...template, ...patch };
    await assert.rejects(provider.prepare(context));
  }
  changed = template;
  await assert.rejects(provider.prepare({ ...context, storeName: "#{주문번호}" }));
});

test("submission uses NHN idempotency and disables SMS fallback explicitly", async t => {
  t.mock.method(globalThis, "fetch", async (input: string, init: RequestInit) => {
    assert.equal(new URL(input).pathname, base + "/messages");
    assert.equal(init.method, "POST");
    assert.equal(new Headers(init.headers).get("X-NC-API-IDEMPOTENCY-KEY"), "attempt-id");
    assert.deepEqual(JSON.parse(String(init.body)), {
      senderKey: config.senderKey, templateCode: config.templateCode, senderGroupingKey: "attempt-id",
      recipientList: [{ ...prepared, resendParameter: { isResend: false } }],
    });
    return Response.json({ header: ok, message: { requestId: "20261125-test-request", sendResults: [{ recipientSeq: 1, recipientNo: context.phone, resultCode: 0 }] } });
  });
  assert.deepEqual(await provider.send(prepared, "attempt-id"), { status: "accepted", messageId: receipt });
});

test("definite rejection, uncertain acceptance and duplicate submission remain distinct", async t => {
  let response = new Response(null, { status: 401 });
  t.mock.method(globalThis, "fetch", async () => response);
  assert.deepEqual(await provider.send(prepared, "attempt"), { status: "rejected" });
  response = Response.json({ header: { isSuccessful: false, resultCode: -1005 } });
  assert.deepEqual(await provider.send(prepared, "attempt"), { status: "unknown" });
  response = Response.json({ header: { isSuccessful: false, resultCode: -1005 } }, { status: 400 });
  assert.deepEqual(await provider.send(prepared, "attempt"), { status: "unknown" });
  response = Response.json({ header: { isSuccessful: false, resultCode: -1001 } });
  assert.deepEqual(await provider.send(prepared, "attempt"), { status: "rejected" });
  response = new Response(null, { status: 504 });
  assert.deepEqual(await provider.send(prepared, "attempt"), { status: "unknown" });
  response = Response.json({ header: ok, message: { requestId: "test", sendResults: [] } });
  assert.deepEqual(await provider.send(prepared, "attempt"), { status: "unknown" });
  response = Response.json({ header: ok, message: { requestId: "test", sendResults: [{ recipientSeq: 1, recipientNo: "01011111111", resultCode: 0 }] } });
  assert.deepEqual(await provider.send(prepared, "attempt"), { status: "unknown" });
});

test("only confirmed delivery is successful; acceptance is not delivery", async t => {
  const message = { requestId: "20261125-test-request", recipientSeq: 1, senderKey: config.senderKey, templateCode: config.templateCode };
  let changed = { ...message, messageStatus: "READY", resultCode: "" };
  t.mock.method(globalThis, "fetch", async (input: string) => {
    assert.equal(new URL(input).pathname, base + "/messages/20261125-test-request/1");
    return Response.json({ header: ok, message: changed });
  });
  assert.equal(await provider.check(receipt), "pending");
  changed = { ...message, messageStatus: "COMPLETED", resultCode: "1000" };
  assert.equal(await provider.check(receipt), "sent");
  changed = { ...message, messageStatus: "COMPLETED", resultCode: "0000" };
  assert.equal(await provider.check(receipt), "pending");
  changed = { ...message, messageStatus: "COMPLETED", resultCode: "3005" };
  assert.equal(await provider.check(receipt), "pending");
  changed = { ...message, messageStatus: "FAILED", resultCode: "3018" };
  assert.equal(await provider.check(receipt), "failed");
  changed = { ...changed, senderKey: "wrong" };
  await assert.rejects(provider.check(receipt), /일치하지/);
  await assert.rejects(provider.check("../other"), /접수 정보/);
});

test("server credentials and the global switch do not provide any fallback sender", t => {
  const saved = { ...process.env }; t.after(() => { process.env = saved; });
  Object.assign(process.env, { ORDER_ALIMTALK_ENABLED: "false", ORDER_ALIMTALK_NHN_APP_KEY: config.appKey,
    ORDER_ALIMTALK_NHN_SECRET_KEY: config.secretKey, ORDER_ALIMTALK_NHN_SENDER_KEY: config.senderKey,
    ORDER_ALIMTALK_NHN_CHANNEL_ID: config.channelId, ORDER_ALIMTALK_MENU_SITE_ID: "legacy-pilot" });
  assert.equal(isOrderAlimtalkSendingEnabled(), false);
  assert.deepEqual(getOrderAlimtalkCredentials(), { appKey: config.appKey, secretKey: config.secretKey });
  process.env.ORDER_ALIMTALK_ENABLED = "true";
  assert.equal(isOrderAlimtalkSendingEnabled(), true);
  assert(!Object.hasOwn(getOrderAlimtalkCredentials()!, "senderKey"));
  delete process.env.ORDER_ALIMTALK_NHN_SECRET_KEY;
  assert.equal(getOrderAlimtalkCredentials(), null);
});
