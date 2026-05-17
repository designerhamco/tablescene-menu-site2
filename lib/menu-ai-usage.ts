export type AiUsageType = "ai_description" | "ai_menu_cleanup" | "ai_translate_full" | "ai_translate_partial";
export type TableScenePlanKey = "basic" | "display";

export type AiUsage = {
  used: number;
  limit: number;
  period: string;
  last_used_at: string | null;
};

export type AiUsageSnapshot = Record<AiUsageType, AiUsage>;

export const AI_USAGE_LIMITS = {
  basic: {
    ai_description: 5,
    ai_menu_cleanup: 1,
    ai_translate_full: 1,
    ai_translate_partial: 5,
  },
  display: {
    ai_description: 10,
    ai_menu_cleanup: 2,
    ai_translate_full: 1,
    ai_translate_partial: 5,
  },
} as const satisfies Record<TableScenePlanKey, Record<AiUsageType, number>>;

const AI_USAGE_TYPES = ["ai_description", "ai_menu_cleanup", "ai_translate_full", "ai_translate_partial"] as const satisfies readonly AiUsageType[];

function getJsonObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? { ...(value as Record<string, unknown>) } : {};
}

function getNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function normalizeTableScenePlanKey(productKey?: string | null): TableScenePlanKey {
  if (productKey === "large_screen" || productKey === "display") return "display";
  return "basic";
}

export function getCurrentAiUsagePeriod(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    timeZone: "Asia/Seoul",
  }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value ?? String(now.getUTCFullYear());
  const month = parts.find((part) => part.type === "month")?.value ?? String(now.getUTCMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

function getLegacyTranslationUsage(settings: unknown, period: string) {
  const usage = getJsonObject(getJsonObject(settings).translation_usage);
  const storedPeriod = typeof usage.period === "string" ? usage.period : period;

  if (storedPeriod !== period) {
    return { used: 0, lastUsedAt: null };
  }

  return {
    used: Math.max(0, Math.floor(getNumber(usage.monthly_used, 0))),
    lastUsedAt: typeof usage.last_translated_at === "string" ? usage.last_translated_at : null,
  };
}

export function getAiUsage(settings: unknown, planKey: TableScenePlanKey, usageType: AiUsageType, now = new Date()): AiUsage {
  const period = getCurrentAiUsagePeriod(now);
  const settingsObject = getJsonObject(settings);
  const aiUsage = getJsonObject(settingsObject.ai_usage);
  const usageRecord = getJsonObject(aiUsage[usageType]);
  const storedPeriod = typeof usageRecord.period === "string" ? usageRecord.period : typeof aiUsage.period === "string" ? aiUsage.period : period;
  const limit = AI_USAGE_LIMITS[planKey][usageType];
  const fallbackUsage = usageType === "ai_translate_full" ? getLegacyTranslationUsage(settings, period) : { used: 0, lastUsedAt: null };
  const used = storedPeriod === period ? Math.max(0, Math.floor(getNumber(usageRecord.used, fallbackUsage.used))) : 0;
  const lastUsedAt = typeof usageRecord.last_used_at === "string" ? usageRecord.last_used_at : fallbackUsage.lastUsedAt;

  return {
    used,
    limit,
    period,
    last_used_at: lastUsedAt,
  };
}

export function getAiUsageSnapshot(settings: unknown, planKey: TableScenePlanKey, now = new Date()): AiUsageSnapshot {
  return AI_USAGE_TYPES.reduce((snapshot, usageType) => {
    snapshot[usageType] = getAiUsage(settings, planKey, usageType, now);
    return snapshot;
  }, {} as AiUsageSnapshot);
}

export function isAiUsageExceeded(usage: AiUsage) {
  return usage.used >= usage.limit;
}

export function getSettingsWithIncrementedAiUsage(settings: unknown, planKey: TableScenePlanKey, usageType: AiUsageType, usedAt = new Date()) {
  const settingsObject = getJsonObject(settings);
  const aiUsage = getJsonObject(settingsObject.ai_usage);
  const currentUsage = getAiUsage(settingsObject, planKey, usageType, usedAt);
  const nextUsage = {
    used: Math.min(currentUsage.limit, currentUsage.used + 1),
    limit: currentUsage.limit,
    period: currentUsage.period,
    last_used_at: usedAt.toISOString(),
  };

  const nextSettings = {
    ...settingsObject,
    ai_usage: {
      ...aiUsage,
      period: currentUsage.period,
      [usageType]: nextUsage,
    },
  };

  if (usageType === "ai_translate_full") {
    nextSettings.translation_usage = {
      monthly_limit: nextUsage.limit,
      monthly_used: nextUsage.used,
      period: nextUsage.period,
      last_translated_at: nextUsage.last_used_at,
    };
  }

  return nextSettings;
}
