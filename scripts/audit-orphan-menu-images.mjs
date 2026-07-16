#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";
import assert from "node:assert/strict";
import { existsSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const BUCKET = "menu-images";
const SAFE_ROOT_PREFIX = "menu-sites/";
const DEFAULT_STORAGE_PREFIX = "";
const PAGE_SIZE = 1000;
const DRAFT_RETENTION_RECOMMENDATION = "Review draft candidates separately; keep unreferenced draft files for at least 7-30 days before deletion.";

const DB_TABLES = [
  {
    table: "menu_sites",
    select: "id, logo_path, logo_url, cover_image_path, cover_image_url, intro_image_path, intro_image_url, page_settings, settings",
    siteColumn: "id",
    extract(row, add) {
      add(row.logo_path, "logo_path");
      add(row.logo_url, "logo_url");
      add(row.cover_image_path, "cover_image_path");
      add(row.cover_image_url, "cover_image_url");
      add(row.intro_image_path, "intro_image_path");
      add(row.intro_image_url, "intro_image_url");
      addJsonPaths(row.page_settings, "page_settings", add);
      addJsonPaths(row.settings, "settings", add);
    },
  },
  {
    table: "menu_pages",
    select: "id, menu_site_id, display_settings",
    siteColumn: "menu_site_id",
    extract(row, add) {
      addJsonPaths(row.display_settings, "display_settings", add);
    },
  },
  {
    table: "menu_items",
    select: "id, menu_site_id, image_path, image_url",
    siteColumn: "menu_site_id",
    extract(row, add) {
      add(row.image_path, "image_path");
      add(row.image_url, "image_url");
    },
  },
  {
    table: "menu_chefs",
    select: "id, menu_site_id, chef_image_path, chef_image_url",
    siteColumn: "menu_site_id",
    optional: true,
    extract(row, add) {
      add(row.chef_image_path, "chef_image_path");
      add(row.chef_image_url, "chef_image_url");
    },
  },
  {
    table: "menu_events",
    select: "id, menu_site_id, event_image_path, event_image_url",
    siteColumn: "menu_site_id",
    optional: true,
    extract(row, add) {
      add(row.event_image_path, "event_image_path");
      add(row.event_image_url, "event_image_url");
    },
  },
  {
    table: "menu_widgets",
    select: "id, menu_site_id, image_path, image_url",
    siteColumn: "menu_site_id",
    optional: true,
    extract(row, add) {
      add(row.image_path, "image_path");
      add(row.image_url, "image_url");
    },
  },
  {
    table: "menu_widget_items",
    select: "id, widget_id, image_path, image_url",
    optional: true,
    extract(row, add) {
      add(row.image_path, "image_path");
      add(row.image_url, "image_url");
    },
  },
];

function parseArgs(argv) {
  const options = {
    menuSiteId: "",
    prefix: DEFAULT_STORAGE_PREFIX,
    jsonOutput: "",
    selfTest: false,
  };

  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }

    if (arg.startsWith("--menu-site-id=")) {
      options.menuSiteId = arg.slice("--menu-site-id=".length).trim();
      continue;
    }

    if (arg.startsWith("--prefix=")) {
      options.prefix = arg.slice("--prefix=".length).trim();
      continue;
    }

    if (arg.startsWith("--json-output=")) {
      options.jsonOutput = arg.slice("--json-output=".length).trim();
      continue;
    }

    if (arg === "--self-test") {
      options.selfTest = true;
      continue;
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  if (options.menuSiteId && !isUuidLike(options.menuSiteId)) {
    throw new Error("--menu-site-id must be a UUID.");
  }

  const prefixValidation = validateStorageListPrefix(options.prefix, options.menuSiteId);
  if (prefixValidation) {
    throw new Error(prefixValidation);
  }

  return options;
}

function printHelp() {
  console.log(`menu-images audit

Read-only dry-run for Supabase Storage orphan candidates.

Usage:
  node --env-file=.env.local scripts/audit-orphan-menu-images.mjs [options]

Options:
  --menu-site-id=<uuid>     Restrict DB references and safe Storage candidates to one menu site.
  --prefix=<safe-prefix>    Restrict Storage listing. Must be empty, menu-sites, or menu-sites/{menuSiteId}/...
  --json-output=<path>      Write the full JSON report to a local file.
  --self-test               Run local fixture checks without connecting to Supabase.

This script never deletes or updates DB rows or Storage objects.`);
}

async function loadLocalEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;

  const content = await readFile(envPath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const index = line.indexOf("=");
    const key = line.slice(0, index).trim();
    if (!key || process.env[key] !== undefined) continue;
    process.env[key] = parseEnvValue(line.slice(index + 1).trim());
  }
}

