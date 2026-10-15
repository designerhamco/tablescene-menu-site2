import { readCafeTemplateSource } from "./test-helpers/cafe-template-source";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { getTemplateContentSeparatorRules } from "./template-content-separator-rules";

const cafeSource = readCafeTemplateSource();
const displaySource = readFileSync(
  new URL("../components/menu-templates/DisplayMenuA.tsx", import.meta.url),
  "utf8",
);
const multiPageSource = readFileSync(
  new URL("../components/menu-templates/DiningAubeTableA.tsx", import.meta.url),
  "utf8",
);
const globalStylesSource = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const contractSource = readFileSync(
  new URL("../docs/template-spacing-contract.md", import.meta.url),
  "utf8",
);

test("단일페이지 PC·태블릿은 유동 fit 간격을, 모바일은 독립적인 reading 간격을 사용한다", () => {
  assert.match(cafeSource, /data-spacing-contract=\{onePageRhythmMode === "mobile" \? "mobile-reading" : "canvas-fit"\}/);
  assert.match(cafeSource, /stack: "clamp\([^\n]+vmin[^\n]+\)"/);
  assert.match(globalStylesSource, /--cafe-a-page-inline: clamp\([^;]+vw[^;]+\);/);
  assert.match(globalStylesSource, /--cafe-a-item-rhythm-gap: clamp\([^;]+var\(--fit-menu-gap-scale\)[^;]+\);/);
  assert.match(globalStylesSource, /--cafe-a-category-title-to-first-ratio: 1;/);
  assert.match(globalStylesSource, /--cafe-a-category-separation-ratio: 2\.6;/);
  assert.match(globalStylesSource, /data-cafe-a-skin="round_focus"[\s\S]*--cafe-a-category-title-to-first-ratio: 1\.25;[\s\S]*--cafe-a-category-separation-ratio: 3\.6;/);
  assert.match(globalStylesSource, /data-cafe-a-skin="mocha_forest"[\s\S]*cafe-a-menu-item-stack:not\(:last-child\)[\s\S]*padding-bottom: 0;/);
  assert.match(globalStylesSource, /data-cafe-a-widget-placement="bottom"\]:has\(\+ \.cafe-a-footer-info\)[\s\S]*margin-bottom: var\(--cafe-a-item-rhythm-gap\);/);
  assert.match(globalStylesSource, /cafe-a-round-focus-price-leader[\s\S]*radial-gradient\(circle, currentColor 0 0\.55px, transparent 0\.85px\)/);
  assert.doesNotMatch(globalStylesSource, /cafe-a-round-focus-price-leader[\s\S]{0,240}border-bottom: 1px dashed/);
  assert.match(globalStylesSource, /--cafe-a-category-title-to-items-gap: calc\(var\(--cafe-a-item-rhythm-gap\) \* var\(--cafe-a-category-title-to-first-ratio\)\);/);
  assert.match(globalStylesSource, /--cafe-a-category-no-divider-gap: calc\(var\(--cafe-a-item-rhythm-gap\) \* var\(--cafe-a-category-separation-ratio\)\);/);
  assert.match(cafeSource, /className=\{`cafe-a-menu-widget-block min-w-0 break-inside-avoid \$\{itemStackSpacing\}`\}/);
  assert.match(
    globalStylesSource,
    /cafe-a-menu-category-block\[data-cafe-a-next-block-type="widget"\][\s\S]*cafe-a-menu-widget-block\[data-cafe-a-next-block-type="widget"\][\s\S]*margin-bottom: calc\(var\(--cafe-a-local-item-rhythm-gap\) \* var\(--cafe-a-category-separation-ratio\)\);/,
  );
  assert.match(
    globalStylesSource,
    /cafe-a-menu-category-block\[data-cafe-a-visual-next-block-type="widget"\][\s\S]*cafe-a-menu-widget-block\[data-cafe-a-visual-next-block-type="widget"\][\s\S]*margin-bottom: var\(--cafe-a-category-no-divider-gap\);/,
  );
  assert.match(
    globalStylesSource,
    /cafe-a-menu-category-block:last-of-type:not\(\[data-cafe-a-visual-next-block-type\]\) \{\s*margin-bottom: 0;/,
  );
  assert.doesNotMatch(
    globalStylesSource,
    /cafe-a-menu-category-block:last-of-type \{\s*margin-bottom: 0;/,
  );
  assert.doesNotMatch(globalStylesSource, /--cafe-a-widget-(?:transition|stack)-gap:/);
  assert.doesNotMatch(globalStylesSource, /--cafe-a-category-separation-ratio:[^;]*fit/);
  assert.match(globalStylesSource, /margin-bottom: var\(--cafe-a-item-rhythm-gap\);/);
  assert.match(
    globalStylesSource,
    /data-cafe-a-skin="round_focus"[\s\S]*data-cafe-a-visual-next-block-type="category"[\s\S]*margin-bottom: var\(--cafe-a-category-no-divider-gap\);/,
  );
  assert.match(
    globalStylesSource,
    /data-cafe-a-skin="mocha_forest"[\s\S]*data-cafe-a-visual-next-block-type="category"[\s\S]*margin-bottom: var\(--cafe-a-category-no-divider-gap\);/,
  );
});

test("색상 패널 경계와 KOHI 외곽 프레임은 페이지 여백 계약을 지킨다", () => {
  assert.match(
    globalStylesSource,
    /data-cafe-a-skin="mocha_forest"[^}]*\.cafe-a-balanced-column:first-child \{\s*padding-left: var\(--cafe-a-panel-column-gap\);/,
  );
  assert.doesNotMatch(
    globalStylesSource,
    /data-cafe-a-skin="mocha_forest"[^}]*\.cafe-a-fixed-rail \{\s*padding-right: calc\(var\(--cafe-a-panel-column-gap\) \* 0\.5\);/,
  );
  assert.match(
    globalStylesSource,
    /data-cafe-a-skin="round_focus"[^}]*\{\s*--round-focus-column-gap: var\(--cafe-a-panel-column-gap\);\s*--round-focus-column-inset: 0;/,
  );
  assert.match(globalStylesSource, /--kohi-content-rule-gap: clamp\(1rem, 1\.8vmin, 1\.25rem\);/);
  assert.doesNotMatch(globalStylesSource, /data-template-key="cafe_kohi_a"[^}]*--board-padding:/);
});

