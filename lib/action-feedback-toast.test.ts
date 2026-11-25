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

test("매장 운영·직원 액션은 단순 성공을 토스트로, 실패 원인은 작업 위치에 표시한다", () => {
  const inlineErrorSurfaces = [
    "app/mypage/menus/[menuId]/calls/CallDashboard.tsx",
    "app/mypage/menus/[menuId]/calls/CallItemManager.tsx",
    "app/mypage/menus/[menuId]/orders/OrderDashboard.tsx",
    "app/mypage/menus/[menuId]/orders/OrderPointDetail.tsx",
    "app/mypage/menus/[menuId]/pickup/PickupQueueDashboard.tsx",
    "app/mypage/staff/StaffInvitationForm.tsx",
  ];
  for (const path of inlineErrorSurfaces) {
    const source = readSource(path);
    assert.match(source, /<ActionFeedbackToast/);
    assert.match(source, /status === "error" && (?:state|createState|feedback)\.message[\s\S]*?role="alert"/);
  }

  const floor = readSource("components/mypage/floor-plan/FloorPlanEditor.tsx");
  assert.match(floor, /<ActionFeedbackToast message=\{feedback\?\.error === false \? feedback.message : undefined\} eventKey=\{feedback\}/);
  assert.match(floor, /feedback\?\.error \? <p[^>]*role="alert"/);
  assert.match(floor, /저장하지 않은 변경사항이 있습니다/);

  const tables = readSource("app/mypage/menus/[menuId]/tables/MenuTableManager.tsx");
  assert.match(tables, /<ActionFeedbackToast message=\{createState\.message\}/);
  assert.match(tables, /<ActionFeedbackToast message=\{mutationState\.message\}/);
  const connection = readSource("components/mypage/OrderPointDeviceConnection.tsx");
  assert.match(connection, /<ActionFeedbackToast message=\{state\.message\}/);
  assert.doesNotMatch(connection, />\{state\.message\}<\/p>/);
});

test("리다이렉트 후 단순 성공은 토스트로 표시하고 계속 읽어야 할 안내를 보존한다", () => {
  const redirectSurfaces = [
    ["app/mypage/page.tsx", "mypageNotice"],
    ["app/mypage/staff/page.tsx", "resultNotice"],
    ["app/mypage/menus/[menuId]/import/page.tsx", "message"],
    ["components/mypage/InquirySection.tsx", "noticeMessage"],
    ["app/admin/page.tsx", "noticeMessage"],
  ];
  for (const [path, message] of redirectSurfaces) {
    const source = readSource(path);
    assert.match(source, /<ActionFeedbackToast/);
    assert.doesNotMatch(source, new RegExp(`site-notice-success[^>]*>\\s*\\{${message}\\}`));
  }

  const announcements = readSource("app/admin/announcements/page.tsx");
  assert.match(announcements, /<ActionFeedbackToast\s+message=\{params.saved === "1" \? "공지사항을 저장했습니다\."/);
  assert.doesNotMatch(announcements, /role="status"[^>]*>\s*공지사항을 저장했습니다/);

  const editor = readSource("app/mypage/menus/[menuId]/edit/page.tsx");
  assert.match(editor, /<MenuEditorToastBridge message=\{bannerMessage\}/);
  assert.doesNotMatch(editor, /<FinalSaveFeedback message=/);
  assert.doesNotMatch(readSource("components/mypage/menu-editor/MenuManagementSection.tsx"), />\s*\{finalSaveMessage\}\s*<\/p>/);

  for (const path of ["app/sign-in/page.tsx", "app/forgot-password/page.tsx"]) {
    const source = readSource(path);
    assert.match(source, /ActionFeedbackToast/);
    assert.match(source, /site-notice-success/);
  }
});

test("Basic editor only shows publication guidance after a successful final save", () => {
  const editor = readSource("app/mypage/menus/[menuId]/edit/page.tsx");
  assert.match(editor, /useBasicEditorLayout && saved === "1" && bannerMessage/);
  assert.match(editor, /canViewPublic[\s\S]+공개 메뉴판에 반영됐어요/);
  assert.match(editor, /site.status === "draft"[\s\S]+공개 설정에서 공개로 바꿔 주세요/);
  assert.doesNotMatch(editor, /새 커버 이미지는 저장 전까지 공개 메뉴판에 반영되지 않습니다/);

  const actions = readSource("app/mypage/menus/actions.ts");
  assert.match(actions, /redirectAfterEditorSave[\s\S]+{ tab, message, saved: true }/);
  const bridge = readSource("components/mypage/menu-editor/MenuEditorToastBridge.tsx");
  assert.match(bridge, /toast.success\(message, { description }\)/);
  assert.match(bridge, /nextParams.delete\("saved"\)/);
});
