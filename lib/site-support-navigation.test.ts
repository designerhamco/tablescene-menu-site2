import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import test from "node:test";
import SitePageHeader from "../components/layout/SitePageHeader";
import { SITE_SUPPORT_LINKS, isSupportLinkActive } from "./site-support-navigation";

test("고객센터 세 항목은 독립 페이지로 연결되고 상세 공지는 FAQ를 중복 선택하지 않는다", () => {
  assert.deepEqual(SITE_SUPPORT_LINKS.map(item => [item.label, item.href]), [["자주 묻는 질문", "/faq"], ["공지사항", "/faq/notices"], ["이용가이드", "/guides"]]);
  for (const [pathname, expected] of [["/faq", "/faq"], ["/faq/notices", "/faq/notices"], ["/faq/notices/example", "/faq/notices"], ["/guides", "/guides"], ["/templates", undefined]] as const) {
    assert.deepEqual(SITE_SUPPORT_LINKS.filter(item => isSupportLinkActive(item.href, pathname)).map(item => item.href), expected ? [expected] : []);
  }
});

test("공통 페이지 시작은 하나의 제목·설명과 정렬 역할을 유지한다", () => {
  for (const align of ["center", "start"] as const) {
    const html = renderToStaticMarkup(createElement(SitePageHeader, { title: "페이지 제목", description: "페이지 설명", align }));
    assert.equal((html.match(/<h1/g) ?? []).length, 1);
    assert.match(html, /class="type-page-title">페이지 제목<\/h1>/);
    assert.match(html, /class="type-page-description">페이지 설명<\/p>/);
    assert.ok(html.includes('data-align="' + align + '"'));
    assert.doesNotMatch(html, /mt-|pb-|mb-/);
  }
});
