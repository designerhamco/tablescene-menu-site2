import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { supportsGlassSiteHeader } from "./site-header-policy";

const navbarSource = readFileSync(
  new URL("../app/components/layout/Navbar.tsx", import.meta.url),
  "utf8",
);
const navbarStyles = readFileSync(
  new URL("../app/components/layout/Navbar.module.css", import.meta.url),
  "utf8",
);

test("공통 헤더의 스크롤 글래스와 불투명 알림 레이어는 독립적으로 동작한다", () => {
  assert.match(navbarSource, /supportsGlassSiteHeader\(pathname\) && isTabletOrDesktop && isScrolled && !isOpen/);
  assert.match(navbarSource, /data-floating=\{isFloating\}/);
  assert.match(navbarStyles, /backdrop-filter: blur\(20px\)/);
  assert.match(navbarStyles, /prefers-reduced-motion: reduce/);
  assert.match(navbarSource, /w-\[360px\][^\n]*bg-white/);
  assert.doesNotMatch(
    navbarSource,
    /w-\[360px\][^\n]*bg-white[^\n]*shadow-/,
  );
});

test("글래스 헤더는 1차 메뉴 페이지만 허용한다", () => {
  for (const path of ["/", "/services/basic", "/services/display", "/faq", "/apply", "/apply/"]) {
    assert.equal(supportsGlassSiteHeader(path), true, path);
  }
  for (const path of ["/mypage", "/mypage/staff", "/apply/basic", "/apply/display", "/apply/custom", "/sign-in", "/support/chat", "/terms", "/templates/cafe_design_a/preview", "/m/store"]) {
    assert.equal(supportsGlassSiteHeader(path), false, path);
  }
});
