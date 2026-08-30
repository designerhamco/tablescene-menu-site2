import type { Database } from "@/lib/supabase/types";
import type { OrderCallEntryConfig } from "@/components/public-menu/order-call/types";
import type { SupportedLocale } from "@/lib/locales";
import type { MenuEditorServiceType } from "@/lib/menu-editor-capabilities";
import type { PcTabletLayoutMode } from "@/lib/menu-layout-modes";
import type { MenuWidget } from "@/lib/menu-widgets";
import type { PageSettings } from "@/types/menu";
import type { TimeSaleDisplayMode } from "@/lib/menu-time-sales";
import type { TimeSaleScheduleType } from "@/lib/menu-time-sale-schedule";

export type PublicMenuSite = Pick<
  Database["public"]["Tables"]["menu_sites"]["Row"],
  | "id"
  | "name"
  | "slug"
  | "template_key"
  | "template_category"
  | "description"
  | "logo_url"
  | "cover_image_url"
  | "intro_image_url"
  | "brand_color"
  | "business_name"
  | "business_address"
  | "business_phone"
  | "restaurant_name"
  | "restaurant_category"
  | "restaurant_type"
  | "restaurant_address"
  | "restaurant_phone"
  | "intro_title"
  | "intro_description"
  | "brand_description"
  | "menu_cover_title"
  | "menu_cover_description"
  | "menu_cover_label"
  | "about_description"
  | "opening_hours"
  | "map_url"
  | "page_settings"
  | "settings"
>;

export type PublicMenuPage = Pick<
  Database["public"]["Tables"]["menu_pages"]["Row"],
  "id" | "title" | "description" | "description_visible" | "display_settings" | "legacy_section_key" | "visible" | "sort_order" | "created_at"
> & {
  layout_columns?: 1 | 2;
  text_alignment?: "left" | "center";
};

export type PublicMenuCategory = Pick<
  Database["public"]["Tables"]["menu_categories"]["Row"],
  "id" | "menu_page_id" | "name" | "description" | "description_visible" | "sort_order" | "visible"
> & {
  course_price?: number | null;
  course_price_label?: string | null;
  course_price_visible?: boolean;
  course_price_description?: string | null;
  course_price_description_visible?: boolean;
  priceColumns: PublicMenuCategoryPriceColumn[];
};

export type PublicMenuCategoryPriceColumn = {
  id: string;
  categoryId: string;
  key: string;
  label: string;
  sortOrder: number;
  visible: boolean;
};

export type PublicMenuItem = Pick<
  Database["public"]["Tables"]["menu_items"]["Row"],
  | "id"
  | "category_id"
  | "name"
  | "set_name"
  | "description"
  | "price"
  | "price_label"
  | "price_visible"
  | "portion_label"
  | "portion_visible"
  | "image_url"
  | "badge"
  | "badge_label"
  | "badge_type"
  | "recommended"
  | "origin_info"
  | "is_best"
  | "is_sold_out"
  | "traits_visible"
  | "visible"
  | "sort_order"
> & {
  menu_page_id?: string | null;
  default_name?: string | null;
  priceNote: string | null;
  priceColumnValues: PublicMenuItemPriceColumnValue[];
};

export type PublicMenuItemPriceColumnValue = {
  id: string;
  priceColumnId: string;
  price: number | null;
  priceLabel: string | null;
  visible: boolean;
};

export type PublicMenuItemTrait = Pick<
  Database["public"]["Tables"]["menu_item_traits"]["Row"],
  "id" | "menu_item_id" | "label" | "value" | "max_value" | "visible" | "sort_order"
>;

export type PublicMenuItemPriceOption = Pick<
  Database["public"]["Tables"]["menu_item_price_options"]["Row"],
  "id" | "menu_item_id" | "label" | "price" | "price_label" | "visible" | "sort_order"
>;

export type PublicMenuEvent = Pick<
  Database["public"]["Tables"]["menu_events"]["Row"],
  | "id"
  | "event_title"
  | "event_subtitle"
  | "event_description"
  | "event_period"
  | "event_image_url"
  | "event_benefit"
  | "event_detail"
  | "event_regular_price_label"
  | "event_sale_price_label"
  | "event_price_visible"
  | "visible"
  | "sort_order"
>;

export type PublicMenuChef = Pick<
  Database["public"]["Tables"]["menu_chefs"]["Row"],
  "id" | "chef_name" | "chef_role" | "chef_description" | "chef_image_url" | "visible" | "sort_order"
>;

export type PublicMenuSocialLink = Pick<
  Database["public"]["Tables"]["menu_social_links"]["Row"],
  "id" | "type" | "label" | "display_name" | "url" | "visible" | "sort_order"
>;

export type PublicMenuTimeSale = {
  id: string;
  name: string;
  scheduleType: TimeSaleScheduleType;
  startsAt: string;
  endsAt: string;
  dailyStartTime: string | null;
  dailyEndTime: string | null;
  timezone: string;
  timeDisplayMode: TimeSaleDisplayMode;
  displayText: string | null;
  badgeText: string;
  badgeBackgroundColor: string;
  items: Array<{
    id: string;
    menuItemId: string;
    priceColumnId: string | null;
    salePrice: number | null;
    salePriceLabel: string | null;
    visible: boolean;
  }>;
};

export type PublicFeaturedSlide = {
  id: string;
  imageUrl: string;
  featuredItemId: string;
  sortOrder: number;
};

export type PublicMenuTemplateProps = {
  mode: "public" | "preview";
  previewLayoutMode?: PcTabletLayoutMode;
  initialPreviewPageId?: string | null;
  pagePresentation?: "one" | "multi";
  orderCallConfig?: OrderCallEntryConfig;
  debugCafeA?: boolean;
  locale: SupportedLocale;
  enabledLocales: SupportedLocale[];
  publicServiceType: MenuEditorServiceType;
  menuSite: PublicMenuSite;
  pageSettings: PageSettings;
  pages: PublicMenuPage[];
  categories: PublicMenuCategory[];
  items: PublicMenuItem[];
  priceOptions: PublicMenuItemPriceOption[];
  traits: PublicMenuItemTrait[];
  events: PublicMenuEvent[];
  chefs: PublicMenuChef[];
  socialLinks: PublicMenuSocialLink[];
  timeSales: PublicMenuTimeSale[];
  widgets?: MenuWidget[];
  featuredSlides?: PublicFeaturedSlide[];
  nextTimeSaleStartAt: string | null;
  initialNowMs: number;
};
