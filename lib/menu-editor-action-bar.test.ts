import assert from "node:assert/strict";
import test from "node:test";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import MenuEditorActionBar, { MenuEditorDirtyContext } from "../components/mypage/menu-editor/MenuEditorActionBar";

test("the editor dock keeps the original save control in its owning form", () => {
  const html = renderToStaticMarkup(h("form", { id: "editor" }, h(MenuEditorActionBar, {
    children: h("button", { type: "submit", name: "save", value: "current-tab" }, "저장"),
  })));
  assert.match(html, /<form id="editor"><div class="site-editor-action-bar"/);
  assert.match(html, /name="save"/);
  assert.match(html, /value="current-tab"/);
  assert.match(html, /data-editor-cancel="true" disabled=""/);
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
  assert.doesNotMatch(html, /모든 변경사항이 저장됨|data-editor-cancel="true" disabled/);
});

test("switching the selected item retains the unsaved state of the whole menu workspace", () => {
  const html = renderToStaticMarkup(h(MenuEditorDirtyContext.Provider, { value: true }, h(MenuEditorActionBar, { dirty: false, children: null })));
  assert.match(html, /data-state="dirty"/);
  assert.doesNotMatch(html, /모든 변경사항이 저장됨/);
});
