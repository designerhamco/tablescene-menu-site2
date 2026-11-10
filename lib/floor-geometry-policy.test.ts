import assert from "node:assert/strict";
import test from "node:test";
import {FLOOR_GEOMETRY as world,FLOOR_RECT_SIZE as size,readableFloorDocument,normalizeFloorDocument,placeNewFloorPoints,moveFloorPoint,floorRectsOverlap,constrainFloorRect,type FloorDocument} from "./menu-floor-plan";
const room="11111111-1111-4111-8111-111111111111",other="22222222-2222-4222-8222-222222222222";
const point=(n:number)=>`33333333-3333-4333-8333-${String(n).padStart(12,"0")}`;
const empty=():FloorDocument=>({rooms:[{id:room,name:"홀",aspectRatio:4/3},{id:other,name:"별실",aspectRatio:16/9}],placements:[]});
function bounded(document:FloorDocument){
 assert.equal(document.layoutVersion,3);normalizeFloorDocument(document);
 for(const p of document.placements){assert.equal(p.width,size.width);assert.equal(p.height,size.height);assert.ok(p.width*world.width/100>=280);assert.ok(p.height*world.height/100>=256);assert.ok(p.x>=0&&p.y>=0&&p.x+p.width<=100.01&&p.y+p.height<=100.01);}
 for(let i=0;i<document.placements.length;i++)for(let j=i+1;j<document.placements.length;j++)if(document.placements[i].roomId===document.placements[j].roomId)assert.equal(floorRectsOverlap(document.placements[i],document.placements[j]),false);
}
test("과거 작은·큰·겹친 배치는 ID·소속을 유지해 안전한 보기로 변환하며 원본을 변경하지 않는다",()=>{
 const legacy={...empty(),placements:Array.from({length:8},(_,n)=>({pointId:point(n),roomId:room,x:1,y:1,width:n%2?8:80,height:n%2?8:80}))};
 const original=structuredClone(legacy),view=readableFloorDocument(legacy);bounded(view);assert.deepEqual(legacy,original);assert.deepEqual(view.placements.map(p=>p.pointId),legacy.placements.map(p=>p.pointId));assert.equal(readableFloorDocument(view),view);
});
test("고정 크기 200개를 한정된 공간에 겹침·축소 없이 배치한다",()=>{
 const full=placeNewFloorPoints(empty(),Array.from({length:200},(_,n)=>point(n)),room);assert.equal(full.placements.length,200);bounded(full);
});
test("새 버전의 임의 크기 변경·경계 초과·겹침을 저장 형식에서 거부한다",()=>{
 const valid=placeNewFloorPoints(empty(),[point(1),point(2)],room);bounded(valid);
 for(const bad of [{width:size.width-.01},{width:size.width+.01},{height:size.height-.01},{height:size.height+.01},{x:100},{x:valid.placements[1].x,y:valid.placements[1].y}])assert.throws(()=>normalizeFloorDocument({...valid,placements:[{...valid.placements[0],...bad},valid.placements[1]]}));
 const small=constrainFloorRect({x:-10,y:200,width:0,height:0});bounded({...empty(),layoutVersion:3,placements:[{pointId:point(3),roomId:room,...small}]});
});
test("다른 룸으로 이동할 때 기존 영역 위에 겹쳐 넣지 않고 빈 곳을 택한다",()=>{
 let document=placeNewFloorPoints(empty(),[point(1)],room);document=placeNewFloorPoints(document,[point(2)],other);document=moveFloorPoint(document,point(1),other);bounded(document);assert.equal(document.placements.find(p=>p.pointId===point(1))?.roomId,other);assert.equal(document.placements.filter(p=>p.roomId===other).length,2);
});
test("기존 v2의 서로 다른 크기는 위치·소속·원본을 유지하며 같은 크기로 표시한다",()=>{
 const stored:FloorDocument={...empty(),layoutVersion:2,placements:[{pointId:point(1),roomId:room,x:1,y:1,width:4.56,height:7.41},{pointId:point(2),roomId:room,x:20,y:1,width:9.11,height:14.81}]};
 normalizeFloorDocument(stored);const before=structuredClone(stored),view=readableFloorDocument(stored);bounded(view);
 assert.deepEqual(stored,before);assert.deepEqual(view.placements.map(({x,y,pointId,roomId})=>({x,y,pointId,roomId})),stored.placements.map(({x,y,pointId,roomId})=>({x,y,pointId,roomId})));
 assert.equal(view.placements[0].width,view.placements[1].width);assert.equal(view.placements[0].height,view.placements[1].height);
});

test("200개가 같은 위치에 저장된 과거 배치도 읽기 보정으로 모두 보존한다",()=>{
 const legacy={...empty(),placements:Array.from({length:200},(_,n)=>({pointId:point(n),roomId:room,x:1,y:1,width:80,height:80}))};
 const view=readableFloorDocument(legacy);assert.equal(view.placements.length,200);bounded(view);assert.equal(legacy.placements[0].width,80);
});
