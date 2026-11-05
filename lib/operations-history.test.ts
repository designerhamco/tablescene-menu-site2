import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";
import {
  groupOperationHistory,
  getHistoryPlacements,
  type OperationHistoryRecord,
  type OperationsFloorPlan,
} from "./operations-history";
import * as floor from "./menu-floor-plan";
import { normalizeMenuTableId } from "./menu-table-validation";
const site = "11111111-1111-4111-8111-111111111111",
  room = "22222222-2222-4222-8222-222222222222",
  point = "33333333-3333-4333-8333-333333333333";
const document = {
  rooms: [{ id: room, name: "홀", aspectRatio: 1.33 }],
  placements: [
    { pointId: point, roomId: room, x: 10, y: 10, width: 20, height: 20 },
  ],
};
test("이름이 같거나 변경되어도 주문·호출은 ID로 묶고 입력 내역 순서를 유지한다", () => {
  const record: OperationHistoryRecord = {
    id: "a",
    pointId: point,
    pointLabel: "테이블 1",
    summary: "라떼 × 2",
    options: "우유: 오트",
    time: "12:30",
    status: "조리 중 · 미결제",
    attention: true,
  };
  const grouped = groupOperationHistory([
    record,
    { ...record, id: "b", pointId: "different" },
    { ...record, id: "c", pointLabel: "수정 이름" },
  ]);
  assert.deepEqual(
    grouped.get(point)?.map((item) => item.id),
    ["a", "c"],
  );
  assert.equal(grouped.size, 2);
});
test("삭제·보관된 항목이나 없는 룸의 배치는 내역을 숨기는 근거로 쓰지 않는다", () => {
  const data: OperationsFloorPlan = {
    available: true,
    revision: 1,
    document,
    points: [{ id: point, label: "테이블 1", status: "active" }],
  };
  assert.equal(getHistoryPlacements(data).length, 1);
  assert.deepEqual(getHistoryPlacements({ ...data, available: false }), []);
  assert.deepEqual(getHistoryPlacements({ ...data, points: [] }), []);
  assert.deepEqual(
    getHistoryPlacements({ ...data, document: { ...document, rooms: [] } }),
    [],
  );
});
function fixture({
  denied = false,
  runtime = true,
  paid = true,
  error = false,
  invalid = false,
} = {}) {
  let reads = 0;
  const permissions: string[] = [];
  const db = {
    from(table: string) {
      reads++;
      const filters: Record<string, unknown> = {};
      let columns = "";
      const result = () => {
        assert.equal(filters.menu_site_id, site);
        assert.doesNotMatch(columns, /token|phone|connection|\*/);
        return {
          error: error ? { code: "PGRST205" } : null,
          data:
            table === "menu_floor_plans"
              ? { revision: 2, document: invalid ? {} : document }
              : [
                  {
                    id: point,
                    label: "테이블 1",
                    point_kind: "table",
                    status: "active",
                    token_hash: "never expose",
                  },
                ],
        };
      };
      const query = {
        select(value: string) {
          columns = value;
          return query;
        },
        eq(key: string, value: unknown) {
          filters[key] = value;
          return query;
        },
        in() {
          return query;
        },
        async maybeSingle() {
          return result();
        },
        then(resolve: (value: unknown) => void) {
          resolve(result());
        },
      };
      return query;
    },
  };
  const deps: Record<string, unknown> = {
    "server-only": {},
    "@/lib/menu-floor-plan": floor,
    "@/lib/menu-table-validation": { normalizeMenuTableId },
    "@/lib/server/menu-site-access-service": {
      requireMenuSitePermission: async (id: string, permission: string) => {
        assert.equal(id, site);
        permissions.push(permission);
        if (denied) throw new Error("denied");
      },
    },
    "@/lib/server/table-operations-eligibility-service": {
      hasPaidTableOperationsAccess: async () => paid,
    },
    "@/lib/order-dashboard-runtime": {
      isOrderDashboardRuntimeEnabledForSite: () => runtime,
    },
    "@/lib/call-runtime": { isCallRuntimeEnabledForSite: () => runtime },
    "@/lib/supabase/admin": { createAdminClient: () => db },
  };
  const source = readFileSync(
    new URL("./server/operations-floor-plan-service.ts", import.meta.url),
    "utf8",
  );
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const loaded = { exports: {} };
  new Function("require", "module", "exports", output)(
    (name: string) => {
      assert.ok(name in deps, name);
      return deps[name];
    },
    loaded,
    loaded.exports,
  );
  return {
    service:
      loaded.exports as typeof import("./server/operations-floor-plan-service"),
    reads: () => reads,
    permissions,
  };
}
test("운영 직원은 기존 주문/호출 권한으로 배치도만 읽으며 table.manage·비밀 자료를 부여하지 않는다", async () => {
  for (const feature of ["orders", "calls"] as const) {
    const f = fixture();
    const value = await f.service.loadOperationsFloorPlan(site, feature);
    assert.equal(value.available, true);
    assert.deepEqual(f.permissions, [
      feature === "orders" ? "order.read" : "call.manage",
    ]);
    assert.equal(f.reads(), 2);
    assert.deepEqual(value.points, [
      { id: point, label: "테이블 1", kind: "table", status: "active" },
    ]);
  }
});
test("권한·런타임·이용권 거부는 DB 조회 전에 중단하고 조회 실패는 목록을 유지한다", async () => {
  const f = fixture({ denied: true });
  await assert.rejects(
    f.service.loadOperationsFloorPlan(site, "orders"),
    /denied/,
  );
  assert.equal(f.reads(), 0);
  for (const options of [{ runtime: false }, { paid: false }]) {
    const item = fixture(options);
    assert.equal(
      (await item.service.loadOperationsFloorPlan(site, "orders")).available,
      false,
    );
    assert.equal(item.reads(), 0);
  }
  for (const options of [{ error: true }, { invalid: true }]) {
    const item = fixture(options);
    const result = await item.service.loadOperationsFloorPlan(site, "calls");
    assert.equal(result.available, false);
    assert.deepEqual(result.document, floor.emptyFloorDocument());
    assert.deepEqual(result.points, []);
  }
});
