"use client";
import {useEffect,useRef,type CSSProperties,type ReactNode} from "react";
import ui from "./MenuInteractionUI.module.css";

export default function OrderPolicyDialog({open,title,children,style,onDismiss}:{open:boolean;title:string;children:ReactNode;style?:CSSProperties;onDismiss:()=>void}) {
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{const dialog=ref.current;if(!dialog)return;if(open&&!dialog.open)dialog.showModal();if(!open&&dialog.open)dialog.close();},[open]);
  return <dialog ref={ref} className={`${ui.typography} m-auto w-[calc(100%_-_2rem)] max-w-sm rounded-2xl border-0 bg-white p-6 text-zinc-950 shadow-lg backdrop:bg-black/40`}
    style={style} aria-label={title} onCancel={event=>{event.preventDefault();onDismiss();}}>
    <h2 className="text-lg font-semibold">{title}</h2><div className="mt-4 space-y-4 text-sm leading-relaxed">{children}</div>
  </dialog>;
}
