import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { MetricCard } from "../app/components/ui/data-display";
import { OverviewCard, OverviewCardGroup, OverviewCardResponsiveLabel } from "../app/components/ui/overview-card";
import { Button } from "../app/components/ui/button";
import { getOperationReceptionState } from "./operation-reception-state";
import { isUuid } from "./postpay-order-runtime";

const id = "11111111-1111-4111-8111-111111111111";
function fixture(failed = false) {
  const calls: unknown[][] = [];
  const publicationCalls: unknown[][] = [];
  const paths: unknown[][] = [];
  const dependencies: Record<string, unknown> = {
    "@/lib/server/menu-publication-service": { setMenuPublicationStatus: async (...args: unknown[]) => { publicationCalls.push(args); if (failed) throw new Error("다른 화면에서 공개 상태가 변경되었습니다."); return { slug: "test-store" }; } },
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
  const actions = loaded.exports as typeof import("../app/mypage/operations/actions");
  return { action: actions.updateOperationFeature, publication: actions.updateOperationPublication, publicationCalls, calls, paths };
}

test("공개 스위치도 서버 권한·필수 데이터·현재 상태 검증을 거쳐 결과를 확인한 뒤 갱신한다", async () => {
  const f = fixture();
  assert.equal((await f.publication({ menuId: id, published: false, expectedPublished: true })).status, "success");
  assert.deepEqual(f.publicationCalls, [[id, "draft", true]]);
  assert.ok(f.paths.some(path => path[0] === `/mypage/menus/${id}/edit`));
  assert.ok(f.paths.some(path => path[0] === `/mypage/menus/${id}/orders/settings`));
  assert.ok(f.paths.some(path => path[0] === "/mypage/operations"));
  const failed = fixture(true);
  assert.equal((await failed.publication({ menuId: id, published: false, expectedPublished: true })).status, "error");
  assert.deepEqual(failed.paths, [["/mypage/operations"]]);
  const invalid = fixture();
  assert.equal((await invalid.publication({ menuId: "invalid", published: true, expectedPublished: false })).status, "error");
  assert.deepEqual(invalid.publicationCalls, []);
});

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
  const overview = renderToStaticMarkup(createElement(OverviewCard, {
    label: "전체 주문 상태", value: "주문 미사용",
    control: createElement("button", { role: "switch", "aria-checked": false }, "주문 사용"),
    footer: createElement("a", { href: "/orders/settings" }, "주문 설정"),
  }));
  assert.ok(overview.indexOf("</button>") < overview.indexOf("<a "));
  assert.doesNotMatch(overview, /<a [^>]*>[^]*<button/);
});

test("운영 요약의 미등록·비공개·조회 실패·권한 부족에도 보조 상태 칩을 표시하지 않는다", () => {
  const dependencies: Record<string, unknown> = {
    "react/jsx-runtime": jsxRuntime,
    "next/link": { default: ({ children, ...props }: React.ComponentProps<"a">) => createElement("a", props, children) },
    "lucide-react": Object.fromEntries(["Globe", "LayoutGrid", "ShoppingBag", "Bell"].map(name => [name, () => createElement("svg", { "aria-hidden": true, "data-test-icon": name })])),
    "@/app/components/ui/site-arrow": { ArrowRight: () => createElement("svg", { "aria-hidden": true }) },
    "@/app/components/ui/overview-card": { OverviewCard, OverviewCardGroup, OverviewCardResponsiveLabel },
    "@/app/components/ui/button": { Button },
    "@/lib/operation-reception-state": { getOperationReceptionState },
    "./OperationFeatureToggle": { default: () => createElement("button", { role: "switch", "aria-checked": false }) },
  };
  const code = ts.transpileModule(readFileSync(new URL("../components/mypage/OperationStatusCards.tsx", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const loaded = { exports: {} };
  new Function("require", "module", "exports", code)((name: string) => {
    assert.ok(name in dependencies, name); return dependencies[name];
  }, loaded, loaded.exports);
  const Cards = (loaded.exports as typeof import("../components/mypage/OperationStatusCards")).default;
  const base: Parameters<typeof Cards>[0] = {
    menuId: id, published: true, canPublish: true, canConfigure: true,
    permissions: { orders: true, calls: true, tables: true, edit: true },
    historyAccess: { orders: true, calls: true },
    settings: { orderEnabled: false, callEnabled: false },
    runtime: { orders: true, calls: true, tables: true },
    activeTablesReady: false, tableCounts: { registered: 0, active: 0, disabled: 0 }, kioskCounts: { registered: 0, active: 0 },
  };
  const cases = [
    { props: base, status: "주문 사용 불가" },
    { props: { ...base, published: false }, status: "주문 사용 불가" },
    { props: { ...base, tableCounts: { registered: 1, active: 0, disabled: 1 } }, status: "주문 사용 불가" },
    { props: { ...base, settings: null, activeTablesReady: null, tableCounts: null }, status: "상태 확인 불가" },
    { props: { ...base, permissions: { orders: false, calls: false, tables: false, edit: true } }, status: "확인 불가" },
    { props: { ...base, activeTablesReady: true }, status: "주문 미사용" },
    { props: { ...base, activeTablesReady: true, settings: { orderEnabled: true, callEnabled: true } }, status: "주문 접수 중" },
  ];
  for (const { props, status } of cases) {
    const html = renderToStaticMarkup(createElement(Cards, props));
    assert.ok(html.includes(status), status);
    assert.doesNotMatch(html, /data-slot="badge"|class="[^"]*\bsite-chip\b/);
    assert.doesNotMatch(html, /테이블·키오스크 미등록|메뉴판 비공개|사용 중인 테이블·키오스크 없음/);
    assert.match(html, /aria-label="전체 주문 상태 안내"/);
    assert.match(html, /aria-label="전체 호출 상태 안내"/);
    assert.match(html, /aria-label="테이블·키오스크 등록 안내"/);
    assert.doesNotMatch(html, /href="[^"]*\/kiosks/);
    for (const name of ["Globe", "LayoutGrid", "ShoppingBag", "Bell"]) assert.ok(html.includes(`data-test-icon="${name}"`));
    assert.equal((html.match(/data-component="overview-card"/g) ?? []).length, 4);
    if (props.permissions.tables) assert.ok(html.includes(`href="/mypage/menus/${id}/tables"`));
    assert.ok(html.includes(`/mypage/menus/${id}/edit?tab=publish`));
  }
});

test("대시보드는 전체 현황과 준비 안내를 보여주고 기기 연결 관리는 각 기능 설정에 모은다", () => {
  const page = readFileSync(new URL("../app/mypage/operations/page.tsx", import.meta.url), "utf8");
  assert.ok(page.indexOf('aria-label="주문·호출 사용 여부"') < page.indexOf("<OperationTableSetupNotice"));
  assert.ok(page.indexOf("<OperationTableSetupNotice") < page.indexOf("<OperationStatusCards"));
  assert.doesNotMatch(page, /CurrentTabletConnectionPanel|getCurrentTableTerminalId/);
  assert.ok(page.indexOf('aria-label="매장 운영 요약"') < page.indexOf('title="최근 호출 내역"'));
  assert.doesNotMatch(page, /OperationTerminalPanel|unregister-terminal/);
  const shell = readFileSync(new URL("../components/mypage/StoreOperationsShell.tsx", import.meta.url), "utf8");
  assert.match(shell, /activeSection !== "dashboard"/);
});
