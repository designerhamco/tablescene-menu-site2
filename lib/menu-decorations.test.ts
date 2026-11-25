import assert from "node:assert/strict";
import test from "node:test";
import { MENU_DECORATION_LINES, normalizeMenuDecorations, readMenuDecorations, menuDecorationScopeProps, supportsMenuDecorations, supportsMenuDecorationLine } from "./menu-decorations";
import { applyPreviewDesign, readPreviewDesign, serializePreviewDesign } from "./menu-preview-design";
import { applyBasicEditorPreviewDesign } from "./basic-editor-preview-design";
import { hasMenuColumnDivider, getMenuColumnDividerGeometry } from "./menu-column-divider";
import { getMenuPatternBands, resolveMenuPatternBands, supportsMenuPatternBands } from "./menu-pattern-bands";
import { buildMenuDesignMutation, buildMenuDesignReset } from "./menu-design-mutation";
import type { MenuPageData } from "./menu-page-data";

test("decoration input accepts only approved widths, stroke styles, booleans and six-digit colors", () => {
  assert.deepEqual(normalizeMenuDecorations({ patternBands: false, categoryUnderline: { visible: true, width: 3, style: "dotted", color: "#abcdef", extra: "drop" }, columnDivider: { width: 4, style: "double", color: "url(evil)" }, itemDivider: { visible: "true", width: 1.5 }, other: true }), { patternBands: false, categoryUnderline: { visible: true, width: 3, style: "dotted", color: "#ABCDEF" } });
  assert.deepEqual(readPreviewDesign({ decorations: [] }), {});
  assert.deepEqual(readPreviewDesign({ decorations: {} }), { decorations: {} });
  assert.deepEqual(readPreviewDesign(serializePreviewDesign({ decorations: { itemDivider: { visible: false, width: 2, style: "dashed" } } })), { decorations: { itemDivider: { visible: false, width: 2, style: "dashed" } } });
});

test("absent decoration overrides emit no CSS, including every existing native template", () => {
  for (const key of ["cafe_design_a", "cafe_mocha_forest_a", "cafe_sunday_line_a", "cafe_van_gogh_a", "cafe_round_focus_a", "fast_food_loop_bagel_a", "restaurant_onue_a"]) {
    assert.equal(supportsMenuDecorations(key), true);
    assert.deepEqual(menuDecorationScopeProps({}, key, false, false), { attributes: {}, style: {} });
  }
  for (const key of ["dining_aube_table_a", "dining_aube_table_b", "display_menu_a"]) assert.equal(supportsMenuDecorations(key), false);
  assert.equal(supportsMenuDecorations("cafe_design_a", "multi"), false);
});

test("album exclusions and mobile column exclusion remain explicit while supported settings survive", () => {
  const decorations = Object.fromEntries(MENU_DECORATION_LINES.map(key => [key, { visible: true, width: 3, style: "dashed", color: "#123456" }]));
  const album = menuDecorationScopeProps(decorations, "cafe_design_a", true, true);
  assert.equal(album.attributes["data-decoration-underline"], "on");
  assert.equal(album.attributes["data-decoration-category"], "on");
  for (const key of ["columnDivider", "itemDivider", "priceLeader"] as const) assert.equal(supportsMenuDecorationLine(key, true), false);
  for (const name of ["column", "item", "leader"]) assert.equal(album.attributes[`data-decoration-${name}`], undefined);
  assert.equal(supportsMenuDecorationLine("columnDivider", false, "mobile"), false);
  assert.equal(supportsMenuDecorationLine("columnDivider", false, "tablet"), true);
  assert.equal(supportsMenuPatternBands("restaurant_onue_a", {}), false);
  assert.equal(supportsMenuPatternBands("cafe_design_a", { menu_design_id: "basic-upper-left" }), false);
});

test("custom colors stay on their own strokes and omitted colors retain automatic ownership", () => {
  const result = menuDecorationScopeProps({ categoryUnderline: { color: "#ABCDEF" }, columnDivider: { visible: true }, categoryDivider: { visible: false, color: "#FFFFFF" } }, "cafe_design_a", false, false);
  assert.deepEqual(result.style, { "--decoration-underline-color": "#ABCDEF" });
  assert.equal(result.attributes["data-decoration-category"], "off");
  assert.equal(result.attributes["data-decoration-category-color"], undefined);
  assert.equal(result.attributes["data-decoration-column-stroke"], "custom");
  assert.deepEqual(menuDecorationScopeProps({ categoryUnderline: { color: "#ABCDEF" } }, "cafe_design_a", true, false), { attributes: {}, style: {} });
});

test("explicit ON with template stroke defaults retains native artwork and variable underline width", () => {
  for (const [template, key, name] of [["cafe_design_a", "categoryUnderline", "underline"], ["cafe_round_focus_a", "priceLeader", "leader"], ["cafe_mocha_forest_a", "columnDivider", "column"]] as const) {
    const props = menuDecorationScopeProps({ [key]: { visible: true } }, template, false, false);
    assert.equal(props.attributes[`data-decoration-${name}`], "on");
    assert.equal(props.attributes[`data-decoration-${name}-stroke`], undefined);
  }
});

