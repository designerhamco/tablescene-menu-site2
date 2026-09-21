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
    /--round-focus-mobile-inset: clamp\(1\.75rem, 5vw, 6rem\);/,
  );
  assert.match(
    globalStylesSource,
    /--mocha-mobile-section-rhythm: clamp\(1\.25rem, 5\.8vw, 1\.75rem\);/,
  );
  assert.doesNotMatch(
    globalStylesSource,
    /--mocha-mobile-(?:section-rhythm|category-header-item-gap|item-divider-(?:above|below)-gap):\s*[\d.]+px;/,
  );
  assert.match(globalStylesSource, /--cafe-a-category-title-size: clamp\(1\.26rem,[^;]*cqw[^;]*1\.56rem\);/);
  assert.match(globalStylesSource, /--cafe-a-linked-supporting-copy-base-size:[^;]*vmin/);
  assert.doesNotMatch(globalStylesSource, /--cafe-a-category-title-size:\s*[\d.]+px;/);
});

test("원페이지 내부 페이지명은 디자인 문구로 임의 노출하지 않는다", () => {
  assert.doesNotMatch(templateSource, /showPageTitles/);
  assert.doesNotMatch(templateSource, /pageGroup\.page\.title/);
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

test("원페이지 모바일 언어 UI는 모든 스킨에서 제목과 분리된 상단 행을 사용한다", () => {
  assert.match(templateSource, /data-cafe-a-mobile-language-row=""/);
  assert.match(templateSource, /data-cafe-a-mobile-language-row=""[\s\S]*data-cafe-a-store-description=""/);
  assert.match(
    globalStylesSource,
    /\.cafe-a-mobile-language-row \{[\s\S]*justify-content: flex-end;[\s\S]*width: 100%;/,
  );
});

test("오브 커피는 설명 아래, 모카 포레스트는 가게명 위에 PC·태블릿 언어 UI를 둔다", () => {
  assert.match(
    templateSource,
    /!isCenterColumn && !isAubeCoffee[\s\S]*data-cafe-a-rail-language-row=""[\s\S]*<CafeLanguageHoverControl data=\{data\} \/>[\s\S]*<StoreIdentity/,
  );
  assert.match(
    templateSource,
    /!isCenterColumn && isAubeCoffee[\s\S]*cafe-a-rail-language-row-after-description[\s\S]*justify-start/,
  );
});

test("재고 마감 카운트다운은 레이아웃이 흔들리지 않는 디지털 타이머를 사용한다", () => {
  assert.match(templateSource, /formatTimeSaleDigitalCountdownLabel\(activeEndsAtMs, nowMs\)/);
  assert.match(templateSource, /data-cafe-a-time-sale-digital-timer=/);
  assert.match(templateSource, /role=\{isDigitalCountdown \? "timer" : undefined\}/);
  assert.match(globalStylesSource, /\.cafe-a-time-sale-digital-value \{[\s\S]*font-variant-numeric: tabular-nums;[\s\S]*inline-size: 8ch;/);
});

test("태블릿 미리보기는 안전 맞춤을 유지하면서 PC보다 1.12배 큰 공통 글자 비율을 사용한다", () => {
  assert.match(templateSource, /TABLET_LANDSCAPE_MAX_FIT_FONT_SCALE = 1\.34/);
  assert.match(templateSource, /getPreviewFitFontScaleCandidates\(FIT_FONT_SCALE_CANDIDATES, data\.previewDevice === "tablet"\)/);
  assert.match(templateSource, /data-preview-device=\{data\.previewDevice\}/);
  assert.match(
    globalStylesSource,
    /\.cafe-a-typography:not\(\.brew-chapter-template\)\[data-preview-device="tablet"\] \{[\s\S]*--cafe-a-device-type-scale: 1\.12;/,
  );
  assert.match(
    globalStylesSource,
    /@media \(min-width: 1024px\) \{[\s\S]*\.cafe-a-typography\[data-preview-device="tablet"\][\s\S]*--cafe-a-shell-category-title-boost: 1\.1;[\s\S]*--cafe-a-shell-menu-copy-boost: 0\.9;/,
  );
  assert.match(
    globalStylesSource,
    /data-preview-device="tablet"\]\[data-cafe-a-skin="sunday_line"\] \{[\s\S]*--cafe-a-store-title-device-scale: 0\.94;/,
  );
  assert.match(globalStylesSource, /\.cafe-a-store-title \{[\s\S]*var\(--cafe-a-store-title-device-scale, 1\)/);
  assert.match(globalStylesSource, /\.cafe-a-topline-title \{[\s\S]*var\(--cafe-a-store-title-device-scale, 1\)/);
});

test("대표 영역은 모든 기기에서 대응 메뉴 역할과 같은 크기를 따른다", () => {
  assert.match(globalStylesSource, /--cafe-a-linked-item-name-size:/);
  assert.match(globalStylesSource, /\.cafe-a-typography:not\(\.brew-chapter-template\) \{[\s\S]*--cafe-a-featured-role-scale: 1;/);
  assert.doesNotMatch(globalStylesSource, /--cafe-a-featured-role-scale: 1\.25;/);
  assert.match(globalStylesSource, /\.cafe-a-cover-hero \.cafe-a-featured-title \{[\s\S]*font-size: calc\(var\(--cafe-a-linked-item-name-size\) \* var\(--cafe-a-featured-role-scale\) \* var\(--cafe-a-device-type-scale\)\);/);
  assert.match(globalStylesSource, /\.cafe-a-menu-title, \.cafe-a-featured-title\) \{[\s\S]*font-size: calc\(var\(--cafe-a-linked-item-name-size\) \* var\(--cafe-a-device-type-scale\)\);/);
  assert.doesNotMatch(globalStylesSource, /--featured-title-ratio:/);
});

test("원페이지 보조언어명은 공통 보조서체를 유지하면서 조금 더 굵게 표시한다", () => {
  assert.match(
    globalStylesSource,
    /\.cafe-a-typography \.cafe-a-menu-meta \{[\s\S]*font-family: var\(--menu-role-supporting-font-family, inherit\);[\s\S]*font-weight: 600;/,
  );
});

test("원페이지 템플릿의 상품·대표·안내 텍스트는 역할별 단일 타이포그래피 계약을 사용한다", () => {
  assert.match(globalStylesSource, /--cafe-a-linked-supporting-copy-size:/);
  assert.match(globalStylesSource, /--cafe-a-linked-price-size:/);
  assert.match(globalStylesSource, /\.cafe-a-menu-price-size-default \{[\s\S]*--cafe-a-menu-price-size:[^;]*vmin/);
  assert.doesNotMatch(globalStylesSource, /\.cafe-a-menu-price-size-(?:spacious|default|compact|ultra-compact) \{[^}]*--cafe-a-menu-price-size:[^;]*cqw/);
  assert.match(
    globalStylesSource,
    /\.cafe-a-typography:not\(\.brew-chapter-template\) :is\(\.cafe-a-menu-title, \.cafe-a-featured-title\) \{[\s\S]*font-size: calc\(var\(--cafe-a-linked-item-name-size\) \* var\(--cafe-a-device-type-scale\)\);[\s\S]*line-height: 1\.375;/,
  );
  assert.match(globalStylesSource, /\.cafe-a-cover-hero \.cafe-a-featured-title \{[\s\S]*var\(--cafe-a-featured-role-scale\)/);
  assert.match(
    globalStylesSource,
    /\.cafe-a-typography:not\(\.brew-chapter-template\) \.cafe-a-menu-description \{[\s\S]*font-size: calc\(var\(--cafe-a-linked-supporting-copy-size\) \* var\(--cafe-a-device-type-scale\)\);[\s\S]*line-height: 1\.45;/,
  );
  assert.match(globalStylesSource, /\.cafe-a-cover-hero \.cafe-a-featured-description \{[\s\S]*var\(--cafe-a-featured-role-scale\)/);
  assert.match(
    globalStylesSource,
    /\.cafe-a-typography:not\(\.brew-chapter-template\) :is\(\.cafe-a-menu-price, \.cafe-a-featured-price\) \{[\s\S]*font-size: calc\(var\(--cafe-a-linked-price-size\) \* var\(--cafe-a-device-type-scale\)\);[\s\S]*font-weight: var\(--menu-role-price-font-weight, 700\);/,
  );
  assert.match(
    globalStylesSource,
    /\.cafe-a-typography:not\(\.brew-chapter-template\) :is\(\.cafe-a-menu-badge, \.cafe-a-featured-badge\) \{[\s\S]*font-size: calc\(var\(--cafe-a-linked-item-name-size\)[^;]*0\.62\);/,
  );
  assert.match(globalStylesSource, /\.cafe-a-cover-hero \.cafe-a-featured-price \{[\s\S]*var\(--cafe-a-featured-role-scale\)/);
  assert.match(globalStylesSource, /\.cafe-a-cover-hero \.cafe-a-featured-badge \{[\s\S]*font-size: calc\(var\(--cafe-a-linked-item-name-size\)[^;]*0\.62\);/);
  assert.match(templateSource, /function getMenuPriceSizeClassName\(density: MenuLayoutDensity\)/);
  assert.match(templateSource, /cafe-a-featured-price \$\{getMenuPriceSizeClassName\(density\)\}/);
  assert.match(templateSource, /data-cafe-a-menu-description=""/);
  assert.match(templateSource, /data-cafe-a-category-description=""/);
  assert.match(templateSource, /data-cafe-a-menu-badge=""/);
  assert.match(templateSource, /data-cafe-a-featured-badge=""/);
  assert.match(templateSource, /<Badge[^>]*className=\{titleClassName\}/);
  assert.match(templateSource, /<HeroOverlayBadge[^>]*className=\{getMenuTitleSizeClassName\(density\)\}/);
  assert.doesNotMatch(globalStylesSource, /--featured-price-ratio:/);
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
  assert.match(
    globalStylesSource,
    /data-cafe-a-skin="sunday_line"\][\s\S]*\.cafe-a-category-title \{[\s\S]*var\(--cafe-a-linked-item-name-size\)[\s\S]*1\.22/,
  );
  assert.match(globalStylesSource, /data-cafe-a-skin="sunday_line"[\s\S]*--cafe-a-shell-category-title-boost: 1\.24;/);
  assert.match(globalStylesSource, /data-cafe-a-skin="sunday_line"[\s\S]*--cafe-a-shell-menu-copy-boost: 0\.94;/);
  assert.match(
    globalStylesSource,
    /\.cafe-a-topline-description,[\s\S]*\.cafe-a-topline-notice-text \{[\s\S]*font-size: calc\(var\(--cafe-a-linked-supporting-copy-size\) \* var\(--cafe-a-device-type-scale\)\)/,
  );
  assert.match(globalStylesSource, /data-layout-mode="orderedFit"[^}]*--cafe-a-linked-supporting-copy-size: clamp\(/);
  assert.match(globalStylesSource, /data-layout-mode="balanced"[^}]*data-layout-mode="orderedBalancedFit"[^}]*--cafe-a-linked-supporting-copy-size: clamp\(/);
  assert.match(
    globalStylesSource,
    /data-cafe-a-skin="sunday_line"[^}]*:is\(\.cafe-a-ordered-menu-flow, \.cafe-a-balanced-menu-grid\) \.cafe-a-category-title \{[\s\S]*2\.12rem/,
  );
  assert.match(
    globalStylesSource,
    /data-cafe-a-skin="sunday_line"[^}]*\.cafe-a-ordered-menu-flow \.cafe-a-menu-description,[\s\S]*font-size: calc\(var\(--cafe-a-linked-supporting-copy-size\) \* var\(--cafe-a-device-type-scale\)\)/,
  );
  assert.match(templateSource, /cafe-a-menu-description cafe-a-featured-description/);
  assert.match(templateSource, /cafe-a-menu-description cafe-a-store-description cafe-a-rail-description/);
  assert.match(templateSource, /className=\{`cafe-a-desktop-fit-board \$\{titleSizeClassName\} \$\{descriptionSizeClassName\}/);
});

test("오브 커피와 모카 포레스트는 선데이 라인의 장치별 글자 위계를 공유한다", () => {
  assert.match(templateSource, /data-template-key=\{data\.menuSite\.template_key \?\? undefined\}/);
  assert.match(templateSource, /const titleSizeClassName = getMenuTitleSizeClassName\(density\);/);
  assert.match(templateSource, /className=\{`menu-typography cafe-a-typography \$\{titleSizeClassName\}/);
  assert.match(globalStylesSource, /data-template-key="cafe_design_a"[^}]*--cafe-a-template-category-title-scale: 1;/);
  assert.match(globalStylesSource, /data-cafe-a-skin="mocha_forest"[^}]*--cafe-a-template-category-title-scale: 1;/);
  assert.match(globalStylesSource, /--cafe-a-template-secondary-copy-scale: 1;/);
  assert.match(globalStylesSource, /--cafe-a-template-supporting-copy-scale: 1;/);
  assert.match(globalStylesSource, /--cafe-a-template-option-label-scale: 1;/);
  assert.match(globalStylesSource, /--cafe-a-template-shared-supporting-copy-base-size: clamp\(0\.76rem,/);
  assert.match(globalStylesSource, /--cafe-a-sunday-category-ratio: 1\.34;[\s\S]*--cafe-a-sunday-secondary-ratio: 0\.68;[\s\S]*--cafe-a-sunday-supporting-ratio: 0\.81;[\s\S]*--cafe-a-sunday-price-ratio: 1\.04;[\s\S]*--cafe-a-sunday-option-ratio: 0\.62;/);
  assert.match(globalStylesSource, /data-preview-device="tablet"[^}]*--cafe-a-store-title-device-scale: 0\.94;[\s\S]*--cafe-a-sunday-category-ratio: 1\.4;[\s\S]*--cafe-a-sunday-secondary-ratio: 0\.63;[\s\S]*--cafe-a-sunday-supporting-ratio: 0\.72;[\s\S]*--cafe-a-sunday-price-ratio: 1\.04;[\s\S]*--cafe-a-sunday-option-ratio: 0\.53;/);
  assert.match(globalStylesSource, /not\(\[data-preview-device="tablet"\]\)[^{]*\{[^}]*--cafe-a-sunday-category-ratio: 1\.5;[\s\S]*--cafe-a-sunday-secondary-ratio: 0\.64;[\s\S]*--cafe-a-sunday-supporting-ratio: 0\.71;[\s\S]*--cafe-a-sunday-price-ratio: 1;[\s\S]*--cafe-a-sunday-option-ratio: 0\.56;/);
  assert.match(globalStylesSource, /\.cafe-a-desktop-fit-board \.cafe-a-store-title \{[\s\S]*5\.4vh/);
  assert.match(globalStylesSource, /header \.cafe-a-store-title \{[\s\S]*11vw/);
  assert.match(globalStylesSource, /\.cafe-a-category-title \{[\s\S]*var\(--cafe-a-sunday-category-ratio\)/);
  assert.match(globalStylesSource, /\.cafe-a-menu-meta \{[\s\S]*var\(--cafe-a-sunday-secondary-ratio\)/);
  assert.match(globalStylesSource, /\.cafe-a-menu-description,[\s\S]*var\(--cafe-a-sunday-supporting-ratio\)/);
  assert.match(globalStylesSource, /\.cafe-a-featured-price\) \{[\s\S]*var\(--cafe-a-sunday-price-ratio\)/);
  assert.match(globalStylesSource, /\.cafe-a-price-label[\s\S]*var\(--cafe-a-sunday-option-ratio\)/);
});

test("단일 페이지별 미세 조정은 유동 간격과 동일 열 계약을 유지한다", () => {
  assert.match(globalStylesSource, /--sunday-line-row-gap: calc\(var\(--board-padding\) \+ clamp\(0\.25rem, 0\.55vmin, 0\.5rem\)\);/);
  assert.match(globalStylesSource, /data-cafe-a-skin="sunday_line"[^}]*\.cafe-a-desktop-fit-board[^}]*row-gap: var\(--sunday-line-row-gap\);/);
  assert.equal((globalStylesSource.match(/grid-template-columns: repeat\(3, minmax\(0, 1fr\)\);/g) ?? []).length >= 4, true);
  assert.doesNotMatch(globalStylesSource, /data-cafe-a-skin="round_focus"[^}]*grid-template-columns: minmax\(0, 1fr\) minmax\((?:180|190)px, var\(--round-focus-center-width\)\) minmax\(0, 1fr\);/);
  assert.match(globalStylesSource, /data-cafe-a-skin="round_focus"[^}]*--board-padding: clamp\(2\.25rem, 5\.2vmin, 3\.5rem\);/);
  assert.match(globalStylesSource, /--round-focus-column-gap: clamp\(1\.75rem, 3\.2vw, 3\.75rem\);/);
  assert.match(globalStylesSource, /--round-focus-column-inset: clamp\(0\.5rem, 0\.7vw, 0\.75rem\);/);
  assert.match(globalStylesSource, /\.cafe-a-center-rail-menu-grid > \.cafe-a-balanced-column \{[\s\S]*padding: var\(--board-padding\) var\(--round-focus-column-inset\);/);
});

test("데스크톱 맞춤 엔진은 안정화와 DOM 잘림 검증을 통과하기 전까지 로딩 화면을 보여준다", () => {
  assert.match(templateSource, /type CafeDesignAFitPresentationState = "loading" \| "ready" \| "reload"/);
  assert.match(templateSource, /const FIT_PRESENTATION_FONT_WAIT_MS = 1500;/);
  assert.match(templateSource, /fontTimeoutId = window\.setTimeout\(waitForStableLayout, FIT_PRESENTATION_FONT_WAIT_MS\)/);
  assert.match(templateSource, /verificationScheduled = true;/);
  assert.match(templateSource, /if \(!isMochaForest && actualCropMeasurement\.bottomGap > 12\)/);
  assert.match(templateSource, /orderedBalancedSeenStateRef/);
  assert.match(templateSource, /isReturningToSeenSafeCandidate/);
  assert.match(templateSource, /data-fit-presentation-state=\{fitPresentationState\}/);
  assert.match(templateSource, /getCafeAActualDomCropMeasurement\(boardElement, menuElement, cropTolerance\)/);
  assert.match(templateSource, /최적의 배치를 찾고 있어요/);
  assert.match(templateSource, /메뉴와 글자 크기를 화면에 맞추고 있습니다/);
  assert.match(templateSource, /animate-spin[^"]*motion-reduce:animate-none/);
  assert.match(templateSource, /fitPresentationSafetyScale > FIT_PRESENTATION_MIN_SAFETY_SCALE/);
  assert.match(templateSource, /currentScale \* FIT_PRESENTATION_SAFETY_STEP/);
  assert.match(templateSource, /hasFitPresentationReadyRef\.current/);
  assert.match(templateSource, /if \(!hasFitPresentationReadyRef\.current\) \{/);
  assert.match(templateSource, /setFitPresentationState\("reload"\)/);
  assert.match(templateSource, /화면을 다시 불러와 주세요/);
  assert.match(templateSource, /새로고침하면 메뉴판 배치를 다시 계산합니다/);
  assert.match(templateSource, /onClick=\{\(\) => window\.location\.reload\(\)\}/);
  assert.match(templateSource, />\s*새로고침\s*<\/button>/);
});
