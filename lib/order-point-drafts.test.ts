import assert from "node:assert/strict";
import test from "node:test";
import { saveOrderPointDrafts, type DraftOrderPoint } from "./order-point-drafts";
import type { FloorDocument } from "./menu-floor-plan";
const room="11111111-1111-4111-8111-111111111111", draftId="22222222-2222-4222-8222-222222222222", remote="33333333-3333-4333-8333-333333333333";
const point:DraftOrderPoint={id:draftId,label:"새 테이블",kind:"table",roomId:room};
const document=():FloorDocument=>({rooms:[{id:room,name:"홀",aspectRatio:4/3}],placements:[{pointId:draftId,roomId:room,x:37,y:14,width:25,height:21}]});
test("명시 저장에서 등록·이름·배치를 저장하고 임시 ID만 실제 ID로 바꾼다",async()=>{
 const source=document(), calls:string[]=[];
 const result=await saveOrderPointDrafts({revision:2,document:source,added:[point],names:{[draftId]:"수정된 이름"},committedIds:{},
 create:async input=>{assert.deepEqual(input,point);calls.push("create");return{status:"success",tableId:remote,message:""};},
 rename:async(id,name)=>{assert.equal(id,remote);assert.equal(name,"수정된 이름");calls.push("rename");return{status:"success",message:""};},
 onCreated:(id,value)=>{assert.equal(id,draftId);assert.equal(value,remote);calls.push("remember");},
 saveLayout:async(revision,doc)=>{assert.equal(revision,2);assert.deepEqual(doc.placements[0],{...source.placements[0],pointId:remote});calls.push("layout");return{status:"success",revision:3,document:doc};}});
 assert.equal(result.status,"success");assert.deepEqual(calls,["create","remember","rename","layout"]);assert.equal(source.placements[0].pointId,draftId);
});
test("일부 등록 뒤 배치 저장 실패는 성공으로 바꾸지 않고 재시도에서 같은 항목을 만들지 않는다",async()=>{
 const committed:Record<string,string>={};let creates=0;
 const args={revision:2,document:document(),added:[point],names:{},committedIds:committed,
 create:async()=>{creates++;return{status:"success",tableId:remote,message:""};},rename:async()=>{throw new Error("no rename");},onCreated:(id:string,value:string)=>{committed[id]=value;}};
 const failed=await saveOrderPointDrafts({...args,saveLayout:async()=>({status:"error",message:"다른 화면에서 변경됨"})});
 assert.equal(failed.status,"error");if(failed.status==="error")assert.match(failed.message,/일부 등록.*초안은 유지/);
 const retry=await saveOrderPointDrafts({...args,saveLayout:async(revision,doc)=>({status:"success",revision:revision+1,document:doc})});
 assert.equal(retry.status,"success");assert.equal(creates,1);
});
test("등록 실패 시 이름·배치를 쓰지 않고 기존 초안을 바꾸지 않는다",async()=>{
 const source=document();const result=await saveOrderPointDrafts({revision:2,document:source,added:[point],names:{},committedIds:{},create:async()=>({status:"error",tableId:null,message:"중복 이름"}),rename:async()=>{throw new Error("must not rename");},saveLayout:async()=>{throw new Error("must not save");},onCreated:()=>assert.fail()});
 assert.equal(result.status,"error");if(result.status==="error")assert.match(result.message,/중복 이름/);assert.deepEqual(source,document());
});
test("이름 저장 오류는 배치 저장으로 넘어가지 않고 재시도할 오류를 유지한다",async()=>{
 const result=await saveOrderPointDrafts({revision:2,document:document(),added:[],names:{[remote]:"이름"},committedIds:{},create:async()=>{throw new Error("must not create");},rename:async()=>({status:"error",message:"권한 없음"}),saveLayout:async()=>{throw new Error("must not save");},onCreated:()=>assert.fail()});
 assert.equal(result.status,"error");if(result.status==="error")assert.match(result.message,/권한 없음/);
});
