import assert from "node:assert/strict";
import test from "node:test";

import {
  AI_SUPPORT_CHAT_MAX_INPUT_LENGTH,
  AiSupportChatInputError,
  isAiSupportChatEnabled,
  normalizeAiSupportQuestion,
} from "./ai-support-chat";

test("AI 상담은 명시적 runtime gate에서만 열린다", () => {
  assert.equal(isAiSupportChatEnabled(), false);
  assert.equal(isAiSupportChatEnabled("true"), true);
  assert.equal(isAiSupportChatEnabled("TRUE"), true);
  assert.equal(isAiSupportChatEnabled("1"), false);
});

test("AI 상담 질문은 공백을 정리하고 길이를 제한한다", () => {
  assert.equal(normalizeAiSupportQuestion("  메뉴판을   어떻게 만들어요?  "), "메뉴판을 어떻게 만들어요?");
  assert.throws(() => normalizeAiSupportQuestion(""), AiSupportChatInputError);
  assert.throws(
    () => normalizeAiSupportQuestion("가".repeat(AI_SUPPORT_CHAT_MAX_INPUT_LENGTH + 1)),
    AiSupportChatInputError,
  );
});
