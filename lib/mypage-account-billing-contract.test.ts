import { readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const sidebarSource = readFileSync(new URL("../components/mypage/MypageSidebar.tsx", import.meta.url), "utf8");
const navigationRailSource = readFileSync(new URL("../components/mypage/MypageNavigationRail.tsx", import.meta.url), "utf8");
const billingPanelSource = readFileSync(new URL("../components/mypage/BillingHistoryPanel.tsx", import.meta.url), "utf8");
const mypageSource = readFileSync(new URL("../app/mypage/page.tsx", import.meta.url), "utf8");
const siteDesignSource = readFileSync(new URL("../styles/site-design.css", import.meta.url), "utf8");

test("My Menu restores its account summary above desktop and tablet navigation", () => {
  const operations = readFileSync(new URL("../components/mypage/StoreOperationsShell.tsx", import.meta.url), "utf8");
  const staff = readFileSync(new URL("../app/mypage/staff/page.tsx", import.meta.url), "utf8");
  const menu = readFileSync(new URL("../components/account/AccountMenuPanel.tsx", import.meta.url), "utf8");
  for (const source of [operations, staff]) assert.doesNotMatch(source, /MypageAccountCard/);
  assert.match(mypageSource, /activeTab === "menus" \? \(\s*<MypageAccountCard[\s\S]*?<MypageNavigation/);
  assert.match(mypageSource, /aiCredits=\{canShowOwnerCommerce \?/);
  assert.match(mypageSource, /from\("menu_site_members"\)\.select\("user_id"\)\s*\.in\("menu_site_id", menuSiteIds\)\.eq\("status", "active"\)/);
  assert.match(sidebarSource, /<ContentPanel surface="muted"[^>]+data-mypage-account-summary/);
  assert.match(siteDesignSource, /@media \(max-width: 767px\) \{\s*\.site-content-panel\[data-mypage-account-summary\] \{ display: none; \}/);
  assert.match(menu, /account\.name/);
  assert.match(menu, /account\.email/);
  assert.match(menu, /AI 크레딧/);
  assert.match(menu, /billingTab=ai-credits/);
  assert.match(menu, /직원 계정/);
  assert.match(sidebarSource, /<MypageNavigationRail/);
});

test("mypage navigation uses a sticky phone rail and a shared wider-screen sidebar", () => {
  assert.match(sidebarSource, /<MypageNavigationRail activeKey=\{active\}>/);
  assert.match(navigationRailSource, /querySelector<HTMLElement>\('\[aria-current="page"\]'\)/);
  assert.match(navigationRailSource, /nav\.scrollLeft \+= hiddenAtEnd/);
  assert.match(navigationRailSource, /hasMoreAtEnd/);
  assert.match(navigationRailSource, /moreLabel = "다음 마이페이지 메뉴 보기"/);
  assert.match(navigationRailSource, /aria-label=\{moreLabel\}/);
  assert.match(navigationRailSource, /nav\.scrollBy/);
  assert.match(siteDesignSource, /\.site-account-sidebar \{ display: contents; \}/);
  assert.match(siteDesignSource, /\.site-account-summary \{[\s\S]*?border: 0[\s\S]*?background: var\(--ui-surface-muted\)/);
  assert.match(siteDesignSource, /\.site-account-nav-shell \{[\s\S]*?position: sticky/);
  assert.match(siteDesignSource, /\.site-account-nav \{[\s\S]*?flex-wrap: nowrap[\s\S]*?overflow-x: auto/);
  assert.match(siteDesignSource, /\.site-account-nav-shell\[data-has-more="true"\]::after \{[\s\S]*?linear-gradient/);
  assert.match(siteDesignSource, /@media \(min-width: 768px\) \{[\s\S]*?\.site-account-layout > \.site-account-sidebar \{ grid-area: sidebar; position: sticky; top: calc\(var\(--site-header-height\) \+ var\(--site-detail-heading-top\)\); display: grid/);
  assert.match(siteDesignSource, /grid-template-areas: "sidebar heading" "sidebar content";/);
  assert.match(siteDesignSource, /row-gap: var\(--site-page-intro-content-gap\);/);
  const globalStyles = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  const detailStyles = readFileSync(new URL("../components/templates/template-detail.module.css", import.meta.url), "utf8");
  assert.match(globalStyles, /@media \(min-width: 768px\) \{\s*\.site-page-spacing-compact:has\(> \.site-container > \.site-account-layout\) \{\s*padding-block-start: var\(--site-detail-heading-top\)/);
  assert.match(detailStyles, /padding-block: var\(--site-detail-heading-top\) 5rem/);
  assert.match(siteDesignSource, /\.site-account-nav-shell \{ position: static; \}/);
  assert.match(siteDesignSource, /\.site-account-nav \{ flex-direction: column; gap: \.375rem; overflow: visible/);
  assert.match(siteDesignSource, /\.site-account-layout \{ grid-template-columns: clamp\(17\.5rem, 20vw, 20rem\) minmax\(0, 1fr\); column-gap: var\(--site-space-content\); \}/);
  assert.match(siteDesignSource, /\.site-account-nav \.site-nav-item \{ min-height: 3\.25rem;[\s\S]*?padding: \.75rem 1rem; \}/);
});

test("mypage menu cards use compact shared work panels and keep owner and staff actions", () => {
  const card = readFileSync(new URL("../components/mypage/MenuSummaryCard.tsx", import.meta.url), "utf8");
  const list = readFileSync(new URL("../components/mypage/MenuCardList.tsx", import.meta.url), "utf8");
  assert.match(card, /<ContentPanel as="article" aria-labelledby=/);
  assert.match(card, /className="site-menu-card"/);
  assert.match(card, /className="site-menu-card-media"/);
  assert.doesNotMatch(card, /site-menu-card-meta|이용 기간 종료일|복구 기한/);
  assert.match(mypageSource, /<MenuRecoveryGuide menuName=\{card.title\} deadlineLabel=\{card.recoveryDeadlineLabel\}/);
  assert.match(mypageSource, /className="site-button site-button-outline">결제내역<\/Link>/);
  assert.match(card, /supportingDetails.map/);
  assert.doesNotMatch(card, /publicPath|MenuLinkCopyButton/);
  assert.match(card, /className="site-action-row site-menu-card-actions"/);
  assert.match(list, /className="site-menu-card-list"/);
  assert.match(list, /getMenuCardPage\(cards, query, requestedPage, filters\)/);
  assert.match(readFileSync(new URL("../lib/menu-card-pagination.ts", import.meta.url), "utf8"), /matchesMenuName\(card.title, query\)/);
  assert.match(mypageSource, /content: renderMenuCard\(card\)/);
  assert.match(mypageSource, /content: renderStaffMenuCard\(card\)/);
  assert.match(mypageSource, /card.section === "deleted" \? undefined/);
  assert.match(mypageSource, /billingQuery: publicPath.startsWith/);
  assert.match(siteDesignSource, /aspect-ratio: 4 \/ 3/);
  assert.doesNotMatch(siteDesignSource, /\.site-menu-card-actions \{[^}]*border-left/);
});

test("billing filters use the current product names and do not expose a legacy trial filter", () => {
  assert.match(billingPanelSource, /value: "basic", label: "베이직"/);
  assert.match(billingPanelSource, /value: "dining", label: "다이닝"/);
  assert.match(billingPanelSource, /value: "display", label: "디스플레이"/);
  assert.doesNotMatch(billingPanelSource, /value: "trial", label: "체험 결제"/);
  assert.match(billingPanelSource, /이전 체험 상품/);
});

test("AI history loads and renders credit usage as well as purchases", () => {
  assert.match(mypageSource, /transaction_type, credit_source, feature_key/);
  assert.doesNotMatch(mypageSource, /\.eq\("transaction_type" as never, "purchase" as never\)/);
  assert.match(mypageSource, /AI 메뉴 설명 작성/);
  assert.match(mypageSource, /AI 전체 번역/);
  assert.match(mypageSource, /AI 크레딧 충전\/사용 내역/);
  assert.match(mypageSource, /사용 후 잔여/);
});


test("staff management keeps account metrics in the shared header API", () => {
  const source = readFileSync(new URL("../app/mypage/staff/page.tsx", import.meta.url), "utf8");
  const navigation = readFileSync(new URL("../app/api/account/navigation/route.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /MypageAccountCard/);
  assert.match(source, /<MypageNavigation/);
  assert.match(navigation, /getAiCreditBalanceForUser\(user.id\)/);
  assert.match(navigation, /staffCount = new Set/);
});

test("기존 변경 예약만 관리 버튼 다음의 독립 창으로 연다", () => {
  const management = readFileSync(new URL("../components/mypage/SubscriptionManagementModal.tsx", import.meta.url), "utf8");
  const modal = readFileSync(new URL("../components/mypage/MenuPlanChangeModal.tsx", import.meta.url), "utf8");
  assert.match(mypageSource, /getMenuPlanChangeDetail\(admin, subscription.id!, user.id\)/);
  assert.match(mypageSource, /detail\?\.pending/);
  assert.match(management, /canChangePlan && canManage && status === "active" && !cancelAtPeriodEnd && !restoredNotice/);
  assert.doesNotMatch(management, /<MenuPlanChangePanel/);
  assert.match(modal, /<DialogTrigger asChild>/);
  assert.match(modal, /<DialogTitle>기존 변경 예약<\/DialogTitle>/);
  assert.match(modal, /<MenuPlanChangePanel subscriptionId=\{subscriptionId\}/);
});
