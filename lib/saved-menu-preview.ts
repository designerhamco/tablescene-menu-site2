import { getTemplateCapabilities } from "./template-capabilities";
import type { DefaultDesignOptionKey, DefaultDesignOptions } from "./default-design-options";
import { getDefaultDesignReview } from "./menu-design-policy";
import type { MenuPageData } from "./menu-page-data";
import type { TemplatePreviewQuery } from "./menu-preview-devices";
import { applyPreviewDesign, previewDesignDefaults } from "./menu-preview-design";
import { readMenuPopupSettings } from "./menu-popup";
import { getTemplatePreviewOptionGroups, getTemplatePreviewOptionOverride, getTemplatePreviewOptions } from "./template-preview-options";

const record = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};

/** Saved-menu previews use registered customer content, never catalog examples. */
export function buildSavedMenuPreview(source: MenuPageData, query: TemplatePreviewQuery) {
  const settings = record(source.menuSite.settings);
  const design = getDefaultDesignReview(typeof settings.menu_design_id === "string" ? settings.menu_design_id : undefined, source.menuSite.template_key ?? "");
  const basic = getTemplateCapabilities(source.menuSite.template_key).menuCover.coverMode === "section";
  const options: DefaultDesignOptions = {
    ...getTemplatePreviewOptions(source, {}),
    logoPreview: Boolean(source.menuSite.logo_url) && (!basic || settings.logo_replaces_name === true),
    popupPreview: readMenuPopupSettings(source.menuSite.settings).enabled,
    widgetsPreview: source.widgets?.some(widget => widget.visible !== false) ?? false,
  };
  const overrides = new Map<DefaultDesignOptionKey, boolean>();
  for (const [key] of getTemplatePreviewOptionGroups(source.menuSite.template_key ?? "", design).flatMap(group => group.choices)) {
    const enabled = getTemplatePreviewOptionOverride(query, key);
    if (enabled !== undefined) { overrides.set(key, enabled); options[key] = enabled; }
  }
  let data = source;
  if (overrides.size) {
    data = structuredClone(source);
    const enabled = (key: DefaultDesignOptionKey) => overrides.get(key);
    const previewSettings = { ...settings };
    if (enabled("popupPreview") !== undefined) previewSettings.advertisementPopup = { ...readMenuPopupSettings(source.menuSite.settings), enabled: enabled("popupPreview")! };
    if (enabled("logoPreview") !== undefined) {
      if (!enabled("logoPreview")) data.menuSite.logo_url = null;
      previewSettings.logo_replaces_name = enabled("logoPreview")!;
    }
    if (enabled("coverPreview") !== undefined) Object.assign(data.pageSettings, {
      menu_cover_enabled: enabled("coverPreview"),
      ...(enabled("coverPreview") ? { menu_cover_visible_pc: true, menu_cover_visible_tablet: true, menu_cover_visible_mobile: true } : {}),
    });
    if (enabled("featuredPreview") !== undefined) data.pageSettings.featured_item_enabled = enabled("featuredPreview")!;
    if (enabled("coverImagesPreview") !== undefined) data.pageSettings.cover_image_visible = enabled("coverImagesPreview")!;
    if (enabled("imagesPreview") === false) data.items.forEach(item => { item.image_url = null; });
    if (enabled("categoryDescriptionsPreview") !== undefined) data.categories.forEach(category => { category.description_visible = enabled("categoryDescriptionsPreview")!; });
    if (enabled("secondaryNamesPreview") === false) data.items.forEach(item => { item.set_name = null; item.default_name = undefined; });
    if (enabled("descriptionsPreview") === false) data.items.forEach(item => { item.description = null; });
    if (enabled("badgesPreview") === false) data.items.forEach(item => Object.assign(item, { badge: null, badge_label: null, badge_type: "none", recommended: false, is_best: false }));
    if (enabled("priceNotesPreview") === false) data.items.forEach(item => Object.assign(item, { priceNote: null, portion_label: null, portion_visible: false }));
    if (enabled("priceOptionsPreview") === false) {
      data.priceOptions = [];
      data.categories.forEach(category => { category.priceColumns = []; });
      data.items.forEach(item => { item.priceColumnValues = []; });
      // Keep an independently enabled sale when its price-column rail is hidden.
      data.timeSales.forEach(sale => { sale.items = sale.items.filter((item, index, items) => items.findIndex(other => other.menuItemId === item.menuItemId) === index).map(item => ({ ...item, priceColumnId: null })); });
    }
    if (enabled("timeSalesPreview") === false) { data.timeSales = []; data.nextTimeSaleStartAt = null; }
    if (enabled("soldOutPreview") === false) data.items.forEach(item => { item.is_sold_out = false; });
    if (enabled("widgetsPreview") !== undefined) data.widgets = enabled("widgetsPreview") ? data.widgets?.map(widget => ({ ...widget, visible: true })) : [];
    data.menuSite.settings = previewSettings as typeof data.menuSite.settings;
    data.menuSite.page_settings = { ...record(data.menuSite.page_settings), ...data.pageSettings } as typeof data.menuSite.page_settings;
  }
  const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
  data = applyPreviewDesign(data, first(query.designPreview), design?.itemLayout === "album");
  return { data, design, options, designDefaults: previewDesignDefaults(source) };
}
