import assert from "node:assert/strict";
import test from "node:test";

import { buildMenuPreviewUrl, normalizeMenuPreviewDevice } from "./menu-preview-devices";

test("preview device normalization defaults unknown values to PC", () => {
  assert.equal(normalizeMenuPreviewDevice(undefined), "pc");
  assert.equal(normalizeMenuPreviewDevice("wide-screen"), "pc");
  assert.equal(normalizeMenuPreviewDevice("tablet"), "tablet");
  assert.equal(normalizeMenuPreviewDevice("mobile"), "mobile");
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
