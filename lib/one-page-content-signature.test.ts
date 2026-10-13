import assert from "node:assert/strict";
import test from "node:test";
import { getOnePageContentSignature } from "./one-page-content-signature";

test("same IDs/counts still detect edits to option prices, price columns, traits and featured inputs", () => {
  const input = {
    priceOptions: [{ id: "option", price: 3, price_label: "3.0" }],
    pages: [{ items: [{ id: "item", priceColumnValues: [{ id: "column", price: 4 }] }] }],
    traits: [{ id: "trait", label: "spicy", value: 1 }],
    featuredSlides: [{ id: "slide", image_url: "first.jpg" }],
  };
  const original = getOnePageContentSignature(input);
  for (const mutate of [
    (value: typeof input) => { value.priceOptions[0].price = 30; },
    (value: typeof input) => { value.priceOptions[0].price_label = "Market price"; },
    (value: typeof input) => { value.pages[0].items[0].priceColumnValues[0].price = 40; },
    (value: typeof input) => { value.traits[0].value = 3; },
    (value: typeof input) => { value.featuredSlides[0].image_url = "second.jpg"; },
  ]) {
    const edited = structuredClone(input);
    mutate(edited);
    assert.notEqual(getOnePageContentSignature(edited), original);
  }
});

test("object key order does not restart fitting, while content order does", () => {
  assert.equal(getOnePageContentSignature({ site: { name: "Cafe", logo: "x" } }), getOnePageContentSignature({ site: { logo: "x", name: "Cafe" } }));
  assert.notEqual(getOnePageContentSignature({ items: ["a", "b"] }), getOnePageContentSignature({ items: ["b", "a"] }));
});
