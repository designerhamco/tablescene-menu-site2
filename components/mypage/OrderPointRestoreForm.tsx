"use client";
import {useId,useRef,useState} from "react";
import {useUnsavedChanges} from "@/components/ui/useUnsavedChanges";
import {FieldActionRow} from "@/app/components/ui/field-action-row";
import {FieldMessage} from "@/app/components/ui/field-message";
import {getOrderPointNameError,orderPointNameKey,type OrderPointLabelError} from "@/lib/order-point-name";
import type {ArchivedMenuTableListItem} from "@/lib/menu-table-management";

export default function OrderPointRestoreForm({point,menuSiteId,operatingPoints,action,pending=false,serverError}:{
  point: Pick<ArchivedMenuTableListItem,"id"|"label"|"kind">;menuSiteId:string;
  operatingPoints:readonly Pick<ArchivedMenuTableListItem,"id"|"label"|"kind">[];
  action:(data:FormData)=>void|Promise<void>;pending?:boolean;serverError?:OrderPointLabelError;
}){
  const [name,setName]=useState(point.label), id=useId(), input=useRef<HTMLInputElement>(null);
  const error=getOrderPointNameError({...point,label:name},operatingPoints) ?? (serverError && orderPointNameKey(serverError.value)===orderPointNameKey(name)?serverError.message:undefined);
  useUnsavedChanges({dirty:name!==point.label,pending:pending&&name!==point.label,discard:()=>setName(point.label)});
  return <form data-unsaved-commit action={action} onSubmit={event=>{if(error){event.preventDefault();input.current?.focus();}}} className="site-field-stack" aria-busy={pending}>
    <input type="hidden" name="menuSiteId" value={menuSiteId}/><input type="hidden" name="tableId" value={point.id}/>
    <label className="type-label" htmlFor={id}>복원할 이름</label>
    <FieldActionRow field={
      <input ref={input} id={id} name="label" required maxLength={80} value={name} readOnly={pending} onChange={event=>setName(event.target.value)} className="site-field w-full" aria-invalid={Boolean(error)} aria-describedby={error?`${id}-error`:undefined}/>
      } action={<button name="intent" value="restore" disabled={pending||Boolean(error)} className="site-button site-button-outline">{pending?"복원 중":`${point.kind==="kiosk"?"키오스크":"테이블"} 복원`}</button>
    }/>
    {error?<FieldMessage id={`${id}-error`} role="alert">{error}</FieldMessage>:null}
  </form>;
}
