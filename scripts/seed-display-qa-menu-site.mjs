#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";

const DEFAULT_TEMPLATE_KEY = "cafe_design_a";
const DEFAULT_TEMPLATE_CATEGORY = "cafe";
const DEFAULT_PRODUCT_KEY = "business_display_monthly";
const DEFAULT_SLUG_PREFIX = "display-qa";
const DEFAULT_DURATION_DAYS = 365;

const FULL_MENU_PAGE_DISPLAY_SETTINGS = {
  pageType: "menu",
  menuLayoutType: "full_menu",
  splitImage: {
    url: null,
    path: null,
    title: null,
    description: null,
    position: "left",
  },
  promotion: {
    title: null,
    description: null,
    mediaType: "image",
    mediaUrl: null,
    mediaPath: null,
    videoUrl: null,
    videoLoop: true,
  },
};

const SPLIT_MENU_PAGE_DISPLAY_SETTINGS = {
  ...FULL_MENU_PAGE_DISPLAY_SETTINGS,
  menuLayoutType: "split_image_menu",
  splitImagePosition: "left",
  splitImage: {
    url: "/placeholders/starter/cafe-a-cover.png",
    path: null,
    title: null,
    description: null,
    position: "left",
  },
};

const PROMOTION_PAGE_DISPLAY_SETTINGS = {
  ...FULL_MENU_PAGE_DISPLAY_SETTINGS,
  pageType: "promotion",
  menuLayoutType: null,
  promotion: {
    title: null,
    description: null,
    mediaType: "image",
    mediaUrl: "/placeholders/starter/cafe-a-cover.png",
    mediaPath: null,
    videoUrl: null,
    videoLoop: true,
  },
};

const SAMPLE_CATEGORIES = [
  {
    name: "SIGNATURE COFFEE",
    sortOrder: 0,
    items: [
      {
        name: "바질 크림 라떼",
        setName: "BASIL CREAM LATTE",
        description: "은은한 바질 향과 부드러운 크림이 어우러진 시그니처 라떼",
        price: 6500,
        priceLabel: null,
        portionLabel: "HOT / ICE",
        badgeLabel: "SIGNATURE",
        recommended: true,
        sortOrder: 0,
        priceOptions: [
          { label: "HOT", price: 6500, priceLabel: "6,500원", sortOrder: 0 },
          { label: "ICE", price: 6800, priceLabel: "6,800원", sortOrder: 1 },
        ],
      },
      {
        name: "흑임자 크림 라떼",
        setName: "BLACK SESAME LATTE",
        description: "고소한 흑임자 크림을 올린 진한 라떼",
        price: 6200,
        priceLabel: null,
        portionLabel: "ICE",
        badgeLabel: null,
        recommended: false,
        sortOrder: 1,
      },
      {
        name: "말차 에스프레소",
        setName: "MATCHA ESPRESSO",
        description: "쌉싸름한 말차와 에스프레소가 겹겹이 느껴지는 음료",
        price: 6200,
        priceLabel: null,
        portionLabel: "ICE",
        badgeLabel: "BEST",
        recommended: true,
        sortOrder: 2,
      },
    ],
  },
  {
    name: "CLASSIC COFFEE",
    sortOrder: 1,
    items: [
      {
        name: "아메리카노",
        setName: "AMERICANO",
        description: "깔끔하고 산뜻하게 즐기는 기본 커피",
        price: 4500,
        priceLabel: null,
        portionLabel: "HOT / ICE",
        badgeLabel: null,
        recommended: false,
        sortOrder: 0,
        priceOptions: [
          { label: "HOT", price: 4500, priceLabel: "4,500원", sortOrder: 0 },
          { label: "ICE", price: 4800, priceLabel: "4,800원", sortOrder: 1 },
        ],
      },
      {
        name: "카페 라떼",
        setName: "CAFE LATTE",
        description: "부드러운 우유와 에스프레소의 균형",
        price: 5200,
        priceLabel: null,
        portionLabel: "HOT / ICE",
        badgeLabel: null,
        recommended: false,
        sortOrder: 1,
      },
      {
        name: "카라멜 마키아토",
        setName: "CARAMEL MACCHIATO",
        description: "진한 에스프레소와 달콤한 카라멜의 조화",
        price: 6000,
        priceLabel: null,
        portionLabel: "HOT / ICE",
        badgeLabel: null,
        recommended: false,
        sortOrder: 2,
      },
    ],
  },
  {
    name: "DESSERT",
    sortOrder: 2,
    items: [
      {
        name: "흑임자 바스크 치즈케이크",
        setName: "BLACK SESAME BASQUE CHEESECAKE",
        description: "진한 치즈 풍미에 고소한 흑임자를 더한 디저트",
        price: 7800,
        priceLabel: null,
        portionLabel: null,
        badgeLabel: null,
        recommended: false,
        sortOrder: 0,
      },
      {
        name: "레몬 파운드 케이크",
        setName: "LEMON POUND CAKE",
        description: "상큼한 레몬 글레이즈를 올린 파운드 케이크",
        price: 5800,
        priceLabel: null,
        portionLabel: null,
        badgeLabel: "NEW",
        recommended: true,
        sortOrder: 1,
      },
    ],
  },
];

