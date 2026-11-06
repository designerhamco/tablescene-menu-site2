"use client";
import {useId,useRef,useState} from "react";
import {useUnsavedChanges} from "@/components/ui/useUnsavedChanges";
import {FieldActionRow} from "@/app/components/ui/field-action-row";
import {FieldMessage} from "@/app/components/ui/field-message";
import {getOrderPointNameError,orderPointNameKey,type OrderPointLabelError} from "@/lib/order-point-name";
import type {FloorRoom} from "@/lib/menu-floor-plan";
import type {ArchivedMenuTableListItem} from "@/lib/menu-table-management";

export default function OrderPointRestoreForm({point,menuSiteId,operatingPoints,action,pending=false,serverError,roomId,rooms=[]}:{
  point: Pick<ArchivedMenuTableListItem,"id"|"label"|"kind">;menuSiteId:string;
  operatingPoints:readonly Pick<ArchivedMenuTableListItem,"id"|"label"|"kind">[];
  roomId?:string;rooms?:readonly Pick<FloorRoom,"id"|"name">[];
  action:(data:FormData)=>void|Promise<void>;pending?:boolean;serverError?:OrderPointLabelError;
}){
  const [name,setName]=useState(point.label), id=useId(), input=useRef<HTMLInputElement>(null);
  const [chosenRoomId,setChosenRoomId]=useState("");
  const targetRoomId=rooms.some(room=>room.id===chosenRoomId)?chosenRoomId:rooms.find(room=>room.id===roomId)?.id??rooms[0]?.id??"";
  const error=getOrderPointNameError({...point,label:name},operatingPoints) ?? (serverError && orderPointNameKey(serverError.value)===orderPointNameKey(name)?serverError.message:undefined);
  useUnsavedChanges({dirty:name!==point.label||Boolean(chosenRoomId&&targetRoomId===chosenRoomId&&chosenRoomId!==(roomId??rooms[0]?.id)),pending,discard:()=>{setName(point.label);setChosenRoomId("");}});
  return <form data-unsaved-commit action={action} onSubmit={event=>{if(error||!targetRoomId){event.preventDefault();if(error)input.current?.focus();}}} className="site-field-stack" aria-busy={pending}>
    <input type="hidden" name="menuSiteId" value={menuSiteId}/><input type="hidden" name="tableId" value={point.id}/>
    <div className="site-field-stack"><label className="type-label" htmlFor={`${id}-room`}>복원할 룸</label>
      <select id={`${id}-room`} name="roomId" className="site-field w-full" value={targetRoomId} required disabled={pending||!rooms.length} onChange={event=>setChosenRoomId(event.target.value)}>
        {!rooms.length?<option value="">복원할 룸 없음</option>:rooms.map(room=><option key={room.id} value={room.id}>{room.name}</option>)}
      </select>
    </div>
    <label className="type-label" htmlFor={id}>복원할 이름</label>
    <FieldActionRow field={
      <input ref={input} id={id} name="label" required maxLength={80} value={name} readOnly={pending} onChange={event=>setName(event.target.value)} className="site-field w-full" aria-invalid={Boolean(error)} aria-describedby={error?`${id}-error`:undefined}/>
      } action={<button name="intent" value="restore" disabled={pending||Boolean(error)||!targetRoomId} className="site-button site-button-outline">{pending?"복원 중":`${point.kind==="kiosk"?"키오스크":"테이블"} 복원`}</button>
    }/>
    {!targetRoomId?<p className="type-footnote site-copy-muted">복원할 룸을 먼저 추가하고 선택해 주세요.</p>:null}
    {error?<FieldMessage id={`${id}-error`} role="alert">{error}</FieldMessage>:null}
  </form>;
}
