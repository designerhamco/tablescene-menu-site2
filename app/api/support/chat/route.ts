import { AiSupportChatInputError } from "@/lib/ai-support-chat";
import {
  AiSupportChatServiceError,
  answerAiSupportQuestion,
} from "@/lib/server/ai-support-chat-service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > 2_000) {
    return Response.json({ error: "질문이 너무 깁니다." }, { status: 413 });
  }
  const payload = await request.json().catch(() => null) as { question?: unknown } | null;
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const rateLimitKey = forwardedFor || request.headers.get("x-real-ip") || "anonymous";
  try {
    const answer = await answerAiSupportQuestion({ question: payload?.question, rateLimitKey });
    return Response.json({ answer }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
  } catch (error) {
    if (error instanceof AiSupportChatInputError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof AiSupportChatServiceError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "AI 상담을 이용하지 못했습니다." }, { status: 500 });
  }
}
