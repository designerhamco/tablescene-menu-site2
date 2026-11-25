import assert from "node:assert/strict";
import test from "node:test";
import { matchesMenuName } from "./menu-name-search";

test("menu name search handles Korean composition, Latin case and incidental whitespace", () => {
  assert.ok(matchesMenuName("리얼맛차 성수점".normalize("NFD"), "리얼맛차"));
  assert.ok(matchesMenuName("REAL   MATCHA 성수점", "  real matcha  "));
  assert.ok(matchesMenuName("ＲＥＡＬ ＭＡＴＣＨＡ", "real matcha"));
  assert.ok(matchesMenuName("오브 테이블", "  "));
  assert.equal(matchesMenuName("리얼맛차 성수점", "오브 테이블"), false);
});
