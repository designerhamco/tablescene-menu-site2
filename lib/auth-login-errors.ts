export type SignInErrorLike = {
  code?: string | null;
  message?: string | null;
};

const SIGN_IN_ERROR_MESSAGES: Record<string, string> = {
  "account-deleted": "탈퇴 처리된 계정입니다.",
  "email-not-confirmed": "이메일 인증을 완료한 후 로그인해주세요.",
  "invalid-credentials": "이메일 또는 비밀번호가 올바르지 않습니다.",
  "missing-fields": "이메일과 비밀번호를 입력해주세요.",
  "sign-in-failed": "로그인 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.",
  "user-banned": "로그인이 제한된 계정입니다. 고객센터에 문의해주세요.",
};

export function getSignInErrorCode(error: SignInErrorLike) {
  const code = error.code?.toLowerCase();
  const message = error.message?.toLowerCase() ?? "";

  if (code === "invalid_credentials" || message.includes("invalid login credentials")) {
    return "invalid-credentials";
  }

  if (code === "email_not_confirmed" || message.includes("email not confirmed")) {
    return "email-not-confirmed";
  }

  if (code === "user_banned" || message.includes("user is banned")) {
    return "user-banned";
  }

  return "sign-in-failed";
}

export function getSignInErrorMessage(error?: string) {
  if (!error) {
    return null;
  }

  let decodedError = error;

  try {
    decodedError = decodeURIComponent(error);
  } catch {
    return SIGN_IN_ERROR_MESSAGES["sign-in-failed"];
  }

  if (SIGN_IN_ERROR_MESSAGES[decodedError]) {
    return SIGN_IN_ERROR_MESSAGES[decodedError];
  }

  return SIGN_IN_ERROR_MESSAGES[getSignInErrorCode({ message: decodedError })];
}
