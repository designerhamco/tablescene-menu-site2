export const inquiryCategoryOptions = [
  { value: "general", label: "일반 문의" },
  { value: "billing", label: "결제/구독" },
  { value: "menu_management", label: "메뉴판 관리" },
  { value: "business_verification", label: "사업자 인증" },
  { value: "bug", label: "오류 신고" },
  { value: "ai_credit", label: "AI 크레딧" },
  { value: "other", label: "기타" },
] as const;

export type InquiryCategory = (typeof inquiryCategoryOptions)[number]["value"];

export function normalizeInquiryCategory(value: unknown): InquiryCategory {
  return inquiryCategoryOptions.some((option) => option.value === value)
    ? (value as InquiryCategory)
    : "general";
}

export function getInquiryCategoryLabel(value: unknown) {
  const category = normalizeInquiryCategory(value);
  return inquiryCategoryOptions.find((option) => option.value === category)?.label ?? "일반 문의";
}
