import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { getActiveDisplayMenuTimeSalesByItemId } from "./display-menu-time-sales";
import { buildDisplayMenuAPreviewData } from "./template-demo-data/display-menu-a";

test("Summer Blue starter keeps a concise menu and one visible launch discount", () => {
  const data = buildDisplayMenuAPreviewData();

  assert.equal(data.pages.length, 4);
  assert.equal(data.categories.length, 6);
  assert.equal(data.items.length, 29);
  assert.equal(data.items.filter((item) => item.badge_label).length, 6);
  assert.equal(data.timeSales.length, 1);

  const sale = data.timeSales[0];
  const targets = sale.items.map((target) => ({
    target,
    item: data.items.find((item) => item.id === target.menuItemId),
  }));
  assert.equal(sale.badgeText, "오픈할인");
  assert.equal(sale.displayText, "오픈 기념 한정 할인");
  assert.deepEqual(
    targets.map(({ item, target }) => [item?.name, item?.price, target.salePrice, target.priceColumnId]),
    [
      ["클래식 버터 스콘", 4500, 3900, null],
      ["카푸치노", 5000, 4300, "template-preview-display-menu-a-category-0-1-price-column-hot"],
      ["카푸치노", 5000, 4300, "template-preview-display-menu-a-category-0-1-price-column-ice"],
      ["바질 크림 라떼", 6500, 5700, "template-preview-display-menu-a-category-0-0-price-column-hot"],
      ["바질 크림 라떼", 6500, 5700, "template-preview-display-menu-a-category-0-0-price-column-ice"],
    ],
  );

  for (const itemName of ["카푸치노", "바질 크림 라떼"]) {
    const item = data.items.find((candidate) => candidate.name === itemName);
    assert.ok(item);
    assert.equal(item.priceColumnValues.length, 2);
    assert.deepEqual(
      item.priceColumnValues.map((value) => data.categories
        .find((category) => category.id === item.category_id)
        ?.priceColumns.find((column) => column.id === value.priceColumnId)?.label),
      ["HOT", "ICE"],
    );
  }

  const activeSales = getActiveDisplayMenuTimeSalesByItemId(data.timeSales, Date.parse("2026-09-14T03:00:00.000Z"));
  assert.equal(activeSales.size, 3);
  assert.equal(activeSales.get(sale.items[0].menuItemId)?.item?.salePrice, 3900);
  assert.equal(activeSales.get(sale.items[1].menuItemId)?.optionItemsByPriceColumnId.get(sale.items[1].priceColumnId ?? "")?.salePrice, 4300);
  assert.equal(activeSales.get(sale.items[2].menuItemId)?.optionItemsByPriceColumnId.get(sale.items[2].priceColumnId ?? "")?.salePrice, 4300);
  assert.equal(activeSales.get(sale.items[3].menuItemId)?.optionItemsByPriceColumnId.get(sale.items[3].priceColumnId ?? "")?.salePrice, 5700);
  assert.equal(activeSales.get(sale.items[4].menuItemId)?.optionItemsByPriceColumnId.get(sale.items[4].priceColumnId ?? "")?.salePrice, 5700);
});

test("Display translation flow includes visible menu and discount copy", () => {
  const source = readFileSync(new URL("./server/menu-translation-service.ts", import.meta.url), "utf8");

  assert.match(source, /usesDisplayLocalization\s*=\s*siteResult\.data\?\.template_key\s*===\s*"display_menu_a"/);
  assert.match(source, /menu_category_translations/);
  assert.match(source, /menu_item_translations/);
  assert.match(source, /usesBasicTimeSaleLocalization/);
  assert.match(source, /menu_promotion_translations/);
});
