import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const templateSource = readFileSync(
  new URL("../components/menu-templates/CafeDesignA.tsx", import.meta.url),
  "utf8",
);
const globalStylesSource = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const languageSwitcherSource = readFileSync(
  new URL("../components/menu-templates/shared/MenuLanguageSwitcher.tsx", import.meta.url),
  "utf8",
);

test("원페이지 템플릿의 핵심 타이포그래피와 간격은 화면 크기에 따라 유동적으로 조절된다", () => {
  assert.match(
    globalStylesSource,
    /\.cafe-a-typography \{[\s\S]*--cafe-a-category-title-size: clamp\([^;]*cqw[^;]*\);[\s\S]*--cafe-a-menu-title-size: clamp\([^;]*cqw[^;]*\);[\s\S]*container-type: inline-size;/,
  );
  assert.match(
    globalStylesSource,
    /--board-padding: clamp\(2rem, 4\.2vmin, 4\.25rem\);/,
  );
  assert.match(
    globalStylesSource,
    /--sunday-line-column-gap: clamp\(1\.75rem, 3vw, 3\.5rem\);/,
  );
  assert.match(
    globalStylesSource,
    /--round-focus-mobile-inset: clamp\(1\.5rem, 4vw, 6rem\);/,
  );
  assert.match(
    globalStylesSource,
    /--mocha-mobile-section-rhythm: clamp\(1\.25rem, 5\.8vw, 1\.75rem\);/,
  );
  assert.doesNotMatch(
    globalStylesSource,
    /--mocha-mobile-(?:section-rhythm|category-header-item-gap|item-divider-(?:above|below)-gap):\s*[\d.]+px;/,
  );
});

test("모카 포레스트 언어 선택 버튼은 어두운 배경용 흰색 톤을 사용한다", () => {
  assert.match(
    templateSource,
    /tone=\{isMochaForestSkin\(data\.templateSkin\) \? "inverse" : "default"\}/,
  );
  assert.match(languageSwitcherSource, /tone\?: "default" \| "inverse";/);
  assert.match(
    languageSwitcherSource,
    /tone === "inverse"[\s\S]*"text-white hover:bg-white\/10 focus-visible:ring-white\/40"/,
  );
});

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

test("선데이 라인은 화면 채움 중에도 카테고리·메뉴·설명의 타이포 위계와 상단 설명 비율을 유지한다", () => {
  assert.match(globalStylesSource, /data-cafe-a-skin="sunday_line"[\s\S]*--cafe-a-shell-category-title-boost: 1\.34;/);
  assert.match(globalStylesSource, /data-cafe-a-skin="sunday_line"[\s\S]*--cafe-a-shell-menu-copy-boost: 0\.94;/);
  assert.match(
    globalStylesSource,
    /\.cafe-a-topline-description,[\s\S]*\.cafe-a-topline-notice-text \{[\s\S]*--cafe-a-top-copy-layout-scale[\s\S]*0\.92rem/,
  );
  assert.match(globalStylesSource, /data-layout-mode="orderedBalancedFit"[\s\S]*--cafe-a-top-copy-layout-scale: var\(--ordered-balanced-menu-visual-scale\)/);
  assert.match(globalStylesSource, /--cafe-a-top-copy-density-compensation: 0\.925/);
  assert.match(
    globalStylesSource,
    /data-cafe-a-skin="sunday_line"[^}]*\.cafe-a-ordered-menu-flow \.cafe-a-category-title \{[\s\S]*2\.12rem/,
  );
  assert.match(
    globalStylesSource,
    /data-cafe-a-skin="sunday_line"[^}]*\.cafe-a-ordered-menu-flow \.cafe-a-menu-description,[\s\S]*0\.92rem/,
  );
});

test("데스크톱 맞춤 엔진은 안정화와 DOM 잘림 검증을 통과하기 전까지 로딩 화면을 보여준다", () => {
  assert.match(templateSource, /type CafeDesignAFitPresentationState = "loading" \| "ready" \| "reload"/);
  assert.match(templateSource, /data-fit-presentation-state=\{fitPresentationState\}/);
  assert.match(templateSource, /getCafeAActualDomCropMeasurement\(boardElement, menuElement, cropTolerance\)/);
  assert.match(templateSource, /최적의 배치를 찾고 있어요/);
  assert.match(templateSource, /메뉴와 글자 크기를 화면에 맞추고 있습니다/);
  assert.match(templateSource, /animate-spin[^"]*motion-reduce:animate-none/);
  assert.match(templateSource, /fitPresentationSafetyScale > FIT_PRESENTATION_MIN_SAFETY_SCALE/);
  assert.match(templateSource, /currentScale \* FIT_PRESENTATION_SAFETY_STEP/);
  assert.match(templateSource, /setFitPresentationState\("reload"\)/);
  assert.match(templateSource, /화면을 다시 불러와 주세요/);
  assert.match(templateSource, /새로고침하면 메뉴판 배치를 다시 계산합니다/);
  assert.match(templateSource, /onClick=\{\(\) => window\.location\.reload\(\)\}/);
  assert.match(templateSource, />\s*새로고침\s*<\/button>/);
});
