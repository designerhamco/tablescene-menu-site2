import test from "node:test";
import assert from "node:assert/strict";
import { readMenuPopupSettings, nextMenuPopupMidnight, menuPopupSuppressionKey, validateMenuPopupImage } from "./menu-popup";
import { DEFAULT_DESIGN_REVIEWS } from "./menu-design-policy";
import { getDefaultDesignOptions } from "./default-design-options";
import { buildTemplatePreviewUrl } from "./menu-preview-devices";

test("popup defaults OFF and rejects invalid image schemes and malformed settings", () => {
  assert.deepEqual(readMenuPopupSettings(null), { enabled: false, images: [] });
  const settings = readMenuPopupSettings({ advertisementPopup: { enabled: true, images: [{ imageUrl: "javascript:alert(1)" }, { imageUrl: "//bad.test/x" }, { imageUrl: "/placeholders/test.svg" }] } });
  assert.equal(settings.images.length, 1);
  assert.equal(settings.images[0].imagePath, null);
});
test("popup reads one to three images and never renders more than three", () => {
  for (const count of [1, 2, 3, 4]) assert.equal(readMenuPopupSettings({ advertisementPopup: { images: Array.from({ length: count }, (_, n) => ({ imageUrl: `https://example.com/${n}.png` })) } }).images.length, Math.min(3, count));
});
test("today dismissal ends at Korean midnight, including month/year rollover", () => {
  for (const [now, end] of [["2026-10-20T14:59:59.000Z", "2026-10-20T15:00:00.000Z"], ["2026-10-20T15:00:00.000Z", "2026-10-21T15:00:00.000Z"], ["2026-12-31T14:00:00.000Z", "2026-12-31T15:00:00.000Z"]]) assert.equal(new Date(nextMenuPopupMidnight(Date.parse(now))).toISOString(), end);
  assert.notEqual(menuPopupSuppressionKey("one"), menuPopupSuppressionKey("two"));
});
test("popup save accepts only matching Storage URLs owned by this menu", () => {
  const imagePath = "menu-sites/menu-one/draft/popup/abc-123.webp";
  const imageUrl = `https://storage.example.com/storage/v1/object/public/menu-images/${imagePath}?v=123`;
  assert.ok(validateMenuPopupImage({ imageUrl, imagePath }, "menu-one", "https://storage.example.com"));
  for (const candidate of [
    { imagePath, imageUrl: imageUrl.replace("storage.example.com", "attacker.test") },
    { imagePath, imageUrl: imageUrl.replace("menu-one", "menu-two") },
    { imagePath: imagePath.replace("menu-one", "menu-two"), imageUrl },
    { imagePath: "menu-sites/menu-one/draft/popup/../../other.webp", imageUrl },
    { imagePath: null, imageUrl },
  ]) assert.equal(validateMenuPopupImage(candidate, "menu-one", "https://storage.example.com"), false);
});
test("four album reviews share existing structures while all previews default popup OFF", () => {
  const albums = DEFAULT_DESIGN_REVIEWS.filter(design => design.itemLayout === "album");
  assert.equal(albums.length, 4);
  assert.equal(DEFAULT_DESIGN_REVIEWS.filter(design => design.itemLayout === "list").length, 6);
  for (const design of DEFAULT_DESIGN_REVIEWS) {
    assert.equal(getDefaultDesignOptions({ design: design.id }).popupPreview, false);
    const url = new URL(buildTemplatePreviewUrl(design.renderer, { design: design.id, popupPreview: "on" }, { device: "mobile", actual: true }), "https://example.com");
    assert.equal(url.searchParams.get("popupPreview"), "on");
    assert.equal(url.searchParams.get("design"), design.id);
  }
});
