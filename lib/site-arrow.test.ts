import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { SITE_ARROW_CHEVRON } from "./site-arrow";

const root = process.cwd();
function sources(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? sources(file) : /\.tsx$/.test(file) ? [file] : [];
  });
}

test("official site keeps a single arrow family while menu artwork stays independent", () => {
  const oldIcons: string[] = [];
  const leakedSiteIcons: string[] = [];
  for (const file of [...sources(path.join(root, "app")), ...sources(path.join(root, "components"))]) {
    const source = fs.readFileSync(file, "utf8");
    const menu = /components\/(?:menu-templates|public-menu)\//.test(file);
    if (menu) {
      if (/from ["'][^"']*(?:site-arrow|landing\/Icon)["']/.test(source)) leakedSiteIcons.push(path.relative(root, file));
      continue;
    }
    for (const match of source.matchAll(/import\s*\{([^}]+)\}\s*from\s*["']lucide-react["']/g)) {
      if (/\b(?:Arrow(?:Up|Down|Left|Right)(?:Up|Down|Left|Right)?|Chevrons?(?:Up|Down|Left|Right)|RefreshCw|RefreshCcw|RotateCw|RotateCcw|Undo2|Redo2)(?:Icon)?\b/.test(match[1])) oldIcons.push(path.relative(root, file));
    }
  }
  assert.deepEqual(oldIcons, [], "Official-site directional icons must use site-arrow");
  assert.deepEqual(leakedSiteIcons, [], "Menu designs must keep their own icon family");
});

test("native selects use the same sculpted SVG as custom controls and preserve menu exclusions", () => {
  const asset = fs.readFileSync(path.join(root, "public/icons/site-chevron-down.svg"), "utf8");
  assert.ok(asset.includes(`d="${SITE_ARROW_CHEVRON}"`));
  assert.match(asset, /transform="rotate\(90 12 12\)"/);
  const css = fs.readFileSync(path.join(root, "styles/ui-system.css"), "utf8");
  assert.ok(css.includes('url("/icons/site-chevron-down.svg")'));
  assert.match(css, /select:not\(\[multiple\]\)[^]*?menu-typography[^]*?aube-table-root[^]*?data-template-artwork/);
});
