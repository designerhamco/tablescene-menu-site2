export type LocalizationSaveMode = "languages" | "translations" | "all";

export function getLocalizationSaveMode({
  hasLocaleChanges,
  hasTranslationChanges,
}: {
  hasLocaleChanges: boolean;
  hasTranslationChanges: boolean;
}): LocalizationSaveMode {
  if (hasLocaleChanges && hasTranslationChanges) return "all";
  if (hasLocaleChanges) return "languages";
  return "translations";
}
