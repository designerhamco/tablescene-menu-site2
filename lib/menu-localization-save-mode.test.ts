import assert from "node:assert/strict";
import test from "node:test";

import { getLocalizationSaveMode } from "./menu-localization-save-mode";

test("언어 선택만 바뀌면 번역 전체 저장을 건너뛴다", () => {
  assert.equal(getLocalizationSaveMode({ hasLocaleChanges: true, hasTranslationChanges: false }), "languages");
});

test("번역만 바뀌면 메뉴판 설정 갱신을 건너뛴다", () => {
  assert.equal(getLocalizationSaveMode({ hasLocaleChanges: false, hasTranslationChanges: true }), "translations");
});

test("언어와 번역이 함께 바뀌면 둘 다 저장한다", () => {
  assert.equal(getLocalizationSaveMode({ hasLocaleChanges: true, hasTranslationChanges: true }), "all");
});
