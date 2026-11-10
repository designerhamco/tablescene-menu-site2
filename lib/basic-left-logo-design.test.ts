import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getCatalogDesign } from "./catalog-designs";
import { getDefaultDesignReview } from "./menu-design-policy";
import { getStandardDesignCopy } from "./standard-design-copy";
import { getMenuPlanSelection } from "./menu-plan-contract";

const designId = "basic-top-row-left-logo";
test("left-logo list is a separate standard design with the original top-row starter", () => {
  const design = getDefaultDesignReview(designId, "cafe_design_a")!;
  const original = getDefaultDesignReview("basic-top-row", "cafe_design_a")!;
  assert.equal(design.itemLayout, "list");
  assert.deepEqual(getStandardDesignCopy(design), getStandardDesignCopy(original));
  assert.equal(getCatalogDesign(designId)?.name, "상단행 고정형(왼쪽 로고) · 리스트형");
  assert.ok(getMenuPlanSelection("business_basic_single_monthly", designId, "cafe_design_a"));
  assert.equal(getMenuPlanSelection("business_basic_multi_monthly", designId, "cafe_design_a"), null);
});

test("SQL registration only extends the existing allowlists, preserving every authorization and billing check", () => {
  const read = (file: string) => readFileSync(new URL(`../supabase/migrations/${file}`, import.meta.url), "utf8");
  const migration = read("20261110042640_add_basic_top_row_left_logo_design.sql");
  const cases = [
    ["20261021122057_add_menu_design_subscription_contract.sql", "enforce_menu_design_contract"],
    ["20261021140627_add_menu_plan_change_reservations.sql", "reserve_menu_plan_change"],
    ["20261021140627_add_menu_plan_change_reservations.sql", "apply_paid_menu_plan_change"],
  ];
  for (const [file, name] of cases) {
    const source = read(file);
    const start = source.indexOf(`create function public.${name}(`);
    const end = source.indexOf("end $$;", start) + "end $$;".length;
    const unchanged = source.slice(start, end);
    const updatedStart = migration.indexOf(`create or replace function public.${name}(`);
    const updatedEnd = migration.indexOf("end $$;", updatedStart) + "end $$;".length;
    assert.notEqual(updatedStart, -1);
    const restored = migration.slice(updatedStart, updatedEnd)
      .replace("create or replace function", "create function")
      .replaceAll(`,'${designId}'`, "");
    assert.equal(restored, unchanged, `${name}: no unrelated function changes`);
    assert.equal(migration.slice(updatedStart, updatedEnd).split(`'${designId}'`).length - 1, 1);
  }
});
