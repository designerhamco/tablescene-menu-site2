import assert from "node:assert/strict";
import test from "node:test";

const { isTableManagementRuntimeEnabled } = await import(
  new URL("./table-management-runtime.ts", import.meta.url).href
) as typeof import("./table-management-runtime");

test("table management stays fail-closed until product activation is explicit", () => {
  assert.equal(isTableManagementRuntimeEnabled(undefined), false);
  assert.equal(isTableManagementRuntimeEnabled(""), false);
  assert.equal(isTableManagementRuntimeEnabled("false"), false);
  assert.equal(isTableManagementRuntimeEnabled("TRUE"), true);
});
