import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || "kfbekbapwsyeanobyjsv";
const __dirname = dirname(fileURLToPath(import.meta.url));
const outputPath = resolve(__dirname, "../lib/supabase/types.ts");

const generatedTypes = execFileSync(
  "supabase",
  ["gen", "types", "typescript", "--project-id", PROJECT_REF, "--schema", "public"],
  { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] },
);

const projectTypeAliases = `export type MenuSiteStatus = "draft" | "published" | "archived"
export type MenuSectionKey = "set_menu" | "main_menu" | "dessert_drink"
export type SupportedLocale = "ko" | "en" | "zh" | "ja"
export type BadgeType = "none" | "recommend" | "popular" | "best" | "discount" | "event" | "signature"
export type OrderStatus = "pending" | "paid" | "cancelled" | "refunded"
export type PaymentStatus = "ready" | "paid" | "failed" | "cancelled"
export type InquiryStatus = "open" | "answered" | "closed"
`;

const databaseExportMarker = "export type Database = {";
const databaseExportIndex = generatedTypes.indexOf(databaseExportMarker);

if (databaseExportIndex === -1) {
  throw new Error("Generated Supabase types did not contain Database export.");
}

const output = `${generatedTypes.slice(0, databaseExportIndex)}${projectTypeAliases}\n${generatedTypes.slice(databaseExportIndex)}`;

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, output);
