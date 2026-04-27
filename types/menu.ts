import type { Database, MenuSectionKey, SupportedLocale } from "@/lib/supabase/types";

export type { MenuSectionKey, SupportedLocale };

export const MENU_SECTION_KEYS = ["set_menu", "main_menu", "dessert_drink"] as const satisfies readonly MenuSectionKey[];

export const MENU_SECTION_LABELS: Record<MenuSectionKey, string> = {
  set_menu: "세트 메뉴",
  main_menu: "메인 메뉴",
  dessert_drink: "디저트/음료",
};

export type MenuSite = Database["public"]["Tables"]["menu_sites"]["Row"];
export type MenuCategory = Database["public"]["Tables"]["menu_categories"]["Row"];
export type MenuItem = Database["public"]["Tables"]["menu_items"]["Row"];
export type MenuChef = Database["public"]["Tables"]["menu_chefs"]["Row"];
export type MenuEvent = Database["public"]["Tables"]["menu_events"]["Row"];
export type MenuSocialLink = Database["public"]["Tables"]["menu_social_links"]["Row"];
export type MenuSiteTranslation = Database["public"]["Tables"]["menu_site_translations"]["Row"];
export type MenuCategoryTranslation = Database["public"]["Tables"]["menu_category_translations"]["Row"];
export type MenuItemTranslation = Database["public"]["Tables"]["menu_item_translations"]["Row"];
export type MenuChefTranslation = Database["public"]["Tables"]["menu_chef_translations"]["Row"];
export type MenuEventTranslation = Database["public"]["Tables"]["menu_event_translations"]["Row"];
export type MenuSocialLinkTranslation = Database["public"]["Tables"]["menu_social_link_translations"]["Row"];
