import {
  getPaymentProductDefinition,
  type PaymentProductKey,
} from "@/lib/payments";

export type PromotionCodeType = "public";

export type AppliedPromotionSnapshot = {
  promotionCode: "OPEN";
  promotionName: "오픈 할인";
  promotionType: PromotionCodeType;
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
};

type PromotionValidationInput = {
  productKey: string | null | undefined;
  promotionCode?: unknown;
  promotion?: unknown;
};

export const OPEN_PROMOTION_CODE = "OPEN";
export const OPEN_PROMOTION_NAME = "오픈 할인";

const OPEN_PROMOTION_PRODUCT_KEYS = new Set<PaymentProductKey>([
  "business_basic_single_monthly",
  "business_basic_single_yearly",
  "business_basic_multi_monthly",
  "business_basic_multi_yearly",
  "business_basic_monthly",
  "business_basic_yearly",
  "business_display_monthly",
  "business_display_yearly",
]);

function positiveInteger(value: unknown) {
  const numericValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numericValue) ? Math.max(0, Math.floor(numericValue)) : 0;
}

export function normalizePromotionCode(value: unknown) {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

export function isOpenPromotionProduct(productKey: string | null | undefined): productKey is PaymentProductKey {
  return Boolean(productKey && OPEN_PROMOTION_PRODUCT_KEYS.has(productKey as PaymentProductKey));
}

export function getOpenPromotionSnapshot(productKey: string | null | undefined): AppliedPromotionSnapshot | null {
  if (!isOpenPromotionProduct(productKey)) return null;

  const product = getPaymentProductDefinition(productKey);
  if (!product) return null;

  const finalAmount = positiveInteger(product.amount);
  const originalAmount = Math.max(finalAmount, positiveInteger(product.regular_amount));
  const discountAmount = Math.max(0, originalAmount - finalAmount);

  return {
    promotionCode: OPEN_PROMOTION_CODE,
    promotionName: OPEN_PROMOTION_NAME,
    promotionType: "public",
    originalAmount,
    discountAmount,
    finalAmount,
  };
}

export function getPromotionApplyResult(productKey: string | null | undefined, promotionCode: unknown) {
  const normalizedCode = normalizePromotionCode(promotionCode);

  if (!normalizedCode) {
    return { ok: false as const, message: "프로모션 코드를 입력해주세요.", promotion: null };
  }

  if (normalizedCode !== OPEN_PROMOTION_CODE || !isOpenPromotionProduct(productKey)) {
    return { ok: false as const, message: "사용할 수 없는 프로모션 코드입니다.", promotion: null };
  }

  const promotion = getOpenPromotionSnapshot(productKey);
  if (!promotion) {
    return { ok: false as const, message: "사용할 수 없는 프로모션 코드입니다.", promotion: null };
  }

  return { ok: true as const, message: "오픈 할인이 적용되었습니다.", promotion };
}

function isPromotionSnapshotMatching(value: unknown, expected: AppliedPromotionSnapshot) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;

  const record = value as Record<string, unknown>;
  return normalizePromotionCode(record.promotionCode) === expected.promotionCode
    && record.promotionName === expected.promotionName
    && record.promotionType === expected.promotionType
    && positiveInteger(record.originalAmount) === expected.originalAmount
    && positiveInteger(record.discountAmount) === expected.discountAmount
    && positiveInteger(record.finalAmount) === expected.finalAmount;
}

export function validatePromotionForOrder({
  productKey,
  promotionCode,
  promotion,
}: PromotionValidationInput):
  | { ok: true; promotion: AppliedPromotionSnapshot | null }
  | { ok: false; message: string } {
  const normalizedCode = normalizePromotionCode(promotionCode);

  if (!normalizedCode && !promotion) {
    return { ok: true, promotion: null };
  }

  const applyResult = getPromotionApplyResult(productKey, normalizedCode);
  if (!applyResult.ok || !applyResult.promotion) {
    return { ok: false, message: applyResult.message };
  }

  if (promotion && !isPromotionSnapshotMatching(promotion, applyResult.promotion)) {
    return { ok: false, message: "프로모션 적용 금액을 다시 확인해주세요." };
  }

  return { ok: true, promotion: applyResult.promotion };
}