function parseEnvValue(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
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

async function selectAllRows(supabase, definition, options) {
  const rows = [];
  let from = 0;

  while (true) {
    let query = supabase.from(definition.table).select(definition.select).range(from, from + PAGE_SIZE - 1);
    if (options.menuSiteId && definition.siteColumn) {
      query = query.eq(definition.siteColumn, options.menuSiteId);
    }

    const { data, error } = await query;
    if (error) {
      if (definition.optional && isMissingTableOrColumn(error)) {
        return { rows, skipped: true, error: null };
      }
      return { rows, skipped: false, error };
    }

    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return { rows, skipped: false, error: null };
}

function isMissingTableOrColumn(error) {
  const message = String(error?.message ?? "").toLowerCase();
  return error?.code === "42P01" || error?.code === "42703" || message.includes("does not exist") || message.includes("schema cache");
}

async function collectDbReferences(supabase, options) {
  const referencesByPath = new Map();
  const skippedTables = [];
  const errors = [];

  for (const definition of DB_TABLES) {
    const result = await selectAllRows(supabase, definition, options);
    if (result.skipped) {
      skippedTables.push(definition.table);
      continue;
    }
    if (result.error) {
      errors.push({
        scope: definition.table,
        message: result.error.message,
      });
      continue;
    }

    for (const row of result.rows) {
      const rowSiteId = definition.siteColumn ? row[definition.siteColumn] : null;
      const add = (value, field) => addDbReference(referencesByPath, value, {
        table: definition.table,
        rowId: row.id ?? null,
        menuSiteId: rowSiteId,
        field,
      });
      definition.extract(row, add);
    }
  }

  return { referencesByPath, skippedTables, errors };
}

function addDbReference(referencesByPath, value, reference) {
  const path = normalizeMenuImagePath(value, reference.menuSiteId ?? undefined);
  if (!path) return;

  const current = referencesByPath.get(path) ?? {
    path,
    references: [],
  };
  current.references.push(reference);
  referencesByPath.set(path, current);
}

function addJsonPaths(value, fieldPrefix, add) {
  if (typeof value === "string") {
    add(value, fieldPrefix);
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => addJsonPaths(item, `${fieldPrefix}[${index}]`, add));
    return;
  }

  if (!value || typeof value !== "object") return;

  for (const [key, item] of Object.entries(value)) {
    addJsonPaths(item, `${fieldPrefix}.${key}`, add);
  }
}

function normalizeMenuImagePath(value, expectedMenuSiteId) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("/placeholders/") || trimmed.startsWith("/menu-templates/") || trimmed.startsWith("/assets/")) {
    return null;
  }

  const withoutQuery = trimmed.split(/[?#]/, 1)[0] ?? "";
  const publicMarker = `/storage/v1/object/public/${BUCKET}/`;
  const markerIndex = withoutQuery.indexOf(publicMarker);
  const rawPath = markerIndex >= 0 ? withoutQuery.slice(markerIndex + publicMarker.length) : withoutQuery;

  if (/^https?:\/\//i.test(rawPath)) return null;
  const path = rawPath.replace(/^\/+/, "");
  if (!isPotentialStoragePath(path)) return null;
  if (expectedMenuSiteId && !path.startsWith(`menu-sites/${expectedMenuSiteId}/`)) return null;

  return path;
}

function isPotentialStoragePath(path) {
  return Boolean(path && !path.includes("..") && path.startsWith(SAFE_ROOT_PREFIX));
}

async function listStorageFiles(supabase, prefix) {
  const files = [];
  const errors = [];
  const normalizedPrefix = prefix.replace(/^\/+|\/+$/g, "");
  const stack = [normalizedPrefix];

  while (stack.length > 0) {
    const currentPrefix = stack.pop() ?? "";
    let offset = 0;

    while (true) {
      const { data, error } = await supabase.storage.from(BUCKET).list(currentPrefix, {
        limit: PAGE_SIZE,
        offset,
        sortBy: { column: "name", order: "asc" },
      });
      if (error) {
        errors.push({ prefix: currentPrefix, message: error.message });
        break;
      }

      const items = data ?? [];
      for (const item of items) {
        const path = currentPrefix ? `${currentPrefix}/${item.name}` : item.name;
        if (isStorageFolder(item)) {
          stack.push(path);
        } else {
          files.push({
            path,
            sizeBytes: getStorageItemSize(item),
            updatedAt: item.updated_at ?? item.created_at ?? null,
            createdAt: item.created_at ?? null,
            metadata: item.metadata ? { mimetype: item.metadata.mimetype ?? null } : null,
          });
        }
      }

      if (items.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }
  }

  return { files, errors };
}

function isStorageFolder(item) {
  return item.id === null || (item.metadata == null && !item.name.includes("."));
}

function getStorageItemSize(item) {
  const size = item.metadata?.size ?? item.metadata?.contentLength ?? item.metadata?.content_length ?? null;
  return typeof size === "number" && Number.isFinite(size) ? size : null;
}

function classifyStorageFiles(storageFiles, referencesByPath, options) {
  const storagePathSet = new Set(storageFiles.map((file) => file.path));
  const referenced = [];
  const orphanCandidates = [];
  const draftCandidates = [];
  const unsafeOrUnclassified = [];

  for (const file of storageFiles) {
    const safety = classifyStoragePathSafety(file.path, options.menuSiteId);
    const reference = referencesByPath.get(file.path);

    if (reference) {
      referenced.push({
        ...file,
        referenceCount: reference.references.length,
        references: reference.references,
      });
      continue;
    }

    if (safety.kind === "draft") {
      draftCandidates.push({
        ...file,
        reason: "Draft upload prefix is protected from orphan deletion candidates",
        retentionRecommendation: DRAFT_RETENTION_RECOMMENDATION,
      });
      continue;
    }

    if (safety.kind === "safe") {
      orphanCandidates.push({
        ...file,
        reason: "No DB reference found",
      });
      continue;
    }

    unsafeOrUnclassified.push({
      ...file,
      reason: safety.reason,
    });
  }

  const missingInStorage = Array.from(referencesByPath.values())
    .filter((entry) => !storagePathSet.has(entry.path))
    .map((entry) => ({
      path: entry.path,
      referenceCount: entry.references.length,
      references: entry.references,
      reason: "DB reference was not found in Storage list result",
    }));

  return {
    referenced,
    orphanCandidates,
    draftCandidates,
    unsafeOrUnclassified,
    missingInStorage,
  };
}

function classifyStoragePathSafety(path, restrictedMenuSiteId) {
  if (!path || path.startsWith("/") || path.includes("..")) {
    return { kind: "unsafe", reason: "Invalid object path" };
  }
  if (!path.startsWith(SAFE_ROOT_PREFIX)) {
    return { kind: "unsafe", reason: "Outside menu-sites prefix" };
  }

  const parts = path.split("/");
  const menuSiteId = parts[1] ?? "";
  if (!isUuidLike(menuSiteId)) {
    return { kind: "unsafe", reason: "menu site id prefix is not a UUID" };
  }
  if (restrictedMenuSiteId && menuSiteId !== restrictedMenuSiteId) {
    return { kind: "unsafe", reason: "Storage path belongs to a different menu site than the requested filter" };
  }
  if (parts[2] === "draft") {
    return { kind: "draft" };
  }

  return { kind: "safe" };
}

function validateStorageListPrefix(prefix, menuSiteId) {
  if (!prefix) return null;
  const cleanPrefix = prefix.replace(/^\/+|\/+$/g, "");
  if (!cleanPrefix) return null;
  if (cleanPrefix === "menu-sites") return null;
  if (!cleanPrefix.startsWith(SAFE_ROOT_PREFIX)) {
    return "--prefix must be empty, menu-sites, or menu-sites/{menuSiteId}/...";
  }
  if (cleanPrefix.includes("..")) {
    return "--prefix cannot contain '..'.";
  }
  const pathMenuSiteId = cleanPrefix.split("/")[1] ?? "";
  if (!isUuidLike(pathMenuSiteId)) {
    return "--prefix menu site segment must be a UUID.";
  }
  if (menuSiteId && pathMenuSiteId !== menuSiteId) {
    return "--prefix must stay under the requested --menu-site-id.";
  }
  return null;
}

function isUuidLike(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function sumKnownSizes(files) {
  return files.reduce((sum, file) => sum + (typeof file.sizeBytes === "number" ? file.sizeBytes : 0), 0);
}

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function buildReport({ options, dbResult, storageResult, classification }) {
  const referencedPaths = Array.from(dbResult.referencesByPath.values()).sort((left, right) => left.path.localeCompare(right.path));
  const knownStorageSizeBytes = sumKnownSizes(storageResult.files);
  const potentialReclaimSizeBytes = sumKnownSizes(classification.orphanCandidates);

  return {
    generatedAt: new Date().toISOString(),
    dryRun: true,
    bucket: BUCKET,
    filters: {
      menuSiteId: options.menuSiteId || null,
      storagePrefix: options.prefix || null,
    },
    summary: {
      dbReferencedPaths: referencedPaths.length,
      storageFiles: storageResult.files.length,
      referencedFiles: classification.referenced.length,
      orphanCandidates: classification.orphanCandidates.length,
      draftCandidates: classification.draftCandidates.length,
      unsafeOrUnclassified: classification.unsafeOrUnclassified.length,
      missingInStorage: classification.missingInStorage.length,
      knownStorageSizeBytes,
      potentialReclaimSizeBytes,
      skippedTables: dbResult.skippedTables,
      dbReadErrors: dbResult.errors,
      storageListErrors: storageResult.errors,
      unscopedReferenceTables: options.menuSiteId ? DB_TABLES.filter((definition) => !definition.siteColumn).map((definition) => definition.table) : [],
    },
    referencedPaths,
    referencedFiles: classification.referenced,
    orphanCandidates: classification.orphanCandidates,
    draftCandidates: classification.draftCandidates,
    unsafeOrUnclassified: classification.unsafeOrUnclassified,
    missingInStorage: classification.missingInStorage,
    notes: {
      readOnly: "This script only calls Supabase select and Storage list operations.",
      lifecycleHardDeleteDifference: "hard-delete-expired-menu-sites removes all content for eligible expired menu sites; this audit only compares DB image references with menu-images Storage objects and never deletes.",
      draftRetentionRecommendation: DRAFT_RETENTION_RECOMMENDATION,
    },
  };
}

function printSummary(report) {
  const summary = report.summary;
  console.log("menu-images audit\n");
  console.log(`DB referenced paths: ${summary.dbReferencedPaths}`);
  console.log(`Storage files: ${summary.storageFiles}`);
  console.log(`Referenced files: ${summary.referencedFiles}`);
  console.log(`Orphan candidates: ${summary.orphanCandidates}`);
  console.log(`Draft candidates: ${summary.draftCandidates}`);
  console.log(`Unsafe/unclassified: ${summary.unsafeOrUnclassified}`);
  console.log(`Missing in Storage: ${summary.missingInStorage}`);
  console.log(`Known storage size: ${formatBytes(summary.knownStorageSizeBytes)}`);
  console.log(`Potential reclaim size: ${formatBytes(summary.potentialReclaimSizeBytes)}`);

  if (summary.skippedTables.length > 0) {
    console.log(`Skipped optional tables: ${summary.skippedTables.join(", ")}`);
  }
  if (summary.dbReadErrors.length > 0 || summary.storageListErrors.length > 0) {
    console.log("Read/list errors were recorded in the JSON report.");
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.selfTest) {
    runSelfTest();
    return;
  }

  await loadLocalEnv();
  const supabase = createSupabaseAdminClient();

  const dbResult = await collectDbReferences(supabase, options);
  const storageResult = await listStorageFiles(supabase, options.prefix);
  const classification = classifyStorageFiles(storageResult.files, dbResult.referencesByPath, options);
  const report = buildReport({ options, dbResult, storageResult, classification });

  printSummary(report);

  if (options.jsonOutput) {
    writeFileSync(resolve(process.cwd(), options.jsonOutput), `${JSON.stringify(report, null, 2)}\n`);
    console.log(`\nJSON report written to ${options.jsonOutput}`);
  }

  if (dbResult.errors.length > 0 || storageResult.errors.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

function runSelfTest() {
  const menuSiteId = "11111111-1111-4111-8111-111111111111";
  const referencesByPath = new Map([
    [
      `menu-sites/${menuSiteId}/items/item-a/main.webp`,
      {
        path: `menu-sites/${menuSiteId}/items/item-a/main.webp`,
        references: [
          { table: "menu_items", rowId: "item-a", menuSiteId, field: "image_path" },
          { table: "menu_items", rowId: "item-a", menuSiteId, field: "image_url" },
        ],
      },
    ],
    [
      `menu-sites/${menuSiteId}/items/missing/main.webp`,
      {
        path: `menu-sites/${menuSiteId}/items/missing/main.webp`,
        references: [
          { table: "menu_items", rowId: "missing", menuSiteId, field: "image_path" },
        ],
      },
    ],
  ]);
  const storageFiles = [
    { path: `menu-sites/${menuSiteId}/items/item-a/main.webp`, sizeBytes: 10, updatedAt: null },
    { path: `menu-sites/${menuSiteId}/items/orphan/main.webp`, sizeBytes: 20, updatedAt: null },
    { path: `menu-sites/${menuSiteId}/draft/items/item-b-temp.webp`, sizeBytes: 30, updatedAt: null },
    { path: "loose/file.webp", sizeBytes: 40, updatedAt: null },
  ];
  const classification = classifyStorageFiles(storageFiles, referencesByPath, { menuSiteId });

  assert.equal(classification.referenced.length, 1, "referenced file should be classified");
  assert.equal(classification.referenced[0].referenceCount, 2, "multiple DB references should be preserved");
  assert.equal(classification.orphanCandidates.length, 1, "storage-only safe file should be orphan candidate");
  assert.equal(classification.draftCandidates.length, 1, "draft prefix should be protected");
  assert.equal(classification.unsafeOrUnclassified.length, 1, "unsafe prefix should be unclassified");
  assert.equal(classification.missingInStorage.length, 1, "DB-only reference should be missing in storage");
  assert.equal(normalizeMenuImagePath("https://example.com/image.webp", menuSiteId), null, "external URL should be ignored");
  assert.equal(normalizeMenuImagePath("/placeholders/starter/cafe-cover.svg", menuSiteId), null, "local public asset should be ignored");

  console.log("menu-images audit self-test passed");
}
