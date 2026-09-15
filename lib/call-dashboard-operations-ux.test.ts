import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function readSource(relativePath: string) {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

test("호출 운영 화면은 설정과 내역을 분리하고 실무 필터를 제공한다", () => {
  const source = readSource("app/mypage/menus/[menuId]/calls/CallDashboard.tsx");

  assert.match(source, /호출 내역/);
  assert.match(source, /호출 관리/);
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

test("새 호출은 화면에 항상 알리고 선택 시 브라우저 알림과 소리를 함께 사용한다", () => {
  const component = readSource("components/mypage/OperationalArrivalAlert.tsx");
  const policy = readSource("lib/dashboard-arrival-alerts.ts");

  assert.match(component, /AudioContext/);
  assert.match(component, /알림·소리 켜기/);
  assert.match(component, /보고 있는 화면에 항상 표시합니다/);
  assert.doesNotMatch(policy, /!pageHasAttention/);
});
