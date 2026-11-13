import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync } from "node:fs";
import { catalogDesigns, getCatalogDesign } from "./catalog-designs";
import { getPublicTemplateDetail, getTemplateDetailInfo } from "./template-details";

const mellow = getCatalogDesign("cafe_mocha_forest_a")!;

test("catalog and detail share actual ordered images with a canonical first image", () => {
  assert.equal(mellow.images.length, 4);
  assert.deepEqual(mellow.images.map(image => image.label), ["매장 외관", "모바일 QR 메뉴", "태블릿 스탠드", "PC 메뉴 모니터"]);
  for (const design of catalogDesigns) {
    assert.ok(design.images.length);
    assert.equal(design.image, design.images[0].src);
    assert.equal(new Set(design.images.map(image => image.src)).size, design.images.length);
    for (const image of design.images) assert.ok(existsSync(`public${image.src}`), image.src);
    const detail = getPublicTemplateDetail(design.id);
    if (detail) assert.deepEqual(getTemplateDetailInfo(detail).images, design.images);
  }
});

test("media tools have guarded states, focus contrast and shared typography", () => {
  const css = readFileSync("styles/ui-system.css", "utf8");
  assert.match(css, /\.site-button-media:is\(:hover, \[data-ui-state="hover"\]\):not\(:disabled\):not\(\[aria-disabled="true"\]\)/);
  assert.match(css, /\.site-button-media:is\(:active, \[data-ui-state="pressed"\]\):not\(:disabled\):not\(\[aria-disabled="true"\]\)/);
  assert.match(css, /\.site-image-carousel-arrows \{[^}]*display: none/);
  assert.match(css, /@media \(min-width: 768px\) \{ \.site-image-carousel-arrows \{ display: flex/);
  assert.match(css, /filter: drop-shadow\(var\(--ui-media-arrow-shadow\)\)/);
});
