import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function readSource(relativePath: string) {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

test("공통 액션 피드백은 현재 viewport의 Sonner 토스트로 표시한다", () => {
  const source = readSource("components/ui/ActionFeedbackToast.tsx");

  assert.match(source, /toast\[tone\]\(message/);
  assert.match(source, /duration: 4_500/);
  assert.match(source, /Object\.is\(lastEventKeyRef\.current, nextEventKey\)/);
});

test("매장 운영·직원 액션은 기존 인라인 안내와 토스트를 병행한다", () => {
  const actionSurfaces = [
    "app/mypage/menus/[menuId]/tables/MenuTableManager.tsx",
    "app/mypage/menus/[menuId]/calls/CallDashboard.tsx",
    "app/mypage/menus/[menuId]/calls/CallItemManager.tsx",
    "app/mypage/menus/[menuId]/pickup/PickupQueueDashboard.tsx",
    "app/mypage/staff/StaffInvitationForm.tsx",
  ];

  for (const path of actionSurfaces) {
    const source = readSource(path);
    assert.match(source, /ActionFeedbackToast/);
    assert.match(source, /state\.message|createState\.message|mutationState\.message/);
    assert.match(source, /emerald-/);
  }
});

test("리다이렉트 결과 안내도 상단 박스와 토스트를 함께 유지한다", () => {
  const redirectSurfaces = [
    "app/mypage/page.tsx",
    "app/mypage/staff/page.tsx",
    "app/mypage/menus/[menuId]/import/page.tsx",
    "components/mypage/InquirySection.tsx",
    "app/admin/page.tsx",
    "app/sign-in/page.tsx",
    "app/forgot-password/page.tsx",
  ];

  for (const path of redirectSurfaces) {
    const source = readSource(path);
    assert.match(source, /ActionFeedbackToast/);
    assert.match(source, /bg-emerald/);
  }
});
