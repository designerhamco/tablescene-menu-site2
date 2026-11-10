import assert from "node:assert/strict";
import test from "node:test";
import {createElement as h} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import Summary from "../components/mypage/OrderCardSummary";
import {representativeOperationOrder,type OperationHistoryRecord} from "./operations-history";
const row=(id:string,date:string,processing=false,unpaid=false):OperationHistoryRecord=>({id,pointId:"table",pointLabel:"1번 테이블",summary:`상품 ${id}`,time:date,createdAt:date,status:`상태 ${id}`,attention:processing||unpaid,processing,unpaid,orderNumber:Number(id),amount:`${id},000원`});
test("대표 주문은 가장 오래된 진행 주문·미결제·최근 이력 순이며 각 필드는 같은 주문에 연결한다",()=>{
 const paid=row("1","2020-01-01T00:00:00Z"),unpaid=row("2","2020-01-02T00:00:00Z",false,true),progress=row("3","2020-01-03T00:00:00Z",true),newer=row("4","2020-01-04T00:00:00Z",true,true);
 assert.equal(representativeOperationOrder([newer,paid,unpaid,progress])?.id,"3");assert.equal(representativeOperationOrder([paid,unpaid])?.id,"2");assert.equal(representativeOperationOrder([paid,{...unpaid,unpaid:false}])?.id,"2");
 const html=renderToStaticMarkup(h(Summary,{order:progress,records:[paid,unpaid,progress,newer]}));
 for(const value of ["진행 중 2건 · 미결제 2건","대표 주문 #3","상품 3","상태 3","3,000원","자세히 보기"])assert.ok(html.includes(value),value);
 assert.doesNotMatch(html,/상품 4|대표 주문 금액 4,000원/);
});

test("카드 요약은 상품·옵션만 줄이고 주문과 결제 상태·일시·금액은 별도로 보장한다",()=>{
 const order={...row("3","2026-11-10T14:59:00Z",true,true),orderStatusLabel:"조리 중",paymentStatusLabel:"미결제",options:"우유: 오트 · 샷 추가",summary:"상품 A × 2 · 상품 B × 1"};
 const html=renderToStaticMarkup(h(Summary,{order,records:[order]}));
 for(const text of ["2026.11.10 23:59","조리 중","미결제","상품 A × 2","우유: 오트","3,000원","주문 1건"])assert.ok(html.includes(text),text);
 assert.equal((html.match(/data-slot="badge"/g)??[]).length,2);
 assert.match(html,/data-order-card="products"/);assert.match(html,/data-order-card="options"/);assert.match(html,/dateTime=|datetime=/);
});