function createDenseSampleCategories() {
  const extraItemsByCategoryName = new Map([
    [
      "SIGNATURE COFFEE",
      [
        {
          name: "피스타치오 크림 콜드브루",
          setName: "PISTACHIO CREAM COLD BREW",
          description: "묵직한 콜드브루 위에 고소한 피스타치오 크림을 얹은 디스플레이 QA용 긴 설명 메뉴",
          price: 6900,
          priceLabel: null,
          portionLabel: "ICE",
          badgeLabel: "NEW",
          recommended: true,
          sortOrder: 3,
        },
        {
          name: "바닐라빈 슈페너",
          setName: "VANILLA BEAN EINSPANNER",
          description: "바닐라빈 크림과 에스프레소가 부드럽게 이어지는 크림 커피",
          price: 6400,
          priceLabel: null,
          portionLabel: "ICE",
          badgeLabel: null,
          recommended: false,
          sortOrder: 4,
        },
        {
          name: "솔티드 카라멜 크림 라떼",
          setName: "SALTED CARAMEL CREAM LATTE",
          description: "짭조름한 카라멜 크림과 우유의 균형을 확인하기 위한 긴 메뉴명",
          price: 6700,
          priceLabel: null,
          portionLabel: "HOT / ICE",
          badgeLabel: null,
          recommended: false,
          sortOrder: 5,
          priceOptions: [
            { label: "HOT", price: 6700, priceLabel: "6,700원", sortOrder: 0 },
            { label: "ICE", price: 7000, priceLabel: "7,000원", sortOrder: 1 },
          ],
        },
      ],
    ],
    [
      "CLASSIC COFFEE",
      [
        {
          name: "플랫 화이트",
          setName: "FLAT WHITE",
          description: "진한 에스프레소와 촘촘한 우유 거품",
          price: 5600,
          priceLabel: null,
          portionLabel: "HOT",
          badgeLabel: null,
          recommended: false,
          sortOrder: 3,
        },
        {
          name: "콜드브루",
          setName: "COLD BREW",
          description: "긴 시간 추출해 깔끔한 산미와 단맛을 살린 커피",
          price: 5500,
          priceLabel: null,
          portionLabel: "ICE",
          badgeLabel: null,
          recommended: false,
          sortOrder: 4,
        },
        {
          name: "헤이즐넛 더블샷 라떼",
          setName: "HAZELNUT DOUBLE SHOT LATTE",
          description: "고소한 헤이즐넛 향과 더블샷의 진한 풍미",
          price: 6200,
          priceLabel: null,
          portionLabel: "HOT / ICE",
          badgeLabel: null,
          recommended: false,
          sortOrder: 5,
        },
      ],
    ],
    [
      "DESSERT",
      [
        {
          name: "티라미수 컵",
          setName: "TIRAMISU CUP",
          description: "마스카포네 크림과 커피 시럽이 촉촉하게 어우러진 디저트",
          price: 6800,
          priceLabel: null,
          portionLabel: null,
          badgeLabel: "BEST",
          recommended: true,
          sortOrder: 2,
        },
        {
          name: "초코 가나슈 타르트",
          setName: "CHOCOLATE GANACHE TART",
          description: "진한 초콜릿 가나슈와 바삭한 타르트 쉘",
          price: 6500,
          priceLabel: null,
          portionLabel: null,
          badgeLabel: null,
          recommended: false,
          sortOrder: 3,
        },
        {
          name: "얼그레이 쉬폰 케이크",
          setName: "EARL GREY CHIFFON CAKE",
          description: "은은한 얼그레이 향과 가벼운 식감의 쉬폰 케이크",
          price: 6200,
          priceLabel: null,
          portionLabel: null,
          badgeLabel: null,
          recommended: false,
          sortOrder: 4,
        },
        {
          name: "계절 과일 크럼블",
          setName: "SEASONAL FRUIT CRUMBLE",
          description: "계절 과일과 고소한 크럼블을 따뜻하게 즐기는 디저트",
          price: 7200,
          priceLabel: null,
          portionLabel: null,
          badgeLabel: null,
          recommended: false,
          sortOrder: 5,
        },
      ],
    ],
  ]);

  const extraCategories = [
    {
      name: "TEA & NON COFFEE",
      sortOrder: 3,
      items: [
        {
          name: "제주 말차 라떼",
          setName: "JEJU MATCHA LATTE",
          description: "진한 제주 말차와 우유의 부드러운 조합",
          price: 6200,
          priceLabel: null,
          portionLabel: "HOT / ICE",
          badgeLabel: null,
          recommended: false,
          sortOrder: 0,
        },
        {
          name: "로얄 밀크티",
          setName: "ROYAL MILK TEA",
          description: "홍차의 향과 우유의 고소함이 균형 잡힌 음료",
          price: 5900,
          priceLabel: null,
          portionLabel: "HOT / ICE",
          badgeLabel: null,
          recommended: false,
          sortOrder: 1,
        },
        {
          name: "레몬 허브티",
          setName: "LEMON HERB TEA",
          description: "상큼한 레몬과 허브 향을 가볍게 즐기는 티",
          price: 5200,
          priceLabel: null,
          portionLabel: "HOT",
          badgeLabel: null,
          recommended: false,
          sortOrder: 2,
        },
        {
          name: "딸기 크림 초콜릿",
          setName: "STRAWBERRY CREAM CHOCOLATE",
          description: "딸기 크림과 진한 초콜릿이 어우러진 논커피 음료",
          price: 6500,
          priceLabel: null,
          portionLabel: "ICE",
          badgeLabel: "NEW",
          recommended: true,
          sortOrder: 3,
        },
        {
          name: "오트 고구마 라떼",
          setName: "OAT SWEET POTATO LATTE",
          description: "오트 밀크와 고구마의 담백한 단맛",
          price: 6100,
          priceLabel: null,
          portionLabel: "HOT",
          badgeLabel: null,
          recommended: false,
          sortOrder: 4,
        },
      ],
    },
  ];

  return [
    ...SAMPLE_CATEGORIES.map((category) => ({
      ...category,
      items: [...category.items, ...(extraItemsByCategoryName.get(category.name) ?? [])],
    })),
    ...extraCategories,
  ];
}

