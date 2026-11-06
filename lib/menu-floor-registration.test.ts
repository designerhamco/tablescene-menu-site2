import assert from "node:assert/strict";
import test from "node:test";
import { placeRegisteredFloorPoint } from "./menu-floor-registration";
import type { FloorDocument } from "./menu-floor-plan";
const room="11111111-1111-4111-8111-111111111111", point="33333333-3333-4333-8333-333333333333";
test("새 등록의 초기 배치는 저장된 원본을 바꾸지 않고 공유 초안에만 추가한다",()=>{
 const saved:FloorDocument={rooms:[{id:room,name:"룸",aspectRatio:4/3}],placements:[]};
 const draft=placeRegisteredFloorPoint(saved,{pointId:point,roomId:room});
 assert.equal(saved.placements.length,0);assert.equal(draft.placements[0].pointId,point);
 assert.equal(placeRegisteredFloorPoint(draft,{pointId:point,roomId:room}),draft);
});
test("없는 룸에는 초안 배치도 추가하지 않는다",()=>{
 const saved:FloorDocument={rooms:[],placements:[]};assert.equal(placeRegisteredFloorPoint(saved,{pointId:point,roomId:room}),saved);
});
