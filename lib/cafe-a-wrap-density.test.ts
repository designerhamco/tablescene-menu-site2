import assert from "node:assert/strict";
import test from "node:test";

import {
  CAFE_A_DENSE_WRAP_SCALE,
  CAFE_A_MILD_WRAP_SCALE,
  CAFE_A_WRAP_SCALE_CANDIDATES,
  getCafeAMenuWrapDensityDecision,
  getCafeAMenuWrapDensityDecisionForColumns,
  getCafeAMenuWrapScaleCandidates,
  hasCafeAMenuWrapDensityImproved,
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

test("세 개 중 하나 이상 비율로 빽빽하면 6퍼센트부터 검토한다", () => {
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

test("고밀도 줄바꿈은 실제 줄 수가 줄어들 때까지 단계별 배율을 시도한다", () => {
  const denseDecision = getCafeAMenuWrapDensityDecision([
    { titleLines: 2, descriptionLines: 3 },
    { titleLines: 2, descriptionLines: 3 },
    { titleLines: 2, descriptionLines: 3 },
  ]);

  assert.deepEqual(getCafeAMenuWrapScaleCandidates(denseDecision), [
    ...CAFE_A_WRAP_SCALE_CANDIDATES.filter(
      (scale) => scale <= CAFE_A_DENSE_WRAP_SCALE,
    ),
  ]);
});

test("단순 한 줄 감소가 아니라 줄바꿈 밀도 단계가 실제로 완화됐는지 판정한다", () => {
  const baseline = getCafeAMenuWrapDensityDecision([
    { titleLines: 2, descriptionLines: 3 },
    { titleLines: 2, descriptionLines: 3 },
    { titleLines: 1, descriptionLines: 3 },
  ]);
  const unchanged = getCafeAMenuWrapDensityDecision([
    { titleLines: 2, descriptionLines: 3 },
    { titleLines: 2, descriptionLines: 3 },
    { titleLines: 1, descriptionLines: 3 },
  ]);
  const improved = getCafeAMenuWrapDensityDecision([
    { titleLines: 2, descriptionLines: 2 },
    { titleLines: 1, descriptionLines: 3 },
    { titleLines: 1, descriptionLines: 3 },
  ]);

  assert.equal(hasCafeAMenuWrapDensityImproved(baseline, unchanged), false);
  assert.equal(hasCafeAMenuWrapDensityImproved(baseline, improved), true);
});
