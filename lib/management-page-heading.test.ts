import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import SitePageHeader from "../components/layout/SitePageHeader";
import { SectionHeader } from "../app/components/ui/section-header";
import MenuCardList from "../components/mypage/MenuCardList";

test("breadcrumb precedes the current h1 and only ancestors are links", () => {
  const html = renderToStaticMarkup(h(SitePageHeader, { title: "내 메뉴판", align: "start", breadcrumbs: [{ label: "마이페이지", href: "/mypage" }, { label: "내 메뉴판" }] }));
  assert.ok(html.indexOf('aria-label="현재 위치"') < html.indexOf("<h1"));
  assert.match(html, /href="\/mypage"/);
  assert.match(html, /aria-current="page"[^>]*>내 메뉴판/);
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
});
test("promoted work headings keep tools, help and labelled-by targets without repeating a title", () => {
  const html = renderToStaticMarkup(h(SectionHeader, { title: "테이블·키오스크 관리", titleHidden: true, id: "view-heading", help: h("button", null, "도움말"), actions: h("button", null, "보기 전환") }));
  assert.match(html, /id="view-heading" class="sr-only"/);
  assert.match(html, /도움말/);
  assert.match(html, /보기 전환/);
  assert.doesNotMatch(html, /<h[12]/);
  assert.equal(renderToStaticMarkup(h(SectionHeader, { title: "주문 관리", titleHidden: true })), "");
});
test("menu lists show twelve cards and paginate only when more results exist", () => {
  const cards = Array.from({ length: 13 }, (_, i) => ({ key: String(i), title: `메뉴판 ${i}`, serviceCategory: null, visibility: null, content: h("article", null, `메뉴판 ${i}`) }));
  const render = (count: number) => renderToStaticMarkup(h(MenuCardList, { cards: cards.slice(0, count), tabs: null, allowVisibilityFilter: true, emptyState: h("p", null, "빈 목록") }));
  assert.equal((render(13).match(/<article>/g) ?? []).length, 12);
  assert.match(render(13), /aria-label="메뉴판 목록 페이지"/);
  assert.doesNotMatch(render(12), /aria-label="메뉴판 목록 페이지"/);
  assert.match(render(0), /빈 목록/);
});
test("switching lifecycle tabs remounts search and pagination while permissions stay in server cards", () => {
  const page = readFileSync(new URL("../app/mypage/page.tsx", import.meta.url), "utf8");
  assert.match(page, /<MenuCardList key=\{activeMenuTab\}/);
  assert.match(page, /cards=\{\[[\s\S]*?visibleMenuCards.map[\s\S]*?staffMenuCardViewModels.map/);
  assert.match(page, /card.section === "deleted" \? undefined/);
});
