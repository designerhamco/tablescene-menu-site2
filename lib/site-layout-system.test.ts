import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const globalsSource = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

function readSource(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

test("사이트 페이지·섹션·그리드 간격은 반응형 공통 토큰을 사용한다", () => {
  for (const token of [
    "--site-page-space",
    "--site-page-space-compact",
    "--site-section-space",
    "--site-grid-gap",
  ]) {
    assert.match(globalsSource, new RegExp(`${token}: clamp\\(`));
  }

  assert.match(globalsSource, /\.site-page-spacing \{[\s\S]*?padding-block: var\(--site-page-space\)/);
  assert.match(globalsSource, /\.site-page-spacing-compact \{[\s\S]*?padding-block: var\(--site-page-space-compact\)/);
  assert.match(globalsSource, /\.site-card-grid \{[\s\S]*?gap: var\(--site-grid-gap\)/);
});

test("주요 공개·인증·고객지원 화면은 공통 페이지 간격을 사용한다", () => {
  for (const path of [
    "../app/faq/page.tsx",
    "../app/apply/page.tsx",
    "../app/apply/_components/PaidApplyPage.tsx",
    "../app/terms/page.tsx",
    "../app/privacy/page.tsx",
    "../app/sign-up/page.tsx",
    "../app/mypage/inquiries/page.tsx",
  ]) {
    assert.match(readSource(path), /site-page-spacing/);
  }
});

test("약관 문서 표면은 공통 카드 규칙을 사용하고 개별 그림자를 만들지 않는다", () => {
  for (const path of ["../app/terms/page.tsx", "../app/privacy/page.tsx"]) {
    const source = readSource(path);
    assert.match(source, /<article className="site-card /);
    assert.doesNotMatch(source, /<article[^>]*shadow-/);
  }
});
