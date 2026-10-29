import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import test from "node:test";
import LatestAnnouncements from "../components/support/LatestAnnouncements";
import SupportCenter from "../components/support/SupportCenter";


test("FAQ는 독립 질문 목록만 표시하고 공지 목록을 섞지 않는다", () => {
  const html = renderToStaticMarkup(createElement(SupportCenter));
  assert.doesNotMatch(html, /role="tablist"|최신 공지사항|site-content-list-row/);
  assert.equal((html.match(/aria-expanded="false"/g) ?? []).length, 5);
  assert.ok(html.includes('aria-label="자주 묻는 질문 목록"'));
  assert.match(html, /<h1[^>]*>자주 묻는 질문<\/h1>/);
});

test("최신 공지는 로딩·빈 목록·오류를 구분하고 전체보기 진입을 항상 유지한다", () => {
  for (const [props, expected] of [[{ loading: true }, "불러오는 중"], [{}, "등록된 공지사항이 없습니다"], [{ unavailable: true }, "불러오지 못했습니다"]] as const) {
    const html = renderToStaticMarkup(createElement(LatestAnnouncements, props));
    assert.ok(html.includes(expected));
    assert.ok(html.includes('href="/faq/notices"'));
    assert.match(html, /role="status"/);
  }
});
