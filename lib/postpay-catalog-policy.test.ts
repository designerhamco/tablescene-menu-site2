import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

function fixture({ enabled = true, failed = false } = {}) {
  const scopes: [string, unknown][] = [];
  const item = (id: string, category_id: string | null, price = 5000) => ({ id, category_id, price, name: id, price_label: null, image_url: null });
  const rows = [item("ordinary", "ordinary"), item("component", "course"), item("hidden", "hidden"), item("orphan", "missing"), item("standalone", null), item("no-price", null, NaN)];
  const output = ts.transpileModule(readFileSync(new URL("./server/postpay-order-catalog-service.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const dependencies: Record<string, unknown> = {
    "server-only": {}, "node:crypto": {},
    "@/lib/menu-time-sale-display": { isMenuTimeSaleActive: () => true },
    "@/lib/postpay-order-runtime": { isPostpayOrderRuntimeEnabledForSite: () => enabled },
    "@/lib/supabase/admin": { createAdminClient: () => ({ from(name: string) {
      const chain = { select() { return this; }, eq(key: string, value: unknown) { scopes.push([key, value]); return this; }, order() { return this; }, async limit() { return { data: name === "menu_items" ? rows : [], error: failed ? new Error("failed") : null }; } };
      return chain;
    } }) },
  };
  const loaded = { exports: {} };
  new Function("require", "module", "exports", output)((name: string) => { assert.ok(name in dependencies, name); return dependencies[name]; }, loaded, loaded.exports);
  return { service: loaded.exports as typeof import("./server/postpay-order-catalog-service"), scopes };
}

test("주문 목록은 상품별 opt-in 없이 판매 상품을 포함하고 코스 구성품·숨김·유효하지 않은 가격은 제외한다", async () => {
  const f = fixture();
  const data = { categories: [{ id: "ordinary", visible: true }, { id: "course", name: "코스", course_price: 185000, visible: true }, { id: "hidden", visible: false }], timeSales: [], menuSite: { settings: { table_order: { orderableCourseIds: [] } } }, initialNowMs: 0 } as unknown as Parameters<typeof f.service.getPostpayOrderCatalog>[1];
  const catalog = await f.service.getPostpayOrderCatalog("site", data);
  assert.deepEqual(catalog.map(item => item.id), ["ordinary", "standalone", "course:course"]);
  assert.equal(catalog.at(-1)?.price, 185000);
  assert.ok(!f.scopes.some(([key]) => key === "orderable"));
  for (const pair of [["menu_site_id", "site"], ["visible", true], ["price_visible", true], ["is_sold_out", false]]) assert.ok(f.scopes.some(value => JSON.stringify(value) === JSON.stringify(pair)));
  assert.deepEqual((await f.service.getPostpayOrderCatalog("site")).map(item => item.id), ["standalone"]);
});

test("운영 미연결·조회 실패에서는 카탈로그를 노출하지 않는다", async () => {
  for (const config of [{ enabled: false }, { failed: true }]) assert.deepEqual(await fixture(config).service.getPostpayOrderCatalog("site"), []);
});
