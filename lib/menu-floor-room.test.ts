import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import ts from "typescript";
import * as floor from "./menu-floor-plan";
import {normalizeMenuTableId} from "./menu-table-validation";
const a="11111111-1111-4111-8111-111111111111",b="22222222-2222-4222-8222-222222222222",p="33333333-3333-4333-8333-333333333333",q="44444444-4444-4444-8444-444444444444",site="55555555-5555-4555-8555-555555555555";
const doc=():floor.FloorDocument=>({rooms:[{id:a,name:"홀",aspectRatio:4/3},{id:b,name:"테라스",aspectRatio:4/3}],placements:[{pointId:p,roomId:a,x:5,y:5,width:20,height:16},{pointId:q,roomId:a,x:30,y:5,width:20,height:16}]});
const request=(mode:"move"|"archive"="move"):floor.FloorRoomRemoval=>({roomId:a,mode,targetRoomId:b,pointIds:[p,q]});
test("배치 해제 후에도 룸 소속을 보존하며 모두 이동은 미배치 소속도 이동한다",()=>{
 const d=floor.normalizeFloorDocument(floor.removeFloorPlacement(doc(),p));
 assert.equal(floor.floorMemberships(d).find(item=>item.pointId===p)?.roomId,a);
 const moved=floor.resolveFloorRoomRemoval(d,request(),[p,q]);
 assert.equal(moved.rooms.length,1);assert.ok(floor.floorMemberships(moved).every(item=>item.roomId===b));
 assert.equal(moved.placements.length,1);assert.equal(moved.placements[0].pointId,q);
 const renamed=floor.renameSavedFloorRoom(d,d.rooms[0],"새 이름");assert.equal(floor.floorMemberships(renamed).length,2);
});
test("보관 정리는 대상 룸과 소속만 제거하며 새 룸으로 임의 배치하지 않는다",()=>{
 const removed=floor.resolveFloorRoomRemoval(doc(),request("archive"),[p,q]);
 assert.deepEqual(removed.placements,[]);assert.deepEqual(removed.memberships,[]);assert.equal(removed.rooms[0].id,b);
 assert.throws(()=>floor.assertFloorMembershipsPreserved(doc(),removed,[p,q]),/이동하거나 보관/);
 floor.assertFloorMembershipsPreserved(doc(),removed,[]);
});
test("다른 룸·변경된 대상·마지막 룸의 미소속 운영 항목을 거부한다",()=>{
 for(const invalid of [{...request(),targetRoomId:a},{...request(),pointIds:[p]},{...request(),pointIds:[p,p]}])assert.throws(()=>floor.resolveFloorRoomRemoval(doc(),invalid,[p,q]));
 const single={rooms:[doc().rooms[0]],placements:[]};
 assert.throws(()=>floor.resolveFloorRoomRemoval(single,{roomId:a,mode:"archive",pointIds:[]},[p]),/소속 룸/);
 assert.deepEqual(floor.resolveFloorRoomRemoval(single,{roomId:a,mode:"archive",pointIds:[]},[]).rooms,[]);
 assert.throws(()=>floor.normalizeFloorDocument({...doc(),memberships:[{pointId:p,roomId:a},{pointId:p,roomId:b}]}));
});
function fixture({denied=false,revision=3,archiveError=false,saveError=false,missing=false}={}){
 let stored=doc();const writes:unknown[]=[];let saves=0,gates=0;const archived:string[]=[];
 const db={from(table:string){const filters:Record<string,unknown>={};let update:unknown;const query={
 select(){return query;},eq(key:string,value:unknown){filters[key]=value;return query;},in(key:string,value:unknown){filters[key]=value;return query;},update(value:unknown){update=value;return query;},
 async maybeSingle(){assert.equal(table,"menu_floor_plans");assert.equal(filters.menu_site_id,site);return{data:{document:stored,revision},error:null};},
 then(resolve:(value:unknown)=>void){assert.equal(table,"menu_tables");assert.equal(filters.menu_site_id,site);if(update){writes.push(update);assert.deepEqual(filters.status,["active","disabled"]);const ids=filters.id as string[];archived.push(...ids);resolve({data:missing?[{id:p}]:ids.map(id=>({id})),error:archiveError?{code:"failure"}:null});}else resolve({data:[{id:p},{id:q}],error:null});}
 };return query;}};
 const deps:Record<string,unknown>={"server-only":{},"@/lib/menu-floor-plan":floor,"@/lib/menu-table-validation":{normalizeMenuTableId},"@/lib/server/menu-table-management-service":{requireMenuTableWriteAccess:async()=>{gates++;if(denied)throw new Error("denied");return{supabase:db,context:{actorUserId:p}};}},"@/lib/server/menu-floor-plan-service":{saveMenuFloorPlan:async(_site:string,version:number,document:floor.FloorDocument)=>{saves++;assert.equal(version,3);if(saveError)throw new Error("conflict");stored=document;return{revision:4,document};}}};
 const source=readFileSync(new URL("./server/menu-floor-room-service.ts",import.meta.url),"utf8"),loaded={exports:{}};
 new Function("require","module","exports",ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)((name:string)=>{assert.ok(name in deps,name);return deps[name];},loaded,loaded.exports);
 return{service:loaded.exports as typeof import("./server/menu-floor-room-service"),writes,archived,counts:()=>({saves,gates}),document:()=>stored};
}
test("룸 이동은 권한·버전·대상 확인 후 배치 한 번만 저장한다",async()=>{
 const f=fixture();const result=await f.service.removeMenuFloorRoom(site,3,request());assert.equal(result.revision,4);assert.equal(f.writes.length,0);assert.equal(f.counts().saves,1);assert.ok(floor.floorMemberships(result.document).every(item=>item.roomId===b));
});
test("모두 보관은 확인된 동일 매장 항목을 한 번에 보관한 뒤 룸을 저장한다",async()=>{
 const f=fixture();await f.service.removeMenuFloorRoom(site,3,request("archive"));assert.equal(f.writes.length,1);assert.deepEqual(f.archived,[p,q]);assert.equal(f.counts().saves,1);assert.equal(f.document().rooms.some(room=>room.id===a),false);
 assert.equal((f.writes[0] as {status:string}).status,"archived");assert.equal("token_hash" in (f.writes[0] as object),false);
});
test("권한·버전·대상 변경은 보관 전 차단하며 보관 실패 시 룸을 유지한다",async()=>{
 for(const [options,version,req] of [[{denied:true},3,request("archive")],[{},2,request("archive")],[{},3,{...request("archive"),pointIds:[p]}]] as const){const f=fixture(options);await assert.rejects(f.service.removeMenuFloorRoom(site,version,req));assert.equal(f.writes.length,0);assert.equal(f.counts().saves,0);}
 for(const options of [{archiveError:true},{missing:true}]){const f=fixture(options);await assert.rejects(f.service.removeMenuFloorRoom(site,3,request("archive")));assert.equal(f.counts().saves,0);assert.ok(f.document().rooms.some(room=>room.id===a));}
});
test("보관 후 저장 충돌은 성공으로 감추지 않고 룸을 유지해 재시도할 수 있다",async()=>{
 const f=fixture({saveError:true});await assert.rejects(f.service.removeMenuFloorRoom(site,3,request("archive")),/항목은 보관됐지만 룸 삭제/);assert.ok(f.document().rooms.some(room=>room.id===a));
});
