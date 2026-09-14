import assert from "node:assert/strict";
import test from "node:test";

import { formatKoreanDateTime } from "./korean-date-time";

test("운영 화면 날짜는 서버와 브라우저에서 같은 KST 문자열을 사용한다", () => {
  assert.equal(formatKoreanDateTime("2026-09-14T07:05:10.000Z"), "2026. 9. 14. 오후 4:05:10");
  assert.equal(formatKoreanDateTime("2026-09-13T15:00:00.000Z"), "2026. 9. 14. 오전 12:00:00");
});

test("비어 있거나 잘못된 날짜는 안전한 대체 문구를 사용한다", () => {
  assert.equal(formatKoreanDateTime(null), "-");
  assert.equal(formatKoreanDateTime("not-a-date"), "-");
});