test("KOHI 모바일은 마지막 아이템에서 경계선까지의 여백만 24px로 늘린다", () => {
  assert.match(globalStylesSource, /--cafe-a-mobile-menu-start-gap: var\(--cafe-a-mobile-section-gap\);/);
  assert.match(globalStylesSource, /--cafe-a-mobile-upper-to-menu-gap: var\(--cafe-a-mobile-section-gap\);/);
  assert.match(globalStylesSource, /--cafe-a-mobile-category-boundary-gap: var\(--cafe-a-mobile-section-gap\);/);
  assert.match(globalStylesSource, /--kohi-mobile-line-content-gap: 0\.75rem;/);
  assert.match(globalStylesSource, /--kohi-mobile-heading-to-rule-gap: var\(--kohi-mobile-line-content-gap\);/);
  assert.match(globalStylesSource, /--kohi-mobile-rule-to-item-gap: var\(--kohi-mobile-line-content-gap\);/);
  assert.match(globalStylesSource, /--kohi-mobile-last-item-to-rule-gap: 1\.5rem;/);
  assert.match(globalStylesSource, /--kohi-mobile-category-rule-gap: var\(--kohi-mobile-line-content-gap\);/);
  assert.match(globalStylesSource, /--cafe-a-mobile-menu-start-gap: calc\(var\(--kohi-mobile-category-rule-gap\) \+ var\(--kohi-divider-width\) \+ var\(--kohi-mobile-category-rule-gap\)\);/);
  assert.match(globalStylesSource, /--cafe-a-mobile-upper-to-menu-gap: var\(--cafe-a-mobile-menu-start-gap\);/);
  assert.match(globalStylesSource, /--cafe-a-mobile-category-boundary-gap: calc\(var\(--kohi-mobile-last-item-to-rule-gap\) \+ var\(--kohi-divider-width\) \+ var\(--kohi-mobile-category-rule-gap\)\);/);
  assert.match(globalStylesSource, /\.cafe-a-fit-menu-grid > \* \+ \.cafe-a-menu-category-block \{\s*margin-top: var\(--cafe-a-mobile-category-boundary-gap\);/);
  assert.doesNotMatch(globalStylesSource, /data-template-key="cafe_kohi_a"\][^{]*\.cafe-a-fit-menu-grid > \* \+ \.cafe-a-menu-category-block \{/);
  assert.match(globalStylesSource, /data-template-key="cafe_kohi_a"\]:where\(:not\(\[data-cafe-a-adaptive-fit="true"\]\)\):not\(\[data-cafe-a-mobile-style="true"\]\)/);
  assert.match(contractSource, /12px clearance around the internal heading rule/);
  assert.match(contractSource, /24px clearance from the preceding category's last item to the category-boundary stroke/);
});

test("리얼맛차 단일페이지의 데스크톱 카테고리 경계는 숨긴 분리선 간격 대신 2.9배 리듬을 사용한다", () => {
  assert.match(
    globalStylesSource,
    /:is\(\[data-template-key="cafe_design_a"\], \[data-template-key="fast_food_loop_bagel_a"\]\) \{\s*--cafe-a-category-separation-ratio: 2\.9;/,
  );
  const selector = '.cafe-a-typography[data-template-key="cafe_design_a"][data-cafe-a-proportion-policy="true"] .cafe-a-desktop-fit-board .cafe-a-menu-category-block[data-cafe-a-visual-next-block-type="category"]';
  const boundaryRule = `${selector} {\n    margin-bottom: var(--cafe-a-category-no-divider-gap);\n  }`;
  assert.ok(globalStylesSource.includes(`@media (min-width: 1024px) {\n  ${boundaryRule}`));
  assert.equal(globalStylesSource.split(selector).length - 1, 1);
  // The scoped rule follows both shared category transitions, including the two-column fallback.
  assert.ok(globalStylesSource.indexOf(boundaryRule) > globalStylesSource.lastIndexOf('margin-bottom: var(--cafe-a-category-divider-before-gap);'));
  assert.match(
    globalStylesSource,
    /data-template-key="cafe_design_a"\] \.cafe-a-menu-category-top-divider \{\s*display: none;/,
  );
});

test("반고흐는 분리선 없이 기기별 기준에 같은 카테고리 간격 비율을 적용한다", () => {
  const rules = getTemplateContentSeparatorRules("cafe_van_gogh_a", "cafe");
  assert.equal(rules.categoryDivider, "none");
  assert.match(
    globalStylesSource,
    /data-template-key="cafe_van_gogh_a"[\s\S]*--cafe-a-category-separation-ratio: 3\.25;[\s\S]*--cafe-a-category-title-to-first-ratio: 1\.15;/,
  );
  assert.match(
    globalStylesSource,
    /data-template-key="cafe_van_gogh_a"[\s\S]*cafe-a-menu-category-block \+ \.cafe-a-menu-category-block[\s\S]*var\(--cafe-a-category-separation-ratio\)/,
  );
  assert.match(
    globalStylesSource,
    /data-template-key="cafe_van_gogh_a"[\s\S]*data-cafe-a-visual-next-block-type="category"[\s\S]*margin-bottom: var\(--cafe-a-category-no-divider-gap\);/,
  );
  assert.match(
    globalStylesSource,
    /data-template-key="cafe_van_gogh_a"[^}]*cafe-a-topline-title[^}]*\{[^}]*line-height: 1\.1;[^}]*padding-block: 0\.08em 0\.02em;/,
  );
  assert.match(
    globalStylesSource,
    /data-template-key="cafe_van_gogh_a"[^}]*:is\([\s\S]*data-cafe-a-menu-badge[\s\S]*cafe-a-featured-badge[\s\S]*\)[^}]*\{[^}]*border: 0;/,
  );
  assert.match(
    globalStylesSource,
    /data-template-key="cafe_van_gogh_a"[^}]*\{[^}]*--cafe-a-van-gogh-notice-size: clamp\(0\.7rem, 1\.5vmin, 0\.82rem\);/,
  );
  assert.match(
    globalStylesSource,
    /data-template-key="cafe_van_gogh_a"[^}]*cafe-a-topline-notice-text\.cafe-a-menu-description[^}]*\{[^}]*font-size: var\(--cafe-a-van-gogh-notice-size\);/,
  );
  assert.match(
    globalStylesSource,
    /data-template-key="cafe_van_gogh_a"[^}]*:is\([\s\S]*cafe-a-topline-mobile-notices,[\s\S]*cafe-a-footer-info[\s\S]*\) \.cafe-a-description-text[^}]*\{[^}]*font-size: var\(--cafe-a-van-gogh-notice-size\);/,
  );
});

