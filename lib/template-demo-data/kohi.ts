import type { StarterPreset } from "@/lib/menu-starter-presets";
import type { SinglePageStarterTranslationBundle } from "./single-page-starter-translations";

const KOHI_FEATURED_IMAGE = "/menu-templates/cafe_design_a/nutty-cream-featured.jpg";

const categories = [
  { key: "espresso", name: "ESPRESSO BASED", description: "에스프레소 커피", en: ["ESPRESSO BASED", "Espresso classics"], zh: ["意式咖啡", "经典浓缩咖啡"], ja: ["エスプレッソ", "定番のコーヒー"] },
  { key: "pour-over", name: "POUR OVER", description: "한 잔씩 내리는 커피", en: ["POUR OVER", "Brewed by hand"], zh: ["手冲咖啡", "逐杯手工冲煮"], ja: ["ハンドドリップ", "一杯ずつ丁寧に"] },
  { key: "matcha-more", name: "MATCHA & MORE", description: "차와 부드러운 우유", en: ["MATCHA & MORE", "Tea meets milk"], zh: ["抹茶与更多", "茶香与柔滑牛奶"], ja: ["抹茶＆ティー", "お茶とミルク"] },
  { key: "specials", name: "SPECIALS", description: "코히만의 한 잔", en: ["SPECIALS", "Made the KOHI way"], zh: ["招牌特饮", "KOHI的特别一杯"], ja: ["スペシャル", "コヒの特別な一杯"] },
  { key: "cakes-bakes", name: "CAKES & BAKES", description: "커피 곁의 작은 즐거움", en: ["CAKES & BAKES", "A little something sweet"], zh: ["蛋糕与烘焙", "咖啡旁的小甜点"], ja: ["ケーキ＆ベイク", "コーヒーのおとも"] },
] as const;

