const CAFE_A_MATCHA_FEATURED_IMAGE = "/menu-templates/cafe_design_a/malcha_present.jpg";
const CAFE_A_NUTTY_FEATURED_IMAGE = "/menu-templates/cafe_design_a/nutty-cream-featured.jpg";
const CAFE_A_BLACK_SESAME_FEATURED_IMAGE = "/menu-templates/cafe_design_a/black-sesame-featured.jpg";
const CAFE_A_MATCHA_ITEM_IMAGE = "/menu-templates/cafe_design_a/malcha.jpg";
const CAFE_A_NUTTY_ITEM_IMAGE = "/menu-templates/cafe_design_a/nutty-cream.jpeg";
const CAFE_A_BLACK_SESAME_ITEM_IMAGE = "/menu-templates/cafe_design_a/black-sesame.jpeg";
const CAFE_A_STARTER_TIME_SALE_ACCENT = "#A30000";

const HOT_ICE_COLUMNS = [
  { key: "hot", label: "HOT" },
  { key: "ice", label: "ICE" },
] as const;

function hotIce(hot: number | null, ice: number | null) {
  return [
    ...(hot == null ? [] : [{ key: "hot", price: hot }]),
    ...(ice == null ? [] : [{ key: "ice", price: ice }]),
  ];
}

