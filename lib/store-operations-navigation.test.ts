import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function readSource(relativePath: string) {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

test("마이페이지의 매장 운영 진입점은 두 곳 모두 새 창으로 열린다", () => {
  const mypageSource = readSource("app/mypage/page.tsx");
  const sidebarSource = readSource("components/mypage/MypageSidebar.tsx");

  for (const source of [mypageSource, sidebarSource]) {
    assert.match(source, /href="\/mypage\/operations"/);
    assert.match(source, /target="_blank"/);
    assert.match(source, /rel="noopener noreferrer"/);
    assert.match(source, /<ExternalLink/);
  }
});

test("매장 운영 내비게이션은 주문·매출을 숨기고 현재 운영 기능만 노출한다", () => {
  const shellSource = readSource("components/mypage/StoreOperationsShell.tsx");
  const navigationBlock = shellSource.match(/const operationNavigation[\s\S]*?\n];/)?.[0];

  assert.ok(navigationBlock);
  assert.doesNotMatch(navigationBlock, /key: "orders"/);
  assert.doesNotMatch(navigationBlock, /key: "sales"/);
  assert.match(navigationBlock, /key: "calls"/);
  assert.match(navigationBlock, /key: "tables"/);
  assert.match(navigationBlock, /key: "pickup"/);
});

test("매장 운영 대시보드는 주문·매출 데이터를 불러오거나 표시하지 않는다", () => {
  const dashboardSource = readSource("app/mypage/operations/page.tsx");

  assert.doesNotMatch(dashboardSource, /listOrderDashboard/);
  assert.doesNotMatch(dashboardSource, /getSalesSummaryDashboard/);
  assert.doesNotMatch(dashboardSource, />진행 중 주문</);
  assert.doesNotMatch(dashboardSource, />오늘 결제 완료액</);
  assert.doesNotMatch(dashboardSource, /title="최근 주문"/);
  assert.match(dashboardSource, /label="대기 중 호출"/);
  assert.match(dashboardSource, /label="운영 테이블"/);
  assert.match(dashboardSource, /label="활성 대기번호"/);
  assert.match(dashboardSource, /title="최근 호출"/);
});
