import assert from "node:assert/strict";
import test from "node:test";
import { getCatalogDesign } from "./catalog-designs";

test("card structure labels match all registered native renderer compositions", () => {
  const expected = {
    cafe_design_a: "1열 고정형", fast_food_loop_bagel_a: "1열 고정형",
    cafe_mocha_forest_a: "상단행 고정형(왼쪽 로고)", cafe_sunday_line_a: "상단행 고정형", cafe_van_gogh_a: "상단행 고정형",
    cafe_round_focus_a: "중앙열 고정형", restaurant_onue_a: "좌상단 배치형",
    dining_aube_table_a: "전면 페이지형", dining_aube_table_b: "좌측 내비게이션형", display_menu_a: "TV·모니터형",
  };
  for (const [id, label] of Object.entries(expected)) assert.equal(getCatalogDesign(id)?.structureLabel, label, id);
});
