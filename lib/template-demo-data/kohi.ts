import type { StarterPreset } from "@/lib/menu-starter-presets";
import type { SinglePageStarterTranslationBundle } from "./single-page-starter-translations";

const KOHI_FEATURED_IMAGE = "/menu-templates/cafe_design_a/nutty-cream-featured.jpg";
const KOHI_LOGO_IMAGE = "/menu-templates/cafe_kohi_a/kohi-outfit-logo.svg";

const categories = [
  { key: "espresso", name: "ESPRESSO BASED", description: "에스프레소 커피", en: ["ESPRESSO BASED", "Espresso classics"], zh: ["意式咖啡", "经典浓缩咖啡"], ja: ["エスプレッソ", "定番のコーヒー"] },
  { key: "pour-over", name: "POUR OVER", description: "한 잔씩 내리는 커피", en: ["POUR OVER", "Brewed by hand"], zh: ["手冲咖啡", "逐杯手工冲煮"], ja: ["ハンドドリップ", "一杯ずつ丁寧に"] },
  { key: "matcha-more", name: "MATCHA & MORE", description: "차와 부드러운 우유", en: ["MATCHA & MORE", "Tea meets milk"], zh: ["抹茶与更多", "茶香与柔滑牛奶"], ja: ["抹茶＆ティー", "お茶とミルク"] },
  { key: "specials", name: "SPECIALS", description: "코히만의 한 잔", en: ["SPECIALS", "Made the KOHI way"], zh: ["招牌特饮", "KOHI的特别一杯"], ja: ["スペシャル", "コヒの特別な一杯"] },
  { key: "cakes-bakes", name: "CAKES & BAKES", description: "커피 곁의 작은 즐거움", en: ["CAKES & BAKES", "A little something sweet"], zh: ["蛋糕与烘焙", "咖啡旁的小甜点"], ja: ["ケーキ＆ベイク", "コーヒーのおとも"] },
] as const;

// Temporary, editable starter copy; no copied REAL MATCHA branding or products.
const items = [
  { category: "espresso", key: "espresso", price: 3500, ko: "에스프레소", en: "Espresso", zh: "浓缩咖啡", ja: "エスプレッソ" },
  { category: "espresso", key: "americano", price: 4500, ko: "아메리카노", en: "Americano", zh: "美式咖啡", ja: "アメリカーノ" },
  { category: "espresso", key: "flat-white", price: 5000, ko: "플랫화이트", en: "Flat White", zh: "馥芮白", ja: "フラットホワイト" },
  { category: "espresso", key: "cafe-latte", price: 5200, ko: "카페 라떼", en: "Cafe Latte", zh: "咖啡拿铁", ja: "カフェラテ" },
  { category: "espresso", key: "cappuccino", price: 5200, ko: "카푸치노", en: "Cappuccino", zh: "卡布奇诺", ja: "カプチーノ" },
  { category: "pour-over", key: "ethiopia", price: 6500, ko: "에티오피아", en: "Ethiopia", zh: "埃塞俄比亚", ja: "エチオピア" },
  { category: "pour-over", key: "colombia", price: 6500, ko: "콜롬비아", en: "Colombia", zh: "哥伦比亚", ja: "コロンビア" },
  { category: "pour-over", key: "decaf", price: 6500, ko: "디카페인", en: "Decaf", zh: "低因咖啡", ja: "デカフェ" },
  { category: "matcha-more", key: "matcha-latte", price: 6000, ko: "맛차 라떼", en: "Matcha Latte", zh: "抹茶拿铁", ja: "抹茶ラテ" },
  { category: "matcha-more", key: "hojicha-latte", price: 6000, ko: "호지차 라떼", en: "Hojicha Latte", zh: "焙茶拿铁", ja: "ほうじ茶ラテ" },
  { category: "matcha-more", key: "chai-latte", price: 6000, ko: "차이 라떼", en: "Chai Latte", zh: "印度香料奶茶", ja: "チャイラテ" },
  { category: "specials", key: "kohi-cream-coffee", price: 6500, badge: "SIGNATURE", ko: "코히 크림 커피", en: "KOHI Cream Coffee", zh: "KOHI奶油咖啡", ja: "コヒクリームコーヒー" },
  { category: "specials", key: "affogato", price: 6500, ko: "아포가토", en: "Affogato", zh: "阿芙佳朵", ja: "アフォガート" },
  { category: "specials", key: "lemon-soda", price: 5800, ko: "레몬 소다", en: "Lemon Soda", zh: "柠檬苏打", ja: "レモンソーダ" },
  { category: "cakes-bakes", key: "basque-cheesecake", price: 6500, badge: "BEST", ko: "바스크 치즈케이크", en: "Basque Cheesecake", zh: "巴斯克芝士蛋糕", ja: "バスクチーズケーキ" },
  { category: "cakes-bakes", key: "chocolate-brownie", price: 4800, ko: "초콜릿 브라우니", en: "Chocolate Brownie", zh: "巧克力布朗尼", ja: "チョコレートブラウニー" },
  { category: "cakes-bakes", key: "butter-scone", price: 4500, ko: "버터 스콘", en: "Butter Scone", zh: "黄油司康", ja: "バタースコーン" },
] as const;

