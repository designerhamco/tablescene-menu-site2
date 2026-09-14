import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const applyPageSource = readFileSync(new URL("../app/apply/page.tsx", import.meta.url), "utf8");
const paidApplyPageSource = readFileSync(
  new URL("../app/apply/_components/PaidApplyPage.tsx", import.meta.url),
  "utf8",
);
const applyOrderFormSource = readFileSync(
  new URL("../components/apply/ApplyOrderForm.tsx", import.meta.url),
  "utf8",
);

test("공개된 두 멀티페이지 템플릿과 신청 가능한 상태를 안내한다", () => {
  assert.match(applyPageSource, /오브 테이블·메종 마레 중 선택할 수/);
  assert.doesNotMatch(applyPageSource, /멀티페이지는 실제 디자인 템플릿 공개/);
  assert.doesNotMatch(paidApplyPageSource, /멀티페이지는 실제 디자인 템플릿 공개/);
});

test("사업자 인증 안내는 실제 빌링키 자동결제와 30일 무료체험 흐름을 설명한다", () => {
  assert.match(applyOrderFormSource, /결제수단을 등록하면 30일 무료체험이 시작/);
  assert.match(applyOrderFormSource, /월결제 또는 연결제 자동결제가 진행/);
  assert.doesNotMatch(applyOrderFormSource, /자동결제는 아직 준비 중이며/);
});
