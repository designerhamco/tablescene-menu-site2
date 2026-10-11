import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { getMenuPriceAlignmentFailures } from "../scripts/lib/menu-price-alignment.mjs";

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const qa = readFileSync(new URL("../scripts/qa-template-preview-locales.mjs", import.meta.url), "utf8");
const preview = readFileSync(new URL("../app/templates/[templateKey]/preview/page.tsx", import.meta.url), "utf8");
const measure = (top: number, bottom: number) => ({
  name: "코히 크림 커피",
  nameFirstLine: { top: 100, bottom: 124 },
  priceAnchor: { top, bottom },
});

test("가격은 첫 상품명 행과 정렬되며 칩/설명 영역의 중앙으로 내려가지 않는다", () => {
  assert.deepEqual(getMenuPriceAlignmentFailures([measure(102, 125)]), []);
  assert.equal(getMenuPriceAlignmentFailures([measure(134, 154)]).length, 1);
  assert.equal(getMenuPriceAlignmentFailures([measure(124, 144)]).length, 1);
  assert.equal(getMenuPriceAlignmentFailures([measure(78, 100)]).length, 1);
});

test("여러 줄 상품명도 첫 줄을 기준으로 검사하고 옵션 할인 블록의 내부 적층은 유지한다", () => {
  assert.equal(getMenuPriceAlignmentFailures([measure(128, 148)]).length, 1);
  assert.deepEqual(getMenuPriceAlignmentFailures([measure(101, 144)]), []);
});

test("공통 원페이지 가격 정렬이 희소 콘텐츠/사진/스킨별 정렬보다 우선한다", () => {
  const gridRule = '.cafe-a-typography[data-cafe-a-proportion-policy="true"] :is(\n  .cafe-a-menu-item:not(.cafe-a-menu-item-with-image),\n  .cafe-a-menu-item-content-shell\n) {\n  align-items: first baseline;\n}';
  const priceRule = '.cafe-a-typography[data-cafe-a-proportion-policy="true"] .cafe-a-menu-item :is(\n  .cafe-a-menu-copy,\n  .cafe-a-price-area\n) {\n  align-self: first baseline;\n}';
  assert.ok(css.includes(gridRule));
  assert.ok(css.includes(priceRule));
  assert.ok(css.indexOf(priceRule) > css.indexOf('.cafe-a-menu-item-align-center .cafe-a-price-area'));
  assert.ok(css.indexOf(priceRule) > css.indexOf('.cafe-a-typography[data-cafe-a-skin="mocha_forest"] .cafe-a-price-area'));
});

test("선데이/반고흐의 숨긴 썸네일도 상품명 옆 가격 열을 유지한다", () => {
  const scope = '.cafe-a-typography[data-cafe-a-proportion-policy="true"][data-cafe-a-skin="sunday_line"] .cafe-a-menu-item-with-image';
  assert.ok(css.includes(`${scope} .cafe-a-menu-item-content-shell {\n    grid-template-columns: minmax(0, 1fr) max-content;`));
  assert.ok(css.includes(`${scope} .cafe-a-price-area {\n    grid-column: 2;\n    justify-self: end;\n    margin-top: 0;`));
});

test("실제 브라우저 QA가 상품명 첫 줄과 가격 위치를 검사한다", () => {
  assert.match(qa, /page\.evaluate\(measureMenuPriceAlignment\)/);
  assert.match(qa, /getMenuPriceAlignmentFailures\(priceAlignment\)/);
});

test("가격 정렬 전용 QA는 실제 가격 컬럼 구조를 쓰고 운영/스타터 데이터를 변경하지 않는다", () => {
  const fixture = preview.slice(preview.indexOf("function applyMenuPriceAlignmentQaFixture"), preview.indexOf("function getOrderCallQaConfig"));
  assert.match(fixture, /process\.env\.NODE_ENV === "production"/);
  assert.match(fixture, /usesOnePageProportionPolicy\(data\.menuSite\.template_key\)/);
  assert.match(fixture, /\["HOT", "ICE", "LARGE"\]/);
  assert.match(fixture, /priceColumns: columns/);
  assert.match(fixture, /priceColumnId: column\.id/);
  assert.doesNotMatch(fixture, /widgets:|\.push\(|supabase|\.update\(/);
});
