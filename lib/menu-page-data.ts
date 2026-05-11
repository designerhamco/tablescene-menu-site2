import type { PublicMenuTemplateProps } from "@/components/menu-templates/MenuTemplateRenderer";
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

const baseSiteSelect =
  "id, user_id, name, slug, template_key, status, description, logo_url, cover_image_url, brand_color, business_name, business_address, business_phone, restaurant_name, restaurant_category, restaurant_address, restaurant_phone, intro_title, intro_description, brand_description, menu_cover_title, menu_cover_description, about_description, opening_hours, map_url, page_settings";
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

async function normalizeMenuPageData(menuSite: MenuSite): Promise<MenuPageData | null> {
  const supabase = await createClient();
  const pageSettings = mergePageSettings(menuSite.page_settings);

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

  return normalizeMenuPageData(site as MenuSite);
}

export const getPublicMenuDataBySlug = getPublicMenuPageData;
export const getPreviewMenuDataById = getOwnerPreviewMenuPageData;
export const getMenuPreviewData = getOwnerPreviewMenuPageData;

export { normalizeMenuPageData };
export type { MenuPageData };
