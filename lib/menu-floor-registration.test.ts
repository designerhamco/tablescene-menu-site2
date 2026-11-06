import assert from "node:assert/strict";
import test from "node:test";
import { mergeRegisteredFloorPoint, saveRegisteredFloorPoint } from "./menu-floor-registration";
import type { FloorDocument, FloorPlanSnapshot } from "./menu-floor-plan";
const room = "11111111-1111-4111-8111-111111111111", otherRoom = "22222222-2222-4222-8222-222222222222", point = "33333333-3333-4333-8333-333333333333", created = "44444444-4444-4444-8444-444444444444";
const initial = (): FloorPlanSnapshot => ({ available: true, revision: 4, document: {rooms: [{id:room,name:"홀",aspectRatio:4/3},{id:otherRoom,name:"테라스",aspectRatio:4/3}],placements:[{pointId:point,roomId:room,x:10,y:10,width:20,height:16}]} });

test("리스트에서 등록한 테이블·키오스크는 선택 룸에 저장되어 새로 조회해도 배치된다", async () => {
  for (const targetRoom of [room, otherRoom]) {
    const saved = initial(); let stored = saved.document; let writes = 0;
    const result = await saveRegisteredFloorPoint(saved, {pointId:created,roomId:targetRoom}, async (revision,document) => {
      assert.equal(revision,4); stored = structuredClone(document); writes++;
      return {status:"success",revision:5,document};
    });
    assert.equal(result.status,"success"); assert.equal(writes,1);
    const reloaded = structuredClone(stored);
    assert.equal(reloaded.placements.find(item=>item.pointId===created)?.roomId,targetRoom);
    assert.deepEqual(reloaded.placements[0], saved.document.placements[0]);
    if(result.status!=="success") return;
    assert.equal((await saveRegisteredFloorPoint({...saved,revision:5,document:stored},{pointId:created,roomId:targetRoom},async()=>{throw new Error("duplicate write");})).status,"success");
  }
});

test("새 등록 배치만 저장하며 다른 항목의 미저장 위치·크기·룸 수정은 유지한다", async () => {
  const saved = initial(), draft = structuredClone(saved.document);
  draft.placements[0] = {...draft.placements[0],roomId:otherRoom,x:55,y:40,width:30,height:25};
  draft.rooms[0].name="변경 중";
  const result = await saveRegisteredFloorPoint(saved,{pointId:created,roomId:room},async(_,document)=>{
    assert.deepEqual(document.placements[0],saved.document.placements[0]);
    assert.equal(document.rooms[0].name,"홀");
    return {status:"success",revision:5,document};
  });
  assert.equal(result.status,"success"); if(result.status!=="success") return;
  const merged = mergeRegisteredFloorPoint(draft,result.document,created);
  assert.deepEqual(merged.placements[0],draft.placements[0]); assert.equal(merged.rooms[0].name,"변경 중");
  assert.deepEqual(merged.placements.find(item=>item.pointId===created),result.document.placements.find(item=>item.pointId===created));
  assert.equal(merged.placements.filter(item=>item.pointId===created).length,1);
  assert.deepEqual(mergeRegisteredFloorPoint(merged,result.document,created),merged);
});

test("룸 없음·조회 불가·다른 룸은 쓰지 않고 저장 오류·충돌을 성공으로 바꾸지 않는다", async () => {
  for(const snapshot of [{...initial(),available:false},{...initial(),document:{rooms:[],placements:[]} as FloorDocument}]) {
    const result = await saveRegisteredFloorPoint(snapshot,{pointId:created,roomId:room},async()=>{throw new Error("must not write");});
    assert.equal(result.status,"error");
  }
  assert.equal((await saveRegisteredFloorPoint(initial(),{pointId:created,roomId:created},async()=>{throw new Error("must not write");})).status,"error");
  const failed = await saveRegisteredFloorPoint(initial(),{pointId:created,roomId:room},async()=>({status:"error",message:"다른 화면에서 변경됨"}));
  assert.deepEqual(failed,{status:"error",message:"다른 화면에서 변경됨"});
  await assert.rejects(saveRegisteredFloorPoint(initial(),{pointId:created,roomId:room},async()=>{throw new Error("network error");}),/network error/);
});
