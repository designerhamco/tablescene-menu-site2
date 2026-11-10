import assert from "node:assert/strict";
import test from "node:test";
import {FLOOR_GEOMETRY as world,FLOOR_RECT_LIMITS as limits,readableFloorDocument,normalizeFloorDocument,placeNewFloorPoints,moveFloorPoint,floorRectsOverlap,constrainFloorRect,type FloorDocument} from "./menu-floor-plan";
const room="11111111-1111-4111-8111-111111111111",other="22222222-2222-4222-8222-222222222222";
const point=(n:number)=>`33333333-3333-4333-8333-${String(n).padStart(12,"0")}`;
const empty=():FloorDocument=>({rooms:[{id:room,name:"홀",aspectRatio:4/3},{id:other,name:"별실",aspectRatio:16/9}],placements:[]});
function bounded(document:FloorDocument){
 assert.equal(document.layoutVersion,2);normalizeFloorDocument(document);
 for(const p of document.placements){assert.ok(p.width*world.width/100>=280);assert.ok(p.height*world.height/100>=256);assert.ok(p.width*world.width/100<=560);assert.ok(p.height*world.height/100<=512);assert.ok(p.x>=0&&p.y>=0&&p.x+p.width<=100.01&&p.y+p.height<=100.01);}
 for(let i=0;i<document.placements.length;i++)for(let j=i+1;j<document.placements.length;j++)if(document.placements[i].roomId===document.placements[j].roomId)assert.equal(floorRectsOverlap(document.placements[i],document.placements[j]),false);
}
test("과거 작은·큰·겹친 배치는 ID·소속을 유지해 안전한 보기로 변환하며 원본을 변경하지 않는다",()=>{
 const legacy={...empty(),placements:Array.from({length:8},(_,n)=>({pointId:point(n),roomId:room,x:1,y:1,width:n%2?8:80,height:n%2?8:80}))};
 const original=structuredClone(legacy),view=readableFloorDocument(legacy);bounded(view);assert.deepEqual(legacy,original);assert.deepEqual(view.placements.map(p=>p.pointId),legacy.placements.map(p=>p.pointId));assert.equal(readableFloorDocument(view),view);
});
test("최소 크기 200개를 한정된 공간에 겹침·축소 없이 배치한다",()=>{
 const full=placeNewFloorPoints(empty(),Array.from({length:200},(_,n)=>point(n)),room);assert.equal(full.placements.length,200);bounded(full);
});
test("새 버전의 임의 최소/최대 위반·경계 초과·겹침을 저장 형식에서 거부한다",()=>{
 const valid=placeNewFloorPoints(empty(),[point(1),point(2)],room);bounded(valid);
 for(const bad of [{width:limits.minWidth-.01},{width:limits.maxWidth+.01},{height:limits.minHeight-.01},{height:limits.maxHeight+.01},{x:100},{x:valid.placements[1].x,y:valid.placements[1].y}])assert.throws(()=>normalizeFloorDocument({...valid,placements:[{...valid.placements[0],...bad},valid.placements[1]]}));
 const small=constrainFloorRect({x:-10,y:200,width:0,height:0});bounded({...empty(),layoutVersion:2,placements:[{pointId:point(3),roomId:room,...small}]});
});
test("다른 룸으로 이동할 때 기존 영역 위에 겹쳐 넣지 않고 빈 곳을 택한다",()=>{
 let document=placeNewFloorPoints(empty(),[point(1)],room);document=placeNewFloorPoints(document,[point(2)],other);document=moveFloorPoint(document,point(1),other);bounded(document);assert.equal(document.placements.find(p=>p.pointId===point(1))?.roomId,other);assert.equal(document.placements.filter(p=>p.roomId===other).length,2);
});
test("큰 영역으로 공간이 차면 새 항목을 축소·겹침 배치하지 않고 오류를 돌려준다",()=>{
 let document:FloorDocument={...empty(),layoutVersion:2,placements:[]};
 for(let y=0;y+limits.maxHeight<=100;y+=limits.maxHeight)for(let x=0;x+limits.maxWidth<=100;x+=limits.maxWidth)document.placements.push({pointId:point(document.placements.length+1),roomId:room,x,y,width:limits.maxWidth,height:limits.maxHeight});
 for(let n=100;n<199;n++){try{document=placeNewFloorPoints(document,[point(n)],room);}catch{break;}}
 const before=structuredClone(document);assert.throws(()=>placeNewFloorPoints(document,[point(199)],room),/빈 배치 공간/);assert.deepEqual(document,before);
});

test("200개가 같은 위치에 저장된 과거 배치도 읽기 보정으로 모두 보존한다",()=>{
 const legacy={...empty(),placements:Array.from({length:200},(_,n)=>({pointId:point(n),roomId:room,x:1,y:1,width:80,height:80}))};
 const view=readableFloorDocument(legacy);assert.equal(view.placements.length,200);bounded(view);assert.equal(legacy.placements[0].width,80);
});
