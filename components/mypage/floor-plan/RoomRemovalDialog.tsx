"use client";
import {useId,useState,type RefObject} from "react";
import {Trash2} from "lucide-react";
import {Button} from "@/app/components/ui/button";
import {Dialog,DialogTrigger,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogFooter} from "@/app/components/ui/dialog";
import {Tooltip,TooltipTrigger,TooltipContent} from "@/app/components/ui/tooltip";
import {FieldActionRow} from "@/app/components/ui/field-action-row";
import {FieldMessage} from "@/app/components/ui/field-message";
import {LoadingState} from "@/app/components/ui/loading-state";
import type {FloorPoint,FloorRoom,FloorRoomRemoval} from "@/lib/menu-floor-plan";

export default function RoomRemovalDialog({open,onOpenChange,room,rooms,points,pending,disabled,dirty,error,saved,onSave,onRemove,returnFocusRef}:{
 open:boolean;onOpenChange:(open:boolean)=>void;room?:FloorRoom;rooms:FloorRoom[];points:FloorPoint[];pending:boolean;disabled:boolean;dirty:boolean;error:string|null;saved:boolean;onSave:()=>void;onRemove:(mode:FloorRoomRemoval["mode"],target?:string)=>void;returnFocusRef:RefObject<HTMLButtonElement|null>;
}) {
 const [target,setTarget]=useState("");const id=useId();const other=rooms.filter(item=>item.id!==room?.id);const selected=other.find(item=>item.id===target)?.id??other[0]?.id;
 return <Dialog open={open} onOpenChange={value=>{if(!pending)onOpenChange(value);}}>
  <Tooltip><TooltipTrigger asChild><DialogTrigger asChild><Button variant="ghost" size="icon" disabled={disabled} aria-label="선택한 룸 삭제"><Trash2 aria-hidden="true"/></Button></DialogTrigger></TooltipTrigger><TooltipContent>선택한 룸 삭제</TooltipContent></Tooltip>
  <DialogContent onEscapeKeyDown={e=>{if(pending)e.preventDefault();}} onInteractOutside={e=>{if(pending)e.preventDefault();}} onCloseAutoFocus={e=>{e.preventDefault();returnFocusRef.current?.focus();}}>
   <DialogHeader><DialogTitle>‘{room?.name}’ 룸 삭제</DialogTitle><DialogDescription>{points.length?`테이블·키오스크 ${points.length}개를 ${other.length?"다른 룸으로 모두 이동하거나 보관한 뒤":"모두 보관한 뒤"} 룸을 삭제합니다. 처리 결과는 바로 저장되며 기존 주문·호출 기록은 유지됩니다.`:saved?"비어 있는 룸을 삭제하고 바로 저장합니다.":"아직 저장하지 않은 빈 룸을 삭제합니다."}</DialogDescription></DialogHeader>
   <div className="site-stack-block" aria-busy={pending}>
    {points.length?<ul className="site-copy-list type-body-sm">{points.map(point=><li key={point.id} className="break-words">{point.kind==="kiosk"?"키오스크":"테이블"} · {point.label}</li>)}</ul>:null}
    {dirty?<p className="type-body-sm">저장하지 않은 배치 변경이 있습니다. 먼저 변경을 저장한 뒤 룸을 정리해 주세요.</p>:points.length?<>
     {other.length?<div className="site-field-stack"><label className="type-label" htmlFor={id}>모두 이동할 룸</label><FieldActionRow field={<select id={id} className="site-field w-full" value={selected} disabled={pending} onChange={e=>setTarget(e.target.value)}>{other.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select>} action={<Button variant="default" disabled={pending||!selected} onClick={()=>onRemove("move",selected)}>모두 이동 후 삭제</Button>}/></div>:<p className="type-body-sm site-copy-muted">마지막 룸이므로 다른 룸으로 이동할 수 없습니다. 항목을 모두 보관하면 룸을 삭제할 수 있습니다.</p>}
     <div className="site-field-stack"><Button variant="outline-danger" disabled={pending} onClick={()=>onRemove("archive")}>모두 보관 후 룸 삭제</Button><p className="type-footnote site-copy-muted">보관한 항목은 복원할 수 있으며, 연결된 기기·방문 세션은 종료됩니다.</p></div>
    </>:null}
    {error?<FieldMessage role="alert">{error}</FieldMessage>:null}
    {pending?<LoadingState inline label="룸의 항목을 정리하고 있습니다."/>:null}
   </div>
   <DialogFooter><Button variant="outline" disabled={pending} onClick={()=>onOpenChange(false)}>취소</Button>{dirty?<Button variant="default" disabled={pending} onClick={onSave}>변경 저장</Button>:!points.length?<Button variant="outline-danger" disabled={pending} onClick={()=>onRemove("archive")}>룸 삭제</Button>:null}</DialogFooter>
  </DialogContent>
 </Dialog>;
}
