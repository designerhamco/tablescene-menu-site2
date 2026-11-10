"use client";
import {useEffect,useId,useRef,useState,type ReactNode} from "react";
import {FieldActionRow} from "@/app/components/ui/field-action-row";
import {FieldMessage} from "@/app/components/ui/field-message";
import {Button} from "@/app/components/ui/button";
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from "@/app/components/ui/select";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import {useUnsavedChanges} from "@/components/ui/useUnsavedChanges";
import {FLOOR_ROOM_ICONS} from "@/lib/floor-room-icons";
import type {InlineNameResult} from "@/app/components/ui/inline-name-editor";
import type {FloorRoom} from "@/lib/menu-floor-plan";

type Draft={name:string;emoji:string};
/** Name and icon unlock together; explicit save never commits other layout drafts. */
export default function RoomNameForm({room,rooms,pending,saving,focusRoomId,onSave,deleteAction}:{room:FloorRoom;rooms:FloorRoom[];pending:boolean;saving:boolean;focusRoomId?:string;onSave:(id:string,name:string,emoji?:string)=>Promise<InlineNameResult>;deleteAction:ReactNode}){
 const [drafts,setDrafts]=useState<Record<string,Draft>>({}),[failures,setFailures]=useState<Record<string,string>>({}),[editing,setEditing]=useState<Record<string,boolean>>({});
 const id=useId(),input=useRef<HTMLInputElement>(null),editButton=useRef<HTMLButtonElement>(null);
 const value=drafts[room.id]??{name:room.name,emoji:room.emoji??""},unlocked=Boolean(editing[room.id]);
 const changed=value.name.trim()!==room.name||value.emoji!==(room.emoji??"");
 const duplicate=rooms.some(other=>other.id!==room.id&&other.name.toLocaleLowerCase("ko-KR")===value.name.trim().toLocaleLowerCase("ko-KR"));
 const error=duplicate?"같은 이름의 룸이 있습니다. 다른 이름을 입력해 주세요.":failures[room.id];
 const dirty=rooms.some(item=>drafts[item.id]&&(drafts[item.id].name.trim()!==item.name||drafts[item.id].emoji!==(item.emoji??"")));
 useUnsavedChanges({dirty,pending,discard:()=>{setDrafts({});setFailures({});setEditing({});}});
 useEffect(()=>{if(room.id===focusRoomId)editButton.current?.focus();},[room.id,focusRoomId]);
 function update(next:Partial<Draft>){setDrafts(current=>({...current,[room.id]:{...value,...next}}));setFailures(current=>{const copy={...current};delete copy[room.id];return copy;});}
 function finish(){setDrafts(current=>{const next={...current};delete next[room.id];return next;});setFailures(current=>{const next={...current};delete next[room.id];return next;});setEditing(current=>({...current,[room.id]:false}));}
 return <form data-unsaved-commit className="site-field-stack" aria-busy={saving} onSubmit={async event=>{
  event.preventDefault();if(pending||!unlocked||duplicate)return;if(!changed){finish();return;}
  try{const result=await onSave(room.id,value.name,value.emoji);if(result.status==="error"){setFailures(current=>({...current,[room.id]:result.message}));input.current?.focus();return;}finish();}
  catch{setFailures(current=>({...current,[room.id]:"룸 이름을 저장하지 못했습니다. 다시 시도해 주세요."}));}
 }}>
  <FieldActionRow field={<div className="site-icon-name-field">
   <Select value={value.emoji||"none"} disabled={!unlocked||pending} onValueChange={emoji=>update({emoji:emoji==="none"?"":emoji})}><SelectTrigger iconOnly aria-label="룸 이모지"><SelectValue>{value.emoji||"—"}</SelectValue></SelectTrigger><SelectContent>{FLOOR_ROOM_ICONS.map(icon=><SelectItem key={icon.value||"none"} value={icon.value||"none"}>{icon.value?`${icon.value} ${icon.label}`:icon.label}</SelectItem>)}</SelectContent></Select>
   <input ref={input} id={id} name="roomName" className="site-field" required maxLength={40} value={value.name} disabled={!unlocked||pending} aria-label="룸 이름" aria-invalid={Boolean(error)} aria-describedby={error?`${id}-error`:undefined} onChange={event=>update({name:event.target.value})}/>
  </div>} action={<div className="site-action-row" data-wrap="nowrap">{unlocked?<Button type="submit" disabled={pending||duplicate} aria-busy={saving}>{saving?<LoadingSpinner/>:null}{saving?"저장 중":"저장"}</Button>:<Button ref={editButton} type="button" variant="outline" disabled={pending} onClick={event=>{event.preventDefault();setEditing(current=>({...current,[room.id]:true}));requestAnimationFrame(()=>input.current?.focus());}}>수정</Button>}{deleteAction}</div>}/>
  {error?<FieldMessage id={`${id}-error`} role="alert">{error}</FieldMessage>:null}
 </form>;
}
