import test from "node:test";
import assert from "node:assert/strict";
import { checkKscatFromBrowser, KscatConnectionError, requestKscatVersion } from "./kscat-connection";
import { KSCAT_VERSION_REQUEST } from "./kscat-protocol";

function versionResponse(init: RequestInit, patch: Record<string, string> = {}) {
  const callback = (init.body as URLSearchParams).get("callback");
  return new Response(`${callback}(${JSON.stringify({ ERRCODE: "00", MSG: "", REQ: "AP", RES: "0000", TRADEFLAG: "VR", VERSION: "20260914", ...patch })});`, {
    headers: { "Content-Type": "application/x-www-form-urlencoded; charset=euc-kr", "Access-Control-Allow-Origin": "*" },
  });
}
const code = (expected: string) => (error: unknown) => error instanceof KscatConnectionError && error.code === expected;

test("version transport sends only the allowlisted command with no cookies, redirects or merchant data", async () => {
  let calls = 0;
  const transport: typeof fetch = async (url, init) => {
    calls++; assert.equal(String(url), "http://127.0.0.1:27098/");
    assert.equal(init?.method, "POST"); assert.equal(init?.mode, "cors"); assert.equal(init?.credentials, "omit");
    assert.equal(init?.redirect, "error"); assert.equal(init?.referrerPolicy, "no-referrer"); assert.equal(init?.cache, "no-store");
    const body = init?.body as URLSearchParams;
    assert.deepEqual([...body.keys()], ["REQ", "callback"]); assert.equal(body.get("REQ"), KSCAT_VERSION_REQUEST);
    assert.match(body.get("callback")!, /^artimenu_[a-f0-9]{32}$/);
    return versionResponse(init!);
  };
  assert.equal((await requestKscatVersion("27098", undefined, transport)).versionDate, "2026-09-14");
  assert.equal(calls, 1);
  await assert.rejects(requestKscatVersion("27098/charge", undefined, transport)); assert.equal(calls, 1);
});

test("malformed and unrelated responses never become a verified connection", async () => {
  for (const raw of ["not kscat", "<script>window.leak()</script>", "x".repeat(32769)])
    await assert.rejects(requestKscatVersion("27098", undefined, async () => new Response(raw)), code("invalid_response"));
  const patches: Record<string, string>[] = [{ TRADEFLAG: "IC" }, { VERSION: "20260230" }, { RES: "9999" }, { ERRCODE: "90" }, { ERRCODE: "" }, { RESPCODE: "9999" }];
  for (const patch of patches)
    await assert.rejects(requestKscatVersion("27098", undefined, async (_, init) => versionResponse(init!, patch)), code("invalid_response"));
  await assert.rejects(requestKscatVersion("27098", undefined, async () => new Response(new Uint8Array([0xff, 0xff]))), code("invalid_response"));
});

test("the declared Korean response charset is decoded without retaining the vendor message", async () => {
  const transport: typeof fetch = async (_, init) => {
    const callback = (init?.body as URLSearchParams).get("callback");
    const prefix = new TextEncoder().encode(`${callback}({REQ:'AP',TRADEFLAG:'VR',RES:'0000',ERRCODE:'00',VERSION:'20260914',MSG:'`);
    const suffix = new TextEncoder().encode("'});");
    const bytes = new Uint8Array([...prefix, 0xc1, 0xa4, 0xbb, 0xf3, ...suffix]);
    return new Response(bytes, { headers: { "Content-Type": "application/x-www-form-urlencoded; charset=euc-kr", "Access-Control-Allow-Origin": "*" } });
  };
  assert.deepEqual(await requestKscatVersion("27098", undefined, transport), { resultCode: "0000", versionDate: "2026-09-14" });
});

test("network and CORS failures stay actionable without leaking raw provider error details", async () => {
  await assert.rejects(requestKscatVersion("27098", undefined, async () => { throw new TypeError("private internal connection detail"); }), code("network"));
  await assert.rejects(requestKscatVersion("27098", undefined, async () => new Response("not found", { status: 404 })), code("network"));
});

test("aborting an obsolete check suppresses both initial dispatch and late success", async () => {
  const aborted = new AbortController(); aborted.abort(); let calls = 0;
  await assert.rejects(requestKscatVersion("27098", aborted.signal, async () => { calls++; return new Response(); }), code("cancelled"));
  assert.equal(calls, 0);
  const late = new AbortController();
  await assert.rejects(requestKscatVersion("27098", late.signal, async (_, init) => { late.abort(); return versionResponse(init!); }), code("cancelled"));
});

test("a program timeout is a connection-check timeout, never a failed payment", async () => {
  await assert.rejects(requestKscatVersion("27098", undefined, async (_, init) => new Promise((_, reject) => {
    init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
  })), code("timeout"));
});

test("browser checks require Windows, secure context and allowed loopback access before sending", async () => {
  const names = ["window", "navigator", "fetch"] as const;
  const before = names.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)] as const);
  let calls = 0;
  let agent = "Macintosh", secure = true, denied = false;
  Object.defineProperty(globalThis, "window", { configurable: true, value: { get isSecureContext() { return secure; } } });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: { get userAgent() { return agent; }, permissions: {
    query: async () => ({ state: denied ? "denied" : "granted" }),
  } } });
  Object.defineProperty(globalThis, "fetch", { configurable: true, value: async (_: unknown, init: RequestInit) => { calls++; return versionResponse(init); } });
  try {
    await assert.rejects(checkKscatFromBrowser("27098"), code("unsupported")); assert.equal(calls, 0);
    agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"; secure = false;
    await assert.rejects(checkKscatFromBrowser("27098"), code("insecure")); assert.equal(calls, 0);
    secure = true; denied = true;
    await assert.rejects(checkKscatFromBrowser("27098"), code("permission_denied")); assert.equal(calls, 0);
    denied = false;
    const first = checkKscatFromBrowser("27098");
    await assert.rejects(checkKscatFromBrowser("27098"), code("busy"));
    assert.equal((await first).versionDate, "2026-09-14"); assert.equal(calls, 1);
  } finally { for (const [name, descriptor] of before) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else Reflect.deleteProperty(globalThis, name); } }
});
