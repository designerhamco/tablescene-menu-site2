import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DEFAULT_ORDER_POINT_POLICY } from "./order-point-policy";
import { orderPointConnectionLabel, type OrderPointConnectionState } from "./order-point-connection";
import { OrderPointFeatureControls } from "../components/mypage/OrderPointControls";
const point = {id:"point",label:"2번 테이블",kind:"table" as const,status:"active" as const,policyAvailable:true,policy:DEFAULT_ORDER_POINT_POLICY};
const connected: OrderPointConnectionState = {available:true,connections:[{tableId:"point",device:null}]};
const disconnected: OrderPointConnectionState = {available:true,connections:[]};
test("매장 기기 연결 상태는 주문·호출의 채널 허용과 별개다",()=>{
  assert.equal(orderPointConnectionLabel(point.id,disconnected),"미연결");
  assert.equal(orderPointConnectionLabel(point.id,connected),"연결됨");
  assert.equal(orderPointConnectionLabel("other-point",connected),"미연결");
  assert.equal(orderPointConnectionLabel(point.id,{available:false,connections:[]}),"확인 불가");
});
test("미연결·조회 실패는 태블릿과 키오스크 스위치만 막고 모바일 스위치는 유지한다",()=>{
  for(const kind of ["table","kiosk"] as const) for(const feature of ["orders","calls"] as const) for(const connectionState of [disconnected,{available:false,connections:[]}]) {
    const html=renderToStaticMarkup(createElement(OrderPointFeatureControls,{menuSiteId:"site",point:{...point,kind},feature,connectionState,onUpdate:async()=>({status:"success" as const,message:"saved"})}));
    const switches=html.split("<button").slice(1).filter(part=>part.includes('role="switch"')).map(part=>part.split('</button>')[0]);
    assert.match(switches[0],/disabled=""/); assert.match(switches[0],/aria-checked="false"/);
    assert.match(html,/확인 필요/);
    if(kind==="table"){assert.equal(switches.length,2);assert.doesNotMatch(switches[1],/disabled=""/);assert.match(switches[1],/aria-checked="true"/);}
    else assert.equal(switches.length,1);
  }
});
