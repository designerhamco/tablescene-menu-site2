import assert from "node:assert/strict";
import test from "node:test";
import { parseMenuItemOrderConfiguration } from "./menu-order-configuration";
const input = () => ({
  id: "11111111-1111-4111-8111-111111111111",
  updatedAt: "2026-10-18T00:00:00Z",
  orderable: true,
  price: 5000,
  groups: [
    {
      id: "22222222-2222-4222-8222-222222222222",
      name: " 온도 ",
      required: true,
      multiple: false,
      values: [
        {
          id: "33333333-3333-4333-8333-333333333333",
          name: " ICE ",
          priceDelta: 500,
        },
      ],
    },
  ],
});
test("order configuration normalizes names while preserving explicit KRW amounts", () => {
  const result = parseMenuItemOrderConfiguration(input());
  assert.equal(result.groups[0].name, "온도");
  assert.equal(result.groups[0].values[0].name, "ICE");
  assert.equal(result.groups[0].values[0].priceDelta, 500);
});
test("malformed, duplicate, fractional and negative option input is rejected", () => {
  for (const value of [
    null,
    [],
    { ...input(), orderable: "true" },
    { ...input(), price: 1.5 },
    { ...input(), price: -1 },
    { ...input(), updatedAt: "invalid" },
  ])
    assert.throws(() => parseMenuItemOrderConfiguration(value));
  const duplicate = input();
  duplicate.groups.push({ ...duplicate.groups[0] });
  assert.throws(() => parseMenuItemOrderConfiguration(duplicate), /중복/);
  const negative = input();
  negative.groups[0].values[0].priceDelta = -1;
  assert.throws(() => parseMenuItemOrderConfiguration(negative));
});