function displayPriceOption(label, price, sortOrder) {
  return {
    label,
    price,
    priceLabel: `${(price / 1000).toFixed(1)}`,
    sortOrder,
  };
}

function displayHotIce(hotPrice, icePrice) {
  return [
    displayPriceOption("HOT", hotPrice, 0),
    displayPriceOption("ICE", icePrice, 1),
  ];
}

function displayIceOnly(icePrice) {
  return [displayPriceOption("ICE", icePrice, 1)];
}

function createDisplayMenuASampleCategories() {
  return [
    {
      name: "SIGNATURE COFFEE",
      sortOrder: 0,
      items: [
        {
          name: "바질 크림 라떼",
          setName: "BASIL CREAM LATTE",
          description: null,
          price: 6500,
          priceLabel: "6.5",
          portionLabel: null,
          badgeLabel: "SIGNATURE",
          recommended: true,
          sortOrder: 0,
          priceOptions: displayIceOnly(6500),
        },
        {
          name: "오트 너티 라떼",
          setName: "OAT NUTTY LATTE",
          description: null,
          price: 6500,
          priceLabel: "6.5",
          portionLabel: null,
          badgeLabel: "BEST",
          recommended: true,
          sortOrder: 1,
          priceOptions: displayHotIce(6500, 6500),
        },
        {
          name: "흑임자 크림 라떼",
          setName: "BLACK SESAME LATTE",
          description: null,
          price: 6500,
          priceLabel: "6.5",
          portionLabel: null,
          badgeLabel: null,
          recommended: false,
          sortOrder: 2,
          priceOptions: displayIceOnly(6500),
        },
        {
          name: "솔티드 카라멜 라떼",
          setName: "SALTED CARAMEL LATTE",
          description: null,
          price: 6000,
          priceLabel: "6.0",
          portionLabel: null,
          badgeLabel: null,
          recommended: false,
          sortOrder: 3,
          priceOptions: displayHotIce(6000, 6000),
        },
        {
          name: "말차 에스프레소",
          setName: "MATCHA ESPRESSO",
          description: null,
          price: 6300,
          priceLabel: "6.3",
          portionLabel: null,
          badgeLabel: "NEW",
          recommended: true,
          sortOrder: 4,
          priceOptions: displayIceOnly(6300),
        },
      ],
    },
    {
      name: "CLASSIC COFFEE",
      sortOrder: 1,
      items: [
        {
          name: "아메리카노",
          setName: "AMERICANO",
          description: null,
          price: 4500,
          priceLabel: "4.5",
          portionLabel: null,
          badgeLabel: null,
          recommended: false,
          sortOrder: 0,
          priceOptions: displayHotIce(4500, 4500),
        },
        {
          name: "카페 라떼",
          setName: "CAFE LATTE",
          description: null,
          price: 5000,
          priceLabel: "5.0",
          portionLabel: null,
          badgeLabel: null,
          recommended: false,
          sortOrder: 1,
          priceOptions: displayHotIce(5000, 5000),
        },
        {
          name: "플랫 화이트",
          setName: "FLAT WHITE",
          description: null,
          price: 5000,
          priceLabel: "5.0",
          portionLabel: null,
          badgeLabel: null,
          recommended: false,
          sortOrder: 2,
          priceOptions: displayHotIce(5000, 5000),
        },
        {
          name: "바닐라 빈 라떼",
          setName: "VANILLA BEAN LATTE",
          description: null,
          price: 5500,
          priceLabel: "5.5",
          portionLabel: null,
          badgeLabel: null,
          recommended: false,
          sortOrder: 3,
          priceOptions: displayHotIce(5500, 5500),
        },
        {
          name: "콜드브루",
          setName: "COLD BREW",
          description: null,
          price: 5000,
          priceLabel: "5.0",
          portionLabel: null,
          badgeLabel: null,
          recommended: false,
          sortOrder: 4,
          priceOptions: displayIceOnly(5000),
        },
      ],
    },
    {
      name: "NON-COFFEE",
      sortOrder: 2,
      items: [
        {
          name: "제주 말차 라떼",
          setName: "JEJU MATCHA LATTE",
          description: null,
          price: 6000,
          priceLabel: "6.0",
          portionLabel: null,
          badgeLabel: "BEST",
          recommended: true,
          sortOrder: 0,
          priceOptions: displayHotIce(6000, 6000),
        },
        {
          name: "밀크티 보틀",
          setName: "MILK TEA BOTTLE",
          description: null,
          price: 6500,
          priceLabel: "6.5",
          portionLabel: null,
          badgeLabel: null,
          recommended: false,
          sortOrder: 1,
          priceOptions: displayIceOnly(6500),
        },
        {
          name: "발로나 초코 라떼",
          setName: "VALRHONA CHOCO LATTE",
          description: null,
          price: 6000,
          priceLabel: "6.0",
          portionLabel: null,
          badgeLabel: null,
          recommended: false,
          sortOrder: 2,
          priceOptions: displayHotIce(6000, 6000),
        },
        {
          name: "딸기 라떼",
          setName: "STRAWBERRY LATTE",
          description: null,
          price: 6500,
          priceLabel: "6.5",
          portionLabel: null,
          badgeLabel: "NEW",
          recommended: true,
          sortOrder: 3,
          priceOptions: displayIceOnly(6500),
        },
        {
          name: "로얄 밀크티",
          setName: "ROYAL MILK TEA",
          description: null,
          price: 5800,
          priceLabel: "5.8",
          portionLabel: null,
          badgeLabel: null,
          recommended: false,
          sortOrder: 4,
          priceOptions: displayHotIce(5800, 5800),
        },
      ],
    },
    {
      name: "BAKERY",
      sortOrder: 3,
      items: [
        {
          name: "클래식 버터 스콘",
          setName: "CLASSIC BUTTER SCONE",
          description: null,
          price: 4500,
          priceLabel: "4.5",
          portionLabel: null,
          badgeLabel: null,
          recommended: false,
          sortOrder: 0,
        },
        {
          name: "무화과 휘낭시에",
          setName: "FIG FINANCIER",
          description: null,
          price: 3500,
          priceLabel: "3.5",
          portionLabel: null,
          badgeLabel: null,
          recommended: false,
          sortOrder: 1,
        },
        {
          name: "솔티 초코 휘낭시에",
          setName: "SALTY CHOCO FINANCIER",
          description: null,
          price: 3800,
          priceLabel: "3.8",
          portionLabel: null,
          badgeLabel: "NEW",
          recommended: true,
          sortOrder: 2,
        },
        {
          name: "흑임자 바스크 치즈케이크",
          setName: "BLACK SESAME BASQUE CHEESECAKE",
          description: null,
          price: 7800,
          priceLabel: "7.8",
          portionLabel: null,
          badgeLabel: "NEW",
          recommended: true,
          sortOrder: 3,
        },
      ],
    },
  ];
}

