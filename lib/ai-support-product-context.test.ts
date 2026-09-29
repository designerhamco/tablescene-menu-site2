import assert from "node:assert/strict";
import test from "node:test";

import { AI_SUPPORT_PRODUCT_CONTEXT } from "./ai-support-product-context";

test("AI 상담 지식은 현재 판매 상품과 대표 QR을 포함한다", () => {
  for (const expected of [
    "월 5,900원",
    "연 63,700원",
    "월 9,900원",
    "연 106,900원",
    "오브 테이블과 메종 마레",
    "월 14,900원",
    "연 160,900원",
    "할인과 이미지·MP4 직접 업로드",
    "대표 QR 1개",
    "AI 크레딧 6개",
  ]) {
    assert.match(AI_SUPPORT_PRODUCT_CONTEXT, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("AI 상담 지식은 비활성 운영 기능을 제공한다고 안내하지 않는다", () => {
  assert.match(AI_SUPPORT_PRODUCT_CONTEXT, /스마트호출, 테이블별 QR, 테이블 관리, 대기번호, 주문·QR 결제, 매장 운영, 직원 관리는 현재 제공하지 않는다/);
  assert.doesNotMatch(AI_SUPPORT_PRODUCT_CONTEXT, /스마트호출을 제공/);
});
