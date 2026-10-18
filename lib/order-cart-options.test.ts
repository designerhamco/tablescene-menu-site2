import test from "node:test";
import assert from "node:assert/strict";
import {
  toggleOrderOption,
  isOrderOptionSelectionValid,
} from "./order-cart-options";
const group = {
  id: "temperature",
  name: "온도",
  isRequired: true,
  minSelections: 1,
  maxSelections: 1,
  values: [
    { id: "hot", name: "HOT", priceDelta: 0 },
    { id: "ice", name: "ICE", priceDelta: 500 },
    { id: "warm", name: "WARM", priceDelta: 0 },
  ],
};
test("editing a single-choice option replaces the prior choice", () => {
  const prior = new Set(["ice", "unrelated"]);
  const next = toggleOrderOption(group, prior, "hot");
  assert.deepEqual([...next].sort(), ["hot", "unrelated"]);
  assert.deepEqual([...prior], ["ice", "unrelated"]);
  assert.equal(isOrderOptionSelectionValid(group, next), true);
});
test("multi-choice limits and required minimum remain enforced", () => {
  const multi = { ...group, maxSelections: 2 };
  const selected = toggleOrderOption(multi, new Set(["hot"]), "ice");
  assert.deepEqual(
    [...toggleOrderOption(multi, selected, "warm")],
    ["hot", "ice"],
  );
  assert.equal(isOrderOptionSelectionValid(group, new Set()), false);
  assert.equal(
    isOrderOptionSelectionValid(group, new Set(["hot", "ice"])),
    false,
  );
  assert.equal(
    isOrderOptionSelectionValid(
      group,
      toggleOrderOption(group, new Set(["hot"]), "hot"),
    ),
    false,
  );
});
