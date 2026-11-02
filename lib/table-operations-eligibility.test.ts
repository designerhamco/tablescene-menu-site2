import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import { isPaidTableOperationsEligible } from "./table-operations-eligibility";

const active = { planType: "business_basic", canEdit: true, canUseWriteActions: true };
const siteId = "cd9afa8f-b862-48b3-848a-dec617279c6c";

test("유료 베이직·다이닝은 자동 대상이고 무료·만료·읽기 전용·Display는 제외한다", () => {
  for (const key of ["cafe_design_a", "dining_aube_table_a"]) {
    assert.equal(isPaidTableOperationsEligible(active, key), true);
    for (const access of [null, { ...active, planType: "personal_trial" }, { ...active, canEdit: false }, { ...active, canUseWriteActions: false }]) {
      assert.equal(isPaidTableOperationsEligible(access, key), false);
    }
  }
  for (const key of [null, undefined, "display_menu_a", "unknown"]) {
    assert.equal(isPaidTableOperationsEligible(active, key), false);
  }
});

test("서버 판정은 최신 이용권과 실제 템플릿을 읽고 누락·조회 오류에서 차단한다", async () => {
  let access: typeof active | null = active;
  let template = "dining_aube_table_a";
  let failed = false;
  let siteExists = true;
  let reads = 0;
  const dependencies: Record<string, unknown> = {
    "server-only": {},
    "@/lib/table-operations-eligibility": { isPaidTableOperationsEligible },
    "@/lib/server/menu-site-access-service": {
      getMenuSiteAccessStateForMenuSite: async (input: { menuSiteId: string }) => {
        assert.equal(input.menuSiteId, siteId);
        return access;
      },
    },
    "@/lib/supabase/admin": { createAdminClient: () => ({ from(table: string) {
      assert.equal(table, "menu_sites"); reads++;
      return {
        select(columns: string) { assert.equal(columns, "template_key"); return this; },
        eq(key: string, value: string) { assert.deepEqual([key, value], ["id", siteId]); return this; },
        async maybeSingle() { return { data: siteExists ? { template_key: template } : null, error: failed ? {} : null }; },
      };
    } }) },
  };
  const code = ts.transpileModule(readFileSync(new URL("./server/table-operations-eligibility-service.ts", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const loaded = { exports: {} };
  new Function("require", "module", "exports", code)((name: string) => {
    assert.ok(name in dependencies, name); return dependencies[name];
  }, loaded, loaded.exports);
  const { hasPaidTableOperationsAccess } = loaded.exports as typeof import("./server/table-operations-eligibility-service");
  assert.equal(await hasPaidTableOperationsAccess(siteId), true);
  template = "display_menu_a";
  assert.equal(await hasPaidTableOperationsAccess(siteId), false);
  template = "cafe_design_a";
  assert.equal(await hasPaidTableOperationsAccess(siteId), true);
  failed = true;
  assert.equal(await hasPaidTableOperationsAccess(siteId), false);
  failed = false; siteExists = false;
  assert.equal(await hasPaidTableOperationsAccess(siteId), false);
  const before = reads;
  for (const denied of [null, { ...active, planType: "personal_trial" }, { ...active, canEdit: false }, { ...active, canUseWriteActions: false }]) {
    access = denied;
    assert.equal(await hasPaidTableOperationsAccess(siteId), false);
    assert.equal(reads, before);
  }
});
