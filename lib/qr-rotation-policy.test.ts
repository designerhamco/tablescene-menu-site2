import assert from "node:assert/strict";
import test from "node:test";
import { canRotateTableQr } from "./qr-rotation-policy";
test("QR 교체는 비공개 또는 일시정지에서만 허용하고 보관·알 수 없는 상태는 거부한다", () => {
  for (const [menu, point, allowed] of [
    ["published", "active", false],
    ["published", "disabled", true],
    ["draft", "active", true],
    ["draft", "disabled", true],
    ["draft", "archived", false],
    ["archived", "disabled", false],
    ["unknown", "disabled", false],
    ["draft", "unknown", false],
  ] as const)
    assert.equal(canRotateTableQr(menu, point), allowed, `${menu}/${point}`);
});

import { readFileSync } from "node:fs";
import ts from "typescript";
import * as rotationPolicy from "./qr-rotation-policy";
import { normalizeMenuTableId } from "./menu-table-validation";
const site = "11111111-1111-4111-8111-111111111111",
  point = "22222222-2222-4222-8222-222222222222";
function fixture({
  menuStatus = "published",
  pointStatus = "active",
  denied = false,
  runtime = true,
  conflict = false,
  readError = false,
} = {}) {
  const writes: unknown[] = [],
    filters: unknown[] = [];
  let reads = 0;
  const db = {
    from(table: string) {
      reads++;
      let mutation = false;
      const q = {
        select() {
          return q;
        },
        eq(key: string, value: unknown) {
          filters.push([table, key, value]);
          return q;
        },
        neq(key: string, value: unknown) {
          filters.push([table, "neq", key, value]);
          return q;
        },
        update(value: unknown) {
          mutation = true;
          writes.push(value);
          return q;
        },
        async maybeSingle() {
          return {
            error: readError ? { code: "error" } : null,
            data:
              table === "menu_sites"
                ? {
                    id: site,
                    slug: "qa",
                    template_key: "cafe_design_a",
                    status: menuStatus,
                  }
                : mutation
                  ? conflict
                    ? null
                    : { id: point, status: pointStatus }
                  : { status: pointStatus },
          };
        },
      };
      return q;
    },
  };
  const access = async () => {
    if (denied) throw new Error("denied");
    return { actorUserId: site };
  };
  const deps: Record<string, unknown> = {
    "server-only": {},
    "@/lib/qr-rotation-policy": rotationPolicy,
    "@/lib/order-point-deletion": {},
    "@/lib/order-point-policy": {},
    "@/lib/menu-table-management": {
      normalizeMenuTableId,
      createMenuTableTokenMaterial: () => ({ tokenHash: "new-hash" }),
      toMenuTableListItem: (value: unknown) => value,
    },
    "@/lib/dining-product-tiers": {
      getDiningTemplateFeatures: () => ({ smartCall: true }),
    },
    "@/lib/server/menu-site-access-service": {
      requireMenuSitePermission: access,
      requireMenuSiteWriteAccess: async () => ({
        context: await access(),
        supabase: db,
      }),
      getMenuSiteAccessStateForMenuSite: async () => ({
        planType: "business_basic",
        canEdit: true,
        canUseWriteActions: true,
      }),
    },
    "@/lib/supabase/admin": { createAdminClient: () => db },
    "@/lib/table-management-runtime": {
      isTableManagementRuntimeEnabledForSite: () => runtime,
    },
  };
  const source = readFileSync(
      new URL("./server/menu-table-management-service.ts", import.meta.url),
      "utf8",
    ),
    output = ts.transpileModule(source, {
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
      loaded.exports as typeof import("./server/menu-table-management-service"),
    writes,
    filters,
    reads: () => reads,
  };
}
test("QR 서버 액션은 활성 공개 테이블·권한 없음·조회 실패에서 토큰을 변경하지 않는다", async () => {
  for (const options of [
    {},
    { denied: true },
    { runtime: false },
    { readError: true },
    { menuStatus: "draft", pointStatus: "archived" },
  ]) {
    const f = fixture(options);
    await assert.rejects(
      f.service.rotateMenuTableToken({ menuSiteId: site, tableId: point }),
    );
    assert.equal(f.writes.length, 0);
  }
  const invalid = fixture();
  await assert.rejects(
    invalid.service.rotateMenuTableToken({
      menuSiteId: "bad-id",
      tableId: point,
    }),
  );
  assert.equal(invalid.reads(), 0);
});
test("QR 서버 교체는 실제 비공개·일시정지 상태와 메뉴판·항목 범위를 재확인한다", async () => {
  for (const options of [
    { menuStatus: "draft" },
    { pointStatus: "disabled" },
  ]) {
    const f = fixture(options);
    await f.service.rotateMenuTableToken({ menuSiteId: site, tableId: point });
    assert.equal(f.writes.length, 1);
    for (const filter of [
      ["menu_tables", "menu_site_id", site],
      ["menu_tables", "id", point],
      ["menu_tables", "status", options.pointStatus ?? "active"],
    ])
      assert.ok(
        f.filters.some(
          (value) => JSON.stringify(value) === JSON.stringify(filter),
        ),
      );
  }
  const conflict = fixture({ pointStatus: "disabled", conflict: true });
  await assert.rejects(
    conflict.service.rotateMenuTableToken({ menuSiteId: site, tableId: point }),
  );
});
