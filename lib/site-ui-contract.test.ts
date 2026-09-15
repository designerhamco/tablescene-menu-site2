import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const globalsSource = readFileSync(join(projectRoot, "app/globals.css"), "utf8");
const uiSystemSource = readFileSync(join(projectRoot, "styles/ui-system.css"), "utf8");
const buttonSource = readFileSync(join(projectRoot, "app/components/ui/button.tsx"), "utf8");
const cardSource = readFileSync(join(projectRoot, "app/components/ui/card.tsx"), "utf8");

test("사이트 버튼과 카드 시스템은 전역 스타일 진입점에 연결된다", () => {
  assert.match(globalsSource, /@import "\.\.\/styles\/ui-system\.css";/);

  for (const token of [
    "--ui-control-height-sm",
    "--ui-control-height-md",
    "--ui-control-height-lg",
    "--ui-radius-control",
    "--ui-radius-card",
    "--ui-border",
    "--ui-transition",
  ]) {
    assert.match(uiSystemSource, new RegExp(`${token}:`));
  }
});

test("공통 Button과 Card는 의미 기반 사이트 UI 클래스를 사용한다", () => {
  assert.match(buttonSource, /site-button/);
  assert.match(buttonSource, /site-button-primary/);
  assert.match(buttonSource, /site-button-secondary/);
  assert.match(buttonSource, /site-button-danger/);
  assert.match(cardSource, /site-card/);
});

test("메뉴판 고유 디자인은 사이트 버튼과 카드 호환 규칙에서 제외한다", () => {
  assert.match(uiSystemSource, /:not\(\.menu-typography \*\)/);
});

test("사이트 피드백 색상은 성공·주의·오류·정보 의미 토큰으로 통일한다", () => {
  for (const token of [
    "--ui-success-surface",
    "--ui-success-border",
    "--ui-success-text",
    "--ui-warning-surface",
    "--ui-warning-border",
    "--ui-warning-text",
    "--ui-error-surface",
    "--ui-error-border",
    "--ui-error-text",
    "--ui-info-surface",
    "--ui-info-border",
    "--ui-info-text",
  ]) {
    assert.match(uiSystemSource, new RegExp(`${token}:`));
  }

  for (const className of [
    ".site-notice-success",
    ".site-notice-warning",
    ".site-notice-error",
    ".site-notice-info",
  ]) {
    assert.match(uiSystemSource, new RegExp(className.replace(".", "\\.")));
  }

  assert.match(uiSystemSource, /:where\(\.bg-emerald-50, \.bg-emerald-100\):not\(\.menu-typography \*\)/);
  assert.match(uiSystemSource, /:where\(\.bg-amber-50, \.bg-amber-100\):not\(\.menu-typography \*\)/);
  assert.match(uiSystemSource, /:where\(\.bg-red-50, \.bg-red-100\):not\(\.menu-typography \*\)/);
});

test("주요 액션은 확대 모션 대신 색상 피드백을 사용한다", () => {
  for (const path of [
    "app/sign-in/page.tsx",
    "app/reset-password/ResetPasswordForm.tsx",
    "app/forgot-password/RequestPasswordResetForm.tsx",
    "app/auth/recovery/page.tsx",
    "app/find-account/page.tsx",
    "components/auth/OAuthButtons.tsx",
    "components/auth/SignUpAgreementFields.tsx",
  ]) {
    const source = readFileSync(join(projectRoot, path), "utf8");
    assert.doesNotMatch(source, /hover:scale-\[1\.01\]|disabled:hover:scale/);
  }
});
