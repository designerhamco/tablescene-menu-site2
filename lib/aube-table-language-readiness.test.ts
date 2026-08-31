import assert from "node:assert/strict";
import test from "node:test";

import { getReadyAubeTableLocales } from "./aube-table-language-readiness";

const baseInput = {
  configuredLocales: ["ko", "en", "ja"] as const,
  coverEnabled: true,
  site: {
    menu_cover_title: "THE MENU",
    menu_cover_description: "계절의 흐름을 담은 다이닝",
  },
  pages: [{ id: "page-1", title: "시그니처 코스", description: "셰프의 계절 코스", visible: true }],
  categories: [{ id: "category-1", name: "오브 시그니처", description: "7코스", visible: true }],
  items: [{ id: "item-1", name: "관자와 시금치", description: "레몬 버터", visible: true }],
  priceOptions: [{ id: "option-1", label: "와인 페어링", visible: true }],
};

function completeLocale(locale: "en" | "ja") {
  return {
    site: [{ locale, status: "completed", menu_cover_title: "THE MENU", menu_cover_description: "Seasonal dining" }],
    pages: [{ locale, status: "completed", menu_page_id: "page-1", title: "Signature Course", description: "Seasonal course" }],
    categories: [{ locale, status: "completed", category_id: "category-1", name: "Aube Signature", description: "Seven courses" }],
    items: [{ locale, status: "completed", item_id: "item-1", name: "Scallop and spinach", description: "Lemon butter" }],
    priceOptions: [{ locale, status: "completed", price_option_id: "option-1", label: "Wine pairing" }],
  };
}

test("Aube public language list exposes only fully completed translations", () => {
  const english = completeLocale("en");
  const japanese = completeLocale("ja");
  japanese.items[0].name = "";

  assert.deepEqual(getReadyAubeTableLocales({
    ...baseInput,
    configuredLocales: [...baseInput.configuredLocales],
    siteTranslations: [...english.site, ...japanese.site],
    pageTranslations: [...english.pages, ...japanese.pages],
    categoryTranslations: [...english.categories, ...japanese.categories],
    itemTranslations: [...english.items, ...japanese.items],
    priceOptionTranslations: [...english.priceOptions, ...japanese.priceOptions],
  }), ["ko", "en"]);
});

test("Aube ignores missing cover translations when the cover is disabled", () => {
  const english = completeLocale("en");

  assert.deepEqual(getReadyAubeTableLocales({
    ...baseInput,
    configuredLocales: ["ko", "en"],
    coverEnabled: false,
    siteTranslations: [],
    pageTranslations: english.pages,
    categoryTranslations: english.categories,
    itemTranslations: english.items,
    priceOptionTranslations: english.priceOptions,
  }), ["ko", "en"]);
});

test("Aube fails closed when a translation row is not completed", () => {
  const english = completeLocale("en");
  english.pages[0].status = "pending";

  assert.deepEqual(getReadyAubeTableLocales({
    ...baseInput,
    configuredLocales: ["ko", "en"],
    siteTranslations: english.site,
    pageTranslations: english.pages,
    categoryTranslations: english.categories,
    itemTranslations: english.items,
    priceOptionTranslations: english.priceOptions,
  }), ["ko"]);
});
