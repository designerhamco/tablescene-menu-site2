"use client";
import {Hand} from "lucide-react";
import {useRef,useState,type CSSProperties,type PointerEvent,type ReactNode} from "react";
import {Button} from "./button";
import {Tooltip,TooltipContent,TooltipTrigger} from "./tooltip";
import {useIsMobile} from "./use-mobile";
import {FLOOR_GEOMETRY} from "@/lib/menu-floor-plan";
/** The viewing window is bounded; the world never grows as points are dragged. */
export function FloorPlanViewport({name,children}:{name:string;children:ReactNode}){
  const [pan,setPan]=useState(false),drag=useRef<{id:number;x:number;y:number;left:number;top:number}|null>(null);
  const viewport=useRef<HTMLDivElement>(null),mobile=useIsMobile(),panEnabled=pan&&!mobile;
  function end(event:PointerEvent<HTMLDivElement>){if(drag.current?.id!==event.pointerId)return;drag.current=null;if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);}
  return <div className="site-floor-viewport-frame" style={{"--floor-world-width":`${FLOOR_GEOMETRY.width}px`,"--floor-world-height":`${FLOOR_GEOMETRY.height}px`} as CSSProperties}>
    <div className="site-floor-viewport-tools"><Tooltip><TooltipTrigger asChild><Button type="button" variant="ghost" size="icon" className="site-tool-button" aria-label="화면 이동 도구" aria-pressed={pan} onClick={()=>setPan(value=>!value)}><Hand aria-hidden="true"/></Button></TooltipTrigger><TooltipContent>손 도구 · 배경을 끌어 배치도 보기 이동</TooltipContent></Tooltip></div>
    <div ref={viewport} className="site-floor-viewport" data-pan={panEnabled} tabIndex={0} role="region" aria-label={`${name} 배치도 보기 영역`} onPointerDownCapture={event=>{
      if(!panEnabled||event.pointerType==="touch"||event.button!==0||!viewport.current)return;
      event.preventDefault();event.stopPropagation();drag.current={id:event.pointerId,x:event.clientX,y:event.clientY,left:viewport.current.scrollLeft,top:viewport.current.scrollTop};event.currentTarget.setPointerCapture(event.pointerId);
    }} onPointerMove={event=>{const active=drag.current;if(!active||active.id!==event.pointerId||!viewport.current)return;viewport.current.scrollLeft=active.left-(event.clientX-active.x);viewport.current.scrollTop=active.top-(event.clientY-active.y);}} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={()=>{drag.current=null;}} onKeyDownCapture={event=>{
      if(event.key==="Escape"){setPan(false);drag.current=null;return;}
      if(!panEnabled||!["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(event.key))return;
      event.preventDefault();event.stopPropagation();viewport.current?.scrollBy({left:event.key==="ArrowLeft"?-40:event.key==="ArrowRight"?40:0,top:event.key==="ArrowUp"?-40:event.key==="ArrowDown"?40:0});
    }}>{children}</div>
  </div>;
}