export const CAFE_DESIGN_A_STITCH_SAMPLE = {
  site: {
    restaurant_name: "AUBE COFFEE",
    restaurant_category: "카페",
    restaurant_type: "cafe",
    menu_cover_label: "SPECIALTY COFFEE",
    intro_title: "AUBE COFFEE",
    intro_description: "신선한 스페셜티 원두와 유기농 재료로 건강하고 다채로운 맛을 제안합니다.",
    brand_description: "오브 커피는 신선한 스페셜티 원두와 유기농 재료를 사용하여 건강하고 다채로운 맛을 제안하는 모던 카페 브랜드입니다.",
    menu_cover_title: "AUBE COFFEE",
    menu_cover_description: "신선한 스페셜티 원두와 유기농 재료를 사용하여 건강하고 다채로운 맛을 제안하는 모던 카페 브랜드입니다.",
    about_description: "정돈된 메뉴와 시그니처 음료를 중심으로 선명한 카페 경험을 제안합니다.",
    opening_hours: "매일 10:00 - 21:00",
    restaurant_address: "서울시 예시구 오브로 12",
    restaurant_phone: "02-0000-0000",
    cover_image_url: CAFE_A_MATCHA_FEATURED_IMAGE,
    settings: {
      footer_notice_1: "Wi-Fi AUBE_GUEST · PW 1234-5678",
      footer_notice_2: "Instagram @aube_coffee",
      footer_notice_3: "",
    },
  },
  featured_slides: [
    {
      id: "cafe-a-featured-jeju-matcha-cream-latte",
      image_url: CAFE_A_MATCHA_FEATURED_IMAGE,
      image_path: null,
      featured_item_key: "jeju-matcha-cream-latte",
      featured_item_name: "제주 말차 크림 라떼",
      sort_order: 0,
    },
    {
      id: "cafe-a-featured-nutty-cream-latte",
      image_url: CAFE_A_NUTTY_FEATURED_IMAGE,
      image_path: null,
      featured_item_key: "nutty-cream-latte",
      featured_item_name: "너티 크림 라떼",
      sort_order: 1,
    },
    {
      id: "cafe-a-featured-black-sesame-cream-latte",
      image_url: CAFE_A_BLACK_SESAME_FEATURED_IMAGE,
      image_path: null,
      featured_item_key: "black-sesame-cream-latte",
      featured_item_name: "흑임자 크림 라떼",
      sort_order: 2,
    },
  ],
  time_sales: [
    {
      key: "americano-morning-deal",
      name: "아메리카노 모닝딜",
      schedule_type: "once",
      badge_text: "모닝딜",
      badge_background_color: CAFE_A_STARTER_TIME_SALE_ACCENT,
      time_display_mode: "message",
      time_display_text: "매일 오전 8시부터 10시까지",
      targets: [
        { target_item_key: "americano", target_item_name: "아메리카노", target_price_column_key: "hot", sale_price: 2500 },
        { target_item_key: "americano", target_item_name: "아메리카노", target_price_column_key: "ice", sale_price: 3000 },
      ],
    },
    {
      key: "classic-butter-scone-closeout",
      name: "클래식 버터 스콘 재고 마감",
      schedule_type: "once",
      duration_minutes: 60,
      badge_text: "재고 마감",
      badge_background_color: CAFE_A_STARTER_TIME_SALE_ACCENT,
      time_display_mode: "countdown",
      targets: [{ target_item_key: "classic-butter-scone", target_item_name: "클래식 버터 스콘", sale_price: 2200 }],
    },
  ],
  widgets: [],
  mixed_content_order: [
    { block_type: "category", page_key: "main-menu", category_key: "signature-coffee", sort_order: 0 },
    { block_type: "category", page_key: "main-menu", category_key: "classic-coffee", sort_order: 1 },
    { block_type: "category", page_key: "main-menu", category_key: "non-coffee", sort_order: 2 },
    { block_type: "category", page_key: "main-menu", category_key: "ade", sort_order: 3 },
    { block_type: "category", page_key: "main-menu", category_key: "bakery", sort_order: 4 },
  ],
  pages: [
    {
      key: "main-menu",
      title: "메뉴 페이지 1",
      legacy_section_key: "main_menu",
      categories: [
        {
          key: "signature-coffee",
          name: "SIGNATURE COFFEE",
          items: [
            {
              key: "jeju-matcha-cream-latte",
              name: "제주 말차 크림 라떼",
              set_name: "JEJU MATCHA CREAM LATTE",
              price: 5800,
              description: "진한 제주 말차와 부드러운 크림을 올린 시그니처 라떼",
              image_url: CAFE_A_MATCHA_ITEM_IMAGE,
              badge_label: "SIGNATURE",
              recommended: true,
              price_note: "ICE ONLY",
            },
            {
              key: "nutty-cream-latte",
              name: "너티 크림 라떼",
              set_name: "NUTTY CREAM LATTE",
              price: 5500,
              description: "고소한 견과 크림 라떼",
              image_url: CAFE_A_NUTTY_ITEM_IMAGE,
              badge_label: "BEST",
              recommended: true,
              price_note: "ICE ONLY",
            },
            {
              key: "black-sesame-cream-latte",
              name: "흑임자 크림 라떼",
              set_name: "BLACK SESAME CREAM LATTE",
              price: 5800,
              description: "깊고 고소한 흑임자 크림을 더한 부드러운 라떼",
              image_url: CAFE_A_BLACK_SESAME_ITEM_IMAGE,
              price_note: "ICE ONLY",
            },
          ],
        },
        {
          key: "classic-coffee",
          name: "CLASSIC COFFEE",
          description: "원두 선택: 고소한 블렌드 / 산뜻한 싱글오리진 / 디카페인 +500원",
          description_visible: true,
          price_columns: HOT_ICE_COLUMNS,
          items: [
            {
              key: "americano",
              name: "아메리카노",
              set_name: "AMERICANO",
              price: 3500,
              description: "깔끔한 산미와 고소한 밸런스",
              price_column_values: hotIce(3500, 4000),
            },
            {
              key: "cafe-latte",
              name: "카페 라떼",
              set_name: "CAFE LATTE",
              price: 4000,
              description: "부드러운 우유와 에스프레소",
              price_column_values: hotIce(4000, 4500),
            },
          ],
        },
        {
          key: "non-coffee",
          name: "NON-COFFEE",
          section_key: "dessert_drink",
          price_columns: HOT_ICE_COLUMNS,
          items: [
            {
              key: "valrhona-choco-latte",
              name: "발로나 초코 라떼",
              set_name: "VALRHONA CHOCO LATTE",
              price: 5000,
              description: "진한 발로나 초콜릿의 깊은 풍미",
              price_column_values: hotIce(5000, 5500),
            },
          ],
        },
        {
          key: "ade",
          name: "ADE",
          section_key: "dessert_drink",
          items: [
            {
              key: "lemon-basil-ade",
              name: "레몬 바질 에이드",
              set_name: "LEMON BASIL ADE",
              price: 5500,
              description: "생레몬즙과 바질의 청량함",
              badge_label: "NEW",
              price_note: "ICE ONLY",
            },
          ],
        },
        {
          key: "bakery",
          name: "BAKERY",
          section_key: "dessert_drink",
          items: [
            {
              key: "classic-butter-scone",
              name: "클래식 버터 스콘",
              set_name: "CLASSIC BUTTER SCONE",
              price: 3200,
              description: "프랑스산 고메버터 풍미",
            },
          ],
        },
      ],
    },
  ],
} as const;
