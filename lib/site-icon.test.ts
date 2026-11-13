import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Heart, Check, CircleIcon, Bell } from "../app/components/ui/site-icon";
import { SITE_CIRCULAR_ARROW_HEADS, SITE_ARROW_PATHS } from "./site-arrow";

function sources(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? sources(file) : /\.tsx$/.test(file) ? [file] : [];
  });
}
test("official site uses Remix while menu artwork retains its independent family", () => {
  const legacy: string[] = [], leaked: string[] = [];
  for (const file of [...sources("app"), ...sources("components")]) {
    const source = fs.readFileSync(file, "utf8");
    if (/components\/(?:menu-templates|public-menu)\//.test(file)) {
      if (/from ["'][^"']*site-(?:icon|arrow)["']/.test(source)) leaked.push(file);
    } else if (/from ["']lucide-react["']/.test(source)) legacy.push(file);
  }
  assert.deepEqual(legacy, []);
  assert.deepEqual(leaked, []);
});
test("Remix icons preserve SVG props, names and actual selected heart geometry", () => {
  const outline = renderToStaticMarkup(createElement(Heart, { fill: "none" }));
  const filled = renderToStaticMarkup(createElement(Heart, { fill: "currentColor" }));
  assert.match(outline, /data-filled="false"/);
  assert.match(filled, /data-filled="true"/);
  assert.notEqual(outline.match(/<path[^>]+d="([^"]+)/)?.[1], filled.match(/<path[^>]+d="([^"]+)/)?.[1]);
  assert.equal(filled, renderToStaticMarkup(createElement(Heart, { filled: true })));
  const named = renderToStaticMarkup(createElement(Bell, { size: 16, "aria-hidden": false, "aria-label": "알림", className: "test-glyph", strokeWidth: 3 }));
  assert.match(named, /width="16" height="16"/);
  assert.match(named, /aria-label="알림"/);
  assert.match(named, /aria-hidden="false"/);
  assert.match(named, /class="test-glyph"/);
  assert.match(named, /stroke="none"/);
  assert.doesNotMatch(named, /stroke-width/);
  for (const Glyph of [Check, CircleIcon]) assert.match(renderToStaticMarkup(createElement(Glyph)), /<path fill="currentColor"/);
});
test("refresh uses Remix while rotate and other approved arrow paths remain intact", () => {
  // One line and one curve per wing, without the former second wing's quadratic back.
  assert.equal((SITE_CIRCULAR_ARROW_HEADS.rotate.match(/L/g) ?? []).length, 1);
  assert.equal((SITE_CIRCULAR_ARROW_HEADS.rotate.match(/Q/g) ?? []).length, 1);
  assert.match(SITE_ARROW_PATHS.refresh, /^M5\.463 4\.433A9\.96/);
  assert.match(SITE_ARROW_PATHS.shaft, /^M3 12H21M13 4C/);
});