function createDisplaySplitSampleCategories(fullCategories) {
  const signature = fullCategories.find((category) => category.name === "SIGNATURE COFFEE");
  const nonCoffee = fullCategories.find((category) => category.name === "NON-COFFEE" || category.name === "TEA & NON COFFEE");

  return [
    {
      name: "SIGNATURE COFFEE",
      sortOrder: 0,
      items: [
        ...(signature?.items.slice(0, 3) ?? []),
        ...(nonCoffee?.items.slice(0, 2) ?? []),
      ].map((item, index) => ({ ...item, sortOrder: index })),
    },
    {
      name: "SEASONAL DRINK",
      sortOrder: 1,
      items: [
        {
          name: "청귤 에이드",
          setName: "GREEN TANGERINE ADE",
          description: null,
          price: 6200,
          priceLabel: "6.2",
          portionLabel: null,
          badgeLabel: "NEW",
          recommended: true,
          sortOrder: 0,
          priceOptions: displayIceOnly(6200),
        },
        {
          name: "유자 캐모마일 티",
          setName: "YUJA CHAMOMILE TEA",
          description: null,
          price: 5800,
          priceLabel: "5.8",
          portionLabel: null,
          badgeLabel: null,
          recommended: false,
          sortOrder: 1,
          priceOptions: displayHotIce(5800, 5800),
        },
        {
          name: "피치 얼그레이",
          setName: "PEACH EARL GREY",
          description: null,
          price: 6000,
          priceLabel: "6.0",
          portionLabel: null,
          badgeLabel: null,
          recommended: false,
          sortOrder: 2,
          priceOptions: displayIceOnly(6000),
        },
        {
          name: "오트 고구마 라떼",
          setName: "OAT SWEET POTATO LATTE",
          description: null,
          price: 6100,
          priceLabel: "6.1",
          portionLabel: null,
          badgeLabel: "BEST",
          recommended: true,
          sortOrder: 3,
          priceOptions: displayHotIce(6100, 6100),
        },
        {
          name: "자몽 허니 블랙티",
          setName: "GRAPEFRUIT HONEY BLACK TEA",
          description: null,
          price: 5900,
          priceLabel: "5.9",
          portionLabel: null,
          badgeLabel: null,
          recommended: false,
          sortOrder: 4,
          priceOptions: displayHotIce(5900, 5900),
        },
      ],
    },
  ];
}

