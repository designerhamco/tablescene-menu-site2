#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";

import { createStarterMenuData } from "../lib/menu-starter-presets";

const QA_SCOPE = "menu_catalog_production_e2e";
const QA_SITES = [
  {
    key: "source",
    name: "QA 메뉴 공유 원본",
    slug: "menu-catalog-qa-source",
    templateKey: "display_menu_a",
    templateCategory: "display",
    restaurantCategory: "cafe",
    productKey: "business_display_monthly",
  },
  {
    key: "target",
    name: "QA 메뉴 가져오기 대상",
    slug: "menu-catalog-qa-target",
    templateKey: "cafe_design_a",
    templateCategory: "cafe",
    restaurantCategory: "cafe",
    productKey: "business_basic_single_monthly",
  },
] as const;

type Args = {
  apply: boolean;
  cleanup: boolean;
  userId: string;
};

function parseArgs(argv: string[]): Args {
  const args: Args = { apply: false, cleanup: false, userId: "" };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--apply") args.apply = true;
    else if (value === "--cleanup") args.cleanup = true;
    else if (value === "--user-id") args.userId = argv[index + 1] ?? "";
  }

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(args.userId)) {
    throw new Error("유효한 --user-id가 필요합니다.");
  }
  if (args.apply && args.cleanup) throw new Error("--apply와 --cleanup은 함께 사용할 수 없습니다.");
  return args;
}

function requiredEnv(name: "NEXT_PUBLIC_SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY") {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} 환경변수가 필요합니다.`);
  return value;
}

function isQaScopedSettings(value: unknown) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value) && (value as { qa_scope?: unknown }).qa_scope === QA_SCOPE);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const supabase = createClient(requiredEnv("NEXT_PUBLIC_SUPABASE_URL"), requiredEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userResult, error: userError } = await supabase.auth.admin.getUserById(args.userId);
  if (userError || !userResult.user) throw new Error(`QA 사용자 확인 실패: ${userError?.message ?? "missing user"}`);

  const slugs = QA_SITES.map((site) => site.slug);
  const { data: existingRows, error: existingError } = await supabase
    .from("menu_sites")
    .select("id, user_id, name, slug, status, template_key, settings")
    .in("slug", slugs);
  if (existingError) throw new Error(`기존 QA 메뉴판 조회 실패: ${existingError.message}`);

  const foreignRow = (existingRows ?? []).find((row) => row.user_id !== args.userId || !isQaScopedSettings(row.settings));
  if (foreignRow) throw new Error(`QA 범위 밖의 동일 slug가 있어 중단합니다: ${foreignRow.slug}`);

  console.log(JSON.stringify({
    mode: args.cleanup ? "cleanup-plan" : args.apply ? "apply" : "dry-run",
    targetUserId: args.userId,
    targetEmail: userResult.user.email ?? null,
    qaScope: QA_SCOPE,
    sites: QA_SITES,
    existing: existingRows ?? [],
  }, null, 2));

  if (args.cleanup) {
    if ((existingRows ?? []).length === 0) return;
    const ids = (existingRows ?? []).map((row) => row.id);
    const { error: linkDeleteError } = await supabase
      .from("menu_site_content_links")
      .delete()
      .or(`source_menu_site_id.in.(${ids.join(",")}),target_menu_site_id.in.(${ids.join(",")})`);
    if (linkDeleteError) throw new Error(`QA 메뉴 연결 정리 실패: ${linkDeleteError.message}`);
    const { error: siteDeleteError } = await supabase.from("menu_sites").delete().in("id", ids);
    if (siteDeleteError) throw new Error(`QA 메뉴판 정리 실패: ${siteDeleteError.message}`);
    console.log(JSON.stringify({ cleaned: true, menuSiteIds: ids }, null, 2));
    return;
  }

  if (!args.apply) return;
  if ((existingRows ?? []).length > 0) throw new Error("QA 메뉴판이 이미 있습니다. --cleanup 후 다시 실행해 주세요.");

  const createdIds: string[] = [];
  try {
    const created = [];
    for (const site of QA_SITES) {
      const { data: menuSite, error: menuSiteError } = await supabase
        .from("menu_sites")
        .insert({
          user_id: args.userId,
          name: site.name,
          slug: site.slug,
          template_key: site.templateKey,
          template_category: site.templateCategory,
          status: "draft",
          restaurant_name: site.name,
          restaurant_category: site.restaurantCategory,
          restaurant_type: site.restaurantCategory,
          settings: {
            qa_scope: QA_SCOPE,
            source: "scripts/seed-menu-catalog-qa.ts",
            qa_site_role: site.key,
            product_key: site.productKey,
          },
        })
        .select("id, slug, template_key")
        .single();
      if (menuSiteError || !menuSite) throw new Error(`${site.key} QA 메뉴판 생성 실패: ${menuSiteError?.message ?? "missing row"}`);

      createdIds.push(menuSite.id);
      const starter = await createStarterMenuData(
        supabase,
        menuSite.id,
        site.templateKey,
        site.restaurantCategory,
        site.templateCategory,
        site.productKey,
      );
      created.push({ ...menuSite, starter });
    }

    console.log(JSON.stringify({
      created: true,
      sites: created,
      routes: {
        targetImport: `/mypage/menus/${created[1].id}/import`,
        sourceEditor: `/mypage/menus/${created[0].id}/edit`,
        targetEditor: `/mypage/menus/${created[1].id}/edit`,
      },
      cleanup: `node --env-file=.env.local --import tsx scripts/seed-menu-catalog-qa.ts --user-id ${args.userId} --cleanup`,
    }, null, 2));
  } catch (error) {
    if (createdIds.length > 0) await supabase.from("menu_sites").delete().in("id", createdIds);
    throw error;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
