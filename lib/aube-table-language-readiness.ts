import { DEFAULT_LOCALE, type SupportedLocale } from "@/lib/locales";

type TranslationRow = {
  locale: string;
  status: string;
};

type SiteSource = {
  menu_cover_title?: string | null;
  restaurant_name?: string | null;
  menu_cover_description?: string | null;
  brand_description?: string | null;
  description?: string | null;
};

type SiteTranslation = TranslationRow & {
  menu_cover_title?: string | null;
  restaurant_name?: string | null;
  menu_cover_description?: string | null;
  brand_description?: string | null;
  description?: string | null;
};

type PageSource = {
  id: string;
  title: string;
  description?: string | null;
  description_visible?: boolean;
  visible?: boolean;
};

type PageTranslation = TranslationRow & {
  menu_page_id: string;
  title?: string | null;
  description?: string | null;
};

type CategorySource = {
  id: string;
  name: string;
  description?: string | null;
  description_visible?: boolean;
  course_price_label?: string | null;
  course_price_visible?: boolean;
  course_price_description?: string | null;
  course_price_description_visible?: boolean;
  visible?: boolean;
};

type CategoryTranslation = TranslationRow & {
  category_id: string;
  name?: string | null;
  description?: string | null;
  course_price_label?: string | null;
  course_price_description?: string | null;
};

type ItemSource = {
  id: string;
  name: string;
  set_name?: string | null;
  description?: string | null;
  price_label?: string | null;
  price_visible?: boolean;
  visible?: boolean;
};

type ItemTranslation = TranslationRow & {
  item_id: string;
  name?: string | null;
  set_name?: string | null;
  description?: string | null;
  price_label?: string | null;
};

type PriceOptionSource = {
  id: string;
  label: string;
  price_label?: string | null;
  visible?: boolean;
};

type PriceOptionTranslation = TranslationRow & {
  price_option_id: string;
  label?: string | null;
  price_label?: string | null;
};

export type AubeTableLanguageReadinessInput = {
  configuredLocales: SupportedLocale[];
  coverEnabled: boolean;
  site: SiteSource;
  pages: PageSource[];
  categories: CategorySource[];
  items: ItemSource[];
  priceOptions: PriceOptionSource[];
  siteTranslations: SiteTranslation[];
  pageTranslations: PageTranslation[];
  categoryTranslations: CategoryTranslation[];
  itemTranslations: ItemTranslation[];
  priceOptionTranslations: PriceOptionTranslation[];
};

function hasText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

function translatedFieldIsReady(sourceValue: unknown, translatedValue: unknown) {
  return !hasText(sourceValue) || hasText(translatedValue);
}

function isCompleted(row: TranslationRow | undefined) {
  return row?.status === "completed";
}

function getRowByLocaleAndId<T extends TranslationRow>(
  rows: T[],
  locale: SupportedLocale,
  idKey: keyof T,
  id: string,
) {
  return rows.find((row) => row.locale === locale && row[idKey] === id);
}

function isLocaleReady(input: AubeTableLanguageReadinessInput, locale: SupportedLocale) {
  if (locale === DEFAULT_LOCALE) return true;

  if (input.coverEnabled) {
    const siteTranslation = input.siteTranslations.find((row) => row.locale === locale);
    if (!isCompleted(siteTranslation)) return false;

    const titleReady = hasText(input.site.menu_cover_title)
      ? translatedFieldIsReady(input.site.menu_cover_title, siteTranslation?.menu_cover_title)
      : translatedFieldIsReady(input.site.restaurant_name, siteTranslation?.restaurant_name);
    const descriptionReady = hasText(input.site.menu_cover_description)
      ? translatedFieldIsReady(input.site.menu_cover_description, siteTranslation?.menu_cover_description)
      : hasText(input.site.brand_description)
        ? translatedFieldIsReady(input.site.brand_description, siteTranslation?.brand_description)
        : translatedFieldIsReady(input.site.description, siteTranslation?.description);
    if (!titleReady || !descriptionReady) return false;
  }

  for (const page of input.pages.filter((row) => row.visible !== false)) {
    const translation = getRowByLocaleAndId(input.pageTranslations, locale, "menu_page_id", page.id);
    if (
      !isCompleted(translation) ||
      !translatedFieldIsReady(page.title, translation?.title) ||
      (page.description_visible !== false && !translatedFieldIsReady(page.description, translation?.description))
    ) return false;
  }

  for (const category of input.categories.filter((row) => row.visible !== false)) {
    const translation = getRowByLocaleAndId(input.categoryTranslations, locale, "category_id", category.id);
    if (
      !isCompleted(translation) ||
      !translatedFieldIsReady(category.name, translation?.name) ||
      (category.description_visible !== false && !translatedFieldIsReady(category.description, translation?.description)) ||
      (category.course_price_visible !== false && !translatedFieldIsReady(category.course_price_label, translation?.course_price_label)) ||
      (category.course_price_description_visible !== false && !translatedFieldIsReady(category.course_price_description, translation?.course_price_description))
    ) return false;
  }

  for (const item of input.items.filter((row) => row.visible !== false)) {
    const translation = getRowByLocaleAndId(input.itemTranslations, locale, "item_id", item.id);
    if (
      !isCompleted(translation) ||
      !translatedFieldIsReady(item.name, translation?.name) ||
      !translatedFieldIsReady(item.set_name, translation?.set_name) ||
      !translatedFieldIsReady(item.description, translation?.description) ||
      (item.price_visible !== false && !translatedFieldIsReady(item.price_label, translation?.price_label))
    ) return false;
  }

  for (const option of input.priceOptions.filter((row) => row.visible !== false)) {
    const translation = getRowByLocaleAndId(input.priceOptionTranslations, locale, "price_option_id", option.id);
    if (
      !isCompleted(translation) ||
      !translatedFieldIsReady(option.label, translation?.label) ||
      !translatedFieldIsReady(option.price_label, translation?.price_label)
    ) return false;
  }

  return true;
}

export function getReadyAubeTableLocales(input: AubeTableLanguageReadinessInput): SupportedLocale[] {
  const configuredLocales = input.configuredLocales.filter((locale, index) => input.configuredLocales.indexOf(locale) === index);
  const readyLocales = configuredLocales.filter((locale) => isLocaleReady(input, locale));
  return readyLocales.includes(DEFAULT_LOCALE) ? readyLocales : [DEFAULT_LOCALE, ...readyLocales];
}
