import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import MenuPreviewDeviceFrame from "../components/menu/MenuPreviewDeviceFrame";

import {
  buildMenuPreviewUrl,
  buildTemplatePreviewUrl,
  getMenuPreviewFrame,
  MENU_PREVIEW_ORIENTATIONS,
  normalizeMenuPreviewDevice,
  normalizeMenuPreviewOrientation,
  normalizeMenuPreviewPaymentMode,
  shouldUseMenuPreviewDeviceFrame,
} from "./menu-preview-devices";

const previewFrameSource = readFileSync(
  new URL("../components/menu/MenuPreviewDeviceFrame.tsx", import.meta.url),
  "utf8",
);
const previewGuideSource = readFileSync(
  new URL("../components/menu/MenuPreviewGuide.tsx", import.meta.url),
  "utf8",
);
const displayTemplatePreviewSource = readFileSync(
  new URL("../app/templates/[templateKey]/preview/page.tsx", import.meta.url),
  "utf8",
);
const displayTemplateSource = readFileSync(
  new URL("../components/menu-templates/DisplayMenuA.tsx", import.meta.url),
  "utf8",
);

test("Display preview opens at its real screen size without device frames", () => {
  assert.equal(shouldUseMenuPreviewDeviceFrame("display_menu_a"), false);
  assert.equal(shouldUseMenuPreviewDeviceFrame("cafe_design_a"), true);
  assert.equal(shouldUseMenuPreviewDeviceFrame("dining_aube_table_a"), true);
});

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
  assert.doesNotMatch(html, /메뉴판 목록/);
  assert.doesNotMatch(html, /새 창에서 실제 크기 보기/);
  assert.doesNotMatch(html, /1440 × 900/);
  assert.match(html, /기기 선택 도구 열기/);
});

test("first preview guide uses anchored coachmarks and applies hide-today only through checkbox plus close", () => {
  assert.match(previewFrameSource, /<MenuPreviewGuide device=\{device\} \/>/);
  assert.match(previewGuideSource, /GuideDeviceSelector/);
  assert.match(previewGuideSource, /BrowserZoomGuide/);
  assert.match(previewGuideSource, /PC·태블릿·모바일 버튼을 눌러/);
  assert.match(previewGuideSource, /브라우저의 더보기\(···\)에서/);
  assert.match(previewGuideSource, /type="checkbox"/);
  assert.match(previewGuideSource, /checked=\{hideTodayChecked\}/);
  assert.match(previewGuideSource, /if \(hideTodayChecked\) \{[\s\S]*localStorage\.setItem\(PREVIEW_GUIDE_DATE_KEY/);
  assert.match(previewGuideSource, /오늘 하루 보지 않기/);
  assert.match(previewGuideSource, />닫기</);
  assert.doesNotMatch(previewGuideSource, /미리보기 시작/);
  assert.match(previewGuideSource, /aria-modal="true"/);
});

test("browser guide uses a round profile without guest text or an address pill", () => {
  assert.match(previewGuideSource, /CircleUserRound/);
  assert.doesNotMatch(previewGuideSource, /게스트/);
  assert.doesNotMatch(previewGuideSource, /h-7 flex-1 rounded-full/);
});

test("display preview shows only the browser zoom guide and reveals pagination near the bottom", () => {
  assert.match(
    displayTemplatePreviewSource,
    /templateKey === "display_menu_a" && !isActualView \? <MenuPreviewGuide variant="display" \/>/,
  );
  assert.match(previewGuideSource, /data-preview-guide-variant=\{variant\}/);
  assert.match(previewGuideSource, /!isDisplayGuide \? \([\s\S]*<GuideDeviceSelector/);
  assert.match(displayTemplateSource, /clientY >= window\.innerHeight \* 0\.82/);
  assert.match(displayTemplateSource, /data-display-preview-pagination=""/);
  assert.match(displayTemplateSource, /onPointerLeave=\{displayControls\.hide\}/);
});

test("collapsed device selector uses the centered dark horizontal pill", () => {
  assert.match(previewFrameSource, /w-\[min\(13rem,calc\(100vw-2rem\)\)\]/);
  assert.match(previewFrameSource, /rounded-b-\[1\.35rem\]/);
  assert.match(previewFrameSource, /bg-zinc-950\/88/);
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

test("template previews open in device frames without carrying recursive frame parameters", () => {
  assert.equal(
    buildTemplatePreviewUrl(
      "cafe_sunday_line_a",
      { lang: "en", copyQa: "long", device: "mobile", view: "actual" },
      { device: "tablet", orientation: "portrait" },
    ),
    "/templates/cafe_sunday_line_a/preview?copyQa=long&lang=en&device=tablet&orientation=portrait",
  );
  assert.equal(
    buildTemplatePreviewUrl("dining_aube_table_a", {}, { device: "pc", actual: true, embedded: true }),
    "/templates/dining_aube_table_a/preview?device=pc&view=actual&embedded=1",
  );
});
