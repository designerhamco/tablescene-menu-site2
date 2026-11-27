import assert from "node:assert/strict";
import { beforeEach, mock, test } from "node:test";
import type { AiSupportChatAccess } from "../../lib/ai-support-chat";

const accountId = "80000000-0000-4000-8000-000000000001";
const limited: AiSupportChatAccess = {
  status: "limited",
  resetAt: "2026-11-28T12:00:00Z",
  kakaoChatUrl: "https://pf.kakao.com/_yAvvX/chat",
};

let authUser: { id: string } | null = null;
let authError: { status: number } | null = null;
const readQuota = mock.fn<(accountId: string) => Promise<AiSupportChatAccess>>(async () => limited);
const answerQuestion = mock.fn<(request: { accountId: string; question: string }) => Promise<{
  answer: string;
  access: AiSupportChatAccess;
}>>(async () => ({
  answer: "내 메뉴판에서 대표 QR을 받을 수 있어요.",
  access: limited,
}));

class ServiceError extends Error {
  constructor(message: string, public status: number, public access?: AiSupportChatAccess) {
    super(message);
  }
}

mock.module(new URL("../../lib/supabase/server.ts", import.meta.url).href, {
  namedExports: {
    createClient: async () => ({ auth: { getUser: async () => ({ data: { user: authUser }, error: authError }) } }),
  },
});
mock.module(new URL("../../lib/server/ai-support-chat-service.ts", import.meta.url).href, {
  namedExports: { getAiSupportAccess: readQuota, answerAiSupportQuestion: answerQuestion, AiSupportChatServiceError: ServiceError },
});

const { GET, POST } = await import("../../app/api/support/chat/route");
const endpoint = "https://artimenu.example/api/support/chat";

beforeEach(() => {
  process.env.AI_SUPPORT_CHAT_ENABLED = "true";
  authUser = null;
  authError = null;
  readQuota.mock.resetCalls();
  answerQuestion.mock.resetCalls();
});

function submit(overrides = {}) {
  return POST(new Request(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: "  대표   QR은 어디에서 받아요?  ", overseasTransferConsent: true, ...overrides }),
  }));
}

test("the public availability probe works without exposing an account consultation state", async () => {
  const response = await GET(new Request(endpoint));
  assert.deepEqual(await response.json(), { enabled: true });
  assert.equal(readQuota.mock.callCount(), 0);
});

test("signed-out requests cannot read a quota or reach the model", async () => {
  const access = await GET(new Request(endpoint + "?access=1"));
  assert.deepEqual(await access.json(), { enabled: true, access: { status: "sign-in" } });
  const response = await submit({ accountId });
  assert.equal(response.status, 401);
  assert.equal((await response.json()).access.status, "sign-in");
  assert.equal(readQuota.mock.callCount(), 0);
  assert.equal(answerQuestion.mock.callCount(), 0);
});

test("a failed account check or missing consent prevents a question from being reserved", async () => {
  authError = { status: 500 };
  assert.equal((await submit()).status, 503);
  authError = null;
  authUser = { id: accountId };
  assert.equal((await submit({ overseasTransferConsent: false })).status, 400);
  assert.equal(answerQuestion.mock.callCount(), 0);
});

test("the last answer and limited access arrive together using the verified account", async () => {
  authUser = { id: accountId };
  const response = await submit({ accountId: "ignored" });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("cache-control") ?? "", /private, no-store/);
  assert.deepEqual(await response.json(), { answer: "내 메뉴판에서 대표 QR을 받을 수 있어요.", access: limited });
  assert.equal(answerQuestion.mock.calls[0].arguments[0].accountId, accountId);
  assert.equal(answerQuestion.mock.calls[0].arguments[0].question, "대표 QR은 어디에서 받아요?");
  const access = await GET(new Request(endpoint + "?access=1"));
  assert.deepEqual(await access.json(), { enabled: true, access: limited });
  assert.deepEqual(readQuota.mock.calls[0].arguments, [accountId]);
});
