import assert from "node:assert/strict";
import test from "node:test";

import { applyStarterPreviewLocalization } from "./template-demo-data/starter-preview-localization";
import { buildDisplayMenuAPreviewData } from "./template-demo-data/display-menu-a";

const HANGUL_PATTERN = /[가-힣]/;

for (const locale of ["en", "zh", "ja"] as const) {
  test(`Summer Blue starter preview renders ${locale} copy instead of Korean fallback`, () => {
    const localized = applyStarterPreviewLocalization(buildDisplayMenuAPreviewData(), locale);

    assert.equal(localized.locale, locale);
    assert.deepEqual(localized.enabledLocales, ["ko", "en", "zh", "ja"]);
    assert.equal(localized.pages.some((page) => HANGUL_PATTERN.test(page.title)), false);
    assert.equal(localized.categories.some((category) => HANGUL_PATTERN.test(category.name)), false);
    assert.equal(localized.items.some((item) => HANGUL_PATTERN.test(item.name)), false);
    assert.equal(localized.timeSales.some((sale) => HANGUL_PATTERN.test(`${sale.badgeText} ${sale.displayText ?? ""}`)), false);
  });
}

test("Summer Blue English preview uses readable primary names while preserving its secondary labels", () => {
  const localized = applyStarterPreviewLocalization(buildDisplayMenuAPreviewData(), "en");
  const basil = localized.items.find((item) => item.id.endsWith("item-0-0-0"));

  assert.equal(basil?.name, "Basil Cream Latte");
  assert.equal(basil?.set_name, "BASIL CREAM LATTE");
  assert.equal(localized.timeSales[0]?.badgeText, "SEASONAL DEAL");
});