test("선데이 PC·태블릿은 마지막 상품에서 점선까지 공통 카테고리 경계를 한 번만 적용한다", () => {
  const selector = '.cafe-a-typography[data-cafe-a-adaptive-fit="true"][data-cafe-a-skin="sunday_line"] .cafe-a-desktop-fit-board';
  const rule = `${selector} {\n  --cafe-a-category-divider-before-gap: var(--cafe-a-category-no-divider-gap);\n}`;
  assert.ok(globalStylesSource.includes(rule));
  assert.equal(globalStylesSource.split(selector).length - 1, 1);
  assert.match(contractSource, /Sunday Roasters keeps its dotted rule as the leading edge of the following category on PC\/tablet/);
});

test("루프베이글은 분리선 없이 상하 2행 블루 체커보드를 유지한다", () => {
  const rules = getTemplateContentSeparatorRules("fast_food_loop_bagel_a", "fast_food");
  assert.equal(rules.categoryDivider, "none");
  assert.match(
    globalStylesSource,
    /data-template-key="fast_food_loop_bagel_a"[^}]*\{[^}]*padding-block: calc\(var\(--loop-bagel-checker-square\) \* 2\);/,
  );
  assert.match(
    globalStylesSource,
    /data-template-key="fast_food_loop_bagel_a"[^}]*::before,[\s\S]*::after[^}]*\{[^}]*conic-gradient\(#4354ef 25%, #ffffff 0 50%, #4354ef 0 75%, #ffffff 0\);[^}]*height: calc\(var\(--loop-bagel-checker-square\) \* 2\);/,
  );
  assert.doesNotMatch(
    globalStylesSource,
    /data-template-key="fast_food_loop_bagel_a"[^}]*cafe-a-category-heading[^}]*border-bottom/,
  );
  assert.match(
    globalStylesSource,
    /data-template-key="fast_food_loop_bagel_a"[^}]*:is\([\s\S]*data-preview-device="tablet"[\s\S]*data-preview-device="pc"[\s\S]*\)[^}]*\{[^}]*--cafe-a-category-separation-ratio: 3\.2;/,
  );
  assert.match(
    globalStylesSource,
    /data-template-key="fast_food_loop_bagel_a"[^}]*cafe-a-desktop-fit-board[^}]*data-cafe-a-visual-next-block-type="category"[^}]*\{[^}]*margin-bottom: var\(--cafe-a-category-no-divider-gap\);/,
  );
  assert.match(
    globalStylesSource,
    /data-template-key="fast_food_loop_bagel_a"[^}]*cafe-a-balanced-column > \.cafe-a-footer-info[^}]*\{[^}]*margin-top: auto;[^}]*padding-top: var\(--cafe-a-category-no-divider-gap\);/,
  );
  assert.match(
    globalStylesSource,
    /data-template-key="fast_food_loop_bagel_a"[^}]*cafe-a-cover-hero[^}]*\{[^}]*border-radius: clamp\(0\.875rem, 1\.65vmin, 1\.35rem\);[^}]*overflow: hidden;/,
  );
  assert.match(
    globalStylesSource,
    /data-template-key="fast_food_loop_bagel_a"[^}]*cafe-a-menu-item-image-slot[^}]*\{[^}]*border-radius: clamp\(0\.5rem, 1vmin, 0\.8rem\);[^}]*overflow: hidden;/,
  );
  assert.match(
    globalStylesSource,
    /data-template-key="fast_food_loop_bagel_a"[^}]*cafe-a-menu-item-image-zoom[^}]*\{[^}]*border-radius: 0\.38rem;[^}]*color: #4354ef;/,
  );
  assert.match(
    globalStylesSource,
    /cafe-a-image-lightbox\[data-template-key="fast_food_loop_bagel_a"\] img[^}]*\{[^}]*border-radius: clamp\(0\.875rem, 1\.8vmin, 1\.5rem\);/,
  );
  assert.match(
    globalStylesSource,
    /data-template-key="fast_food_loop_bagel_a"\][^}]*\{[^}]*--cafe-a-category-title-to-first-ratio: 1\.5;[^}]*--cafe-a-store-title-device-scale: 1\.36;[^}]*--cafe-a-sunday-category-ratio: 1\.62;/,
  );
  assert.match(
    globalStylesSource,
    /data-template-key="fast_food_loop_bagel_a"\][^}]*cafe-a-menu-description[^}]*\{[^}]*line-height: 1\.38;/,
  );
});

