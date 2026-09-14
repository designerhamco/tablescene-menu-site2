import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function readSource(relativePath: string) {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

test("마이페이지 메뉴판 카드는 대표 QR 직접 다운로드 대신 QR 관리로 통일한다", () => {
  const source = readSource("app/mypage/page.tsx");

  assert.match(source, /label: "QR 관리"/);
  assert.match(source, /\/mypage\/menus\/\$\{card\.siteId\}\/qr/);
  assert.doesNotMatch(source, /label: card\.actions\.canManageTables \? "QR 관리" : "QR 다운로드"/);
});

test("QR 관리 화면은 대표 QR을 공통 제공하고 테이블 QR은 지원 메뉴판에만 추가한다", () => {
  const pageSource = readSource("app/mypage/menus/[menuId]/qr/page.tsx");
  const serviceSource = readSource("lib/server/menu-qr-management-service.ts");

  assert.match(pageSource, /data\.canManageTables/);
  assert.match(pageSource, /대표 메뉴 QR/);
  assert.match(pageSource, /<MenuTableManager/);
  assert.match(serviceSource, /requireMenuSitePermission\(menuSiteId, "qr\.manage"\)/);
  assert.match(serviceSource, /getDiningTemplateFeatures\(menuSite\.template_key\)\.smartCall/);
  assert.match(serviceSource, /isTableManagementRuntimeEnabledForSite\(menuSiteId\)/);
});

test("QR 주소 복사와 다운로드 결과는 현재 화면의 토스트로 안내한다", () => {
  const source = readSource("components/mypage/QrAddressActions.tsx");

  assert.match(source, /toast\.success/);
  assert.match(source, /toast\.error/);
  assert.match(source, /disabled=\{disabled/);
});
