import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function readSource(relativePath: string) {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

test("모바일 전체 메뉴는 공통 Dialog와 같은 단계의 고객센터 펼침 탐색을 사용한다", () => {
  const navbarSource = readSource("app/components/layout/Navbar.tsx");
  const menuSource = readSource("components/layout/MobileSiteMenu.tsx");
  assert.match(navbarSource, /<Dialog.Content/);
  assert.match(navbarSource, /<MobileSiteMenu/);
  assert.match(menuSource, /<CollapsibleTrigger asChild>/);
  assert.match(menuSource, /aria-controls=\{supportId\}/);
  assert.match(menuSource, /SITE_SUPPORT_LINKS.map/);
  for (const label of ["로그인", "회원가입", "마이 메뉴", "매장 운영", "로그아웃", "만들기"]) assert.ok(menuSource.includes(label));
  assert.match(menuSource, /<Badge>\{account.role\}/);
  assert.match(menuSource, /action=\{signOutAction\}/);
});

test("헤더 아이콘은 무배경을 유지하고 떠 있는 맨 위로는 명시적인 형태와 공통 클릭 영역을 사용한다", () => {
  const navbarSource = readSource("app/components/layout/Navbar.tsx");
  const scrollSource = readSource("app/components/ui/ScrollToTop.tsx");
  const uiSystemSource = readSource("styles/ui-system.css");

  assert.match(navbarSource, /site-icon-control relative inline-flex shrink-0/);
  assert.doesNotMatch(navbarSource, /size-10 min-h-10 min-w-10|size-9 min-h-9 min-w-9/);
  assert.match(scrollSource, /site-button-secondary site-button-icon/);
  assert.doesNotMatch(scrollSource, /height: 0/);
  assert.match(scrollSource, /data-icon-appearance="framed"/);
  assert.match(uiSystemSource, /\.site-button-icon \{[^}]*width: var\(--ui-icon-control-size, var\(--ui-control-height-md\)\);/);
  assert.doesNotMatch(uiSystemSource, /\.site-button-icon\.site-button-compact \{/);
});

test("데스크톱 헤더 액션은 MY 메뉴, 매장 운영, 구분선, 알림, 만들기 순서를 유지한다", () => {
  const navbarSource = readSource("app/components/layout/Navbar.tsx");
  const actionsStart = navbarSource.indexOf("data-site-header-actions");
  const account = navbarSource.indexOf("data-site-header-account", actionsStart);
  const operations = navbarSource.indexOf("data-site-header-operations", actionsStart);
  const notification = navbarSource.indexOf("className={styles.notificationGroup}", actionsStart);
  const divider = navbarSource.indexOf("className={styles.accountDivider}", notification);
  const bell = navbarSource.indexOf('aria-label="알림"', notification);
  const make = navbarSource.indexOf("site-button-header", actionsStart);

  assert.ok(actionsStart >= 0);
  assert.ok(account > actionsStart);
  assert.ok(operations > account);
  assert.ok(notification > operations);
  assert.ok(divider > notification);
  assert.ok(bell > divider);
  assert.ok(make > bell);
});

test("디자인 템플릿과 만들기는 서로 다른 경로로 연결한다", () => {
  const navbarSource = readSource("app/components/layout/Navbar.tsx");

  assert.match(readSource("lib/site-navigation.ts"), /label: "디자인 템플릿", path: "\/templates"/);
  assert.match(navbarSource, /href="\/apply"[\s\S]*?>\s*만들기/);
});
