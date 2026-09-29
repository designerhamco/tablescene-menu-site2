import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { DESIGN_MENU_FOCUS_POLICY } from "./product-focus-policy";

function readSource(relativePath: string) {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

test("디자인 메뉴판 집중 정책은 대표 QR만 유지하고 운영 기능을 닫는다", () => {
  assert.deepEqual(DESIGN_MENU_FOCUS_POLICY, {
    representativeQr: true,
    smartCall: false,
    storeOperations: false,
    staffManagement: false,
    tableManagement: false,
    pickupQueue: false,
  });
});

test("비활성 관리 화면은 직접 주소 접근도 MY 메뉴판으로 돌려보낸다", () => {
  for (const path of [
    "app/mypage/operations/page.tsx",
    "app/mypage/staff/page.tsx",
    "app/mypage/menus/[menuId]/tables/page.tsx",
    "app/mypage/menus/[menuId]/calls/page.tsx",
    "app/mypage/menus/[menuId]/orders/page.tsx",
    "app/mypage/menus/[menuId]/sales/page.tsx",
    "app/mypage/menus/[menuId]/pickup/page.tsx",
  ]) {
    const source = readSource(path);
    assert.match(source, /redirect\("\/mypage\?tab=menus"\)/, path);
  }
});

test("직원 초대와 관리 mutation도 중앙 정책으로 차단한다", () => {
  assert.match(readSource("lib/server/staff-invitation-service.ts"), /DESIGN_MENU_FOCUS_POLICY\.staffManagement/);
  assert.match(readSource("app/mypage/staff/actions.ts"), /isStaffManagementAvailable/);
  assert.match(readSource("app/staff/invitations/review/actions.ts"), /isStaffManagementAvailable/);
  assert.match(readSource("app/staff/invitations/accept/route.ts"), /isStaffManagementAvailable/);
});
