import assert from "node:assert/strict";
import test from "node:test";

import {
  getBusinessProvisioningAction,
  getInitialSubscriptionPaymentId,
  getPaymentProvisioningAction,
  normalizePurchaseAttemptId,
} from "./payment-provisioning-idempotency";

const attemptId = "11111111-1111-4111-8111-111111111111";
const paymentId = "billing_11111111111141118111111111111111";

test("normalizes a purchase attempt and derives one stable initial payment id", () => {
  assert.equal(normalizePurchaseAttemptId(` ${attemptId.toUpperCase()} `), attemptId);
  assert.equal(getInitialSubscriptionPaymentId(attemptId), paymentId);
  assert.equal(getInitialSubscriptionPaymentId(attemptId), getInitialSubscriptionPaymentId(attemptId));
  assert.equal(normalizePurchaseAttemptId("not-an-attempt"), null);
});

test("derives a different payment id for a separate valid purchase attempt", () => {
  const secondAttemptId = "22222222-2222-4222-8222-222222222222";
  assert.notEqual(getInitialSubscriptionPaymentId(attemptId), getInitialSubscriptionPaymentId(secondAttemptId));
});

test("returns an already completed subscription provisioning result", () => {
  assert.equal(
    getBusinessProvisioningAction({
      expectedPaymentId: paymentId,
      snapshot: {
        status: "active",
        menuSiteId: "menu-a",
        paymentId,
        hasOrder: true,
        hasPayment: true,
        hasEntitlement: true,
      },
    }),
    "return_existing"
  );
});

test("recovers an incomplete subscription instead of creating another one", () => {
  assert.equal(
    getBusinessProvisioningAction({
      expectedPaymentId: paymentId,
      snapshot: {
        status: "pending",
        menuSiteId: null,
        paymentId: null,
        hasOrder: false,
        hasPayment: false,
        hasEntitlement: false,
      },
    }),
    "recover"
  );
});

test("recovers an active subscription with an incomplete downstream link", () => {
  assert.equal(
    getBusinessProvisioningAction({
      expectedPaymentId: paymentId,
      snapshot: {
        status: "active",
        menuSiteId: "menu-a",
        paymentId,
        hasOrder: true,
        hasPayment: true,
        hasEntitlement: false,
      },
    }),
    "recover"
  );
});

test("requires review when an attempt points at a different payment", () => {
  assert.equal(
    getBusinessProvisioningAction({
      expectedPaymentId: paymentId,
      snapshot: {
        status: "active",
        menuSiteId: "menu-a",
        paymentId: "billing_other",
        hasOrder: true,
        hasPayment: true,
        hasEntitlement: true,
      },
    }),
    "manual_review"
  );
});

test("distinguishes new, completed, and partial one-time payment provisioning", () => {
  assert.equal(
    getPaymentProvisioningAction({ hasOrder: false, hasPayment: false, hasMenuSite: false, hasEntitlement: false }),
    "create"
  );
  assert.equal(
    getPaymentProvisioningAction({ hasOrder: true, hasPayment: true, hasMenuSite: true, hasEntitlement: true }),
    "return_existing"
  );
  assert.equal(
    getPaymentProvisioningAction({ hasOrder: true, hasPayment: true, hasMenuSite: false, hasEntitlement: false }),
    "recover"
  );
});

test("returns the same completed action for three replays of one payment", () => {
  const snapshot = { hasOrder: true, hasPayment: true, hasMenuSite: true, hasEntitlement: true };
  assert.deepEqual(
    Array.from({ length: 3 }, () => getPaymentProvisioningAction(snapshot)),
    ["return_existing", "return_existing", "return_existing"]
  );
});
