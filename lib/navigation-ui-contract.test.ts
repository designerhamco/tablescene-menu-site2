import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function readSource(relativePath: string) {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

test("모바일 전체 메뉴는 공통 좌우 여백과 균형 잡힌 상단 액션을 사용한다", () => {
  const navbarSource = readSource("app/components/layout/Navbar.tsx");

  assert.match(navbarSource, /site-container flex h-full flex-col/);
  assert.match(navbarSource, /mb-6 grid grid-cols-2 gap-2/);
  assert.doesNotMatch(navbarSource, /authState\.isAuthenticated \? 'col-span-2'/);
  assert.match(navbarSource, /site-button site-button-primary w-full/);
  assert.match(navbarSource, /site-button site-button-secondary w-full/);
  assert.match(navbarSource, /min-h-16 items-center justify-between/);
  assert.match(navbarSource, /<ArrowUpRight/);
});

test("헤더와 퀵 메뉴의 원형 아이콘 버튼은 가로세로가 같은 규격을 보장한다", () => {
  const navbarSource = readSource("app/components/layout/Navbar.tsx");
  const scrollSource = readSource("app/components/ui/ScrollToTop.tsx");
  const uiSystemSource = readSource("styles/ui-system.css");

  assert.match(navbarSource, /size-10 min-h-10 min-w-10 shrink-0/);
  assert.match(navbarSource, /size-9 min-h-9 min-w-9 shrink-0/);
  assert.match(scrollSource, /site-button-secondary site-button-icon/);
  assert.doesNotMatch(scrollSource, /height: 0/);
  assert.match(uiSystemSource, /\.site-button-icon \{[\s\S]*?height: var\(--ui-control-height-md\);[\s\S]*?aspect-ratio: 1;[\s\S]*?flex: none;/);
  assert.match(uiSystemSource, /\.site-button-icon\.site-button-sm \{[\s\S]*?height: var\(--ui-control-height-sm\);/);
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
