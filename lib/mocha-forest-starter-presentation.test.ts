import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { getStarterPreset } from "./menu-starter-presets";
import { getCustomTypographySettings, mergeTypographySettings } from "./template-typography-presets";

const globalStylesSource = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const cafeSource = readFileSync(
  new URL("../components/menu-templates/CafeDesignA.tsx", import.meta.url),
  "utf8",
);

test("Mocha Forest starter uses Pretendard and Lemon", () => {
  const preset = getStarterPreset("cafe_mocha_forest_a");
  const typography = mergeTypographySettings(
    preset.template_key,
    getCustomTypographySettings(preset.site.settings),
  );

  assert.equal(typography.korean_font_key, "pretendard");
  assert.equal(typography.english_font_key, "lemon");
});

test("Cafe A notices stay on Pretendard even when starter fonts change", () => {
  assert.match(
    globalStylesSource,
    /\.cafe-a-typography :is\([\s\S]*?\.brew-chapter-cover-notices[\s\S]*?--cafe-a-script-ko-font: "Pretendard";[\s\S]*?--cafe-a-script-en-font: "Pretendard";[\s\S]*?font-family: "Pretendard", system-ui, sans-serif;/,
  );
  assert.match(cafeSource, /const noticeFontAssets = getKoreanFontLoadAssets\("pretendard"\);/);
  assert.match(cafeSource, /assets=\{\[koreanFontAssets, englishFontAssets, noticeFontAssets, \.\.\.roleFontAssets\]\}/);
});

test("Mocha Forest widens category rhythm off mobile and enlarges only the mobile category role", () => {
  assert.match(
    globalStylesSource,
    /data-preview-device="tablet"\] \{\s*--cafe-a-category-title-to-first-ratio: 1\.2;/,
  );
  assert.match(
    globalStylesSource,
    /data-preview-device="mobile"\] \{\s*--cafe-a-sunday-category-ratio: 1\.44;/,
  );
  assert.match(
    globalStylesSource,
    /@media \(min-width: 768px\)[\s\S]*?cafe_mocha_forest_a[\s\S]*?not\(\[data-preview-device="mobile"\]\)[\s\S]*?--cafe-a-category-title-to-first-ratio: 1\.2;/,
  );
});

test("Mocha Forest slightly reduces the linked supporting copy off mobile", () => {
  assert.match(
    globalStylesSource,
    /data-template-key="cafe_mocha_forest_a"\]\[data-cafe-a-skin="mocha_forest"\]:is\([\s\S]*data-preview-device="pc"[\s\S]*data-preview-device="tablet"[\s\S]*--cafe-a-template-supporting-copy-scale: 0\.96;/,
  );
  assert.match(
    globalStylesSource,
    /@media \(min-width: 768px\) \{[\s\S]*data-template-key="cafe_mocha_forest_a"\]\[data-cafe-a-skin="mocha_forest"\]:not\(\[data-preview-device\]\)[\s\S]*--cafe-a-template-supporting-copy-scale: 0\.96;/,
  );
  assert.match(
    globalStylesSource,
    /:is\(\s*\.cafe-a-menu-description,[\s\S]*\[data-cafe-a-widget-body\],[\s\S]*\.cafe-a-store-description,[\s\S]*\.cafe-a-description-text,[\s\S]*\.cafe-a-time-sale-time-text[\s\S]*var\(--cafe-a-template-supporting-copy-scale\)/,
  );
  assert.match(
    globalStylesSource,
    /data-cafe-a-skin="mocha_forest"\] \{[\s\S]*--cafe-a-template-supporting-copy-scale: 1;/,
  );
});
