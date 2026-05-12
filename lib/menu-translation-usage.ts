export type TranslationUsage = {
  monthly_limit: number;
  monthly_used: number;
  period: string;
  last_translated_at: string | null;
};

export const DEFAULT_MONTHLY_TRANSLATION_LIMIT = 10;

function getJsonObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function getNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function getCurrentTranslationUsagePeriod(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    timeZone: "Asia/Seoul",
  }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value ?? String(now.getUTCFullYear());
  const month = parts.find((part) => part.type === "month")?.value ?? String(now.getUTCMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

export function getTranslationUsage(settings: unknown, now = new Date()): TranslationUsage {
  const usage = getJsonObject(getJsonObject(settings).translation_usage);
  const period = getCurrentTranslationUsagePeriod(now);
  const monthlyLimit = Math.max(0, Math.floor(getNumber(usage.monthly_limit, DEFAULT_MONTHLY_TRANSLATION_LIMIT)));
  const storedPeriod = typeof usage.period === "string" ? usage.period : period;
  const monthlyUsed = storedPeriod === period ? Math.max(0, Math.floor(getNumber(usage.monthly_used, 0))) : 0;
  const lastTranslatedAt = typeof usage.last_translated_at === "string" ? usage.last_translated_at : null;

  return {
    monthly_limit: monthlyLimit,
    monthly_used: monthlyUsed,
    period,
    last_translated_at: lastTranslatedAt,
  };
}

export function isTranslationUsageExceeded(usage: TranslationUsage) {
  return usage.monthly_used >= usage.monthly_limit;
}

export function getIncrementedTranslationUsage(settings: unknown, translatedAt = new Date()): TranslationUsage {
  const usage = getTranslationUsage(settings, translatedAt);

  return {
    ...usage,
    monthly_used: Math.min(usage.monthly_limit, usage.monthly_used + 1),
    last_translated_at: translatedAt.toISOString(),
  };
}
