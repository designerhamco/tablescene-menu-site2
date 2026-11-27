import { isAuthSessionMissingError } from "@supabase/supabase-js";
import {
  AiSupportChatInputError,
  isAiSupportChatEnabled,
  normalizeAiSupportQuestion,
  requireAiSupportOverseasTransferConsent,
  type AiSupportChatResponse,
} from "@/lib/ai-support-chat";
import {
  AiSupportChatServiceError,
  answerAiSupportQuestion,
  getAiSupportAccess,
} from "@/lib/server/ai-support-chat-service";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function chatResponse(body: AiSupportChatResponse, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store, max-age=0" } });
}

async function getAccountId() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error && !isAuthSessionMissingError(error) && error.status !== 401 && error.status !== 403) {
    throw new AiSupportChatServiceError(
      "로그인 상태를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.", 503, { status: "unavailable" },
    );
  }
  return error ? null : user?.id ?? null;
}

function chatError(error: unknown) {
  if (error instanceof AiSupportChatInputError) {
    return chatResponse({ error: error.message }, 400);
  }
  if (error instanceof AiSupportChatServiceError) {
    return chatResponse({ error: error.message, access: error.access }, error.status);
  }
  console.warn("[ai-support-chat] unexpected request failure");
  return chatResponse({ error: "AI 상담을 이용하지 못했습니다.", access: { status: "unavailable" } }, 503);
}

export async function GET(request: Request) {
  const enabled = isAiSupportChatEnabled();
  if (!enabled || new URL(request.url).searchParams.get("access") !== "1") {
    return chatResponse({ enabled });
  }
  try {
    const accountId = await getAccountId();
    const access = accountId ? await getAiSupportAccess(accountId) : { status: "sign-in" } as const;
    return chatResponse({ enabled, access });
  } catch (error) {
    return chatError(error);
  }
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
