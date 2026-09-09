export const AI_SUPPORT_CHAT_MAX_INPUT_LENGTH = 500;
export const AI_SUPPORT_CHAT_MAX_OUTPUT_TOKENS = 300;
export const AI_SUPPORT_CHAT_RATE_LIMIT = 6;
export const AI_SUPPORT_CHAT_RATE_WINDOW_MS = 10 * 60 * 1000;

const SENSITIVE_INPUT_PATTERNS = [
  /\bsk-[a-z0-9_-]{10,}\b/i,
  /\b\d{6}\s*-\s*[1-4]\d{6}\b/,
  /\b(?:\d[ -]?){13,19}\b/,
  /\b01[016789][ -]?\d{3,4}[ -]?\d{4}\b/,
  /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/i,
  /(?:인증번호|인증코드|otp|verification code)\s*(?::|=)?\s*\d{4,8}/i,
  /(?:비밀번호|패스워드|password)\s*(?::|=)\s*\S{4,}/i,
] as const;

export class AiSupportChatInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiSupportChatInputError";
  }
}

export function normalizeAiSupportAnswer(value: unknown) {
  if (typeof value !== "string") return "";
  return value
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .trim();
}

export function isAiSupportChatEnabled(value = process.env.AI_SUPPORT_CHAT_ENABLED) {
  return value?.trim().toLowerCase() === "true";
}

export function normalizeAiSupportQuestion(value: unknown) {
  const normalized = typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
  if (!normalized) {
    throw new AiSupportChatInputError("질문을 입력해 주세요.");
  }
  if (normalized.length > AI_SUPPORT_CHAT_MAX_INPUT_LENGTH) {
    throw new AiSupportChatInputError(`질문은 ${AI_SUPPORT_CHAT_MAX_INPUT_LENGTH}자 이하로 입력해 주세요.`);
  }
  if (SENSITIVE_INPUT_PATTERNS.some((pattern) => pattern.test(normalized))) {
    throw new AiSupportChatInputError(
      "개인정보나 인증·결제 정보는 입력하지 말고, 해당 값을 제외한 일반적인 질문으로 다시 작성해 주세요.",
    );
  }
  return normalized;
}
