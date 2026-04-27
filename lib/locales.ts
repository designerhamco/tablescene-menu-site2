import type { SupportedLocale } from "@/lib/supabase/types";

export type { SupportedLocale };

export const DEFAULT_LOCALE: SupportedLocale = "ko";

export const SUPPORTED_LOCALES = ["ko", "en", "zh", "ja"] as const satisfies readonly SupportedLocale[];

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
