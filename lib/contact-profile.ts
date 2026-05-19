export type ContactProfileInput = {
  contactName: unknown;
  contactPhone: unknown;
  notificationEmail: unknown;
};

export type NormalizedContactProfileInput = {
  contactName: string;
  contactPhone: string;
  notificationEmail: string;
};

export type ContactProfileStorageError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

export type ContactProfileStorageErrorResult = {
  debugCode: string;
  message: string;
};

export const CONTACT_PROFILE_MESSAGES = {
  invalidRequest: "담당자 정보 요청 형식을 확인해주세요.",
  unauthenticated: "로그인이 필요합니다.",
  invalidName: "담당자명은 2~20자로 입력해주세요.",
  invalidPhone: "연락처 형식을 확인해주세요. 예: 010-1234-5678",
  missingEmail: "문의/알림 수신 이메일을 입력해주세요.",
  invalidEmail: "올바른 이메일 주소를 입력해주세요.",
  saveFailed: "담당자 정보 저장에 실패했습니다. 잠시 후 다시 시도해주세요.",
  missingTable: "담당자 정보 저장 테이블이 아직 적용되지 않았습니다. 관리자에게 문의해주세요.",
  missingColumn: "담당자 정보 저장 컬럼이 최신 상태가 아닙니다. 관리자에게 문의해주세요.",
  permissionDenied: "담당자 정보 저장 권한이 설정되지 않았습니다. 관리자에게 문의해주세요.",
  invalidStorageValue: "담당자 정보 값이 저장 정책과 맞지 않습니다. 입력값을 확인해주세요.",
  saved: "담당자 정보가 저장되었습니다.",
} as const;

const EMAIL_PATTERN = /^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$/i;
const CONTACT_NAME_PATTERN = /^[가-힣A-Za-z0-9 _.\-·]+$/;
const PHONE_INPUT_PATTERN = /^[0-9\-\s]*$/;

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeContactProfileInput(input: ContactProfileInput): NormalizedContactProfileInput {
  const normalizedPhone = normalizeKoreanPhoneNumber(input.contactPhone);

  return {
    contactName: normalizeString(input.contactName),
    contactPhone: normalizedPhone ?? normalizeString(input.contactPhone),
    notificationEmail: normalizeString(input.notificationEmail).toLowerCase(),
  };
}

export function validateContactName(contactName: string) {
  if (
    contactName.length < 2
    || contactName.length > 20
    || contactName.includes("http://")
    || contactName.includes("https://")
    || !CONTACT_NAME_PATTERN.test(contactName)
  ) {
    return CONTACT_PROFILE_MESSAGES.invalidName;
  }

  return null;
}

export function normalizeKoreanPhoneNumber(value: unknown) {
  const rawValue = normalizeString(value);

  if (!rawValue) {
    return "";
  }

  if (!PHONE_INPUT_PATTERN.test(rawValue)) {
    return null;
  }

  const digits = rawValue.replace(/\D/g, "");

  if (!digits || /^0+$/.test(digits)) {
    return null;
  }

  if (/^01[016789]\d{7,8}$/.test(digits)) {
    return digits.length === 10
      ? `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
      : `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }

  if (/^02\d{7,8}$/.test(digits)) {
    return digits.length === 9
      ? `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`
      : `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  if (/^0[3-9]\d\d{7,8}$/.test(digits)) {
    return digits.length === 10
      ? `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
      : `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }

  if (/^1[5-8]\d{6}$/.test(digits)) {
    return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  }

  return null;
}

export function validateKoreanPhoneNumber(contactPhone: string) {
  return contactPhone === "" || normalizeKoreanPhoneNumber(contactPhone) === contactPhone
    ? null
    : CONTACT_PROFILE_MESSAGES.invalidPhone;
}

export function validateNotificationEmail(notificationEmail: string) {
  if (!notificationEmail || notificationEmail.length > 100 || !EMAIL_PATTERN.test(notificationEmail)) {
    return CONTACT_PROFILE_MESSAGES.invalidEmail;
  }

  return null;
}

export function validateContactProfileInput(input: NormalizedContactProfileInput) {
  const nameError = validateContactName(input.contactName);

  if (nameError) {
    return nameError;
  }

  const phoneError = validateKoreanPhoneNumber(input.contactPhone);

  if (phoneError) {
    return phoneError;
  }

  const emailError = validateNotificationEmail(input.notificationEmail);

  if (emailError) {
    return emailError;
  }

  return null;
}

export function mapContactProfileStorageError(error: ContactProfileStorageError): ContactProfileStorageErrorResult {
  const message = error.message ?? "";

  if (error.code === "23514" || error.code === "23502" || error.code === "22P02") {
    if (message.includes("user_contact_profiles_contact_phone_check")) {
      return {
        debugCode: "CONTACT_PROFILE_PHONE_CONSTRAINT_FAILED",
        message: CONTACT_PROFILE_MESSAGES.invalidPhone,
      };
    }

    if (message.includes("user_contact_profiles_contact_name")) {
      return {
        debugCode: "CONTACT_PROFILE_NAME_CONSTRAINT_FAILED",
        message: CONTACT_PROFILE_MESSAGES.invalidName,
      };
    }

    if (message.includes("user_contact_profiles_notification_email")) {
      return {
        debugCode: "CONTACT_PROFILE_EMAIL_CONSTRAINT_FAILED",
        message: CONTACT_PROFILE_MESSAGES.invalidEmail,
      };
    }

    return {
      debugCode: "CONTACT_PROFILE_CONSTRAINT_FAILED",
      message: CONTACT_PROFILE_MESSAGES.invalidStorageValue,
    };
  }

  if (error.code === "42P01" || message.includes("relation \"user_contact_profiles\" does not exist")) {
    return {
      debugCode: "CONTACT_PROFILE_TABLE_MISSING",
      message: CONTACT_PROFILE_MESSAGES.missingTable,
    };
  }

  if (error.code === "42703") {
    return {
      debugCode: "CONTACT_PROFILE_COLUMN_MISSING",
      message: CONTACT_PROFILE_MESSAGES.missingColumn,
    };
  }

  if (error.code === "42501" || message.includes("permission denied")) {
    return {
      debugCode: "CONTACT_PROFILE_PERMISSION_DENIED",
      message: CONTACT_PROFILE_MESSAGES.permissionDenied,
    };
  }

  return {
    debugCode: "CONTACT_PROFILE_SAVE_FAILED",
    message: CONTACT_PROFILE_MESSAGES.saveFailed,
  };
}
