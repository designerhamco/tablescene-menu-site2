import assert from "node:assert/strict";
import test from "node:test";
import { catalogDesigns, filterCatalogDesigns } from "./catalog-designs";
import { CATALOG_COLORS, CATALOG_MOODS, normalizeCatalogColor, normalizeCatalogMood, normalizeCatalogSearch, normalizeCatalogThumbnailSize } from "./catalog-facets";

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
  assert.equal(filterCatalogDesigns("basic", "standard", "all", "all", { color: "red" }).length, 0);
  assert.deepEqual(ids(filterCatalogDesigns("display", "designer", "cafe_bakery", "all", { mood: "lively", color: "blue", query: "썸머" })), ["display_menu_a"]);
});

test("unknown URL choices safely restore default controls", () => {
  for (const input of ["unknown", ["cozy"], null, undefined, { color: "red" }]) {
    assert.equal(normalizeCatalogMood(input), "all");
    assert.equal(normalizeCatalogColor(input), "all");
    assert.equal(normalizeCatalogThumbnailSize(input), "large");
  }
  assert.equal(normalizeCatalogThumbnailSize("small"), "small");
  assert.equal(normalizeCatalogSearch(["mellow"]), "");
});
