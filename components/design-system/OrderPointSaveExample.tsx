"use client";
import { useState } from "react";
import MenuTableManager from "@/app/mypage/menus/[menuId]/tables/MenuTableManager";
import { initialMenuTableActionState } from "@/app/mypage/menus/[menuId]/tables/action-state";
import { DEFAULT_ORDER_POINT_POLICY, orderPointPolicyKey } from "@/lib/order-point-policy";
import type { ManagedOrderPoint } from "@/components/mypage/OrderPointControls";
import type { FloorPlanSnapshot } from "@/lib/menu-floor-plan";
const room="77777777-7777-4777-8777-777777777777", point="88888888-8888-4888-8888-888888888888";
export default function OrderPointSaveExample(){
 const [points,setPoints]=useState<ManagedOrderPoint[]>([{id:point,label:"저장 예시 테이블",kind:"table",status:"active",policy:DEFAULT_ORDER_POINT_POLICY,policyAvailable:true}]);
 const [saved,setSaved]=useState<FloorPlanSnapshot>({available:true,revision:0,document:{rooms:[{id:room,name:"저장 예시 룸",aspectRatio:4/3}],placements:[{pointId:point,roomId:room,x:10,y:20,width:25,height:20}]}});
 const [writes,setWrites]=useState(0);
 return <div className="site-stack-group">
  <p className="type-body-sm" role="status">예시 저장 횟수 {writes} · 저장된 테이블·키오스크 {points.length}개</p>
  <MenuTableManager menuSiteId="example-save" tables={points} floorPlan={saved} pointSettingsAvailable canConfigure published connectionState={{available:true,connections:[]}}
   createPointAction={async(_previous,data)=>{const id=crypto.randomUUID();setPoints(current=>[...current,{id,label:String(data.get("label")),kind:data.get("kind")==="kiosk"?"kiosk":"table",status:"active",policy:DEFAULT_ORDER_POINT_POLICY,policyAvailable:true}]);return{...initialMenuTableActionState,status:"success",tableId:id};}}
   mutatePointAction={async(_previous,data)=>{const id=String(data.get("tableId")); if(data.get("intent")==="rename")setPoints(current=>current.map(p=>p.id===id?{...p,label:String(data.get("label"))}:p));if(data.get("intent")==="archive")setPoints(current=>current.filter(p=>p.id!==id));return{...initialMenuTableActionState,status:"success",tableId:id};}}
   updateFeatureAction={async input=>{setPoints(current=>current.map(p=>p.id===input.tableId?{...p,policy:{...p.policy!,[orderPointPolicyKey(input.channel,input.feature)]:input.enabled}}:p));return{status:"success",message:"예시 화면에만 적용했습니다."};}}
   saveFloorPlanAction={async(revision,document)=>{await new Promise(resolve=>setTimeout(resolve,800));setSaved({available:true,revision:revision+1,document});setWrites(n=>n+1);return{status:"success",revision:revision+1,document};}} />
 </div>;
}
