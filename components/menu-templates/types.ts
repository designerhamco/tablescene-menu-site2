import type { Database } from "@/lib/supabase/types";

export type PublicMenuSite = Pick<
  Database["public"]["Tables"]["menu_sites"]["Row"],
  | "id"
  | "name"
  | "slug"
  | "template_key"
  | "description"
  | "logo_url"
  | "cover_image_url"
  | "brand_color"
  | "business_name"
  | "business_address"
  | "business_phone"
>;

export type PublicMenuCategory = Pick<
  Database["public"]["Tables"]["menu_categories"]["Row"],
  "id" | "name" | "description" | "sort_order"
>;

export type PublicMenuItem = Pick<
  Database["public"]["Tables"]["menu_items"]["Row"],
  | "id"
  | "category_id"
  | "name"
  | "description"
  | "price"
  | "image_url"
  | "badge"
  | "is_best"
  | "is_sold_out"
  | "sort_order"
>;

export type PublicMenuEvent = Pick<
  Database["public"]["Tables"]["menu_events"]["Row"],
  "id" | "title" | "description" | "image_url" | "sort_order"
>;

export type PublicMenuChef = Pick<
  Database["public"]["Tables"]["menu_chefs"]["Row"],
  "id" | "name" | "role" | "bio" | "image_url" | "sort_order"
>;

export type PublicMenuSocialLink = Pick<
  Database["public"]["Tables"]["menu_social_links"]["Row"],
  "id" | "label" | "url" | "sort_order"
>;

export type PublicMenuTemplateProps = {
  menuSite: PublicMenuSite;
  categories: PublicMenuCategory[];
  items: PublicMenuItem[];
  events: PublicMenuEvent[];
  chefs: PublicMenuChef[];
  socialLinks: PublicMenuSocialLink[];
};
