import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import MenuPreviewDeviceFrame from "../components/menu/MenuPreviewDeviceFrame";

import {
  buildMenuPreviewUrl,
  buildTemplatePreviewUrl,
  DEFAULT_MENU_PREVIEW_DEVICE,
  DEFAULT_MENU_PREVIEW_ZOOM,
  getMenuPreviewFrame,
  MENU_PREVIEW_DEVICE_ORDER,
  MENU_PREVIEW_ORIENTATIONS,
  MENU_PREVIEW_ZOOM_LEVELS,
  normalizeMenuPreviewDevice,
  normalizeMenuPreviewOrientation,
  normalizeMenuPreviewPaymentMode,
  normalizeMenuPreviewZoom,
  shouldUseMenuPreviewDeviceFrame,
  stepMenuPreviewZoom,
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
const menuPreviewSource = readFileSync(
  new URL("../app/mypage/menus/[menuId]/preview/page.tsx", import.meta.url),
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

test("preview device normalization defaults to tablet and supports a display-only PC fallback", () => {
  assert.equal(DEFAULT_MENU_PREVIEW_DEVICE, "tablet");
  assert.equal(normalizeMenuPreviewDevice(undefined), "tablet");
  assert.equal(normalizeMenuPreviewDevice("wide-screen"), "tablet");
  assert.equal(normalizeMenuPreviewDevice(undefined, "pc"), "pc");
  assert.equal(normalizeMenuPreviewDevice("wide-screen", "pc"), "pc");
  assert.equal(normalizeMenuPreviewDevice("pc"), "pc");
  assert.equal(normalizeMenuPreviewDevice("tablet"), "tablet");
  assert.equal(normalizeMenuPreviewDevice("mobile"), "mobile");
});

test("preview selectors order tablet before PC and mobile while display previews keep a PC fallback", () => {
  assert.deepEqual(MENU_PREVIEW_DEVICE_ORDER, ["tablet", "pc", "mobile"]);
  assert.match(displayTemplatePreviewSource, /usesDevicePreviewFrame \? "tablet" : "pc"/);
  assert.match(menuPreviewSource, /usesDevicePreviewFrame \? "tablet" : "pc"/);
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

test("preview zoom uses bounded browser-like steps and a 100 percent reset", () => {
  assert.deepEqual(MENU_PREVIEW_ZOOM_LEVELS, [75, 90, 100, 110, 125]);
  assert.equal(DEFAULT_MENU_PREVIEW_ZOOM, 100);
  assert.equal(normalizeMenuPreviewZoom("110"), 110);
  assert.equal(normalizeMenuPreviewZoom("115"), 100);
  assert.equal(stepMenuPreviewZoom(100, -1), 90);
  assert.equal(stepMenuPreviewZoom(100, 1), 110);
  assert.equal(stepMenuPreviewZoom(75, -1), 75);
  assert.equal(stepMenuPreviewZoom(125, 1), 125);
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
  assert.ok(html.indexOf("태블릿") < html.indexOf(">PC<"));
  assert.ok(html.indexOf(">PC<") < html.indexOf("모바일"));
  assert.doesNotMatch(html, /메뉴판 목록/);
  assert.doesNotMatch(html, /새 창에서 실제 크기 보기/);
  assert.doesNotMatch(html, /1440 × 900/);
  assert.match(html, /기기 선택 도구 닫기/);
  assert.match(html, /aria-expanded="true"/);
  assert.match(html, /aria-label="메뉴판 확대·축소"/);
  assert.match(html, /aria-label="메뉴판 축소"/);
  assert.match(html, /aria-label="메뉴판 확대"/);
  assert.match(html, />100%<\/button>/);
  assert.match(html, /data-preview-zoom-percent="100"/);
  assert.match(html, /transform:scale\(1\)/);
  assert.doesNotMatch(html, /tabindex="0"/);
});

test("scrollable tablet and mobile preview frames are keyboard focusable", () => {
  for (const device of ["tablet", "mobile"] as const) {
    const html = renderToStaticMarkup(createElement(MenuPreviewDeviceFrame, {
      device,
      orientation: "landscape",
      menuId: "4f7be4a1-90db-4e1f-987d-e91385f0bf91",
      query: {},
    }));

    assert.match(html, /tabindex="0"/);
  }
});

test("first preview guide uses anchored coachmarks and applies hide-today only through checkbox plus close", () => {
  assert.match(previewFrameSource, /<MenuPreviewGuide device=\{device\} \/>/);
  assert.match(previewGuideSource, /GuideDeviceSelector/);
  assert.match(previewGuideSource, /<BrowserZoomGuide \/>/);
  assert.match(previewGuideSource, /태블릿·PC·모바일 버튼을 눌러/);
  assert.match(previewGuideSource, /브라우저의 더보기\(···\)에서/);
  assert.match(previewGuideSource, /device = "tablet"/);
  assert.match(previewGuideSource, /type="checkbox"/);
  assert.match(previewGuideSource, /checked=\{hideTodayChecked\}/);
  assert.match(previewGuideSource, /if \(hideTodayChecked\) \{[\s\S]*localStorage\.setItem\(PREVIEW_GUIDE_DATE_KEY/);
  assert.match(previewGuideSource, /오늘 하루 보지 않기/);
  assert.match(previewGuideSource, />닫기</);
  assert.doesNotMatch(previewGuideSource, /미리보기 시작/);
  assert.match(previewGuideSource, /aria-modal="true"/);
});

test("browser guide uses a filled round profile and restores the address pill without guest text", () => {
  assert.doesNotMatch(previewGuideSource, /UserRound/);
  assert.match(previewGuideSource, /data-preview-guide-profile=""/);
  assert.match(previewGuideSource, /data-preview-guide-profile-icon=""/);
  assert.match(previewGuideSource, /rounded-full bg-zinc-300/);
  assert.match(previewGuideSource, /className="h-5 w-5 text-zinc-100"/);
  assert.doesNotMatch(previewGuideSource, /bg-gradient-to-b from-zinc-400 to-zinc-500/);
  assert.match(previewGuideSource, /text-zinc-100/);
  assert.match(previewGuideSource, /<circle[^>]*fill="currentColor"/);
  assert.match(previewGuideSource, /<path[^>]*fill="currentColor"/);
  assert.match(previewGuideSource, /h-8 min-w-0 flex-1 rounded-full/);
  assert.doesNotMatch(previewGuideSource, /게스트/);
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

test("device selector is open by default and collapses upward while preserving the full toolbar width", () => {
  assert.match(previewFrameSource, /useState\(true\)/);
  assert.doesNotMatch(previewFrameSource, /onMouseEnter=/);
  assert.doesNotMatch(previewFrameSource, /onMouseLeave=/);
  assert.match(previewFrameSource, /data-preview-device-toolbar=""/);
  assert.match(previewFrameSource, /data-preview-device-toolbar-content=""/);
  assert.match(previewFrameSource, /pointer-events-none opacity-0/);
  assert.match(previewFrameSource, /tabIndex=\{showToolbar \? undefined : -1\}/);
  assert.match(previewFrameSource, /w-\[min\(27rem,calc\(100vw-1\.5rem\)\)\]/);
  assert.match(previewFrameSource, /translateY\(calc\(-100% \+ 1\.75rem\)\)/);
  assert.match(previewFrameSource, /transition-transform duration-300 ease-out/);
  assert.match(previewFrameSource, /RotateCwSquare/);
  assert.match(previewFrameSource, /data-preview-tablet-orientation-toggle=""/);
  assert.match(previewFrameSource, /orientation === "landscape" \? "portrait" : "landscape"/);
  assert.match(previewFrameSource, /태블릿을 \$\{MENU_PREVIEW_ORIENTATIONS\[nextTabletOrientation\]\}로 회전/);
  assert.doesNotMatch(previewFrameSource, /태블릿 방향 선택/);
  assert.match(previewFrameSource, /flex w-full items-center gap-1\.5 pl-1 pr-10/);
  assert.match(previewFrameSource, /bg-zinc-950\/48/);
  assert.match(previewFrameSource, /backdrop-blur-\[2px\]/);
  assert.doesNotMatch(previewFrameSource, /flex w-full flex-col items-center/);
  assert.doesNotMatch(previewFrameSource, /backdrop-blur-xl/);
  assert.doesNotMatch(previewFrameSource, /border-l border-white\/20 pl-2/);
  assert.equal((previewFrameSource.match(/bg-zinc-950\/48/g) ?? []).length, 1);
  assert.match(previewFrameSource, /data-preview-zoom-controls=""/);
  assert.match(previewFrameSource, /zoomedIframeSize/);
  assert.match(previewFrameSource, /transform: `scale\(\$\{previewScale\}\)`/);
  assert.match(previewFrameSource, /transformOrigin: "left top"/);
  assert.match(previewFrameSource, /sessionStorage\.setItem\(`\$\{PREVIEW_ZOOM_STORAGE_PREFIX\}\$\{device\}`/);
});

test("hide-today checkbox is plain text control without a boxed container", () => {
  assert.match(previewGuideSource, /<label className="inline-flex cursor-pointer items-center justify-center gap-2 px-2 py-3 text-sm font-bold text-white">/);
  assert.doesNotMatch(previewGuideSource, /<label className="[^"]*(?:rounded-xl|border-white\/30|bg-zinc-950\/35)/);
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
    "/templates/cafe_sunday_roasters_a/preview?copyQa=long&lang=en&device=tablet&orientation=portrait",
  );
  assert.equal(
    buildTemplatePreviewUrl("dining_aube_table_a", {}, { device: "pc", actual: true, embedded: true }),
    "/templates/dining_aube_table_a/preview?device=pc&view=actual&embedded=1",
  );
});
