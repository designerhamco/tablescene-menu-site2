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
    "메뉴판별 월 구독",
    "월 6,800원",
    "월 8,800원",
    "기존 구독은 기존 계약과 금액을 유지",
    "할인과 이미지·MP4 직접 업로드",
    "대표 QR 1개",
    "AI 크레딧 6개",
  ]) {
    assert.match(AI_SUPPORT_PRODUCT_CONTEXT, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("AI 상담은 새 플랜 명칭과 운영 연결 범위를 구분한다", () => {
  for (const label of ["원페이지 베이직 플랜", "스페셜 다이닝 플랜", "디스플레이 플랜은 현재 준비 중"]) assert.ok(AI_SUPPORT_PRODUCT_CONTEXT.includes(label));
  assert.match(AI_SUPPORT_PRODUCT_CONTEXT, /전용 QA 검증 단계/);
  assert.match(AI_SUPPORT_PRODUCT_CONTEXT, /일반 매장에 실제 접수가 이미 열려 있다고 안내하지 않는다/);
  assert.match(AI_SUPPORT_PRODUCT_CONTEXT, /실제 PG 결제를 실행하지 않는다/);
});
