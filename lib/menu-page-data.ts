import type { PublicMenuTemplateProps } from "@/components/menu-templates/MenuTemplateRenderer";
import { createClient } from "@/lib/supabase/server";
import type { Database, MenuSectionKey } from "@/lib/supabase/types";
import { mergePageSettings, sortMenuPages, type PageSettings } from "@/types/menu";

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

const baseSiteSelect =
  "id, user_id, name, slug, template_key, status, description, logo_url, cover_image_url, brand_color, business_name, business_address, business_phone, restaurant_name, restaurant_category, restaurant_address, restaurant_phone, intro_title, intro_description, brand_description, menu_cover_title, menu_cover_description, about_description, opening_hours, map_url, page_settings";
const siteSelect = baseSiteSelect.replace("template_key", "template_key, template_category");

const pageSelect = "id, title, description, description_visible, legacy_section_key, visible, sort_order, created_at";
const categorySelect = "id, menu_page_id, name, description, description_visible, sort_order, visible";
const itemSelect =
  "id, category_id, name, set_name, description, price, price_label, price_visible, portion_label, portion_visible, image_url, badge, badge_type, recommended, origin_info, is_best, is_sold_out, traits_visible, visible, sort_order";
const priceOptionSelect = "id, menu_item_id, label, price, price_label, visible, sort_order";
const traitSelect = "id, menu_item_id, label, value, max_value, visible, sort_order";
const eventSelect =
  "id, event_title, event_subtitle, event_description, event_period, event_image_url, event_benefit, event_detail, event_regular_price_label, event_sale_price_label, event_price_visible, visible, sort_order";
const chefSelect = "id, chef_name, chef_role, chef_description, chef_image_url, visible, sort_order";
const socialLinkSelect = "id, type, label, display_name, url, visible, sort_order";

const legacyPageSettingBySection: Partial<Record<MenuSectionKey, keyof PageSettings>> = {
  set_menu: "set_menu_enabled",
  main_menu: "main_menu_enabled",
  dessert_drink: "dessert_drink_enabled",
};

function isLegacyMenuSectionKey(value: string | null): value is MenuSectionKey {
  return value === "set_menu" || value === "main_menu" || value === "dessert_drink";
}

function pageEnabledBySettings(page: MenuPage, pageSettings: PageSettings) {
  if (!isLegacyMenuSectionKey(page.legacy_section_key)) {
    return true;
  }

  const settingKey = legacyPageSettingBySection[page.legacy_section_key];
  return settingKey ? pageSettings[settingKey] : true;
}

function orderBySortThenCreated<T extends { sort_order: number; created_at?: string }>(rows: T[]) {
  return [...rows].sort((a, b) => {
    if (a.sort_order !== b.sort_order) {
      return a.sort_order - b.sort_order;
    }

    return (a.created_at ?? "").localeCompare(b.created_at ?? "");
  });
}

async function normalizeMenuPageData(menuSite: MenuSite): Promise<MenuPageData | null> {
  const supabase = await createClient();
  const pageSettings = mergePageSettings(menuSite.page_settings);

  const { data: pagesData, error: pagesError } = await supabase
    .from("menu_pages")
    .select(pageSelect)
    .eq("menu_site_id", menuSite.id)
    .eq("visible", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (pagesError) {
    return null;
  }

  const pages = sortMenuPages(((pagesData ?? []) as MenuPage[]).filter((page) => pageEnabledBySettings(page, pageSettings)));
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

  if (itemsError) {
    return null;
  }

  const items = orderBySortThenCreated((itemsData ?? []) as MenuItem[]);
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
    pageSettings.events_enabled
      ? supabase
          .from("menu_events")
          .select(eventSelect)
          .eq("menu_site_id", menuSite.id)
          .eq("visible", true)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    pageSettings.chefs_enabled
      ? supabase
          .from("menu_chefs")
          .select(chefSelect)
          .eq("menu_site_id", menuSite.id)
          .eq("visible", true)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    pageSettings.social_links_enabled
      ? supabase
          .from("menu_social_links")
          .select(socialLinkSelect)
          .eq("menu_site_id", menuSite.id)
          .eq("visible", true)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
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

  return {
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
}

export async function getPublicMenuPageData(slug: string) {
  const supabase = await createClient();
  const primarySiteResult = await supabase
    .from("menu_sites")
    .select(siteSelect)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  let site = primarySiteResult.data as unknown;
  let error = primarySiteResult.error;

  if (error && error.message.toLowerCase().includes("template_category")) {
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

  return normalizeMenuPageData(site as MenuSite);
}

export async function getOwnerPreviewMenuPageData(menuId: string, userId: string) {
  const supabase = await createClient();
  const primarySiteResult = await supabase
    .from("menu_sites")
    .select(siteSelect)
    .eq("id", menuId)
    .eq("user_id", userId)
    .maybeSingle();
  let site = primarySiteResult.data as unknown;
  let error = primarySiteResult.error;

  if (error && error.message.toLowerCase().includes("template_category")) {
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

  return normalizeMenuPageData(site as MenuSite);
}

export const getPublicMenuDataBySlug = getPublicMenuPageData;
export const getPreviewMenuDataById = getOwnerPreviewMenuPageData;
export const getMenuPreviewData = getOwnerPreviewMenuPageData;

export { normalizeMenuPageData };
export type { MenuPageData };
