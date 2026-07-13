import { MENU_FIELD_LIMITS } from "@/lib/menu-limits";
import type { BadgeType, Database, Json, MenuSectionKey, SupportedLocale } from "@/lib/supabase/types";
import type { MenuSocialLink as TypedMenuSocialLink, SocialLinkInput, SocialLinkType } from "@/lib/social-links";

export type { BadgeType, Json, MenuSectionKey, SocialLinkInput, SocialLinkType, SupportedLocale };

export const MENU_SECTION_KEYS = ["set_menu", "main_menu", "dessert_drink"] as const satisfies readonly MenuSectionKey[];

export const MENU_SECTION_LABELS: Record<MenuSectionKey, string> = {
  set_menu: "세트 메뉴",
  main_menu: "메인 메뉴",
  dessert_drink: "디저트/음료",
};

export type MenuSite = Database["public"]["Tables"]["menu_sites"]["Row"];
export type MenuPage = Database["public"]["Tables"]["menu_pages"]["Row"];
export type MenuCategory = Database["public"]["Tables"]["menu_categories"]["Row"];
export type MenuItem = Database["public"]["Tables"]["menu_items"]["Row"];
export type MenuItemPriceOption = Database["public"]["Tables"]["menu_item_price_options"]["Row"];
export type MenuItemTrait = Database["public"]["Tables"]["menu_item_traits"]["Row"];
export type MenuChef = Database["public"]["Tables"]["menu_chefs"]["Row"];
export type MenuEvent = Database["public"]["Tables"]["menu_events"]["Row"];
export type MenuSocialLink = TypedMenuSocialLink;
export type MenuSiteTranslation = Database["public"]["Tables"]["menu_site_translations"]["Row"];
export type MenuCategoryTranslation = Database["public"]["Tables"]["menu_category_translations"]["Row"];
export type MenuItemTranslation = Database["public"]["Tables"]["menu_item_translations"]["Row"];
export type MenuChefTranslation = Database["public"]["Tables"]["menu_chef_translations"]["Row"];
export type MenuEventTranslation = Database["public"]["Tables"]["menu_event_translations"]["Row"];
export type MenuSocialLinkTranslation = Database["public"]["Tables"]["menu_social_link_translations"]["Row"];

export type PageSettings = {
  intro_enabled: boolean;
  menu_cover_enabled: boolean;
  set_menu_enabled: boolean;
  main_menu_enabled: boolean;
  dessert_drink_enabled: boolean;
  about_enabled: boolean;
  chefs_enabled: boolean;
  events_enabled: boolean;
  social_links_enabled: boolean;
  featured_item_enabled: boolean;
  featured_item_id: string | null;
  featured_slides?: FeaturedSlideSettings[];
};

export type FeaturedSlideSettings = {
  id: string;
  image_url: string | null;
  image_path: string | null;
  featured_item_id: string | null;
  sort_order: number;
};

export type MenuItemTraitInput = {
  label?: unknown;
  value?: unknown;
  max_value?: unknown;
  visible?: unknown;
  sort_order?: unknown;
};

export type NormalizedMenuItemTrait = {
  label: string;
  value: number;
  max_value: number;
  visible: boolean;
  sort_order: number;
};

export type MenuItemTraitValidationResult =
  | { ok: true; trait: NormalizedMenuItemTrait; message: null }
  | { ok: false; trait: null; message: string };

export type EventPricePair = {
  regular: string | null;
  sale: string | null;
};

export type DefaultMenuPageInput = Pick<
  Database["public"]["Tables"]["menu_pages"]["Insert"],
  "title" | "description" | "description_visible" | "legacy_section_key" | "visible" | "sort_order"
>;

export const DEFAULT_PAGE_SETTINGS: PageSettings = {
  intro_enabled: true,
  menu_cover_enabled: true,
  set_menu_enabled: true,
  main_menu_enabled: true,
  dessert_drink_enabled: true,
  about_enabled: true,
  chefs_enabled: true,
  events_enabled: true,
  social_links_enabled: true,
  featured_item_enabled: false,
  featured_item_id: null,
};

const PAGE_SETTING_BOOLEAN_KEYS = [
  "intro_enabled",
  "menu_cover_enabled",
  "set_menu_enabled",
  "main_menu_enabled",
  "dessert_drink_enabled",
  "about_enabled",
  "chefs_enabled",
  "events_enabled",
  "social_links_enabled",
  "featured_item_enabled",
] as const satisfies readonly (keyof PageSettings)[];

