import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import MenuPreviewDeviceFrame from "../components/menu/MenuPreviewDeviceFrame";

import {
  buildMenuPreviewUrl,
  getMenuPreviewFrame,
  MENU_PREVIEW_ORIENTATIONS,
  normalizeMenuPreviewDevice,
  normalizeMenuPreviewOrientation,
  normalizeMenuPreviewPaymentMode,
} from "./menu-preview-devices";

test("preview device normalization defaults unknown values to PC", () => {
  assert.equal(normalizeMenuPreviewDevice(undefined), "pc");
  assert.equal(normalizeMenuPreviewDevice("wide-screen"), "pc");
  assert.equal(normalizeMenuPreviewDevice("tablet"), "tablet");
  assert.equal(normalizeMenuPreviewDevice("mobile"), "mobile");
});

test("preview orientation defaults to landscape and accepts explicit portrait", () => {
  assert.deepEqual(Object.keys(MENU_PREVIEW_ORIENTATIONS), ["landscape", "portrait"]);
  assert.equal(normalizeMenuPreviewOrientation(undefined), "landscape");
  assert.equal(normalizeMenuPreviewOrientation("upside-down"), "landscape");
  assert.equal(normalizeMenuPreviewOrientation("portrait"), "portrait");
  assert.equal(normalizeMenuPreviewOrientation("landscape"), "landscape");
});

test("mobile payment preview defaults off and accepts explicit opt-in", () => {
  assert.equal(normalizeMenuPreviewPaymentMode(undefined), "off");
  assert.equal(normalizeMenuPreviewPaymentMode("on"), "on");
  assert.equal(normalizeMenuPreviewPaymentMode("enabled"), "off");
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

test("preview selector renders labeled PC, tablet, and mobile device icons", () => {
  const html = renderToStaticMarkup(createElement(MenuPreviewDeviceFrame, {
    device: "pc",
    orientation: "landscape",
    menuId: "4f7be4a1-90db-4e1f-987d-e91385f0bf91",
    query: {},
  }));

  assert.match(html, /aria-label="미리보기 기기 선택"/);
  assert.match(html, /lucide-monitor/);
  assert.match(html, /lucide-tablet/);
  assert.match(html, /lucide-smartphone/);
  assert.match(html, />PC</);
  assert.match(html, />태블릿</);
  assert.match(html, />모바일</);
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
  assert.equal(
    buildMenuPreviewUrl("menu-a", {}, { device: "tablet", orientation: "portrait" }),
    "/mypage/menus/menu-a/preview?device=tablet&orientation=portrait",
  );
});

test("preview URLs preserve PG opt-in only for mobile frames", () => {
  assert.equal(
    buildMenuPreviewUrl("menu-a", {}, { device: "mobile", paymentMode: "on" }),
    "/mypage/menus/menu-a/preview?device=mobile&payment=on",
  );
  assert.equal(
    buildMenuPreviewUrl("menu-a", {}, { device: "mobile", paymentMode: "off" }),
    "/mypage/menus/menu-a/preview?device=mobile",
  );
  assert.equal(
    buildMenuPreviewUrl("menu-a", {}, { device: "pc", paymentMode: "on" }),
    "/mypage/menus/menu-a/preview?device=pc",
  );
});
