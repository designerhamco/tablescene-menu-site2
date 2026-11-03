import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LoadingState, ProgressBar } from "../app/components/ui/loading-state";
import { getNavigationRole, isSiteNavItemActive, SITE_NAV_ITEMS } from "./site-navigation";

test("unmeasured loading exposes status copy without a fabricated percent", () => {
  const markup = renderToStaticMarkup(createElement(LoadingState, { label: "공지사항 조회 중" }));
  assert.match(markup, /role="status"/);
  assert.match(markup, /aria-hidden="true"/);
  assert.match(markup, /공지사항 조회 중/);
  const pending = renderToStaticMarkup(createElement(ProgressBar, { label: "업로드" }));
  assert.match(pending, /role="progressbar"/);
  assert.doesNotMatch(pending, /aria-valuenow/);
  for (const [value, expected] of [[-5, 0], [65, 65], [120, 100]]) assert.match(renderToStaticMarkup(createElement(ProgressBar, { label: "업로드", value })), new RegExp(`aria-valuenow="${expected}"`));
  assert.doesNotMatch(renderToStaticMarkup(createElement(ProgressBar, { label: "업로드", value: NaN })), /aria-valuenow/);
});

test("navigation role labels follow verified accessible ownership and membership", () => {
  assert.equal(getNavigationRole([]), null);
  assert.equal(getNavigationRole([{ isOwner: false }]), null);
  assert.equal(getNavigationRole([{ isOwner: false, memberRole: "staff" }]), "직원");
  assert.equal(getNavigationRole([{ isOwner: false, memberRole: "staff" }, { isOwner: true }]), "사장");
  const support = SITE_NAV_ITEMS.find(item => item.path === "/faq")!;
  assert.equal(isSiteNavItemActive(support, "/faq/notices/entry"), true);
  assert.equal(isSiteNavItemActive(support, "/guides"), true);
  assert.equal(isSiteNavItemActive(support, "/templates"), false);
});
