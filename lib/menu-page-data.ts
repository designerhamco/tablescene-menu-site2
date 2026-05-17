import type { PublicMenuTemplateProps } from "@/components/menu-templates/MenuTemplateRenderer";
import { DEFAULT_LOCALE, getEffectiveLocale, getEnabledLocales, getLocalizedValue, type SupportedLocale } from "@/lib/locales";
import { getMenuPublicServiceType } from "@/lib/menu-public-capabilities";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { mergePageSettings, sortMenuPages } from "@/types/menu";

type MenuSite = PublicMenuTemplateProps["menuSite"] &
  Pick<Database["public"]["Tables"]["menu_sites"]["Row"], "status" | "user_id">;

type MenuPageData = Omit<PublicMenuTemplateProps, "mode"> & {
  menuSite: MenuSite;
};

type MenuPage = PublicMenuTemplateProps["pages"][number];
type MenuCategory = PublicMenuTemplateProps["categories"][number];
type MenuItem = PublicMenuTemplateProps["items"][number];
type MenuItemPriceOption = PublicMenuTemplateProps["priceOptions"][number];
type MenuItemTrait = PublicMenuTemplateProps["traits"][number];
type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type MenuSiteTranslation = Database["public"]["Tables"]["menu_site_translations"]["Row"];
type MenuPageTranslation = Database["public"]["Tables"]["menu_page_translations"]["Row"];
type MenuCategoryTranslation = Database["public"]["Tables"]["menu_category_translations"]["Row"];
type MenuItemTranslation = Database["public"]["Tables"]["menu_item_translations"]["Row"];
type MenuItemPriceOptionTranslation = Database["public"]["Tables"]["menu_item_price_option_translations"]["Row"];
type MenuItemTraitTranslation = Database["public"]["Tables"]["menu_item_trait_translations"]["Row"];
type MenuEventTranslation = Database["public"]["Tables"]["menu_event_translations"]["Row"];
type MenuChefTranslation = Database["public"]["Tables"]["menu_chef_translations"]["Row"];
type MenuSocialLinkTranslation = Database["public"]["Tables"]["menu_social_link_translations"]["Row"];

type MenuPageDataOptions = {
  locale?: SupportedLocale;
};

const baseSiteSelect =
  "id, user_id, name, slug, template_key, status, description, logo_url, cover_image_url, intro_image_url, brand_color, business_name, business_address, business_phone, restaurant_name, restaurant_category, restaurant_address, restaurant_phone, intro_title, intro_description, brand_description, menu_cover_title, menu_cover_description, about_description, opening_hours, map_url, settings, page_settings";
const siteSelect = baseSiteSelect
  .replace("template_key", "template_key, template_category")
  .replace("restaurant_category", "restaurant_category, restaurant_type")
  .replace("menu_cover_title", "menu_cover_label, menu_cover_title");

const pageSelect = "id, title, description, description_visible, legacy_section_key, visible, sort_order, created_at";
const categorySelect = "id, menu_page_id, name, description, description_visible, sort_order, visible";
const itemSelect =
  "id, category_id, name, set_name, description, price, price_label, price_visible, portion_label, portion_visible, image_url, badge, badge_label, badge_type, recommended, origin_info, is_best, is_sold_out, traits_visible, visible, sort_order";
const legacyItemSelect =
  "id, category_id, name, set_name, description, price, price_label, price_visible, portion_label, portion_visible, image_url, badge, badge_type, recommended, origin_info, is_best, is_sold_out, traits_visible, visible, sort_order";
const priceOptionSelect = "id, menu_item_id, label, price, price_label, visible, sort_order";
const traitSelect = "id, menu_item_id, label, value, max_value, visible, sort_order";
const eventSelect =
  "id, event_title, event_subtitle, event_description, event_period, event_image_url, event_benefit, event_detail, event_regular_price_label, event_sale_price_label, event_price_visible, visible, sort_order";
