import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const uiSource = readFileSync(new URL("../styles/ui-system.css", import.meta.url), "utf8");

test("사이트 입력·선택·본문 입력은 공통 컨트롤 토큰을 사용한다", () => {
  assert.match(uiSource, /\.site-field,/);
  assert.match(uiSource, /min-height: var\(--ui-control-height-md\)/);
  assert.match(uiSource, /border: 1px solid var\(--ui-border\)/);
  assert.match(uiSource, /border-radius: var\(--ui-radius-card-compact\)/);
  assert.match(uiSource, /font-size: var\(--font-size-200\)/);
  assert.match(uiSource, /box-shadow: none/);
});

test("공통 폼은 포커스·비활성·오류 상태를 구분한다", () => {
  assert.match(uiSource, /\.site-field:focus,/);
  assert.match(uiSource, /outline: 2px solid var\(--ui-focus\)/);
  assert.match(uiSource, /\.site-field:disabled,/);
  assert.match(uiSource, /\.site-field:read-only:not\(:disabled\),/);
  assert.match(uiSource, /data-copyable-readonly="true"/);
  assert.match(uiSource, /\[aria-invalid="true"\]/);
  assert.match(uiSource, /:-webkit-autofill/);
});

test("메뉴판 고유 디자인의 폼 컨트롤은 사이트 호환 규칙에서 제외한다", () => {
  assert.match(uiSource, /:not\(\.menu-typography \*\)/);
  assert.match(uiSource, /input\[type="checkbox"\], input\[type="radio"\]/);
});
