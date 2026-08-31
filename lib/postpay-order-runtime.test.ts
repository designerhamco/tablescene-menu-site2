import assert from "node:assert/strict";
import test from "node:test";

const runtimeModule = await import(
  new URL("./postpay-order-runtime.ts", import.meta.url).href
) as typeof import("./postpay-order-runtime");

const {
  getPostpayOrderAllowedSiteIds,
  isPostpayOrderRuntimeEnabled,
  isPostpayOrderRuntimeEnabledForSite,
  isUuid,
} = runtimeModule;

const SITE_ID = "11111111-1111-4111-8111-111111111111";

test("postpay runtime stays product-policy-off even when the legacy env is true", () => {
  assert.equal(isPostpayOrderRuntimeEnabled(undefined), false);
  assert.equal(isPostpayOrderRuntimeEnabled("false"), false);
  assert.equal(isPostpayOrderRuntimeEnabled(" TRUE "), false);
});

test("postpay runtime requires an explicit UUID site allowlist", () => {
  const allowed = getPostpayOrderAllowedSiteIds(` invalid, ${SITE_ID.toUpperCase()} `);
  assert.deepEqual([...allowed], [SITE_ID]);
  assert.equal(isPostpayOrderRuntimeEnabledForSite(SITE_ID, { enabled: true, allowedSiteIds: allowed }), false);
  assert.equal(isPostpayOrderRuntimeEnabledForSite(SITE_ID, { enabled: false, allowedSiteIds: allowed }), false);
  assert.equal(isPostpayOrderRuntimeEnabledForSite("22222222-2222-4222-8222-222222222222", { enabled: true, allowedSiteIds: allowed }), false);
});

test("UUID validation rejects malformed identifiers", () => {
  assert.equal(isUuid(SITE_ID), true);
  assert.equal(isUuid("not-a-uuid"), false);
  assert.equal(isUuid(null), false);
});
