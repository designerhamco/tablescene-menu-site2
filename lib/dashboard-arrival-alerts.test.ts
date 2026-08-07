import assert from "node:assert/strict";
import test from "node:test";

const arrivalAlerts = await import(
  new URL("./dashboard-arrival-alerts.ts", import.meta.url).href
) as typeof import("./dashboard-arrival-alerts");

test("new arrival detection ignores known and duplicate identifiers", () => {
  assert.deepEqual(arrivalAlerts.getNewDashboardArrivalIds({
    currentIds: ["new-2", "new-1", "new-1", "seen"],
    seenIds: ["seen", "older"],
  }), ["new-2", "new-1"]);
});

test("seen arrival history keeps current identifiers first and stays bounded", () => {
  assert.deepEqual(arrivalAlerts.mergeDashboardArrivalSeenIds({
    currentIds: ["current", "seen"],
    seenIds: ["seen", "older", "oldest"],
    limit: 3,
  }), ["current", "seen", "older"]);
  assert.deepEqual(arrivalAlerts.mergeDashboardArrivalSeenIds({
    currentIds: ["current"],
    seenIds: [],
    limit: 0,
  }), []);
});