const chefSelect = "id, chef_name, chef_role, chef_description, chef_image_url, visible, sort_order";
const socialLinkSelect = "id, type, label, display_name, url, visible, sort_order";

function orderBySortThenCreated<T extends { sort_order: number; created_at?: string }>(rows: T[]) {
  return [...rows].sort((a, b) => {
    if (a.sort_order !== b.sort_order) {
      return a.sort_order - b.sort_order;
    }

    return (a.created_at ?? "").localeCompare(b.created_at ?? "");
  });
}

function mapById<T extends Record<TKey, string>, TKey extends keyof T>(rows: T[], idKey: TKey) {
  return new Map(rows.map((row) => [row[idKey], row]));
}

function mergeMenuSiteTranslation(menuSite: MenuSite, translation: MenuSiteTranslation | null | undefined): MenuSite {
  if (!translation) return menuSite;

  return {
    ...menuSite,
    description: getLocalizedValue(menuSite.description, translation.description),
    restaurant_name: getLocalizedValue(menuSite.restaurant_name, translation.restaurant_name),
    restaurant_category: getLocalizedValue(menuSite.restaurant_category, translation.restaurant_category),
    brand_description: getLocalizedValue(menuSite.brand_description, translation.brand_description),
    intro_title: getLocalizedValue(menuSite.intro_title, translation.intro_title),
    intro_description: getLocalizedValue(menuSite.intro_description, translation.intro_description),
    menu_cover_label: getLocalizedValue(menuSite.menu_cover_label, translation.menu_cover_label),
    menu_cover_title: getLocalizedValue(menuSite.menu_cover_title, translation.menu_cover_title),
    menu_cover_description: getLocalizedValue(menuSite.menu_cover_description, translation.menu_cover_description),
    about_description: getLocalizedValue(menuSite.about_description, translation.about_description),
    opening_hours: getLocalizedValue(menuSite.opening_hours, translation.opening_hours),
    restaurant_address: getLocalizedValue(menuSite.restaurant_address, translation.restaurant_address),
    restaurant_phone: getLocalizedValue(menuSite.restaurant_phone, translation.restaurant_phone),
  };
}

