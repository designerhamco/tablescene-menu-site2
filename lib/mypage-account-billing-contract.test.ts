import { readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const sidebarSource = readFileSync(new URL("../components/mypage/MypageSidebar.tsx", import.meta.url), "utf8");
const billingPanelSource = readFileSync(new URL("../components/mypage/BillingHistoryPanel.tsx", import.meta.url), "utf8");
const mypageSource = readFileSync(new URL("../app/mypage/page.tsx", import.meta.url), "utf8");

test("mypage account card keeps long email contained and presents AI balance without promotional emphasis", () => {
  assert.match(sidebarSource, /min-w-0 truncate/);
  assert.match(sidebarSource, /AI 충전\/사용내역/);
  assert.doesNotMatch(sidebarSource, /사용자 ID:/);
  assert.doesNotMatch(sidebarSource, /bg-emerald-50/);
  assert.doesNotMatch(sidebarSource, /설명 작성, 메뉴 정리, 번역에 사용할 수 있어요/);
});

test("billing filters use the current product names and do not expose a legacy trial filter", () => {
  assert.match(billingPanelSource, /아티메뉴 다이닝/);
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
