import { readFileSync } from "node:fs";
import { join } from "node:path";
import { auditSiteSystem, collectSiteSystemFiles, newSiteSystemViolations, type SiteSystemBaseline } from "../lib/site-system-audit";

const root = process.cwd();
const baseline = JSON.parse(readFileSync(join(root, "docs/site-system-legacy-inventory.json"), "utf8")) as SiteSystemBaseline;
const failures = newSiteSystemViolations(auditSiteSystem(collectSiteSystemFiles(root)), baseline);
if (failures.length) {
  console.error("Site design-system contract failed. Use SitePage, shared control APIs and canonical tokens; do not add page-specific exceptions.");
  for (const failure of failures) console.error(`${failure.file}:${failure.line} [${failure.rule}] ${failure.detail}`);
  process.exitCode = 1;
} else {
  console.log("Site design-system contract passed (automatic route/component/CSS discovery).");
}
