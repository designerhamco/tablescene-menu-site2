#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";

import { createStarterMenuData } from "../lib/menu-starter-presets";

const TEMPLATE_KEY = "dining_aube_table_a";
const PRODUCT_KEY = "business_basic_multi_monthly";
const DEFAULT_DURATION_DAYS = 14;

type Args = {
  apply: boolean;
  userId: string;
  slug: string;
  durationDays: number;
};

function parseArgs(argv: string[]): Args {
  const args: Args = {
    apply: false,
    userId: "",
    slug: "aube-smart-call-qa",
    durationDays: DEFAULT_DURATION_DAYS,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--apply") args.apply = true;
    else if (value === "--user-id") args.userId = argv[index + 1] ?? "";
    else if (value === "--slug") args.slug = argv[index + 1] ?? args.slug;
    else if (value === "--duration-days") args.durationDays = Number(argv[index + 1]);
  }

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(args.userId)) {
    throw new Error("유효한 --user-id가 필요합니다.");
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(args.slug)) throw new Error("--slug 형식이 올바르지 않습니다.");
  if (!Number.isInteger(args.durationDays) || args.durationDays < 1 || args.durationDays > 30) {
    throw new Error("--duration-days는 1~30 사이의 정수여야 합니다.");
  }
  return args;
}

function requiredEnv(name: "NEXT_PUBLIC_SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY") {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} 환경변수가 필요합니다.`);
  return value;
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const supabase = createClient(requiredEnv("NEXT_PUBLIC_SUPABASE_URL"), requiredEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const userId = args.userId;
  const now = new Date();
  const accessExpiresAt = addDays(now, args.durationDays);
  const retentionUntil = addDays(now, args.durationDays + 90);

  const { data: existing, error: existingError } = await supabase
    .from("menu_sites")
    .select("id, slug, status, template_key")
    .eq("user_id", userId)
    .eq("slug", args.slug)
    .maybeSingle();
  if (existingError) throw new Error(`기존 QA 메뉴판 조회 실패: ${existingError.message}`);

  const plan = {
    mode: args.apply ? "apply" : "dry-run",
    targetUserId: userId,
    slug: args.slug,
    templateKey: TEMPLATE_KEY,
    productKey: PRODUCT_KEY,
    accessExpiresAt,
    existing: existing ?? null,
  };
  console.log(JSON.stringify(plan, null, 2));
  if (!args.apply) return;
  if (existing) throw new Error("동일한 QA slug가 이미 있습니다. 기존 메뉴판을 먼저 확인해 주세요.");

  const { data: menuSite, error: menuSiteError } = await supabase
    .from("menu_sites")
    .insert({
      user_id: userId,
      name: "QA 오브 테이블 스마트호출",
      slug: args.slug,
      template_key: TEMPLATE_KEY,
      template_category: "fine_dining",
      status: "published",
      restaurant_name: "오브 테이블 QA",
      restaurant_category: "fine_dining",
      restaurant_type: "fine_dining",
      settings: {
        source: "codex_production_qa",
        qa_scope: "aube_smart_call_table_qr",
        product_key: PRODUCT_KEY,
        plan_type: "business_basic",
        billing_cycle: "monthly",
        access_starts_at: now.toISOString(),
        access_expires_at: accessExpiresAt,
        auto_renewal: false,
      },
    })
    .select("id, slug")
    .single();
  if (menuSiteError || !menuSite) throw new Error(`QA 메뉴판 생성 실패: ${menuSiteError?.message ?? "missing row"}`);

  try {
    const starter = await createStarterMenuData(
      supabase,
      menuSite.id,
      TEMPLATE_KEY,
      "fine_dining",
      "fine_dining",
      PRODUCT_KEY,
    );
    const { data: entitlement, error: entitlementError } = await supabase
      .from("service_entitlements")
      .insert({
        user_id: userId,
        menu_site_id: menuSite.id,
        product_key: PRODUCT_KEY,
        plan_key: "business_basic_multi",
        plan_type: "business_basic",
        billing_type: "subscription",
        billing_cycle: "monthly",
        status: "active",
        access_starts_at: now.toISOString(),
        access_expires_at: accessExpiresAt,
        data_retention_until: retentionUntil,
      })
      .select("id")
      .single();
    if (entitlementError || !entitlement) {
      throw new Error(`QA entitlement 생성 실패: ${entitlementError?.message ?? "missing row"}`);
    }

    console.log(JSON.stringify({
      created: true,
      menuSiteId: menuSite.id,
      slug: menuSite.slug,
      entitlementId: entitlement.id,
      starter,
      routes: {
        publicMenu: `/menu/${menuSite.slug}`,
        operations: "/mypage/operations",
        editor: `/mypage/menus/${menuSite.id}/edit`,
        preview: `/mypage/menus/${menuSite.id}/preview`,
      },
      cleanupOrder: [
        `service_entitlements.id=${entitlement.id}`,
        `menu_sites.id=${menuSite.id}`,
      ],
    }, null, 2));
  } catch (error) {
    await supabase.from("menu_sites").delete().eq("id", menuSite.id);
    throw error;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
