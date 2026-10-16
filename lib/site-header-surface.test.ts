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

test("공통 헤더의 스크롤 글래스와 불투명 알림 레이어는 독립적으로 동작한다", () => {
  assert.match(navbarSource, /isFloating = isScrolled && !isOpen/);
  assert.match(navbarSource, /data-floating=\{isFloating\}/);
  assert.match(navbarStyles, /backdrop-filter: blur\(20px\)/);
  assert.match(navbarStyles, /prefers-reduced-motion: reduce/);
  assert.match(navbarSource, /w-\[360px\][^\n]*bg-white/);
  assert.doesNotMatch(
    navbarSource,
    /w-\[360px\][^\n]*bg-white[^\n]*shadow-/,
  );
});