async function applyMenuTranslations(
  supabase: SupabaseServerClient,
  data: MenuPageData,
  locale: SupportedLocale,
): Promise<MenuPageData> {
  if (locale === DEFAULT_LOCALE) return data;

  const pageIds = data.pages.map((page) => page.id);
  const categoryIds = data.categories.map((category) => category.id);
  const itemIds = data.items.map((item) => item.id);
  const priceOptionIds = data.priceOptions.map((option) => option.id);
  const traitIds = data.traits.map((trait) => trait.id);
  const eventIds = data.events.map((event) => event.id);
  const chefIds = data.chefs.map((chef) => chef.id);
  const socialLinkIds = data.socialLinks.map((link) => link.id);

  const [
    siteResult,
    pageResult,
    categoryResult,
    itemResult,
    priceOptionResult,
    traitResult,
    eventResult,
    chefResult,
    socialLinkResult,
  ] = await Promise.all([
    supabase
      .from("menu_site_translations")
      .select("*")
      .eq("menu_site_id", data.menuSite.id)
      .eq("locale", locale)
      .maybeSingle(),
    pageIds.length
      ? supabase.from("menu_page_translations").select("*").eq("locale", locale).in("menu_page_id", pageIds)
      : Promise.resolve({ data: [], error: null }),
    categoryIds.length
      ? supabase.from("menu_category_translations").select("*").eq("locale", locale).in("category_id", categoryIds)
      : Promise.resolve({ data: [], error: null }),
    itemIds.length
      ? supabase.from("menu_item_translations").select("*").eq("locale", locale).in("item_id", itemIds)
      : Promise.resolve({ data: [], error: null }),
    priceOptionIds.length
      ? supabase.from("menu_item_price_option_translations").select("*").eq("locale", locale).in("price_option_id", priceOptionIds)
      : Promise.resolve({ data: [], error: null }),
    traitIds.length
      ? supabase.from("menu_item_trait_translations").select("*").eq("locale", locale).in("trait_id", traitIds)
      : Promise.resolve({ data: [], error: null }),
    eventIds.length
      ? supabase.from("menu_event_translations").select("*").eq("locale", locale).in("event_id", eventIds)
      : Promise.resolve({ data: [], error: null }),
    chefIds.length
      ? supabase.from("menu_chef_translations").select("*").eq("locale", locale).in("chef_id", chefIds)
      : Promise.resolve({ data: [], error: null }),
    socialLinkIds.length
      ? supabase.from("menu_social_link_translations").select("*").eq("locale", locale).in("social_link_id", socialLinkIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (
    siteResult.error ||
    pageResult.error ||
    categoryResult.error ||
    itemResult.error ||
    priceOptionResult.error ||
    traitResult.error ||
    eventResult.error ||
    chefResult.error ||
    socialLinkResult.error
  ) {
    return data;
  }

  const pageTranslations = mapById((pageResult.data ?? []) as MenuPageTranslation[], "menu_page_id");
  const categoryTranslations = mapById((categoryResult.data ?? []) as MenuCategoryTranslation[], "category_id");
  const itemTranslations = mapById((itemResult.data ?? []) as MenuItemTranslation[], "item_id");
  const priceOptionTranslations = mapById((priceOptionResult.data ?? []) as MenuItemPriceOptionTranslation[], "price_option_id");
  const traitTranslations = mapById((traitResult.data ?? []) as MenuItemTraitTranslation[], "trait_id");
  const eventTranslations = mapById((eventResult.data ?? []) as MenuEventTranslation[], "event_id");
  const chefTranslations = mapById((chefResult.data ?? []) as MenuChefTranslation[], "chef_id");
  const socialLinkTranslations = mapById((socialLinkResult.data ?? []) as MenuSocialLinkTranslation[], "social_link_id");

  return {
    ...data,
    menuSite: mergeMenuSiteTranslation(data.menuSite, siteResult.data as MenuSiteTranslation | null),
    pages: data.pages.map((page) => {
      const translation = pageTranslations.get(page.id);
      return translation
        ? {
            ...page,
            title: getLocalizedValue(page.title, translation.title),
            description: getLocalizedValue(page.description, translation.description),
          }
        : page;
    }),
    categories: data.categories.map((category) => {
      const translation = categoryTranslations.get(category.id);
      return translation
        ? {
            ...category,
            name: getLocalizedValue(category.name, translation.name),
            description: getLocalizedValue(category.description, translation.description),
          }
        : category;
    }),
    items: data.items.map((item) => {
      const translation = itemTranslations.get(item.id);
      return translation
        ? {
            ...item,
            name: getLocalizedValue(item.name, translation.name),
            set_name: getLocalizedValue(item.set_name, translation.set_name),
            description: getLocalizedValue(item.description, translation.description),
            price_label: getLocalizedValue(item.price_label, translation.price_label),
            portion_label: getLocalizedValue(item.portion_label, translation.portion_label),
            badge_label: getLocalizedValue(item.badge_label, translation.badge_label),
            origin_info: getLocalizedValue(item.origin_info, translation.origin_info),
          }
        : item;
    }),
    priceOptions: data.priceOptions.map((option) => {
      const translation = priceOptionTranslations.get(option.id);
      return translation
        ? {
            ...option,
            label: getLocalizedValue(option.label, translation.label),
            price_label: getLocalizedValue(option.price_label, translation.price_label),
          }
        : option;
    }),
    traits: data.traits.map((trait) => {
      const translation = traitTranslations.get(trait.id);
      return translation
        ? {
            ...trait,
            label: getLocalizedValue(trait.label, translation.label),
          }
        : trait;
    }),
    events: data.events.map((event) => {
      const translation = eventTranslations.get(event.id);
      return translation
        ? {
            ...event,
            event_title: getLocalizedValue(event.event_title, translation.event_title),
            event_subtitle: getLocalizedValue(event.event_subtitle, translation.event_subtitle),
            event_description: getLocalizedValue(event.event_description, translation.event_description),
            event_period: getLocalizedValue(event.event_period, translation.event_period),
            event_benefit: getLocalizedValue(event.event_benefit, translation.event_benefit),
            event_detail: getLocalizedValue(event.event_detail, translation.event_detail),
            event_regular_price_label: getLocalizedValue(event.event_regular_price_label, translation.event_regular_price_label),
            event_sale_price_label: getLocalizedValue(event.event_sale_price_label, translation.event_sale_price_label),
          }
        : event;
    }),
    chefs: data.chefs.map((chef) => {
      const translation = chefTranslations.get(chef.id);
      return translation
        ? {
            ...chef,
            chef_name: getLocalizedValue(chef.chef_name, translation.chef_name),
            chef_role: getLocalizedValue(chef.chef_role, translation.chef_role),
            chef_description: getLocalizedValue(chef.chef_description, translation.chef_description),
          }
        : chef;
    }),
    socialLinks: data.socialLinks.map((link) => {
      const translation = socialLinkTranslations.get(link.id);
      return translation
        ? {
            ...link,
            label: getLocalizedValue(link.label, translation.label),
          }
        : link;
    }),
  };
}

async function getLatestProductKeyForMenuSite(supabase: SupabaseServerClient, menuSiteId: string) {
  const { data, error } = await supabase
    .from("orders")
    .select("product_key")
    .eq("menu_site_id", menuSiteId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return null;
  }

  return data?.product_key ?? null;
}

async function normalizeMenuPageData(menuSite: MenuSite, options: MenuPageDataOptions = {}): Promise<MenuPageData | null> {
  const supabase = await createClient();
  const pageSettings = mergePageSettings(menuSite.page_settings);
  const enabledLocales = getEnabledLocales(menuSite.settings);
  const locale = getEffectiveLocale(options.locale ?? DEFAULT_LOCALE, enabledLocales);
  const productKey = await getLatestProductKeyForMenuSite(supabase, menuSite.id);
  const publicServiceType = getMenuPublicServiceType(productKey);

  const { data: pagesData, error: pagesError } = await supabase
    .from("menu_pages")
    .select(pageSelect)
    .eq("menu_site_id", menuSite.id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (pagesError) {
    return null;
  }

  const pages = sortMenuPages((pagesData ?? []) as MenuPage[]);
  const pageIds = pages.map((page) => page.id);

  const { data: categoriesData, error: categoriesError } = pageIds.length
    ? await supabase
        .from("menu_categories")
        .select(categorySelect)
        .in("menu_page_id", pageIds)
        .eq("visible", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true })
    : { data: [], error: null };

  if (categoriesError) {
    return null;
  }

  const categories = orderBySortThenCreated((categoriesData ?? []) as MenuCategory[]);
  const categoryIds = categories.map((category) => category.id);

  const { data: itemsData, error: itemsError } = categoryIds.length
    ? await supabase
        .from("menu_items")
        .select(itemSelect)
        .in("category_id", categoryIds)
        .eq("visible", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true })
    : { data: [], error: null };

  const isMissingBadgeLabelColumn =
    itemsError &&
    (itemsError.message.toLowerCase().includes("badge_label") ||
      itemsError.message.toLowerCase().includes("could not find") ||
      itemsError.code === "42703");

  const { data: legacyItemsData, error: legacyItemsError } =
    isMissingBadgeLabelColumn && categoryIds.length
      ? await supabase
          .from("menu_items")
          .select(legacyItemSelect)
          .in("category_id", categoryIds)
          .eq("visible", true)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true })
      : { data: null, error: null };

  if ((itemsError && !isMissingBadgeLabelColumn) || legacyItemsError) {
    return null;
  }

  const items = orderBySortThenCreated(((isMissingBadgeLabelColumn ? legacyItemsData : itemsData) ?? []) as MenuItem[]);
  const itemIds = items.map((item) => item.id);
  const traitItemIds = items.filter((item) => item.traits_visible).map((item) => item.id);

  const [
    { data: priceOptionsData, error: priceOptionsError },
    { data: traitsData, error: traitsError },
    { data: eventsData },
    { data: chefsData },
    { data: socialLinksData },
  ] = await Promise.all([
    itemIds.length
      ? supabase
          .from("menu_item_price_options")
          .select(priceOptionSelect)
          .in("menu_item_id", itemIds)
          .eq("visible", true)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    traitItemIds.length
      ? supabase
          .from("menu_item_traits")
          .select(traitSelect)
          .in("menu_item_id", traitItemIds)
          .eq("visible", true)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("menu_events")
      .select(eventSelect)
      .eq("menu_site_id", menuSite.id)
      .eq("visible", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("menu_chefs")
      .select(chefSelect)
      .eq("menu_site_id", menuSite.id)
      .eq("visible", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("menu_social_links")
      .select(socialLinkSelect)
      .eq("menu_site_id", menuSite.id)
      .eq("visible", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);

  const isMissingPriceOptionsTable =
    priceOptionsError &&
    (priceOptionsError.message.toLowerCase().includes("menu_item_price_options") ||
      priceOptionsError.message.toLowerCase().includes("does not exist") ||
      priceOptionsError.code === "42P01");

  if (priceOptionsError && !isMissingPriceOptionsTable) {
    return null;
  }

  if (traitsError) {
    return null;
  }

  const data = {
    locale,
    enabledLocales,
    publicServiceType,
    menuSite,
    pageSettings,
    pages,
    categories,
    items,
    priceOptions: isMissingPriceOptionsTable ? [] : ((priceOptionsData ?? []) as MenuItemPriceOption[]),
    traits: (traitsData ?? []) as MenuItemTrait[],
    events: (eventsData ?? []) as MenuPageData["events"],
    chefs: (chefsData ?? []) as MenuPageData["chefs"],
    socialLinks: (socialLinksData ?? []) as MenuPageData["socialLinks"],
  };

  return applyMenuTranslations(supabase, data, locale);
}

export async function getPublicMenuPageData(slug: string, options: MenuPageDataOptions = {}) {
  const supabase = await createClient();
  const primarySiteResult = await supabase
    .from("menu_sites")
    .select(siteSelect)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  let site = primarySiteResult.data as unknown;
  let error = primarySiteResult.error;

  if (error && ["template_category", "restaurant_type", "menu_cover_label"].some((column) => error.message.toLowerCase().includes(column))) {
    const fallbackResult = await supabase
      .from("menu_sites")
      .select(baseSiteSelect)
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();

    site = fallbackResult.data as unknown;
    error = fallbackResult.error;
  }

  if (error || !site) {
    return null;
  }

  return normalizeMenuPageData(site as MenuSite, options);
}

export async function getOwnerPreviewMenuPageData(menuId: string, userId: string, options: MenuPageDataOptions = {}) {
  const supabase = await createClient();
  const primarySiteResult = await supabase
    .from("menu_sites")
    .select(siteSelect)
    .eq("id", menuId)
    .eq("user_id", userId)
    .maybeSingle();
  let site = primarySiteResult.data as unknown;
  let error = primarySiteResult.error;

  if (error && ["template_category", "restaurant_type", "menu_cover_label"].some((column) => error.message.toLowerCase().includes(column))) {
    const fallbackResult = await supabase
      .from("menu_sites")
      .select(baseSiteSelect)
      .eq("id", menuId)
      .eq("user_id", userId)
      .maybeSingle();

    site = fallbackResult.data as unknown;
    error = fallbackResult.error;
  }

  if (error || !site) {
    return null;
  }

  return normalizeMenuPageData(site as MenuSite, options);
}

export const getPublicMenuDataBySlug = getPublicMenuPageData;
export const getPreviewMenuDataById = getOwnerPreviewMenuPageData;
export const getMenuPreviewData = getOwnerPreviewMenuPageData;

export { normalizeMenuPageData };
export type { MenuPageData };
