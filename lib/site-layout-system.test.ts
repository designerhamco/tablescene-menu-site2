import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { SITE_CONTENT_COMPOSITION, SITE_MOBILE_MAX_WIDTH, SITE_MOBILE_SPACING } from "./site-spacing";

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

  assert.match(globalsSource, /\.site-page-spacing \{[\s\S]*?padding-block: var\(--site-page-heading-top\) var\(--site-page-space\)/);
  assert.match(globalsSource, /\.site-page-spacing-compact \{[\s\S]*?padding-block: var\(--site-page-heading-top\) var\(--site-page-space-compact\)/);
  assert.match(globalsSource, /\.site-card-grid \{[\s\S]*?gap: var\(--site-grid-gap\)/);
});

test("주요 공개·인증·고객지원 화면은 공통 페이지 간격을 사용한다", () => {
  for (const path of [
    "../components/support/SupportCenter.tsx",
    "../app/apply/page.tsx",
    "../app/templates/page.tsx",
    "../app/apply/_components/PaidApplyPage.tsx",
    "../app/terms/page.tsx",
    "../app/privacy/page.tsx",
    "../app/sign-up/page.tsx",
    "../app/mypage/page.tsx",
    "../app/mypage/inquiries/page.tsx",
  ]) {
    assert.match(readSource(path), /<SitePage\b|site-page-spacing|site-auth-page/);
  }
});

test("마이페이지 본체는 공통 카드·탭·피드백 표면을 사용한다", () => {
  const source = readSource("../app/mypage/page.tsx");

  assert.match(source, /<AccountPageContent sidebar=/);
  assert.match(readSource("../components/mypage/AccountPageContent.tsx"), /className="site-container"/);
  assert.match(source, /<NavigationTabs label="내 메뉴판 탭"/);
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
    "../components/mypage/StoreOperationsShell.tsx",
  ]) {
    const source = readSource(path);
    assert.match(source, /<SitePage\b|site-card|site-page-spacing-compact/);
    assert.doesNotMatch(source, /shadow-(?:sm|md|lg|xl|2xl)/);
  }
});

test("메뉴 편집기 외곽과 주요 섹션은 공통 반응형 표면을 사용한다", () => {
  const source = readSource("../app/mypage/menus/[menuId]/edit/page.tsx");

  assert.match(source, /site-gutter site-page-spacing-compact/);
  assert.match(source, /function SectionCard[\s\S]*?<section className="site-card site-editor-panel p-5 sm:p-6">/);
  assert.match(source, /<header className="site-card site-editor-panel mb-6 p-5 sm:p-6">/);
  assert.doesNotMatch(source, /shadow-(?:sm|md|lg|xl|2xl)/);
});

