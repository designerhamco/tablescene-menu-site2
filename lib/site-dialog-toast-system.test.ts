import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const uiSource = readFileSync(new URL("../styles/ui-system.css", import.meta.url), "utf8");
const dialogSource = readFileSync(new URL("../app/components/ui/dialog.tsx", import.meta.url), "utf8");
const alertDialogSource = readFileSync(new URL("../app/components/ui/alert-dialog.tsx", import.meta.url), "utf8");
const sheetSource = readFileSync(new URL("../app/components/ui/sheet.tsx", import.meta.url), "utf8");
const drawerSource = readFileSync(new URL("../app/components/ui/drawer.tsx", import.meta.url), "utf8");
const toasterSource = readFileSync(new URL("../app/components/ui/sonner.tsx", import.meta.url), "utf8");
const aiLauncherSource = readFileSync(new URL("../app/support/chat/AiSupportChatLauncher.tsx", import.meta.url), "utf8");
const accountModalSources = [
  "../components/ai/AiCreditPurchaseModal.tsx",
  "../components/mypage/AccountDeletionPanel.tsx",
  "../components/mypage/BillingHistoryPanel.tsx",
  "../components/mypage/ContactProfileEditor.tsx",
  "../components/mypage/PaymentDetailModal.tsx",
  "../components/mypage/SubscriptionManagementModal.tsx",
].map((path) => readFileSync(new URL(path, import.meta.url), "utf8"));
const editorModalSources = [
  "../components/mypage/menu-editor/AboutDraftSections.tsx",
  "../components/mypage/menu-editor/CoverSampleResetButton.tsx",
  "../components/mypage/menu-editor/ImageUploadField.tsx",
  "../components/mypage/menu-editor/LocalizationSection.tsx",
  "../components/mypage/menu-editor/MenuManagementSection.tsx",
  "../components/mypage/menu-editor/ResetTabActionButton.tsx",
].map((path) => readFileSync(new URL(path, import.meta.url), "utf8"));
const applicationModalSources = [
  "../components/apply/ApplyOrderForm.tsx",
  "../components/consent/ConsentAgreementBox.tsx",
].map((path) => readFileSync(new URL(path, import.meta.url), "utf8"));

test("공통 모달과 패널은 중립선·무그림자 표면을 사용한다", () => {
  assert.match(uiSource, /\.site-dialog,/);
  assert.match(uiSource, /box-shadow: none !important/);
  assert.match(dialogSource, /site-dialog-overlay/);
  assert.match(dialogSource, /site-dialog /);
  assert.match(alertDialogSource, /site-dialog-overlay/);
  assert.match(alertDialogSource, /site-dialog /);
  assert.match(sheetSource, /site-dialog-panel/);
  assert.match(drawerSource, /site-dialog-panel/);
});

test("공통 모달의 제목과 설명은 의미 기반 타이포를 사용한다", () => {
  assert.match(dialogSource, /site-dialog-title/);
  assert.match(dialogSource, /site-dialog-description/);
  assert.match(alertDialogSource, /site-dialog-title/);
  assert.match(alertDialogSource, /site-dialog-description/);
});

test("토스트와 AI 상담 모달은 같은 사이트 표면 체계를 공유한다", () => {
  assert.match(toasterSource, /toast: "site-toast"/);
  assert.match(aiLauncherSource, /site-dialog-overlay/);
  assert.match(aiLauncherSource, /site-dialog site-dialog-sheet/);
});

test("계정·결제 모달도 공통 표면 체계를 사용한다", () => {
  for (const source of accountModalSources) {
    assert.match(source, /site-dialog-overlay/);
    assert.match(source, /site-dialog site-dialog-panel/);
    assert.doesNotMatch(source, /shadow-2xl/);
  }

  assert.doesNotMatch(accountModalSources.join("\n"), /Subscription management/);
});

test("메뉴 편집기의 확인·초기화·AI 모달도 공통 표면 체계를 사용한다", () => {
  for (const source of editorModalSources) {
    assert.match(source, /site-dialog-overlay/);
    assert.match(source, /site-dialog site-dialog-panel/);
    assert.doesNotMatch(source, /fixed inset-0[^\n]*(?:bg-zinc-950|bg-black)/);
  }
});

test("신청·동의 상세 모달도 모바일 시트형 공통 표면을 사용한다", () => {
  for (const source of applicationModalSources) {
    assert.match(source, /site-dialog-overlay/);
    assert.match(source, /site-dialog site-dialog-panel site-dialog-sheet/);
    assert.doesNotMatch(source, /fixed inset-0[^\n]*(?:bg-zinc-950|bg-black)/);
  }
});
