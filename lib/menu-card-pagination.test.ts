import assert from "node:assert/strict";
import test from "node:test";
import { getMenuCardPage, MENU_CARDS_PER_PAGE } from "./menu-card-pagination";

const cards = Array.from({ length: 25 }, (_, i) => ({ title: `메뉴판 ${i + 1}`, key: `menu-${i + 1}` }));
test("menu pages include every result once in stable order, twelve per page", () => {
  assert.equal(MENU_CARDS_PER_PAGE, 12);
  const pages = [1, 2, 3].map(page => getMenuCardPage(cards, "", page));
  assert.deepEqual(pages.map(page => page.cards.length), [12, 12, 1]);
  assert.deepEqual(pages.flatMap(page => page.cards), cards);
  assert.equal(pages[0].totalResults, 25);
  assert.equal(pages[0].totalPages, 3);
});
test("name search includes cards outside the visible page before pagination", () => {
  const result = getMenuCardPage(cards, "메뉴판 25", 3);
  assert.deepEqual(result.cards, [cards[24]]);
  assert.equal(result.page, 1);
  assert.equal(result.totalPages, 1);
});
test("empty results and shrinking lists clamp the current page without losing cards", () => {
  assert.deepEqual(getMenuCardPage([], "", 4), { page: 1, totalPages: 0, totalResults: 0, cards: [] });
  assert.equal(getMenuCardPage(cards.slice(0, 12), "", 5).totalPages, 1);
  assert.equal(getMenuCardPage(cards.slice(0, 13), "", 5).page, 2);
  assert.equal(getMenuCardPage(cards, "없는 이름", 2).cards.length, 0);
  assert.deepEqual(getMenuCardPage(cards, "", -2).cards, cards.slice(0, 12));
});

test("service and visibility intersect with the name across the complete tab", () => {
  const cards = [
    ...Array.from({ length: 12 }, (_, index) => ({ title: `메뉴판 ${index}`, serviceCategory: "basic" as const, visibility: "published" as const })),
    { title: "강남 메뉴판", serviceCategory: "display" as const, visibility: "private" as const },
    { title: "강남 메뉴판", serviceCategory: "display" as const, visibility: "published" as const },
    { title: "송파 메뉴판", serviceCategory: "display" as const, visibility: "private" as const },
    { title: "강남 메뉴판", serviceCategory: null, visibility: null },
  ];
  const result = getMenuCardPage(cards, "강남", 2, { serviceCategory: "display", visibility: "private" });
  assert.deepEqual(result.cards, [cards[12]]);
  assert.equal(result.page, 1);
  assert.equal(result.totalResults, 1);
  assert.equal(getMenuCardPage(cards, "강남", 1, { serviceCategory: "", visibility: "private" }).totalResults, 1);
});
