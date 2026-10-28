import { readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const sidebarSource = readFileSync(new URL("../components/mypage/MypageSidebar.tsx", import.meta.url), "utf8");
const navigationRailSource = readFileSync(new URL("../components/mypage/MypageNavigationRail.tsx", import.meta.url), "utf8");
const billingPanelSource = readFileSync(new URL("../components/mypage/BillingHistoryPanel.tsx", import.meta.url), "utf8");
const mypageSource = readFileSync(new URL("../app/mypage/page.tsx", import.meta.url), "utf8");
const siteDesignSource = readFileSync(new URL("../styles/site-design.css", import.meta.url), "utf8");

test("mypage account card gives business identity and owner metrics a readable hierarchy", () => {
  assert.match(sidebarSource, /businessName/);
  assert.match(sidebarSource, /site-account-business-name/);
  assert.match(sidebarSource, /site-account-email/);
  assert.match(sidebarSource, /site-account-eyebrow/);
  assert.match(sidebarSource, /businessName \|\| "내 계정"/);
  assert.match(sidebarSource, /AI 크레딧/);
  assert.match(sidebarSource, /직원계정/);
  assert.match(sidebarSource, /AI 충전\/사용내역/);
  assert.match(mypageSource, /businessName=\{businessProfile\?\.business_name\}/);
  assert.match(mypageSource, /active_staff_memberships/);
  assert.doesNotMatch(sidebarSource, /사용자 ID:/);
  assert.doesNotMatch(sidebarSource, /bg-emerald-50/);
  assert.doesNotMatch(sidebarSource, /설명 작성, 메뉴 정리, 번역에 사용할 수 있어요/);
});

test("mypage navigation uses separate surfaces and a sticky single-line rail before the desktop sidebar", () => {
  assert.match(sidebarSource, /<MypageNavigationRail activeKey=\{active\}>/);
  assert.match(navigationRailSource, /querySelector<HTMLElement>\('\[aria-current="page"\]'\)/);
  assert.match(navigationRailSource, /nav\.scrollLeft \+= hiddenAtEnd/);
  assert.match(navigationRailSource, /hasMoreAtEnd/);
  assert.match(navigationRailSource, /aria-label="다음 마이페이지 메뉴 보기"/);
  assert.match(navigationRailSource, /nav\.scrollBy/);
  assert.match(siteDesignSource, /\.site-account-sidebar \{ display: contents; \}/);
  assert.match(siteDesignSource, /\.site-account-summary \{[\s\S]*?border: 0[\s\S]*?background: var\(--ui-surface-muted\)/);
  assert.match(siteDesignSource, /\.site-account-nav-shell \{[\s\S]*?position: sticky/);
  assert.match(siteDesignSource, /\.site-account-nav \{[\s\S]*?flex-wrap: nowrap[\s\S]*?overflow-x: auto/);
  assert.match(siteDesignSource, /\.site-account-nav-shell\[data-has-more="true"\]::after \{[\s\S]*?linear-gradient/);
  assert.match(siteDesignSource, /@media \(min-width: 1024px\) \{[\s\S]*?\.site-account-sidebar \{ position: sticky; top: 7rem; display: grid/);
  assert.match(siteDesignSource, /\.site-account-nav-shell \{ position: static; \}/);
  assert.match(siteDesignSource, /\.site-account-nav \{ flex-direction: column; gap: \.375rem; overflow: visible/);
  assert.match(siteDesignSource, /\.site-account-layout \{ grid-template-columns: clamp\(17\.5rem, 20vw, 20rem\) minmax\(0, 1fr\); gap: 2rem; \}/);
  assert.match(siteDesignSource, /\.site-account-nav \.site-nav-item \{ min-height: 3\.25rem;[\s\S]*?padding: \.75rem 1rem; \}/);
});

test("mypage menu cards use the shared gallery layout on PC and tablet", () => {
  assert.match(mypageSource, /className="site-menu-card-list"/);
  assert.match(mypageSource, /className="site-card site-menu-card"/);
  assert.match(mypageSource, /className="site-menu-card-media"/);
  assert.match(mypageSource, /className="site-menu-card-details"/);
  assert.match(mypageSource, /className="site-menu-card-meta"/);
  assert.match(siteDesignSource, /\.site-menu-card-media \{[\s\S]*?aspect-ratio: 16 \/ 9/);
  assert.match(siteDesignSource, /\.site-menu-card-meta \{[\s\S]*?background: var\(--ui-surface-muted\)/);
  assert.match(siteDesignSource, /\.site-menu-card-actions \{[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(siteDesignSource, /@media \(min-width: 768px\) \{[\s\S]*?\.site-menu-card \{[\s\S]*?grid-template-columns: clamp\(13rem, 28vw, 17rem\) minmax\(0, 1fr\)/);
  assert.match(siteDesignSource, /@media \(min-width: 768px\) \{[\s\S]*?\.site-menu-card-actions \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\)/);
  assert.doesNotMatch(mypageSource, /className="grid gap-4 md:grid-cols-2"/);
  assert.doesNotMatch(mypageSource, /<article key=\{card\.key\} className="site-card p-5">/);
});

test("billing filters use the current product names and do not expose a legacy trial filter", () => {
  assert.match(billingPanelSource, /베이직·다이닝/);
  assert.match(billingPanelSource, /아티메뉴 디스플레이/);
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


test("직원 관리에서도 사장 계정 요약의 회사명과 두 지표를 유지한다", () => {
  const source = readFileSync(new URL("../app/mypage/staff/page.tsx", import.meta.url), "utf8");
  assert.match(source, /getAiCreditBalanceForUser\(user.id\)/);
  assert.match(source, /businessName=\{businessProfileResult.data\?\.business_name\}/);
  assert.match(source, /accountAiCreditRemaining=\{accountAiCreditRemaining\}/);
  assert.match(source, /staffAccountCount=\{new Set\(activeMemberships/);
});

test("구독 변경은 서버의 실제 자격 확인 후 관리 버튼 다음의 독립 창으로 연다", () => {
  const management = readFileSync(new URL("../components/mypage/SubscriptionManagementModal.tsx", import.meta.url), "utf8");
  const modal = readFileSync(new URL("../components/mypage/MenuPlanChangeModal.tsx", import.meta.url), "utf8");
  assert.match(mypageSource, /getMenuPlanChangeDetail\(admin, subscription.id!, user.id\)/);
  assert.match(mypageSource, /detail\?\.eligible && detail.pending\?\.state !== "processing"/);
  assert.match(management, /canChangePlan && canManage && status === "active" && !cancelAtPeriodEnd && !restoredNotice/);
  assert.doesNotMatch(management, /<MenuPlanChangePanel/);
  assert.match(modal, /<DialogTrigger asChild>/);
  assert.match(modal, /<DialogTitle>구독 변경<\/DialogTitle>/);
  assert.match(modal, /<MenuPlanChangePanel subscriptionId=\{subscriptionId\}/);
});
