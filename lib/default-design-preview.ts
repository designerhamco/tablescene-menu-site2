import { AUBE_TABLE_DEFAULT_COVER_BACKGROUND_OPACITY } from "./aube-table";
import { localizeDefaultDesignPreview } from "./default-design-localization";
import type { MenuPageData } from "./menu-page-data";
import type { DefaultDesignReview } from "./menu-design-policy";
import { TYPOGRAPHY_ROLE_KEYS } from "./template-typography-presets";
import { BADGE_STYLE_KEYS } from "./template-badge-styles";
import { getDefaultDesignOptions, type DefaultDesignOptions } from "./default-design-options";

const image = "/placeholders/starter/default-menu-item.svg";
const ink = "#191c1b";
const diningSampleNames: Record<string, readonly [string, string]> = {
  "Amuse-bouche": ["아뮤즈 부슈", "AMUSE-BOUCHE"],
  "Cold starter": ["차가운 전채", "COLD STARTER"],
  "Warm starter": ["따뜻한 전채", "WARM STARTER"],
  "Fish": ["생선 요리", "FISH"],
  "Main": ["메인 요리", "MAIN"],
  "Dessert": ["디저트", "DESSERT"],
  "관자와 시금치": ["관자와 시금치", "SCALLOPS & SPINACH"],
  "랍스터 비스크": ["랍스터 비스크", "LOBSTER BISQUE"],
  "제주 옥돔": ["제주 옥돔", "JEJU TILEFISH"],
  "한우 안심": ["한우 안심", "HANWOO TENDERLOIN"],
  "금귤과 바닐라": ["금귤과 바닐라", "KUMQUAT & VANILLA"],
  "초콜릿과 헤이즐넛": ["초콜릿과 헤이즐넛", "CHOCOLATE & HAZELNUT"],
  "Champagne": ["샴페인", "CHAMPAGNE"],
  "Chardonnay": ["샤르도네", "CHARDONNAY"],
  "Pinot noir": ["피노 누아", "PINOT NOIR"],
  "Seasonal mocktail": ["제철 목테일", "SEASONAL MOCKTAIL"],
  "Sparkling tea": ["스파클링 티", "SPARKLING TEA"],
  "Mineral water": ["미네랄 워터", "MINERAL WATER"],
  "Wine pairing": ["와인 페어링", "WINE PAIRING"],
  "Non-alcohol pairing": ["논알코올 페어링", "NON-ALCOHOL PAIRING"],
};

