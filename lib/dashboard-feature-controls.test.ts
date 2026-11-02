import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { MetricCard } from "../app/components/ui/data-display";
import { isUuid } from "./postpay-order-runtime";

const id = "11111111-1111-4111-8111-111111111111";
function fixture(failed = false) {
  const calls: unknown[][] = [];
  const paths: unknown[][] = [];
  const dependencies: Record<string, unknown> = {
    "next/cache": { revalidatePath: (...args: unknown[]) => paths.push(args) },
    "@/lib/postpay-order-runtime": { isUuid },
    "@/lib/server/menu-order-settings-service": { setMenuOrderFeatureEnabled: async (...args: unknown[]) => {
      calls.push(args);
      if (failed) throw new Error("활성 테이블을 먼저 준비해 주세요.");
    } },
  };
  const code = ts.transpileModule(readFileSync(new URL("../app/mypage/operations/actions.ts", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const loaded = { exports: {} };
  new Function("require", "module", "exports", code)((name: string) => {
    assert.ok(name in dependencies, name); return dependencies[name];
  }, loaded, loaded.exports);
  return { action: (loaded.exports as typeof import("../app/mypage/operations/actions")).updateOperationFeature, calls, paths };
}

test("빠른 설정은 두 기능의 단일 변경만 전달하고 대시보드·상세 설정·메뉴판을 갱신한다", async () => {
  for (const feature of ["orders", "calls"] as const) {
    const f = fixture();
    assert.equal((await f.action({ menuId: id, feature, enabled: true, expectedEnabled: false })).status, "success");
    assert.deepEqual(f.calls, [[id, feature, true, false]]);
    assert.ok(f.paths.some(path => path[0] === "/mypage/operations"));
    assert.ok(f.paths.some(path => path[0] === `/mypage/menus/${id}/orders/settings`));
    assert.ok(f.paths.some(path => path[0] === `/mypage/menus/${id}/calls/settings`));
    assert.ok(f.paths.some(path => path[0] === "/menu" && path[1] === "layout"));
  }
});

test("대기번호·잘못된 입력은 저장하지 않으며 실패를 성공으로 표시하지 않는다", async () => {
  const f = fixture();
  const input = { menuId: id, feature: "orders" as const, enabled: true, expectedEnabled: false };
  for (const invalid of [null, { ...input, menuId: "invalid" }, { ...input, feature: "pickup" }, { ...input, enabled: "true" }, { ...input, expectedEnabled: undefined }]) {
    assert.equal((await f.action(invalid as never)).status, "error");
  }
  assert.equal(f.calls.length, 0);
  const failed = fixture(true);
  const result = await failed.action(input);
  assert.equal(result.status, "error");
  assert.match(result.message, /활성 테이블/);
  assert.deepEqual(failed.paths, [["/mypage/operations"]]);
});

test("요약 카드 링크 안에 스위치 버튼을 중첩하지 않는다", () => {
  const html = renderToStaticMarkup(createElement(MetricCard, {
    label: "진행 중 주문", value: "0건", href: "/orders",
    footer: createElement("button", { role: "switch", "aria-checked": false }, "OFF"),
  }));
  assert.ok(html.indexOf("</a>") < html.indexOf("<button"));
});

test("대시보드는 기능 카드 → 테이블 준비 안내 → 최근 호출 순서를 유지한다", () => {
  const page = readFileSync(new URL("../app/mypage/operations/page.tsx", import.meta.url), "utf8");
  assert.ok(page.indexOf('aria-label="매장 운영 요약"') < page.indexOf("<OperationTableSetupNotice"));
  assert.ok(page.indexOf("<OperationTableSetupNotice") < page.indexOf('title="최근 호출"'));
  const shell = readFileSync(new URL("../components/mypage/StoreOperationsShell.tsx", import.meta.url), "utf8");
  assert.match(shell, /activeSection !== "dashboard"/);
});
