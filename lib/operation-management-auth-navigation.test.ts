import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import { MenuSiteAccessError } from "./menu-site-permissions";

const menuId = "11111111-1111-4111-8111-111111111111";

function loadPage(section: "tables" | "qr", context: () => Promise<unknown>) {
  const source = readFileSync(new URL(`../app/mypage/menus/[menuId]/${section}/page.tsx`, import.meta.url), "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const loaded = { exports: {} };
  let privateReads = 0;
  const dependencies: Record<string, unknown> = {
    "react/jsx-runtime": {},
    "next/navigation": {
      redirect(path: string) { throw { redirect: path }; },
      notFound() { throw new Error("Unexpected notFound"); },
    },
    "next/link": {},
    "@/components/mypage/StoreOperationsShell": {},
    "@/components/mypage/RepresentativeQrCard": {},
    "@/lib/menu-site-permissions": { MenuSiteAccessError },
    "@/lib/product-focus-policy": { isStoreOperationsAvailable: () => true },
    "@/lib/server/store-operations-context": { getStoreOperationsContext: context },
    "@/lib/server/menu-table-management-service": {
      MenuTableManagementError: class extends Error {},
      async listMenuTables() { privateReads++; throw new Error("Unexpected table read"); },
    },
    "@/lib/server/menu-qr-management-service": {
      async getMenuQrManagementPageData() { privateReads++; throw new Error("Unexpected QR read"); },
    },
    "./MenuTableManager": {},
    "./MenuTableQrManager": {},
  };
  new Function("require", "module", "exports", output)((name: string) => {
    assert.ok(name in dependencies, `Unmocked dependency: ${name}`);
    return dependencies[name];
  }, loaded, loaded.exports);
  return {
    run: (loaded.exports as { default: (props: { params: Promise<{ menuId: string }> }) => Promise<unknown> }).default,
    getPrivateReads: () => privateReads,
  };
}

for (const section of ["tables", "qr"] as const) {
  test(`${section}: 공용 전환 후 로그아웃 상태의 재진입은 원래 경로를 보존해 로그인으로 이동한다`, async () => {
    const page = loadPage(section, async () => { throw new MenuSiteAccessError("AUTH_REQUIRED", "로그인이 필요합니다.", 401); });
    await assert.rejects(page.run({ params: Promise.resolve({ menuId }) }), (error: unknown) => {
      assert.deepEqual(error, { redirect: `/sign-in?next=${encodeURIComponent(`/mypage/menus/${menuId}/${section}`)}` });
      return true;
    });
    assert.equal(page.getPrivateReads(), 0);
  });

  test(`${section}: 로그인한 계정에 대상 메뉴판 권한이 없으면 운영 화면으로 돌려보낸다`, async () => {
    const page = loadPage(section, async () => ({ sites: [] }));
    await assert.rejects(page.run({ params: Promise.resolve({ menuId }) }), (error: unknown) => {
      assert.deepEqual(error, { redirect: "/mypage/operations" });
      return true;
    });
    assert.equal(page.getPrivateReads(), 0);
  });

  test(`${section}: 인증 이외의 조회 실패를 로그인 이동으로 숨기지 않는다`, async () => {
    const failure = new Error("Context database unavailable");
    const page = loadPage(section, async () => { throw failure; });
    await assert.rejects(page.run({ params: Promise.resolve({ menuId }) }), (error: unknown) => error === failure);
    assert.equal(page.getPrivateReads(), 0);
  });
}
