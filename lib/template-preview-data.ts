import type { DefaultDesignOptionKey } from "./default-design-options";
import type { MenuPageData } from "./menu-page-data";
import type { TemplatePreviewQuery } from "./menu-preview-devices";
import { getTemplateCapabilities } from "./template-capabilities";
import { getTemplatePreviewOptionGroups, getTemplatePreviewOptionOverride } from "./template-preview-options";
import { getStarterPreset } from "./menu-starter-presets";
import { applyStarterPreviewLocalization } from "./template-demo-data/starter-preview-localization";

/** Catalog preview only. Never imported by saved-menu/public customer routes. */
export function applyTemplatePreviewOptions(source: MenuPageData, query: TemplatePreviewQuery): MenuPageData {
  const groups = getTemplatePreviewOptionGroups(source.menuSite.template_key ?? "");
  const overrides = new Map(groups.flatMap(group => group.choices).flatMap(([key]) => {
    const enabled = getTemplatePreviewOptionOverride(query, key);
    return enabled === undefined ? [] : [[key, enabled] as const];
  }));
  if (!overrides.size) return source;
  const data = structuredClone(source);
  const enabled = (key: DefaultDesignOptionKey) => overrides.get(key);
  const settings = data.menuSite.settings && typeof data.menuSite.settings === "object" && !Array.isArray(data.menuSite.settings) ? { ...data.menuSite.settings } : {};
  const capabilities = getTemplateCapabilities(source.menuSite.template_key);
  const courseIds = new Set(data.categories.filter(category => category.course_price != null || category.course_price_label).map(category => category.id));
  const ordinary = data.items.filter(item => item.visible !== false && !courseIds.has(item.category_id ?? ""));
  const sample = ordinary[0];
  const image = "/placeholders/starter/default-menu-item.svg";

  if (enabled("popupPreview") !== undefined) settings.advertisementPopup = { enabled: enabled("popupPreview")!, images: [1, 2, 3].map(number => ({ imageUrl: `/placeholders/starter/default-popup-${number}.svg`, imagePath: null })) };
  if (enabled("logoPreview") !== undefined) {
    data.menuSite.logo_url = enabled("logoPreview") ? source.menuSite.logo_url || "/placeholders/starter/default-logo.svg" : null;
    settings.logo_replaces_name = enabled("logoPreview")!;
  }
  if (enabled("coverPreview") !== undefined) Object.assign(data.pageSettings, {
    menu_cover_enabled: enabled("coverPreview"),
    ...(enabled("coverPreview") ? { menu_cover_visible_pc: true, menu_cover_visible_tablet: true, menu_cover_visible_mobile: true } : {}),
  });
  if (enabled("featuredPreview") !== undefined) {
    data.pageSettings.featured_item_enabled = enabled("featuredPreview")!;
    if (enabled("featuredPreview") && sample) {
      data.pageSettings.featured_item_id ||= sample.id;
      data.featuredSlides = data.featuredSlides?.map(slide => ({ ...slide, featuredItemId: slide.featuredItemId || sample.id }));
    }
  }
  if (enabled("coverImagesPreview") !== undefined) data.pageSettings.cover_image_visible = enabled("coverImagesPreview")!;
  if (enabled("imagesPreview") === false) data.items.forEach(item => { item.image_url = null; });
  if (enabled("imagesPreview") === true && !ordinary.some(item => item.image_url)) ordinary.forEach(item => { item.image_url = image; });
  if (enabled("categoryDescriptionsPreview") === false) data.categories.forEach(category => { category.description = null; category.description_visible = false; });
  if (enabled("categoryDescriptionsPreview") === true) {
    data.categories.forEach(category => { category.description_visible = true; });
    if (!data.categories.some(category => category.description) && data.categories[0]) data.categories[0].description = data.menuSite.brand_description || data.menuSite.menu_cover_description || data.menuSite.description;
  }
  if (enabled("secondaryNamesPreview") === true) {
    const englishNames = new Map(applyStarterPreviewLocalization(source, "en").items.map(item => [item.id, item.name]));
    const originalNames = new Map<string, string>();
    const preset = getStarterPreset(source.menuSite.template_key, source.menuSite.restaurant_category, source.menuSite.template_category);
    preset.pages.forEach((page, pageIndex) => {
      page.categories.forEach((category, categoryIndex) => category.items.forEach((item, itemIndex) => originalNames.set(`${source.menuSite.id}-item-${pageIndex}-${categoryIndex}-${itemIndex}`, item.name)));
      page.direct_items?.forEach((item, itemIndex) => originalNames.set(`${source.menuSite.id}-direct-item-${pageIndex}-${itemIndex}`, item.name));
    });
    data.items.forEach(item => {
      const english = englishNames.get(item.id);
      if (!item.set_name && english && english !== item.name) item.set_name = english.toUpperCase();
      if (data.locale !== "ko") item.default_name ||= originalNames.get(item.id);
    });
  }
  if (enabled("descriptionsPreview") === true && sample && !data.items.some(item => item.description)) {
    sample.description = ({ ko: "메뉴의 특징과 재료를 소개하는 설명입니다.", en: "A description of the ingredients and character of this menu item.", zh: "介绍这款餐品的食材与特色。", ja: "このメニューの食材と特徴をご紹介します。" })[data.locale];
  }
  if (enabled("secondaryNamesPreview") === false) data.items.forEach(item => { item.set_name = null; item.default_name = undefined; });
  if (enabled("descriptionsPreview") === false) data.items.forEach(item => { item.description = null; });
  if (enabled("badgesPreview") === false) data.items.forEach(item => Object.assign(item, { badge: null, badge_label: null, badge_type: "none", recommended: false, is_best: false }));
  if (enabled("badgesPreview") === true && sample && !data.items.some(item => item.badge_label || item.badge || item.recommended || item.is_best)) Object.assign(sample, { badge_label: "NEW", badge: "NEW" });
  if (enabled("priceNotesPreview") === false) data.items.forEach(item => Object.assign(item, { priceNote: null, portion_label: null, portion_visible: false }));
  if (enabled("priceNotesPreview") === true && sample && !ordinary.some(item => item.priceNote || item.portion_label)) sample.priceNote = "ICE ONLY";
  if (enabled("priceOptionsPreview") === false) {
    data.priceOptions = [];
    data.categories.forEach(category => { category.priceColumns = []; });
    data.items.forEach(item => { item.priceColumnValues = []; });
    // A hidden category price rail must not hide the independently enabled sale.
    data.timeSales.forEach(sale => { sale.items = sale.items.filter((item, index, items) => items.findIndex(other => other.menuItemId === item.menuItemId) === index).map(item => ({ ...item, priceColumnId: null })); });
  }
  if (enabled("priceOptionsPreview") === true && sample && !data.priceOptions.length && !data.categories.some(category => category.priceColumns.length)) {
    const labels = capabilities.supportsBasicPriceColumns ? ["HOT", "ICE"] : ["Glass", "Bottle"];
    const category = data.categories.find(category => category.id === sample.category_id);
    if (capabilities.supportsBasicPriceColumns && category) {
      category.priceColumns = labels.map((label, index) => ({ id: `${category.id}-preview-column-${index}`, categoryId: category.id, key: label.toLowerCase(), label, sortOrder: index, visible: true }));
      ordinary.filter(item => item.category_id === category.id).forEach(item => {
        item.priceColumnValues = category.priceColumns.map((column, index) => ({ id: `${item.id}-${column.id}`, priceColumnId: column.id, price: (item.price ?? 5000) + index * 500, priceLabel: null, visible: true }));
      });
    } else {
      data.priceOptions = labels.map((label, index) => ({ id: `${sample.id}-preview-option-${index}`, menu_item_id: sample.id, label, price: (sample.price ?? 5000) * (index === 0 ? 1 : 5), price_label: null, visible: true, sort_order: index }));
    }
  }
  if (enabled("timeSalesPreview") === true && !data.timeSales.length && sample?.price) {
    const column = sample.priceColumnValues[0];
    const price = column?.price ?? sample.price;
    data.timeSales = [{ id: "catalog-preview-sale", name: "TIME SALE", scheduleType: "once", startsAt: new Date(data.initialNowMs - 1000).toISOString(), endsAt: new Date(data.initialNowMs + 3600000).toISOString(), dailyStartTime: null, dailyEndTime: null, timezone: "Asia/Seoul", timeDisplayMode: "countdown", displayText: null, badgeText: "TIME SALE", badgeBackgroundColor: data.menuSite.brand_color || "#191c1b", items: [{ id: "catalog-preview-sale-item", menuItemId: sample.id, priceColumnId: column?.priceColumnId ?? null, salePrice: Math.round(price * 0.9 / 100) * 100, salePriceLabel: null, visible: true }] }];
  }
  if (enabled("timeSalesPreview") === false) { data.timeSales = []; data.nextTimeSaleStartAt = null; }
  if (enabled("soldOutPreview") === false) data.items.forEach(item => { item.is_sold_out = false; });
  if (enabled("soldOutPreview") === true && !ordinary.some(item => item.is_sold_out) && ordinary.length) ordinary[Math.min(1, ordinary.length - 1)].is_sold_out = true;
  if (enabled("widgetsPreview") === true) data.widgets?.forEach(widget => { widget.visible = true; });
  if (enabled("widgetsPreview") === false) data.widgets = [];
  if (enabled("widgetsPreview") === true && !data.widgets?.length && data.pages[0]) data.widgets = [{ id: "catalog-preview-image-widget", menuSiteId: data.menuSite.id, menuPageId: data.pages[0].id, type: "image", title: null, description: null, imageUrl: image, imagePath: null, sortOrder: 1000, visible: true, settings: { schemaVersion: 1, placement: "flow", aspectRatio: "3:1", objectFit: "cover", objectPosition: "center", altText: "" } }];
  data.menuSite.settings = settings;
  data.menuSite.page_settings = { ...(data.menuSite.page_settings && typeof data.menuSite.page_settings === "object" && !Array.isArray(data.menuSite.page_settings) ? data.menuSite.page_settings : {}), ...data.pageSettings };
  return data;
}
