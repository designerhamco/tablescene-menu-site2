import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const navbarSource = readFileSync(
  new URL("../app/components/layout/Navbar.tsx", import.meta.url),
  "utf8",
);

test("공통 헤더의 고정 표면과 알림 레이어는 불투명 배경을 사용한다", () => {
  assert.match(navbarSource, /'bg-zinc-950 border-b border-zinc-800'/);
  assert.match(navbarSource, /'bg-white border-b border-zinc-200'/);
  assert.doesNotMatch(navbarSource, /bg-zinc-950\/95|bg-white\/90|backdrop-blur-md/);
  assert.doesNotMatch(
    navbarSource,
    /w-\[360px\][^\n]*bg-white[^\n]*shadow-/,
  );
});
