import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./supabase/types";
import type { MenuPageData } from "./menu-page-data";
import type { TemplateKey } from "./templates";
import { TRANSLATABLE_LOCALES, type SupportedLocale } from "./locales";

type Entity = "pages" | "categories" | "items" | "options" | "widgets" | "promotions";
export type StarterTranslationRecords = Partial<Record<Entity, readonly unknown[]>>;
type Row<K extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][K]["Insert"];
const record = (row: unknown) => row as Record<string, unknown>;

/** Match explicit parent IDs and sort positions, never assume insert-return order. */
export function getStarterTranslationIds(source: MenuPageData, records: StarterTranslationRecords) {
  const ids = new Map<string, string>();
  const required = (sourceId: string) => {
    const id = ids.get(sourceId);
    if (!id) throw new Error(`기본 번역 대상을 찾을 수 없습니다: ${sourceId}`);
    return id;
  };
  const match = (sourceId: string, entity: Entity, predicate: (row: Record<string, unknown>) => boolean) => {
    const row = records[entity]?.map(record).find(predicate);
    if (!row || typeof row.id !== "string") throw new Error(`기본 ${entity} 번역 대상을 찾을 수 없습니다: ${sourceId}`);
    ids.set(sourceId, row.id);
  };
  for (const page of source.pages) match(page.id, "pages", row => row.title === page.title && row.sort_order === page.sort_order);
  for (const category of source.categories) match(category.id, "categories", row => row.name === category.name && row.menu_page_id === (category.menu_page_id ? required(category.menu_page_id) : null) && row.sort_order === category.sort_order);
  for (const item of source.items) match(item.id, "items", row => row.name === item.name && (row.category_id ?? null) === (item.category_id ? required(item.category_id) : null) && row.sort_order === item.sort_order && (Boolean(item.category_id) || row.menu_page_id === (item.menu_page_id ? required(item.menu_page_id) : null)));
  for (const option of source.priceOptions) match(option.id, "options", row => row.menu_item_id === required(option.menu_item_id) && row.sort_order === option.sort_order && row.label === option.label);
  for (const widget of source.widgets ?? []) match(widget.id, "widgets", row => row.menu_page_id === required(widget.menuPageId) && row.sort_order === widget.sortOrder);
  for (const sale of source.timeSales) match(sale.id, "promotions", row => row.name === sale.name);
  return required;
}

/** Exactly the catalog's locale projection, remapped onto newly created row IDs. */
export function buildStarterTranslationRows(source: MenuPageData, localized: MenuPageData, menuSiteId: string, id: (sourceId: string) => string, locale: SupportedLocale, actualSite?: Record<string, unknown>) {
  const settings = record(localized.menuSite.settings ?? {});
  const copy = localized.menuSite;
  const common = { locale, status: "completed" };
  const sites: Row<"menu_site_translations">[] = [{ ...common, menu_site_id: menuSiteId,
    // Merchant-entered identity/contact fields must never be replaced by demo names.
    restaurant_name: null, intro_title: null, menu_cover_title: source.menuSite.template_key?.startsWith("dining_") ? (actualSite?.menu_cover_title === source.menuSite.menu_cover_title ? copy.menu_cover_title : typeof actualSite?.menu_cover_title === "string" ? actualSite.menu_cover_title : copy.menu_cover_title) : null,
    description: copy.description, restaurant_category: copy.restaurant_category,
    brand_description: copy.brand_description, intro_description: copy.intro_description,
    menu_cover_description: copy.menu_cover_description, about_description: copy.about_description,
    opening_hours: typeof settings.footer_notice_1 === "string" ? settings.footer_notice_1 : copy.opening_hours,
    restaurant_address: typeof settings.footer_notice_2 === "string" ? settings.footer_notice_2 : null,
    restaurant_phone: typeof settings.footer_notice_3 === "string" ? settings.footer_notice_3 : null,
  }];
  const pages: Row<"menu_page_translations">[] = localized.pages.map(page => ({ ...common, menu_page_id: id(page.id), title: page.title, description: page.description }));
  const categories: Row<"menu_category_translations">[] = localized.categories.map(category => ({ ...common, category_id: id(category.id), name: category.name, description: category.description, course_price_label: category.course_price_label, course_price_description: category.course_price_description }));
  const items: Row<"menu_item_translations">[] = localized.items.map(item => ({ ...common, item_id: id(item.id), name: item.name, set_name: item.set_name, description: item.description, badge_label: item.badge_label, price_label: item.price_label, price_note: item.priceNote, portion_label: item.portion_label, origin_info: item.origin_info }));
  const options: Row<"menu_item_price_option_translations">[] = localized.priceOptions.map(option => ({ ...common, price_option_id: id(option.id), label: option.label, price_label: option.price_label }));
  const promotions: Row<"menu_promotion_translations">[] = localized.timeSales.map(sale => ({ ...common, menu_promotion_id: id(sale.id), badge_text: sale.badgeText, time_display_text: sale.displayText }));
  const widgets: Row<"menu_widget_translations">[] = (localized.widgets ?? []).filter(widget => widget.type !== "image").map(widget => ({ ...common, menu_widget_id: id(widget.id), title: widget.title, description: widget.description }));
  return { menu_site_translations: sites, menu_page_translations: pages, menu_category_translations: categories, menu_item_translations: items, menu_item_price_option_translations: options, menu_promotion_translations: promotions, menu_widget_translations: widgets };
}

