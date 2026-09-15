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

test("원페이지 템플릿 옵션명은 가격 열 중앙에, 가격은 오른쪽 끝선에 맞춘다", () => {
  assert.match(
    globalStylesSource,
    /\.cafe-a-menu-price \{[\s\S]*font-variant-numeric: tabular-nums;/,
  );
  assert.match(
    globalStylesSource,
    /\.cafe-a-price-column-heading \{[\s\S]*justify-self: end;[\s\S]*position: relative;[\s\S]*text-align: center;[\s\S]*width: max-content;/,
  );
  assert.match(
    globalStylesSource,
    /\.cafe-a-price-column-header,[\s\S]*\.cafe-a-price-columns-grid \{[\s\S]*grid-template-columns: repeat\(var\(--cafe-a-price-column-count\), max-content\);/,
  );
  assert.match(globalStylesSource, /--cafe-a-price-column-gap: 0\.625rem;/);
  assert.match(
    globalStylesSource,
    /--cafe-a-price-column-gap: clamp\(0\.48rem, calc\(0\.625rem \* var\(--fit-menu-gap-scale\)\), 0\.72rem\);/,
  );
  assert.match(
    globalStylesSource,
    /\.cafe-a-price-column-sizer \{[\s\S]*display: grid;[\s\S]*grid-area: price-column;[\s\S]*letter-spacing: normal;[\s\S]*visibility: hidden;/,
  );
  assert.match(
    globalStylesSource,
    /\.cafe-a-price-column-heading-label \{[\s\S]*font-size: var\(--cafe-a-price-column-label-font-size\);[\s\S]*inset: 0;[\s\S]*justify-content: center;/,
  );
  assert.match(
    globalStylesSource,
    /\.cafe-a-price-column-cell \{[\s\S]*display: grid;[\s\S]*grid-template-areas: "price-column";[\s\S]*justify-self: end;[\s\S]*text-align: right;[\s\S]*width: max-content;/,
  );
  assert.match(
    templateSource,
    /function getCategoryPriceRailColumns\([\s\S]*widthCandidates: Array\.from\(candidatesByColumnId\.get\(column\.id\) \?\? \[\]\)/,
  );
  assert.match(
    templateSource,
    /function getColumnTimeSalePrice\([\s\S]*isTimeSaleCurrentlyActive\(timeSale\.promotion, nowMs\)/,
  );
  assert.match(
    templateSource,
    /<PriceColumnWidthSizer[\s\S]*candidates=\{priceRailColumns\?\.\[index\]\?\.widthCandidates/,
  );
  assert.doesNotMatch(globalStylesSource, /cafe-a-price-rail-safe-gap/);
});

test("선데이 라인 데스크톱 언어 UI는 가격 우측 끝선에 보이는 영역을 맞춘다", () => {
  assert.match(
    globalStylesSource,
    /\.cafe-a-typography\[data-cafe-a-skin="sunday_line"\] \.cafe-a-sunday-language-dock \{[\s\S]*right: -0\.4375rem;/,
  );
});
