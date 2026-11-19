import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { getMenuPatternBands, isMenuPatternBandPath, menuPatternBandRenderProps, resolveMenuPatternBands, supportsMenuPatternBands } from "./menu-pattern-bands";
import { prepareMenuPatternBandImage } from "./menu-pattern-band-upload";
import { buildMenuPreviewUrl } from "./menu-preview-devices";

const imagePath = "menu-sites/demo/draft/pattern-bands/f31efd05-4936-4887-8ae1-e6b34a109b34.webp";
const image = { imagePath, imageUrl: `https://example.test/storage/v1/object/public/menu-images/${imagePath}` };
const patternBands = { enabled: true, thickness: 28, image };
const saved = { design: { patternBands } };

test("one-page Basic list and album share uploaded bands, and unsupported layouts skip saved bands", () => {
  for (const design of ["basic-first-column", "basic-top-row-left-logo", "basic-first-column-album", "basic-top-row-album"]) {
    const settings = { menu_design_id: design };
    assert.deepEqual(resolveMenuPatternBands("cafe_design_a", settings, saved), patternBands);
    assert.equal(menuPatternBandRenderProps("cafe_design_a", settings, saved).style["--menu-pattern-band-size"], "1.75rem");
  }
  assert.equal(resolveMenuPatternBands("cafe_design_a", { menu_design_id: "basic-upper-left" }, saved), undefined);
  assert.equal(resolveMenuPatternBands("restaurant_onue_a", {}, saved), undefined);
  assert.equal(resolveMenuPatternBands("cafe_design_a", {}, saved, "multi"), undefined);
  assert.equal(supportsMenuPatternBands("dining_aube_table_a", {}), false);
});

test("the Loop Bagel checker is responsive by default and survives image removal", () => {
  assert.equal(menuPatternBandRenderProps("fast_food_loop_bagel_a", {}, {}).kind, "checker");
  assert.equal(menuPatternBandRenderProps("fast_food_loop_bagel_a", {}, {}).style["--menu-pattern-band-size"], undefined);
  assert.equal(menuPatternBandRenderProps("fast_food_loop_bagel_a", {}, saved).kind, "image");
  assert.equal(resolveMenuPatternBands("fast_food_loop_bagel_a", {}, { design: { patternBands: { enabled: false } } }), undefined);
  assert.equal(getMenuPatternBands("cafe_design_a", {}).enabled, false);
  assert.equal(isMenuPatternBandPath(imagePath, "demo"), true);
  assert.equal(isMenuPatternBandPath(imagePath, "different-menu"), false);
});

test("saved preview only propagates temporary hiding and no catalog design edits", () => {
  const url = buildMenuPreviewUrl("demo", { patternBandsPreview: "off", designPreview: '{"pageBackground":"#007711"}' }, { device: "mobile" });
  assert.match(url, /patternBandsPreview=off/);
  assert.doesNotMatch(url, /designPreview=/);
  assert.doesNotMatch(buildMenuPreviewUrl("demo", { patternBandsPreview: "on" }), /patternBandsPreview=/);
});

test("upload normalizes true square raster tiles and rejects rectangles and invalid bytes", async () => {
  const png = (width: number, height: number) => sharp({
    create: { width, height, channels: 4, background: "#81CD64" },
  }).png().toBuffer();
  const square = await prepareMenuPatternBandImage(Uint8Array.from(await png(600, 600)).buffer);
  assert.ok(square);
  const { format, width, height } = await sharp(square).metadata();
  assert.deepEqual({ format, width, height }, { format: "webp", width: 512, height: 512 });
  assert.equal(await prepareMenuPatternBandImage(Uint8Array.from(await png(40, 20)).buffer), null);
  assert.equal(await prepareMenuPatternBandImage(new ArrayBuffer(3)), null);
});
