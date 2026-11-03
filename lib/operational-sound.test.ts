import assert from "node:assert/strict";
import test from "node:test";
import { getDashboardBrowserNotificationPreferenceKey } from "./dashboard-arrival-alerts";
import { DEFAULT_OPERATIONAL_SOUND, normalizeOperationalSound, operationalSoundKey, readOperationalSound, saveOperationalSound, playOperationalSound, stopOperationalSound } from "./operational-sound";

test("알림음 설정은 종류별·매장별로 분리되고 손상된 저장값은 유한한 기본값으로 복구한다", () => {
  assert.notEqual(operationalSoundKey("one", "orders"), operationalSoundKey("one", "calls"));
  assert.notEqual(operationalSoundKey("one", "orders"), operationalSoundKey("two", "orders"));
  assert.deepEqual(normalizeOperationalSound({ tone: "bad", volume: NaN, repeat: Infinity }), DEFAULT_OPERATIONAL_SOUND);
  assert.deepEqual(normalizeOperationalSound({ enabled: false, tone: "bell", volume: 900, repeat: 5 }), { receiveEnabled: false, enabled: false, tone: "bell", volume: 100, repeat: 5 });
  assert.equal(normalizeOperationalSound({ volume: -10 }).volume, 0);
  const storage = new Map<string, string>(), original = globalThis.window;
  Object.assign(globalThis, { window: { localStorage: { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) }, dispatchEvent: () => true } });
  try {
    saveOperationalSound("one", "orders", { ...DEFAULT_OPERATIONAL_SOUND, repeat: 3, volume: 25 });
    assert.equal(readOperationalSound("one", "orders").repeat, 3);
    assert.equal(readOperationalSound("one", "calls").repeat, 1);
    assert.equal(readOperationalSound("two", "orders").volume, 50);
    storage.set(getDashboardBrowserNotificationPreferenceKey({ menuSiteId: "legacy", kind: "calls" }), "enabled");
    storage.set(operationalSoundKey("legacy", "calls"), JSON.stringify({ tone: "bell", volume: 25, repeat: 3 }));
    assert.equal(readOperationalSound("legacy", "calls").receiveEnabled, true);
    saveOperationalSound("legacy", "calls", { ...readOperationalSound("legacy", "calls"), receiveEnabled: false });
    assert.equal(readOperationalSound("legacy", "calls").receiveEnabled, false); // Explicit OFF wins over legacy opt-in.
    assert.equal(readOperationalSound("legacy", "orders").receiveEnabled, false);
    storage.set(operationalSoundKey("one", "orders"), "broken json");
    assert.deepEqual(readOperationalSound("one", "orders"), DEFAULT_OPERATIONAL_SOUND);
  } finally { Object.assign(globalThis, { window: original }); }
});

test("음량0·알림음OFF는 무음이며 미리듣기는 선택한 반복만 유한하게 예약한다", async () => {
  const original = globalThis.window, starts: number[] = [], levels: number[] = [];
  let created = 0;
  class AudioContextFixture {
    state = "running"; currentTime = 10; destination = {};
    constructor() { created++; }
    createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime(value: number) { levels.push(value); } }, connect() {}, disconnect() {} }; }
    createOscillator() { return { type: "sine", frequency: { setValueAtTime() {} }, connect() {}, disconnect() {}, start(at: number) { starts.push(at); }, stop() {}, onended: null }; }
  }
  Object.assign(globalThis, { window: { AudioContext: AudioContextFixture } });
  try {
    assert.equal(await playOperationalSound({ ...DEFAULT_OPERATIONAL_SOUND, volume: 0 }), true);
    assert.equal(await playOperationalSound({ ...DEFAULT_OPERATIONAL_SOUND, enabled: false }), true);
    assert.equal(created, 0);
    assert.equal(await playOperationalSound({ ...DEFAULT_OPERATIONAL_SOUND, tone: "beep", volume: 25, repeat: 3 }), true);
    assert.equal(created, 1); assert.equal(starts.length, 3);
    assert.ok(starts.every(at => at >= 10 && at < 13));
    assert.ok(levels.every(value => value > 0 && value <= 0.045));
    stopOperationalSound();
  } finally { Object.assign(globalThis, { window: original }); }
});