export const UNASSIGNED_MENU_PAGE_KEY = "__unassigned__";
export const FEATURED_SLIDES_PAGE_SETTINGS_KEY = "featured_slides";
export const DEFAULT_FEATURED_ITEM_MAX_SLIDES = 5;

// Public menu visibility policy:
// 1. Page-level switches live in menu_sites.page_settings.
// 2. Row/group-level switches use each table's visible column.
// 3. Field-level switches use price_visible, portion_visible, traits_visible,
//    description_visible, and event_price_visible.
export function getDefaultPageSettings(): PageSettings {
  return { ...DEFAULT_PAGE_SETTINGS };
}

function getTrimmedString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getNormalizedSortOrder(value: unknown, fallback: number) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.trunc(value));
  }

  return fallback;
}

export function hasFeaturedSlidesSetting(settings: Json | Partial<PageSettings> | null | undefined) {
  return Boolean(
    settings &&
      typeof settings === "object" &&
      !Array.isArray(settings) &&
      Object.prototype.hasOwnProperty.call(settings, FEATURED_SLIDES_PAGE_SETTINGS_KEY)
  );
}

export function normalizeFeaturedSlideSettings(value: unknown, maxSlides = DEFAULT_FEATURED_ITEM_MAX_SLIDES): FeaturedSlideSettings[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalized: FeaturedSlideSettings[] = [];
  const seenIds = new Set<string>();
  const limit = Math.max(0, Math.trunc(maxSlides));

  for (const [index, rawSlide] of value.entries()) {
    if (normalized.length >= limit) break;
    if (!rawSlide || typeof rawSlide !== "object" || Array.isArray(rawSlide)) continue;

    const slide = rawSlide as Record<string, unknown>;
    const id = getTrimmedString(slide.id);
    if (!id || seenIds.has(id)) continue;

    seenIds.add(id);
    normalized.push({
      id,
      image_url: getTrimmedString(slide.image_url),
      image_path: getTrimmedString(slide.image_path),
      featured_item_id: getTrimmedString(slide.featured_item_id),
      sort_order: getNormalizedSortOrder(slide.sort_order, index),
    });
  }

  return normalized
    .sort((a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id))
    .map((slide, index) => ({ ...slide, sort_order: index }));
}

export function mergePageSettings(settings: Json | Partial<PageSettings> | null | undefined): PageSettings {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    return getDefaultPageSettings();
  }

  const merged = getDefaultPageSettings();
  const input = settings as Record<string, unknown>;

  for (const key of PAGE_SETTING_BOOLEAN_KEYS) {
    if (typeof input[key] === "boolean") {
      merged[key] = input[key];
    }
  }

  merged.featured_item_id =
    typeof input.featured_item_id === "string" && input.featured_item_id.trim() ? input.featured_item_id.trim() : null;

  if (hasFeaturedSlidesSetting(settings)) {
    merged.featured_slides = normalizeFeaturedSlideSettings(input[FEATURED_SLIDES_PAGE_SETTINGS_KEY]);
  }

  return merged;
}

export function getMenuPageTitle(page: Pick<MenuPage, "title" | "legacy_section_key">) {
  const title = page.title.trim();

  if (title) {
    return title;
  }

  if (page.legacy_section_key && page.legacy_section_key in MENU_SECTION_LABELS) {
    return MENU_SECTION_LABELS[page.legacy_section_key as MenuSectionKey];
  }

  return "메뉴";
}

export function sortMenuPages<T extends Pick<MenuPage, "sort_order" | "created_at" | "title">>(pages: T[]) {
  return [...pages].sort((a, b) => {
    if (a.sort_order !== b.sort_order) {
      return a.sort_order - b.sort_order;
    }

    const createdAtCompare = a.created_at.localeCompare(b.created_at);
    return createdAtCompare || a.title.localeCompare(b.title, "ko");
  });
}

export function groupCategoriesByMenuPage<T extends Pick<MenuCategory, "menu_page_id" | "sort_order" | "name">>(
  categories: T[]
) {
  return categories.reduce<Record<string, T[]>>((grouped, category) => {
    const key = category.menu_page_id ?? UNASSIGNED_MENU_PAGE_KEY;
    const next = grouped[key] ?? [];
    next.push(category);
    grouped[key] = next.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "ko"));
    return grouped;
  }, {});
}

export function getCategoriesForMenuPage<T extends Pick<MenuCategory, "menu_page_id" | "sort_order" | "name">>(
  pageId: string | null,
  categories: T[]
) {
  const key = pageId ?? UNASSIGNED_MENU_PAGE_KEY;
  return groupCategoriesByMenuPage(categories)[key] ?? [];
}

