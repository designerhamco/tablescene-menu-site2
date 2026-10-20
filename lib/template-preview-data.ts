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
  const copy = {
    ko: { category: "정성껏 준비한 메뉴를 만나보세요.", item: "재료의 풍미와 식감을 살려 준비한 메뉴입니다.", widget: "매장 이용 안내", body: "계절 메뉴와 매장 소식을 확인해 주세요." },
    en: { category: "Discover our carefully prepared selection.", item: "Prepared to bring out the flavour and texture of its ingredients.", widget: "Store information", body: "Discover seasonal menus and news from our store." },
    zh: { category: "品尝我们精心准备的菜单。", item: "呈现食材的风味与口感。", widget: "门店指南", body: "了解季节菜单和门店资讯。" },
    ja: { category: "丁寧に仕上げたメニューをお楽しみください。", item: "素材の風味と食感を生かして仕上げています。", widget: "店舗のご案内", body: "季節のメニューとお店のお知らせをご確認ください。" },
  }[data.locale];

  if (enabled("popupPreview") !== undefined) settings.advertisementPopup = { enabled: enabled("popupPreview")!, images: [1, 2, 3].map(number => ({ imageUrl: `/placeholders/starter/default-popup-${number}.svg`, imagePath: null })) };
  if (enabled("logoPreview") !== undefined) {
    data.menuSite.logo_url = enabled("logoPreview") ? source.menuSite.logo_url || "/placeholders/starter/default-logo.svg" : null;
    settings.logo_replaces_name = enabled("logoPreview")!;
  }
  if (enabled("coverPreview") !== undefined) Object.assign(data.pageSettings, {
    menu_cover_enabled: enabled("coverPreview"),
    ...(enabled("coverPreview") ? { menu_cover_visible_pc: true, menu_cover_visible_tablet: true, menu_cover_visible_mobile: true } : {}),
  });
  if (enabled("coverPreview") === true && !data.featuredSlides?.length && capabilities.menuCover.coverMode === "section") {
    data.menuSite.cover_image_url ||= "/placeholders/starter/default-basic-cover.svg";
    data.featuredSlides = [{ id: "catalog-preview-cover", imageUrl: data.menuSite.cover_image_url, featuredItemId: data.pageSettings.featured_item_enabled ? sample?.id ?? null : null, sortOrder: 0 }];
  }
  if (enabled("featuredPreview") !== undefined) {
    data.pageSettings.featured_item_enabled = enabled("featuredPreview")!;
    if (enabled("featuredPreview") && sample) {
      data.pageSettings.featured_item_id ||= sample.id;
      data.featuredSlides = data.featuredSlides?.map(slide => ({ ...slide, featuredItemId: slide.featuredItemId || sample.id }));
    }
  }
  if (enabled("coverImagesPreview") !== undefined) data.pageSettings.cover_image_visible = enabled("coverImagesPreview")!;
  if (enabled("imagesPreview") === false) data.items.forEach(item => { item.image_url = null; });
  if (enabled("imagesPreview") === true) ordinary.forEach(item => { item.image_url ||= image; });
  if (enabled("categoryDescriptionsPreview") === false) data.categories.forEach(category => { category.description = null; category.description_visible = false; });
  if (enabled("categoryDescriptionsPreview") === true) {
    data.categories.forEach(category => { category.description_visible = true; category.description ||= copy.category; });
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
  if (enabled("descriptionsPreview") === true) data.items.forEach(item => { item.description ||= copy.item; });
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
  // A category price rail can intentionally suppress per-item notes. Keep a
  // note example on an ordinary-price item so both enabled features are visible.
  if (enabled("priceNotesPreview") === true && capabilities.supportsPriceNote) {
    const eligible = ordinary.filter(item => !data.categories.find(category => category.id === item.category_id)?.priceColumns.length && !data.priceOptions.some(option => option.menu_item_id === item.id && option.visible !== false));
    if (!eligible.some(item => item.priceNote || item.portion_label) && eligible[0]) eligible[0].priceNote = "ICE ONLY";
  }
  if (enabled("timeSalesPreview") === true && !data.timeSales.length && sample?.price) {
    const column = sample.priceColumnValues[0];
    const price = column?.price ?? sample.price;
    data.timeSales = [{ id: "catalog-preview-sale", name: "TIME SALE", scheduleType: "once", startsAt: new Date(data.initialNowMs - 1000).toISOString(), endsAt: new Date(data.initialNowMs + 3600000).toISOString(), dailyStartTime: null, dailyEndTime: null, timezone: "Asia/Seoul", timeDisplayMode: "countdown", displayText: null, badgeText: "TIME SALE", badgeBackgroundColor: data.menuSite.brand_color || "#191c1b", items: [{ id: "catalog-preview-sale-item", menuItemId: sample.id, priceColumnId: column?.priceColumnId ?? null, salePrice: Math.round(price * 0.9 / 100) * 100, salePriceLabel: null, visible: true }] }];
  }
  if (enabled("timeSalesPreview") === false) { data.timeSales = []; data.nextTimeSaleStartAt = null; }
  if (enabled("soldOutPreview") === false) data.items.forEach(item => { item.is_sold_out = false; });
  if (enabled("soldOutPreview") === true && !ordinary.some(item => item.is_sold_out) && ordinary.length) {
    const promotedIds = new Set(data.timeSales.flatMap(sale => sale.items.map(item => item.menuItemId)));
    const candidates = [...ordinary.slice(1), ordinary[0]];
    const soldOutSample = candidates.find(item => !promotedIds.has(item.id)) ?? candidates[0];
    soldOutSample.is_sold_out = true;
  }
  if (enabled("widgetsPreview") === false) data.widgets = [];
  if (enabled("widgetsPreview") === true && data.pages[0]) {
    const widgets = data.widgets?.length ? data.widgets : [{ id: "catalog-preview-full-widget", menuSiteId: data.menuSite.id, menuPageId: data.pages[0].id, sortOrder: 1000, visible: true }];
    data.widgets = widgets.map(widget => ({ ...widget, type: "image_text", visible: true,
      title: "title" in widget && widget.title || copy.widget,
      description: "description" in widget && widget.description || copy.body,
      imageUrl: "imageUrl" in widget && widget.imageUrl || image,
      imagePath: "imagePath" in widget ? widget.imagePath : null,
      settings: { ...("settings" in widget ? widget.settings : {}), schemaVersion: 1, placement: "settings" in widget ? widget.settings.placement : "flow", aspectRatio: "settings" in widget && "aspectRatio" in widget.settings ? widget.settings.aspectRatio ?? "3:1" : "3:1", objectFit: "cover", objectPosition: "center", textAlign: "left", altText: copy.widget },
    }));
  }
  data.menuSite.settings = settings;
  data.menuSite.page_settings = { ...(data.menuSite.page_settings && typeof data.menuSite.page_settings === "object" && !Array.isArray(data.menuSite.page_settings) ? data.menuSite.page_settings : {}), ...data.pageSettings };
  return data;
}
