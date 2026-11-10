import assert from "node:assert/strict";
import test from "node:test";
import {FLOOR_ROOM_ICONS} from "./floor-room-icons";
import {normalizeFloorDocument,renameSavedFloorRoom,sameFloorDocument,type FloorDocument} from "./menu-floor-plan";
const room={id:"11111111-1111-4111-8111-111111111111",name:"메인",aspectRatio:1.78};
const initial=():FloorDocument=>({rooms:[room,{id:"22222222-2222-4222-8222-222222222222",name:"테라스",emoji:"🌿",aspectRatio:1.78}],placements:[{pointId:"33333333-3333-4333-8333-333333333333",roomId:room.id,x:10,y:10,width:20,height:20}]});
test("허용된 룸 이모지는 이름과 별도로 보존하며 기존 무이모지 문서도 그대로 읽는다",()=>{
 assert.deepEqual(normalizeFloorDocument(initial()),initial());
 for(const icon of FLOOR_ROOM_ICONS){const value=normalizeFloorDocument({...initial(),rooms:[{...room,emoji:icon.value}]});assert.equal(value.rooms[0].emoji,icon.value||undefined);assert.equal(value.rooms[0].name,"메인");}
 for(const emoji of ["<img>","custom-asset",5,null])assert.throws(()=>normalizeFloorDocument({...initial(),rooms:[{...room,emoji}]}));
});
test("룸 이름과 이모지 저장·제거는 다른 룸이나 저장된 배치를 변경하지 않는다",()=>{
 const previous=initial(),next=renameSavedFloorRoom(previous,room,"중앙홀","🍽️");
 assert.deepEqual(next.placements,previous.placements);assert.deepEqual(next.rooms[1],previous.rooms[1]);assert.equal(next.rooms[0].emoji,"🍽️");assert.equal(next.rooms[0].name,"중앙홀");assert.equal(sameFloorDocument(previous,next),false);
 const retained=renameSavedFloorRoom(next,next.rooms[0],"메인홀");assert.equal(retained.rooms[0].emoji,"🍽️");
 const cleared=renameSavedFloorRoom(retained,retained.rooms[0],"메인홀","");assert.equal(cleared.rooms[0].emoji,undefined);assert.equal(previous.rooms[0].emoji,undefined);
 assert.equal(sameFloorDocument(previous,{...previous,rooms:previous.rooms.map(r=>({...r,emoji:r.emoji??""}))}),true);
});
