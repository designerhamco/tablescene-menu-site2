import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const globalsSource = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const uiSystemSource = readFileSync(new URL("../styles/ui-system.css", import.meta.url), "utf8");

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
    "../app/mypage/page.tsx",
    "../app/mypage/inquiries/page.tsx",
  ]) {
    assert.match(readSource(path), /site-page-spacing/);
  }
});

test("마이페이지 본체는 공통 카드·탭·피드백 표면을 사용한다", () => {
  const source = readSource("../app/mypage/page.tsx");

  assert.match(source, /site-gutter site-page-spacing-compact/);
  assert.match(source, /site-card site-card-compact mb-5 flex gap-2 overflow-x-auto p-1\.5/);
  assert.match(source, /site-notice site-notice-success/);
  assert.match(source, /site-notice site-notice-warning/);
  assert.match(source, /site-notice site-notice-error/);
  assert.doesNotMatch(source, /shadow-sm/);
});

test("약관 문서 표면은 공통 카드 규칙을 사용하고 개별 그림자를 만들지 않는다", () => {
  for (const path of ["../app/terms/page.tsx", "../app/privacy/page.tsx"]) {
    const source = readSource(path);
    assert.match(source, /<article className="site-card /);
    assert.doesNotMatch(source, /<article[^>]*shadow-/);
  }
});

test("활성 메뉴판 관리 화면은 공통 여백과 무그림자 표면을 사용한다", () => {
  for (const path of [
    "../app/mypage/menus/new/page.tsx",
    "../app/mypage/menus/new/TemplateCatalogPicker.tsx",
    "../app/mypage/menus/[menuId]/convert/page.tsx",
    "../app/mypage/menus/[menuId]/import/page.tsx",
    "../app/mypage/menus/[menuId]/preview/page.tsx",
    "../app/mypage/menus/[menuId]/qr/page.tsx",
  ]) {
    const source = readSource(path);
    assert.match(source, /site-card|site-page-spacing-compact/);
    assert.doesNotMatch(source, /shadow-(?:sm|md|lg|xl|2xl)/);
  }
});

test("메뉴 편집기 외곽과 주요 섹션은 공통 반응형 표면을 사용한다", () => {
  const source = readSource("../app/mypage/menus/[menuId]/edit/page.tsx");

  assert.match(source, /site-gutter site-page-spacing-compact/);
  assert.match(source, /function SectionCard[\s\S]*?<section className="site-card p-5 sm:p-6">/);
  assert.match(source, /<header className="site-card mb-6 p-5 sm:p-6">/);
  assert.doesNotMatch(source, /shadow-(?:sm|md|lg|xl|2xl)/);
});

test("메뉴 편집기의 탭과 구조 편집 패널도 공통 무그림자 표면을 사용한다", () => {
  const editor = readSource("../app/mypage/menus/[menuId]/edit/page.tsx");
  const navigation = readSource("../components/mypage/menu-editor/MenuEditorNavigation.tsx");
  const management = readSource("../components/mypage/menu-editor/MenuManagementSection.tsx");

  assert.match(navigation, /site-card site-card-compact mb-6/);
  assert.match(editor, /function FinalActionRow[\s\S]*?site-editor-action-row/);
  assert.match(management, /<section className="site-card p-5 sm:p-6">/);
  assert.match(management, /<section className="site-card site-card-compact min-w-0 p-4 lg:p-6">/);
  assert.match(management, /function FinalActionRow[\s\S]*?site-editor-action-row/);
  assert.match(uiSystemSource, /\.site-editor-action-row \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(uiSystemSource, /\.site-editor-action-row > :is\(button, a\) \{[\s\S]*?width: 100%/);
  assert.match(uiSystemSource, /@media \(min-width: 640px\) \{[\s\S]*?\.site-editor-action-row \{[\s\S]*?display: flex/);
  assert.doesNotMatch(navigation, /shadow-(?:sm|md|lg|xl|2xl)/);
  assert.doesNotMatch(management, /shadow-(?:sm|md|lg|xl|2xl)/);
});
