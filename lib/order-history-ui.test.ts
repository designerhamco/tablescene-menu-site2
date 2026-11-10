import assert from "node:assert/strict";
import test from "node:test";
import {createElement as h} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {AppRouterContext} from "next/dist/shared/lib/app-router-context.shared-runtime";
import Filters from "../components/mypage/OrderHistoryFilters";
import Navigation from "../components/mypage/OperationFeatureNavigation";
import HistoryTable from "../components/mypage/OperationsHistoryTable";
import {defaultOrderHistoryFilters} from "./order-history-query";
test("기간 오류는 지속 안내와 입력 오류 관계를 표시하고 조회를 막는다",()=>{
 const html=renderToStaticMarkup(h(AppRouterContext.Provider,{value:{push(){}} as never},h(Filters,{path:"/orders",filters:{...defaultOrderHistoryFilters(),from:"2026-11-12",to:"2026-11-10"},tables:[]})));
 assert.match(html,/종료일은 시작일보다 빠를 수 없습니다/);assert.match(html,/aria-invalid="true"/);assert.match(html,/<button[^>]*disabled=""/);assert.match(html,/aria-describedby=/);
});
test("주문 이력 탐색은 현재 주문·설정을 유지하며 선택한 URL 탭만 활성화한다",()=>{
 const html=renderToStaticMarkup(h(Navigation,{menuId:"example",feature:"orders",orderHistory:true,historyAvailable:true,canConfigure:false}));
 assert.match(html,/>현재 주문</);assert.match(html,/<a[^>]*aria-current="page"[^>]*href="\/mypage\/menus\/example\/orders\?tab=history"/);assert.match(html,/>주문 설정</);
});
test("주문 이력의 빈 검색에는 주문이 없는 등록 테이블 행을 덧붙이지 않는다",()=>{
 const floorPlan={available:true,revision:1,document:{rooms:[],placements:[]},points:[{id:"table",label:"테이블 1",status:"active"}]};
 const html=renderToStaticMarkup(h(HistoryTable,{noun:"주문",floorPlan,records:[],includeEmptyPoints:false,renderRecord:()=>null}));
 assert.doesNotMatch(html,/테이블 1/);assert.match(html,/표시할 주문 내역이 없습니다/);
});
