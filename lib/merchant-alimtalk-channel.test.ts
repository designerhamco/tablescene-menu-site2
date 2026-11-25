import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import { normalizeMerchantAdminPhone, normalizeMerchantChannelId, normalizeMerchantToken } from "./merchant-alimtalk-channel";

const bundle = await build({
  entryPoints: [fileURLToPath(new URL("./server/merchant-alimtalk-channel-provider.ts", import.meta.url))],
  bundle: true, platform: "node", format: "esm", write: false,
  plugins: [{ name: "server-test", setup(b) {
    b.onResolve({ filter: /^server-only$/ }, () => ({ path: "server-only", namespace: "test" }));
    b.onLoad({ filter: /.*/, namespace: "test" }, () => ({ contents: "export {};" }));
  } }],
});
const { createMerchantChannelProvider, getMerchantChannelCredentials } = await import(
  `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].contents).toString("base64")}`
) as typeof import("./server/merchant-alimtalk-channel-provider");
const config = { appKey: "fake-app", secretKey: "fake-secret" };
const provider = createMerchantChannelProvider(config);
const ok = { isSuccessful: true, resultCode: 0 };

test("channel, mobile and OTP validation rejects malformed, excessive and non-string input", () => {
  assert.equal(normalizeMerchantChannelId(" @샘플매장 "), "@샘플매장");
  assert.equal(normalizeMerchantAdminPhone("010-0000-0000"), "01000000000");
  assert.equal(normalizeMerchantToken(" 012345 "), "012345");
  for (const value of [null, "매장", "@", "@a b", "@x/y", "@" + "가".repeat(30)]) assert.throws(() => normalizeMerchantChannelId(value));
  for (const value of [null, "0212345678", "010123", "010abc00000"]) assert.throws(() => normalizeMerchantAdminPhone(value));
  for (const value of [null, 123456, "12345", "1234567", "abcdef"]) assert.throws(() => normalizeMerchantToken(value));
});

test("actual NHN segmented category codes normalize to a full 11-digit leaf", async t => {
  t.mock.method(globalThis, "fetch", async () => Response.json({ header: ok, categories: [
    { code: "011", name: "음식점", subCategories: [{ code: "0004", name: "카페", subCategories: [{ code: "0001", name: "카페" }] }] },
  ] }));
  const categories = await provider.categories();
  assert.equal(categories[0].children[0].code, "0110004");
  assert.equal(categories[0].children[0].children[0].code, "01100040001");
});

test("wrong category hierarchy and empty category responses fail closed", async t => {
  let categories: object[] = [];
  t.mock.method(globalThis, "fetch", async () => Response.json({ header: ok, categories }));
  await assert.rejects(provider.categories());
  categories = [{ code: "011", name: "음식점", subCategories: [{ code: "0120001", name: "다른 분류" }] }];
  await assert.rejects(provider.categories());
});

test("registration requests an admin OTP only; no customer messages are sent", async t => {
  t.mock.method(globalThis, "fetch", async (url: string, init: RequestInit) => {
    assert.equal(new URL(url).pathname, "/alimtalk/v2.3/appkeys/fake-app/senders");
    assert.equal(init.method, "POST");
    assert.equal(new Headers(init.headers).get("X-Secret-Key"), "fake-secret");
    assert.equal(init.redirect, "error");
    assert.equal(init.cache, "no-store");
    assert.deepEqual(JSON.parse(String(init.body)), { plusFriendId: "@샘플매장", phoneNo: "01000000000", categoryCode: "01100040001" });
    return Response.json({ header: ok });
  });
  await provider.requestToken({ channelId: "@샘플매장", adminPhone: "01000000000", categoryCode: "01100040001" });
});

test("OTP verification uses NHN numeric token and requires the exact active sender", async t => {
  let sender = { plusFriendId: "@샘플매장", senderKey: "a".repeat(40), status: "YSC03" };
  t.mock.method(globalThis, "fetch", async (url: string, init: RequestInit) => {
    assert.equal(new URL(url).pathname, "/alimtalk/v2.3/appkeys/fake-app/sender/token");
    assert.deepEqual(JSON.parse(String(init.body)), { plusFriendId: "@샘플매장", token: 12345 });
    return Response.json({ header: ok, sender });
  });
  assert.deepEqual(await provider.verifyToken("@샘플매장", "012345"), { senderKey: "a".repeat(40) });
  for (const patch of [{ plusFriendId: "@다른매장" }, { status: "YSC01" }, { senderKey: "invalid" }]) {
    sender = { plusFriendId: "@샘플매장", senderKey: "a".repeat(40), status: "YSC03", ...patch };
    await assert.rejects(provider.verifyToken("@샘플매장", "012345"));
  }
});

test("already registered profiles never bypass channel proof; provider errors do not leak raw content", async t => {
  t.mock.method(globalThis, "fetch", async () => Response.json({ header: { isSuccessful: false, resultCode: -1004, resultMessage: "private provider information" } }));
  await assert.rejects(provider.requestToken({ channelId: "@샘플매장", adminPhone: "01000000000", categoryCode: "01100040001" }), error => {
    assert.match(String(error), /이미 NHN에 등록/);
    assert.doesNotMatch(String(error), /private|fake-secret/);
    return true;
  });
});

test("wrong token is a definite error while a network timeout remains uncertain", async t => {
  t.mock.method(globalThis, "fetch", async () => Response.json({ header: { isSuccessful: false, resultCode: -1008 } }));
  await assert.rejects(provider.verifyToken("@샘플매장", "123456"), (e: { uncertain: boolean }) => e.uncertain === false);
  t.mock.method(globalThis, "fetch", async () => { throw new Error("socket private-key"); });
  await assert.rejects(provider.verifyToken("@샘플매장", "123456"), (e: { uncertain: boolean; message: string }) => e.uncertain && !e.message.includes("private-key"));
});

test("project credentials permit channel onboarding while the customer sending gate stays off", t => {
  const saved = { ...process.env };
  t.after(() => { process.env = saved; });
  process.env.ORDER_ALIMTALK_ENABLED = "false";
  process.env.ORDER_ALIMTALK_NHN_APP_KEY = "fake-app";
  process.env.ORDER_ALIMTALK_NHN_SECRET_KEY = "fake-secret";
  assert.deepEqual(getMerchantChannelCredentials(), config);
  process.env.ORDER_ALIMTALK_NHN_SECRET_KEY = "invalid\r\nheader";
  assert.equal(getMerchantChannelCredentials(), null);
});
