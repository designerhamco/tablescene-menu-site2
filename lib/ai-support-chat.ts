export const AI_SUPPORT_CHAT_MAX_INPUT_LENGTH = 500;
export const AI_SUPPORT_CHAT_RATE_LIMIT = 6;
export const AI_SUPPORT_CHAT_RATE_WINDOW_MS = 10 * 60 * 1000;

export class AiSupportChatInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiSupportChatInputError";
  }
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
  return normalized;
}
