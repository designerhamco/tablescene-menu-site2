const CAFE_A_MATCHA_FEATURED_IMAGE = "/menu-templates/cafe_design_a/malcha_present.jpg";
const CAFE_A_NUTTY_FEATURED_IMAGE = "/menu-templates/cafe_design_a/nutty-cream-featured.jpg";
const CAFE_A_BLACK_SESAME_FEATURED_IMAGE = "/menu-templates/cafe_design_a/black-sesame-featured.jpg";
const CAFE_A_MATCHA_ITEM_IMAGE = "/menu-templates/cafe_design_a/malcha.jpg";
const CAFE_A_NUTTY_ITEM_IMAGE = "/menu-templates/cafe_design_a/nutty-cream.jpeg";
const CAFE_A_BLACK_SESAME_ITEM_IMAGE = "/menu-templates/cafe_design_a/black-sesame.jpeg";

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
      featured_item_name: "제주 말차 크림 라떼",
      sort_order: 0,
    },
    {
      id: "cafe-a-featured-nutty-cream-latte",
      image_url: CAFE_A_NUTTY_FEATURED_IMAGE,
      image_path: null,
      featured_item_name: "너티 크림 라떼",
      sort_order: 1,
    },
    {
      id: "cafe-a-featured-black-sesame-cream-latte",
      image_url: CAFE_A_BLACK_SESAME_FEATURED_IMAGE,
      image_path: null,
      featured_item_name: "흑임자 크림 라떼",
      sort_order: 2,
    },
  ],
  time_sales: [
    {
      name: "아메리카노 모닝딜",
      schedule_type: "once",
      badge_text: "모닝딜",
      badge_background_color: "#a30000",
      time_display_mode: "message",
      time_display_text: "매일 오전 8시부터 10시까지",
      targets: [
        { target_item_name: "아메리카노", target_price_column_key: "hot", sale_price: 2500 },
        { target_item_name: "아메리카노", target_price_column_key: "ice", sale_price: 3000 },
      ],
    },
    {
      name: "클래식 버터 스콘 재고 마감",
      schedule_type: "once",
      duration_minutes: 60,
      badge_text: "재고 마감",
      badge_background_color: "#C62828",
      time_display_mode: "countdown",
      targets: [{ target_item_name: "클래식 버터 스콘", sale_price: 2200 }],
    },
  ],
  pages: [
    {
      title: "메뉴 페이지 1",
      legacy_section_key: "main_menu",
      categories: [
        {
          name: "SIGNATURE COFFEE",
          items: [
            {
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
              name: "너티 크림 라떼",
              set_name: "NUTTY CREAM LATTE",
              price: 5500,
              description: "고소한 견과류 크림과 에스프레소가 어우러진 라떼",
              image_url: CAFE_A_NUTTY_ITEM_IMAGE,
              badge_label: "BEST",
              recommended: true,
              price_note: "ICE ONLY",
            },
            {
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
          name: "CLASSIC COFFEE",
          description: "원두 선택: 고소한 블렌드 / 산뜻한 싱글오리진 / 디카페인 +500원",
          description_visible: true,
          price_columns: HOT_ICE_COLUMNS,
          items: [
            {
              name: "아메리카노",
              set_name: "AMERICANO",
              price: 3500,
              description: "깔끔한 산미와 고소한 밸런스",
              price_column_values: hotIce(3500, 4000),
            },
            {
              name: "카페 라떼",
              set_name: "CAFE LATTE",
              price: 4000,
              description: "부드러운 우유와 에스프레소",
              price_column_values: hotIce(4000, 4500),
            },
            {
              name: "바닐라 빈 라떼",
              set_name: "VANILLA BEAN LATTE",
              price: 4800,
              description: "마다가스카르 바닐라의 은은한 단맛",
              price_column_values: hotIce(4800, 5300),
            },
            {
              name: "플랫 화이트",
              set_name: "FLAT WHITE",
              price: 4300,
              description: "진한 에스프레소와 촘촘한 밀크폼",
              price_column_values: hotIce(4300, 4800),
            },
            {
              name: "콜드브루",
              set_name: "COLD BREW",
              price: 4500,
              description: "천천히 추출한 부드러운 콜드브루",
              price_column_values: hotIce(null, 4500),
            },
          ],
        },
        {
          name: "NON-COFFEE",
          section_key: "dessert_drink",
          price_columns: HOT_ICE_COLUMNS,
          items: [
            {
              name: "발로나 초코 라떼",
              set_name: "VALRHONA CHOCO LATTE",
              price: 5000,
              description: "진한 발로나 초콜릿의 깊은 풍미",
              price_column_values: hotIce(5000, 5500),
            },
            {
              name: "고구마 라떼",
              set_name: "SWEET POTATO LATTE",
              price: 4800,
              description: "부드러운 고구마와 우유의 달콤한 라떼",
              badge_label: "NEW",
              price_column_values: hotIce(4800, 5300),
            },
            {
              name: "블랙티 밀크티",
              set_name: "BLACK TEA MILK TEA",
              price: 4800,
              description: "진하게 우린 블랙티와 부드러운 우유",
              price_column_values: hotIce(4800, 5300),
            },
          ],
        },
        {
          name: "TEA",
          section_key: "dessert_drink",
          price_columns: HOT_ICE_COLUMNS,
          items: [
            {
              name: "유기농 캐모마일",
              set_name: "ORGANIC CHAMOMILE",
              price: 4300,
              description: "은은한 꽃향이 편안한 허브티",
              price_column_values: hotIce(4300, 4800),
            },
            {
              name: "얼그레이 리저브",
              set_name: "EARL GREY RESERVE",
              price: 4300,
              description: "베르가못 향이 선명한 클래식 티",
              price_column_values: hotIce(4300, 4800),
            },
            {
              name: "제주 유자차",
              set_name: "JEJU YUJA TEA",
              price: 4800,
              description: "제주 유자의 향긋함을 담은 따뜻한 티",
              badge_label: "NEW",
              price_column_values: hotIce(4800, 5300),
            },
          ],
        },
        {
          name: "ADE",
          section_key: "dessert_drink",
          items: [
            {
              name: "레몬 바질 에이드",
              set_name: "LEMON BASIL ADE",
              price: 5500,
              description: "생레몬즙과 바질의 청량함",
              price_note: "ICE ONLY",
            },
            {
              name: "자몽 에이드",
              set_name: "GRAPEFRUIT ADE",
              price: 5300,
              description: "자몽 과육과 탄산의 산뜻한 조화",
              price_note: "ICE ONLY",
            },
            {
              name: "청귤 에이드",
              set_name: "GREEN TANGERINE ADE",
              price: 5300,
              description: "청귤의 상큼함을 살린 시원한 에이드",
              price_note: "ICE ONLY",
            },
          ],
        },
        {
          name: "BAKERY",
          section_key: "dessert_drink",
          items: [
            {
              name: "클래식 버터 스콘",
              set_name: "CLASSIC BUTTER SCONE",
              price: 3200,
              description: "프랑스산 고메버터 풍미",
            },
            {
              name: "소금빵",
              set_name: "SALT BREAD",
              price: 2500,
              description: "짭조름한 버터 풍미의 담백한 빵",
            },
            {
              name: "아몬드 크루아상",
              set_name: "ALMOND CROISSANT",
              price: 3800,
              description: "고소한 아몬드 크림을 채운 크루아상",
            },
            {
              name: "휘낭시에",
              set_name: "FINANCIER",
              price: 1800,
              description: "버터 향이 진한 구움과자",
            },
          ],
        },
        {
          name: "DESSERT",
          section_key: "dessert_drink",
          items: [
            {
              name: "흑임자 바스크 치즈케이크",
              set_name: "BLACK SESAME BASQUE CHEESECAKE",
              price: 6200,
              description: "진한 흑임자 크림치즈 케이크",
            },
            {
              name: "티라미수",
              set_name: "TIRAMISU",
              price: 5800,
              description: "마스카포네 크림과 커피 향",
              badge_label: "NEW",
            },
            {
              name: "레몬 파운드케이크",
              set_name: "LEMON POUND CAKE",
              price: 3800,
              description: "상큼한 레몬 아이싱",
            },
            {
              name: "초콜릿 테린느",
              set_name: "CHOCOLATE TERRINE",
              price: 5800,
              description: "진한 초콜릿의 밀도 높은 풍미",
            },
          ],
        },
      ],
    },
  ],
} as const;