export function createKohiStarterPreset(base: StarterPreset): StarterPreset {
  return {
    ...base,
    template_key: "cafe_kohi_a",
    site: {
      ...base.site,
      restaurant_name: "KOHI",
      restaurant_category: "카페",
      menu_cover_label: "COFFEE & LITTLE PLEASURES",
      intro_title: "KOHI",
      menu_cover_title: "KOHI",
      intro_description: "좋은 커피와 작은 즐거움을 전하는 코히입니다.",
      brand_description: "좋은 커피와 작은 즐거움을 전하는 코히입니다.",
      menu_cover_description: "한 잔씩 정성껏 내리는 커피와 매일 준비하는 디저트.",
      about_description: "에스프레소부터 핸드드립까지, 오늘의 취향에 맞는 한 잔을 준비합니다.",
      opening_hours: "매일 09:00 - 20:00",
      restaurant_address: "서울시 예시구 커피로 24",
      restaurant_phone: "02-0000-0024",
      cover_image_url: KOHI_FEATURED_IMAGE,
      logo_url: KOHI_LOGO_IMAGE,
      settings: {
        logo_replaces_name: true,
        footer_notice_1: "디카페인 변경 +0.5 · 우유 변경 +0.5",
        footer_notice_2: "",
        footer_notice_3: "",
      },
    },
    featured_item_key: "kohi-cream-coffee",
    featured_item_name: "코히 크림 커피",
    featured_slides: [{ id: "kohi-featured-cream-coffee", image_url: KOHI_FEATURED_IMAGE, image_path: null, featured_item_key: "kohi-cream-coffee", featured_item_name: "코히 크림 커피", sort_order: 0 }],
    menu_cover_enabled: true,
    menu_cover_visible_pc: true,
    menu_cover_visible_tablet: true,
    menu_cover_visible_mobile: true,
    time_sales: [{
      key: "basque-cheesecake-time-deal",
      name: "바스크 치즈케이크 타임 할인",
      schedule_type: "once",
      duration_minutes: 60,
      badge_text: "타임 할인",
      badge_background_color: "#DC4235",
      time_display_mode: "countdown",
      targets: [{ target_item_key: "basque-cheesecake", target_item_name: "바스크 치즈케이크", sale_price: 5500 }],
    }],
    widgets: [],
    mixed_content_order: categories.map((category, index) => ({ block_type: "category", page_key: "main-menu", category_key: category.key, sort_order: index, visible: true })),
    pages: [{
      key: "main-menu",
      title: "메뉴 페이지 1",
      legacy_section_key: "main_menu",
      categories: categories.map((category) => ({
        key: category.key,
        name: category.name,
        section_key: "main_menu",
        description: category.description,
        description_visible: true,
        items: items.filter((item) => item.category === category.key).map((item) => ({
          key: item.key,
          name: item.ko,
          set_name: item.en.toUpperCase(),
          price: item.price,
          description: "",
          price_note: item.key === "kohi-cream-coffee" || item.key === "lemon-soda" ? "Ice only" : null,
          badge_label: "badge" in item ? item.badge : null,
          recommended: item.key === "kohi-cream-coffee",
        })),
      })),
    }],
  };
}

const siteCopy = {
  en: { restaurantCategory: "Cafe", description: "Good coffee and little pleasures, served at KOHI.", about: "From espresso to hand brew, find your cup for today.", notices: ["Decaf +0.5 · Alternative milk +0.5", "", ""], saleBadge: "TIME DEAL" },
  zh: { restaurantCategory: "咖啡馆", description: "KOHI，用好咖啡带来日常的小确幸。", about: "从浓缩到手冲，为今天挑选一杯喜欢的咖啡。", notices: ["低因更换 +0.5 · 植物奶更换 +0.5", "", ""], saleBadge: "限时特惠" },
  ja: { restaurantCategory: "カフェ", description: "おいしいコーヒーと小さな喜びを届けるコヒです。", about: "エスプレッソからハンドドリップまで、今日の一杯を。", notices: ["デカフェ変更 +0.5 · ミルク変更 +0.5", "", ""], saleBadge: "タイムセール" },
} as const;

function localeCopy(locale: "en" | "zh" | "ja") {
  const copy = siteCopy[locale];
  return {
    site: { restaurantName: "KOHI", restaurantCategory: copy.restaurantCategory, brandDescription: copy.description, introDescription: copy.description, menuCoverDescription: copy.description, aboutDescription: copy.about, footerNotices: [...copy.notices] as [string, string, string] },
    pageTitle: locale === "en" ? "Menu" : locale === "zh" ? "菜单" : "メニュー",
    categoryNames: Object.fromEntries(categories.map((category) => [category.key, category[locale][0]])),
    categoryDescriptions: Object.fromEntries(categories.map((category) => [category.key, category[locale][1]])),
    items: Object.fromEntries(items.map((item) => [item.key, { name: item[locale], description: "" }])),
    promotions: { "basque-cheesecake-time-deal": { badgeText: copy.saleBadge } },
  };
}

export const KOHI_TRANSLATIONS: SinglePageStarterTranslationBundle = { en: localeCopy("en"), zh: localeCopy("zh"), ja: localeCopy("ja") };