test("preview and final editor use the same validated full snapshot without editing customer content", () => {
  const page = { unrelated: "keep", design: { patternBands: { enabled: true, thickness: 24 }, decorations: { itemDivider: { visible: true }, columnDivider: { width: 3 } }, appearance: { chipShape: "pill" } } };
  const source = { menuSite: { template_key: "cafe_design_a", page_settings: page }, items: [{ id: "customer", name: "손님 메뉴" }], pageSettings: {} } as unknown as MenuPageData;
  const before = structuredClone(source);
  const draft = { decorations: { itemDivider: { visible: false as const, width: 2 as const, style: "dotted" as const } } };
  const preview = applyPreviewDesign(source, draft, false);
  const saved = applyBasicEditorPreviewDesign(page, {}, "cafe_design_a", draft, false);
  assert.deepEqual(preview.menuSite.page_settings, saved);
  assert.deepEqual(readMenuDecorations(saved), draft.decorations);
  assert.deepEqual(source, before);
  assert.deepEqual(preview.items, source.items);
  assert.deepEqual(readMenuDecorations(applyBasicEditorPreviewDesign(saved, {}, "cafe_design_a", { decorations: {} }, false)), {});
  assert.deepEqual(readMenuDecorations(applyBasicEditorPreviewDesign(page, {}, "cafe_design_a", { pageBackground: "#123456" }, false)), readMenuDecorations(page));
  assert.deepEqual(readMenuDecorations(applyBasicEditorPreviewDesign({}, {}, "dining_aube_table_a", draft, false)), {});
});

test("column stroke width contributes once and reserves one inset on each side", () => {
  assert.equal(hasMenuColumnDivider("cafe_mocha_forest_a"), true);
  assert.equal(hasMenuColumnDivider("cafe_design_a"), false);
  assert.equal(hasMenuColumnDivider("cafe_design_a", { design: { decorations: { columnDivider: { visible: true } } } }), true);
  assert.equal(hasMenuColumnDivider("cafe_mocha_forest_a", { design: { decorations: { columnDivider: { visible: false } } } }), false);
  for (const width of [1, 2, 3]) assert.deepEqual(getMenuColumnDividerGeometry("20px", width), { gap: `calc(2 * 20px + ${width}px)`, offset: `calc(-1 * (20px + ${width}px))`, width: `${width}px` });
});

test("pattern visibility overrides retain uploaded artwork and native thickness", () => {
  const page = { design: { patternBands: { enabled: true, thickness: 24 }, decorations: { patternBands: false } } };
  assert.equal(getMenuPatternBands("fast_food_loop_bagel_a", page).enabled, false);
  assert.equal(resolveMenuPatternBands("fast_food_loop_bagel_a", {}, page), undefined);
  assert.equal(resolveMenuPatternBands("fast_food_loop_bagel_a", {}, { design: { ...page.design, decorations: { patternBands: true } } })?.thickness, 24);
  assert.equal(resolveMenuPatternBands("cafe_design_a", {}, { design: { decorations: { patternBands: true } } }), undefined, "no synthetic pattern is created without an image");
});

test("legacy saved-preview pattern OFF wins over saved decoration ON without changing storage", () => {
  const source = { menuSite: { template_key: "fast_food_loop_bagel_a", page_settings: { design: { decorations: { patternBands: true, itemDivider: { visible: true } } } } }, pageSettings: {} } as unknown as MenuPageData;
  const preview = applyPreviewDesign(source, { hidePatternBands: true }, false);
  assert.equal(resolveMenuPatternBands("fast_food_loop_bagel_a", {}, preview.menuSite.page_settings), undefined);
  assert.deepEqual(readMenuDecorations(preview.menuSite.page_settings), { patternBands: false, itemDivider: { visible: true } });
  assert.equal(readMenuDecorations(source.menuSite.page_settings).patternBands, true);
});

test("design switching restores per-design decorations and reset removes only presentation overrides", () => {
  const original = { categories: "keep", design: { decorations: { itemDivider: { visible: true, width: 3 } }, patternBands: { enabled: false }, customUnrelated: "keep" } };
  const settings = { menu_design_id: "basic-first-column" };
  const other = buildMenuDesignMutation({ settings, pageSettings: original, templateKey: "cafe_design_a", brandColor: null, targetId: "basic-top-row" });
  assert.deepEqual(readMenuDecorations(other.pageSettings), {});
  const restored = buildMenuDesignMutation({ settings: other.settings, pageSettings: other.pageSettings, templateKey: "cafe_design_a", brandColor: other.brandColor, targetId: "basic-first-column" });
  assert.deepEqual(readMenuDecorations(restored.pageSettings), readMenuDecorations(original));
  assert.equal(restored.pageSettings.categories, "keep");
  const reset = buildMenuDesignReset("cafe_design_a", settings, original);
  assert.deepEqual(readMenuDecorations(reset.pageSettings), {});
  assert.equal((reset.pageSettings.design as Record<string, unknown>).customUnrelated, "keep");
  assert.equal(original.design.decorations.itemDivider.width, 3);
});


test("generated leaders use supporting ink while untouched native leaders retain their palette", () => {
  assert.equal(menuDecorationScopeProps({ priceLeader: { visible: true } }, "cafe_mocha_forest_a", false, false).attributes["data-decoration-leader-ink"], "supporting");
  assert.equal(menuDecorationScopeProps({ priceLeader: { width: 2 } }, "cafe_round_focus_a", false, false).attributes["data-decoration-leader-ink"], undefined);
  assert.equal(menuDecorationScopeProps({}, "cafe_round_focus_a", false, false).attributes["data-decoration-leader-dots"], undefined);
});

test("spaced dots apply only to edited dotted strokes, without changing saved data or native defaults", () => {
  const dotted = { categoryUnderline: { visible: true, width: 2 as const, style: "dotted" as const } };
  const before = structuredClone(dotted);
  assert.equal(menuDecorationScopeProps(dotted, "cafe_design_a", false, false).attributes["data-decoration-underline-dots"], "true");
  assert.equal(menuDecorationScopeProps({ categoryUnderline: { style: "solid" } }, "cafe_design_a", false, false).attributes["data-decoration-underline-dots"], undefined);
  assert.deepEqual(dotted, before);
});
