import {ORDER_STATUSES, normalizeOrderManagementId} from "./order-management";

export const ORDER_HISTORY_PAGE_SIZE=50;
export const ORDER_PAYMENT_STATUSES=["unpaid","manual_paid","paid","cancelled","refunded"] as const;
export type OrderHistoryFilters={from:string;to:string;status:string;paymentStatus:string;tableId:string;orderNumber:string};
export type OrderHistorySearch=Record<string,string|string[]|undefined>;
export type OrderCursor={createdAt:string;id:string};
export type OrderHistoryRequest={filters:OrderHistoryFilters;cursor:OrderCursor|null;direction:"older"|"newer"};
export class OrderHistoryInputError extends Error {}
const dayMs=86400000;
export function koreanDate(now=new Date()){return new Date(now.getTime()+9*3600000).toISOString().slice(0,10);}
export function orderHistoryDates(period:string,now=new Date()){
  const today=koreanDate(now), end=new Date(`${today}T00:00:00Z`);
  if(period==="yesterday"){const yesterday=new Date(end.getTime()-dayMs).toISOString().slice(0,10);return{from:yesterday,to:yesterday};}
  return{from:period==="week"?new Date(end.getTime()-6*dayMs).toISOString().slice(0,10):period==="month"?`${today.slice(0,7)}-01`:today,to:today};
}
export function defaultOrderHistoryFilters(now=new Date()):OrderHistoryFilters{return{...orderHistoryDates("today",now),status:"all",paymentStatus:"all",tableId:"",orderNumber:""};}
function single(params:OrderHistorySearch,key:string){const value=params[key];if(Array.isArray(value))throw new OrderHistoryInputError("조회 조건을 하나씩 선택해 주세요.");return value?.trim()??"";}
function validDate(value:string){return /^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(`${value}T00:00:00Z`))&&new Date(`${value}T00:00:00Z`).toISOString().slice(0,10)===value;}
export function parseOrderCursor(value:string):OrderCursor{
  const [createdAt,id,...extra]=value.split("|");
  if(extra.length||!validDate((createdAt??"").slice(0,10))||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(createdAt??"")||!Number.isFinite(Date.parse(createdAt)))throw new OrderHistoryInputError("페이지 정보를 확인해 주세요. 처음부터 다시 조회해 주세요.");
  try{return{createdAt,id:normalizeOrderManagementId(id)};}catch{throw new OrderHistoryInputError("페이지 정보를 확인해 주세요. 처음부터 다시 조회해 주세요.");}
}
export function encodeOrderCursor(row:{created_at:string;id:string}){return `${row.created_at}|${row.id}`;}
export function normalizeOrderHistory(params:OrderHistorySearch={},now=new Date()):OrderHistoryRequest{
  const defaults=defaultOrderHistoryFilters(now),from=single(params,"from")||defaults.from,to=single(params,"to")||defaults.to;
  if(!validDate(from)||!validDate(to)||from>to)throw new OrderHistoryInputError("시작일과 종료일을 확인해 주세요. 종료일은 시작일보다 빠를 수 없습니다.");
  const status=single(params,"status")||"all",paymentStatus=single(params,"paymentStatus")||"all";
  if(status!=="all"&&!(ORDER_STATUSES as readonly string[]).includes(status))throw new OrderHistoryInputError("주문 상태를 다시 선택해 주세요.");
  if(paymentStatus!=="all"&&!(ORDER_PAYMENT_STATUSES as readonly string[]).includes(paymentStatus))throw new OrderHistoryInputError("결제 상태를 다시 선택해 주세요.");
  const table=single(params,"tableId");let tableId="";
  if(table)try{tableId=normalizeOrderManagementId(table);}catch{throw new OrderHistoryInputError("테이블·키오스크를 다시 선택해 주세요.");}
  const orderNumber=single(params,"orderNumber").replace(/^#/,"");
  if(orderNumber&&(!/^[1-9]\d{0,15}$/.test(orderNumber)||!Number.isSafeInteger(Number(orderNumber))))throw new OrderHistoryInputError("주문번호는 양의 정수로 입력해 주세요.");
  const cursor=single(params,"cursor"),direction=single(params,"direction")||"older";
  if(direction!=="older"&&direction!=="newer")throw new OrderHistoryInputError("페이지 이동 방향을 확인해 주세요.");
  return{filters:{from,to,status,paymentStatus,tableId,orderNumber},cursor:cursor?parseOrderCursor(cursor):null,direction};
}
export function orderHistoryBounds(filters:OrderHistoryFilters){return{from:new Date(`${filters.from}T00:00:00+09:00`).toISOString(),until:new Date(Date.parse(`${filters.to}T00:00:00+09:00`)+dayMs).toISOString()};}
export function orderCursorPredicate(cursor:OrderCursor,direction:"older"|"newer"){
  const compare=direction==="older"?"lt":"gt";
  return `created_at.${compare}.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.${compare}.${cursor.id})`;
}
export function orderHistoryHref(path:string,filters:OrderHistoryFilters,page?:{cursor:string;direction:"older"|"newer"}){
  const params=new URLSearchParams({tab:"history",from:filters.from,to:filters.to});
  for(const key of ["status","paymentStatus","tableId","orderNumber"] as const)if(filters[key]&&filters[key]!=="all")params.set(key,filters[key]);
  if(page){params.set("cursor",page.cursor);params.set("direction",page.direction);}
  return `${path}?${params}`;
}
export function isCurrentOrder(order:{status:string;paymentStatus:string}){return order.status!=="cancelled"&&(order.status!=="served"||order.paymentStatus==="unpaid");}
