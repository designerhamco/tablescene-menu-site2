import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import * as announcements from "./announcements";

function fixture(failed = false) {
  const post = (id: string, published_at: string, pinned = false, status = "published") => ({ id, title: id, published_at, pinned, status, category: "update" });
  const rows = [post("old-pinned", "2000-01-01T00:00:00Z", true), post("a", "2000-01-02T00:00:00Z"), post("b", "2000-01-03T00:00:00Z"), post("c", "2000-01-04T00:00:00Z"), post("d", "2000-01-04T00:00:00Z"), post("future", "2999-01-01T00:00:00Z", true), post("draft", "2000-01-05T00:00:00Z", false, "draft")];
  const output = ts.transpileModule(readFileSync(new URL("./server/announcement-service.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const dependencies: Record<string, unknown> = {
    "server-only": {},
    "@/lib/announcements": announcements,
    "@/lib/supabase/server": { createClient: () => ({ from(table: string) {
      assert.equal(table, "support_announcements");
      let filtered = [...rows];
      const orders: { column: keyof typeof rows[number]; ascending: boolean }[] = [];
      return {
        select() { return this; },
        eq(column: keyof typeof rows[number], value: unknown) { filtered = filtered.filter(row => row[column] === value); return this; },
        lte(column: "published_at", value: string) { filtered = filtered.filter(row => Date.parse(row[column]) <= Date.parse(value)); return this; },
        order(column: keyof typeof rows[number], { ascending }: { ascending: boolean }) { orders.push({ column, ascending }); return this; },
        async range(start: number, end: number) {
          const sorted = filtered.sort((a, b) => {
            for (const { column, ascending } of orders) {
              const comparison = a[column] < b[column] ? -1 : a[column] > b[column] ? 1 : 0;
              if (comparison) return ascending ? comparison : -comparison;
            }
            return 0;
          });
          return { data: sorted.slice(start, end + 1), error: failed ? { code: "unavailable" } : null, count: filtered.length };
        },
      };
    } }) },
  };
  const loaded = { exports: {} };
  new Function("require", "module", "exports", "console", output)((name: string) => { assert.ok(name in dependencies, name); return dependencies[name]; }, loaded, loaded.exports, { error() {} });
  return loaded.exports as typeof import("./server/announcement-service");
}

test("최신 공지 미리보기는 고정 여부보다 게시일을 우선하고 공개된 현재 공지만 최대 3개 반환한다", async () => {
  const result = await fixture().getPublishedAnnouncements({ latest: true, page: 100 });
  assert.deepEqual(result.items.map(item => item.id), ["d", "c", "b"]);
  assert.equal(result.count, 5);
  assert.equal(result.unavailable, false);
});

test("전체 공지 목록은 기존 고정 우선 정렬과 페이지 범위를 유지한다", async () => {
  const service = fixture();
  assert.deepEqual((await service.getPublishedAnnouncements()).items.map(item => item.id), ["old-pinned", "d", "c", "b", "a"]);
  assert.deepEqual((await service.getPublishedAnnouncements({ page: 2 })).items, []);
});

test("최신 공지 조회 실패에서는 데이터 대신 오류 상태를 반환한다", async () => {
  assert.deepEqual(await fixture(true).getPublishedAnnouncements({ latest: true }), { items: [], count: 0, unavailable: true });
});
