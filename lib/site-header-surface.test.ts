import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getSiteHeaderSurface } from "./site-header-policy";

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

test("다이닝 소개만 상단 검정 배경과 흰색 헤더를 사용하며 스크롤하면 기본 색으로 복원한다", () => {
  for (const path of ["/services/dining", "/services/dining/"]) assert.equal(getSiteHeaderSurface(path), "dark");
  for (const path of ["/", "/services/basic", "/services/display", "/faq", "/templates", "/mypage", "/templates/dining_aube_table_a/preview"]) assert.equal(getSiteHeaderSurface(path), "default");
  assert.match(navbarStyles, /\.shell\[data-header-surface="dark"\]\[data-scrolled="false"\] \{[^}]*color: #fff;/);
  const spacerSource = readFileSync(new URL("../components/layout/OfficialSiteNavbar.tsx", import.meta.url), "utf8");
  assert.match(spacerSource, /site-header-spacer" data-header-surface=\{getSiteHeaderSurface\(pathname\)\}/);
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
