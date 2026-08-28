export type AiFeatureKey = "description_write" | "partial_translation" | "menu_cleanup" | "full_translation";
export type AiCreditPackKey = "ai_credit_pack_10" | "ai_credit_pack_30" | "ai_credit_pack_60";

export const AI_FIRST_MENU_WELCOME_CREDITS = 6;

export const AI_FEATURE_CREDIT_COSTS = {
  description_write: 1,
  partial_translation: 1,
  menu_cleanup: 3,
  full_translation: 3,
} as const satisfies Record<AiFeatureKey, number>;

export const AI_CREDIT_PACKS = {
  ai_credit_pack_10: {
    productKey: "ai_credit_pack_10",
    name: "AI 크레딧 10개",
    paymentType: "one_time",
    amount: 1500,
    credits: 10,
    currency: "KRW",
  },
  ai_credit_pack_30: {
    productKey: "ai_credit_pack_30",
    name: "AI 크레딧 30개",
    paymentType: "one_time",
    amount: 3900,
    credits: 30,
    currency: "KRW",
  },
  ai_credit_pack_60: {
    productKey: "ai_credit_pack_60",
    name: "AI 크레딧 60개",
    paymentType: "one_time",
    amount: 6900,
    credits: 60,
    currency: "KRW",
  },
} as const satisfies Record<
  AiCreditPackKey,
  {
    productKey: AiCreditPackKey;
    name: string;
    paymentType: "one_time";
    amount: number;
    credits: number;
    currency: "KRW";
  }
>;

export type AiCreditPack = (typeof AI_CREDIT_PACKS)[AiCreditPackKey];

export type AiCreditBalance = {
  accountGrantedCredits: number;
  accountPurchasedCredits: number;
  accountUsedCredits: number;
  accountRemainingCredits: number;
  totalRemainingCredits: number;
  includedCredits: number;
  purchasedCredits: number;
  usedCredits: number;
  remainingCredits: number;
};

export function getAiCreditPack(productKey: string | null | undefined): AiCreditPack | null {
  if (!productKey || !(productKey in AI_CREDIT_PACKS)) return null;
  return AI_CREDIT_PACKS[productKey as AiCreditPackKey];
}

export function getAiFeatureCreditCost(featureKey: AiFeatureKey) {
  return AI_FEATURE_CREDIT_COSTS[featureKey];
}

export function formatAiCredits(value: number) {
  return `${Math.max(0, Math.floor(value)).toLocaleString("ko-KR")}개`;
}
