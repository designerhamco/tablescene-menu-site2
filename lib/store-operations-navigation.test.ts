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
  const mobileMenuSource = readSource("components/layout/MobileSiteMenu.tsx");
  const operationsLinks = `${navbarSource}\n${mobileMenuSource}`.match(/<Link\s+href="\/mypage\/operations"[\s\S]*?<\/Link>/g) ?? [];
  assert.equal(operationsLinks.length, 2);
  for (const link of operationsLinks) {
    assert.match(link, /target="_blank"/);
    assert.match(link, /rel="noopener noreferrer"/);
    assert.match(link, /<NewWindowIndicator \/>/);
  }
  assert.match(navbarSource, />\s*매장 운영\s*</);
});

test("매장 운영 내비게이션은 주문과 권한에 따른 매출 관리를 제공한다", () => {
  const shellSource = readSource("components/mypage/StoreOperationsShell.tsx");
  const navigationBlock = shellSource.match(/const operationNavigation[\s\S]*?\n];/)?.[0];

  assert.ok(navigationBlock);
  assert.match(navigationBlock, /key: "orders", label: "주문 관리", permission: "order.read"/);
  assert.match(shellSource, /selectedSite\.operationAccess\[item.key\]/);
  assert.match(navigationBlock, /key: "sales", label: "매출 관리", permission: "sales.read"/);
  assert.match(navigationBlock, /key: "calls"/);
  assert.match(navigationBlock, /key: "tables"/);
  assert.match(navigationBlock, /key: "pickup"/);
});

test("매장 운영 대시보드는 권한에 따라 주문·호출 최근 내역과 매출을 불러온다", () => {
  const dashboardSource = readSource("app/mypage/operations/page.tsx");

  assert.match(dashboardSource, /loadOptionalDashboard\(access.orders, "orders", \(\) => listOrderDashboard/);
  assert.match(dashboardSource, /label="진행 중 주문"/);
  assert.match(dashboardSource, /loadOptionalDashboard\(access.sales, "sales", \(\) => getSalesSummaryDashboard/);
  assert.match(dashboardSource, /title="최근 주문 내역"/);
  assert.match(dashboardSource, /label="대기 중 호출"/);
  assert.match(dashboardSource, /label="운영 테이블"/);
  assert.match(dashboardSource, /label="활성 대기번호"/);
  assert.match(dashboardSource, /title="최근 호출 내역"/);
  assert.match(dashboardSource, /if \(!isStoreOperationsAvailable\(\)\) redirect\("\/mypage\?tab=menus"\)/);
});

test("매장 운영 화면은 공통 여백·카드·피드백 시스템을 사용한다", () => {
  const shellSource = readSource("components/mypage/StoreOperationsShell.tsx");
  const dashboardSource = readSource("app/mypage/operations/page.tsx");

  assert.match(shellSource, /site-gutter site-page-spacing-compact/);
  assert.match(shellSource, /<OperationSiteSelector/);
  assert.match(shellSource, /getNavigationClassName\(activeSection === "dashboard"\)/);
  assert.doesNotMatch(shellSource, /shadow-sm/);

  assert.match(dashboardSource, /<MetricCard/);
  assert.match(dashboardSource, /<AnnouncementBar label="권한 안내"/);
  assert.doesNotMatch(dashboardSource, /shadow-sm/);
});
