import type { SupportedLocale } from "@/lib/supabase/types";

export type { SupportedLocale };

export const DEFAULT_LOCALE: SupportedLocale = "ko";

export const SUPPORTED_LOCALES = ["ko", "en", "zh", "ja"] as const satisfies readonly SupportedLocale[];
export const TRANSLATABLE_LOCALES = ["en", "zh", "ja"] as const satisfies readonly SupportedLocale[];
export const DEFAULT_ENABLED_LOCALES = [DEFAULT_LOCALE] as const satisfies readonly SupportedLocale[];

export const LOCALE_LABELS: Record<SupportedLocale, string> = {
  ko: "한국어",
  en: "English",
  zh: "中文",
  ja: "日本語",
};

export function isSupportedLocale(value: unknown): value is SupportedLocale {
  return typeof value === "string" && SUPPORTED_LOCALES.includes(value as SupportedLocale);
}

export function normalizeLocale(value: unknown): SupportedLocale {
  return isSupportedLocale(value) ? value : DEFAULT_LOCALE;
}

function getJsonObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function uniqueLocales(locales: SupportedLocale[]) {
  return locales.filter((locale, index) => locales.indexOf(locale) === index);
}

export function getEnabledLocales(settings: unknown): SupportedLocale[] {
  const settingsObject = getJsonObject(settings);
  const enabledLocales = settingsObject.enabled_locales;

  if (Array.isArray(enabledLocales)) {
    const normalizedLocales = enabledLocales.map(normalizeLocale).filter((locale) => locale !== DEFAULT_LOCALE);
    return uniqueLocales([DEFAULT_LOCALE, ...normalizedLocales]);
  }

  const localeMap = getJsonObject(settingsObject.locales);
  const localesFromMap = SUPPORTED_LOCALES.filter((locale) => localeMap[locale] === true && locale !== DEFAULT_LOCALE);

  if (localesFromMap.length > 0) {
    return uniqueLocales([DEFAULT_LOCALE, ...localesFromMap]);
  }

  return [...DEFAULT_ENABLED_LOCALES];
}

export function getEffectiveLocale(requestedLocale: SupportedLocale, enabledLocales: readonly SupportedLocale[]) {
  return enabledLocales.includes(requestedLocale) ? requestedLocale : DEFAULT_LOCALE;
}

export function getLocalizedValue<T extends string | null | undefined>(
  defaultValue: T,
  translationValue: T,
): T {
  if (typeof translationValue === "string" && translationValue.trim().length > 0) {
    return translationValue;
  }

  return defaultValue;
}

export function getMenuLanguageHref(pathname: string, locale: SupportedLocale) {
  const params = new URLSearchParams({ lang: locale });
  return `${pathname}?${params.toString()}`;
}