/** Isolated sample data. Never used to replace a customer's content on switching. */
export function buildDefaultDesignPreview(source: MenuPageData, design: DefaultDesignReview, options: DefaultDesignOptions = getDefaultDesignOptions({ design: design.id })): MenuPageData {
  if (source.menuSite.template_key !== design.renderer) throw new Error("Default design renderer mismatch");
  const data = structuredClone(source);
  const basic = design.layout.startsWith("basic-");
  const imageFreeCategories = new Set(basic ? source.categories.filter(category => category.name === "BAKERY").map(category => category.id) : []);
  const coverImage = basic ? "/placeholders/starter/default-basic-cover.svg" : "/placeholders/starter/default-cover.svg";
  const title = basic ? "CAFE ARTIMENU" : "DINING ARTIMENU";
  const description = basic ? design.layout === "basic-top-row" ? "좋은 커피와 갓 구운 디저트를 준비합니다. 향긋한 한 잔과 함께 편안한 시간을 즐겨보세요." : "좋은 커피와 갓 구운 디저트를 준비합니다." : "계절의 재료로 정성껏 준비한 식사를 만나보세요.";
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
    set_name: (!basic ? diningSampleNames[item.name]?.[1] : undefined) ?? item.set_name?.replace(/REAL MATCHA/g, "MATCHA") ?? null,
    image_url: options.imagesPreview && !imageFreeCategories.has(item.category_id ?? "") ? image : null,
    badge: index === 0 ? "추천" : item.badge,
    badge_label: index === 0 ? "추천" : item.badge_label,
  }));
  data.pages = data.pages.map(page => ({ ...page, description: page.description?.replace(/오브 테이블/g, "아티메뉴 다이닝") ?? null }));
  const basicCategoryDescriptions: Record<string, string> = {
    SIGNATURE: "좋은 재료로 완성한 시그니처 음료입니다.",
    BAKERY: "커피와 함께 즐기기 좋은 디저트입니다.",
  };
  data.categories = data.categories.map(category => {
    const name = basic ? category.name.replace("MATCHA SIGNATURE", "SIGNATURE").replace("CLASSIC COFFEE", "COFFEE") : category.name.replace(/Aube signature/i, "Signature");
    return { ...category, name, description: basic ? basicCategoryDescriptions[name] ?? null : category.description,
      description_visible: options.categoryDescriptionsPreview };
  });
  data.featuredSlides = (data.featuredSlides ?? []).map(slide => ({ ...slide, imageUrl: coverImage, featuredItemId: slide.featuredItemId ?? data.items[0]?.id ?? null }));
  data.timeSales = basic && options.timeSalesPreview ? data.timeSales.map(sale => ({ ...sale, badgeBackgroundColor: ink })) : [];
  // The basic starter demonstrates both price options and category-ordered widgets.
  if (basic) {
    const first = data.items[0];
    Object.assign(first, { name: "말차 라떼", set_name: "MATCHA LATTE", description: "부드러운 말차와 우유의 조화" });
    // Category price rails and per-item price descriptions are separate features.
    // Keep ordinary prices in all other categories, including discount examples.
    data.priceOptions = [];
    data.categories = data.categories.map(category => ({ ...category, priceColumns: [] }));
    data.items = data.items.map(item => ({ ...item, priceColumnValues: [], priceNote: options.priceNotesPreview ? item.priceNote : null }));
    if (options.priceOptionsPreview && design.itemLayout !== "album") {
      for (const [name, labels] of [["COFFEE", ["HOT", "ICE"]], ["ADE", ["Small", "Tall", "Large"]]] as const) {
        const category = data.categories.find(entry => entry.name === name);
        if (!category) continue;
        category.priceColumns = labels.map((label, index) => ({ id: `${category.id}-option-${index}`, categoryId: category.id, key: label.toLowerCase(), label, sortOrder: index, visible: true }));
        for (const item of data.items.filter(entry => entry.category_id === category.id)) {
          item.priceColumnValues = category.priceColumns.map((column, index) => ({ id: `${item.id}-${column.id}`, priceColumnId: column.id, price: (item.price ?? 5000) + index * 500, priceLabel: null, visible: true }));
        }
      }
    }
    data.widgets = [
      { id: "default-text", menuSiteId: data.menuSite.id, menuPageId: data.pages[0].id, type: "text", title: "매장 이용 안내", description: "모든 음료는 포장할 수 있습니다.", imageUrl: null, imagePath: null, sortOrder: 100, visible: true, settings: { schemaVersion: 1, placement: "flow", textAlign: "left" } },
      { id: "default-image", menuSiteId: data.menuSite.id, menuPageId: data.pages[0].id, type: "image", title: null, description: null, imageUrl: image, imagePath: null, sortOrder: 101, visible: true, settings: { schemaVersion: 1, placement: "flow", aspectRatio: "3:1", objectFit: "cover", objectPosition: "center", altText: "이미지 위젯 예시" } },
    ];
  }
  if (!basic && !options.priceOptionsPreview) data.priceOptions = [];
  // One clear sold-out example, away from the first orderable product/course.
  const soldOutItem = basic
    ? data.items.find(item => item.name === "플랫화이트")
    : data.items.find(item => item.name.includes("랍스터"));
  data.items = data.items.map(item => ({
    ...item,
    set_name: options.secondaryNamesPreview ? item.set_name : null,
    description: options.descriptionsPreview ? item.description : null,
    ...(options.badgesPreview ? {} : { badge: null, badge_label: null, badge_type: "none" as const, recommended: false }),
    is_sold_out: options.soldOutPreview && item.id === soldOutItem?.id,
  }));
  if (!options.widgetsPreview) data.widgets = [];
  return localizeDefaultDesignPreview(data, source, source.locale);
}
