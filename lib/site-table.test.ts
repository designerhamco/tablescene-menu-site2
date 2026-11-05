import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Table, TableCaption, TableCell, TableHead } from "../app/components/ui/table";
import { getSiteTableLayout, SITE_TABLE_RULES } from "./site-table";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

test("공통 열 역할로 최소 너비를 계산하고 일반 표에는 고정 폭을 강제하지 않는다", () => {
  const layout = getSiteTableLayout(["compact", "text", "detail", "control", "actions"]);
  assert.equal(layout.minWidthRem, 56);
  assert.ok(Math.abs(layout.widths.reduce((sum, width) => sum + width, 0) - 100) < 0.00001);
  assert.equal(getSiteTableLayout(["compact", "text"]).minWidthRem, 18);
  const markup = renderToStaticMarkup(h(Table, { variant: "management", label: "일반 조회 표" }));
  assert.doesNotMatch(markup, /site-table-min-width|data-layout="columns"|colgroup/);
});

test("관리 표는 이름 있는 키보드 영역과 caption·colgroup 순서를 유지한다", () => {
  const markup = renderToStaticMarkup(h(Table, { variant: "management", label: "관리 표 예시", columns: ["compact", "text"] }, h(TableCaption, {}, "표 설명")));
  assert.match(markup, /role="region" aria-label="관리 표 예시" tabindex="0"/);
  assert.match(markup, /--site-table-min-width:18rem/);
  assert.ok(markup.indexOf("<caption") < markup.indexOf("<colgroup>"));
  assert.match(renderToStaticMarkup(h(TableHead, {}, "이름")), /scope="col"/);
  assert.match(renderToStaticMarkup(h(TableCell, { align: "end" }, "1,000")), /data-align="end"/);
  const legacy = renderToStaticMarkup(h(Table, { className: "existing-table" }));
  assert.match(legacy, /existing-table/);
  assert.doesNotMatch(legacy, /role="region"|tabindex/);
});

test("표의 문서 치수는 공통 토큰과 일치하고 행은 내용에 맞게 커진다", () => {
  const css = read("../styles/site-spacing.css");
  const resolvePx = (token: string): number => {
    const value = css.match(new RegExp(`${token}:\\s*([^;]+);`))?.[1];
    assert.ok(value, token);
    const reference = value.match(/^var\((--[\w-]+)\)$/)?.[1];
    return reference ? resolvePx(reference) : Number.parseFloat(value) * 16;
  };
  for (const rule of SITE_TABLE_RULES) assert.equal(resolvePx(rule.token), rule.pixels, rule.label);
  assert.match(css, /padding: var\(--site-table-cell-inset\)/);
  assert.match(css, /padding-block: var\(--site-table-head-inset-block\)/);
  assert.match(css, /\.site-table-scroll \{[^}]*contain: inline-size/);
  assert.doesNotMatch(css, /site-management-table[^{}]*\{[^{}]*(?:max-height|overflow:\s*hidden)/);
  assert.doesNotMatch(css, /data-column="(?:kind|name|connection|status|actions)"/);
});

test("관리 화면과 라이브러리는 같은 표 API와 간격·상태 예시를 공유한다", () => {
  const manager = read("../app/mypage/menus/[menuId]/tables/MenuTableManager.tsx");
  const examples = read("../components/design-system/ManagementTableExamples.tsx");
  assert.match(manager, /columns=\{\["compact", "text", "text", "control", "detail", "actions"\]\}/);
  assert.match(examples, /columns=\{\["compact", "text", "detail", "control", "actions"\]\}/);
  assert.match(manager, /<Tabs purpose="state"[^>]*>\s*<div className="site-stack-group">/);
  assert.match(manager, /<div className="site-stack-block">\s*<h2[^>]*>운영 테이블/);
  assert.match(examples, /SITE_TABLE_RULES.map/);
  assert.match(examples, /align="end"/);
  assert.match(examples, /loading=\{index === 2\}/);
  assert.match(read("../components/design-system/SiteComponentGallery.tsx"), /<ManagementTableExamples \/>/);
});
