import assert from "node:assert/strict";
import test from "node:test";

import {
  assertSupportedAiDescriptionClaims,
  getRequiredDescriptionSourceFacts,
  hasMissingDescriptionSourceFacts,
  hasUnsupportedFreeClaim,
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
  assert.equal(hasUnsupportedFreeClaim("가격은 무료로 제공됩니다.", {}), true);
  assert.throws(
    () => assertSupportedAiDescriptionClaims("가격은 무료로 제공됩니다.", {}),
    /무료 제공 내용을 포함/,
  );
  assert.doesNotThrow(() => assertSupportedAiDescriptionClaims("계절 재료로 구성한 첫 인사입니다.", {}));
});

test("관리자가 무료라고 명시한 경우에만 무료 표현을 허용한다", () => {
  assert.equal(hasExplicitFreePriceSignal({ priceLabel: "무료" }), true);
  assert.equal(hasExplicitFreePriceSignal({ badgeLabel: "Complimentary" }), true);
  assert.equal(hasUnsupportedFreeClaim("무료로 제공되는 웰컴 드링크입니다.", { priceLabel: "무료" }), false);
  assert.doesNotThrow(() =>
    assertSupportedAiDescriptionClaims("무료로 제공되는 웰컴 드링크입니다.", { priceLabel: "무료" }),
  );
});

test("구분자로 등록한 기존 설명의 핵심 재료를 모두 유지한다", () => {
  const input = { currentDescription: "참돔 · 청사과 · 딜" };

  assert.deepEqual(getRequiredDescriptionSourceFacts(input.currentDescription), ["참돔", "청사과", "딜"]);
  assert.equal(hasMissingDescriptionSourceFacts("참돔에 청사과와 딜을 곁들였습니다.", input), false);
  assert.equal(hasMissingDescriptionSourceFacts("방문한 손님을 위한 기본 안내입니다.", input), true);
  assert.throws(
    () => assertSupportedAiDescriptionClaims("참돔와 청사과를 곁들였습니다.", input),
    /핵심 재료 또는 특징을 누락/,
  );
});

test("자연스러운 문장형 기존 설명은 과도한 문자열 일치를 요구하지 않는다", () => {
  const input = { currentDescription: "신선한 관자를 구워 부드럽게 완성한 전채입니다." };
  assert.deepEqual(getRequiredDescriptionSourceFacts(input.currentDescription), []);
  assert.equal(hasMissingDescriptionSourceFacts("관자를 살짝 구운 따뜻한 전채입니다.", input), false);
});
