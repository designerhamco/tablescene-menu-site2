import assert from "node:assert/strict";
import test from "node:test";

import { formatTimeSaleDigitalCountdownLabel } from "./menu-time-sale-display";

test("digital time-sale countdown always uses hours, minutes, and seconds", () => {
  const nowMs = Date.parse("2026-09-21T00:00:00.000Z");
  assert.equal(formatTimeSaleDigitalCountdownLabel(nowMs + 59 * 60_000 + 59_000, nowMs), "00:59:59");
  assert.equal(formatTimeSaleDigitalCountdownLabel(nowMs + 9_000, nowMs), "00:00:09");
});

test("digital time-sale countdown includes hours without losing fixed-width digits", () => {
  const nowMs = Date.parse("2026-09-21T00:00:00.000Z");
  assert.equal(formatTimeSaleDigitalCountdownLabel(nowMs + 60 * 60_000, nowMs), "01:00:00");
  assert.equal(formatTimeSaleDigitalCountdownLabel(nowMs + (2 * 3600 + 3 * 60 + 4) * 1000, nowMs), "02:03:04");
  assert.equal(formatTimeSaleDigitalCountdownLabel(nowMs - 1_000, nowMs), "00:00:00");
});
