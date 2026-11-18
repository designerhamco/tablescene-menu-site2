"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import styles from "./ServiceStackStory.module.css";

/** Read a long panel completely before its last viewport is covered by the next panel. */
export default function ServiceStackPanel({ kind, children }: { kind: string; children: ReactNode }) {
  const root=useRef<HTMLElement>(null),[height,setHeight]=useState<number>();
  useEffect(()=>{
    const element=root.current;if(!element)return;
    const observer=new ResizeObserver(()=>setHeight(element.offsetHeight));
    observer.observe(element);
    return()=>observer.disconnect();
  },[]);
  return <section ref={root} id={`service-${kind}`} className={styles.panel} data-service-panel={kind} aria-labelledby={`service-${kind}-heading`} style={height?{"--service-panel-height":`${height}px`} as CSSProperties:undefined}>
    {children}
  </section>;
}
