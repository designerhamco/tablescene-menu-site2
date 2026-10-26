import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const faqSource = readFileSync(new URL("../app/faq/page.tsx", import.meta.url), "utf8");
const launcherSource = readFileSync(new URL("../app/support/chat/AiSupportChatLauncher.tsx", import.meta.url), "utf8");
const openButtonSource = readFileSync(new URL("../app/support/chat/AiSupportChatOpenButton.tsx", import.meta.url), "utf8");
const chatSource = readFileSync(new URL("../app/support/chat/AiSupportChat.tsx", import.meta.url), "utf8");
const chatCss = readFileSync(new URL("../app/support/chat/ai-support-chat.module.css", import.meta.url), "utf8");

test("고객센터는 중복 FAQ 카드와 하단 검정 CTA를 제거한다", () => {
  assert.doesNotMatch(faqSource, /href="#frequently-asked"/);
  assert.doesNotMatch(faqSource, /답을 찾지 못했다면 AI 상담/);
  assert.doesNotMatch(faqSource, /AI 상담 시작/);
  assert.match(faqSource, /<SupportCenter/);
});

test("고객센터 AI 상담 카드는 별도 페이지 대신 공통 상담창을 연다", () => {
  assert.match(faqSource, /<AiSupportChatOpenButton/);
  assert.doesNotMatch(faqSource, /href="\/support\/chat"/);
  assert.match(openButtonSource, /window\.dispatchEvent\(new Event\(AI_SUPPORT_CHAT_OPEN_EVENT\)\)/);
  assert.match(launcherSource, /window\.addEventListener\(AI_SUPPORT_CHAT_OPEN_EVENT, openChat\)/);
});

test("AI 상담 모달은 내부 스크롤과 지원 홈 이동을 유지하고 중복 하단 링크를 제거한다", () => {
  assert.match(chatCss, /\.compact \{ height: 100%; \}/);
  assert.match(chatCss, /\.compact \.viewport \{[^}]*overflow-y: auto/);
  assert.match(chatSource, /messageViewportRef/);
  assert.match(chatSource, /viewport\.scrollTo\(\{[\s\S]*?top: viewport\.scrollHeight/);
  assert.match(chatSource, /국외 이전 동의 완료/);
  assert.match(launcherSource, /<Dialog open=\{open\} onOpenChange=\{setOpen\}/);
  assert.match(launcherSource, /<DialogContent className=\{`site-dialog-sheet/);
  assert.match(launcherSource, /onCloseAutoFocus/);
  assert.match(launcherSource, /<SupportHome enabled=\{enabled\}/);
  assert.match(launcherSource, /aria-label="고객지원 홈으로"/);
  assert.doesNotMatch(chatSource, /1:1 문의로 이어서 도움받기/);
  assert.match(chatSource, /href="\/mypage\/inquiries"/);
});