export function getDefaultMenuPages(): DefaultMenuPageInput[] {
  return [
    {
      title: "대표 메뉴",
      description: null,
      description_visible: true,
      legacy_section_key: null,
      visible: true,
      sort_order: 0,
    },
  ];
}

export function formatPortionLabel(item: Pick<MenuItem, "portion_label" | "portion_visible">) {
  if (item.portion_visible === false) {
    return null;
  }

  const portionLabel = item.portion_label?.trim();
  return portionLabel || null;
}

export function formatMenuPrice(item: Pick<MenuItem, "price_label" | "price_visible"> & { price: number | null }) {
  if (item.price_visible === false) {
    return null;
  }

  const priceLabel = item.price_label?.trim();

  if (priceLabel) {
    return priceLabel;
  }

  if (typeof item.price !== "number") {
    return null;
  }

  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(item.price);
}

export function shouldShowMenuItemTraits(
  item: Pick<MenuItem, "traits_visible">,
  traits: Pick<MenuItemTrait, "visible">[] | null | undefined
) {
  if (item.traits_visible === false) {
    return false;
  }

  return Boolean(traits?.some((trait) => trait.visible));
}

export function formatEventRegularPrice(
  event: Pick<MenuEvent, "event_price_visible" | "event_regular_price_label">
) {
  if (event.event_price_visible === false) {
    return null;
  }

  return event.event_regular_price_label?.trim() || null;
}

export function formatEventSalePrice(event: Pick<MenuEvent, "event_price_visible" | "event_sale_price_label">) {
  if (event.event_price_visible === false) {
    return null;
  }

  return event.event_sale_price_label?.trim() || null;
}

export function formatEventPricePair(
  event: Pick<MenuEvent, "event_price_visible" | "event_regular_price_label" | "event_sale_price_label">
): EventPricePair | null {
  if (event.event_price_visible === false) {
    return null;
  }

  const regular = formatEventRegularPrice(event);
  const sale = formatEventSalePrice(event);

  if (!regular && !sale) {
    return null;
  }

  return { regular, sale };
}

function toInteger(value: unknown, fallback: number) {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isInteger(parsed) ? parsed : fallback;
  }

  return fallback;
}

export function normalizeMenuItemTrait(input: MenuItemTraitInput): NormalizedMenuItemTrait {
  const label = typeof input.label === "string" ? input.label.trim() : "";
  const maxValue = toInteger(input.max_value, MENU_FIELD_LIMITS.menuItemTraits.defaultMaxValue);
  const value = toInteger(input.value, MENU_FIELD_LIMITS.menuItemTraits.minValue);
  const sortOrder = toInteger(input.sort_order, 0);

  return {
    label,
    value,
    max_value: maxValue,
    visible: typeof input.visible === "boolean" ? input.visible : true,
    sort_order: sortOrder,
  };
}

export function validateMenuItemTrait(input: MenuItemTraitInput): MenuItemTraitValidationResult {
  const trait = normalizeMenuItemTrait(input);

  if (!trait.label) {
    return { ok: false, trait: null, message: "지표 이름을 입력해주세요." };
  }

  if (trait.label.length > MENU_FIELD_LIMITS.menuItemTraits.label) {
    return { ok: false, trait: null, message: `지표 이름은 최대 ${MENU_FIELD_LIMITS.menuItemTraits.label}자까지 입력 가능합니다.` };
  }

  if (trait.value < MENU_FIELD_LIMITS.menuItemTraits.minValue || trait.value > MENU_FIELD_LIMITS.menuItemTraits.maxValue) {
    return {
      ok: false,
      trait: null,
      message: `지표 값은 ${MENU_FIELD_LIMITS.menuItemTraits.minValue}부터 ${MENU_FIELD_LIMITS.menuItemTraits.maxValue}까지 선택할 수 있습니다.`,
    };
  }

  if (trait.max_value !== MENU_FIELD_LIMITS.menuItemTraits.defaultMaxValue) {
    return { ok: false, trait: null, message: `최대 값은 ${MENU_FIELD_LIMITS.menuItemTraits.defaultMaxValue}로 저장됩니다.` };
  }

  if (trait.value > trait.max_value) {
    return { ok: false, trait: null, message: "지표 값은 최대 값보다 클 수 없습니다." };
  }

  return { ok: true, trait, message: null };
}