// Temporary, editable starter copy; no copied REAL MATCHA branding or products.
const items = [
  { category: "espresso", key: "espresso", price: 3500, ko: ["에스프레소", "견과와 다크 초콜릿의 짙은 풍미"], en: ["Espresso", "Deep notes of nuts and dark chocolate"], zh: ["浓缩咖啡", "浓郁的坚果与黑巧克力风味"], ja: ["エスプレッソ", "ナッツとダークチョコレートの深い味わい"] },
  { category: "espresso", key: "americano", price: 4500, ko: ["아메리카노", "깔끔한 끝맛의 데일리 블렌드"], en: ["Americano", "Our daily blend with a clean finish"], zh: ["美式咖啡", "尾韵清爽的日常拼配"], ja: ["アメリカーノ", "すっきりした後味のデイリーブレンド"] },
  { category: "espresso", key: "flat-white", price: 5000, ko: ["플랫화이트", "진한 커피와 촘촘한 우유 거품"], en: ["Flat White", "Bold espresso with finely textured milk"], zh: ["馥芮白", "浓郁咖啡与细腻奶泡"], ja: ["フラットホワイト", "濃厚なコーヒーときめ細かなミルク"] },
  { category: "espresso", key: "cafe-latte", price: 5200, ko: ["카페 라떼", "고소한 에스프레소와 부드러운 우유"], en: ["Cafe Latte", "Nutty espresso and smooth milk"], zh: ["咖啡拿铁", "坚果香浓缩咖啡与柔滑牛奶"], ja: ["カフェラテ", "香ばしいエスプレッソとなめらかなミルク"] },
  { category: "espresso", key: "cappuccino", price: 5200, ko: ["카푸치노", "풍성한 밀크폼과 은은한 코코아"], en: ["Cappuccino", "Fluffy milk foam with a hint of cocoa"], zh: ["卡布奇诺", "丰盈奶泡与淡淡可可香"], ja: ["カプチーノ", "ふんわりしたミルクフォームとほのかなココア"] },
  { category: "pour-over", key: "ethiopia", price: 6500, ko: ["에티오피아", "꽃향과 베리의 산뜻한 여운"], en: ["Ethiopia", "Floral aroma and a bright berry finish"], zh: ["埃塞俄比亚", "花香与清新的莓果尾韵"], ja: ["エチオピア", "花の香りと爽やかなベリーの余韻"] },
  { category: "pour-over", key: "colombia", price: 6500, ko: ["콜롬비아", "카라멜의 단맛과 균형 잡힌 산미"], en: ["Colombia", "Caramel sweetness and balanced acidity"], zh: ["哥伦比亚", "焦糖甜感与均衡酸度"], ja: ["コロンビア", "キャラメルの甘みとバランスのよい酸味"] },
  { category: "pour-over", key: "decaf", price: 6500, ko: ["디카페인", "부담 없이 즐기는 고소한 한 잔"], en: ["Decaf", "A mellow, nutty cup without the caffeine"], zh: ["低因咖啡", "轻松享用的柔和坚果风味"], ja: ["デカフェ", "気軽に楽しめる香ばしい一杯"] },
  { category: "matcha-more", key: "matcha-latte", price: 6000, ko: ["맛차 라떼", "선명한 맛차 향과 담백한 우유"], en: ["Matcha Latte", "Vivid matcha aroma with smooth milk"], zh: ["抹茶拿铁", "鲜明的抹茶香与清爽牛奶"], ja: ["抹茶ラテ", "鮮やかな抹茶の香りとやさしいミルク"] },
  { category: "matcha-more", key: "hojicha-latte", price: 6000, ko: ["호지차 라떼", "차분하게 볶은 차의 구수한 향"], en: ["Hojicha Latte", "Warm, toasted tea notes with milk"], zh: ["焙茶拿铁", "温暖醇香的烘焙茶香"], ja: ["ほうじ茶ラテ", "じっくり焙じたお茶の香ばしい香り"] },
  { category: "matcha-more", key: "chai-latte", price: 6000, ko: ["차이 라떼", "향신료와 홍차가 어우러진 밀크티"], en: ["Chai Latte", "Black tea and warming spices with milk"], zh: ["印度香料奶茶", "香料与红茶交织的奶茶"], ja: ["チャイラテ", "スパイスと紅茶を合わせたミルクティー"] },
  { category: "specials", key: "kohi-cream-coffee", price: 6500, badge: "SIGNATURE", ko: ["코히 크림 커피", "고소한 너트 크림을 올린 시그니처 커피"], en: ["KOHI Cream Coffee", "Our signature coffee topped with nut cream"], zh: ["KOHI奶油咖啡", "以坚果奶油点缀的招牌咖啡"], ja: ["コヒクリームコーヒー", "香ばしいナッツクリームをのせたシグネチャー"] },
  { category: "specials", key: "affogato", price: 6500, ko: ["아포가토", "바닐라 아이스크림 위에 부은 에스프레소"], en: ["Affogato", "Espresso poured over vanilla ice cream"], zh: ["阿芙佳朵", "香草冰淇淋淋上浓缩咖啡"], ja: ["アフォガート", "バニラアイスに注ぐエスプレッソ"] },
  { category: "specials", key: "lemon-soda", price: 5800, ko: ["레몬 소다", "직접 담근 레몬청과 청량한 탄산"], en: ["Lemon Soda", "House-made lemon syrup and sparkling water"], zh: ["柠檬苏打", "自制柠檬糖浆与清爽气泡"], ja: ["レモンソーダ", "自家製レモンシロップと爽やかな炭酸"] },
  { category: "cakes-bakes", key: "basque-cheesecake", price: 6500, badge: "BEST", ko: ["바스크 치즈케이크", "진한 치즈와 부드러운 속결의 케이크"], en: ["Basque Cheesecake", "Rich cheese with a soft, creamy center"], zh: ["巴斯克芝士蛋糕", "浓郁芝士与柔滑内芯"], ja: ["バスクチーズケーキ", "濃厚なチーズとなめらかな口どけ"] },
  { category: "cakes-bakes", key: "chocolate-brownie", price: 4800, ko: ["초콜릿 브라우니", "다크 초콜릿을 듬뿍 담아 구운 브라우니"], en: ["Chocolate Brownie", "Baked with a generous amount of dark chocolate"], zh: ["巧克力布朗尼", "加入丰富黑巧克力烘烤的布朗尼"], ja: ["チョコレートブラウニー", "ダークチョコレートをたっぷり使ったブラウニー"] },
  { category: "cakes-bakes", key: "butter-scone", price: 4500, ko: ["버터 스콘", "겉은 바삭하고 속은 촉촉한 버터 스콘"], en: ["Butter Scone", "Crisp outside, tender inside, full of butter"], zh: ["黄油司康", "外酥内软的浓香黄油司康"], ja: ["バタースコーン", "外はさっくり、中はしっとりしたスコーン"] },
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
      settings: {
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
      badge_background_color: "#000000",
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
          name: item.ko[0],
          set_name: item.en[0].toUpperCase(),
          price: item.price,
          description: item.ko[1],
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
    items: Object.fromEntries(items.map((item) => [item.key, { name: item[locale][0], description: item[locale][1] }])),
    promotions: { "basque-cheesecake-time-deal": { badgeText: copy.saleBadge } },
  };
}

export const KOHI_TRANSLATIONS: SinglePageStarterTranslationBundle = { en: localeCopy("en"), zh: localeCopy("zh"), ja: localeCopy("ja") };
