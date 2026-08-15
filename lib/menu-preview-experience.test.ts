import assert from "node:assert/strict";
import test from "node:test";

import type { PublicMenuItem } from "@/components/menu-templates/types";

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

test("mobile preview exposes call, cart, and both payment choices together", () => {
  const catalog = buildMenuPreviewOrderCatalog([item()]);
  const config = buildMenuPreviewOrderCallConfig({ menuSiteId: "site-a", storeName: "MenuLink", catalog });

  assert.equal(config.callEnabled, true);
  assert.equal(config.orderEnabled, true);
  assert.equal(config.previewOnly, true);
  assert.deepEqual(config.checkoutModes, ["prepay", "postpay"]);
  assert.equal(config.orderCatalog?.length, 1);
});
