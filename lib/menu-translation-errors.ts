export const PARTIAL_TRANSLATION_FAILURE_MESSAGE =
  "일부 번역이 저장되었지만 전체 번역을 완료하지 못했습니다. 다시 시도해주세요.";

export function getSafeTranslationErrorMessage(message: string | null | undefined) {
  if (!message) return "자동 번역에 실패했습니다. 잠시 후 다시 시도해주세요.";

  const normalizedMessage = message.toLowerCase();

  if (message === PARTIAL_TRANSLATION_FAILURE_MESSAGE) {
    return PARTIAL_TRANSLATION_FAILURE_MESSAGE;
  }

  if (
    normalizedMessage.includes("시간이 초과") ||
    normalizedMessage.includes("timeout") ||
    normalizedMessage.includes("timed out") ||
    normalizedMessage.includes("abort")
  ) {
    return "AI 번역 요청 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.";
  }

  if (normalizedMessage.includes("openai_api_key") || normalizedMessage.includes("environment") || normalizedMessage.includes("환경변수")) {
    return "자동 번역 기능이 아직 설정되지 않았습니다. 관리자에게 문의해주세요.";
  }

  if (
    normalizedMessage.includes("quota") ||
    normalizedMessage.includes("billing") ||
    normalizedMessage.includes("rate limit") ||
    normalizedMessage.includes("429")
  ) {
    return "자동 번역 사용 한도 또는 API 설정 문제로 실행할 수 없습니다. 관리자에게 문의해주세요.";
  }

  if (normalizedMessage.includes("api") || normalizedMessage.includes("openai")) {
    return "자동 번역 서비스 연결에 문제가 있습니다. 잠시 후 다시 시도해주세요.";
  }

  return "자동 번역에 실패했습니다. 잠시 후 다시 시도해주세요.";
}
