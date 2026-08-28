import assert from "node:assert/strict";
import test from "node:test";

import { getTemplateCapabilities } from "./template-capabilities";
import { getSupportedServices, getTemplateEditConfig, getTemplateEditorTabs } from "./template-types";
import { templateCatalog } from "./templates";

const BASIC_LAUNCH_TEMPLATE_KEYS = [
  "cafe_design_a",
  "cafe_mocha_forest_a",
  "cafe_sunday_line_a",
  "cafe_round_focus_a",
  "cafe_brew_chapter_a",
  "cafe_noir_a",
] as const;

const BASIC_EDITOR_TAB_KEYS = ["basic", "cover", "menu", "design", "localization", "publish"];

test("every Basic launch template is service-compatible without changing catalog visibility", () => {
  const expectedCatalogStatuses = {
    cafe_design_a: "available",
    cafe_mocha_forest_a: "hidden",
    cafe_sunday_line_a: "hidden",
    cafe_round_focus_a: "hidden",
    cafe_brew_chapter_a: "hidden",
    cafe_noir_a: "retired",
  } as const;

  for (const templateKey of BASIC_LAUNCH_TEMPLATE_KEYS) {
    assert.deepEqual(getSupportedServices(templateKey), ["basic"], templateKey);
    assert.equal(
      templateCatalog.find((template) => template.key === templateKey)?.status,
      expectedCatalogStatuses[templateKey],
      templateKey,
    );
  }
});

test("every Basic launch template exposes the approved editing and localization flow", () => {
  for (const templateKey of BASIC_LAUNCH_TEMPLATE_KEYS) {
    assert.deepEqual(getTemplateEditorTabs(templateKey).map((tab) => tab.key), BASIC_EDITOR_TAB_KEYS, templateKey);
  }

  const brewChapterEditConfig = getTemplateEditConfig("cafe_brew_chapter_a");
  assert.ok(brewChapterEditConfig && "heroMode" in brewChapterEditConfig);
  assert.equal(brewChapterEditConfig.heroMode, "cover");
});

test("specialized launch template capabilities remain fail-closed", () => {
  const brewChapter = getTemplateCapabilities("cafe_brew_chapter_a");
  assert.equal(brewChapter.multiPage?.enabled, true);
  assert.equal(brewChapter.menuCover.coverMode, "page");
  assert.equal(brewChapter.events, false);
  assert.equal(brewChapter.menuWidgets.enabled, false);

  const noir = getTemplateCapabilities("cafe_noir_a");
  assert.equal(noir.menuItemImages, false);
  assert.equal(noir.priceOptions, false);
  assert.equal(noir.menuCover.coverMode, "none");
  assert.equal(noir.events, false);
});

test("Display launch template stays isolated to the Display service", () => {
  assert.deepEqual(getSupportedServices("display_menu_a"), ["display"]);
  assert.deepEqual(
    getTemplateEditorTabs("display_menu_a").map((tab) => tab.key),
    ["basic", "menu", "design", "localization", "publish"],
  );
  assert.equal(templateCatalog.find((template) => template.key === "display_menu_a")?.status, "available");
});
