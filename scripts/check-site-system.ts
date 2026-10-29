import { readFileSync } from "node:fs";
import { join } from "node:path";
import { auditSiteSystem, collectSiteSystemFiles, newSiteSystemViolations, staleSiteSystemAllowances, type SiteSystemBaseline } from "../lib/site-system-audit";

const root = process.cwd();
const baseline = JSON.parse(readFileSync(join(root, "docs/site-system-legacy-inventory.json"), "utf8")) as SiteSystemBaseline;
const violations = auditSiteSystem(collectSiteSystemFiles(root));
const failures = newSiteSystemViolations(violations, baseline);
const stale = staleSiteSystemAllowances(violations, baseline);
if (failures.length || stale.length) {
  console.error("Site design-system contract failed. Use SitePage, shared control APIs and canonical tokens; do not add page-specific exceptions.");
  for (const failure of failures) console.error(`${failure.file}:${failure.line} [${failure.rule}] ${failure.detail}`);
  for (const entry of stale) console.error(`Remove obsolete legacy allowance: ${entry}`);
  process.exitCode = 1;
} else {
  console.log("Site design-system contract passed (automatic route/component/CSS discovery).");
}
