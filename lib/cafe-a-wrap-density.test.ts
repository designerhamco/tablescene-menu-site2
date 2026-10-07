import assert from "node:assert/strict";
import test from "node:test";

import {
  CAFE_A_DENSE_WRAP_SCALE,
  CAFE_A_MILD_WRAP_SCALE,
  getCafeAMenuWrapDensityDecision,
  getCafeAMenuWrapDensityDecisionForColumns,
} from "./cafe-a-wrap-density";

test("한두 줄 상품명과 세 줄 이하 설명은 글자 크기를 유지한다", () => {
  const decision = getCafeAMenuWrapDensityDecision([
    { titleLines: 1, descriptionLines: 2 },
    { titleLines: 2, descriptionLines: 3 },
    { titleLines: 1, descriptionLines: 0 },
  ]);

  assert.equal(decision.recommendedScale, 1);
  assert.equal(decision.penalty, 0);
});

test("한 개의 유난히 긴 상품만으로 전체 메뉴 글자를 줄이지 않는다", () => {
  const decision = getCafeAMenuWrapDensityDecision([
    { titleLines: 4, descriptionLines: 5 },
    { titleLines: 1, descriptionLines: 2 },
    { titleLines: 1, descriptionLines: 2 },
    { titleLines: 1, descriptionLines: 2 },
  ]);

  assert.equal(decision.recommendedScale, 1);
  assert.equal(decision.affectedCount, 1);
});

test("여러 상품에서 줄바꿈이 반복되면 메뉴 상품 글자만 소폭 줄인다", () => {
  const decision = getCafeAMenuWrapDensityDecision([
    { titleLines: 3, descriptionLines: 3 },
    { titleLines: 2, descriptionLines: 4 },
    { titleLines: 1, descriptionLines: 2 },
    { titleLines: 1, descriptionLines: 2 },
    { titleLines: 1, descriptionLines: 2 },
    { titleLines: 1, descriptionLines: 2 },
    { titleLines: 1, descriptionLines: 2 },
    { titleLines: 1, descriptionLines: 2 },
  ]);

  assert.equal(decision.recommendedScale, CAFE_A_MILD_WRAP_SCALE);
  assert.ok(decision.penalty > 0);
});

test("세 개 중 하나 이상 비율로 빽빽하면 최대 6퍼센트까지만 줄인다", () => {
  const decision = getCafeAMenuWrapDensityDecision([
    { titleLines: 2, descriptionLines: 4 },
    { titleLines: 3, descriptionLines: 4 },
    { titleLines: 2, descriptionLines: 2 },
    { titleLines: 2, descriptionLines: 2 },
    { titleLines: 1, descriptionLines: 2 },
    { titleLines: 1, descriptionLines: 2 },
  ]);

  assert.equal(decision.recommendedScale, CAFE_A_DENSE_WRAP_SCALE);
  assert.equal(decision.affectedCount, 2);
});

test("전체 비율은 낮아도 한 열에서 줄바꿈이 반복되면 해당 밀도를 반영한다", () => {
  const decision = getCafeAMenuWrapDensityDecisionForColumns([
    [
      { titleLines: 2, descriptionLines: 3 },
      { titleLines: 3, descriptionLines: 3 },
      { titleLines: 1, descriptionLines: 2 },
    ],
    [
      { titleLines: 1, descriptionLines: 2 },
      { titleLines: 1, descriptionLines: 2 },
      { titleLines: 1, descriptionLines: 2 },
      { titleLines: 1, descriptionLines: 2 },
      { titleLines: 1, descriptionLines: 2 },
      { titleLines: 1, descriptionLines: 2 },
      { titleLines: 1, descriptionLines: 2 },
    ],
  ]);

  assert.equal(decision.recommendedScale, CAFE_A_DENSE_WRAP_SCALE);
  assert.equal(decision.sampleCount, 3);
});
