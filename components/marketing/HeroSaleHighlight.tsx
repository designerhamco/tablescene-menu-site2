"use client";

import { useEffect, useRef, type RefObject } from "react";
import type { HeroScreenRect } from "@/lib/hero-cafe-motion";
import styles from "./HomeHeroMotion.module.css";

type Props = {
  stage: RefObject<HTMLDivElement | null>;
  target: HeroScreenRect | null;
  minimumScale: number;
  pulse: { spread: number; opacity: number } | null;
};

/** A screen-space annotation, outside the photograph and projected menu. */
export default function HeroSaleHighlight({stage,target,minimumScale,pulse}: Props) {
  const outline=useRef<HTMLDivElement>(null);
  const active=Boolean(target&&pulse);
  useEffect(()=>{
    if(!active||!target)return;
    let raf=0,lastKey="";
    const preference=window.matchMedia("(prefers-reduced-motion: reduce)");
    const update=()=>{
      const host=outline.current,root=stage.current;
      const canvas=root?.querySelector<HTMLElement>('[data-hero-plane="counter"] [data-hero-canvas]');
      const screen=canvas?.querySelector<HTMLElement>('[data-hero-screen]');
      if(host&&root&&canvas&&screen){
        const frame=canvas.parentElement!;
        const key=[canvas.style.transform,screen.style.transform,frame.style.left,root.clientWidth,root.clientHeight,minimumScale].join("|");
        if(key!==lastKey){
          lastKey=key;
          const base=canvas.getBoundingClientRect(),origin=root.getBoundingClientRect(),scale=base.width/1536;
          const matrix=new DOMMatrix(screen.style.transform);
          const corners=[[target.left,target.top],[target.left+target.width,target.top],[target.left+target.width,target.top+target.height],[target.left,target.top+target.height]].map(([x,y])=>{
            const point=matrix.transformPoint(new DOMPoint(x*screen.offsetWidth,y*screen.offsetHeight));
            return [base.left-origin.left+point.x/point.w*scale,base.top-origin.top+point.y/point.w*scale];
          });
          const left=Math.min(...corners.map(p=>p[0])),top=Math.min(...corners.map(p=>p[1]));
          host.style.left=`${left-12}px`;host.style.top=`${top-10}px`;
          host.style.width=`${Math.max(...corners.map(p=>p[0]))-left+24}px`;
          host.style.height=`${Math.max(...corners.map(p=>p[1]))-top+20}px`;
          host.style.visibility=scale>=minimumScale?"visible":"hidden";
        }
      }
      raf=requestAnimationFrame(update);
    };
    const start=()=>{
      cancelAnimationFrame(raf);
      if(preference.matches){if(outline.current)outline.current.style.visibility="hidden";return;}
      lastKey="";raf=requestAnimationFrame(update);
    };
    preference.addEventListener("change",start);start();
    return()=>{cancelAnimationFrame(raf);preference.removeEventListener("change",start);};
  },[active,target,minimumScale,stage]);
  if(!active||!pulse)return null;
  return <div ref={outline} className={styles.saleHighlight} data-hero-sale-highlight aria-hidden="true" style={{visibility:"hidden"}}>
    <span data-hero-sale-wave style={{inset:-pulse.spread,opacity:pulse.opacity,borderRadius:12+pulse.spread}}/>
  </div>;
}
