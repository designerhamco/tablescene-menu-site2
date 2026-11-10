"use client";
import {useEffect,useId,useRef,useState,type ReactNode} from "react";
import {FieldActionRow} from "@/app/components/ui/field-action-row";
import {FieldMessage} from "@/app/components/ui/field-message";
import {Button} from "@/app/components/ui/button";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import {useUnsavedChanges} from "@/components/ui/useUnsavedChanges";
import type {InlineNameResult} from "@/app/components/ui/inline-name-editor";
import type {FloorRoom} from "@/lib/menu-floor-plan";

/** Explicit room-name commits remain independent of table/placement drafts. */
export default function RoomNameForm({room,rooms,pending,saving,focusRoomId,onSave,deleteAction}:{room:FloorRoom;rooms:FloorRoom[];pending:boolean;saving:boolean;focusRoomId?:string;onSave:(id:string,name:string)=>Promise<InlineNameResult>;deleteAction:ReactNode}){
 const [drafts,setDrafts]=useState<Record<string,string>>({}),[failures,setFailures]=useState<Record<string,string>>({});
 const id=useId(),input=useRef<HTMLInputElement>(null),name=drafts[room.id]??room.name;
 const changed=name.trim()!==room.name;
 const duplicate=rooms.some(other=>other.id!==room.id&&other.name.toLocaleLowerCase("ko-KR")===name.trim().toLocaleLowerCase("ko-KR"));
 const error=duplicate?"같은 이름의 룸이 있습니다. 다른 이름을 입력해 주세요.":failures[room.id];
 const dirty=rooms.some(item=>drafts[item.id]!==undefined&&drafts[item.id].trim()!==item.name);
 useUnsavedChanges({dirty,pending,discard:()=>{setDrafts({});setFailures({});}});
 useEffect(()=>{if(room.id===focusRoomId){input.current?.focus();input.current?.select();}},[room.id,focusRoomId]);
 return <form data-unsaved-commit className="site-field-stack" aria-busy={saving} onSubmit={async event=>{
  event.preventDefault();if(pending||!changed||duplicate)return;
  try{
   const result=await onSave(room.id,name);
   if(result.status==="error"){setFailures(current=>({...current,[room.id]:result.message}));input.current?.focus();return;}
   setDrafts(current=>{const next={...current};delete next[room.id];return next;});
   setFailures(current=>{const next={...current};delete next[room.id];return next;});
  }catch{setFailures(current=>({...current,[room.id]:"룸 이름을 저장하지 못했습니다. 다시 시도해 주세요."}));}
 }}>
  <FieldActionRow field={<label className="type-label site-inline-field" htmlFor={id}>룸
   <input ref={input} id={id} name="roomName" className="site-field" required maxLength={40} value={name} readOnly={pending} aria-label="룸 이름" aria-invalid={Boolean(error)} aria-describedby={error?`${id}-error`:undefined} onChange={event=>{setDrafts(current=>({...current,[room.id]:event.target.value}));setFailures(current=>{const next={...current};delete next[room.id];return next;});}}/>
  </label>} action={<div className="site-action-row" data-wrap="nowrap"><Button type="submit" disabled={pending||!changed||duplicate} aria-busy={saving}>{saving?<LoadingSpinner/>:null}{saving?"저장 중":"이름 저장"}</Button>{deleteAction}</div>}/>
  {error?<FieldMessage id={`${id}-error`} role="alert">{error}</FieldMessage>:null}
 </form>;
}
