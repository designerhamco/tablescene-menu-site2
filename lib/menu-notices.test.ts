import assert from "node:assert/strict";
import test from "node:test";
import { getMenuNoticeRows } from "./menu-notices";

test("notice rows preserve explicit empties and use legacy fallbacks only for missing fields", () => {
  const legacy = { opening_hours: "  영업시간  ", restaurant_address: "주소", settings: { footer_sns_text: "SNS", footer_note: "메모" } };
  assert.deepEqual(getMenuNoticeRows(legacy), ["영업시간", "주소", "SNS"]);
  assert.deepEqual(getMenuNoticeRows({ ...legacy, settings: { ...legacy.settings, footer_notice_1: "", footer_notice_2: "", footer_notice_3: "" } }), []);
  assert.deepEqual(getMenuNoticeRows({ ...legacy, settings: { footer_notice_1: "첫째", footer_notice_2: "", footer_notice_3: "셋째" } }), ["첫째", "셋째"]);
});
test("zero to three notices retain complete copy in registration order", () => {
  for (const count of [0, 1, 2, 3]) {
    const rows = Array.from({ length: count }, (_, i) => `안내 ${i + 1}\n${"긴 설명 ".repeat(20)}`.trim());
    const settings = Object.fromEntries([1, 2, 3].map((n, i) => [`footer_notice_${n}`, rows[i] ?? ""]));
    assert.deepEqual(getMenuNoticeRows({ settings }), rows);
  }
  assert.deepEqual(getMenuNoticeRows({ settings: [] }), []);
  assert.deepEqual(getMenuNoticeRows({ settings: { footer_notice_1: 1, footer_notice_2: null } }), []);
});
