import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import OperationFeatureNavigation from "../components/mypage/OperationFeatureNavigation";

function readSource(relativePath: string) {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

test("호출 운영 화면은 설정과 내역을 분리하고 실무 필터를 제공한다", () => {
  const source = readSource("app/mypage/menus/[menuId]/calls/CallDashboard.tsx");

  assert.match(source, /호출 내역/);
  const navigation = renderToStaticMarkup(createElement(OperationFeatureNavigation, { menuId: "menu-1", feature: "calls", settings: false, historyAvailable: true, canConfigure: true }));
  const settings = readSource("app/mypage/menus/[menuId]/calls/settings/page.tsx");
  assert.match(navigation, /호출 설정/);
  assert.match(settings, /<CallItemManager/);
  assert.doesNotMatch(source, /<CallItemManager/);
  assert.match(source, /테이블·요청·처리자 검색/);
  assert.match(source, /미처리만/);
  assert.match(source, /모든 처리자/);
  assert.match(source, /type="date"/);
});

test("호출 이력은 접수·확인·완료 시각과 담당자를 함께 표시한다", () => {
  const dashboard = readSource("app/mypage/menus/[menuId]/calls/CallDashboard.tsx");
  const service = readSource("lib/server/call-management-service.ts");

  assert.match(dashboard, /acknowledgedByLabel/);
  assert.match(dashboard, /completedByLabel/);
  assert.match(dashboard, /formatKoreanDateTime\(call\.acknowledgedAt\)/);
  assert.match(dashboard, /formatKoreanDateTime\(call\.completedAt\)/);
  assert.match(service, /menu_site_invitations/);
  assert.match(service, /invitation\.email_normalized/);
});

test("운영 미연결 사장은 설정만 열고 주문 직원에게 사장 전용 설정 링크를 제공하지 않는다", () => {
  const offline = renderToStaticMarkup(createElement(OperationFeatureNavigation, { menuId: "menu-1", feature: "orders", settings: true, historyAvailable: false, canConfigure: true }));
  assert.match(offline, /연결 전/);
  assert.doesNotMatch(offline, /href="\/mypage\/menus\/menu-1\/orders"/);
  assert.match(offline, /href="\/mypage\/menus\/menu-1\/orders\/settings"/);
  const staff = renderToStaticMarkup(createElement(OperationFeatureNavigation, { menuId: "menu-1", feature: "orders", historyAvailable: true, canConfigure: false }));
  assert.doesNotMatch(staff, /href="\/mypage\/menus\/menu-1\/orders\/settings"/);
});

test("새 호출은 화면에 항상 알리고 선택 시 브라우저 알림과 소리를 함께 사용한다", () => {
  const component = readSource("components/mypage/OperationalArrivalAlert.tsx");
  const policy = readSource("lib/dashboard-arrival-alerts.ts");

  assert.match(component, /AudioContext/);
  assert.match(component, /알림·소리 켜기/);
  assert.match(component, /보고 있는 화면에 항상 표시합니다/);
  assert.doesNotMatch(policy, /!pageHasAttention/);
});
