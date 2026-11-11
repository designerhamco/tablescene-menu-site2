/* eslint-disable @next/next/no-img-element */
"use client";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { fitMenuLogo, getMenuLogoAlphaBounds, getMenuLogoBox, type MenuLogoBounds } from "@/lib/menu-brand-logo";
import styles from "./MenuBrandLogo.module.css";

const measurements = new Map<string, Promise<MenuLogoBounds>>();
function measureArtwork(src: string, width: number, height: number): Promise<MenuLogoBounds> {
  const key = `${src}|${width}|${height}`;
  const cached = measurements.get(key); if (cached) return cached;
  const result = new Promise<MenuLogoBounds>(resolve => {
    const full = {x:0,y:0,width,height}, image = new Image();
    let settled = false;
    const done = (value = full) => { if (settled) return; settled = true; clearTimeout(timer); image.onload = null; image.onerror = null; resolve(value); };
    const timer = setTimeout(() => done(), 2500);
    image.crossOrigin = "anonymous";
    image.onerror = () => done();
    image.onload = () => {
      try {
        const scale = Math.min(1, 512 / Math.max(width,height));
        const canvas = document.createElement("canvas"); canvas.width = Math.max(1,Math.round(width*scale)); canvas.height = Math.max(1,Math.round(height*scale));
        const context = canvas.getContext("2d",{willReadFrequently:true}); if (!context) return done();
        context.drawImage(image,0,0,canvas.width,canvas.height);
        const bounds = getMenuLogoAlphaBounds(context.getImageData(0,0,canvas.width,canvas.height).data,canvas.width,canvas.height);
        done({x:bounds.x*width/canvas.width,y:bounds.y*height/canvas.height,width:bounds.width*width/canvas.width,height:bounds.height*height/canvas.height});
      } catch { done(); }
    };
    image.src = src;
  });
  if (measurements.size >= 128) measurements.delete(measurements.keys().next().value!);
  measurements.set(key,result); return result;
}
export default function MenuBrandLogo({src,alt,mobile,topRow,leftAligned=false,className="",defaultDesign=false,imageRef,onError,children}: {
  src:string;alt:string;mobile:boolean;topRow:boolean;leftAligned?:boolean;className?:string;defaultDesign?:boolean;
  imageRef?:RefObject<HTMLImageElement|null>;onError:()=>void;children?:ReactNode;
}) {
  const slot = useRef<HTMLDivElement>(null), image = useRef<HTMLImageElement>(null);
  const [source,setSource] = useState<{src:string;width:number;height:number;bounds:MenuLogoBounds;measured:boolean}|null>(null);
  const [fit,setFit] = useState<ReturnType<typeof fitMenuLogo>>(null);
  useEffect(() => {
    const img = image.current; if (!img) return; let disposed = false;
    const loaded = () => {
      if (!img.naturalWidth) return;
      const width=img.naturalWidth,height=img.naturalHeight;
      setSource({src,width,height,bounds:{x:0,y:0,width,height},measured:false});
      void measureArtwork(src,width,height).then(bounds => {if(!disposed)setSource({src,width,height,bounds,measured:true});});
    };
    img.addEventListener("load",loaded); if(img.complete)loaded();
    return () => {disposed=true;img.removeEventListener("load",loaded);};
  },[src]);
  useLayoutEffect(() => {
    const root=slot.current; if(!root||!source||source.src!==src)return;
    let frame=0;
    const measure=() => {
      frame=0; const width=root.getBoundingClientRect().width;
      const height=topRow&&!mobile?(root.parentElement?.clientHeight||root.clientHeight):0;
      const rem=parseFloat(getComputedStyle(document.documentElement).fontSize)||16;
      let available=Infinity;
      const panel=root.closest<HTMLElement>('.cafe-a-panel-intro,[data-upper-left-intro][data-photo="true"]');
      if(panel){
        const cover=panel.querySelector<HTMLElement>('.cafe-a-cover-frame'),style=cover?getComputedStyle(cover):null;
        const control=panel.querySelector<HTMLElement>('.cafe-a-panel-controls,[data-corner-controls]')?.getBoundingClientRect().height||0;
        const featured=panel.querySelector<HTMLElement>('.cafe-a-featured-copy')?.getBoundingClientRect().height||0;
        const copy=root.parentElement?.querySelector<HTMLElement>('.cafe-a-store-description')?.getBoundingClientRect().height||0;
        available=Math.max(0,panel.clientHeight-control-Math.max(control,featured)-copy-(parseFloat(style?.paddingTop||'0')+parseFloat(style?.paddingBottom||'0'))-3*.75*rem);
      }
      const next=fitMenuLogo(source.width,source.height,source.bounds,getMenuLogoBox(width,height,mobile,topRow,rem,available));
      setFit(previous=>JSON.stringify(previous)===JSON.stringify(next)?previous:next);
    };
    const schedule=()=>{if(!frame)frame=requestAnimationFrame(measure);};
    const observer=new ResizeObserver(schedule);observer.observe(root);if(topRow&&root.parentElement)observer.observe(root.parentElement);
    const panel=root.closest<HTMLElement>('.cafe-a-panel-intro,[data-upper-left-intro][data-photo="true"]');
    if(panel){observer.observe(panel);for(const el of panel.querySelectorAll<HTMLElement>('.cafe-a-store-description,.cafe-a-featured-copy'))observer.observe(el);}
    schedule();return()=>{cancelAnimationFrame(frame);observer.disconnect();};
  },[source,src,mobile,topRow]);
  const geometry=fit?{"--menu-logo-width":`${fit.width}px`,"--menu-logo-height":`${fit.height}px`,"--menu-logo-image-width":`${fit.imageWidth}px`,"--menu-logo-image-height":`${fit.imageHeight}px`,"--menu-logo-left":`${fit.left}px`,"--menu-logo-top":`${fit.top}px`}:{};
  return <div ref={slot} className={`cafe-a-store-logo-wrap min-w-0 ${styles.slot}`} data-cafe-a-store-logo="" data-menu-logo-slot data-menu-logo-ratio={source?.src===src?source.bounds.height/source.bounds.width:undefined} data-menu-logo-device={mobile?"mobile":"desktop"} data-menu-logo-layout={!mobile&&topRow?"top-row":"body"} data-menu-logo-ready={fit&&source?.src===src?"true":"false"} data-menu-logo-measured={source?.src===src&&source.measured?"true":"false"} style={{...geometry,...(!mobile&&topRow?{"--menu-logo-justify":leftAligned?"flex-start":"center"}:{})} as CSSProperties}>
    <div className={styles.box} data-menu-logo-box><img ref={element=>{image.current=element;if(imageRef)imageRef.current=element;}} src={src} alt={alt} className={`cafe-a-store-logo ${className} ${styles.image}`} data-menu-logo-image data-default-design-logo={defaultDesign?"":undefined} onError={onError}/></div>
    {children}
  </div>;
}
