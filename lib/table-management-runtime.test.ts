import assert from "node:assert/strict";
import test from "node:test";

const {
  isTableManagementRuntimeEnabled,
  isTableManagementRuntimeEnabledForSite,
} = await import(
  new URL("./table-management-runtime.ts", import.meta.url).href
) as typeof import("./table-management-runtime");

test("table management requires explicit runtime enablement", () => {
  assert.equal(isTableManagementRuntimeEnabled(undefined), false);
  assert.equal(isTableManagementRuntimeEnabled(""), false);
  assert.equal(isTableManagementRuntimeEnabled("false"), false);
  assert.equal(isTableManagementRuntimeEnabled("TRUE"), true);
});

test("table runtime admits newly purchased site IDs without manual onboarding", () => {
  for (const id of ["11111111-1111-4111-8111-111111111111", "cd9afa8f-b862-48b3-848a-dec617279c6c"]) {
    assert.equal(isTableManagementRuntimeEnabledForSite(id, { enabled: true }), true);
    assert.equal(isTableManagementRuntimeEnabledForSite(id, { enabled: false }), false);
  }
  assert.equal(isTableManagementRuntimeEnabledForSite("invalid", { enabled: true }), false);
});
