import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const mypageSource = readFileSync(new URL("../app/mypage/page.tsx", import.meta.url), "utf8");
const accessServiceSource = readFileSync(new URL("./server/menu-site-access-service.ts", import.meta.url), "utf8");

test("복구 기간이 끝난 메뉴판은 고객 화면에서 종료됨으로 안내한다", () => {
  assert.match(mypageSource, /pending_delete: "종료됨"/);
  assert.match(mypageSource, />\s*종료됨\s*</);
  assert.match(mypageSource, /종료된 메뉴판이 없습니다/);
  assert.match(accessServiceSource, /statusLabel: "종료됨"/);
});

test("메뉴판 상태 탭에는 과격한 삭제됨 명칭을 노출하지 않는다", () => {
  assert.doesNotMatch(mypageSource, /pending_delete: "삭제됨"/);
  assert.doesNotMatch(mypageSource, />\s*삭제됨\s*</);
  assert.doesNotMatch(accessServiceSource, /statusLabel: "삭제됨"/);
});
