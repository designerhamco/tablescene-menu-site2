import assert from "node:assert/strict";
import test from "node:test";

import {
  assertSupportedAiDescriptionClaims,
  hasExplicitFreePriceSignal,
  normalizeAiDescriptionPriceContext,
} from "./menu-ai-description-safety";

test("AI 설명 가격 문맥에서 0원과 빈 값은 가격 미제공으로 취급한다", () => {
  for (const value of [null, undefined, "", "0", "0원", "₩0", "KRW 0", "0.00"]) {
    assert.equal(normalizeAiDescriptionPriceContext(value), null);
  }

  assert.equal(normalizeAiDescriptionPriceContext("5,900원"), "5,900원");
  assert.equal(normalizeAiDescriptionPriceContext("시가"), "시가");
});

test("명시적인 무료 표기가 없으면 AI 결과의 무료 제공 주장을 차단한다", () => {
  assert.throws(
    () => assertSupportedAiDescriptionClaims("가격은 무료로 제공됩니다.", {}),
    /무료 제공 내용을 포함/,
  );
  assert.doesNotThrow(() => assertSupportedAiDescriptionClaims("계절 재료로 구성한 첫 인사입니다.", {}));
});

test("관리자가 무료라고 명시한 경우에만 무료 표현을 허용한다", () => {
  assert.equal(hasExplicitFreePriceSignal({ priceLabel: "무료" }), true);
  assert.equal(hasExplicitFreePriceSignal({ badgeLabel: "Complimentary" }), true);
  assert.doesNotThrow(() =>
    assertSupportedAiDescriptionClaims("무료로 제공되는 웰컴 드링크입니다.", { priceLabel: "무료" }),
  );
});
