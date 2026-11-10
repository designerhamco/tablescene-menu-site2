import assert from "node:assert/strict";
import test from "node:test";
import {defaultOrderHistoryFilters,normalizeOrderHistory,orderHistoryBounds,orderHistoryDates,parseOrderCursor,encodeOrderCursor,orderCursorPredicate,orderHistoryHref,isCurrentOrder} from "./order-history-query";
const now=new Date("2026-11-09T16:30:00Z"),id="11111111-1111-4111-8111-111111111111";
test("기간 기본값과 빠른 선택은 한국 날짜와 연말·월말을 기준으로 계산한다",()=>{
 assert.deepEqual(orderHistoryDates("today",now),{from:"2026-11-10",to:"2026-11-10"});
 assert.deepEqual(orderHistoryDates("yesterday",now),{from:"2026-11-09",to:"2026-11-09"});
 assert.deepEqual(orderHistoryDates("week",now),{from:"2026-11-04",to:"2026-11-10"});
 assert.deepEqual(orderHistoryDates("month",now),{from:"2026-11-01",to:"2026-11-10"});
 assert.deepEqual(orderHistoryDates("yesterday",new Date("2026-01-01T01:00Z")),{from:"2025-12-31",to:"2025-12-31"});
 assert.deepEqual(orderHistoryBounds(defaultOrderHistoryFilters(now)),{from:"2026-11-09T15:00:00.000Z",until:"2026-11-10T15:00:00.000Z"});
});
test("없는 날짜·역전된 기간·임의 상태·테이블·주문번호와 필터 문법을 거부한다",()=>{
 for(const input of [{from:"2026-02-30"},{from:"2026-11-11",to:"2026-11-10"},{status:"bad"},{paymentStatus:"bad"},{tableId:"x,or(id.eq.secret)"},{orderNumber:"0"},{orderNumber:"1,2"},{status:["received","served"]}])assert.throws(()=>normalizeOrderHistory(input,now));
 assert.equal(normalizeOrderHistory({orderNumber:"#1042",tableId:id},now).filters.orderNumber,"1042");
});
test("복합 페이지 커서는 같은 시간의 주문과 마이크로초를 잃지 않고 양방향 이동한다",()=>{
 const row={created_at:"2026-11-10T03:20:10.123456+00:00",id};const cursor=parseOrderCursor(encodeOrderCursor(row));
 assert.equal(cursor.createdAt,row.created_at);assert.match(orderCursorPredicate(cursor,"older"),/id\.lt\./);assert.match(orderCursorPredicate(cursor,"newer"),/id\.gt\./);
 for(const bad of ["x|"+id,row.created_at+"|bad",row.created_at+"|"+id+"|x"])assert.throws(()=>parseOrderCursor(bad));
 const filters=defaultOrderHistoryFilters(now),href=orderHistoryHref("/orders",filters,{cursor:encodeOrderCursor(row),direction:"older"});
 const parsed=normalizeOrderHistory(Object.fromEntries(new URL(href,"https://example.com").searchParams),now);
 assert.deepEqual(parsed.filters,filters);assert.deepEqual(parsed.cursor,cursor);
});
test("오래된 미처리·제공완료 미결제는 현재 주문에 남고 취소·제공완료 결제는 이력에 남는다",()=>{
 for(const status of ["received","accepted","cooking","ready"])assert.equal(isCurrentOrder({status,paymentStatus:"paid"}),true);
 assert.equal(isCurrentOrder({status:"served",paymentStatus:"unpaid"}),true);
 assert.equal(isCurrentOrder({status:"served",paymentStatus:"paid"}),false);
 assert.equal(isCurrentOrder({status:"cancelled",paymentStatus:"unpaid"}),false);
});
