import assert from "node:assert/strict";
import test from "node:test";

import type { PublicMenuItem } from "@/components/menu-templates/types";
import type { PublicMenuCategory } from "@/components/menu-templates/types";

import { buildMenuPreviewOrderCallConfig, buildMenuPreviewOrderCatalog } from "./menu-preview-experience";

function item(overrides: Partial<PublicMenuItem> = {}): PublicMenuItem {
  return {
    id: "22222222-2222-4222-8222-222222222222",
    category_id: "33333333-3333-4333-8333-333333333333",
    name: "시그니처 라떼",
    set_name: null,
    description: null,
    price: 6.5,
    price_label: null,
    price_visible: true,
    portion_label: null,
    portion_visible: false,
    image_url: null,
    badge: null,
    badge_label: null,
    badge_type: null,
    recommended: false,
    origin_info: null,
    is_best: false,
    is_sold_out: false,
    traits_visible: false,
    visible: true,
    sort_order: 0,
    priceNote: null,
    priceColumnValues: [],
    ...overrides,
  };
}

function category(): PublicMenuCategory {
  return {
    id: "33333333-3333-4333-8333-333333333333",
    menu_page_id: null,
    name: "커피",
    description: null,
    description_visible: false,
    sort_order: 0,
    visible: true,
    priceColumns: [
      { id: "66666666-6666-4666-8666-666666666666", categoryId: "33333333-3333-4333-8333-333333333333", key: "hot", label: "HOT", sortOrder: 0, visible: true },
      { id: "77777777-7777-4777-8777-777777777777", categoryId: "33333333-3333-4333-8333-333333333333", key: "ice", label: "ICE", sortOrder: 1, visible: true },
    ],
  };
}

test("mobile preview catalog uses visible orderable menu items", () => {
  const catalog = buildMenuPreviewOrderCatalog([
    item(),
    item({ id: "44444444-4444-4444-8444-444444444444", name: "품절 메뉴", is_sold_out: true }),
    item({ id: "55555555-5555-4555-8555-555555555555", name: "가격 비공개", price_visible: false }),
  ]);

  assert.deepEqual(catalog.map(({ id, name, price }) => ({ id, name, price })), [{
    id: "22222222-2222-4222-8222-222222222222",
    name: "시그니처 라떼",
    price: 6500,
  }]);
});

test("mobile preview converts visible price columns into editable order options", () => {
  const catalog = buildMenuPreviewOrderCatalog([
    item({
      priceColumnValues: [
        { id: "88888888-8888-4888-8888-888888888888", priceColumnId: "66666666-6666-4666-8666-666666666666", price: 4, priceLabel: null, visible: true },
        { id: "99999999-9999-4999-8999-999999999999", priceColumnId: "77777777-7777-4777-8777-777777777777", price: 4.5, priceLabel: null, visible: true },
      ],
    }),
  ], [category()]);

  assert.equal(catalog[0]?.price, 4000);
  assert.deepEqual(catalog[0]?.optionGroups[0]?.values.map(({ name, priceDelta }) => ({ name, priceDelta })), [
    { name: "HOT", priceDelta: 0 },
    { name: "ICE", priceDelta: 500 },
  ]);
});

test("mobile preview keeps Order dormant and shows Smart Call only for multi-page Dining", () => {
  const single = buildMenuPreviewOrderCallConfig({
    menuSiteId: "site-a",
    storeName: "ArtiMenu",
    templateKey: "cafe_design_a",
  });
  const multi = buildMenuPreviewOrderCallConfig({
    menuSiteId: "site-b",
    storeName: "ArtiMenu",
    templateKey: "cafe_brew_chapter_a",
  });

  assert.equal(single.callEnabled, false);
  assert.equal(single.orderEnabled, false);
  assert.equal(single.previewOnly, true);
  assert.deepEqual(single.callItems, []);
  assert.equal(multi.callEnabled, true);
  assert.equal(multi.orderEnabled, false);
  assert.deepEqual(multi.callItems?.map((callItem) => callItem.label), [
    "직원 호출",
    "물 요청",
    "앞치마 요청",
    "식기 요청",
    "테이블 정리",
    "주문 도움",
  ]);
  assert.deepEqual(multi.orderCatalog, []);
  assert.equal(multi.checkoutModes, undefined);
});
