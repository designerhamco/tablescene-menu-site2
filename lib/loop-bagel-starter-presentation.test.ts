import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const globalStylesSource = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const templateSource = readFileSync(new URL("../components/menu-templates/CafeDesignA.tsx", import.meta.url), "utf8");
const canvasBrandSource = readFileSync(new URL("../components/menu-templates/shared/CanvasBrandTitle.tsx", import.meta.url), "utf8");

test("Loop Bagel caps only the sparse PC canvas while retaining adaptive fill", () => {
  assert.match(
    globalStylesSource,
    /data-cafe-a-adaptive-fit="true"\]\[data-template-key="fast_food_loop_bagel_a"\]\[data-preview-device="pc"\] \{\s*--cafe-a-linked-item-name-ceiling: 1\.25rem;/,
  );
  assert.match(
    globalStylesSource,
    /@media \(min-width: 1024px\) \{[\s\S]*?data-cafe-a-adaptive-fit="true"\]\[data-template-key="fast_food_loop_bagel_a"\]:not\(\[data-preview-device\]\) \{\s*--cafe-a-linked-item-name-ceiling: 1\.25rem;/,
  );
  assert.doesNotMatch(
    globalStylesSource,
    /data-template-key="fast_food_loop_bagel_a"\]\[data-preview-device="tablet"\][^}]*--cafe-a-linked-item-name-ceiling/,
  );
  assert.doesNotMatch(templateSource, /fast_food_loop_bagel_a[^\n]*ceilingScale/);
  assert.match(canvasBrandSource, /device === "pc" && layout === "brand-column" \? 0\.65 : 0/);
  assert.match(canvasBrandSource, /device === "pc" && layout === "brand-column"[\s\S]*?widthRatio: 1/);
  assert.match(canvasBrandSource, /device === "pc" && layout === "horizontal-header" \? CANVAS_PC_HEADER_BRAND_CEILING_SCALE : 1/);
});

test("Loop Bagel reduces non-heading type only on PC and tablet", () => {
  assert.match(
    globalStylesSource,
    /data-template-key="fast_food_loop_bagel_a"\]:is\(\s*\[data-preview-device="pc"\],\s*\[data-preview-device="tablet"\]\s*\) \{\s*--cafe-a-loop-non-heading-type-scale: 0\.85;/,
  );
  assert.match(
    globalStylesSource,
    /@media \(min-width: 768px\) \{[\s\S]*?data-template-key="fast_food_loop_bagel_a"\]:not\(\[data-preview-device\]\) \{\s*--cafe-a-loop-non-heading-type-scale: 0\.85;/,
  );
  const mobileBaseRule = globalStylesSource.match(
    /\.cafe-a-typography\[data-template-key="fast_food_loop_bagel_a"\] \{[^}]*\}/,
  )?.[0] ?? "";
  assert.doesNotMatch(mobileBaseRule, /--cafe-a-loop-non-heading-type-scale/);
});

test("Loop Bagel applies the responsive scale to menu and featured roles without scaling headings", () => {
  assert.match(
    globalStylesSource,
    /data-preview-device="tablet"\][\s\S]*?\.cafe-a-cover-hero \.cafe-a-featured-title \{\s*font-size:[^;}]*--fit-menu-wrap-scale[^;}]*--cafe-a-loop-non-heading-type-scale/,
  );
  assert.match(
    globalStylesSource,
    /data-preview-device="tablet"\][\s\S]*?\.cafe-a-cover-hero \.cafe-a-featured-price \{\s*font-size:[^;}]*--cafe-a-loop-non-heading-type-scale/,
  );
  assert.match(
    globalStylesSource,
    /:is\(\.cafe-a-menu-description, \.cafe-a-time-sale-time-text\),[^{}]*\.cafe-a-featured-description \{\s*font-size:[^;}]*--fit-menu-wrap-scale[^;}]*--cafe-a-loop-non-heading-type-scale/,
  );

  const loopScopedRules = globalStylesSource.match(
    /\.cafe-a-typography\[data-template-key="fast_food_loop_bagel_a"\]:is\([\s\S]*?\/\* Keep tablet headings stable/,
  )?.[0] ?? "";
  assert.doesNotMatch(loopScopedRules, /\.cafe-a-category-title[^}]*--cafe-a-loop-non-heading-type-scale/);
  assert.doesNotMatch(loopScopedRules, /\.cafe-a-store-title[^}]*--cafe-a-loop-non-heading-type-scale/);
});

test("Loop Bagel legacy promotion rules follow the saved Korean font", () => {
  const promotionFontRules = globalStylesSource.match(
    /\/\* Loop Bagel's legacy supporting copy[\s\S]*?font-family: var\(--menu-font-ko\), system-ui, sans-serif !important;\s*\}/,
  )?.[0] ?? "";

  assert.match(promotionFontRules, /\.cafe-a-time-sale-time-text/);
  assert.doesNotMatch(promotionFontRules, /\.cafe-a-time-sale-price-block/);
  assert.match(promotionFontRules, /\.cafe-a-time-sale-badge/);
  assert.match(promotionFontRules, /\.cafe-a-menu-badge/);
  assert.match(promotionFontRules, /\.cafe-a-featured-badge/);
  assert.match(promotionFontRules, /\.cafe-a-menu-chip/);
  assert.match(promotionFontRules, /--cafe-a-script-en-font: var\(--menu-font-ko\)/);
});
