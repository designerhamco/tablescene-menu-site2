import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { getStarterPreset } from "./menu-starter-presets";
import {
  SINGLE_PAGE_STARTER_TRANSLATION_LOCALES,
  SINGLE_PAGE_STARTER_TRANSLATIONS,
} from "./template-demo-data/single-page-starter-translations";

for (const [templateKey, translations] of Object.entries(SINGLE_PAGE_STARTER_TRANSLATIONS)) {
  test(`${templateKey} starter includes complete ko, en, zh and ja copy`, () => {
    const preset = getStarterPreset(templateKey);
    const pageKeys = preset.pages.map((page) => page.key).filter((key): key is string => Boolean(key));
    const categoryKeys = preset.pages.flatMap((page) => page.categories.map((category) => category.key)).filter((key): key is string => Boolean(key));
    const items = preset.pages.flatMap((page) => page.categories.flatMap((category) => category.items));
    const itemKeys = items.map((item) => item.key).filter((key): key is string => Boolean(key));
    const promotionKeys = (preset.time_sales ?? []).map((promotion) => promotion.key).filter((key): key is string => Boolean(key));
    const descriptionlessItemKeys = templateKey === "fast_food_loop_bagel_a"
      ? new Set(["plain-cream-cheese", "scallion-cream-cheese", "honey-walnut-cream-cheese"])
      : new Set<string>();

    assert.equal(pageKeys.length, preset.pages.length, "Korean starter pages must have stable keys");
    assert.equal(categoryKeys.length, preset.pages.flatMap((page) => page.categories).length, "Korean starter categories must have stable keys");
    assert.equal(itemKeys.length, items.length, "Korean starter items must have stable keys");
    assert.equal(items.every((item) => item.name.trim()), true);
    assert.equal(
      items.every((item) => descriptionlessItemKeys.has(item.key ?? "") ? !item.description.trim() : Boolean(item.description.trim())),
      true,
    );

    for (const locale of SINGLE_PAGE_STARTER_TRANSLATION_LOCALES) {
      const copy = translations[locale];
      assert.equal(copy.pageTitle.trim().length > 0, true);
      assert.equal(copy.site.restaurantName.trim().length > 0, true);
      assert.equal(copy.site.brandDescription.trim().length > 0, true);
      assert.deepEqual(Object.keys(copy.categoryNames).sort(), [...categoryKeys].sort());
      assert.deepEqual(Object.keys(copy.items).sort(), [...itemKeys].sort());
      assert.deepEqual(Object.keys(copy.promotions).sort(), [...promotionKeys].sort());
      assert.equal(
        Object.entries(copy.items).every(([itemKey, item]) => (
          Boolean(item.name.trim()) && (descriptionlessItemKeys.has(itemKey) ? !item.description.trim() : Boolean(item.description.trim()))
        )),
        true,
      );
      if (templateKey === "fast_food_loop_bagel_a") {
        assert.equal(Boolean(copy.categoryDescriptions?.["cream-cheese"]?.trim()), true);
      }
      assert.equal(Object.values(copy.promotions).every((promotion) => promotion.badgeText.trim()), true);
    }
  });
}

test("single-page starter provisioning saves completed translations and enables every supported locale", () => {
  const source = readFileSync(new URL("./menu-starter-presets.ts", import.meta.url), "utf8");
  assert.match(source, /nextSettings\.enabled_locales = \["ko", \.\.\.SINGLE_PAGE_STARTER_TRANSLATION_LOCALES\]/);
  assert.match(source, /status: "completed"/);
  assert.match(source, /menu_site_translations/);
  assert.match(source, /menu_page_translations/);
  assert.match(source, /menu_category_translations/);
  assert.match(source, /menu_item_translations/);
  assert.match(source, /menu_promotion_translations/);
});

test("REAL MATCHA keeps cream and classic matcha distinct without duplicating matcha in non-coffee", () => {
  const preset = getStarterPreset("cafe_design_a");
  const items = preset.pages.flatMap((page) => page.categories.flatMap((category) => category.items));
  const itemByKey = new Map(items.map((item) => [item.key, item]));

  assert.equal(itemByKey.get("real-matcha-cream-latte")?.name, "리얼 맛차 크림 라떼");
  assert.equal(itemByKey.get("real-matcha-latte")?.name, "리얼 맛차 라떼");
  assert.equal(itemByKey.get("black-sesame-latte")?.name, "흑임자 라떼");
  assert.equal(itemByKey.has("deep-matcha-cloud"), false);
  assert.equal(itemByKey.has("jeju-matcha-latte"), false);
  assert.deepEqual(
    preset.featured_slides?.map((slide) => slide.featured_item_key ?? null),
    [null, "real-matcha-latte", "real-matcha-cream-latte"],
  );
});
