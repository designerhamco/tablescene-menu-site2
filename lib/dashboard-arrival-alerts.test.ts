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

test("browser notification preference is scoped to a site and dashboard kind", () => {
  assert.equal(arrivalAlerts.getDashboardBrowserNotificationPreferenceKey({
    menuSiteId: "site-123",
    kind: "orders",
  }), "menulink:dashboard-browser-notifications:orders:site-123");
  assert.equal(arrivalAlerts.getDashboardBrowserNotificationPreferenceKey({
    menuSiteId: "site-123",
    kind: "calls",
  }), "menulink:dashboard-browser-notifications:calls:site-123");
});

test("browser notification requires explicit opt-in, permission, and a background page", () => {
  const base = {
    enabled: true,
    permission: "granted" as const,
    pageHasAttention: false,
    newCount: 2,
  };

  assert.equal(arrivalAlerts.shouldShowDashboardBrowserNotification(base), true);
  assert.equal(arrivalAlerts.shouldShowDashboardBrowserNotification({ ...base, enabled: false }), false);
  assert.equal(arrivalAlerts.shouldShowDashboardBrowserNotification({ ...base, permission: "default" }), false);
  assert.equal(arrivalAlerts.shouldShowDashboardBrowserNotification({ ...base, permission: "denied" }), false);
  assert.equal(arrivalAlerts.shouldShowDashboardBrowserNotification({ ...base, permission: "unsupported" }), false);
  assert.equal(arrivalAlerts.shouldShowDashboardBrowserNotification({ ...base, pageHasAttention: true }), false);
  assert.equal(arrivalAlerts.shouldShowDashboardBrowserNotification({ ...base, newCount: 0 }), false);
});

test("browser notification copy contains only a generic arrival count", () => {
  assert.deepEqual(arrivalAlerts.getDashboardBrowserNotificationCopy({ kind: "orders", newCount: 2 }), {
    title: "새 주문 2건",
    body: "아티메뉴 주문관리 화면에서 확인해 주세요.",
  });
  assert.deepEqual(arrivalAlerts.getDashboardBrowserNotificationCopy({ kind: "calls", newCount: 1 }), {
    title: "새 호출 1건",
    body: "아티메뉴 호출관리 화면에서 확인해 주세요.",
  });
});

test("dashboard keeps polling in the background only after browser notification opt-in", () => {
  assert.equal(arrivalAlerts.shouldRefreshArrivalDashboard({
    pageVisible: true,
    browserNotificationsEnabled: false,
    mutationPending: false,
  }), true);
  assert.equal(arrivalAlerts.shouldRefreshArrivalDashboard({
    pageVisible: false,
    browserNotificationsEnabled: true,
    mutationPending: false,
  }), true);
  assert.equal(arrivalAlerts.shouldRefreshArrivalDashboard({
    pageVisible: false,
    browserNotificationsEnabled: false,
    mutationPending: false,
  }), false);
  assert.equal(arrivalAlerts.shouldRefreshArrivalDashboard({
    pageVisible: true,
    browserNotificationsEnabled: true,
    mutationPending: true,
  }), false);
});