function formatDisplaySeedPriceLabel(option) {
  if (typeof option.price === "number" && Number.isFinite(option.price)) {
    return (option.price / 1000).toFixed(1);
  }

  const numericText = String(option.priceLabel ?? "").replace(/[,\s₩원]/g, "");
  const numericValue = Number(numericText);
  return Number.isFinite(numericValue) && numericValue > 0 ? (numericValue / 1000).toFixed(1) : option.priceLabel;
}

function parseArgs(argv) {
  const args = {
    email: "",
    userId: "",
    templateKey: DEFAULT_TEMPLATE_KEY,
    templateCategory: DEFAULT_TEMPLATE_CATEGORY,
    templateCategoryExplicit: false,
    slugPrefix: DEFAULT_SLUG_PREFIX,
    withPromotion: false,
    denseMenu: false,
    dryRun: false,
    durationDays: DEFAULT_DURATION_DAYS,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    const next = argv[index + 1];

    if (value === "--email") {
      args.email = next ?? "";
      index += 1;
    } else if (value === "--user-id") {
      args.userId = next ?? "";
      index += 1;
    } else if (value === "--template-key") {
      args.templateKey = next ?? DEFAULT_TEMPLATE_KEY;
      index += 1;
    } else if (value === "--template-category") {
      args.templateCategory = next ?? DEFAULT_TEMPLATE_CATEGORY;
      args.templateCategoryExplicit = true;
      index += 1;
    } else if (value === "--slug-prefix") {
      args.slugPrefix = next ?? DEFAULT_SLUG_PREFIX;
      index += 1;
    } else if (value === "--duration-days") {
      args.durationDays = Number(next ?? DEFAULT_DURATION_DAYS);
      index += 1;
    } else if (value === "--with-promotion") {
      args.withPromotion = true;
    } else if (value === "--dense-menu") {
      args.denseMenu = true;
    } else if (value === "--dry-run") {
      args.dryRun = true;
    } else if (value === "--help" || value === "-h") {
      printHelp();
      process.exit(0);
    }
  }

  if (!args.templateCategoryExplicit) {
    args.templateCategory = getDefaultTemplateCategory(args.templateKey);
  }

  return args;
}

function getDefaultTemplateCategory(templateKey) {
  return templateKey === "display_menu_a" ? "display" : DEFAULT_TEMPLATE_CATEGORY;
}

