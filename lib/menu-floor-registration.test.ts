import assert from "node:assert/strict";
import test from "node:test";
import { placeRegisteredFloorPoint,mergeRegisteredFloorPoint,saveRegisteredFloorPoint } from "./menu-floor-registration";
import {sameFloorDocument,normalizeFloorDocument,placeNewFloorPoints,readableFloorDocument, type FloorDocument} from "./menu-floor-plan";
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

test("복원 배치 병합은 과거 초안을 새 좌표계로 맞추고 같은 저장 결과를 가짜 미저장으로 표시하지 않는다",()=>{
 const legacy:FloorDocument={rooms:[{id:room,name:"룸",aspectRatio:4/3}],placements:[]};
 const committed=normalizeFloorDocument(placeNewFloorPoints(legacy,[point],room));
 const merged=mergeRegisteredFloorPoint(legacy,committed,point);assert.ok(sameFloorDocument(merged,committed));assert.equal(merged.layoutVersion,2);
 const existing="44444444-4444-4444-8444-444444444444",draft=placeNewFloorPoints(legacy,[existing],room);
 const preserved=mergeRegisteredFloorPoint(draft,committed,point);normalizeFloorDocument(preserved);assert.deepEqual(preserved.placements.find(p=>p.pointId===existing),draft.placements[0]);assert.equal(preserved.placements.length,2);
 assert.deepEqual(legacy.placements,[]);assert.ok(sameFloorDocument(readableFloorDocument(committed),committed));
});

test("과거 배치에 이미 있던 복원 항목도 같은 좌표계와 순서로 합치며 복원만으로 미저장을 남기지 않는다",async()=>{
 const legacy:FloorDocument={rooms:[{id:room,name:"룸",aspectRatio:4/3}],placements:[{pointId:point,roomId:room,x:5,y:5,width:20,height:20},{pointId:"44444444-4444-4444-8444-444444444444",roomId:room,x:40,y:5,width:20,height:20}]};
 const result=await saveRegisteredFloorPoint({available:true,revision:1,document:legacy},{pointId:point,roomId:room},async(_revision,document)=>({status:"success",revision:2,document:normalizeFloorDocument(document)}));
 assert.equal(result.status,"success");if(result.status!=="success")return;
 const merged=mergeRegisteredFloorPoint(legacy,result.document,point);assert.ok(sameFloorDocument(merged,result.document));assert.equal(merged.placements[0].pointId,point);
});
