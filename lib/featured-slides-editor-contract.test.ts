import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const editorSource = readFileSync(
  new URL("../components/mypage/menu-editor/FeaturedSlidesEditor.tsx", import.meta.url),
  "utf8",
);

test("representative images and products use separate editor areas", () => {
  assert.match(editorSource, /data-featured-image-editor=""/);
  assert.match(editorSource, /data-featured-product-editor=""/);
  assert.match(editorSource, /<h3[^>]*>대표 이미지<\/h3>/);
  assert.match(editorSource, /<h3[^>]*>대표 상품<\/h3>/);
  assert.match(editorSource, /상품 정보 없이 이미지로만 표시/);
});

test("representative image editor keeps the five-slide limit", () => {
  assert.match(editorSource, /slides\.slice\(0, 5\)/);
  assert.match(editorSource, /Math\.min\(5, Math\.trunc\(maxSlides\)\)/);
  assert.match(editorSource, /대표 이미지는 최대 \{effectiveMaxSlides\}개까지 등록할 수 있습니다/);
});
