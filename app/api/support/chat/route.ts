import {
  isAiSupportChatEnabled,
  normalizeAiSupportQuestion,
  requireAiSupportOverseasTransferConsent,
} from "@/lib/ai-support-chat";
import { chatError, chatResponse, getAccountId } from "@/lib/server/ai-support-chat-http";
import { answerAiSupportQuestion } from "@/lib/server/ai-support-chat-service";

export const dynamic = "force-dynamic";

export async function GET() {
  return chatResponse({ enabled: isAiSupportChatEnabled() });
}

export async function POST(request: Request) {
  if (!isAiSupportChatEnabled()) {
    return chatResponse({ error: "AI 상담은 현재 준비 중입니다.", access: { status: "unavailable" } }, 503);
  }
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return chatResponse({ error: "JSON 형식의 질문만 보낼 수 있습니다." }, 415);
  }
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > 2_000) {
    return chatResponse({ error: "질문이 너무 깁니다." }, 413);
  }
  try {
    const accountId = await getAccountId();
    if (!accountId) {
      return chatResponse({ error: "로그인하면 AI 상담을 이용할 수 있어요.", access: { status: "sign-in" } }, 401);
    }
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > 2_000) {
      return chatResponse({ error: "질문이 너무 깁니다." }, 413);
    }
    let payload: { question?: unknown; overseasTransferConsent?: unknown } | null;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return chatResponse({ error: "질문 형식을 확인해 주세요." }, 400);
    }

    requireAiSupportOverseasTransferConsent(payload?.overseasTransferConsent);
    const question = normalizeAiSupportQuestion(payload?.question);
    const forwardedFor = (
      request.headers.get("x-vercel-forwarded-for")
      || request.headers.get("x-forwarded-for")
    )?.split(",")[0]?.trim();
    const rateLimitKey = forwardedFor || request.headers.get("x-real-ip") || "anonymous";
    const result = await answerAiSupportQuestion({ accountId, question, rateLimitKey });
    return chatResponse(result);
  } catch (error) {
    return chatError(error);
  }
}
