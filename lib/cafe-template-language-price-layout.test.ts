import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const templateSource = readFileSync(
  new URL("../components/menu-templates/CafeDesignA.tsx", import.meta.url),
  "utf8",
);
const globalStylesSource = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

test("하단 언어 선택 UI는 목록을 위로 열어 화면 밖 잘림을 막는다", () => {
  assert.match(templateSource, /data-cafe-a-sunday-language-dock=""[\s\S]*menuPlacement="top"/);
  assert.match(
    templateSource,
    /className="cafe-a-round-focus-language-control"[\s\S]*menuPlacement="top"[\s\S]*menuAlign="left"/,
  );
});

test("라운드 포커스 모바일 언어 UI는 제목과 분리된 상단 행을 사용한다", () => {
  assert.match(templateSource, /data-cafe-a-round-focus-mobile-utility-row=""/);
  assert.match(
    globalStylesSource,
    /\.cafe-a-round-focus-mobile-utility-row \{[\s\S]*justify-content: flex-end;[\s\S]*width: 100%;/,
  );
});

test("원페이지 템플릿 가격은 공통 오른쪽 끝선과 고정폭 숫자를 사용한다", () => {
  assert.match(
    globalStylesSource,
    /\.cafe-a-menu-price \{[\s\S]*font-variant-numeric: tabular-nums;/,
  );
  assert.match(
    globalStylesSource,
    /\.cafe-a-price-column-heading,[\s\S]*\.cafe-a-price-column-cell \{[\s\S]*justify-self: end;[\s\S]*text-align: right;[\s\S]*width: 100%;/,
  );
  assert.match(
    globalStylesSource,
    /\.cafe-a-price-column-cell \{[\s\S]*justify-content: flex-end;/,
  );
});
