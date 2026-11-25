import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { SITE_NAV_ITEMS } from "./site-navigation";

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
  for (const label of ["로그인", "회원가입", "내 메뉴판", "매장 운영", "로그아웃"]) assert.ok(menuSource.includes(label));
  assert.doesNotMatch(menuSource, /href="\/apply"/);
  assert.match(menuSource, /<SiteNavigationLabel item=\{item\}/);
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

test("데스크톱 헤더는 내 메뉴판·매장 운영 버튼 뒤에 구분선·알림·프로필을 제공한다", () => {
  const navbarSource = readSource("app/components/layout/Navbar.tsx");
  const actionsStart = navbarSource.indexOf("data-site-header-actions");
  const account = navbarSource.indexOf("data-site-header-account", actionsStart);
  const operations = navbarSource.indexOf("data-site-header-operations", actionsStart);
  const notification = navbarSource.indexOf("className={styles.notificationGroup}", actionsStart);
  const divider = navbarSource.indexOf("data-site-header-divider", operations);
  const bell = navbarSource.indexOf('data-site-notification-trigger', notification);
  const profile = navbarSource.indexOf('data-site-profile-trigger', bell);

  assert.ok(actionsStart >= 0);
  assert.ok(account > actionsStart);
  assert.ok(operations > account);
  assert.ok(divider > operations);
  assert.ok(notification > divider);
  assert.ok(bell > notification);
  assert.ok(profile > bell);
  assert.match(navbarSource, /accountCtaLabel = authState.isAuthenticated \? '내 메뉴판'/);
  assert.match(navbarSource, /site-button site-button-secondary site-button-header"[\s\S]*?data-site-header-account/);
  assert.doesNotMatch(navbarSource, /href="\/apply"/);
  assert.doesNotMatch(navbarSource, /styles.accountLink/);
});

test("만들기 칩은 PC와 모바일의 디자인 템플릿 레이블에 함께 붙고 카탈로그로 이동한다", () => {
  const navbarSource = readSource("app/components/layout/Navbar.tsx");
  const templates = SITE_NAV_ITEMS.find(item => item.path === "/templates");
  assert.deepEqual(templates?.chip, { label: "만들기", tone: "create" });
  assert.equal(SITE_NAV_ITEMS.filter(item => item.chip).length, 1);
  assert.match(navbarSource, /<SiteNavigationLabel item=\{item\}/);
  assert.match(readSource("components/layout/MobileSiteMenu.tsx"), /<SiteNavigationLabel item=\{item\}/);
  assert.match(readSource("components/layout/SiteNavigationLabel.tsx"), /<Badge tone=\{item.chip.tone\}>\{item.chip.label\}<\/Badge>/);
});
