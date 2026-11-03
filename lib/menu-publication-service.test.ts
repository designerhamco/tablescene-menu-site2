import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import { isUuid } from "./postpay-order-runtime";
import { isAubeTableTemplate, validateAubeTablePublishStructure } from "./aube-table";
import { getOperationReceptionState } from "./operation-reception-state";

const menuId = "11111111-1111-4111-8111-111111111111";
function fixture({ status = "published", denied = false, conflict = false, name = "테스트 매장", slug = "test-store", counts = [1, 1, 1], dining = false, structureValid = true, readError = false } = {}) {
  const site = { id: menuId, status, slug, restaurant_name: name, template_key: dining ? "dining_aube_table_a" : "cafe_design_a", published_at: "2026-10-01", updated_at: "v1", settings: { appearance: { color: "preserve" }, table_order: { orderEnabled: true, callEnabled: true, customerPhone: "hidden", futurePreference: "preserve" } } };
  const writes: Record<string, unknown>[] = [], scopes: unknown[][] = [], permissions: unknown[][] = [];
  const db = { from(table: string) {
    let update: Record<string, unknown> | undefined, head = false;
    const query = {
      select(_columns: string, options?: { head?: boolean }) { head = Boolean(options?.head); return this; },
      eq(key: string, value: unknown) { scopes.push([table, key, value]); return this; },
      is(key: string, value: unknown) { scopes.push([table, key, value]); return this; },
      update(value: Record<string, unknown>) { assert.equal(table, "menu_sites"); update = value; return this; },
      async maybeSingle() {
        if (update) { if (!conflict) writes.push(update); return { data: conflict ? null : { id: menuId }, error: null }; }
        return { data: site, error: readError ? { message: "failed" } : null };
      },
      then(resolve: (result: unknown) => unknown) {
        const index = ["menu_pages", "menu_categories", "menu_items"].indexOf(table);
        assert.ok(index >= 0);
        const data = table === "menu_pages" ? [{ id: "page", title: "메뉴", visible: structureValid, sort_order: 0 }]
          : table === "menu_categories" ? [{ id: "category", menu_page_id: "page", name: "코스", visible: true }]
            : [{ id: "item", category_id: "category", menu_page_id: "page", visible: true }];
        return Promise.resolve(resolve({ count: counts[index], data: head ? null : data, error: null }));
      },
    }; return query;
  } };
  const dependencies: Record<string, unknown> = {
    "server-only": {}, "@/lib/postpay-order-runtime": { isUuid }, "@/lib/aube-table": { isAubeTableTemplate, validateAubeTablePublishStructure },
    "./menu-site-access-service": { requireMenuSiteWriteAccess: async (...args: unknown[]) => { permissions.push(args); if (denied) throw new Error("permission denied"); return { supabase: db }; } },
  };
  const code = ts.transpileModule(readFileSync(new URL("./server/menu-publication-service.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const loaded = { exports: {} };
  new Function("require", "module", "exports", code)((name: string) => { assert.ok(name in dependencies, name); return dependencies[name]; }, loaded, loaded.exports);
  return { service: loaded.exports as typeof import("./server/menu-publication-service"), writes, scopes, permissions };
}

test("비공개 전환은 공개 상태와 두 접수 플래그를 한 번에 저장하고 다른 설정은 보존한다", async () => {
  const f = fixture();
  await f.service.setMenuPublicationStatus(menuId, "draft", true);
  assert.equal(f.writes.length, 1);
  assert.equal(f.writes[0].status, "draft");
  assert.deepEqual(f.writes[0].settings, { appearance: { color: "preserve" }, table_order: { orderEnabled: false, callEnabled: false, customerPhone: "hidden", futurePreference: "preserve" } });
  assert.deepEqual(f.permissions, [[menuId, "menu.publish", "menu_editor_action"]]);
  assert.ok(f.scopes.some(scope => scope[1] === "updated_at" && scope[2] === "v1"));
  assert.ok(f.scopes.some(scope => scope[1] === "status" && scope[2] === "published"));
});

test("재공개는 두 기능 OFF로 시작하고 이미 공개 중인 상태의 재저장은 설정을 건드리지 않는다", async () => {
  const fresh = fixture({ status: "draft" });
  await fresh.service.setMenuPublicationStatus(menuId, "published", false);
  assert.equal((fresh.writes[0].settings as { table_order: { orderEnabled: boolean } }).table_order.orderEnabled, false);
  const same = fixture(); await same.service.setMenuPublicationStatus(menuId, "published", true);
  assert.equal("settings" in same.writes[0], false);
});

test("공개 전 필수 데이터와 다이닝 구조 검증을 우회하지 않는다", async () => {
  for (const options of [{ name: "" }, { slug: "" }, { counts: [0, 1, 1] }, { counts: [1, 0, 1] }, { counts: [1, 1, 0] }, { dining: true, structureValid: false }]) {
    const f = fixture({ ...options, status: "draft" });
    await assert.rejects(f.service.setMenuPublicationStatus(menuId, "published", false)); assert.deepEqual(f.writes, []);
  }
  const dining = fixture({ dining: true, status: "draft" }); await dining.service.setMenuPublicationStatus(menuId, "published", false); assert.equal(dining.writes.length, 1);
});

test("권한·조회 실패·동시 변경·오래된 상태는 공개 상태나 플래그를 변경하지 않는다", async () => {
  for (const options of [{ denied: true }, { readError: true }, { conflict: true }, { status: "draft" }]) {
    const f = fixture(options); await assert.rejects(f.service.setMenuPublicationStatus(menuId, "draft", true)); assert.deepEqual(f.writes, []);
  }
});

test("상태 표현은 비공개·미등록·전체 비활성·조회 실패·권한 없음과 미사용/사용 불가/접수 중을 구분한다", () => {
  const input = { feature: "orders" as const, published: true, enabled: true, settingsKnown: true, runtimeEnabled: true, activeTablesReady: true, registeredTables: 1, canRead: true };
  assert.equal(getOperationReceptionState(input).value, "주문 접수 중");
  assert.equal(getOperationReceptionState({ ...input, enabled: false }).value, "주문 미사용");
  assert.equal(getOperationReceptionState({ ...input, published: false }).reason, "메뉴판 비공개");
  assert.equal(getOperationReceptionState({ ...input, activeTablesReady: false, registeredTables: 0 }).reason, "테이블·키오스크 미등록");
  assert.equal(getOperationReceptionState({ ...input, activeTablesReady: false, registeredTables: 2 }).reason, "사용 중인 테이블·키오스크 없음");
  assert.equal(getOperationReceptionState({ ...input, activeTablesReady: null }).value, "상태 확인 불가");
  assert.equal(getOperationReceptionState({ ...input, settingsKnown: false }).value, "상태 확인 불가");
  assert.equal(getOperationReceptionState({ ...input, canRead: false }).reason, "권한 없음");
});

test("주문·호출 미사용은 준비된 상태의 OFF만 뜻하며 공개/테이블/기능 제약은 사용 불가다", () => {
  for (const feature of ["orders", "calls"] as const) {
    const label = feature === "orders" ? "주문" : "호출";
    const ready = { feature, published: true, enabled: false, settingsKnown: true, runtimeEnabled: true, activeTablesReady: true, registeredTables: 1, canRead: true };
    assert.equal(getOperationReceptionState(ready).value, `${label} 미사용`);
    assert.equal(getOperationReceptionState({ ...ready, enabled: true }).value, `${label} 접수 중`);
    for (const enabled of [false, true]) {
      for (const restriction of [{ published: false }, { activeTablesReady: false, registeredTables: 0 }, { activeTablesReady: false, registeredTables: 2 }, { runtimeEnabled: false }]) {
        const state = getOperationReceptionState({ ...ready, enabled, ...restriction });
        assert.equal(state.value, `${label} 사용 불가`); assert.equal(state.accepting, false); assert.ok(state.reason);
      }
    }
    assert.equal(getOperationReceptionState({ ...ready, published: false, settingsKnown: false, activeTablesReady: null }).value, `${label} 사용 불가`);
    assert.equal(getOperationReceptionState({ ...ready, settingsKnown: false }).value, "상태 확인 불가");
    assert.equal(getOperationReceptionState({ ...ready, canRead: false }).value, "확인 불가");
  }
});
