import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import test from "node:test";
import LatestAnnouncements from "../components/support/LatestAnnouncements";
import SupportCenter from "../components/support/SupportCenter";
import type { AnnouncementSummary } from "./announcements";

const items: AnnouncementSummary[] = Array.from({ length: 4 }, (_, index) => ({ id: `notice-${index}`, title: `공지 ${index}`, category: "update", pinned: false, published_at: "2026-10-01T00:00:00Z" }));

test("FAQ 아래 최신 공지 3개와 전체보기는 공통 목록과 실제 공지 경로를 사용한다", () => {
  const html = renderToStaticMarkup(createElement(SupportCenter, { latestNotices: createElement(LatestAnnouncements, { items }) }));
  assert.doesNotMatch(html, /role="tablist"|고객센터 메뉴/);
  assert.equal((html.match(/aria-expanded="false"/g) ?? []).length, 5);
  assert.ok(html.includes('aria-label="자주 묻는 질문 목록"'));
  assert.equal((html.match(/class="site-content-list-row"/g) ?? []).length, 3);
  assert.ok(html.indexOf("자주 묻는 질문") < html.indexOf("최신 공지사항"));
  const allLink = html.match(/<a[^>]*aria-label="공지사항 전체보기"[^>]*>/)?.[0];
  assert.ok(allLink?.includes('href="/faq/notices"'));
  for (const index of [0, 1, 2]) assert.ok(html.includes(`href="/faq/notices/notice-${index}"`));
  assert.ok(!html.includes("notice-3"));
});

test("최신 공지는 로딩·빈 목록·오류를 구분하고 전체보기 진입을 항상 유지한다", () => {
  for (const [props, expected] of [[{ loading: true }, "불러오는 중"], [{}, "등록된 공지사항이 없습니다"], [{ unavailable: true }, "불러오지 못했습니다"]] as const) {
    const html = renderToStaticMarkup(createElement(LatestAnnouncements, props));
    assert.ok(html.includes(expected));
    assert.ok(html.includes('href="/faq/notices"'));
    assert.match(html, /role="status"/);
  }
});
