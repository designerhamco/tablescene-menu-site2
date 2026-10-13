import { readFileSync } from "node:fs";

/** Inspect the renderer and its extracted modules as one existing contract. */
export function readCafeTemplateSource() {
  return [
    "one-page/pc-tablet/cafe-fit-engine.ts",
    "shared/cafe-template-types.ts",
    "shared/cafe-menu-pricing.ts",
    "shared/cafe-template-content.ts",
    "CafeDesignA.tsx",
  ].map((file) => readFileSync(new URL(`../../components/menu-templates/${file}`, import.meta.url), "utf8")).join("\n");
}
