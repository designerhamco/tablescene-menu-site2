import assert from "node:assert/strict";
import test from "node:test";

import {
  buildMenuPreviewUrl,
  getMenuPreviewFrame,
  normalizeMenuPreviewDevice,
  normalizeMenuPreviewOrientation,
} from "./menu-preview-devices";

test("preview device normalization defaults unknown values to PC", () => {
  assert.equal(normalizeMenuPreviewDevice(undefined), "pc");
  assert.equal(normalizeMenuPreviewDevice("wide-screen"), "pc");
  assert.equal(normalizeMenuPreviewDevice("tablet"), "tablet");
  assert.equal(normalizeMenuPreviewDevice("mobile"), "mobile");
});

test("preview orientation defaults to portrait and accepts tablet landscape", () => {
  assert.equal(normalizeMenuPreviewOrientation(undefined), "portrait");
  assert.equal(normalizeMenuPreviewOrientation("upside-down"), "portrait");
  assert.equal(normalizeMenuPreviewOrientation("landscape"), "landscape");
});

test("tablet landscape swaps the real iframe viewport dimensions", () => {
  assert.deepEqual(getMenuPreviewFrame("tablet", "portrait"), {
    label: "태블릿",
    width: 820,
    height: 1180,
  });
  assert.deepEqual(getMenuPreviewFrame("tablet", "landscape"), {
    label: "태블릿",
    width: 1180,
    height: 820,
  });
  assert.deepEqual(getMenuPreviewFrame("mobile", "landscape"), {
    label: "모바일",
    width: 390,
    height: 844,
  });
});

test("framed preview URLs preserve only supported preview parameters", () => {
  assert.equal(
    buildMenuPreviewUrl(
      "menu / 한글",
      { lang: "en", page: "2", debugCafeA: "1" },
      { device: "mobile" },
    ),
    "/mypage/menus/menu%20%2F%20%ED%95%9C%EA%B8%80/preview?lang=en&page=2&debugCafeA=1&device=mobile",
  );
});

test("actual previews avoid recursive framing while preserving the return device", () => {
  assert.equal(
    buildMenuPreviewUrl("menu-a", { lang: "ko" }, { actual: true, embedded: true, device: "mobile" }),
    "/mypage/menus/menu-a/preview?lang=ko&device=mobile&view=actual&embedded=1",
  );
  assert.equal(
    buildMenuPreviewUrl("menu-a", {}, { actual: true }),
    "/mypage/menus/menu-a/preview?view=actual",
  );
});

test("preview URLs preserve landscape only for tablet frames", () => {
  assert.equal(
    buildMenuPreviewUrl("menu-a", {}, { device: "tablet", orientation: "landscape" }),
    "/mypage/menus/menu-a/preview?device=tablet&orientation=landscape",
  );
  assert.equal(
    buildMenuPreviewUrl("menu-a", {}, { device: "mobile", orientation: "landscape" }),
    "/mypage/menus/menu-a/preview?device=mobile",
  );
});
