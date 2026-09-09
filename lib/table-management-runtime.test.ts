import assert from "node:assert/strict";
import test from "node:test";

const {
  getTableManagementAllowedSiteIds,
  isTableManagementRuntimeEnabled,
  isTableManagementRuntimeEnabledForSite,
} = await import(
  new URL("./table-management-runtime.ts", import.meta.url).href
) as typeof import("./table-management-runtime");

test("table management stays fail-closed until product activation is explicit", () => {
  assert.equal(isTableManagementRuntimeEnabled(undefined), false);
  assert.equal(isTableManagementRuntimeEnabled(""), false);
  assert.equal(isTableManagementRuntimeEnabled("false"), false);
  assert.equal(isTableManagementRuntimeEnabled("TRUE"), true);
});

test("table management requires an explicit per-site allowlist", () => {
  const allowedId = "11111111-1111-4111-8111-111111111111";
  const deniedId = "22222222-2222-4222-8222-222222222222";
  const allowedSiteIds = getTableManagementAllowedSiteIds(`${allowedId},invalid,${allowedId.toUpperCase()}`);

  assert.deepEqual([...allowedSiteIds], [allowedId]);
  assert.equal(isTableManagementRuntimeEnabledForSite(allowedId, { enabled: true, allowedSiteIds }), true);
  assert.equal(isTableManagementRuntimeEnabledForSite(deniedId, { enabled: true, allowedSiteIds }), false);
  assert.equal(isTableManagementRuntimeEnabledForSite(allowedId, { enabled: false, allowedSiteIds }), false);
});
