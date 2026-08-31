import assert from "node:assert/strict";
import test from "node:test";

import {
  canShowDisplayMenuTimeSale,
  getActiveDisplayMenuTimeSalesByItemId,
} from "./display-menu-time-sales";
import type { PublicMenuTimeSale } from "../components/menu-templates/types";

function buildTimeSale(overrides: Partial<PublicMenuTimeSale> = {}): PublicMenuTimeSale {
  return {
    id: "sale-1",
    name: "Happy Hour",
    scheduleType: "once",
    startsAt: "2026-08-28T00:00:00.000Z",
    endsAt: "2026-08-28T12:00:00.000Z",
    dailyStartTime: null,
    dailyEndTime: null,
    timezone: "Asia/Seoul",
    timeDisplayMode: "countdown",
    displayText: null,
    badgeText: "TIME SALE",
    badgeBackgroundColor: "#007C89",
    items: [
      {
        id: "target-1",
        menuItemId: "item-1",
        priceColumnId: null,
        salePrice: 3900,
        salePriceLabel: "3.9",
        visible: true,
      },
    ],
    ...overrides,
  };
}

test("Display time-sale matching only returns active, valid targets", () => {
  const nowMs = Date.parse("2026-08-28T06:00:00.000Z");
  const active = buildTimeSale();
  const expired = buildTimeSale({
    id: "expired",
    startsAt: "2026-08-27T00:00:00.000Z",
    endsAt: "2026-08-27T12:00:00.000Z",
  });
  const invalid = buildTimeSale({
    id: "invalid",
    items: [{ ...active.items[0], id: "invalid-target", menuItemId: "item-2", salePrice: 0 }],
  });

  const matches = getActiveDisplayMenuTimeSalesByItemId([expired, invalid, active], nowMs);

  assert.deepEqual([...matches.keys()], ["item-1"]);
  assert.equal(matches.get("item-1")?.promotion.id, "sale-1");
  assert.equal(matches.get("item-1")?.item?.salePrice, 3900);
});

test("Display time-sale price requires a discounted single-price menu", () => {
  const target = buildTimeSale().items[0];
  const baseItem = {
    is_sold_out: false,
    price_visible: true,
    price: 5500,
  };

  assert.equal(canShowDisplayMenuTimeSale({ item: baseItem, target, hasPriceOptions: false }), true);
  assert.equal(canShowDisplayMenuTimeSale({ item: { ...baseItem, is_sold_out: true }, target, hasPriceOptions: false }), false);
  assert.equal(canShowDisplayMenuTimeSale({ item: baseItem, target, hasPriceOptions: true }), false);
  assert.equal(canShowDisplayMenuTimeSale({ item: baseItem, target: { ...target, salePrice: 6500 }, hasPriceOptions: false }), false);
});
