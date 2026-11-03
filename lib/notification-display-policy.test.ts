import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getNotificationDisplaySince, NOTIFICATION_DISPLAY_DAYS, NOTIFICATION_DISPLAY_NOTICE } from "./notification-display-policy";
import { applyNotificationsReadAll } from "./notification-read-state";

test("90일 표시는 한국 시간 자정/윤년에도 정확히 90×24시간이며 잘못된 시각은 거부한다", () => {
  assert.equal(NOTIFICATION_DISPLAY_DAYS, 90);
  assert.equal(getNotificationDisplaySince("2026-11-03T00:00:00+09:00"), "2026-08-04T15:00:00.000Z");
  assert.equal(getNotificationDisplaySince(new Date("2024-03-01T00:00:00Z")), "2023-12-02T00:00:00.000Z");
  assert.throws(() => getNotificationDisplaySince("invalid"), RangeError);
  assert.match(NOTIFICATION_DISPLAY_NOTICE, /90일/);
  assert.doesNotMatch(NOTIFICATION_DISPLAY_NOTICE, /삭제/);
});

test("읽음 동기화는 90일 경계를 포함하고 이전 기록·잘못된 날짜·새 알림을 보존한다", () => {
  const readAt = "2026-11-03T12:00:00Z", since = getNotificationDisplaySince(readAt);
  const rows = [since, new Date(Date.parse(since) - 1).toISOString(), readAt, "2026-11-03T12:00:00.001Z", "invalid", null]
    .map(created_at => ({ created_at, read_at: null }));
  const next = applyNotificationsReadAll(rows, readAt);
  assert.equal(next[0].read_at, readAt); assert.equal(next[2].read_at, readAt);
  for (const i of [1, 3, 4, 5]) assert.equal(next[i], rows[i]);
  assert.ok(rows.every(row => row.read_at === null), "does not mutate original notification rows");
});

test("헤더·별도 알림·마이페이지의 목록과 배지는 같은 기준 시각으로 각각90일을 제한한다", () => {
  for (const file of ["app/components/layout/Navbar.tsx", "app/notifications/page.tsx", "app/mypage/page.tsx"]) {
    const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
    assert.equal([...source.matchAll(/\.gte\(['"]created_at['"](?: as never)?, displaySince(?: as never)?\)/g)].length, 2, file);
    assert.equal([...source.matchAll(/const displaySince = getNotificationDisplaySince\(\)/g)].length, 1, file);
  }
});
