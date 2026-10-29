import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import { TERMINAL_KEEPALIVE_INTERVAL_MS } from "./order-session-policy";

function fixture({ enabled = true, previewOnly = false, hidden = false } = {}) {
  const document = Object.assign(new EventTarget(), { visibilityState: hidden ? "hidden" : "visible" });
  let now = 1_000_000;
  let cleanup: (() => void) | undefined;
  const timers = new Set<() => void>();
  const requests: { url: string; options: RequestInit }[] = [];
  const source = readFileSync(new URL("../components/public-menu/order-call/useTerminalConnection.ts", import.meta.url), "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const loaded = { exports: {} };
  const dependencies: Record<string, unknown> = {
    react: { useEffect(effect: () => (() => void) | undefined) { cleanup = effect(); } },
    "@/lib/order-session-policy": { TERMINAL_KEEPALIVE_INTERVAL_MS },
  };
  new Function("require", "module", "exports", "document", "Date", "setInterval", "clearInterval", "fetch", output)(
    (name: string) => { assert.ok(name in dependencies); return dependencies[name]; }, loaded, loaded.exports,
    document, { now: () => now },
    (callback: () => void) => { timers.add(callback); return callback; },
    (callback: () => void) => timers.delete(callback),
    async (url: string, options: RequestInit) => { requests.push({ url, options }); return { ok: true }; },
  );
  (loaded.exports as { useTerminalConnection: (id: string, enabled: boolean, preview: boolean) => void })
    .useTerminalConnection("test-site", enabled, previewOnly);
  return {
    requests, timers, document,
    async advance(ms: number) { now += ms; for (const tick of timers) tick(); await Promise.resolve(); },
    async interact(name = "pointerdown") { document.dispatchEvent(new Event(name)); await Promise.resolve(); },
    dispose() { cleanup?.(); },
  };
}

test("사용 중인 공용 연결만 같은 출처의 제한된 갱신 요청을 보내며 일반 조회를 사용하지 않는다", async () => {
  const f = fixture();
  await Promise.resolve();
  assert.equal(f.requests.length, 1);
  assert.equal(f.requests[0].url, "/api/public-menu/order-session");
  assert.equal(f.requests[0].options.method, "POST");
  assert.equal(f.requests[0].options.credentials, "same-origin");
  assert.deepEqual(JSON.parse(f.requests[0].options.body as string), { menuSiteId: "test-site", intent: "terminal-keepalive" });
  await f.interact(); await f.interact("scroll"); await f.interact("keydown");
  assert.equal(f.requests.length, 1);
  await f.advance(TERMINAL_KEEPALIVE_INTERVAL_MS + 1);
  assert.equal(f.requests.length, 1, "조작 없는 화면의 타이머만으로 연결을 갱신하지 않는다");
  await f.interact("scroll");
  assert.equal(f.requests.length, 2);
  await f.advance(TERMINAL_KEEPALIVE_INTERVAL_MS - 1000);
  await f.interact("keydown");
  await f.advance(1000);
  assert.equal(f.requests.length, 3);
  f.dispose();
});

test("숨겨진 화면은 갱신하지 않으며 다시 사용하면 갱신하고 종료 후 요청을 중단한다", async () => {
  const f = fixture({ hidden: true });
  await f.interact(); await f.advance(TERMINAL_KEEPALIVE_INTERVAL_MS * 2);
  assert.equal(f.requests.length, 0);
  f.document.visibilityState = "visible";
  await f.interact("visibilitychange");
  assert.equal(f.requests.length, 1);
  f.dispose();
  assert.equal(f.timers.size, 0);
  assert.equal(f.requests[0].options.signal?.aborted, true);
  await f.advance(TERMINAL_KEEPALIVE_INTERVAL_MS * 2); await f.interact();
  assert.equal(f.requests.length, 1);
});

test("개인 기기·미리보기는 공용 연결 갱신 요청과 타이머를 만들지 않는다", () => {
  for (const options of [{ enabled: false }, { previewOnly: true }]) {
    const f = fixture(options);
    assert.equal(f.requests.length, 0);
    assert.equal(f.timers.size, 0);
    f.dispose();
  }
});
