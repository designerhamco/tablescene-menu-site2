import assert from "node:assert/strict";
import test from "node:test";
import { getMenuCardVisibility } from "./menu-card-visibility";
import { getSiteChipTone } from "./site-chip";

test("menu visibility distinguishes a withdrawn menu from a pre-publication draft", () => {
  const previousPublication = "2026-11-01T12:00:00Z";
  assert.equal(getMenuCardVisibility("draft", null, false), "before-publish");
  assert.equal(getMenuCardVisibility("draft", previousPublication, false), "private");
  assert.equal(getMenuCardVisibility("unpublished", null, false), "private");
  assert.equal(getMenuCardVisibility("private", null, false), "private");
  assert.equal(getMenuCardVisibility("published", null, true), "published");
  assert.equal(getMenuCardVisibility("published", previousPublication, false), null);
  assert.equal(getMenuCardVisibility(null, null, false), null);
  assert.equal(getSiteChipTone("공개 전"), "draft");
  assert.equal(getSiteChipTone("비공개"), "private");
  assert.equal(getSiteChipTone("공개중"), "active");
});
