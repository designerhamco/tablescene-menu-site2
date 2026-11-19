import { buildStarterPreviewData } from "./template-starter-preview";
import { translateDiningStarterText } from "./template-demo-data/starter-preview-localization";
import { diningSampleNames, getStandardDesignCopy, neutralizeDiningSampleText } from "./standard-design-copy";
import { AUBE_TABLE_DEFAULT_COVER_BACKGROUND_OPACITY } from "./aube-table";
import { localizeDefaultDesignPreview } from "./default-design-localization";
import type { MenuPageData } from "./menu-page-data";
import type { DefaultDesignReview } from "./menu-design-policy";
import { TYPOGRAPHY_ROLE_KEYS } from "./template-typography-presets";
import { BADGE_STYLE_KEYS } from "./template-badge-styles";
import { getDefaultDesignOptions, type DefaultDesignOptions } from "./default-design-options";

const image = "/placeholders/starter/default-menu-item.svg";
const ink = "#191c1b";


/** Isolated sample data. Never used to replace a customer's content on switching. */
export function buildDefaultDesignPreview(source: MenuPageData, design: DefaultDesignReview, options: DefaultDesignOptions = getDefaultDesignOptions({ design: design.id })): MenuPageData {
  if (source.menuSite.template_key !== design.renderer) throw new Error("Default design renderer mismatch");
  const basic = design.layout.startsWith("basic-");
  const data = basic ? buildStarterPreviewData(design.renderer, null, design.id) : structuredClone(source);
  const imageFreeCategories = new Set(basic ? data.categories.filter(category => category.name === "디저트").map(category => category.id) : []);
  const { coverImage, title, description } = getStandardDesignCopy(design);
  const roles = Object.fromEntries(TYPOGRAPHY_ROLE_KEYS.map(role => [role, {
    font_ko_key: "pretendard", font_en_key: "pretendard", size: "inherit",
    weight: role === "brand" || role === "category" ? "bold" : role === "supporting" ? "regular" : "medium",
    color: role === "supporting" ? "#606561" : ink,
  }]));
  const settings = (data.menuSite.settings && typeof data.menuSite.settings === "object" && !Array.isArray(data.menuSite.settings)) ? data.menuSite.settings : {};
  data.menuSite = {
    ...data.menuSite, id: `default-design-preview-${design.id}`, name: title,
    restaurant_name: title, business_name: title, logo_url: options.logoPreview ? "/placeholders/starter/default-logo.svg" : null,
    intro_title: title, intro_description: description, description,
    brand_description: description, menu_cover_title: title,
    menu_cover_description: description, menu_cover_label: "MENU",
    cover_image_url: coverImage, brand_color: ink,
    settings: {
      ...settings,
      advertisementPopup: { enabled: options.popupPreview, images: [1, 2, 3].map(number => ({ imageUrl: `/placeholders/starter/default-popup-${number}.svg`, imagePath: null })) },
      logo_replaces_name: options.logoPreview,
      typography: { korean_font_key: "pretendard", english_font_key: "pretendard", font_size_scale_key: "m", typography_roles: roles },
      badge_styles: Object.fromEntries(BADGE_STYLE_KEYS.map(key => [key, { background_color: ink, text_color: "#ffffff" }])),
      footer_notice_1: "영업시간 10:00–21:00",
      footer_notice_2: "알레르기가 있다면 주문 전 알려주세요.",
      footer_notice_3: "모든 가격은 부가세 포함입니다.",
    },
  };
  data.pageSettings = {
    ...data.pageSettings, menu_cover_enabled: options.coverPreview,
    featured_item_enabled: options.featuredPreview,
    menu_cover_visible_pc: true, menu_cover_visible_tablet: true, menu_cover_visible_mobile: true,
    ...(!basic ? { cover_image_visible: options.coverImagesPreview } : {}),
    multi_page_cover_background_color: !basic && options.coverImagesPreview ? "#000000" : "#ffffff",
    multi_page_cover_background_opacity: !basic && options.coverImagesPreview ? AUBE_TABLE_DEFAULT_COVER_BACKGROUND_OPACITY : 90,
  };
  const savedPage = data.menuSite.page_settings && typeof data.menuSite.page_settings === "object" && !Array.isArray(data.menuSite.page_settings) ? data.menuSite.page_settings : {};
  const savedDesign = savedPage.design && typeof savedPage.design === "object" && !Array.isArray(savedPage.design) ? savedPage.design : {};
  data.menuSite.page_settings = { ...savedPage, ...data.pageSettings, design: { ...savedDesign, backgroundColor: "#ffffff" } };
  data.items = data.items.map((item, index) => ({
    ...item, name: (!basic ? diningSampleNames[item.name]?.[0] : undefined) ?? item.name.replace(/리얼 맛차/g, "말차").replace(/REAL MATCHA/g, "MATCHA"),
    set_name: (!basic ? diningSampleNames[item.name]?.[1] : undefined) ?? item.set_name?.replace(/REAL MATCHA/g, "MATCHA") ?? (!basic ? translateDiningStarterText(source.menuSite.template_key, item.name, "en").toUpperCase() : null),
    image_url: options.imagesPreview && !imageFreeCategories.has(item.category_id ?? "") ? image : null,
    badge: index === 0 ? "추천" : item.badge,
    badge_label: index === 0 ? "추천" : item.badge_label,
  }));
  data.pages = data.pages.map(page => ({ ...page, description: page.description ? neutralizeDiningSampleText(page.description) : null, description_visible: options.pageDescriptionsPreview }));
  data.categories = data.categories.map(category => ({ ...category,
    name: basic ? category.name : neutralizeDiningSampleText(category.name.replace(/Aube signature/i, "Signature")),
    description: category.description || "정성껏 준비한 메뉴를 만나보세요.",
    description_visible: options.categoryDescriptionsPreview,
  }));
  data.featuredSlides = (data.featuredSlides ?? []).map(slide => ({ ...slide, imageUrl: coverImage, featuredItemId: slide.featuredItemId ?? data.items[0]?.id ?? null }));
  data.timeSales = basic && options.timeSalesPreview ? data.timeSales.map(sale => ({ ...sale, badgeBackgroundColor: ink })) : [];
  // The basic starter demonstrates both price options and category-ordered widgets.
  if (basic) {
    data.items = data.items.map(item => ({ ...item, priceNote: options.priceNotesPreview ? item.priceNote : null }));
    if (!options.priceOptionsPreview) {
      data.priceOptions = [];
      data.categories = data.categories.map(category => ({ ...category, priceColumns: [] }));
      data.items = data.items.map(item => ({ ...item, priceColumnValues: [] }));
    }
    data.widgets = [{ id: "default-full-widget", menuSiteId: data.menuSite.id, menuPageId: data.pages[0].id, type: "image_text", title: "매장 이용 안내", description: "모든 음료는 포장할 수 있습니다.", imageUrl: image, imagePath: null, sortOrder: 100, visible: true, settings: { schemaVersion: 1, placement: "flow", textAlign: "left", aspectRatio: "3:1", objectFit: "cover", objectPosition: "center", altText: "매장 이용 안내" } }];
  }
  if (!basic && !options.priceOptionsPreview) data.priceOptions = [];
  // One clear sold-out example, away from the first orderable product/course.
  const soldOutItem = basic
    ? data.items.find(item => item.name === "치즈 케이크")
    : data.items.find(item => item.name.includes("랍스터"));
  data.items = data.items.map(item => ({
    ...item,
    set_name: options.secondaryNamesPreview ? item.set_name : null,
    description: options.descriptionsPreview ? item.description : null,
    ...(options.badgesPreview ? {} : { badge: null, badge_label: null, badge_type: "none" as const, recommended: false }),
    is_sold_out: options.soldOutPreview && item.id === soldOutItem?.id,
  }));
  if (!options.widgetsPreview) data.widgets = [];
  return localizeDefaultDesignPreview(data, source, source.locale, design);
}
