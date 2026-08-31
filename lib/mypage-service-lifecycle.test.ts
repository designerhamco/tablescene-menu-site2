import assert from "node:assert/strict";
import test from "node:test";

import {
  getServiceLifecycleBucket,
  getRemainingDaysUntilKst,
  resolveServiceLifecycle,
} from "./mypage-service-lifecycle";

const NOW = new Date("2026-08-18T03:00:00.000Z");

test("keeps the KST D-Day active through the displayed calendar day", () => {
  assert.equal(getRemainingDaysUntilKst("2026-08-18T00:00:00.000Z", NOW), 0);
  assert.equal(getRemainingDaysUntilKst("2026-08-17T00:00:00.000Z", NOW), -1);
});

test("accepts a current entitlement even when a legacy subscription row is missing", () => {
  const state = resolveServiceLifecycle({
    entitlement: { status: "active", access_expires_at: "2027-06-03T07:49:26.055Z" },
    menuSite: { status: "draft" },
    now: NOW,
  });

  assert.equal(state.hasActiveEntitlement, true);
  assert.equal(state.hasCurrentAccess, true);
  assert.equal(getServiceLifecycleBucket({
    entitlement: { status: "active", access_expires_at: "2027-06-03T07:49:26.055Z" },
    menuSite: { status: "draft" },
    now: NOW,
  }), "active");
});

test("does not treat a stale active string as current access after its access date", () => {
  const state = resolveServiceLifecycle({
    entitlement: { status: "active", access_expires_at: "2026-07-30T02:45:10.504Z" },
    subscription: {
      status: "active",
      current_period_end: "2026-07-30T02:45:10.504Z",
      next_billing_at: "2026-07-30T02:45:10.504Z",
    },
    menuSite: { status: "draft" },
    now: NOW,
  });

  assert.equal(state.hasActiveEntitlement, false);
  assert.equal(state.hasActiveSubscription, false);
  assert.equal(state.hasExpiredAccessWindow, true);
  assert.equal(state.hasCurrentAccess, false);
  assert.equal(getServiceLifecycleBucket({
    entitlement: { status: "active", access_expires_at: "2026-07-30T02:45:10.504Z" },
    subscription: { status: "active", current_period_end: "2026-07-30T02:45:10.504Z" },
    now: NOW,
  }), "unrecoverable");
});

test("requires linked entitlement and subscription rows to agree when both exist", () => {
  const state = resolveServiceLifecycle({
    entitlement: { status: "archived", access_expires_at: "2026-06-30T07:22:27.440Z" },
    subscription: {
      status: "active",
      current_period_end: "2027-06-30T07:22:27.440Z",
    },
    menuSite: { status: "draft" },
    now: NOW,
  });

  assert.equal(state.hasCurrentAccess, false);
  assert.equal(state.isKnownInactive, true);
});

test("distinguishes an active cancellation reservation from an ended one", () => {
  const scheduled = resolveServiceLifecycle({
    subscription: {
      status: "active",
      cancel_at_period_end: true,
      current_period_end: "2026-08-31T00:00:00.000Z",
    },
    now: NOW,
  });
  const ended = resolveServiceLifecycle({
    subscription: {
      status: "active",
      cancel_at_period_end: true,
      current_period_end: "2026-08-17T00:00:00.000Z",
    },
    now: NOW,
  });

  assert.equal(scheduled.isCancelScheduled, true);
  assert.equal(scheduled.hasCurrentAccess, true);
  assert.equal(getServiceLifecycleBucket({
    subscription: {
      status: "active",
      cancel_at_period_end: true,
      current_period_end: "2026-08-31T00:00:00.000Z",
    },
    now: NOW,
  }), "cancel_scheduled");
  assert.equal(ended.isPastCancelScheduled, true);
  assert.equal(ended.hasCurrentAccess, false);
});

test("keeps recoverable retention separate from current access", () => {
  const state = resolveServiceLifecycle({
    entitlement: {
      status: "archived",
      access_expires_at: "2026-06-30T13:08:06.263Z",
      data_retention_until: "2026-09-28T13:08:06.263Z",
    },
    menuSite: { status: "archived" },
    now: NOW,
  });

  assert.equal(state.hasCurrentAccess, false);
  assert.equal(state.hasActiveRetention, true);
  assert.equal(getServiceLifecycleBucket({
    entitlement: {
      status: "archived",
      access_expires_at: "2026-06-30T13:08:06.263Z",
      data_retention_until: "2026-09-28T13:08:06.263Z",
    },
    menuSite: { status: "archived" },
    now: NOW,
  }), "archived");
});

test("routes payment failures to review before retention or deletion labels", () => {
  assert.equal(getServiceLifecycleBucket({
    subscription: {
      status: "past_due",
      current_period_end: "2026-08-31T00:00:00.000Z",
    },
    now: NOW,
  }), "needs_review");
});
