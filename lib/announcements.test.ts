import assert from "node:assert/strict";
import test from "node:test";
import {
  escapeAnnouncementSearch,
  normalizeAnnouncementPage,
  validateAnnouncement,
} from "./announcements";

const valid = {
  title: " 서비스 업데이트 ",
  body: "첫 줄\n둘째 줄",
  category: "update",
  status: "draft",
  pinned: false,
};

test("공지사항은 공백과 길이·유형·상태를 검증하고 본문 줄바꿈을 보존한다", () => {
  assert.deepEqual(validateAnnouncement(valid), {
    ok: true,
    data: { ...valid, title: "서비스 업데이트" },
  });
  for (const input of [
    { ...valid, title: "  " },
    { ...valid, title: "가".repeat(161) },
    { ...valid, body: "\n  " },
    { ...valid, body: "가".repeat(20001) },
    { ...valid, category: "arbitrary" },
    { ...valid, status: "deleted" },
    { ...valid, pinned: "true" },
  ]) {
    assert.equal(validateAnnouncement(input).ok, false);
  }
});

test("페이지 번호와 공지 검색은 범위를 제한하고 필터 문법 삽입을 허용하지 않는다", () => {
  for (const value of [
    undefined,
    "0",
    "-1",
    "1.5",
    "Infinity",
    "100001",
    "abc",
  ])
    assert.equal(normalizeAnnouncementPage(value), 1);
  assert.equal(normalizeAnnouncementPage("3"), 3);
  assert.equal(
    escapeAnnouncementSearch('메뉴,body.eq.secret%_("테스트")'),
    "메뉴 body eq secret    테스트",
  );
  assert.equal(escapeAnnouncementSearch("가".repeat(101)).length, 100);
});