function printHelp() {
  console.log(`
Usage:
  node --env-file=.env.local scripts/seed-display-qa-menu-site.mjs --email qa@example.com

Options:
  --email <email>                Existing QA user email.
  --user-id <uuid>               Existing QA user id. Use instead of --email.
  --template-key <key>           Defaults to ${DEFAULT_TEMPLATE_KEY}. display_menu_a uses display category by default.
  --template-category <key>      Defaults to ${DEFAULT_TEMPLATE_CATEGORY}, or display when --template-key display_menu_a is used.
  --slug-prefix <prefix>         Defaults to ${DEFAULT_SLUG_PREFIX}.
  --duration-days <days>         Entitlement duration. Defaults to ${DEFAULT_DURATION_DAYS}.
  --with-promotion               Also create one promotion page with display_settings only.
  --dense-menu                   Create 4 categories and 27 menu items for filled-but-readable display QA.
  --dry-run                      Print planned data without inserting rows.
`);
}

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing ${name}. Run with server env loaded, for example: node --env-file=.env.local scripts/seed-display-qa-menu-site.mjs --email qa@example.com`);
  }
  return value;
}

function normalizeSlugPart(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function addDays(date, days) {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate;
}

async function findUserByEmail(supabase, email) {
  const normalizedEmail = email.trim().toLowerCase();
  const perPage = 1000;
  let page = 1;

  while (page <= 20) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`QA user lookup failed: ${error.message}`);

    const user = data.users.find((entry) => entry.email?.toLowerCase() === normalizedEmail);
    if (user) return user;
    if (data.users.length < perPage) return null;
    page += 1;
  }

  return null;
}

async function findUserById(supabase, userId) {
  const { data, error } = await supabase.auth.admin.getUserById(userId);
  if (error) throw new Error(`QA user lookup failed: ${error.message}`);
  return data.user ?? null;
}

async function getUniqueSlug(supabase, slugPrefix) {
  const prefix = normalizeSlugPart(slugPrefix) || DEFAULT_SLUG_PREFIX;

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const slug = normalizeSlugPart(`${prefix}-${suffix}`);
    const { data, error } = await supabase.from("menu_sites").select("id").eq("slug", slug).maybeSingle();
    if (error) throw new Error(`Slug availability check failed: ${error.message}`);
    if (!data) return slug;
  }

  throw new Error("Could not create a unique QA slug.");
}

function getPlannedRows({ user, slug, args, now, expiresAt }) {
  const uniqueSuffix = slug.replace(`${normalizeSlugPart(args.slugPrefix) || DEFAULT_SLUG_PREFIX}-`, "");
  const paymentId = `qa-display-${uniqueSuffix}`;

  return {
    menuSite: {
      user_id: user.id,
      name: `Display QA ${uniqueSuffix}`,
      slug,
      template_key: args.templateKey,
      template_category: args.templateCategory,
      status: "draft",
      restaurant_name: "Display QA Cafe",
      restaurant_category: "카페",
      restaurant_type: "cafe",
      restaurant_address: "QA 전용 데이터",
      restaurant_phone: "02-0000-0000",
      brand_description: "디스플레이 편집 기능 QA를 위한 테스트 메뉴판입니다.",
      menu_cover_label: "DISPLAY QA",
      settings: {
        qa_seed: true,
        source: "scripts/seed-display-qa-menu-site.mjs",
      },
      page_settings: {
        intro_enabled: false,
        menu_cover_enabled: true,
        set_menu_enabled: true,
        main_menu_enabled: true,
        dessert_drink_enabled: true,
        about_enabled: false,
        chefs_enabled: false,
        events_enabled: false,
        social_links_enabled: false,
        featured_item_enabled: false,
        featured_item_id: null,
      },
    },
    order: {
      user_id: user.id,
      product_key: DEFAULT_PRODUCT_KEY,
      template_key: args.templateKey,
      order_name: "Display QA seed order",
      payment_id: paymentId,
      customer_name: user.email ?? "Display QA User",
      buyer_name: user.email ?? "Display QA User",
      buyer_email: user.email ?? null,
      status: "paid",
      total_amount: 0,
      raw_payload: {
        qa_seed: true,
        product_key: DEFAULT_PRODUCT_KEY,
        template_key: args.templateKey,
        created_by: "scripts/seed-display-qa-menu-site.mjs",
      },
    },
    entitlement: {
      user_id: user.id,
      product_key: DEFAULT_PRODUCT_KEY,
      plan_key: "display",
      plan_type: "business_display",
      billing_type: "subscription",
      billing_cycle: "monthly",
      status: "active",
      access_starts_at: now.toISOString(),
      access_expires_at: expiresAt.toISOString(),
    },
  };
}

function getStarterPlan({ withPromotion, denseMenu, templateKey, menuSiteId = null }) {
  const isDisplayMenuA = templateKey === "display_menu_a";
  const fullMenuCategories = isDisplayMenuA ? createDisplayMenuASampleCategories() : denseMenu ? createDenseSampleCategories() : SAMPLE_CATEGORIES;
  const splitMenuCategories = isDisplayMenuA ? createDisplaySplitSampleCategories(fullMenuCategories) : fullMenuCategories;
  const pageSpecs = isDisplayMenuA
    ? [
        {
          key: "promotion_hero",
          title: "시즌 프로모션",
          displaySettings: PROMOTION_PAGE_DISPLAY_SETTINGS,
          legacySectionKey: null,
          sortOrder: 0,
        },
        {
          key: "split_image_menu",
          title: "시그니처 추천",
          displaySettings: SPLIT_MENU_PAGE_DISPLAY_SETTINGS,
          legacySectionKey: "main_menu",
          sortOrder: 1,
          categories: splitMenuCategories,
        },
        {
          key: "full_menu",
          title: "전체 메뉴",
          displaySettings: FULL_MENU_PAGE_DISPLAY_SETTINGS,
          legacySectionKey: "main_menu",
          sortOrder: 2,
          categories: fullMenuCategories,
        },
        {
          key: "promotion_dessert",
          title: "디저트 프로모션",
          displaySettings: PROMOTION_PAGE_DISPLAY_SETTINGS,
          legacySectionKey: null,
          sortOrder: 3,
        },
      ]
    : [
        {
          key: "full_menu",
          title: "전체 메뉴",
          displaySettings: FULL_MENU_PAGE_DISPLAY_SETTINGS,
          legacySectionKey: "main_menu",
          sortOrder: 0,
          categories: fullMenuCategories,
        },
        ...(withPromotion
          ? [
              {
                key: "promotion",
                title: "프로모션 페이지",
                displaySettings: PROMOTION_PAGE_DISPLAY_SETTINGS,
                legacySectionKey: null,
                sortOrder: 1,
              },
            ]
          : []),
      ];
  const menuPageSpecs = pageSpecs.filter((pageSpec) => pageSpec.displaySettings.pageType === "menu");

  const pageRows = pageSpecs.map((pageSpec) => ({
    key: pageSpec.key,
    menu_site_id: menuSiteId,
    title: pageSpec.title,
    description: null,
    description_visible: Boolean(pageSpec.displaySettings.pageType === "menu" && !isDisplayMenuA),
    display_settings: pageSpec.displaySettings,
    legacy_section_key: pageSpec.legacySectionKey,
    visible: true,
    sort_order: pageSpec.sortOrder,
  }));

  const categoryPlans = menuPageSpecs.flatMap((pageSpec) =>
    (pageSpec.categories ?? fullMenuCategories).map((category) => ({
      pageKey: pageSpec.key,
      row: {
        menu_site_id: menuSiteId,
        menu_page_id: null,
        name: category.name,
        description: null,
        description_visible: !isDisplayMenuA,
        section_key: category.name === "DESSERT" ? "dessert_drink" : "main_menu",
        visible: true,
        sort_order: category.sortOrder,
      },
    }))
  );

  const itemPlans = menuPageSpecs.flatMap((pageSpec) =>
    (pageSpec.categories ?? fullMenuCategories).flatMap((category) =>
      category.items.map((item) => ({
        pageKey: pageSpec.key,
        categoryName: category.name,
        itemName: item.name,
        priceOptions: item.priceOptions ?? [],
        row: {
          menu_site_id: menuSiteId,
          category_id: null,
          name: item.name,
          set_name: item.setName,
          description: isDisplayMenuA ? null : item.description,
          price: item.price,
          price_label: item.priceLabel,
          price_visible: true,
          portion_label: isDisplayMenuA ? null : item.portionLabel,
          portion_visible: isDisplayMenuA ? false : Boolean(item.portionLabel),
          badge_label: item.badgeLabel,
          badge_type: item.badgeLabel ? item.badgeLabel.toLowerCase() : null,
          recommended: item.recommended,
          origin_info: null,
          is_best: item.badgeLabel === "BEST",
          is_sold_out: false,
          traits_visible: false,
          visible: true,
          sort_order: item.sortOrder,
        },
      }))
    )
  );

  const priceOptionPlans = itemPlans.flatMap((itemPlan) =>
    itemPlan.priceOptions.map((option) => ({
        pageKey: itemPlan.pageKey,
        categoryName: itemPlan.categoryName,
        itemName: itemPlan.itemName,
        row: {
        menu_site_id: menuSiteId,
        menu_item_id: null,
        label: option.label,
        price: option.price,
        price_label: isDisplayMenuA ? formatDisplaySeedPriceLabel(option) : option.priceLabel,
        visible: true,
        sort_order: option.sortOrder,
      },
    }))
  );

  return {
    pageRows,
    categoryPlans,
    itemPlans,
    priceOptionPlans,
  };
}

function summarizeStarterPlan(starterPlan) {
  const itemRows = starterPlan.itemPlans.map((plan) => plan.row);

  return {
    pageCount: starterPlan.pageRows.length,
    pageLayouts: starterPlan.pageRows.map((page) => ({
      title: page.title,
      pageType: page.display_settings.pageType,
      menuLayoutType: page.display_settings.menuLayoutType,
    })),
    categoryCount: starterPlan.categoryPlans.length,
    itemCount: itemRows.length,
    priceOptionCount: starterPlan.priceOptionPlans.length,
    priceOptionLabels: [...new Set(starterPlan.priceOptionPlans.map((plan) => plan.row.label))],
    hasItemDescriptionData: itemRows.some((row) => Boolean(row.description)),
    hasPortionLabelData: itemRows.some((row) => Boolean(row.portion_label) || row.portion_visible),
  };
}

async function insertStarterData(supabase, menuSiteId, { withPromotion, denseMenu, templateKey }) {
  const starterPlan = getStarterPlan({ withPromotion, denseMenu, templateKey, menuSiteId });

  const { data: pages, error: pageError } = await supabase
    .from("menu_pages")
    .insert(starterPlan.pageRows.map((page) => {
      const row = { ...page };
      delete row.key;
      return row;
    }))
    .select("id, title");
  if (pageError) throw new Error(`menu_pages insert failed: ${pageError.message}`);

  const pageKeyByTitle = new Map(starterPlan.pageRows.map((page) => [page.title, page.key]));
  const pageIdByKey = new Map(
    pages.flatMap((page) => {
      const pageKey = pageKeyByTitle.get(page.title);
      return pageKey ? [[pageKey, page.id]] : [];
    })
  );

  const categoryRows = starterPlan.categoryPlans.flatMap((plan) => {
    const pageId = pageIdByKey.get(plan.pageKey);
    return pageId ? [{ ...plan.row, menu_page_id: pageId }] : [];
  });

  const { data: categories, error: categoryError } = await supabase
    .from("menu_categories")
    .insert(categoryRows)
    .select("id, name, menu_page_id");
  if (categoryError) throw new Error(`menu_categories insert failed: ${categoryError.message}`);

  const categoryIdByPageAndName = new Map(categories.map((category) => [`${category.menu_page_id}:${category.name}`, category.id]));
  const itemRows = starterPlan.itemPlans.flatMap((plan) => {
    const pageId = pageIdByKey.get(plan.pageKey);
    const categoryId = pageId ? categoryIdByPageAndName.get(`${pageId}:${plan.categoryName}`) : null;
    return categoryId ? [{ ...plan.row, category_id: categoryId }] : [];
  });

  const { data: items, error: itemError } = await supabase
    .from("menu_items")
    .insert(itemRows)
    .select("id, name, category_id");
  if (itemError) throw new Error(`menu_items insert failed: ${itemError.message}`);

  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const itemIdByPageCategoryAndName = new Map(
    items.flatMap((item) => {
      const category = categoryById.get(item.category_id);
      if (!category) return [];
      return [[`${category.menu_page_id}:${category.name}:${item.name}`, item.id]];
    })
  );
  const priceOptionRows = starterPlan.priceOptionPlans.flatMap((plan) => {
    const pageId = pageIdByKey.get(plan.pageKey);
    const menuItemId = pageId ? itemIdByPageCategoryAndName.get(`${pageId}:${plan.categoryName}:${plan.itemName}`) : null;
    return menuItemId ? [{ ...plan.row, menu_item_id: menuItemId }] : [];
  });

  if (priceOptionRows.length > 0) {
    const { error: priceOptionError } = await supabase
      .from("menu_item_price_options")
      .insert(priceOptionRows);
    if (priceOptionError) throw new Error(`menu_item_price_options insert failed: ${priceOptionError.message}`);
  }

  return {
    pageLayouts: summarizeStarterPlan(starterPlan).pageLayouts,
    pageCount: starterPlan.pageRows.length,
    categoryCount: categoryRows.length,
    itemCount: itemRows.length,
    priceOptionCount: priceOptionRows.length,
    priceOptionLabels: [...new Set(priceOptionRows.map((row) => row.label))],
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.email && !args.userId) {
    printHelp();
    throw new Error("Provide --email or --user-id for an existing QA user.");
  }

  if (!Number.isFinite(args.durationDays) || args.durationDays < 1) {
    throw new Error("--duration-days must be a positive number.");
  }

  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const user = args.userId ? await findUserById(supabase, args.userId) : await findUserByEmail(supabase, args.email);
  if (!user) {
    throw new Error("QA user was not found. Create the user through the normal auth flow first; this script does not create auth users.");
  }

  const slug = await getUniqueSlug(supabase, args.slugPrefix);
  const now = new Date();
  const expiresAt = addDays(now, args.durationDays);
  const plannedRows = getPlannedRows({ user, slug, args, now, expiresAt });
  const starterPlan = getStarterPlan({
    withPromotion: args.withPromotion,
    denseMenu: args.denseMenu,
    templateKey: args.templateKey,
  });
  const starterSummary = summarizeStarterPlan(starterPlan);

  console.log("Display QA seed plan");
  console.log(JSON.stringify({
    user: { id: user.id, email: user.email },
    templateKey: args.templateKey,
    templateCategory: args.templateCategory,
    slug,
    productKey: DEFAULT_PRODUCT_KEY,
    entitlementPlanType: plannedRows.entitlement.plan_type,
    withPromotion: args.withPromotion,
    denseMenu: args.denseMenu,
    dryRun: args.dryRun,
    starterData: starterSummary,
  }, null, 2));

  if (args.dryRun) {
    console.log("Dry run only. Planned menu_site/order/entitlement rows:");
    console.log(JSON.stringify(plannedRows, null, 2));
    return;
  }

  const { data: menuSite, error: menuSiteError } = await supabase
    .from("menu_sites")
    .insert(plannedRows.menuSite)
    .select("id, slug")
    .single();
  if (menuSiteError || !menuSite) {
    throw new Error(`menu_sites insert failed: ${menuSiteError?.message ?? "missing inserted row"}`);
  }

  const starterResult = await insertStarterData(supabase, menuSite.id, {
    withPromotion: args.withPromotion,
    denseMenu: args.denseMenu,
    templateKey: args.templateKey,
  });

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      ...plannedRows.order,
      menu_site_id: menuSite.id,
    })
    .select("id")
    .single();
  if (orderError || !order) {
    throw new Error(`orders insert failed: ${orderError?.message ?? "missing inserted row"}`);
  }

  const { data: entitlement, error: entitlementError } = await supabase
    .from("service_entitlements")
    .insert({
      ...plannedRows.entitlement,
      menu_site_id: menuSite.id,
    })
    .select("id")
    .single();
  if (entitlementError || !entitlement) {
    throw new Error(`service_entitlements insert failed: ${entitlementError?.message ?? "missing inserted row"}`);
  }

  console.log("Display QA menu_site created");
  console.log(JSON.stringify({
    menuSiteId: menuSite.id,
    slug: menuSite.slug,
    editUrl: `/mypage/menus/${menuSite.id}/edit`,
    orderId: order.id,
    entitlementId: entitlement.id,
    starterData: starterResult,
  }, null, 2));

  console.log("Cleanup guide");
  console.log(`Delete QA data manually in this order if needed:
1. service_entitlements where id = '${entitlement.id}'
2. orders where id = '${order.id}'
3. menu_sites where id = '${menuSite.id}' (cascades menu_pages/categories/items/options)
`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
