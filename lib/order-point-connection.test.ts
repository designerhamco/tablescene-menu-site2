import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DEFAULT_ORDER_POINT_POLICY } from "./order-point-policy";
import { orderPointConnectionLabel, type OrderPointConnectionState } from "./order-point-connection";
import TableTerminalConnections from "../components/mypage/TableTerminalConnections";
import { OrderPointFeatureControls, OrderPointConnectionControl, OrderPointArchiveControl } from "../components/mypage/OrderPointControls";
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
    assert.match(html,/해당 없음/);assert.match(html,/aria-label="2번 테이블 기기 연결 안내"/);assert.doesNotMatch(html,/2번 테이블 (?:연결하기|연결 관리)/);
    const existing=renderToStaticMarkup(createElement(OrderPointConnectionControl,{point:{...p,policy:{...p.policy,terminalOrderEnabled:false,terminalCallEnabled:false}},state:connected,onConnect:()=>{}}));
    assert.match(existing,/해당 없음/);assert.match(existing,/aria-label="2번 테이블 기기 연결 안내"/);assert.doesNotMatch(existing,/2번 테이블 (?:연결하기|연결 관리)/);
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

test("기기 사용·키오스크·조회 실패에는 필요한 연결 진입을 유지한다",()=>{
  for(const [p,state,label,action] of [[point,connected,"연결됨","연결 관리"],[{...point,kind:"kiosk" as const},disconnected,"미연결","연결하기"],[point,{available:false,connections:[]},"확인 불가","연결 확인"]] as const){
    const html=renderToStaticMarkup(createElement(OrderPointConnectionControl,{point:p,state:{...state,connections:[...state.connections]},onConnect:()=>{}}));
    assert.match(html,new RegExp(label));assert.match(html,new RegExp(action));
  }
});

test("연결 처리 중에는 실제 진행률을 만들지 않고 공통 로딩 상태와 중복 실행 방지를 표시한다",()=>{
 const html=renderToStaticMarkup(createElement(TableTerminalConnections,{menuSiteId:"site",table:point,connections:[],available:true,currentTableId:null,currentKnown:true,published:true,device:{kind:"PC",os:"macOS",model:"모델 확인 불가",browser:"Chrome"},pending:true,action:()=>{}}));
 assert.match(html,/role="status"/);assert.match(html,/기기 연결 설정을 처리하고 있습니다/);assert.match(html,/aria-busy="true"/);
 assert.match(html.match(/<button[^>]*value="register-terminal"[^>]*>/)?.[0] ?? "",/disabled=""/);
 assert.doesNotMatch(html,/aria-valuenow/);
});

test("테이블·키오스크 관리 연결창은 연결 후에도 메뉴판 열기 진입을 노출하지 않는다",()=>{
 const html=renderToStaticMarkup(createElement(TableTerminalConnections,{menuSiteId:"site",table:point,connections:[],available:true,currentTableId:point.id,currentKnown:true,published:true,device:{kind:"PC",os:"macOS",model:"모델 확인 불가",browser:"Chrome"},pending:false,showMenuOpen:false,action:()=>{}}));
 assert.doesNotMatch(html,/open-terminal-menu|메뉴판 열기/);assert.match(html,/연결되어 있습니다/);
});

test("저장 전 항목은 연결·수신을 막고 추가 취소만 초안 편집으로 처리한다",()=>{
 const draft={...point,draft:true};
 const connection=renderToStaticMarkup(createElement(OrderPointConnectionControl,{point:draft,state:disconnected,onConnect:()=>assert.fail()}));
 assert.match(connection,/저장 필요/);assert.doesNotMatch(connection,/<button/);
 const controls=renderToStaticMarkup(createElement(OrderPointFeatureControls,{menuSiteId:"site",point:draft,feature:"orders",connectionState:connected,onConnect:()=>assert.fail(),onUpdate:async()=>{assert.fail();}}));
 for(const button of controls.match(/<button[^>]*role="switch"[^>]*>/g)??[])assert.match(button,/disabled=""/);
 assert.doesNotMatch(controls,/aria-checked="true"/);
 const cancel=renderToStaticMarkup(createElement(OrderPointArchiveControl,{menuSiteId:"site",point:draft,action:()=>{}}));
 assert.match(cancel,/data-unsaved-commit="true"/);assert.match(cancel,/추가 취소/);
});
