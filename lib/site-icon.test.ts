import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Heart, Check, CircleIcon, Bell } from "../app/components/ui/site-icon";
import * as Arrows from "../app/components/ui/site-arrow";
import { SITE_ARROW_PATHS, type SiteArrowName } from "./site-arrow";

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
test("every shared arrow renders its named Remix path without custom strokes", () => {
  const names = new Set<string>();
  for (const Glyph of Object.values(Arrows)) {
    const html = renderToStaticMarkup(createElement(Glyph, { size: 16, strokeWidth: 3 }));
    const name = html.match(/data-site-icon="([^"]+)"/)?.[1] as SiteArrowName;
    names.add(name);
    assert.match(html, /data-icon-source="remix"/);
    assert.match(html, /width="16" height="16"/);
    assert.match(html, /stroke="none"/);
    assert.doesNotMatch(html, /stroke-width=/);
    assert.ok(html.includes(`<path d="${SITE_ARROW_PATHS[name]}" fill="currentColor"`), name);
    assert.equal((html.match(/<path /g) ?? []).length, 1);
  }
  assert.deepEqual([...names].sort(), Object.keys(SITE_ARROW_PATHS).sort());
  assert.match(renderToStaticMarkup(createElement(Arrows.ArrowUpRight)), /data-site-icon="arrow-right-up-line"/);
  assert.match(renderToStaticMarkup(createElement(Arrows.ChevronDown)), /data-site-icon="arrow-down-s-line"/);
  assert.match(renderToStaticMarkup(createElement(Arrows.Undo2)), /data-site-icon="arrow-go-back-line"/);
  assert.match(renderToStaticMarkup(createElement(Arrows.RotateCcw)), /data-site-icon="reset-left-line"/);
  assert.match(renderToStaticMarkup(createElement(Arrows.RefreshCcw)), /transform="translate\(0 24\) scale\(1 -1\)"/);
  assert.doesNotMatch(renderToStaticMarkup(createElement(Arrows.RefreshCw)), /transform=/);
});
