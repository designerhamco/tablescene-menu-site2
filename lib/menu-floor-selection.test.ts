import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import FloorPlanEditor from "../components/mypage/floor-plan/FloorPlanEditor";

const room = "11111111-1111-4111-8111-111111111111";
const first = "22222222-2222-4222-8222-222222222222";
const second = "33333333-3333-4333-8333-333333333333";
const placement = (pointId: string) => ({pointId, roomId: room, x: 5, y: 5, width: 20, height: 20});
function render(ids: string[], registered = [first, second]) {
  return renderToStaticMarkup(createElement(AppRouterContext.Provider, {value: {push() {}} as never}, createElement(FloorPlanEditor, {
    initial: {available: true, revision: 1, document: {rooms: [{id: room, name: "홀", aspectRatio: 4/3}], placements: ids.map(placement)}},
    points: registered.map((id, index) => ({id, label: `테이블 ${index+1}`})),
    onSave: async () => ({status: "error", message: "이 검사는 저장하지 않습니다."}),
    renderSelectedPoint: point => createElement("span", {"data-selected-details": point.id}, point.label),
  })));
}
test("배치도 첫 유효 항목은 클릭 전부터 선택 정보와 선택 상태를 표시한다", () => {
  const html = render([first, second]);
  assert.match(html, new RegExp(`data-selected-details="${first}"`));
  assert.match(html, /aria-label="테이블 · 테이블 1" aria-pressed="true"/);
  assert.match(html, /aria-label="테이블 · 테이블 2" aria-pressed="false"/);
});
test("미등록 항목을 제외하고 빈 룸은 선택 정보를 만들지 않는다", () => {
  assert.match(render([first, second], [second]), new RegExp(`data-selected-details="${second}"`));
  assert.doesNotMatch(render([]), /data-selected-details=/);
});
