import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const globalStylesSource = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

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

test("Loop Bagel renders promotion copy and text chips entirely in Nanum Gothic", () => {
  const promotionFontRules = globalStylesSource.match(
    /\/\* Loop Bagel's promotional copy[\s\S]*?font-family: "Nanum Gothic", "Noto Sans KR", system-ui, sans-serif !important;\s*\}/,
  )?.[0] ?? "";

  assert.match(promotionFontRules, /\.cafe-a-time-sale-time-text/);
  assert.doesNotMatch(promotionFontRules, /\.cafe-a-time-sale-price-block/);
  assert.match(promotionFontRules, /\.cafe-a-time-sale-badge/);
  assert.match(promotionFontRules, /\.cafe-a-menu-badge/);
  assert.match(promotionFontRules, /\.cafe-a-featured-badge/);
  assert.match(promotionFontRules, /\.cafe-a-menu-chip/);
  assert.match(promotionFontRules, /--cafe-a-script-en-font: "Nanum Gothic"/);
});
