import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const navbarSource = readFileSync(
  new URL("../app/components/layout/Navbar.tsx", import.meta.url),
  "utf8",
);
const navbarStyles = readFileSync(
  new URL("../app/components/layout/Navbar.module.css", import.meta.url),
  "utf8",
);

test("공통 헤더는 스크롤 전 투명하고 스크롤 후 흰색 배경만 변경한다", () => {
  assert.match(navbarSource, /data-scrolled=\{isScrolled\}/);
  assert.match(navbarSource, /window.scrollY > 24/);
  assert.match(navbarStyles, /\.shell \{[^}]*background: transparent;/);
  assert.match(navbarStyles, /\.shell\[data-scrolled="true"\] \{ background: var\(--ui-surface\); \}/);
  assert.match(navbarStyles, /\.panel \{[^}]*background: transparent;/);
  assert.doesNotMatch(navbarSource, /isFloating|supportsGlassSiteHeader|data-floating/);
  assert.doesNotMatch(navbarStyles, /data-floating|backdrop-filter/);
  assert.match(navbarStyles, /prefers-reduced-motion: reduce/);
});

test("스크롤 배경 변경은 기존 로고·액션·알림·모바일 메뉴를 재배치하지 않는다", () => {
  assert.match(navbarSource, /className=\{`[^`]*\$\{styles.brand\}`\}/);
  assert.match(navbarSource, /data-site-header-actions/);
  assert.doesNotMatch(navbarStyles, /data-scrolled[^}]*display: none/);
  assert.match(navbarSource, /<PopoverContent[^\n]*site-notification-popover/);
  assert.match(navbarSource, /<NotificationPanel compact/);
  assert.match(navbarSource, /<MobileSiteMenu/);
  assert.match(navbarSource, /if \(window.innerWidth >= 1280\)/);
});
