import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement, Fragment } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import test from "node:test";
import SupportHome, { SUPPORT_HOME_QUESTIONS } from "../app/support/chat/SupportHome";
import { DETAILED_FAQ_DATA } from "../app/components/common/FAQ";

const read = (file: string) => readFileSync(new URL(file, import.meta.url), "utf8");

test("support home offers three channels and real guide routes before any question or consent form", () => {
  for (const enabled of [null, false, true]) {
    const html = renderToStaticMarkup(createElement(SupportHome, { enabled, onChat() {} }));
    for (const text of ["AI 실시간 문의", "1:1 문의", "FAQ", "서비스 가이드", "자주 묻는 질문"]) assert.ok(html.includes(text));
    for (const route of ["/mypage/inquiries", "/faq?tab=faq", "/guides", "/guides?plan=display#display-connection"]) assert.ok(html.includes(`href="${route}"`));
    assert.doesNotMatch(html, /<form|<textarea|<input|새로운 기능|새로운 소식/);
    assert.equal(html.includes("준비 중"), enabled === false);
  }
});

test("support summaries reuse existing FAQ content and multiple previews do not duplicate IDs", () => {
  for (const question of SUPPORT_HOME_QUESTIONS) {
    assert.equal(DETAILED_FAQ_DATA.flatMap(group => group.items).filter(item => item.question === question).length, 1);
  }
  const html = renderToStaticMarkup(createElement(Fragment, null,
    createElement(SupportHome, { enabled: false, onChat() {} }),
    createElement(SupportHome, { enabled: false, onChat() {} }),
  ));
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(ids.length, new Set(ids).size);
  for (const match of html.matchAll(/aria-labelledby="([^"]+)"/g)) assert.ok(ids.includes(match[1]));
});

test("AI entry points share the AI variant and the launcher keeps the existing runtime gate", () => {
  const launcher = read("../app/support/chat/AiSupportChatLauncher.tsx");
  const center = read("../app/faq/page.tsx");
  assert.match(center, /AiSupportChatOpenButton className="site-button site-button-ai"/);
  assert.match(launcher, /site-button site-button-ai/);
  assert.doesNotMatch(launcher, /href="\/guides"|method: "POST"|document\.body\.style/);
  assert.match(launcher, /method: "GET"/);
  assert.match(launcher, /enabled \? <AiSupportChat compact \/>/);
  assert.match(launcher, /setView\("home"\); setChatVisited\(false\)/);
  const css = read("../app/support/chat/support-home.module.css");
  assert.match(css, /\.launcherButton\.launcherButton \{ width: 3\.5rem; height: 3\.5rem/);
  assert.match(css, /border-radius: 1\.25rem/);
});
