import assert from "node:assert/strict";
import test from "node:test";
import type { TemplateKey } from "./templates";
import { catalogDesigns } from "./catalog-designs";
import { createStarterMenuData, getStarterPreset } from "./menu-starter-presets";
import { getDefaultEnglishFontForTemplate, getDefaultKoreanFontForTemplate } from "./font-options";
import { buildStarterPreviewData } from "./template-starter-preview";
import { StarterClient } from "./test-support/starter-provisioning-client";
import { mergePageSettings } from "../types/menu";
import { getCustomTypographySettings, mergeTypographySettings } from "./template-typography-presets";
import { getTemplateMenuAppearance, resolveMenuAppearance, MENU_SHAPE_PRESETS } from "./menu-appearance";
import { applyTemplatePreviewOptions } from "./template-preview-data";

for (const design of catalogDesigns) {
  test(`${design.id}: catalog defaults equal actual provisioning output`, async () => {
    const preview = buildStarterPreviewData(design.templateKey as TemplateKey, null, design.id);
    const client = new StarterClient();
    client.site = { ...client.site, template_key: design.templateKey, settings: { menu_design_id: design.id } };
    await createStarterMenuData(client as never, "merchant-menu", design.templateKey, null, null,
      design.service === "display" ? "business_display_monthly" : design.service === "dining" ? "business_basic_multi_monthly" : "business_basic_single_monthly", { designId: design.id });
    const savedItems = client.rows.get("menu_items") ?? [];
    const savedCategories = client.rows.get("menu_categories") ?? [];
    const savedPages = client.rows.get("menu_pages") ?? [];
    const fields = (object: Record<string, unknown>, names: string[]) => Object.fromEntries(names.map(name => [name, object[name] ?? (["recommended", "is_sold_out", "portion_visible"].includes(name) ? false : ["visible", "price_visible", "course_price_visible", "course_price_description_visible"].includes(name) ? true : null)]));
    const itemFields = ["name", "set_name", "description", "price", "price_label", "portion_label", "image_url", "badge_label", "recommended", "is_sold_out", "price_visible", "portion_visible", "visible"];
    assert.deepEqual(preview.items.map(item => fields(item, itemFields)), savedItems.map(item => fields(item, itemFields)), "visible starter items");
    assert.deepEqual(preview.items.map(item => item.priceNote ?? null), savedItems.map(item => item.price_note ?? null));
    const itemIndex = (items: Record<string, unknown>[], id: unknown) => items.findIndex(item => item.id === id);
    assert.deepEqual(preview.priceOptions.map(option => ({ ...fields(option, ["label", "price", "price_label", "visible"]), item: itemIndex(preview.items, option.menu_item_id) })),
      (client.rows.get("menu_item_price_options") ?? []).map(option => ({ ...fields(option, ["label", "price", "price_label", "visible"]), item: itemIndex(savedItems, option.menu_item_id) })));
    const savedColumns = client.rows.get("menu_category_price_columns") ?? [];
    const savedValues = client.rows.get("menu_item_price_column_values") ?? [];
    assert.deepEqual(preview.categories.flatMap((category, index) => category.priceColumns.map(column => ({ category: index, key: column.key, label: column.label, visible: column.visible }))),
      savedColumns.map(column => ({ category: itemIndex(savedCategories, column.category_id), key: column.key, label: column.label, visible: column.visible })));
    assert.deepEqual(preview.items.flatMap((item, index) => item.priceColumnValues.map(value => ({ item: index, key: preview.categories.flatMap(category => category.priceColumns).find(column => column.id === value.priceColumnId)?.key, price: value.price, label: value.priceLabel ?? null, visible: value.visible }))),
      savedValues.map(value => ({ item: itemIndex(savedItems, value.menu_item_id), key: savedColumns.find(column => column.id === value.price_column_id)?.key, price: value.price, label: value.price_label ?? null, visible: value.visible })));
    assert.deepEqual((preview.widgets ?? []).map(widget => ({ type: widget.type, title: widget.title, description: widget.description, image: widget.imageUrl, visible: widget.visible })),
      (client.rows.get("menu_widgets") ?? []).map(widget => ({ type: widget.widget_type, title: widget.title, description: widget.description, image: widget.image_url, visible: widget.visible })), "widget visibility matches purchase");
    const categoryFields = ["name", "description", "description_visible", "course_price", "course_price_label", "course_price_visible", "course_price_description", "course_price_description_visible", "visible"];
    assert.deepEqual(preview.categories.map(category => fields(category, categoryFields)), savedCategories.map(category => fields(category, categoryFields)));
    assert.deepEqual(preview.pages.map(page => fields(page, ["title", "description", "description_visible", "visible"])), savedPages.map(page => fields(page, ["title", "description", "description_visible", "visible"])));
    const displaySettings = (value: unknown, items: Record<string, unknown>[]) => {
      const settings = mergePageSettings(value as never);
      return { ...settings, featured_item_id: items.findIndex(item => item.id === settings.featured_item_id), featured_slides: settings.featured_slides?.map(slide => ({ image_url: slide.image_url, featured_item_index: items.findIndex(item => item.id === slide.featured_item_id) })) };
    };
    assert.deepEqual(displaySettings(preview.menuSite.page_settings, preview.items), displaySettings(client.site.page_settings, savedItems), "all initial page visibility and cover settings");
    assert.deepEqual(resolveMenuAppearance(preview.menuSite.page_settings, design.templateKey, design.id), resolveMenuAppearance(client.site.page_settings, design.templateKey, design.id));
    assert.deepEqual(resolveMenuAppearance(client.site.page_settings, design.templateKey, design.id), getTemplateMenuAppearance(design.templateKey, design.id));
    assert.notEqual(getTemplateMenuAppearance(design.templateKey, design.id).chipShape, "template", "every active design must register a concrete default");
    assert.deepEqual(mergeTypographySettings(design.templateKey, getCustomTypographySettings(preview.menuSite.settings, preview.menuSite.page_settings)), mergeTypographySettings(design.templateKey, getCustomTypographySettings(client.site.settings, client.site.page_settings)), "font, size, weight and role color settings");
    assert.equal(preview.menuSite.cover_image_url ?? null, client.site.cover_image_url ?? null);
    assert.equal(preview.menuSite.logo_url ?? null, client.site.logo_url ?? null);
    if (design.service !== "display") assert.equal(preview.menuSite.brand_description, client.site.brand_description);
    assert.equal(applyTemplatePreviewOptions(preview, {}), preview, "unmodified preview adds no demo-only data");
    assert.equal(client.site.restaurant_name, "고객 매장", "merchant input remains authoritative");
  });
}