test("메뉴 편집기의 탭과 구조 편집 패널도 공통 무그림자 표면을 사용한다", () => {
  const editor = readSource("../app/mypage/menus/[menuId]/edit/page.tsx");
  const navigation = readSource("../components/mypage/menu-editor/MenuEditorNavigation.tsx");
  const management = readSource("../components/mypage/menu-editor/MenuManagementSection.tsx");

  assert.match(navigation, /site-card site-card-compact mb-6/);
  assert.match(editor, /function FinalActionRow[\s\S]*?site-editor-action-row/);
  assert.match(management, /<section className="site-card site-editor-panel p-5 sm:p-6">/);
  assert.match(management, /<section className="site-card site-editor-panel site-card-compact min-w-0 p-4 lg:p-6">/);
  assert.match(management, /function FinalActionRow[\s\S]*?site-editor-action-row/);
  assert.match(uiSystemSource, /\.site-editor-action-row \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(uiSystemSource, /\.site-editor-action-row > :is\(button, a\) \{[\s\S]*?width: 100%/);
  assert.match(uiSystemSource, /@media \(min-width: 640px\) \{[\s\S]*?\.site-editor-action-row \{[\s\S]*?display: flex/);
  assert.doesNotMatch(navigation, /shadow-(?:sm|md|lg|xl|2xl)/);
  assert.doesNotMatch(management, /shadow-(?:sm|md|lg|xl|2xl)/);
});

test("메뉴 편집기 상단 바로가기는 모바일에서 한 열 전체 폭을 사용한다", () => {
  const editor = readSource("../app/mypage/menus/[menuId]/edit/page.tsx");

  assert.match(editor, /className="site-editor-header-actions"/);
  assert.match(editor, /className="site-button site-button-primary"/);
  assert.match(editor, /className="site-button site-button-secondary"/);
  assert.match(uiSystemSource, /\.site-editor-header-actions \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\)[\s\S]*?width: 100%/);
  assert.match(uiSystemSource, /\.site-editor-header-actions > :is\(button, a\) \{[\s\S]*?width: 100%/);
  assert.match(uiSystemSource, /@media \(min-width: 640px\) \{[\s\S]*?\.site-editor-header-actions \{[\s\S]*?display: flex[\s\S]*?width: auto/);
});


test("mobile spacing documentation and live CSS use the same canonical roles", () => {
  const source = readSource("../styles/site-spacing.css");
  for (const item of SITE_MOBILE_SPACING) {
    const declaration = source.match(new RegExp(`${item.token}:\\s*([.\\d]+)rem;`));
    assert.ok(declaration, item.token);
    assert.equal(Number(declaration[1]), item.rem, item.token);
    assert.equal(item.rem * 16 % 4, 0, `${item.token} follows the 4px scale`);
  }
  assert.match(source, new RegExp(`@media \\(max-width: ${SITE_MOBILE_MAX_WIDTH}px\\)`));
  assert.match(globalsSource, /@import "..\/styles\/site-spacing.css"/);
  assert.match(globalsSource, /--site-page-title-description-gap: var\(--site-space-title-copy\)/);
  assert.match(globalsSource, /--site-page-intro-content-gap: var\(--site-space-content\)/);
  assert.match(readSource("../components/design-system/SiteSpacingRules.tsx"), /SITE_MOBILE_SPACING.map/);
  assert.match(readSource("../components/design-system/SiteSystemRules.tsx"), /<SiteSpacingRules/);
});

test("shared mobile stacks own sibling gaps without duplicate child margins", () => {
  const source = readSource("../styles/site-spacing.css");
  for (const role of ["detail", "copy", "block", "group", "content"]) {
    assert.ok(source.includes(`.site-stack-${role} { gap: var(--site-space-${role}); }`));
  }
  assert.match(source, /site-stack-section > \* \{ margin-block: 0; \}/);
  const footer = readSource("../app/components/layout/Footer.module.css");
  assert.match(footer, /\.mobileSections \{ display: grid; margin-top: var\(--site-space-content\)/);
  assert.match(footer, /padding: var\(--site-space-content\) var\(--site-space-group\) 0/);
  assert.doesNotMatch(footer, /@media \(max-width: 639px\)/);
});

test("content layout examples and documented spacing match the canonical token chain", () => {
  const source = readSource("../styles/site-spacing.css");
  const resolvePx = (token: string): number => {
    const value = source.match(new RegExp(`${token}:\\s*([^;]+);`))?.[1];
    assert.ok(value, token);
    const reference = value.match(/^var\((--[\w-]+)\)$/)?.[1];
    return reference ? resolvePx(reference) : Number.parseFloat(value) * 16;
  };
  const tokens = [
    ["--site-panel-inset", "--site-panel-inset-wide"],
    ["--site-panel-inset-compact", "--site-panel-inset-compact"],
    ["--site-space-group", "--site-space-group"],
    ["--site-space-title-copy", "--site-space-title-copy"],
    ["--site-space-block", "--site-space-block"],
    ["--site-space-copy", "--site-space-copy"],
    ["--site-space-group", "--site-space-group"],
    ["--site-space-copy", "--site-space-copy"],
    ["--site-space-copy", "--site-space-copy"],
  ];
  assert.equal(SITE_CONTENT_COMPOSITION.length, tokens.length);
  SITE_CONTENT_COMPOSITION.forEach((item, index) => {
    assert.equal(item.mobile, resolvePx(tokens[index][0]), item.role);
    assert.equal(item.wide, resolvePx(tokens[index][1]), item.role);
  });
  assert.match(readSource("../components/design-system/SiteSpacingRules.tsx"), /SITE_CONTENT_COMPOSITION.map/);
});


test("adjacent controls opt into center alignment while labeled forms and mobile stacking retain their defaults", () => {
  const spacing = readSource("../styles/site-spacing.css");
  assert.match(spacing, /\.site-form-row \{[^}]*flex-direction: column;[^}]*align-items: stretch;/);
  assert.match(spacing, /@media \(min-width: 640px\) \{\s*\.site-form-row \{ flex-direction: row; align-items: flex-end; \}\s*\.site-form-row\[data-alignment="center"\] \{ align-items: center; \}/);
  const editor = readSource("../components/mypage/floor-plan/FloorPlanEditor.tsx");
  assert.match(editor, /className="site-floor-workspace-placement"><FieldActionRow field=/);
  assert.match(readSource("../components/design-system/SiteSpacingRules.tsx"), /htmlFor="control-row-address"/);
  assert.match(readSource("../components/design-system/SiteSpacingRules.tsx"), /data-alignment="center"/);
});
