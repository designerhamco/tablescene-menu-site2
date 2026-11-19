import test from "node:test";
import assert from "node:assert/strict";
import { ONE_PAGE_QA_TEMPLATES } from "./one-page-qa";
import { ONE_PAGE_PROPORTION_TEMPLATE_KEYS } from "./one-page-proportion-policy";
import { getAvailableTemplatesForService } from "./templates";
import { supportsPcTabletLayoutMode } from "./menu-layout-modes";

test("채움형 검수 목록은 신규 및 기존 원페이지 메뉴를 모두 검수한다", () => {
  const activeKeys = new Set(getAvailableTemplatesForService("basic").map(template => template.key));
  const expected = [...ONE_PAGE_PROPORTION_TEMPLATE_KEYS];
  assert.ok(expected.filter(key => !activeKeys.has(key)).every(key => key === "cafe_round_focus_a"));
  const actual = ONE_PAGE_QA_TEMPLATES.map(template => template.key);
  assert.deepEqual([...actual].sort(), [...expected].sort());
  assert.equal(new Set(actual).size, actual.length);
  assert.ok(actual.every(supportsPcTabletLayoutMode));
});