test("Display는 화면 행 예산으로 카테고리와 메뉴 간격을 함께 계산한다", () => {
  assert.match(displaySource, /data-spacing-contract="canvas-fit"/);
  assert.match(displaySource, /const categoryHeadingGapScale = itemGapScale;/);
  assert.match(displaySource, /--display-row": `\$\{rowCqh\}cqh`/);
  assert.match(displaySource, /--display-column-padding-x": "clamp\([^\n]+vw[^\n]+\)"/);
  assert.match(displaySource, /--display-column-padding-y": "clamp\([^\n]+vw[^\n]+\)"/);
});

test("멀티페이지는 fit/fill과 분리된 유동 editorial-scroll 계약을 사용한다", () => {
  assert.match(multiPageSource, /data-spacing-contract="editorial-scroll"/);
  assert.match(multiPageSource, /--aube-page-padding-top: clamp\([^;]+vh[^;]+\);/);
  assert.match(multiPageSource, /--aube-page-padding-inline: clamp\([^;]+vw[^;]+\);/);
  assert.match(multiPageSource, /--aube-space-section-start: clamp\(32px, 9vw, 40px\);/);
  assert.match(multiPageSource, /--aube-mobile-tab-gap: clamp\([^;]+vw[^;]+\);/);
  assert.doesNotMatch(multiPageSource, /\.aube-table-page \{ padding: 82px 24px 132px; \}/);
  assert.doesNotMatch(multiPageSource, /--aube-space-section-start: 36px;/);
});

test("새 템플릿 간격 규칙은 두 엔진 계약과 고정값 예외를 문서화한다", () => {
  assert.match(contractSource, /data-spacing-contract="canvas-fit"/);
  assert.match(contractSource, /data-spacing-contract="editorial-scroll"/);
  assert.match(contractSource, /data-spacing-contract="mobile-reading"/);
  assert.match(contractSource, /category-title-to-first-item gap \(`1`\)/);
  assert.match(contractSource, /category-to-category gap without a divider \(`2\.6`\)/);
  assert.match(contractSource, /semantic ratios are constants applied exactly once/);
  assert.match(contractSource, /hard safety bounds, one-pixel rules, safe-area offsets, and minimum control or touch sizes/);
});
