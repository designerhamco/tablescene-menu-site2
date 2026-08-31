import { businessBasicMonthlyProduct } from "@/lib/payments";

export const BUSINESS_FREE_TRIAL_DAYS = 30;
export const BUSINESS_FREE_TRIAL_FEATURE_ENV = "BUSINESS_SINGLE_MONTHLY_FREE_TRIAL_ENABLED";

export function isBusinessFreeTrialEnabled(
  environment: Record<string, string | undefined> = process.env,
) {
  return environment[BUSINESS_FREE_TRIAL_FEATURE_ENV]?.trim().toLowerCase() === "true";
}

export function isBusinessFreeTrialProduct(productKey: string) {
  return productKey === businessBasicMonthlyProduct.product_key;
}

export function getBusinessFreeTrialPeriod(now = new Date()) {
  const startsAt = new Date(now);
  const endsAt = new Date(startsAt.getTime() + BUSINESS_FREE_TRIAL_DAYS * 24 * 60 * 60 * 1000);

  return {
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
  };
}

export function formatBusinessFreeTrialFirstBillingDate(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;

  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}