export async function createCatalogStarterTranslations(input: { supabase: SupabaseClient<Database>; menuSiteId: string; templateKey: TemplateKey; designId?: string; records: StarterTranslationRecords; source?: MenuPageData }) {
  // Lazy imports avoid a preset/projection initialization cycle. Neither performs IO.
  const { buildStarterPreviewData } = await import("./template-starter-preview");
  const { applyStarterPreviewLocalization } = await import("./template-demo-data/starter-preview-localization");
  const source = input.source ?? buildStarterPreviewData(input.templateKey, null, input.designId);
  const id = getStarterTranslationIds(source, input.records);
  const siteResult = await input.supabase.from("menu_sites").select("menu_cover_title").eq("id", input.menuSiteId).maybeSingle();
  if (siteResult.error) throw new Error(`기본 번역 가게명 확인에 실패했습니다: ${siteResult.error.message}`);
  const batches = new Map<keyof ReturnType<typeof buildStarterTranslationRows>, unknown[]>();
  for (const locale of TRANSLATABLE_LOCALES) {
    const rows = buildStarterTranslationRows(source, applyStarterPreviewLocalization(source, locale), input.menuSiteId, id, locale, siteResult.data ?? undefined);
    for (const [table, values] of Object.entries(rows)) {
      const key = table as keyof typeof rows;
      batches.set(key, [...batches.get(key) ?? [], ...values]);
    }
  }
  // One bulk insert per entity type, not a network round trip for every locale.
  for (const [table, values] of batches) {
    if (!values.length) continue;
    const { error } = await input.supabase.from(table).insert(values as never);
    if (error) throw new Error(`기본 번역 생성에 실패했습니다 (${table}): ${error.message}`);
  }
}

/** A payment retry must not mistake partially written translations for a complete starter. */
export async function assertPurchasedStarterTranslations(supabase: SupabaseClient<Database>, menuSiteId: string) {
  const sources = [
    ["menu_pages", "menu_page_translations", "menu_page_id"],
    ["menu_categories", "menu_category_translations", "category_id"],
    ["menu_items", "menu_item_translations", "item_id"],
    ["menu_item_price_options", "menu_item_price_option_translations", "price_option_id"],
    ["menu_promotions", "menu_promotion_translations", "menu_promotion_id"],
    ["menu_widgets", "menu_widget_translations", "menu_widget_id"],
  ] as const;
  for (const locale of TRANSLATABLE_LOCALES) {
    const site = await supabase.from("menu_site_translations").select("id", {count:"exact",head:true}).eq("menu_site_id",menuSiteId).eq("locale",locale).eq("status","completed");
    if (site.error || site.count !== 1) throw new Error(`기본 ${locale} 번역이 완성되지 않아 구매 메뉴판 생성을 완료할 수 없습니다.`);
  }
  for (const [source, table, foreign] of sources) {
    const result = await supabase.from(source).select(source === "menu_widgets" ? "id,widget_type" : "id").eq("menu_site_id",menuSiteId);
    if (result.error) throw new Error(`기본 번역 대상 확인에 실패했습니다 (${source}): ${result.error.message}`);
    const ids = (result.data ?? []).map(record).filter(row => source !== "menu_widgets" || row.widget_type !== "image").map(row => String(row.id));
    if (!ids.length) continue;
    for (const locale of TRANSLATABLE_LOCALES) {
      const translated = await supabase.from(table).select("id",{count:"exact",head:true}).in(foreign,ids).eq("locale",locale).eq("status","completed");
      if (translated.error || translated.count !== ids.length) throw new Error(`기본 ${locale} 번역이 일부만 생성되었습니다 (${table}). 관리자 확인이 필요합니다.`);
    }
  }
}
