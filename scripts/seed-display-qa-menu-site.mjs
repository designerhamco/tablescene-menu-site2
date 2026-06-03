#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";

const DEFAULT_TEMPLATE_KEY = "cafe_design_a";
const DEFAULT_TEMPLATE_CATEGORY = "cafe";
const DEFAULT_PRODUCT_KEY = "business_display_monthly";
const DEFAULT_SLUG_PREFIX = "display-qa";
const DEFAULT_DURATION_DAYS = 365;

const MENU_PAGE_DISPLAY_SETTINGS = {
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

const PROMOTION_PAGE_DISPLAY_SETTINGS = {
  pageType: "promotion",
  menuLayoutType: null,
  splitImage: {
    url: null,
    path: null,
    title: null,
    description: null,
    position: "left",
  },
  promotion: {
    title: "시즌 프로모션",
    description: "QA용 프로모션 페이지입니다. 카테고리와 메뉴 데이터 없이 페이지 설정만 저장됩니다.",
    mediaType: "image",
    mediaUrl: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085",
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

function parseArgs(argv) {
  const args = {
    email: "",
    userId: "",
    templateKey: DEFAULT_TEMPLATE_KEY,
    templateCategory: DEFAULT_TEMPLATE_CATEGORY,
    templateCategoryExplicit: false,
    slugPrefix: DEFAULT_SLUG_PREFIX,
    withPromotion: false,
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

async function insertStarterData(supabase, menuSiteId, withPromotion) {
  const pageRows = [
    {
      menu_site_id: menuSiteId,
      title: "메뉴 페이지 1",
      description: null,
      description_visible: true,
      display_settings: MENU_PAGE_DISPLAY_SETTINGS,
      legacy_section_key: "main_menu",
      visible: true,
      sort_order: 0,
    },
  ];

  if (withPromotion) {
    pageRows.push({
      menu_site_id: menuSiteId,
      title: "프로모션 페이지 1",
      description: null,
      description_visible: false,
      display_settings: PROMOTION_PAGE_DISPLAY_SETTINGS,
      legacy_section_key: null,
      visible: true,
      sort_order: 1,
    });
  }

  const { data: pages, error: pageError } = await supabase
    .from("menu_pages")
    .insert(pageRows)
    .select("id, title");
  if (pageError) throw new Error(`menu_pages insert failed: ${pageError.message}`);

  const menuPage = pages.find((page) => page.title === "메뉴 페이지 1");
  if (!menuPage) throw new Error("Created menu page was not returned.");

  const categoryRows = SAMPLE_CATEGORIES.map((category) => ({
    menu_site_id: menuSiteId,
    menu_page_id: menuPage.id,
    name: category.name,
    description: null,
    description_visible: true,
    section_key: category.name === "DESSERT" ? "dessert_drink" : "main_menu",
    visible: true,
    sort_order: category.sortOrder,
  }));

  const { data: categories, error: categoryError } = await supabase
    .from("menu_categories")
    .insert(categoryRows)
    .select("id, name");
  if (categoryError) throw new Error(`menu_categories insert failed: ${categoryError.message}`);

  const categoryIdByName = new Map(categories.map((category) => [category.name, category.id]));
  const itemRows = SAMPLE_CATEGORIES.flatMap((category) => {
    const categoryId = categoryIdByName.get(category.name);
    if (!categoryId) return [];

    return category.items.map((item) => ({
      menu_site_id: menuSiteId,
      category_id: categoryId,
      name: item.name,
      set_name: item.setName,
      description: item.description,
      price: item.price,
      price_label: item.priceLabel,
      price_visible: true,
      portion_label: item.portionLabel,
      portion_visible: Boolean(item.portionLabel),
      badge_label: item.badgeLabel,
      badge_type: item.badgeLabel ? item.badgeLabel.toLowerCase() : null,
      recommended: item.recommended,
      origin_info: null,
      is_best: item.badgeLabel === "BEST",
      is_sold_out: false,
      traits_visible: false,
      visible: true,
      sort_order: item.sortOrder,
    }));
  });

  const { data: items, error: itemError } = await supabase
    .from("menu_items")
    .insert(itemRows)
    .select("id, name");
  if (itemError) throw new Error(`menu_items insert failed: ${itemError.message}`);

  const itemIdByName = new Map(items.map((item) => [item.name, item.id]));
  const priceOptionRows = SAMPLE_CATEGORIES.flatMap((category) =>
    category.items.flatMap((item) => {
      const menuItemId = itemIdByName.get(item.name);
      if (!menuItemId || !item.priceOptions) return [];

      return item.priceOptions.map((option) => ({
        menu_site_id: menuSiteId,
        menu_item_id: menuItemId,
        label: option.label,
        price: option.price,
        price_label: option.priceLabel,
        visible: true,
        sort_order: option.sortOrder,
      }));
    })
  );

  if (priceOptionRows.length > 0) {
    const { error: priceOptionError } = await supabase
      .from("menu_item_price_options")
      .insert(priceOptionRows);
    if (priceOptionError) throw new Error(`menu_item_price_options insert failed: ${priceOptionError.message}`);
  }

  return {
    pageCount: pageRows.length,
    categoryCount: categoryRows.length,
    itemCount: itemRows.length,
    priceOptionCount: priceOptionRows.length,
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

  console.log("Display QA seed plan");
  console.log(JSON.stringify({
    user: { id: user.id, email: user.email },
    templateKey: args.templateKey,
    slug,
    productKey: DEFAULT_PRODUCT_KEY,
    withPromotion: args.withPromotion,
    dryRun: args.dryRun,
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

  const starterResult = await insertStarterData(supabase, menuSite.id, args.withPromotion);

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
