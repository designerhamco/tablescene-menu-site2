"use client";
import {useId,useState} from "react";
import {Button} from "@/app/components/ui/button";
import {Dialog,DialogTrigger,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogFooter} from "@/app/components/ui/dialog";
import {FieldActionRow} from "@/app/components/ui/field-action-row";
import type {FloorRoom} from "@/lib/menu-floor-plan";

export default function OrderPointMoveDialog({point,rooms,roomId,disabled,onMove}:{
  point:{label:string};rooms:FloorRoom[];roomId?:string;disabled:boolean;onMove:(roomId:string)=>void;
}) {
  const [open,setOpen]=useState(false),[target,setTarget]=useState("");const id=useId();
  const destinations=rooms.filter(room=>room.id!==roomId);
  const selected=destinations.find(room=>room.id===target)?.id??destinations[0]?.id??"";
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><Button variant="outline" size="compact" disabled={disabled} aria-label={`${point.label} 이동`}>이동</Button></DialogTrigger>
    <DialogContent>
      <DialogHeader><DialogTitle>‘{point.label}’ 룸 이동</DialogTitle><DialogDescription>이동할 룸을 선택해 주세요. 이동 결과는 하단 저장 버튼으로 확정합니다.</DialogDescription></DialogHeader>
      <div className="site-field-stack"><label className="type-label" htmlFor={id}>이동할 룸</label>
        <FieldActionRow field={<select id={id} className="site-field w-full" value={selected} disabled={disabled||!destinations.length} onChange={event=>setTarget(event.target.value)}>
          {!destinations.length?<option value="">이동할 다른 룸 없음</option>:destinations.map(room=><option key={room.id} value={room.id}>{room.name}</option>)}
        </select>} action={<Button disabled={disabled||!selected} onClick={()=>{onMove(selected);setOpen(false);}}>이동</Button>}/>
        {!destinations.length?<p className="type-footnote site-copy-muted">룸을 추가하면 다른 룸으로 이동할 수 있습니다.</p>:null}
      </div>
      <DialogFooter><Button variant="outline" onClick={()=>setOpen(false)}>취소</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}
