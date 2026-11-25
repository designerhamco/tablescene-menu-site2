import type { MerchantTemplateStatus } from "./order-ready-message";
export type AlimtalkCategory = { code: string; name: string; children: AlimtalkCategory[] };
export type MerchantChannelView = {
  challengeId: string;
  channelId: string;
  categoryCode: string;
  maskedPhone: string | null;
  state: "requesting" | "pending" | "verifying" | "connected" | "failed";
  requestedAt: string;
  expiresAt: string;
  verifiedAt: string | null;
  attemptsRemaining: number;
  sendingEnabled: false;
  verificationMethod?: "kakao_token" | "operator_binding";
  template?: { status: MerchantTemplateStatus; checkedAt: string | null; registrationStarted: boolean };
};
export type MerchantChannelPage = {
  available: boolean;
  connection: MerchantChannelView | null;
  categories: AlimtalkCategory[];
  message?: string;
  existingChannelId?: string;
};
export type MerchantChannelInput =
  | { intent: "request"; channelId: string; adminPhone: string; categoryCode: string }
  | { intent: "verify"; challengeId: string; token: string }
  | { intent: "cancel"; challengeId: string }
  | { intent: "connect-existing" }
  | { intent: "prepare-template" }
  | { intent: "refresh-template" };
export type MerchantChannelResult = {
  connection?: MerchantChannelView;
  notice?: string;
  error?: string;
  field?: "channelId" | "adminPhone" | "categoryCode" | "token";
};
export type MerchantChannelAction = (input: MerchantChannelInput) => Promise<MerchantChannelResult>;

export class MerchantChannelInputError extends Error {
  constructor(message: string, public field?: MerchantChannelResult["field"]) { super(message); }
}
export function normalizeMerchantChannelId(value: unknown) {
  if (typeof value !== "string") throw new MerchantChannelInputError("채널 검색용 ID를 입력해 주세요.", "channelId");
  const id = value.trim();
  if (!/^@[^\s@#{}<>\\/\x00-\x1f]{1,29}$/u.test(id)) {
    throw new MerchantChannelInputError("@로 시작하는 채널 검색용 ID를 30자 이내로 입력해 주세요.", "channelId");
  }
  return id;
}
export function normalizeMerchantAdminPhone(value: unknown) {
  const phone = typeof value === "string" ? value.replace(/[\s-]/g, "") : "";
  if (!/^01[016789][0-9]{7,8}$/.test(phone)) throw new MerchantChannelInputError("채널 관리자 계정의 휴대폰 번호를 입력해 주세요.", "adminPhone");
  return phone;
}
export function normalizeMerchantToken(value: unknown) {
  if (typeof value !== "string" || !/^\d{6}$/.test(value.trim())) {
    throw new MerchantChannelInputError("카카오톡으로 받은 인증번호 6자리를 입력해 주세요.", "token");
  }
  return value.trim();
}
export function findAlimtalkCategory(rows: AlimtalkCategory[], code: string): AlimtalkCategory | undefined {
  for (const row of rows) {
    if (row.code === code) return row;
    const found = findAlimtalkCategory(row.children, code);
    if (found) return found;
  }
}
