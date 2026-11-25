import assert from "node:assert/strict";
import test from "node:test";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import MenuEditorActionBar, { MenuEditorDirtyContext, MenuEditorWorkspaceActionsContext } from "../components/mypage/menu-editor/MenuEditorActionBar";

test("the editor dock keeps the original save control in its owning form", () => {
  const html = renderToStaticMarkup(h("form", { id: "editor" }, h(MenuEditorActionBar, {
    children: h("button", { type: "submit", name: "save", value: "current-tab" }, "저장"),
  })));
  assert.match(html, /<form id="editor"><div class="site-editor-action-bar"/);
  assert.match(html, /name="save"/);
  assert.match(html, /value="current-tab"/);
  assert.doesNotMatch(html, /data-editor-cancel/);
  assert.match(html, /role="status" aria-live="polite"/);
});

test("pending state takes precedence over dirty and prevents discard during save", () => {
  const html = renderToStaticMarkup(h(MenuEditorActionBar, { dirty: true, pending: true, children: null }));
  assert.match(html, /data-state="pending"/);
  assert.match(html, /저장 중…/);
  assert.match(html, /data-editor-cancel="true" disabled=""/);
});

test("unsaved drafts enable discard without claiming an automatic save", () => {
  const html = renderToStaticMarkup(h(MenuEditorActionBar, { dirty: true, children: null }));
  assert.match(html, /data-state="dirty"/);
  assert.match(html, /저장하지 않은 변경사항/);
  assert.match(html, /미저장 수정 취소/);
  assert.doesNotMatch(html, /모든 변경사항이 저장됨|data-editor-cancel="true" disabled/);
});

test("switching the selected item retains the unsaved state of the whole menu workspace", () => {
  const html = renderToStaticMarkup(h(MenuEditorDirtyContext.Provider, { value: true }, h(MenuEditorActionBar, { dirty: false, children: null })));
  assert.match(html, /data-state="dirty"/);
  assert.doesNotMatch(html, /모든 변경사항이 저장됨/);
});

test("menu-wide sample restore stays available alongside contextual entity actions", () => {
  const html = renderToStaticMarkup(h(MenuEditorWorkspaceActionsContext.Provider, {
    value: h("button", { type: "button" }, "템플릿 샘플로 되돌리기"),
  }, h(MenuEditorActionBar, { children: h("button", { type: "button" }, "위젯 복사") })));
  assert.match(html, /메뉴판 구성 공통 작업/);
  assert.match(html, /템플릿 샘플로 되돌리기/);
  assert.match(html, /위젯 복사/);
  assert.match(html, /class="site-container"/);
  const pendingHtml = renderToStaticMarkup(h(MenuEditorWorkspaceActionsContext.Provider, {
    value: h("button", { type: "button" }, "템플릿 샘플로 되돌리기"),
  }, h(MenuEditorActionBar, { pending: true, children: null })));
  assert.match(pendingHtml, /<fieldset class="site-action-row" disabled="" aria-label="메뉴판 구성 공통 작업"/);
});
