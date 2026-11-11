import assert from "node:assert/strict";
import test from "node:test";
import { catalogDesigns, filterCatalogDesigns, normalizeCatalogFilters } from "./catalog-designs";
import { CATALOG_COLORS, CATALOG_MOODS, normalizeCatalogColor, normalizeCatalogMood, normalizeCatalogSearch, normalizeCatalogThumbnailSize, normalizeCatalogSelections } from "./catalog-facets";

const ids = (items: typeof catalogDesigns) => items.map(item => item.id);

test("every public design has registered discovery tags independent of customer settings", () => {
  for (const design of catalogDesigns) {
    assert.ok(design.moods.length > 0, design.id);
    assert.ok(design.colors.length > 0, design.id);
    for (const mood of design.moods) assert.ok(CATALOG_MOODS.some(item => item.key === mood), design.id);
    for (const color of design.colors) assert.ok(CATALOG_COLORS.some(item => item.key === color), design.id);
    assert.equal(new Set(design.moods).size, design.moods.length);
    assert.equal(new Set(design.colors).size, design.colors.length);
  }
});

test("industry, mood, color, layout and name intersect instead of broadening the result", () => {
  assert.deepEqual(ids(filterCatalogDesigns("basic", "designer", "cafe_bakery", "list", { mood: "cozy", color: "red", query: "ｍｅｌｌｏｗ" })), ["cafe_mocha_forest_a"]);
  assert.deepEqual(ids(filterCatalogDesigns("basic", "designer", "cafe_bakery", "list", { mood: "modern", color: "green", query: " REALmatcha " })), ["cafe_design_a"]);
  assert.equal(filterCatalogDesigns("basic", "designer", "cafe_bakery", "album", { mood: "cozy", color: "red", query: "mellow" }).length, 0);
  assert.equal(filterCatalogDesigns("basic", "designer", "pub_bar", "list", { mood: "cozy", color: "red", query: "mellow" }).length, 0);
  assert.equal(filterCatalogDesigns("basic", "designer", "all", "all", { color: "purple" }).length, 0);
  assert.equal(filterCatalogDesigns("basic", "designer", "all", "all", { query: "칵테일" }).length, 0); // Name search, not description search.
});

test("search handles Korean, case and whitespace while preserving service and design-kind scope", () => {
  assert.deepEqual(ids(filterCatalogDesigns("dining", "designer", "all", "all", { query: "오브 테" })), ["dining_aube_table_a"]);
  assert.equal(filterCatalogDesigns("basic", "designer", "all", "all", { query: "오브" }).length, 0);
  assert.equal(filterCatalogDesigns("basic", "standard", "all", "all", { query: "mellow" }).length, 0);
  assert.deepEqual(filterCatalogDesigns("basic", "designer", "all", "all", { query: "   " }), filterCatalogDesigns("basic", "designer"));
  assert.equal(normalizeCatalogSearch("ＲＥＡＬ　ＭＡＴＣＨＡ"), "realmatcha");
  assert.deepEqual(ids(filterCatalogDesigns("basic", "designer", "all", "all", { query: "onue" })), ["restaurant_onue_a"]);
  assert.equal(normalizeCatalogSearch("a".repeat(101)).length, 100);
});

test("neutral standard designs remain industry-independent and old layout links still work", () => {
  assert.equal(filterCatalogDesigns("basic", "standard", "japanese", "album", { mood: "minimal", color: "white" }).length, 2);
  assert.equal(filterCatalogDesigns("basic", "standard", "album").length, 2);
  assert.equal(filterCatalogDesigns("basic", "standard", "all", "all", { color: "red" }).length, 7);
  assert.deepEqual(ids(filterCatalogDesigns("display", "designer", "cafe_bakery", "all", { mood: "lively", color: "blue", query: "썸머" })), ["display_menu_a"]);
});

test("unknown URL choices safely restore default controls", () => {
  for (const input of ["unknown", ["cozy"], null, undefined, { color: "red" }]) {
    assert.equal(normalizeCatalogMood(input), "all");
    assert.equal(normalizeCatalogColor(input), "all");
    assert.equal(normalizeCatalogThumbnailSize(input), "small");
  }
  assert.equal(normalizeCatalogThumbnailSize("small"), "small");
  assert.equal(normalizeCatalogThumbnailSize("large"), "large");
  assert.equal(normalizeCatalogSearch(["mellow"]), "");
});

test("multiple choices union within a facet and intersect between facets without duplicate cards", () => {
  const result = filterCatalogDesigns("basic", "designer", ["cafe_bakery", "restaurant_dining"], ["list", "album"], { mood: ["cozy", "lively"], color: ["red", "green"] });
  assert.deepEqual(ids(result), ["cafe_design_a", "cafe_mocha_forest_a"]);
  assert.deepEqual(ids(filterCatalogDesigns("basic", "designer", [], [], { color: ["red", "blue", "blue"] })), ["cafe_mocha_forest_a", "cafe_sunday_line_a", "fast_food_loop_bagel_a"]);
  assert.equal(filterCatalogDesigns("basic", "designer", [], ["album"], { color: ["red", "green"] }).length, 0);
  assert.deepEqual(filterCatalogDesigns("basic", "designer", [], [], { mood: [], color: [] }), filterCatalogDesigns("basic", "designer"));
  assert.deepEqual(ids(filterCatalogDesigns("basic", "designer", [], [], { mood: ["cozy", "lively"], color: ["red", "green"], query: "mellow" })), ["cafe_mocha_forest_a"]);
});

test("CSV and repeated URL choices restore in canonical order with unknown and duplicate values removed", () => {
  assert.deepEqual(normalizeCatalogSelections(["blue,red", "red", "unknown"], CATALOG_COLORS), ["red", "blue"]);
  assert.deepEqual(normalizeCatalogFilters({ industry: ["restaurant_dining", "cafe_bakery,cafe_bakery"], mood: "vintage,cozy", color: ["blue", "red"], layout: "album,list" }, "designer"), { industry: ["cafe_bakery", "restaurant_dining"], mood: ["cozy", "vintage"], color: ["red", "blue"], layout: ["list", "album"] });
  assert.deepEqual(normalizeCatalogFilters({ industry: "unknown", mood: [null], color: { red: true }, layout: "all" }, "designer"), { industry: [], mood: [], color: [], layout: [] });
});

test("standard designs use only layout and search; Display facets remain effective with a retained standard kind", () => {
  assert.deepEqual(normalizeCatalogFilters({ industry: "album", mood: "cozy", color: "red" }, "standard"), { industry: [], mood: [], color: [], layout: ["album"] });
  assert.equal(filterCatalogDesigns("basic", "standard", ["japanese"], ["list", "album"], { mood: ["cozy"], color: ["red"] }).length, 7);
  assert.equal(filterCatalogDesigns("basic", "standard", [], ["list", "album"], { query: "앨범" }).length, 2);
  assert.equal(filterCatalogDesigns("display", "standard", [], [], { color: ["red"] }).length, 0);
  assert.equal(filterCatalogDesigns("display", "standard", [], [], { color: ["blue", "red"] }).length, 1);
});
