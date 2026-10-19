import type { MenuPageData } from "./menu-page-data";
import type { DefaultDesignReview } from "./menu-design-policy";
import { TYPOGRAPHY_ROLE_KEYS } from "./template-typography-presets";
import { BADGE_STYLE_KEYS } from "./template-badge-styles";
import { getDefaultDesignOptions, type DefaultDesignOptions } from "./default-design-options";

const image = "/placeholders/starter/menu-item.svg";
const coverImage = "/placeholders/starter/default-cover.svg";
const ink = "#191c1b";

/** Isolated sample data. Never used to replace a customer's content on switching. */
export function buildDefaultDesignPreview(source: MenuPageData, design: DefaultDesignReview, options: DefaultDesignOptions = getDefaultDesignOptions({})): MenuPageData {
  if (source.menuSite.template_key !== design.renderer) throw new Error("Default design renderer mismatch");
  const data = structuredClone(source);
  const basic = design.layout === "basic-first-column";
  const title = basic ? "CAFE ARTIMENU" : "DINING ARTIMENU";
  const description = basic ? "좋은 커피와 갓 구운 디저트를 준비합니다." : "계절의 재료로 정성껏 준비한 식사를 만나보세요.";
  const roles = Object.fromEntries(TYPOGRAPHY_ROLE_KEYS.map(role => [role, {
    font_ko_key: "pretendard", font_en_key: "pretendard", size: "inherit",
    weight: role === "supporting" ? "regular" : "medium",
    color: role === "supporting" ? "#606561" : ink,
  }]));
  const settings = (data.menuSite.settings && typeof data.menuSite.settings === "object" && !Array.isArray(data.menuSite.settings)) ? data.menuSite.settings : {};
  data.menuSite = {
    ...data.menuSite, id: `default-design-preview-${design.id}`, name: title,
    restaurant_name: title, business_name: title, logo_url: null,
    intro_title: title, intro_description: description, description,
    brand_description: description, menu_cover_title: title,
    menu_cover_description: description, menu_cover_label: "MENU",
    cover_image_url: coverImage, brand_color: ink,
    settings: {
      ...settings,
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
    multi_page_cover_background_color: "#ffffff", multi_page_cover_background_opacity: 90,
  };
  const savedPage = data.menuSite.page_settings && typeof data.menuSite.page_settings === "object" && !Array.isArray(data.menuSite.page_settings) ? data.menuSite.page_settings : {};
  const savedDesign = savedPage.design && typeof savedPage.design === "object" && !Array.isArray(savedPage.design) ? savedPage.design : {};
  data.menuSite.page_settings = { ...savedPage, ...data.pageSettings, design: { ...savedDesign, backgroundColor: "#ffffff" } };
  data.items = data.items.map((item, index) => ({
    ...item, name: item.name.replace(/리얼 맛차/g, "말차").replace(/REAL MATCHA/g, "MATCHA"),
    set_name: item.set_name?.replace(/REAL MATCHA/g, "MATCHA") ?? null,
    image_url: options.imagesPreview ? image : null,
    badge: index === 0 ? "추천" : item.badge,
    badge_label: index === 0 ? "추천" : item.badge_label,
  }));
  data.pages = data.pages.map(page => ({ ...page, description: page.description?.replace(/오브 테이블/g, "아티메뉴 다이닝") ?? null }));
  data.categories = data.categories.map(category => ({ ...category, name: basic ? category.name.replace("MATCHA SIGNATURE", "SIGNATURE").replace("CLASSIC COFFEE", "COFFEE") : category.name.replace(/Aube signature/i, "Signature"), description_visible: true }));
  data.featuredSlides = (data.featuredSlides ?? []).map(slide => ({ ...slide, imageUrl: coverImage, featuredItemId: slide.featuredItemId ?? data.items[0]?.id ?? null }));
  data.timeSales = data.timeSales.map(sale => ({ ...sale, badgeBackgroundColor: ink }));
  // The basic starter demonstrates both price options and category-ordered widgets.
  if (basic) {
    const first = data.items[0];
    Object.assign(first, { name: "말차 라떼", set_name: "MATCHA LATTE", description: "부드러운 말차와 우유의 조화" });
    data.priceOptions = data.priceOptions.filter(option => option.menu_item_id !== first.id);
    data.priceOptions.push(
      { id: `${first.id}-hot`, menu_item_id: first.id, label: "HOT", price: 5500, price_label: "5.5", visible: true, sort_order: 0 },
      { id: `${first.id}-ice`, menu_item_id: first.id, label: "ICE", price: 6000, price_label: "6.0", visible: true, sort_order: 1 },
    );
    data.widgets = [
      { id: "default-text", menuSiteId: data.menuSite.id, menuPageId: data.pages[0].id, type: "text", title: "매장 이용 안내", description: "모든 음료는 포장할 수 있습니다.", imageUrl: null, imagePath: null, sortOrder: 100, visible: true, settings: { schemaVersion: 1, placement: "flow", textAlign: "left" } },
      { id: "default-image", menuSiteId: data.menuSite.id, menuPageId: data.pages[0].id, type: "image", title: null, description: null, imageUrl: image, imagePath: null, sortOrder: 101, visible: true, settings: { schemaVersion: 1, placement: "flow", aspectRatio: "3:1", objectFit: "cover", objectPosition: "center", altText: "이미지 위젯 예시" } },
    ];
  }
  if (!options.widgetsPreview) data.widgets = [];
  return data;
}
