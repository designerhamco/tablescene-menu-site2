import assert from "node:assert/strict";
import test from "node:test";

import {
  AI_SUPPORT_CHAT_MAX_INPUT_LENGTH,
  AI_SUPPORT_CHAT_MAX_OUTPUT_TOKENS,
  AiSupportChatInputError,
  isAiSupportChatEnabled,
  normalizeAiSupportAnswer,
  normalizeAiSupportQuestion,
  requireAiSupportOverseasTransferConsent,
} from "./ai-support-chat";
import { buildAiSupportModelRequest, DEFAULT_SUPPORT_MODEL, readAiSupportModelAnswer } from "./server/ai-support-model";

test("AI 상담 응답 비용 상한은 짧은 안내 답변 범위로 고정한다", () => {
  assert.equal(AI_SUPPORT_CHAT_MAX_OUTPUT_TOKENS, 300);
});

test("AI 상담 답변은 채팅 UI에 노출하기 전에 Markdown 장식을 제거한다", () => {
  assert.equal(
    normalizeAiSupportAnswer("## 요금 안내\n**단일페이지**는 `월 5,900원`입니다."),
    "요금 안내\n단일페이지는 월 5,900원입니다.",
  );
});

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

test("AI 상담은 명시적인 국외 이전 동의가 있을 때만 요청한다", () => {
  assert.doesNotThrow(() => requireAiSupportOverseasTransferConsent(true));
  assert.throws(() => requireAiSupportOverseasTransferConsent(false), AiSupportChatInputError);
  assert.throws(() => requireAiSupportOverseasTransferConsent("true"), AiSupportChatInputError);
  assert.throws(() => requireAiSupportOverseasTransferConsent(undefined), AiSupportChatInputError);
});

test("민감정보로 보이는 입력은 API 전송 전에 거부한다", () => {
  const rejectedQuestions = [
    "제 이메일은 owner@example.com인데 로그인이 안돼요",
    "제 전화번호는 010-1234-5678입니다",
    "카드번호 1234 5678 9012 3456으로 결제됐나요?",
    "인증번호 123456이 맞나요?",
    "비밀번호: secret1234",
    "API key sk-example-secret-value",
    "주민번호 900101-1234567",
  ];

  for (const question of rejectedQuestions) {
    assert.throws(() => normalizeAiSupportQuestion(question), AiSupportChatInputError);
  }
});

test("민감한 값을 포함하지 않은 일반 계정 질문은 허용한다", () => {
  assert.equal(normalizeAiSupportQuestion("비밀번호를 어떻게 재설정하나요?"), "비밀번호를 어떻게 재설정하나요?");
  assert.equal(normalizeAiSupportQuestion("인증번호가 오지 않아요"), "인증번호가 오지 않아요");
  assert.equal(normalizeAiSupportQuestion("다이닝 월 5,900원 요금제를 알려주세요"), "다이닝 월 5,900원 요금제를 알려주세요");
});

function modelReply(text: string, status = "completed") {
  return {
    status,
    output: [{ type: "message", role: "assistant", content: [{ type: "output_text", text }] }],
  };
}

test("AI 상담은 모델에 관련 여부와 답변을 함께 요청한다", () => {
  const request = buildAiSupportModelRequest("대표 QR은 어디에서 받아요?", DEFAULT_SUPPORT_MODEL);
  assert.equal(request.store, false);
  assert.equal(request.text.format.strict, true);
  assert.deepEqual(request.text.format.schema.properties.scope.enum, ["support", "off_topic", "needs_context"]);
  assert.equal(request.input.at(-1)?.content[0].text, "대표 QR은 어디에서 받아요?");
});

test("범위 밖 답변과 모호한 답변은 모델 문구 대신 고정 안내를 사용한다", () => {
  const generatedText = "오사카 여행 코스를 추천할게요.";
  const gate = (scope: string) => readAiSupportModelAnswer(modelReply(JSON.stringify({ scope, answer: generatedText })));
  assert.match(gate("off_topic"), /이 상담에서는 아티메뉴 이용을 안내해요/);
  assert.match(gate("needs_context"), /사용 중인 기능이나 화면/);
  for (const scope of ["off_topic", "needs_context"]) assert.ok(!gate(scope).includes(generatedText));
});

test("관련 답변만 표시하고 범위를 확인할 수 없는 출력은 표시하지 않는다", () => {
  const support = JSON.stringify({ scope: "support", answer: "**내 메뉴판**에서 대표 QR을 다운로드하세요." });
  assert.equal(readAiSupportModelAnswer(modelReply(support)), "내 메뉴판에서 대표 QR을 다운로드하세요.");
  assert.equal(readAiSupportModelAnswer(modelReply(support, "incomplete")), "");
  assert.equal(readAiSupportModelAnswer(modelReply("오사카 여행 코스는 다음과 같아요.")), "");
  assert.equal(readAiSupportModelAnswer(modelReply('{"scope":"unknown","answer":"숨겨야 하는 응답"}')), "");
  assert.equal(readAiSupportModelAnswer(modelReply('{"scope":"support","answer":2}')), "");
  assert.equal(readAiSupportModelAnswer({ output_text: support }), "");
});
