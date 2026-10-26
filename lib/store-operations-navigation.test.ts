import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function readSource(relativePath: string) {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

test("매장 운영은 로그인 헤더에서 제공하고 직원 관리는 마이페이지에 연결한다", () => {
  const mypageSource = readSource("app/mypage/page.tsx");
  const sidebarSource = readSource("components/mypage/MypageSidebar.tsx");
  const navbarSource = readSource("app/components/layout/Navbar.tsx");

  assert.doesNotMatch(mypageSource, /href="\/mypage\/operations"/);
  assert.doesNotMatch(sidebarSource, /href="\/mypage\/operations"/);
  assert.match(sidebarSource, /href="\/mypage\/staff"/);
  assert.match(sidebarSource, /DisabledNavigationItem label="직원 관리"/);
  assert.doesNotMatch(sidebarSource, /<ExternalLink/);
  assert.match(navbarSource, /href="\/mypage\/operations"/);
  assert.match(navbarSource, /data-site-header-operations/);
  assert.match(navbarSource, />\s*매장 운영\s*</);
});

test("매장 운영 내비게이션은 승인된 주문을 포함하고 매출은 숨긴다", () => {
  const shellSource = readSource("components/mypage/StoreOperationsShell.tsx");
  const navigationBlock = shellSource.match(/const operationNavigation[\s\S]*?\n];/)?.[0];

  assert.ok(navigationBlock);
  assert.match(navigationBlock, /key: "orders", label: "주문관리", permission: "order.read"/);
  assert.match(shellSource, /selectedSite\?\.operationAccess\[item.key\]/);
  assert.doesNotMatch(navigationBlock, /key: "sales"/);
  assert.match(navigationBlock, /key: "calls"/);
  assert.match(navigationBlock, /key: "tables"/);
  assert.match(navigationBlock, /key: "pickup"/);
});

test("매장 운영 대시보드는 권한이 열린 주문 요약만 불러오고 매출은 숨긴다", () => {
  const dashboardSource = readSource("app/mypage/operations/page.tsx");

  assert.match(dashboardSource, /loadOptionalDashboard\(access.orders, "orders", \(\) => listOrderDashboard/);
  assert.match(dashboardSource, /label="진행 중 주문"/);
  assert.doesNotMatch(dashboardSource, /getSalesSummaryDashboard/);
  assert.doesNotMatch(dashboardSource, />오늘 결제 완료액</);
  assert.doesNotMatch(dashboardSource, /title="최근 주문"/);
  assert.match(dashboardSource, /label="대기 중 호출"/);
  assert.match(dashboardSource, /label="운영 테이블"/);
  assert.match(dashboardSource, /label="활성 대기번호"/);
  assert.match(dashboardSource, /title="최근 호출"/);
  assert.match(dashboardSource, /if \(!isStoreOperationsAvailable\(\)\) redirect\("\/mypage\?tab=menus"\)/);
});

test("매장 운영 화면은 공통 여백·카드·피드백 시스템을 사용한다", () => {
  const shellSource = readSource("components/mypage/StoreOperationsShell.tsx");
  const dashboardSource = readSource("app/mypage/operations/page.tsx");

  assert.match(shellSource, /site-gutter site-page-spacing-compact/);
  assert.match(shellSource, /<NavigationTabs label="운영할 메뉴판 선택"/);
  assert.match(shellSource, /getNavigationClassName\(activeSection === "dashboard"\)/);
  assert.doesNotMatch(shellSource, /shadow-sm/);

  assert.match(dashboardSource, /<MetricCard/);
  assert.match(dashboardSource, /<AnnouncementBar label="권한 안내"/);
  assert.doesNotMatch(dashboardSource, /shadow-sm/);
});
