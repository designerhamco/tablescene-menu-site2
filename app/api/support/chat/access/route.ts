import { isAiSupportChatEnabled } from "@/lib/ai-support-chat";
import { chatError, chatResponse, getAccountId } from "@/lib/server/ai-support-chat-http";
import { getAiSupportAccess } from "@/lib/server/ai-support-chat-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const enabled = isAiSupportChatEnabled();
  if (!enabled || new URL(request.url).searchParams.get("availability") === "1") {
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
