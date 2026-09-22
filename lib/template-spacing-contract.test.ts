import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const cafeSource = readFileSync(
  new URL("../components/menu-templates/CafeDesignA.tsx", import.meta.url),
  "utf8",
);
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

test("단일페이지는 유동 기준 간격에 고정된 역할 비율을 한 번만 적용한다", () => {
  assert.match(cafeSource, /data-spacing-contract="canvas-fit"/);
  assert.match(cafeSource, /stack: "clamp\([^\n]+vmin[^\n]+\)"/);
  assert.match(globalStylesSource, /--cafe-a-page-inline: clamp\([^;]+vw[^;]+\);/);
  assert.match(globalStylesSource, /--cafe-a-item-rhythm-gap: clamp\([^;]+var\(--fit-menu-gap-scale\)[^;]+\);/);
  assert.match(globalStylesSource, /--cafe-a-category-title-to-first-ratio: 1;/);
  assert.match(globalStylesSource, /--cafe-a-category-separation-ratio: 2\.2;/);
  assert.match(globalStylesSource, /data-cafe-a-skin="round_focus"[\s\S]*--cafe-a-category-title-to-first-ratio: 1\.15;[\s\S]*--cafe-a-category-separation-ratio: 2\.8;/);
  assert.match(globalStylesSource, /data-cafe-a-skin="mocha_forest"[\s\S]*cafe-a-menu-item-stack:not\(:last-child\)[\s\S]*padding-bottom: 0;/);
  assert.match(globalStylesSource, /data-cafe-a-widget-placement="bottom"\]:has\(\+ \.cafe-a-footer-info\)[\s\S]*margin-bottom: var\(--cafe-a-category-no-divider-gap\);/);
  assert.match(globalStylesSource, /cafe-a-round-focus-price-leader[\s\S]*radial-gradient\(circle, currentColor 0 1px, transparent 1\.2px\)/);
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
  assert.match(contractSource, /category-title-to-first-item gap \(`1`\)/);
  assert.match(contractSource, /category-to-category gap without a divider \(`2\.2`\)/);
  assert.match(contractSource, /semantic ratios are constants applied exactly once/);
  assert.match(contractSource, /hard safety bounds, one-pixel rules, safe-area offsets, and minimum control or touch sizes/);
});
