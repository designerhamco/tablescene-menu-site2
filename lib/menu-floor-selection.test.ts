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
    points: registered.map((id, index) => ({id, label: `테이블 ${index+1}`, status: "active"})),
    onSave: async () => ({status: "error" as const, message: "이 검사는 저장하지 않습니다."}),
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

test("리스트는 선택 룸의 배치·미배치 소속과 과거 룸 미지정 항목을 구분한다", () => {
  const terrace = "44444444-4444-4444-8444-444444444444";
  const unplaced = "55555555-5555-4555-8555-555555555555";
  const legacy = "66666666-6666-4666-8666-666666666666";
  let context: Parameters<NonNullable<Parameters<typeof FloorPlanEditor>[0]["renderList"]>>[0] | undefined;
  renderToStaticMarkup(createElement(AppRouterContext.Provider, {value: {push() {}} as never}, createElement(FloorPlanEditor, {
    view: "list",
    initial: {available: true, revision: 1, document: {
      rooms: [{id:room,name:"홀",aspectRatio:4/3},{id:terrace,name:"테라스",aspectRatio:4/3}],
      placements: [placement(first),{...placement(second),roomId:terrace}],
      memberships: [{pointId:unplaced,roomId:room}],
    }},
    points: [first,second,unplaced,legacy].map(id=>({id,label:id,status:"active"})),
    onSave: async()=>({status:"error" as const,message:"저장하지 않습니다."}),
    renderList: value=>{context=value;return null;},
  })));
  assert.ok(context);
  assert.equal(context.roomId,room);
  assert.deepEqual(context.pointIds,[first,unplaced]);
  assert.deepEqual(context.unassignedPointIds,[legacy]);
  assert.equal(context.rooms.length,2);
  assert.equal(typeof context.onMovePoint,"function");
});
