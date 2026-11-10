"use client";
import {useId,useState,useTransition,type FormEvent} from "react";
import {useRouter} from "next/navigation";
import {ContentPanel} from "@/app/components/ui/content-panel";
import {FieldActionRow} from "@/app/components/ui/field-action-row";
import {FieldMessage} from "@/app/components/ui/field-message";
import {Button} from "@/app/components/ui/button";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import {ORDER_STATUSES} from "@/lib/order-management";
import {CUSTOMER_ORDER_STATUS_LABELS} from "@/lib/customer-order-history";
import {ORDER_PAYMENT_STATUSES,orderHistoryDates,orderHistoryHref,type OrderHistoryFilters as Filters} from "@/lib/order-history-query";
const payments:Record<string,string>={unpaid:"미결제",manual_paid:"외부 결제 완료",paid:"PG 결제 완료",cancelled:"결제 취소",refunded:"환불 완료"};
export default function OrderHistoryFilters({path,filters,tables,error,onApply}:{path:string;filters:Filters;tables:{id:string;label:string;archived:boolean}[];error?:string;onApply?:(filters:Filters)=>void}){
  const router=useRouter(),id=useId();const [values,setValues]=useState(filters),[period,setPeriod]=useState(()=>["today","yesterday","week","month"].find(period=>{const dates=orderHistoryDates(period);return dates.from===filters.from&&dates.to===filters.to;})??"custom"),[pending,start]=useTransition();
  const invalid=values.from>values.to;
  function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();if(invalid||pending)return;start(()=>{if(onApply)onApply(values);else router.push(orderHistoryHref(path,values));});}
  const update=(key:keyof Filters,value:string)=>setValues(previous=>({...previous,[key]:value}));
  return <ContentPanel surface="muted" density="controls"><form action={path} method="get" onSubmit={submit} className="site-stack-block" aria-label="주문 이력 조회 조건" aria-busy={pending}>
    <input type="hidden" name="tab" value="history"/>
    <fieldset disabled={pending} className="site-stack-block"><legend className="sr-only">기간과 주문 조건</legend>
      <div className="site-form-row">
        <label className="site-field-stack type-label" htmlFor={`${id}-period`}>조회 기간<select id={`${id}-period`} className="site-field w-full" value={period} onChange={e=>{setPeriod(e.target.value);if(e.target.value!=="custom")setValues(previous=>({...previous,...orderHistoryDates(e.target.value)}));}}><option value="today">오늘</option><option value="yesterday">어제</option><option value="week">최근 7일</option><option value="month">이번 달</option><option value="custom">직접 선택</option></select></label>
        <label className="site-field-stack type-label" htmlFor={`${id}-from`}>시작일<input id={`${id}-from`} className="site-field w-full" name="from" type="date" required value={values.from} onChange={e=>{setPeriod("custom");update("from",e.target.value);}} aria-invalid={invalid} aria-describedby={invalid?`${id}-error`:undefined}/></label>
        <label className="site-field-stack type-label" htmlFor={`${id}-to`}>종료일<input id={`${id}-to`} className="site-field w-full" name="to" type="date" required value={values.to} onChange={e=>{setPeriod("custom");update("to",e.target.value);}} aria-invalid={invalid} aria-describedby={invalid?`${id}-error`:undefined}/></label>
      </div>
      <div className="site-form-row">
        <label className="site-field-stack type-label" htmlFor={`${id}-status`}>주문 상태<select id={`${id}-status`} className="site-field w-full" name="status" value={values.status} onChange={e=>update("status",e.target.value)}><option value="all">전체</option>{ORDER_STATUSES.map(status=><option key={status} value={status}>{CUSTOMER_ORDER_STATUS_LABELS[status]}</option>)}</select></label>
        <label className="site-field-stack type-label" htmlFor={`${id}-payment`}>결제 상태<select id={`${id}-payment`} className="site-field w-full" name="paymentStatus" value={values.paymentStatus} onChange={e=>update("paymentStatus",e.target.value)}><option value="all">전체</option>{ORDER_PAYMENT_STATUSES.map(status=><option key={status} value={status}>{payments[status]}</option>)}</select></label>
        <label className="site-field-stack type-label" htmlFor={`${id}-table`}>테이블·키오스크<select id={`${id}-table`} className="site-field w-full" name="tableId" value={values.tableId} onChange={e=>update("tableId",e.target.value)}><option value="">전체</option>{tables.map(table=><option key={table.id} value={table.id}>{table.label}{table.archived?" (보관)":""}</option>)}</select></label>
      </div>
      <div className="site-field-stack"><label className="type-label" htmlFor={`${id}-number`}>주문번호</label><FieldActionRow field={<input id={`${id}-number`} className="site-field w-full" name="orderNumber" inputMode="numeric" placeholder="예: 1042" value={values.orderNumber} onChange={e=>update("orderNumber",e.target.value)} maxLength={17}/>} action={<Button type="submit" disabled={pending||invalid}>{pending?<LoadingSpinner/>:null}{pending?"조회 중":"조회"}</Button>}/></div>
    </fieldset>
    {invalid||error?<FieldMessage id={`${id}-error`} role="alert">{invalid?"종료일은 시작일보다 빠를 수 없습니다.":error}</FieldMessage>:null}
  </form></ContentPanel>;
}
