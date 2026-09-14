import assert from "node:assert/strict";
import test from "node:test";

import { parseAutoTranslationDraftPayload } from "./menu-localization-draft";

const categoryId = "8d6dd42b-4786-4db4-90f7-a88fb084706b";
const priceOptionId = "4e7d27df-4ca2-4e9e-9bb4-b7860c5ec9fe";

test("translation recovery accepts Aube course price and price option patches", () => {
  const payload = [
    {
      entityType: "category",
      entityId: categoryId,
      field: "course_price_description",
      locale: "en",
      value: "Per person · Wine pairing + KRW 120,000",
      sourceHash: "category-source-hash",
    },
    {
      entityType: "priceOption",
      entityId: priceOptionId,
      field: "label",
      locale: "en",
      value: "Wine pairing",
      sourceHash: "price-option-source-hash",
    },
    {
      entityType: "priceOption",
      entityId: priceOptionId,
      field: "price_label",
      locale: "en",
      value: "KRW 120,000",
      sourceHash: "price-option-source-hash",
    },
  ];

  assert.deepEqual(parseAutoTranslationDraftPayload(payload), payload);
});

test("translation recovery rejects unsupported price option fields", () => {
  const payload = [{
    entityType: "priceOption",
    entityId: priceOptionId,
    field: "internal_price",
    locale: "en",
    value: "120000",
    sourceHash: "price-option-source-hash",
  }];

  assert.deepEqual(parseAutoTranslationDraftPayload(payload), []);
});
