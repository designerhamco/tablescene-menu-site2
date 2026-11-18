"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import styles from "./ServiceStackStory.module.css";
import { SERVICE_HOME_SECTIONS, type HomeService } from "@/lib/service-home-navigation";

/** Read a long panel completely before its last viewport is covered by the next panel. */
export default function ServiceStackPanel({ kind, children }: { kind: HomeService; children: ReactNode }) {
  const root=useRef<HTMLElement>(null),[height,setHeight]=useState<number>();
  useEffect(()=>{
    const element=root.current;if(!element)return;
    const observer=new ResizeObserver(()=>setHeight(element.offsetHeight));
    observer.observe(element);
    return()=>observer.disconnect();
  },[]);
  return <><div id={SERVICE_HOME_SECTIONS[kind]} className={styles.anchor} data-service-anchor={kind} aria-hidden="true"/><section ref={root} id={`${SERVICE_HOME_SECTIONS[kind]}-panel`} className={styles.panel} data-service-panel={kind} aria-labelledby={`service-${kind}-heading`} style={height?{"--service-panel-height":`${height}px`} as CSSProperties:undefined}>
    {children}
  </section></>;
}
