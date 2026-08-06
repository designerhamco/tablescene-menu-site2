import assert from "node:assert/strict";
import test from "node:test";

import { getStarterPreset } from "./menu-starter-presets";
import { getTemplateCapabilities, type TemplateMenuCoverMode } from "./template-capabilities";
import { mergeTypographySettings } from "./template-typography-presets";
import { getTemplateByKey } from "./templates";

const BASIC_FEATURE_EXPECTATIONS = {
  cafe_design_a: { widgets: true, images: true, priceOptions: true, cover: "section", timeSales: 2, soldOut: 0 },
  cafe_mocha_forest_a: { widgets: true, images: true, priceOptions: true, cover: "section", timeSales: 2, soldOut: 0 },
  cafe_sunday_line_a: { widgets: true, images: true, priceOptions: true, cover: "section", timeSales: 2, soldOut: 0 },
  cafe_round_focus_a: { widgets: true, images: true, priceOptions: true, cover: "section", timeSales: 1, soldOut: 0 },
  cafe_brew_chapter_a: { widgets: false, images: true, priceOptions: true, cover: "page", timeSales: 1, soldOut: 1 },
  cafe_noir_a: { widgets: false, images: false, priceOptions: false, cover: "none", timeSales: 0, soldOut: 0 },
} as const satisfies Record<string, {
  widgets: boolean;
  images: boolean;
  priceOptions: boolean;
  cover: TemplateMenuCoverMode;
  timeSales: number;
  soldOut: number;
}>;

test("Basic launch templates keep their approved feature capability matrix", () => {
  for (const [templateKey, expected] of Object.entries(BASIC_FEATURE_EXPECTATIONS)) {
    const capabilities = getTemplateCapabilities(templateKey);
    assert.equal(capabilities.menuWidgets.enabled, expected.widgets, `${templateKey}: widgets`);
    assert.equal(capabilities.menuItemImages, expected.images, `${templateKey}: images`);
    assert.equal(capabilities.itemBadges, true, `${templateKey}: badges`);
    assert.equal(capabilities.priceOptions, expected.priceOptions, `${templateKey}: price options`);
    assert.equal(capabilities.menuCover.coverMode, expected.cover, `${templateKey}: cover`);
  }
});

test("Basic launch starters retain the fixture evidence used by feature QA", () => {
  for (const [templateKey, expected] of Object.entries(BASIC_FEATURE_EXPECTATIONS)) {
    const template = getTemplateByKey(templateKey);
    const preset = getStarterPreset(templateKey, template.categoryLabel, template.template_category);
    const items = preset.pages.flatMap((page) => page.categories.flatMap((category) => category.items));

    assert.ok(items.length > 0, `${templateKey}: menu items`);
    assert.equal(preset.time_sales?.length ?? 0, expected.timeSales, `${templateKey}: time sales`);
    assert.equal(items.filter((item) => item.is_sold_out).length, expected.soldOut, `${templateKey}: sold out`);
    assert.ok(items.some((item) => item.badge_label), `${templateKey}: badge`);
    assert.equal(items.some((item) => item.image_url), expected.images, `${templateKey}: starter images`);
    assert.equal(Boolean(preset.site.cover_image_url), expected.cover !== "none", `${templateKey}: cover image`);
  }
});

test("launch template typography defaults and Display-only size control stay explicit", () => {
  for (const templateKey of Object.keys(BASIC_FEATURE_EXPECTATIONS)) {
    const typography = mergeTypographySettings(templateKey);
    assert.equal(typography.korean_font_key, "pretendard", `${templateKey}: Korean font`);
    assert.equal(typography.english_font_key, templateKey === "cafe_noir_a" ? "cutive-mono" : "alata", `${templateKey}: English font`);
    assert.equal(getTemplateCapabilities(templateKey).typographyFontSizeControl, "hidden", `${templateKey}: size control`);
  }

  const displayCapabilities = getTemplateCapabilities("display_menu_a");
  const displayTypography = mergeTypographySettings("display_menu_a");
  assert.equal(displayCapabilities.typographyFontSizeControl, "simple");
  assert.equal(displayCapabilities.menuItemImages, true);
  assert.equal(displayCapabilities.itemBadges, true);
  assert.equal(displayCapabilities.priceOptions, true);
  assert.equal(displayCapabilities.menuCover.coverMode, "none");
  assert.equal(displayTypography.korean_font_key, "pretendard");
  assert.equal(displayTypography.english_font_key, "alata");
});
