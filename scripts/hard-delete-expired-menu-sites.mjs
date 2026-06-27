#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";

const MENU_IMAGES_BUCKET = "menu-images";
const EXECUTE_CONFIRMATION = "HARD_DELETE_EXPIRED_MENU_CONTENT";
const KST_TIME_ZONE = "Asia/Seoul";
const DAY_MS = 1000 * 60 * 60 * 24;

const CONTENT_TABLES = [
  { name: "menu_item_price_option_translations", parent: "priceOptions", parentColumn: "price_option_id" },
  { name: "menu_item_trait_translations", parent: "traits", parentColumn: "trait_id" },
  { name: "menu_item_translations", parent: "items", parentColumn: "item_id" },
  { name: "menu_category_translations", parent: "categories", parentColumn: "category_id" },
  { name: "menu_page_translations", parent: "pages", parentColumn: "menu_page_id" },
  { name: "menu_event_translations", parent: "events", parentColumn: "event_id" },
  { name: "menu_chef_translations", parent: "chefs", parentColumn: "chef_id" },
  { name: "menu_social_link_translations", parent: "socialLinks", parentColumn: "social_link_id" },
  { name: "menu_widget_items", parent: "widgets", parentColumn: "widget_id", imageColumns: ["image_path", "image_url"] },
  { name: "menu_item_price_options", siteColumn: "menu_site_id" },
  { name: "menu_item_traits", siteColumn: "menu_site_id" },
  { name: "menu_site_translations", siteColumn: "menu_site_id" },
  { name: "menu_translation_jobs", siteColumn: "menu_site_id" },
  { name: "menu_widgets", siteColumn: "menu_site_id", imageColumns: ["image_path", "image_url"] },
  { name: "menu_chefs", siteColumn: "menu_site_id", imageColumns: ["chef_image_path", "chef_image_url"] },
  { name: "menu_events", siteColumn: "menu_site_id", imageColumns: ["event_image_path", "event_image_url"] },
  { name: "menu_social_links", siteColumn: "menu_site_id" },
  { name: "menu_items", siteColumn: "menu_site_id", imageColumns: ["image_path", "image_url"] },
  { name: "menu_categories", siteColumn: "menu_site_id" },
  { name: "menu_pages", siteColumn: "menu_site_id" },
];

const PARENT_ID_TABLES = {
  pages: { name: "menu_pages", siteColumn: "menu_site_id", select: "id, display_settings" },
  categories: { name: "menu_categories", siteColumn: "menu_site_id", select: "id" },
  items: { name: "menu_items", siteColumn: "menu_site_id", select: "id, image_path, image_url" },
  priceOptions: { name: "menu_item_price_options", siteColumn: "menu_site_id", select: "id" },
  traits: { name: "menu_item_traits", siteColumn: "menu_site_id", select: "id" },
  events: { name: "menu_events", siteColumn: "menu_site_id", select: "id, event_image_path, event_image_url" },
  chefs: { name: "menu_chefs", siteColumn: "menu_site_id", select: "id, chef_image_path, chef_image_url" },
  socialLinks: { name: "menu_social_links", siteColumn: "menu_site_id", select: "id" },
  widgets: { name: "menu_widgets", siteColumn: "menu_site_id", select: "id, image_path, image_url" },
};

const MENU_SITE_SELECT =
  "id, user_id, name, slug, status, template_key, logo_path, logo_url, cover_image_path, cover_image_url, intro_image_path, intro_image_url, created_at, updated_at";

function parseArgs(argv) {
  const options = {
    execute: false,
    confirm: "",
    limit: 20,
    menuSiteIds: [],
    slugs: [],
    includeStoragePrefix: true,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--execute") {
      options.execute = true;
    } else if (arg === "--confirm") {
      options.confirm = argv[index + 1] ?? "";
      index += 1;
    } else if (arg === "--limit") {
      options.limit = Number(argv[index + 1] ?? options.limit);
      index += 1;
    } else if (arg === "--menu-site-id") {
      const value = argv[index + 1];
      if (value) options.menuSiteIds.push(value);
      index += 1;
    } else if (arg === "--slug") {
      const value = argv[index + 1];
      if (value) options.slugs.push(value);
      index += 1;
    } else if (arg === "--skip-storage-prefix") {
      options.includeStoragePrefix = false;
    }
  }

  if (!Number.isInteger(options.limit) || options.limit < 1) {
    options.limit = 20;
  }

  return options;
}

function createSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function isMissingTableOrColumn(error) {
  return error?.code === "42P01" || error?.code === "42703" || error?.message?.toLowerCase().includes("could not find");
}

function getKstDateParts(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: KST_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  return Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day) ? { year, month, day } : null;
}

function getKstDayStartTime(date) {
  const parts = getKstDateParts(date);
  return parts ? Date.UTC(parts.year, parts.month - 1, parts.day) : null;
}

function getRemainingRetentionDaysKst(value, now = new Date()) {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  const todayStart = getKstDayStartTime(now);
  const retentionStart = getKstDayStartTime(date);
  if (todayStart === null || retentionStart === null) return null;
  return Math.round((retentionStart - todayStart) / DAY_MS);
}

function isEligibleForHardDelete(entitlement, now = new Date()) {
  if (entitlement.status !== "pending_delete") return false;
  if (entitlement.data_retention_until) {
    const daysLeft = getRemainingRetentionDaysKst(entitlement.data_retention_until, now);
    return daysLeft !== null && daysLeft < 0;
  }

  if (!entitlement.deleted_scheduled_at) return false;
  const scheduledAt = Date.parse(entitlement.deleted_scheduled_at);
  return Number.isFinite(scheduledAt) && scheduledAt <= now.getTime();
}

function collectJsonStrings(value, results = []) {
  if (typeof value === "string") {
    results.push(value);
    return results;
  }

  if (Array.isArray(value)) {
    for (const item of value) collectJsonStrings(item, results);
    return results;
  }

  if (value && typeof value === "object") {
    for (const item of Object.values(value)) collectJsonStrings(item, results);
  }

  return results;
}

function normalizeStoragePath(value, menuSiteId) {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith("/menu-templates/") || trimmed.startsWith("/placeholders/")) return null;

  const publicMarker = `/storage/v1/object/public/${MENU_IMAGES_BUCKET}/`;
  const markerIndex = trimmed.indexOf(publicMarker);
  const path = markerIndex >= 0 ? trimmed.slice(markerIndex + publicMarker.length) : trimmed.replace(/^\/+/, "");

  return path.startsWith(`menu-sites/${menuSiteId}/`) ? path : null;
}

function addStoragePath(paths, value, menuSiteId) {
  const path = normalizeStoragePath(value, menuSiteId);
  if (path) paths.add(path);
}

async function selectRows(supabase, table, select, column, value) {
  const { data, error } = await supabase.from(table).select(select).eq(column, value);
  if (error) {
    if (isMissingTableOrColumn(error)) {
      return { rows: [], skipped: true, error: null };
    }
    return { rows: [], skipped: false, error };
  }
  return { rows: data ?? [], skipped: false, error: null };
}

async function countByParentIds(supabase, table, parentColumn, ids) {
  if (ids.length === 0) return { count: 0, skipped: false, error: null };
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .in(parentColumn, ids);

  if (error) {
    if (isMissingTableOrColumn(error)) return { count: 0, skipped: true, error: null };
    return { count: 0, skipped: false, error };
  }

  return { count: count ?? 0, skipped: false, error: null };
}

async function countBySite(supabase, table, siteColumn, menuSiteId) {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq(siteColumn, menuSiteId);

  if (error) {
    if (isMissingTableOrColumn(error)) return { count: 0, skipped: true, error: null };
    return { count: 0, skipped: false, error };
  }

  return { count: count ?? 0, skipped: false, error: null };
}

async function listStorageFiles(supabase, prefix) {
  const results = [];
  const stack = [prefix.replace(/\/+$/, "")];

  while (stack.length > 0) {
    const currentPrefix = stack.pop();
    if (!currentPrefix) continue;
    const { data, error } = await supabase.storage.from(MENU_IMAGES_BUCKET).list(currentPrefix, { limit: 1000 });
    if (error) {
      return { paths: results, error };
    }

    for (const item of data ?? []) {
      const path = `${currentPrefix}/${item.name}`;
      if (item.id === null) {
        stack.push(path);
      } else {
        results.push(path);
      }
    }
  }

  return { paths: results, error: null };
}

