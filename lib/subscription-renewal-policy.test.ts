import assert from "node:assert/strict";
import test from "node:test";

import { getSubscriptionRenewalDisposition } from "./subscription-renewal-policy";

test("cancel-at-period-end always expires instead of charging", () => {
  assert.equal(getSubscriptionRenewalDisposition({
    cancelAtPeriodEnd: true,
    billingKeyRef: "billing-key-that-must-not-be-used",
  }), "expire_at_period_end");
  assert.equal(getSubscriptionRenewalDisposition({
    cancelAtPeriodEnd: true,
    billingKeyRef: null,
  }), "expire_at_period_end");
});

test("active renewal without a usable billing key fails closed", () => {
  for (const billingKeyRef of [null, undefined, "", "   "]) {
    assert.equal(getSubscriptionRenewalDisposition({
      cancelAtPeriodEnd: false,
      billingKeyRef,
    }), "skip_missing_billing_key");
  }
});

test("only active renewal with a billing key can reach charging", () => {
  assert.equal(getSubscriptionRenewalDisposition({
    cancelAtPeriodEnd: false,
    billingKeyRef: "billing-key-ref",
  }), "charge");
  assert.equal(getSubscriptionRenewalDisposition({
    cancelAtPeriodEnd: null,
    billingKeyRef: " billing-key-ref ",
  }), "charge");
});
