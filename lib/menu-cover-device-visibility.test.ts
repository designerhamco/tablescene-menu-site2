import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  getMenuCoverResponsiveVisibilityClassName,
  isMenuCoverVisibleOnDevice,
} from "./menu-cover-device-visibility";
import { mergePageSettings } from "../types/menu";

const editorSource = readFileSync(
  new URL("../components/mypage/menu-editor/CoverDeviceVisibilityFields.tsx", import.meta.url),
  "utf8",
);
const actionSource = readFileSync(new URL("../app/mypage/menus/actions.ts", import.meta.url), "utf8");

test("legacy representative-area settings remain visible on every device", () => {
  assert.equal(isMenuCoverVisibleOnDevice({}, "pc"), true);
  assert.equal(isMenuCoverVisibleOnDevice({}, "tablet"), true);
  assert.equal(isMenuCoverVisibleOnDevice({}, "mobile"), true);
  assert.equal(getMenuCoverResponsiveVisibilityClassName({}), "block");
});

test("representative area can be hidden only on mobile", () => {
  const settings = {
    menu_cover_visible_pc: true,
    menu_cover_visible_tablet: true,
    menu_cover_visible_mobile: false,
  };

  assert.equal(isMenuCoverVisibleOnDevice(settings, "pc"), true);
  assert.equal(isMenuCoverVisibleOnDevice(settings, "tablet"), true);
  assert.equal(isMenuCoverVisibleOnDevice(settings, "mobile"), false);
  assert.equal(getMenuCoverResponsiveVisibilityClassName(settings), "hidden md:block");
});

test("page-setting normalization preserves explicit device choices and defaults missing legacy values to visible", () => {
  const settings = mergePageSettings({ menu_cover_visible_mobile: false });

  assert.equal(settings.menu_cover_visible_pc, true);
  assert.equal(settings.menu_cover_visible_tablet, true);
  assert.equal(settings.menu_cover_visible_mobile, false);
});

test("responsive visibility class covers non-contiguous device choices", () => {
  assert.equal(
    getMenuCoverResponsiveVisibilityClassName({
      menu_cover_visible_pc: true,
      menu_cover_visible_tablet: false,
      menu_cover_visible_mobile: true,
    }),
    "block md:hidden xl:block",
  );
});

test("representative-area editor saves three device switches without clearing hidden child fields", () => {
  assert.match(editorSource, /name="menu_cover_device_visibility_present"/);
  assert.match(editorSource, /name="menu_cover_visible_pc"/);
  assert.match(editorSource, /name="menu_cover_visible_tablet"/);
  assert.match(editorSource, /name="menu_cover_visible_mobile"/);
  assert.match(actionSource, /hasMenuCoverDeviceVisibilityPayload[\s\S]*currentSettings\.menu_cover_visible_pc/);
  assert.match(actionSource, /menuCoverCapabilities\.coverMode === "section"[\s\S]*menu_cover_visible_mobile/);
});
