import assert from "node:assert/strict";
import test from "node:test";
import { createDefaultTypographyRoleSettings, getCafeATypographyRolePayload, getCustomTypographySettings, getTypographyCssVariables, getTypographyCustomColorRoles, mergeTypographySettings, normalizeTypographyRoleSettings } from "./template-typography-presets";

const keys = ["cafe_design_a", "cafe_mocha_forest_a", "cafe_sunday_line_a", "cafe_van_gogh_a", "cafe_round_focus_a", "fast_food_loop_bagel_a", "restaurant_onue_a", "dining_aube_table_a", "dining_aube_table_b"];
test("other-text colors survive the editor save JSON and renderer settings round trip", () => {
  for (const key of keys) {
    const raw = createDefaultTypographyRoleSettings();
    for (const role of ["itemName", "supporting", "price"] as const) raw[role].color = "#5a327d";
    raw.brand.color = "#852322";
    raw.category.color = "#24369C";
    const normalized = normalizeTypographyRoleSettings(raw, key);
    const page = JSON.parse(JSON.stringify({ design: { typographyRoles: getCafeATypographyRolePayload(normalized) } }));
    const saved = mergeTypographySettings(key, getCustomTypographySettings({}, page));
    const css = getTypographyCssVariables(saved, key) as Record<string, string>;
    assert.equal(getTypographyCustomColorRoles(saved), "itemName supporting price");
    for (const role of ["item-name", "supporting", "price"]) assert.equal(css[`--menu-role-${role}-color`], "#5A327D", key);
    assert.equal(css["--menu-role-brand-color"], "#852322");
    assert.equal(css["--menu-role-category-color"], "#24369C");
  }
});
test("reset colors remain absent and invalid colors cannot become rendered styles", () => {
  const raw = createDefaultTypographyRoleSettings();
  raw.brand.font_ko_key = "pretendard";
  raw.itemName.color = "red; background: black";
  raw.supporting.color = "#abc";
  const payload = getCafeATypographyRolePayload(normalizeTypographyRoleSettings(raw, "cafe_mocha_forest_a"));
  assert.deepEqual(payload, { brand: { font_ko_key: "pretendard" } });
  const settings = mergeTypographySettings("cafe_mocha_forest_a", { typography_roles: payload });
  assert.equal(getTypographyCustomColorRoles(settings), undefined);
  assert.equal((getTypographyCssVariables(settings) as Record<string, string>)["--menu-role-supporting-color"], undefined);
  assert.equal(getCafeATypographyRolePayload(createDefaultTypographyRoleSettings()), null);
});
