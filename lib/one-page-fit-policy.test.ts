import assert from "node:assert/strict";
import test from "node:test";

import {
  getCafeAOrderedBalancedBreaksFromColumns,
  getCafeAOrderedBalancedContiguousColumnCandidates,
} from "../components/menu-templates/cafe-a-balanced-layout";
import { getTemplateLayoutRules } from "./template-layout-rules";
import {
  getOnePageTotalColumnCount,
  ONE_PAGE_MAX_MENU_COLUMNS,
  ONE_PAGE_PREFERRED_MAX_MENU_COLUMNS,
  orderOnePageMenuColumnCandidates,
  selectOnePageFitTierState,
} from "./one-page-fit-policy";

const ONE_PAGE_TEMPLATE_KEYS = [
  "cafe_design_a",
  "cafe_mocha_forest_a",
  "cafe_sunday_line_a",
  "cafe_van_gogh_a",
  "cafe_round_focus_a",
  "fast_food_loop_bagel_a",
] as const;

test("원페이지 메뉴 열은 세 열을 우선하고 네 번째 열은 마지막 구조 후보로 둔다", () => {
  assert.equal(ONE_PAGE_PREFERRED_MAX_MENU_COLUMNS, 3);
  assert.equal(ONE_PAGE_MAX_MENU_COLUMNS, 4);
  assert.deepEqual(orderOnePageMenuColumnCandidates([2, 3, 4]), [3, 2, 4]);
  assert.deepEqual(orderOnePageMenuColumnCandidates([4, 3, 2, 4]), [3, 2, 4]);
});

test("읽을 수 있고 넘치지 않는 세 열 후보는 정상 네 열 후보보다 먼저 선택한다", () => {
  assert.equal(
    selectOnePageFitTierState({
      preferredSelectedState: null,
      preferredReadableFallbackState: "safe-three-columns",
      rescueSelectedState: "four-column-rescue",
      preferredFallbackState: "small-three-columns",
      rescueFallbackState: "small-four-columns",
      emergencyState: "emergency",
    }),
    "safe-three-columns",
  );
});

test("가게명 고정 열을 포함한 전체 열 수를 별도로 계산한다", () => {
  assert.equal(getOnePageTotalColumnCount("brand_left_rail", 3), 4);
  assert.equal(getOnePageTotalColumnCount("brand_center_column", 3), 4);
  assert.equal(getOnePageTotalColumnCount("brand_top_band", 3), 3);
  assert.equal(getOnePageTotalColumnCount("brand_left_rail", 4), 5);
});

test("모든 원페이지 템플릿은 같은 네 번째 메뉴 열 구조 한도를 공유한다", () => {
  for (const templateKey of ONE_PAGE_TEMPLATE_KEYS) {
    const rules = getTemplateLayoutRules(templateKey);
    assert.equal(rules.maxColumns.tablet, ONE_PAGE_MAX_MENU_COLUMNS, templateKey);
    assert.equal(rules.maxColumns.desktop, ONE_PAGE_MAX_MENU_COLUMNS, templateKey);
  }
});

test("루프베이글의 짧은 두 카테고리는 순서를 유지한 채 마지막 메뉴 열에 합칠 수 있다", () => {
  const blocks = [
    { key: "classic", order: 0, height: 377, visibleContentHeight: 377, marginBottom: 36, estimatedHeight: 377 },
    { key: "sandwiches", order: 1, height: 556, visibleContentHeight: 556, marginBottom: 36, estimatedHeight: 556 },
    { key: "cream-cheese", order: 2, height: 251, visibleContentHeight: 251, marginBottom: 36, estimatedHeight: 251 },
    { key: "coffee-drinks", order: 3, height: 186, visibleContentHeight: 186, marginBottom: 36, estimatedHeight: 186 },
  ];
  const candidates = getCafeAOrderedBalancedContiguousColumnCandidates(blocks, 3, {
    maxExhaustiveBlocks: 12,
    maxExhaustiveColumns: 4,
    targetHeight: 628,
    targetMaxVisibleGap: 6,
  });

  assert.ok(
    candidates.some(
      (columns) =>
        getCafeAOrderedBalancedBreaksFromColumns(columns) === "1,2" &&
        columns[2]?.blocks.map((block) => block.key).join(",") === "cream-cheese,coffee-drinks",
    ),
  );
  assert.equal(getCafeAOrderedBalancedBreaksFromColumns(candidates[0] ?? []), "1,2");
});

test("세로 공간이 넉넉한 PC에서도 한 열만 채우려고 짧은 마지막 열을 만들지 않는다", () => {
  const blocks = [
    { key: "classic", order: 0, height: 358, visibleContentHeight: 358, marginBottom: 39, estimatedHeight: 358 },
    { key: "sandwiches", order: 1, height: 463, visibleContentHeight: 463, marginBottom: 39, estimatedHeight: 463 },
    { key: "cream-cheese", order: 2, height: 268, visibleContentHeight: 268, marginBottom: 39, estimatedHeight: 268 },
    { key: "coffee-drinks", order: 3, height: 202, visibleContentHeight: 202, marginBottom: 39, estimatedHeight: 202 },
  ];
  const candidates = getCafeAOrderedBalancedContiguousColumnCandidates(blocks, 3, {
    columnTargetHeights: [786, 786, 668],
    maxExhaustiveBlocks: 12,
    maxExhaustiveColumns: 4,
    targetHeight: 786,
    targetMaxVisibleGap: 6,
  });

  assert.equal(getCafeAOrderedBalancedBreaksFromColumns(candidates[0] ?? []), "1,2");
});
