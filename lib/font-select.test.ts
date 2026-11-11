import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FontSelect } from "../app/components/ui/font-select";
import { getKoreanFontOption, KOREAN_FONT_OPTIONS } from "./font-options";

const defaultOption = getKoreanFontOption("pretendard")!;
const render = (props: Partial<Parameters<typeof FontSelect>[0]> = {}) => renderToStaticMarkup(createElement(FontSelect, {
  label: "한글 서체", script: "ko", options: KOREAN_FONT_OPTIONS, defaultOption, value: "", onChange: () => {}, ...props,
}));

test("closed font choices identify the inherited font without loading the entire catalog", () => {
  const html = render();
  assert.match(html, /role="combobox"/);
  assert.match(html, /aria-label="한글 서체"/);
  assert.match(html, /템플릿 기본값 · Pretendard/);
  assert.doesNotMatch(html, /data-menu-font-asset|fonts.googleapis.com|@font-face/);
});

test("filtering a font category does not relabel the current selection as the default", () => {
  const selectedOption = getKoreanFontOption("gowun-batang")!;
  const html = render({ options: [defaultOption], selectedOption, value: selectedOption.value });
  assert.match(html, /Gowun Batang/);
  assert.doesNotMatch(html, /템플릿 기본값 ·/);
});

test("disabled font selectors preserve the chosen value and accessible control state", () => {
  const html = render({ value: "nanum-gothic", disabled: true });
  assert.match(html, /Nanum Gothic/);
  assert.match(html, /disabled=""/);
  assert.match(html, /data-state="closed"/);
});
