import { buildStarterPreviewData } from "../template-starter-preview";
import type { TemplateKey } from "../templates";
import type { MenuWidget } from "../menu-widgets";

/** Disposable local-only sample; never reads or mutates a customer menu. */
export function buildWidgetPlacementFixture(key: TemplateKey, variant = "bottom") {
  const data = buildStarterPreviewData(key);
  const page = data.pages[0];
  data.pages = [page];
  data.categories = data.categories.slice(0, 2).map((category, index) => ({ ...category, menu_page_id: page.id, sort_order: index * 2, course_price: variant === "course" ? 90000 : null, course_price_label: variant === "course" ? "코스" : null }));
  data.items = data.categories.flatMap(category => {
    const examples = data.items.filter(item => item.category_id === category.id).slice(0, 2).map(item => ({ ...item, menu_page_id: page.id }));
    return variant === "long" ? Array.from({ length: 16 }, (_, index) => ({ ...examples[index % examples.length], id: `${category.id}-widget-qa-${index}`, sort_order: index })) : examples;
  });
  data.priceOptions = []; data.timeSales = []; data.traits = [];
  data.categories.forEach(category => { category.priceColumns = []; });
  data.items.forEach(item => { item.priceColumnValues = []; });
  const settings = data.menuSite.settings && typeof data.menuSite.settings === "object" && !Array.isArray(data.menuSite.settings) ? data.menuSite.settings : {};
  data.menuSite.settings = { ...settings, footer_notice_1: variant === "no-notices" ? "" : "안내사항 1", footer_notice_2: variant === "no-notices" ? "" : "안내사항 2", footer_notice_3: variant === "no-notices" ? "" : "안내사항 3" };
  data.pageSettings = { ...data.pageSettings, menu_cover_enabled: false, featured_item_enabled: false };
  data.menuSite.page_settings = data.pageSettings;
  data.widgets = [1, ...(variant === "multiple" ? [2] : [])].map((index): MenuWidget => ({
    id: `00000000-0000-4000-8000-00000000000${index}`, menuSiteId: data.menuSite.id, menuPageId: page.id,
    type: "text", title: `검수 위젯 ${index}`, description: "카테고리 사이에 저장한 위젯 순서를 확인합니다.",
    imageUrl: null, imagePath: null, sortOrder: variant === "first" ? -1 : variant === "last" ? 5 : index === 1 ? 1 : 3, visible: variant !== "hidden",
    settings: { schemaVersion: 1, textAlign: "left", placement: variant === "flow" ? "flow" : "bottom" },
  }));
  if (variant === "none") data.widgets = [];
  return data;
}
