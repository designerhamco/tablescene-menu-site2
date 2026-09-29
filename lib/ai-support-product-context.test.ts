import assert from "node:assert/strict";
import test from "node:test";

import { AI_SUPPORT_PRODUCT_CONTEXT } from "./ai-support-product-context";

test("AI 상담 지식은 현재 판매 상품과 대표 QR을 포함한다", () => {
  for (const expected of [
    "월 5,900원",
    "월 4,900원",
    "월 8,900원",
    "월 6,900원",
    "월 12,900원",
    "월 10,900원",
    "계정당 최초 1회",
    "각 디자인별 별도 월 구독",
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