async function loadPendingDeleteCandidates(supabase, options) {
  let query = supabase
    .from("service_entitlements")
    .select("id, user_id, menu_site_id, status, plan_type, product_key, access_expires_at, data_retention_until, deleted_scheduled_at, expired_at")
    .eq("status", "pending_delete")
    .not("menu_site_id", "is", null)
    .limit(options.limit);

  if (options.menuSiteIds.length > 0) {
    query = query.in("menu_site_id", options.menuSiteIds);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load pending_delete entitlements: ${error.message}`);

  let candidates = data ?? [];

  if (options.slugs.length > 0) {
    const { data: sites, error: siteError } = await supabase.from("menu_sites").select("id").in("slug", options.slugs);
    if (siteError) throw new Error(`Failed to resolve slug allowlist: ${siteError.message}`);
    const allowedIds = new Set((sites ?? []).map((site) => site.id));
    candidates = candidates.filter((candidate) => candidate.menu_site_id && allowedIds.has(candidate.menu_site_id));
  }

  return candidates.filter((candidate) => isEligibleForHardDelete(candidate));
}

async function buildMenuSitePlan(supabase, entitlement, options) {
  const menuSiteId = entitlement.menu_site_id;
  const storagePaths = new Set();
  const tableCounts = {};
  const skippedTables = [];
  const errors = [];
  const parentRowsByKey = {};

  const { data: menuSite, error: siteError } = await supabase.from("menu_sites").select(MENU_SITE_SELECT).eq("id", menuSiteId).maybeSingle();
  if (siteError) {
    errors.push({ scope: "menu_sites", message: siteError.message });
  }

  if (menuSite) {
    for (const key of ["logo_path", "logo_url", "cover_image_path", "cover_image_url", "intro_image_path", "intro_image_url"]) {
      addStoragePath(storagePaths, menuSite[key], menuSiteId);
    }
  }

  for (const [key, definition] of Object.entries(PARENT_ID_TABLES)) {
    const result = await selectRows(supabase, definition.name, definition.select, definition.siteColumn, menuSiteId);
    if (result.skipped) {
      skippedTables.push(definition.name);
      parentRowsByKey[key] = [];
      continue;
    }

    if (result.error) {
      errors.push({ scope: definition.name, message: result.error.message });
      parentRowsByKey[key] = [];
      continue;
    }

    parentRowsByKey[key] = result.rows;
    for (const row of result.rows) {
      for (const value of Object.values(row)) {
        addStoragePath(storagePaths, value, menuSiteId);
      }
      if (row.display_settings) {
        for (const value of collectJsonStrings(row.display_settings)) {
          addStoragePath(storagePaths, value, menuSiteId);
        }
      }
    }
  }

  for (const table of CONTENT_TABLES) {
    const countResult = table.parent
      ? await countByParentIds(supabase, table.name, table.parentColumn, (parentRowsByKey[table.parent] ?? []).map((row) => row.id).filter(Boolean))
      : await countBySite(supabase, table.name, table.siteColumn, menuSiteId);

    if (countResult.skipped) {
      skippedTables.push(table.name);
      tableCounts[table.name] = 0;
      continue;
    }

    if (countResult.error) {
      errors.push({ scope: table.name, message: countResult.error.message });
      tableCounts[table.name] = 0;
      continue;
    }

    tableCounts[table.name] = countResult.count;
  }

  if (options.includeStoragePrefix) {
    const prefixResult = await listStorageFiles(supabase, `menu-sites/${menuSiteId}`);
    if (prefixResult.error) {
      errors.push({ scope: "storage.list", message: prefixResult.error.message });
    } else {
      for (const path of prefixResult.paths) storagePaths.add(path);
    }
  }

  return {
    entitlement,
    menuSite,
    tableCounts,
    skippedTables: Array.from(new Set(skippedTables)),
    storagePaths: Array.from(storagePaths).sort(),
    errors,
  };
}

async function deleteByParentIds(supabase, table, parentColumn, ids) {
  if (ids.length === 0) return null;
  const { error } = await supabase.from(table).delete().in(parentColumn, ids);
  return error;
}

async function deleteBySite(supabase, table, siteColumn, menuSiteId) {
  const { error } = await supabase.from(table).delete().eq(siteColumn, menuSiteId);
  return error;
}

async function executePlan(supabase, plan) {
  const menuSiteId = plan.entitlement.menu_site_id;
  const parentRowsByKey = {};
  const errors = [];

  if (plan.errors.length > 0) {
    return [
      {
        scope: "preflight",
        message: "Dry-run plan has unresolved table/storage errors. Fix permissions or schema coverage before execute.",
        details: plan.errors,
      },
    ];
  }

  for (const [key, definition] of Object.entries(PARENT_ID_TABLES)) {
    const result = await selectRows(supabase, definition.name, "id", definition.siteColumn, menuSiteId);
    if (result.error) {
      errors.push({ scope: `${definition.name}.preload`, message: result.error.message });
    }
    parentRowsByKey[key] = result.rows;
  }

  if (errors.length > 0) {
    return errors;
  }

  for (const table of CONTENT_TABLES) {
    const error = table.parent
      ? await deleteByParentIds(supabase, table.name, table.parentColumn, (parentRowsByKey[table.parent] ?? []).map((row) => row.id).filter(Boolean))
      : await deleteBySite(supabase, table.name, table.siteColumn, menuSiteId);

    if (error && !isMissingTableOrColumn(error)) {
      errors.push({ scope: table.name, message: error.message });
    }
  }

  if (errors.length > 0) {
    return errors;
  }

  if (plan.storagePaths.length > 0) {
    const { error } = await supabase.storage.from(MENU_IMAGES_BUCKET).remove(plan.storagePaths);
    if (error) {
      errors.push({ scope: "storage.remove", message: error.message });
    }
  }

  if (errors.length > 0) {
    return errors;
  }

  const { error: siteError } = await supabase
    .from("menu_sites")
    .update({
      status: "archived",
      published_at: null,
      logo_path: null,
      logo_url: null,
      cover_image_path: null,
      cover_image_url: null,
      intro_image_path: null,
      intro_image_url: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", menuSiteId);

  if (siteError) {
    errors.push({ scope: "menu_sites.shell_update", message: siteError.message });
  }

  const { error: entitlementError } = await supabase
    .from("service_entitlements")
    .update({ status: "deleted" })
    .eq("id", plan.entitlement.id);

  if (entitlementError) {
    errors.push({ scope: "service_entitlements.deleted_marker", message: entitlementError.message });
  }

  return errors;
}

function summarizePlans(plans) {
  const totals = {
    menuSites: plans.length,
    tableCounts: {},
    storagePaths: 0,
    errors: 0,
  };

  for (const plan of plans) {
    for (const [table, count] of Object.entries(plan.tableCounts)) {
      totals.tableCounts[table] = (totals.tableCounts[table] ?? 0) + count;
    }
    totals.storagePaths += plan.storagePaths.length;
    totals.errors += plan.errors.length;
  }

  return totals;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const execute = options.execute && options.confirm === EXECUTE_CONFIRMATION;
  const dryRun = !execute;

  if (options.execute && !execute) {
    throw new Error(`Execute mode requires --confirm ${EXECUTE_CONFIRMATION}`);
  }

  const supabase = createSupabaseAdminClient();
  const candidates = await loadPendingDeleteCandidates(supabase, options);
  const plans = [];

  for (const entitlement of candidates) {
    plans.push(await buildMenuSitePlan(supabase, entitlement, options));
  }

  const result = {
    ok: true,
    dryRun,
    execute,
    candidateCount: candidates.length,
    allowlist: {
      menuSiteIds: options.menuSiteIds,
      slugs: options.slugs,
    },
    safety: {
      executeRequires: `--execute --confirm ${EXECUTE_CONFIRMATION}`,
      serviceRoleRequired: true,
      onlyPendingDelete: true,
      menuSiteShellPreserved: true,
      presetAndPlaceholderImagesProtected: true,
    },
    totals: summarizePlans(plans),
    plans,
  };

  if (execute) {
    const executeErrors = [];
    for (const plan of plans) {
      executeErrors.push(...(await executePlan(supabase, plan)));
    }
    result.executeErrors = executeErrors;
    result.ok = executeErrors.length === 0;
  }

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, message: error instanceof Error ? error.message : String(error) }, null, 2));
  process.exitCode = 1;
});
