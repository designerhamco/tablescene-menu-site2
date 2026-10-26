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
  assert.match(siteDesignSource, /\.site-account-sidebar \{ display: contents; \}/);
  assert.match(siteDesignSource, /\.site-account-summary \{[\s\S]*?border: 0[\s\S]*?background: var\(--ui-surface-muted\)/);
  assert.match(siteDesignSource, /\.site-account-nav \{[\s\S]*?position: sticky[\s\S]*?flex-wrap: nowrap[\s\S]*?overflow-x: auto/);
  assert.match(siteDesignSource, /@media \(min-width: 1024px\) \{[\s\S]*?\.site-account-sidebar \{ position: sticky; top: 7rem; display: grid/);
  assert.match(siteDesignSource, /\.site-account-nav \{ position: static; flex-direction: column; gap: \.375rem; overflow: visible/);
  assert.match(siteDesignSource, /\.site-account-layout \{ grid-template-columns: clamp\(17\.5rem, 20vw, 20rem\) minmax\(0, 1fr\); gap: 2rem; \}/);
  assert.match(siteDesignSource, /\.site-account-nav \.site-nav-item \{ min-height: 3\.25rem;[\s\S]*?padding: \.75rem 1rem; \}/);
});

test("mypage menu cards use the shared gallery layout on PC and tablet", () => {
  assert.match(mypageSource, /className="site-card site-menu-card"/);
  assert.match(mypageSource, /className="site-menu-card-media"/);
  assert.match(mypageSource, /className="site-menu-card-meta"/);
  assert.match(siteDesignSource, /\.site-menu-card-media \{[\s\S]*?aspect-ratio: 16 \/ 9/);
  assert.match(siteDesignSource, /\.site-menu-card-meta \{[\s\S]*?background: var\(--ui-surface-muted\)/);
  assert.match(siteDesignSource, /\.site-menu-card-actions \{[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
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
