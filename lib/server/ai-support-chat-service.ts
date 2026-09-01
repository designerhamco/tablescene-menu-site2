import "server-only";

import {
  AI_SUPPORT_CHAT_RATE_LIMIT,
  AI_SUPPORT_CHAT_RATE_WINDOW_MS,
  isAiSupportChatEnabled,
  normalizeAiSupportQuestion,
} from "@/lib/ai-support-chat";

const OPENAI_RESPONSES_ENDPOINT = "https://api.openai.com/v1/responses";
const DEFAULT_SUPPORT_MODEL = "gpt-5-nano";
const REQUEST_TIMEOUT_MS = 20_000;

const PRODUCT_CONTEXT = `
ArtiMenu is a Korean digital menu service.
- ArtiMenu Dining single-page: monthly 5,900 KRW, discount and widgets, no multipage, no Smart Call, no Order.
- ArtiMenu Dining multipage: monthly 9,900 KRW, multipage and Smart Call, no widgets, no Order.
- ArtiMenu Display: monthly 14,900 KRW, display images and limited direct MP4 upload, no Order or Smart Call.
- Order and QR payment are not currently offered.
- Menu editing, design, translations, previews, and public links are managed from MY/Menu board.
- Smart Call requires an active multipage Dining menu, table QR session, and store activation.
- Account-specific billing, cancellation, refund, subscription status, and data changes must be handled through MY/Menu or 1:1 inquiry.
`;

type RateBucket = { count: number; resetAt: number };
const rateBuckets = new Map<string, RateBucket>();

export class AiSupportChatServiceError extends Error {
  constructor(
    public readonly code: "DISABLED" | "RATE_LIMITED" | "CONFIGURATION" | "UPSTREAM",
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "AiSupportChatServiceError";
  }
}

function consumeRateLimit(key: string, now = Date.now()) {
  if (rateBuckets.size > 2_000) {
    for (const [bucketKey, bucket] of rateBuckets) {
      if (bucket.resetAt <= now) rateBuckets.delete(bucketKey);
    }
  }
  const current = rateBuckets.get(key);
  if (!current || current.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + AI_SUPPORT_CHAT_RATE_WINDOW_MS });
    return;
  }
  if (current.count >= AI_SUPPORT_CHAT_RATE_LIMIT) {
    throw new AiSupportChatServiceError(
      "RATE_LIMITED",
      "질문이 잠시 많습니다. 10분 뒤 다시 이용하거나 1:1 문의를 남겨 주세요.",
      429,
    );
  }
  current.count += 1;
}

function getResponseText(payload: unknown) {
  if (!payload || typeof payload !== "object") return "";
  const response = payload as {
    output_text?: unknown;
    output?: Array<{ content?: Array<{ text?: unknown }> }>;
  };
  if (typeof response.output_text === "string") return response.output_text.trim();
  return (response.output ?? [])
    .flatMap((item) => item.content ?? [])
    .map((content) => typeof content.text === "string" ? content.text : "")
    .join("")
    .trim();
}

export async function answerAiSupportQuestion({ question, rateLimitKey }: { question: unknown; rateLimitKey: string }) {
  if (!isAiSupportChatEnabled()) {
    throw new AiSupportChatServiceError("DISABLED", "AI 상담은 현재 준비 중입니다.", 503);
  }
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new AiSupportChatServiceError("CONFIGURATION", "AI 상담 설정을 확인하고 있습니다.", 503);
  }
  const normalizedQuestion = normalizeAiSupportQuestion(question);
  consumeRateLimit(rateLimitKey);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(OPENAI_RESPONSES_ENDPOINT, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_SUPPORT_MODEL || process.env.OPENAI_MODEL || DEFAULT_SUPPORT_MODEL,
        store: false,
        max_output_tokens: 500,
        input: [
          {
            role: "system",
            content: [{
              type: "input_text",
              text: `You are ArtiMenu's Korean product guide. Answer in concise, friendly Korean using only the supplied product context. Never claim to see or change an account, payment, refund, subscription, menu data, or personal information. Never ask for passwords, card data, API keys, resident numbers, or authentication codes. Do not make legal, tax, medical, or contractual conclusions. If the context is insufficient or a human action is required, clearly say so and direct the user to 1:1 문의. Do not invent launch dates, discounts, policies, or features. Keep the answer under 6 short sentences.\n${PRODUCT_CONTEXT}`,
            }],
          },
          {
            role: "user",
            content: [{ type: "input_text", text: normalizedQuestion }],
          },
        ],
      }),
    });
  } catch (error) {
    console.warn("[ai-support-chat] upstream request failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    throw new AiSupportChatServiceError("UPSTREAM", "AI 상담 연결이 원활하지 않습니다. 잠시 후 다시 시도해 주세요.", 502);
  } finally {
    clearTimeout(timeout);
  }

  const payload = await response.json().catch(() => null) as unknown;
  if (!response.ok) {
    console.warn("[ai-support-chat] upstream response failed", { status: response.status });
    throw new AiSupportChatServiceError("UPSTREAM", "AI 상담 연결이 원활하지 않습니다. 잠시 후 다시 시도해 주세요.", 502);
  }
  const answer = getResponseText(payload);
  if (!answer) {
    throw new AiSupportChatServiceError("UPSTREAM", "답변을 만들지 못했습니다. 1:1 문의를 이용해 주세요.", 502);
  }
  return answer;
}
