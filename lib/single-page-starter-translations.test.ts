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

    assert.equal(pageKeys.length, preset.pages.length, "Korean starter pages must have stable keys");
    assert.equal(categoryKeys.length, preset.pages.flatMap((page) => page.categories).length, "Korean starter categories must have stable keys");
    assert.equal(itemKeys.length, items.length, "Korean starter items must have stable keys");
    assert.equal(items.every((item) => item.name.trim()), true);
    assert.equal(
      items.every((item) => templateKey === "cafe_mocha_forest_a" ? !item.description.trim() : Boolean(item.description.trim())),
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
      assert.equal(Object.values(copy.items).every((item) => item.name.trim() && item.description.trim()), true);
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
