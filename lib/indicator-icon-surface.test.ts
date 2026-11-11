import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import test from "node:test";
import postcss from "postcss";
import { EmptyState } from "../app/components/ui/empty-state";
import { MetricCard } from "../app/components/ui/data-display";
import { auditSiteSystem } from "./site-system-audit";

const read = (file: string) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const css = postcss.parse(read("styles/site-design.css"));
function declarations(selector: string) {
  const values: Record<string, string> = {};
  css.walkRules(rule => {
    if (rule.selectors.includes(selector)) rule.walkDecls(decl => { values[decl.prop] = decl.value; });
  });
  return values;
}

test("indicator surfaces follow the actual component surface, including a white card in a gray page", () => {
  const icon = createElement("svg", { "data-example-glyph": true });
  const empty = renderToStaticMarkup(createElement(EmptyState, { icon, title: "테이블 없음", description: "등록해 주세요." }));
  assert.match(empty, /class="site-empty-state-icon site-indicator-icon" data-icon-surface="unpainted"/);
  for (const surface of ["default", "muted"] as const) {
    const html = renderToStaticMarkup(createElement("div", { className: "site-dashboard" },
      createElement(MetricCard, { icon, label: "운영 테이블", value: "0개", surface, tone: "green" })));
    assert.ok(html.includes(`data-icon-surface="${surface === "default" ? "white" : "colored"}"`));
    assert.match(html, /data-tone="green"/);
    assert.match(html, /data-example-glyph="true"/);
  }
});

test("colored indicators remove the entire tile slot while white indicators retain their fills and dimensions", () => {
  const colored = declarations('.site-indicator-icon[data-icon-surface="colored"]');
  assert.deepEqual(declarations('.site-indicator-icon[data-icon-surface="unpainted"]'), colored);
  assert.equal(declarations(".site-empty-state").background, "transparent");
  assert.equal(declarations(".site-empty-state").border, "0");
  assert.equal(colored.background, "transparent");
  assert.equal(colored.border, "0");
  assert.equal(colored["box-shadow"], "none");
  assert.equal(colored.color, undefined);
  assert.equal(colored.width, "max-content");
  assert.equal(colored.height, "max-content");
  assert.equal(colored.padding, "0");
  assert.equal(colored.margin, "0");
  assert.equal(colored["min-width"], "0");
  assert.equal(colored["min-height"], "0");
  assert.equal(colored["border-radius"], "0");
  assert.equal(declarations(".site-empty-state-icon").width, "3rem");
  assert.equal(declarations(".site-metric-icon").width, "2.5rem");
  assert.equal(declarations(".site-metric-icon[data-tone=green]").background, "var(--ui-success-surface)");
  assert.equal(declarations(".site-notification-symbol").background, "var(--ui-surface-soft)");
  assert.equal(declarations(".site-notification-item[data-unread] .site-notification-symbol").background, "var(--ui-brand-soft)");
  assert.equal(declarations(".site-notification-symbol > i").background, "var(--ui-danger)");
  assert.equal(declarations(".site-notification-item:hover .site-indicator-icon").background, "transparent");
  assert.equal(declarations(".site-notification-item:hover .site-indicator-icon").width, undefined);
  assert.match(read("app/components/ui/notification-panel.tsx"), /site-notification-symbol site-indicator-icon" data-icon-surface="white"/);
});

test("page CSS cannot override shared indicator paint and the reset never targets icon buttons or notification dots", () => {
  for (const property of ["background: white", "border: 1px solid white", "box-shadow: 0 0 2px black"]) {
    const result = auditSiteSystem(new Map([["components/example.module.css", `.page .site-indicator-icon { ${property}; }`]]));
    assert.ok(result.some(item => item.rule === "control-css"));
  }
  css.walkRules(rule => {
    if (!rule.selectors.includes('.site-indicator-icon[data-icon-surface="colored"]')) return;
    assert.ok(rule.selectors.every(selector => !/button|\bi\b|svg/.test(selector)));
  });
});
