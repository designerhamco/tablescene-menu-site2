import type { StarterPreset } from "@/lib/menu-starter-presets";

const COVER = "/menu-templates/dining_aube_table_a/aube-table-cover.png";
export const ONUE_STARTER: StarterPreset = {
  key: "restaurant", template_key: "restaurant_onue_a",
  site: {
    restaurant_name: "ONUE TABLE", restaurant_category: "레스토랑·다이닝", restaurant_type: "restaurant",
    menu_cover_label: "SEASONAL DINING", intro_title: "ONUE TABLE",
    intro_description: "제철의 맛을 담아, 여유로운 한 끼를 준비합니다.",
    brand_description: "제철의 맛을 담아, 여유로운 한 끼를 준비합니다.",
    menu_cover_title: "ONUE TABLE", menu_cover_description: "계절을 나누는 따뜻한 식탁",
    about_description: "좋은 재료와 정성으로 완성하는 작은 다이닝입니다.",
    opening_hours: "매일 11:30–22:00", restaurant_address: "서울시 예시구 온유길 18", restaurant_phone: "02-0000-0018",
    cover_image_url: COVER,
    settings: { footer_notice_1: "런치 11:30–15:00 · 디너 17:00–22:00", footer_notice_2: "알레르기 유발 식재료는 직원에게 문의해 주세요.", footer_notice_3: "모든 가격은 부가세 포함입니다." },
  },
  menu_cover_enabled: true, menu_cover_visible_pc: true, menu_cover_visible_tablet: true, menu_cover_visible_mobile: true,
  featured_item_key: "scallop", featured_item_name: "버터 관자 구이",
  featured_slides: [{ id: "onue-featured", image_url: COVER, image_path: null, featured_item_key: "scallop", featured_item_name: "버터 관자 구이", sort_order: 0 }],
  chefs: [], events: [], socialLinks: [], widgets: [], time_sales: [],
  pages: [{ key: "main-menu", title: "온유 테이블 메뉴", legacy_section_key: "main_menu", categories: [
    { key: "signature", name: "SIGNATURE", description: "온유의 계절을 담은 세 가지", description_visible: true, items: [
      { key: "scallop", name: "버터 관자 구이", set_name: "SEARED SCALLOP", price: 24000, description: "노릇하게 구운 관자와 허브 퓌레", image_url: COVER, badge_label: "SIGNATURE", recommended: true },
      { key: "cheese", name: "아티장 치즈 플레이트", set_name: "ARTISAN CHEESE", price: 22000, description: "숙성 치즈와 제철 과일, 크래커", image_url: "/menu-templates/cafe_round_focus_a/cheese-platter.jpg" },
      { key: "chicken", name: "스파이시 치킨 윙", set_name: "SPICY CHICKEN WINGS", price: 21000, description: "매콤한 글레이즈와 바삭한 치킨 윙", image_url: "/menu-templates/cafe_round_focus_a/spicy-chicken-wings.jpg" },
    ] },
    { key: "starters", name: "STARTERS", description: "식탁을 여는 가벼운 한 접시", description_visible: true, items: [
      { key: "salad", name: "시트러스 가든 샐러드", price: 14000, description: "어린잎 채소와 오렌지, 레몬 드레싱" },
      { key: "burrata", name: "부라타 토마토", price: 17000, description: "부라타 치즈와 완숙 토마토, 바질 오일" },
      { key: "soup", name: "오늘의 수프", price: 9000, description: "제철 채소로 끓인 수프와 사워도우" },
    ] },
    { key: "mains", name: "PASTA & MAINS", description: "천천히 즐기는 든든한 메인", description_visible: true, items: [
      { key: "ragu", name: "슬로우 라구 파스타", price: 23000, description: "오래 끓인 소고기 라구와 파르미자노" },
      { key: "prawn", name: "레몬 새우 링귀니", price: 25000, description: "새우와 레몬 버터 소스, 이탈리안 파슬리" },
      { key: "risotto", name: "포르치니 리소토", price: 24000, description: "깊은 버섯 향과 크리미한 쌀의 조화" },
      { key: "steak", name: "채끝 스테이크", price: 42000, description: "그릴 채끝과 구운 채소, 레드와인 소스" },
    ] },
    { key: "sides", name: "SIDES", items: [
      { key: "fries", name: "트러플 프라이", price: 9000, description: "트러플 오일과 파르미자노 치즈" },
      { key: "bread", name: "사워도우 & 버터", price: 6000, description: "따뜻한 사워도우와 휘핑 버터" },
    ] },
    { key: "dessert", name: "SWEET FINISH", items: [
      { key: "tiramisu", name: "클래식 티라미수", price: 9000, description: "에스프레소와 마스카르포네 크림" },
      { key: "panna", name: "바닐라 판나코타", price: 8000, description: "바닐라 크림과 계절 과일 콩포트" },
    ] },
    { key: "drinks", name: "DRINKS", items: [
      { key: "americano", name: "아메리카노", price: 5000, description: "" },
      { key: "ade", name: "자몽 로즈메리 에이드", price: 7000, description: "" },
      { key: "wine", name: "하우스 와인", price: 10000, description: "레드 또는 화이트 · 잔" },
    ] },
  ] }],
};
