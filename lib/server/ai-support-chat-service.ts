import "server-only";

import { randomUUID } from "node:crypto";
import {
  AI_SUPPORT_CHAT_RATE_LIMIT,
  AI_SUPPORT_CHAT_RATE_WINDOW_MS,
  type AiSupportChatAccess,
} from "@/lib/ai-support-chat";
import {
  AI_SUPPORT_RESERVED_TOKENS,
  DEFAULT_SUPPORT_MODEL,
  buildAiSupportModelRequest,
  readAiSupportModelAnswer,
} from "@/lib/server/ai-support-model";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/types";

const OPENAI_RESPONSES_ENDPOINT = "https://api.openai.com/v1/responses";
const KAKAO_CHAT_URL = "https://pf.kakao.com/_yAvvX/chat";
const DEFAULT_DAILY_TOKEN_LIMIT = 14_000;
const REQUEST_TIMEOUT_MS = 20_000;
const UPSTREAM_ERROR = "AI 상담 연결이 원활하지 않습니다. 잠시 후 다시 시도해 주세요.";
const CONFIGURATION_ERROR = "AI 상담 설정을 확인하고 있습니다.";
const LIMIT_MESSAGE = "지금은 AI 상담을 더 이용할 수 없어요.";

type RateBucket = { count: number; resetAt: number };
const rateBuckets = new Map<string, RateBucket>();
const unavailable = { status: "unavailable" } as const;

export class AiSupportChatServiceError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly access?: AiSupportChatAccess,
  ) {
    super(message);
    this.name = "AiSupportChatServiceError";
  }
}

function getQuotaArgs(accountId: string) {
  const configured = process.env.AI_SUPPORT_CHAT_DAILY_TOKENS?.trim();
  const limit = configured ? Number(configured) : DEFAULT_DAILY_TOKEN_LIMIT;
  if (!Number.isSafeInteger(limit) || limit < AI_SUPPORT_RESERVED_TOKENS || limit > 1_000_000) {
    throw new AiSupportChatServiceError(CONFIGURATION_ERROR, 503, unavailable);
  }
  return { p_account_id: accountId, p_daily_limit: limit, p_reserve_tokens: AI_SUPPORT_RESERVED_TOKENS };
}

function decodeAccess(data: Json): AiSupportChatAccess {
  if (data && typeof data === "object" && !Array.isArray(data)) {
    if (data.status === "ready") return { status: "ready" };
    if (data.status === "busy" && typeof data.retryAt === "string" && Number.isFinite(Date.parse(data.retryAt))) {
      return { status: "busy", retryAt: data.retryAt };
    }
    if (data.status === "limited" && typeof data.resetAt === "string" && Number.isFinite(Date.parse(data.resetAt))) {
      return { status: "limited", resetAt: data.resetAt, kakaoChatUrl: KAKAO_CHAT_URL };
    }
  }
  throw new AiSupportChatServiceError(CONFIGURATION_ERROR, 503, unavailable);
}

export async function getAiSupportAccess(accountId: string) {
  const { data, error } = await createAdminClient().rpc("get_ai_support_account_quota", getQuotaArgs(accountId));
  if (error) {
    console.warn("[ai-support-chat] quota read failed", { code: error.code });
    throw new AiSupportChatServiceError(CONFIGURATION_ERROR, 503, unavailable);
  }
  return decodeAccess(data);
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
    return true;
  }
  if (current.count >= AI_SUPPORT_CHAT_RATE_LIMIT) return false;
  current.count += 1;
  return true;
}

async function requestOpenAi(question: string, apiKey: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const model = process.env.OPENAI_SUPPORT_MODEL || DEFAULT_SUPPORT_MODEL;
  try {
    const response = await fetch(OPENAI_RESPONSES_ENDPOINT, {
      method: "POST",
      signal: controller.signal,
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(buildAiSupportModelRequest(question, model)),
    });
    const payload = await response.json().catch(() => null);
    const reported = payload?.usage?.total_tokens;
    const rejected = response.status >= 400 && response.status < 500 && response.status !== 408;
    const tokens = Number.isSafeInteger(reported) && reported > 0 && reported <= 1_000_000
      ? reported as number
      : rejected ? 0 : null;
    if (!response.ok) {
      console.warn("[ai-support-chat] upstream response failed", { status: response.status });
    }
    return { answer: response.ok ? readAiSupportModelAnswer(payload) : "", tokens };
  } catch {
    console.warn("[ai-support-chat] upstream request failed");
    return { answer: "", tokens: null };
  } finally {
    clearTimeout(timeout);
  }
}

export async function answerAiSupportQuestion({ accountId, question, rateLimitKey }: {
  accountId: string;
  question: string;
  rateLimitKey: string;
}) {
  const apiKey = process.env.OPENAI_SUPPORT_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) throw new AiSupportChatServiceError(CONFIGURATION_ERROR, 503, unavailable);

  const quotaArgs = getQuotaArgs(accountId);
  if (!consumeRateLimit(rateLimitKey)) {
    const access = await getAiSupportAccess(accountId);
    if (access.status === "limited") throw new AiSupportChatServiceError(LIMIT_MESSAGE, 429, access);
    throw new AiSupportChatServiceError("질문이 잠시 많습니다. 잠시 후 다시 이용해 주세요.", 429);
  }

  const admin = createAdminClient();
  const reservation = { ...quotaArgs, p_reservation_id: randomUUID() };
  const { data, error } = await admin.rpc("reserve_ai_support_account_usage", reservation);
  if (error) {
    console.warn("[ai-support-chat] reservation failed", { code: error.code });
    throw new AiSupportChatServiceError(CONFIGURATION_ERROR, 503, unavailable);
  }
  const access = decodeAccess(data);
  if (access.status === "limited") throw new AiSupportChatServiceError(LIMIT_MESSAGE, 429, access);
  if (access.status === "busy") throw new AiSupportChatServiceError("답변을 준비 중입니다.", 409, access);
  if (access.status !== "ready") throw new AiSupportChatServiceError(CONFIGURATION_ERROR, 503, unavailable);

  const { answer, tokens } = await requestOpenAi(question, apiKey);
  let settledAccess: AiSupportChatAccess = unavailable;
  try {
    const settled = await admin.rpc("settle_ai_support_account_usage", {
      ...reservation,
      p_actual_tokens: tokens ?? undefined,
    });
    if (settled.error) throw settled.error;
    settledAccess = decodeAccess(settled.data);
  } catch {
    console.warn("[ai-support-chat] settlement failed");
  }
  if (!answer) {
    throw new AiSupportChatServiceError(UPSTREAM_ERROR, 502, settledAccess);
  }
  return { answer, access: settledAccess };
}
