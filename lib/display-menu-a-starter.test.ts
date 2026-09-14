import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { getActiveDisplayMenuTimeSalesByItemId } from "./display-menu-time-sales";
import { buildDisplayMenuAPreviewData } from "./template-demo-data/display-menu-a";

test("Summer Blue starter keeps a concise menu and one visible launch discount", () => {
  const data = buildDisplayMenuAPreviewData();

  assert.equal(data.pages.length, 4);
  assert.equal(data.categories.length, 6);
  assert.equal(data.items.length, 17);
  assert.equal(data.items.filter((item) => item.badge_label).length, 3);
  assert.equal(data.timeSales.length, 1);

  const sale = data.timeSales[0];
  const target = sale.items[0];
  const targetItem = data.items.find((item) => item.id === target.menuItemId);
  assert.equal(sale.badgeText, "오픈할인");
  assert.equal(sale.displayText, "오픈 기념 한정 할인");
  assert.equal(targetItem?.name, "클래식 버터 스콘");
  assert.equal(targetItem?.price, 4500);
  assert.equal(target.salePrice, 3900);

  const activeSales = getActiveDisplayMenuTimeSalesByItemId(data.timeSales, Date.parse("2026-09-14T03:00:00.000Z"));
  assert.equal(activeSales.get(target.menuItemId)?.item?.salePrice, 3900);
});

test("Display translation flow includes visible menu and discount copy", () => {
  const source = readFileSync(new URL("./server/menu-translation-service.ts", import.meta.url), "utf8");

  assert.match(source, /usesDisplayLocalization\s*=\s*siteResult\.data\?\.template_key\s*===\s*"display_menu_a"/);
  assert.match(source, /menu_category_translations/);
  assert.match(source, /menu_item_translations/);
  assert.match(source, /usesBasicTimeSaleLocalization/);
  assert.match(source, /menu_promotion_translations/);
});
