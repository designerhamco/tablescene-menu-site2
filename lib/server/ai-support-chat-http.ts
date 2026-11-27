import { isAuthSessionMissingError } from "@supabase/supabase-js";
import { AiSupportChatInputError, type AiSupportChatResponse } from "@/lib/ai-support-chat";
import { AiSupportChatServiceError } from "@/lib/server/ai-support-chat-service";
import { createClient } from "@/lib/supabase/server";

export function chatResponse(body: AiSupportChatResponse, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store, max-age=0" } });
}

export async function getAccountId() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error && !isAuthSessionMissingError(error) && error.status !== 401 && error.status !== 403) {
    throw new AiSupportChatServiceError(
      "로그인 상태를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.", 503, { status: "unavailable" },
    );
  }
  return error ? null : user?.id ?? null;
}

export function chatError(error: unknown) {
  if (error instanceof AiSupportChatInputError) {
    return chatResponse({ error: error.message }, 400);
  }
  if (error instanceof AiSupportChatServiceError) {
    return chatResponse({ error: error.message, access: error.access }, error.status);
  }
  console.warn("[ai-support-chat] unexpected request failure");
  return chatResponse({ error: "AI 상담을 이용하지 못했습니다.", access: { status: "unavailable" } }, 503);
}
