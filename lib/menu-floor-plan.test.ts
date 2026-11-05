import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";
import * as floor from "./menu-floor-plan";
import { normalizeMenuTableId } from "./menu-table-validation";
const site = "11111111-1111-4111-8111-111111111111", room = "22222222-2222-4222-8222-222222222222", point = "33333333-3333-4333-8333-333333333333";
const document = () => ({ rooms: [{ id: room, name: "홀", aspectRatio: 1.33 }], placements: [{ pointId: point, roomId: room, x: 10, y: 10, width: 20, height: 16 }] });
test("룸·위치는 상대 좌표로 정규화하고 임의 속성은 저장하지 않는다", () => {
  const input = document(); input.rooms[0].name = " 홀 ";
  assert.deepEqual(floor.normalizeFloorDocument({ ...input, customerToken: "not persisted" }), document());
  assert.deepEqual(floor.retainRegisteredFloorPoints(document(), []).placements, []);
  assert.equal(floor.retainRegisteredFloorPoints(document(), [{ id: point }]).placements.length, 1);
});
test("중복 룸·테이블, 다른 룸, 경계 초과, 비정상 수치와 과도한 입력을 거부한다", () => {
  for (const mutate of [
    (d: ReturnType<typeof document>) => { d.rooms.push({ ...d.rooms[0], id: point }); },
    (d: ReturnType<typeof document>) => { d.placements.push({ ...d.placements[0] }); },
    (d: ReturnType<typeof document>) => { d.placements[0].roomId = point; },
    (d: ReturnType<typeof document>) => { d.placements[0].x = 91; },
    (d: ReturnType<typeof document>) => { d.placements[0].width = NaN; },
    (d: ReturnType<typeof document>) => { d.placements[0].width = 0; },
    (d: ReturnType<typeof document>) => { d.rooms[0].name = "\u0000"; },
  ]) { const d = document(); mutate(d); assert.throws(() => floor.normalizeFloorDocument(d), floor.FloorPlanError); }
  assert.throws(() => floor.normalizeFloorDocument({ rooms: Array(31).fill(document().rooms[0]), placements: [] }));
  assert.throws(() => floor.normalizeFloorDocument({ rooms: [], placements: Array(201).fill(document().placements[0]) }));
});
test("사각형 이동·크기 조절은 룸 경계와 최소 크기를 보존한다", () => {
  for (let n = -200; n <= 200; n += 3) {
    const rect = floor.constrainFloorRect({ x: n, y: 100 - n, width: n / 2, height: 150 - n });
    assert.ok(rect.x >= 0 && rect.y >= 0 && rect.width >= 8 && rect.height >= 8);
    assert.ok(rect.x + rect.width <= 100 && rect.y + rect.height <= 100);
    floor.normalizeFloorDocument({ ...document(), placements: [{ pointId: point, roomId: room, ...rect }] });
  }
});
function fixture({ denied = false, missingSchema = false, stale = false, foreignPoint = false } = {}) {
  let stored: { revision: number; document: unknown } | null = null;
  let writes = 0, calls = 0;
  const gates: string[] = [];
  const db = { from(table: string) {
    calls++;
    const filters: Record<string, unknown> = {};
    let values: Record<string, unknown> | undefined, inserting = false;
    const q = {
      select() { return q; }, eq(k: string, v: unknown) { filters[k] = v; return q; }, in() { return q; },
      insert(v: Record<string, unknown>) { values = v; inserting = true; return q; },
      update(v: Record<string, unknown>) { values = v; return q; },
      async maybeSingle() {
        assert.equal(table, "menu_floor_plans");
        if (missingSchema) return { data: null, error: { code: "PGRST205" } };
        if (!values) return { data: stored, error: null };
        assert.equal(values.menu_site_id ?? filters.menu_site_id, site);
        if (inserting && stored) return { data: null, error: { code: "23505" } };
        if (!inserting && (stale || stored?.revision !== filters.revision)) return { data: null, error: null };
        stored = { revision: values.revision as number, document: values.document }; writes++; return { data: stored, error: null };
      },
      then(resolve: (value: unknown) => void) { assert.equal(table, "menu_tables"); assert.equal(filters.menu_site_id, site); resolve({ data: foreignPoint ? [] : [{ id: point }], error: null }); },
    }; return q;
  } };
  const dependencies = {
    "server-only": {}, "@/lib/menu-floor-plan": floor,
    "@/lib/menu-table-validation": { normalizeMenuTableId },
    "@/lib/server/menu-table-management-service": {
      requireMenuTableReadAccess: async () => { gates.push("read"); if (denied) throw new Error("denied"); return { supabase: db }; },
      requireMenuTableWriteAccess: async () => { gates.push("write"); if (denied) throw new Error("denied"); return { supabase: db, context: { actorUserId: point } }; },
    },
  };
  const source = readFileSync(new URL("./server/menu-floor-plan-service.ts", import.meta.url), "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const loaded = { exports: {} };
  new Function("require", "module", "exports", output)((name: keyof typeof dependencies) => { assert.ok(name in dependencies, name); return dependencies[name]; }, loaded, loaded.exports);
  return { service: loaded.exports as typeof import("./server/menu-floor-plan-service"), gates, writes: () => writes, calls: () => calls };
}
test("배치도 생성·조회·수정은 기존 table.manage 접근 경계를 거치고 버전으로 덮어쓰기를 막는다", async () => {
  const f = fixture();
  assert.deepEqual(await f.service.loadMenuFloorPlan(site), { available: true, revision: 0, document: floor.emptyFloorDocument() });
  const first = await f.service.saveMenuFloorPlan(site, 0, document()); assert.equal(first.revision, 1);
  assert.equal((await f.service.loadMenuFloorPlan(site)).revision, 1);
  assert.equal((await f.service.saveMenuFloorPlan(site, 1, document())).revision, 2);
  await assert.rejects(f.service.saveMenuFloorPlan(site, 1, document()), /다른 화면/);
  await assert.rejects(f.service.saveMenuFloorPlan(site, 0, document()), /다른 화면/);
  assert.equal(f.writes(), 2); assert.deepEqual(f.gates, ["read", "write", "read", "write", "write", "write"]);
});
test("권한 거부·외부 테이블·비정상 버전은 저장하지 않고 스키마 미적용 시 기존 목록을 유지한다", async () => {
  const denied = fixture({ denied: true }); await assert.rejects(denied.service.loadMenuFloorPlan(site), /denied/); await assert.rejects(denied.service.saveMenuFloorPlan(site, 0, document()), /denied/); assert.equal(denied.calls(), 0);
  const foreign = fixture({ foreignPoint: true }); await assert.rejects(foreign.service.saveMenuFloorPlan(site, 0, document()), /다른 메뉴판/); assert.equal(foreign.writes(), 0);
  const f = fixture(); for (const revision of [-1, NaN, "1", 2147483647]) await assert.rejects(f.service.saveMenuFloorPlan(site, revision, document()), /버전/); assert.equal(f.calls(), 0);
  assert.equal((await fixture({ missingSchema: true }).service.loadMenuFloorPlan(site)).available, false);
});

test("룸 이름 자동 저장은 기존 저장 배치와 다른 룸을 보존하고 새 룸도 단독 저장한다", () => {
  const saved = document(), before = structuredClone(saved);
  const renamed = floor.renameSavedFloorRoom(saved, { ...saved.rooms[0], name: "편집 초안", aspectRatio: 1.78 }, " 새 이름 ");
  assert.equal(renamed.rooms[0].name, "새 이름");
  assert.equal(renamed.rooms[0].aspectRatio, saved.rooms[0].aspectRatio);
  assert.deepEqual(renamed.placements, saved.placements);
  assert.deepEqual(saved, before);
  const added = floor.renameSavedFloorRoom(saved, { id: site, name: "새 룸", aspectRatio: 1.33 }, "테라스");
  assert.equal(added.rooms.length, 2); assert.equal(added.rooms[1].name, "테라스");
  assert.deepEqual(added.placements, saved.placements);
  assert.throws(() => floor.renameSavedFloorRoom(added, added.rooms[1], "홀"), floor.FloorPlanError);
  assert.throws(() => floor.renameSavedFloorRoom(saved, saved.rooms[0], " "), floor.FloorPlanError);
});
