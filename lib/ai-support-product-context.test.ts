import assert from "node:assert/strict";
import test from "node:test";

import { AI_SUPPORT_PRODUCT_CONTEXT } from "./ai-support-product-context";

test("AI 상담 지식은 현재 판매 상품과 핵심 운영 기능을 포함한다", () => {
  for (const expected of [
    "월 5,900원",
    "연 63,700원",
    "월 9,900원",
    "연 106,900원",
    "오브 테이블과 메종 마레",
    "월 14,900원",
    "연 160,900원",
    "할인과 이미지·MP4 직접 업로드",
    "테이블별로 서로 다른 QR",
    "AI 크레딧 6개",
  ]) {
    assert.match(AI_SUPPORT_PRODUCT_CONTEXT, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("AI 상담 지식은 장기 비활성 기능을 제공한다고 안내하지 않는다", () => {
  assert.match(AI_SUPPORT_PRODUCT_CONTEXT, /오더와 QR 결제는 현재 제공하지 않는다/);
  assert.match(AI_SUPPORT_PRODUCT_CONTEXT, /POS 자동 연동은 현재 제공하지 않는다/);
});