test("registered corners keep explicit merchant choices and full-bleed exclusions", () => {
  const saved = { design: { appearance: { imageRadii: { item: 13, logo: 7 }, chipShape: "pill" } } };
  assert.deepEqual(resolveMenuAppearance(saved, "cafe_mocha_forest_a"), { imageRadii: { advertisement: 8, cover: 8, item: 13, widget: 8, logo: 7 }, chipShape: "pill", albumImageRatio: "1:1" });
  assert.equal(getTemplateMenuAppearance("dining_aube_table_a").imageRadii.cover, undefined);
  assert.equal(getTemplateMenuAppearance("cafe_van_gogh_a").chipShape, "square");
  assert.deepEqual(Object.values(MENU_SHAPE_PRESETS).map(preset => [preset.imageRadius, preset.chipRadius]), [[0,0],[8,2],[16,4],[24,9999]]);
});

test("Van Gogh persists Belleza in its starter and preview while preserving Korean and saved faces", () => {
  const key = "cafe_van_gogh_a";
  assert.equal(getDefaultEnglishFontForTemplate(key).value, "belleza");
  assert.equal(getDefaultKoreanFontForTemplate(key).value, "pretendard");
  const starter = getStarterPreset(key);
  const preview = buildStarterPreviewData(key);
  const expected = { korean_font_key: "pretendard", english_font_key: "belleza", font_size_scale_key: "m" };
  assert.deepEqual(starter.site.settings?.typography, expected);
  const resolved = mergeTypographySettings(key, getCustomTypographySettings(preview.menuSite.settings, preview.menuSite.page_settings));
  assert.equal(resolved.korean_font_key, expected.korean_font_key);
  assert.equal(resolved.english_font_key, expected.english_font_key);
  assert.equal(mergeTypographySettings(key, { english_font_key: "special-elite" }).english_font_key, "special-elite");
});


test("corner list preview and registration share centered identity and white panels", () => {
 const preview = buildStarterPreviewData("cafe_design_a", null, "basic-upper-left");
 const design = (preview.menuSite.page_settings as { design: Record<string, unknown> }).design;
 assert.equal(design.representativeAlignment, "center");
 assert.equal(design.auxiliaryBackgroundColor, "#FFFFFF");
});
