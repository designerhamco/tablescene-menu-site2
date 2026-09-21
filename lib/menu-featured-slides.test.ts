import assert from "node:assert/strict";
import test from "node:test";

import { buildPublicFeaturedSlides } from "./menu-featured-slides";

const imageSlide = {
  id: "slide-1",
  image_url: "/images/cover.jpg",
  image_path: null,
  featured_item_id: "item-1",
  sort_order: 0,
};

test("keeps a featured image visible when product information is disabled", () => {
  const slides = buildPublicFeaturedSlides({
    templateKey: "cafe_design_a",
    featuredItemEnabled: false,
    featuredSlides: [imageSlide],
    legacyCoverImageUrl: null,
    legacyFeaturedItemId: null,
    items: [{ id: "item-1", visible: true }],
  });

  assert.deepEqual(slides, [{ id: "slide-1", imageUrl: "/images/cover.jpg", featuredItemId: null, sortOrder: 0 }]);
});

test("links visible product information only when the display option is enabled", () => {
  const slides = buildPublicFeaturedSlides({
    templateKey: "cafe_mocha_forest_a",
    featuredItemEnabled: true,
    featuredSlides: [imageSlide],
    legacyCoverImageUrl: null,
    legacyFeaturedItemId: null,
    items: [{ id: "item-1", visible: true }],
  });

  assert.equal(slides[0]?.featuredItemId, "item-1");
});

test("keeps the image and drops an unavailable product reference", () => {
  const slides = buildPublicFeaturedSlides({
    templateKey: "cafe_sunday_line_a",
    featuredItemEnabled: true,
    featuredSlides: [imageSlide],
    legacyCoverImageUrl: null,
    legacyFeaturedItemId: null,
    items: [{ id: "item-1", visible: false }],
  });

  assert.equal(slides[0]?.imageUrl, "/images/cover.jpg");
  assert.equal(slides[0]?.featuredItemId, null);
});

test("does not publish a slide without an image", () => {
  const slides = buildPublicFeaturedSlides({
    templateKey: "cafe_round_focus_a",
    featuredItemEnabled: true,
    featuredSlides: [{ ...imageSlide, image_url: null }],
    legacyCoverImageUrl: null,
    legacyFeaturedItemId: null,
    items: [{ id: "item-1", visible: true }],
  });

  assert.deepEqual(slides, []);
});
