import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DEFAULT_ORDER_POINT_POLICY } from "./order-point-policy";
import { orderPointConnectionLabel, type OrderPointConnectionState } from "./order-point-connection";
import { OrderPointFeatureControls, OrderPointConnectionControl } from "../components/mypage/OrderPointControls";
const point = {id:"point",label:"2번 테이블",kind:"table" as const,status:"active" as const,policyAvailable:true,policy:DEFAULT_ORDER_POINT_POLICY};
const connected: OrderPointConnectionState = {available:true,connections:[{tableId:"point",device:null}]};
const disconnected: OrderPointConnectionState = {available:true,connections:[]};
test("모바일만 사용하는 테이블은 실제 스위치와 동일하게 해당 없음으로 표시한다",()=>{
  for (const customer of [{customerOrderEnabled:true,customerCallEnabled:false},{customerOrderEnabled:false,customerCallEnabled:true},{customerOrderEnabled:true,customerCallEnabled:true}]) {
    const p={...point,policy:{...point.policy,...customer}};
    assert.equal(orderPointConnectionLabel(p,disconnected),"해당 없음");
    assert.equal(orderPointConnectionLabel({...p,policy:{...p.policy,terminalOrderEnabled:false,terminalCallEnabled:false}},connected),"해당 없음");
    for(const terminal of [{terminalOrderEnabled:true,terminalCallEnabled:false},{terminalOrderEnabled:false,terminalCallEnabled:true}]) assert.equal(orderPointConnectionLabel({...p,policy:{...p.policy,...terminal}},connected),"연결됨");
    assert.equal(orderPointConnectionLabel({...p,kind:"kiosk"},disconnected),"미연결");
    const html=renderToStaticMarkup(createElement(OrderPointConnectionControl,{point:p,state:disconnected,onConnect:()=>{}}));
    assert.match(html,/해당 없음/);assert.match(html,/연결하기/);
  }
  assert.equal(orderPointConnectionLabel({...point,policy:{...point.policy,customerOrderEnabled:false,customerCallEnabled:false}},disconnected),"미연결");
  assert.equal(orderPointConnectionLabel(point,{available:false,connections:[]}),"확인 불가");
  assert.equal(orderPointConnectionLabel({...point,policyAvailable:false},disconnected),"미연결");
});
test("미연결 기기 스위치는 연결 진입이 있으면 OFF 상태로 조작 가능하고 모바일은 독립적이다",()=>{
  for(const kind of ["table","kiosk"] as const) for(const feature of ["orders","calls"] as const){
    const html=renderToStaticMarkup(createElement(OrderPointFeatureControls,{menuSiteId:"site",point:{...point,kind},feature,connectionState:disconnected,onConnect:()=>{},onUpdate:async()=>({status:"success" as const,message:"saved"})}));
    const switches=html.split("<button").slice(1).filter(part=>part.includes('role="switch"')).map(part=>part.split('</button>')[0]);
    assert.doesNotMatch(switches[0],/disabled=""/);assert.match(switches[0],/aria-checked="false"/);
    if(kind==="table") {assert.doesNotMatch(switches[1],/disabled=""/);assert.match(switches[1],/aria-checked="true"/);}
    const readOnly=renderToStaticMarkup(createElement(OrderPointFeatureControls,{menuSiteId:"site",point:{...point,kind},feature,connectionState:disconnected,onConnect:()=>{},readOnly:true,onUpdate:async()=>({status:"success" as const,message:"saved"})}));
    assert.match(readOnly,/disabled=""/);
  }
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
