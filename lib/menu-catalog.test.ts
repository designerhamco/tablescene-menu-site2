import assert from "node:assert/strict";
import test from "node:test";

import {
  canImportIntoMenuCatalogTarget,
  getMenuCatalogImportModeDescription,
  getMenuCatalogImportResultMessage,
  isMenuCatalogImportMode,
  MENU_CATALOG_LINKED_SHARED_FIELDS,
  MENU_CATALOG_MENU_SPECIFIC_FIELDS,
} from "./menu-catalog";

test("catalog import mode is fail closed", () => {
  assert.equal(isMenuCatalogImportMode("linked"), true);
  assert.equal(isMenuCatalogImportMode("independent"), true);
  assert.equal(isMenuCatalogImportMode("shared"), false);
  assert.equal(isMenuCatalogImportMode(null), false);
});

test("catalog import only replaces draft targets", () => {
  assert.equal(canImportIntoMenuCatalogTarget("draft"), true);
  assert.equal(canImportIntoMenuCatalogTarget("published"), false);
  assert.equal(canImportIntoMenuCatalogTarget("archived"), false);
  assert.equal(canImportIntoMenuCatalogTarget(null), false);
});

test("linked copy contract separates common menu copy from channel settings", () => {
  assert.ok(MENU_CATALOG_LINKED_SHARED_FIELDS.includes("메뉴명과 설명"));
  assert.ok(MENU_CATALOG_LINKED_SHARED_FIELDS.includes("품절 상태"));
  assert.ok(MENU_CATALOG_MENU_SPECIFIC_FIELDS.includes("메뉴 추가·삭제, 페이지 구성과 메뉴 배치"));
  assert.ok(MENU_CATALOG_MENU_SPECIFIC_FIELDS.includes("타임세일과 위젯"));
  assert.match(getMenuCatalogImportModeDescription("linked"), /배치와 디자인은 각각 유지/);
});

test("catalog import result copy is deterministic", () => {
  assert.equal(
    getMenuCatalogImportResultMessage({ mode: "linked", itemCount: 12 }),
    "메뉴 12개를 가져오고 공통 메뉴 연결을 시작했습니다.",
  );
  assert.equal(
    getMenuCatalogImportResultMessage({ mode: "independent", itemCount: Number.NaN }),
    "메뉴 0개를 독립 복사본으로 가져왔습니다.",
  );
});
