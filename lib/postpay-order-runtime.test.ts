import assert from "node:assert/strict";
import test from "node:test";

const runtimeModule = await import(
  new URL("./postpay-order-runtime.ts", import.meta.url).href
) as typeof import("./postpay-order-runtime");

const {
  isPostpayOrderRuntimeEnabled,
  isPostpayOrderRuntimeEnabledForSite,
  isUuid,
} = runtimeModule;

const SITE_ID = "11111111-1111-4111-8111-111111111111";

test("postpay runtime requires explicit enablement", () => {
  assert.equal(isPostpayOrderRuntimeEnabled(undefined), false);
  assert.equal(isPostpayOrderRuntimeEnabled("false"), false);
  assert.equal(isPostpayOrderRuntimeEnabled(" TRUE "), true);
});

test("postpay runtime uses a global switch and valid ID, not a pilot allowlist", () => {
  assert.equal(isPostpayOrderRuntimeEnabledForSite(SITE_ID, { enabled: true }), true);
  assert.equal(isPostpayOrderRuntimeEnabledForSite(SITE_ID, { enabled: false }), false);
  assert.equal(isPostpayOrderRuntimeEnabledForSite("22222222-2222-4222-8222-222222222222", { enabled: true }), true);
  assert.equal(isPostpayOrderRuntimeEnabledForSite("invalid", { enabled: true }), false);
});

test("UUID validation rejects malformed identifiers", () => {
  assert.equal(isUuid(SITE_ID), true);
  assert.equal(isUuid("not-a-uuid"), false);
  assert.equal(isUuid(null), false);
});
