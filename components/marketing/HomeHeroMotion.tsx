/* eslint-disable @next/next/no-img-element -- Authored screen composites use pixel-exact geometry and pre-encoded local WebP assets. */
"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { Pause, Play, Hand } from "@/app/components/ui/site-icon";
import { ArrowDown, ArrowRight } from "@/app/components/ui/site-arrow";
import { Button } from "@/app/components/ui/button";
import { HERO_CAFE_CHAPTERS, HERO_CAFE_SCREENS, HERO_TEMPLATE_SCREENS, heroChapterAt, heroScreenMatrix, type HeroQuad } from "@/lib/hero-cafe-motion";
import styles from "./HomeHeroMotion.module.css";

const ASSETS = "/assets/hero-cafe-v1/";
const preview = (template: string, device: string, extra = "") => `/templates/${template}/preview?view=actual&embedded=1&heroDemo=1&device=${device}${extra}`;
const SOURCES = {
  counter: preview("cafe_real_matcha_a", "tablet"),
  dining: preview("dining_aube_table_a", "tablet", "&callPreview=on"),
  phone: preview("cafe_real_matcha_a", "mobile", "&callPreview=on&orderPreview=on&popupPreview=on&widgetsPreview=on&prepayPreview=off"),
};
function Screen({ quad, width=1280, height=800, children, phone=false }: { quad: HeroQuad; width?: number; height?: number; children: ReactNode; phone?: boolean }) {
  return <div className={styles.screen} data-hero-screen style={{width,height,transform:heroScreenMatrix(quad,width,height),borderRadius:phone?40:8}}>{children}</div>;
}
function CapturedScreen({ selected }: { selected: number }) {
  return <>{HERO_TEMPLATE_SCREENS.map((name,index)=><img key={name} src={`${ASSETS}screen-${name}.webp`} width={1280} height={800} alt="" draggable={false} className={styles.captured} data-active={selected===index}/>)}</>;
}

/** Drives only fixed public catalog previews. Those routes use synthetic data and previewOnly actions. */
function LiveMenu({ kind, chapter, playing, reduced, onDetail, highlight=false }: { kind: keyof typeof SOURCES; chapter:number; playing:boolean; reduced:boolean; onDetail?:(point:readonly [number,number])=>void; highlight?:boolean }) {
  const frame=useRef<HTMLIFrameElement>(null), elapsed=useRef(0), performed=useRef(new Set<string>());
  const [step,setStep]=useState("loading"), [orderReceived,setOrderReceived]=useState(false), [ready,setReady]=useState(false), [shellLoaded,setShellLoaded]=useState(false), [cue,setCue]=useState<{x:number;y:number;drag:boolean}|null>(null);
  useEffect(()=>{
    const received=(event:MessageEvent)=>{if(event.origin===location.origin && event.source===frame.current?.contentWindow && event.data?.type==="artimenu-preview-order")setOrderReceived(true);};
    window.addEventListener("message",received);return()=>window.removeEventListener("message",received);
  },[]);
  useEffect(()=>{
    if(!shellLoaded || reduced)return;
    const timer=window.setInterval(()=>{
      const doc=frame.current?.contentDocument;if(!doc)return;
      const native=doc.querySelector('[data-native-ready], [data-paged-ready]');
      if(doc.fonts.status==="loaded" && native?.getAttribute("data-native-ready")!=="false" && native?.getAttribute("data-paged-ready")!=="false") {setReady(true);window.clearInterval(timer);}
    },100);
    return()=>window.clearInterval(timer);
  },[shellLoaded,reduced]);
  useEffect(()=>{ elapsed.current=0; performed.current.clear(); const reset=requestAnimationFrame(()=>setCue(null));return()=>cancelAnimationFrame(reset); },[chapter]);
  useEffect(()=>{
    if (!playing || reduced || !ready) return;
    let last=performance.now();
    const interval=window.setInterval(()=>{
      const now=performance.now(); elapsed.current+=Math.min(200,now-last); last=now;
      const t=elapsed.current/1000, doc=frame.current?.contentDocument;
      if (!doc || !frame.current?.contentWindow || !frame.current.src.includes("/templates/")) return;
      const width=doc.documentElement.clientWidth,height=doc.documentElement.clientHeight;
      const once=(id:string,action:()=>boolean)=>{ if(!performed.current.has(id) && action()) {performed.current.add(id);setStep(id);} };
      const click=(selector:string)=>{
        const target=doc.querySelector<HTMLButtonElement>(selector);
        if(!target || target.disabled) return false;
        const r=target.getBoundingClientRect(); setCue({x:(r.x+r.width/2)/width*100,y:(r.y+r.height/2)/height*100,drag:false});
        target.click(); return true;
      };
      if (kind==="dining") {
        if(t>2) once("page1",()=>click('[aria-label="다음 메뉴 페이지"]'));
        if(t>5) once("page2",()=>click('[aria-label="다음 메뉴 페이지"]'));
        if(t>8) once("call",()=>click('[aria-label="직원 호출하기"]'));
        if(t>10) once("request",()=>click('[aria-label="직원 호출 항목"] button'));
        if(t>12) once("send",()=>click('[data-smart-call-submit]'));
      }
      if (kind==="counter") {
        const scroll=doc.querySelector<HTMLElement>('[data-native-menu], [data-scroll-menu]');
        if(scroll && t>2 && t<4 && !highlight && !performed.current.has("sale")) { scroll.scrollTop=Math.min(scroll.scrollHeight-scroll.clientHeight,(t-2)*70); setCue({x:79,y:70-(t-2)*6,drag:true}); }
        if(scroll && (t>4 || highlight)) once("sale",()=>{
          const sale=doc.querySelector<HTMLElement>('[data-native-tracks] [data-cafe-a-time-sale-digital-timer], [data-scroll-content] [data-cafe-a-time-sale-digital-timer]');if(!sale)return false;
          scroll.scrollTop+=sale.getBoundingClientRect().y-scroll.getBoundingClientRect().y-scroll.clientHeight*.25;return true;
        });
        if(t>5 || highlight) once("focus",()=>{
          const sale=doc.querySelector<HTMLElement>('[data-native-tracks] [data-cafe-a-time-sale-digital-timer], [data-scroll-content] [data-cafe-a-time-sale-digital-timer]');if(!sale)return false;
          const r=sale.getBoundingClientRect(),u=(r.x+r.width/2)/width,v=(r.y+r.height/2)/height,q=HERO_CAFE_SCREENS.counter;
          onDetail?.([q[0][0]*(1-u)*(1-v)+q[1][0]*u*(1-v)+q[2][0]*u*v+q[3][0]*(1-u)*v,q[0][1]*(1-u)*(1-v)+q[1][1]*u*(1-v)+q[2][1]*u*v+q[3][1]*(1-u)*v]);
          setCue({x:u*100,y:v*100,drag:false});return true;
        });
      }
      if(kind==="phone") {
        if(t>2) once("popup",()=>click('[data-menu-advertisement-popup] button[aria-label="닫기"]'));
        if(chapter===4) {
          const scrolling=doc.scrollingElement;
          if(scrolling && t>3 && t<8) { scrolling.scrollTop=(t-3)*230; setCue({x:65,y:72-(t-3)*7,drag:true}); }
          if(t>8) once("item",()=>{ const target=doc.querySelector<HTMLButtonElement>('[aria-label="리얼 맛차 크림 라떼 담기"]'); if(!target)return false; if(doc.scrollingElement)doc.scrollingElement.scrollTop+=target.getBoundingClientRect().y-height*.5;return click('[aria-label="리얼 맛차 크림 라떼 담기"]'); });
          if(t>10) once("add",()=>{const button=[...doc.querySelectorAll<HTMLButtonElement>('button')].find(el=>el.textContent?.includes("· 장바구니 담기"));if(!button)return false;const r=button.getBoundingClientRect();setCue({x:(r.x+r.width/2)/width*100,y:(r.y+r.height/2)/height*100,drag:false});button.click();return true;});
          if(t>12) once("cart",()=>click('[aria-label^="주문하기, 장바구니"]'));
          if(t>14) once("phone",()=>{
            const input=doc.querySelector<HTMLInputElement>('input[type="tel"]');if(!input)return false;
            const setter=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input),"value")?.set;
            setter?.call(input,"01000000000");const event=doc.createEvent("Event");event.initEvent("input",true,true);input.dispatchEvent(event);return true;
          });
          // Submission stays inside the renderer's explicit previewOnly branch; no store receives it.
          if(t>16) once("order",()=>{ const button=[...doc.querySelectorAll<HTMLButtonElement>('button')].find(el=>el.textContent==="후불로 주문하기");if(!button || button.disabled)return false;button.click();setCue({x:65,y:87,drag:false});return true; });
          if(t>20) once("return",()=>click('[aria-label="닫기"]') || click('[aria-label="메뉴판으로 돌아가기"]'));
          if(t>22) once("call",()=>click('[aria-label="직원 호출하기"]'));
          if(t>24) once("request",()=>click('[aria-label="직원 호출 항목"] button'));
          if(t>26) once("send",()=>click('[data-smart-call-submit]'));
        }
      }
    },100);
    return ()=>window.clearInterval(interval);
  },[kind,chapter,playing,reduced,ready,onDetail,highlight]);
  return <div className={styles.live} data-hero-live={kind} data-ready={ready} data-demo-step={step} data-demo-order={orderReceived?"received":"none"}>
    <img className={styles.fallback} src={`${ASSETS}screen-${kind==="counter"?"matcha":kind}.webp`} alt=""/>
    {!reduced ? <iframe ref={frame} src={SOURCES[kind]} title={`아티메뉴 ${kind==="phone"?"모바일":kind==="dining"?"다이닝":"태블릿"} 시연`} tabIndex={-1} aria-hidden="true" loading="eager" onLoad={()=>setShellLoaded(true)} className={styles.preview} style={{opacity:ready?1:0}}/> : null}
    {cue && playing && !reduced ? <span key={`${Math.round(cue.x)}-${Math.round(cue.y)}`} className={styles.cue} data-drag={cue.drag} style={{left:`${cue.x}%`,top:`${cue.y}%`}}>{cue.drag?<Hand/>:null}</span>:null}
  </div>;
}

export default function HomeHeroMotion({ children }: { children:ReactNode }) {
  const root=useRef<HTMLElement>(null), stage=useRef<HTMLDivElement>(null), firstPhoto=useRef<HTMLImageElement>(null);
  const reduced=useReducedMotion(), inView=useInView(stage,{amount:.15});
  const [detailFocus,setDetailFocus]=useState<readonly [number,number]>([1220,370]), [progress,setProgress]=useState(0), [selected,setSelected]=useState(0), [paused,setPaused]=useState(false), [visible,setVisible]=useState(true), [loaded,setLoaded]=useState(false), [size,setSize]=useState({width:1536,height:1024,gutter:40});
  const chapter=heroChapterAt(progress), scene=HERO_CAFE_CHAPTERS[chapter];
  const playing=inView && visible && !paused && !reduced && loaded;
  useEffect(()=>{
    let active=true;
    void firstPhoto.current?.decode().then(()=>{if(active)setLoaded(true);}).catch(()=>{});
    return()=>{active=false;};
  },[]);
  useEffect(()=>{
    const update=()=>{
      if(!root.current || !stage.current)return;
      const rect=root.current.getBoundingClientRect(),height=stage.current.clientHeight;
      setProgress(Math.max(0,Math.min(1,-rect.top/Math.max(1,root.current.offsetHeight-height))));
      setSize({width:stage.current.clientWidth,height,gutter:parseFloat(getComputedStyle(root.current.querySelector(".site-marketing-container")!).paddingLeft)||0});
    };
    let scheduled=0;const schedule=()=>{if(!scheduled)scheduled=requestAnimationFrame(()=>{scheduled=0;update();});};
    const observer=new ResizeObserver(schedule);if(stage.current)observer.observe(stage.current);
    window.addEventListener("scroll",schedule,{passive:true});window.addEventListener("resize",schedule);update();
    return()=>{cancelAnimationFrame(scheduled);observer.disconnect();window.removeEventListener("scroll",schedule);window.removeEventListener("resize",schedule);};
  },[]);
  useEffect(()=>{const update=()=>setVisible(!document.hidden);update();document.addEventListener("visibilitychange",update);return()=>document.removeEventListener("visibilitychange",update);},[]);
  useEffect(()=>{if(!playing || chapter!==0)return;const timer=window.setInterval(()=>setSelected(value=>(value+1)%3),2200);return()=>window.clearInterval(timer);},[playing,chapter]);
  const mobile=size.width<1024;
  const localProgress=progress*5-chapter;
  const detailZoom=!reduced && chapter===1?Math.max(0,(localProgress-.5)/.5):0;
  const fit=mobile && scene.image==="counter"?.63:mobile && scene.image==="dining"?.59:mobile && scene.image==="phone"?.95:1;
  const fitted=Math.max(size.width/1536,size.height/1024)*fit;
  const tabletFit=mobile && (scene.image==="counter" || scene.image==="dining")?Math.min(fitted,(size.width-2*size.gutter)/(scene.image==="counter"?760:840)):fitted;
  const scale=tabletFit*(reduced?1:scene.zoom*(1+localProgress*.035+detailZoom*1.8));
  const baseFocus=mobile?scene.mobileFocus:scene.focus;
  const focus=[baseFocus[0]+(detailFocus[0]-baseFocus[0])*detailZoom,baseFocus[1]+(detailFocus[1]-baseFocus[1])*detailZoom];
  const x=mobile?size.width/2-focus[0]*scale:Math.min(0,Math.max(size.width-1536*scale,size.width*.66-focus[0]*scale));
  const y=mobile?size.height*(scene.image==="phone"?.47:.52)-focus[1]*scale:Math.min(0,Math.max(size.height-1024*scale,size.height*.53-focus[1]*scale));
  function go(index:number) { if(!root.current || !stage.current)return; const top=window.scrollY+root.current.getBoundingClientRect().top;window.scrollTo({top:top+(root.current.offsetHeight-stage.current.offsetHeight)*((index+.02)/5),behavior:reduced?"instant":"smooth"}); }
  function skip() { if(root.current) window.scrollTo({top:window.scrollY+root.current.getBoundingClientRect().bottom-(document.querySelector<HTMLElement>(".site-header-spacer")?.offsetHeight??0),behavior:reduced?"instant":"smooth"}); }
  return <section ref={root} className={styles.story} data-hero-motion data-chapter={chapter} data-playing={playing} data-template={selected} data-image-ready={loaded} data-in-view={inView} data-reduced={Boolean(reduced)} aria-label="매장에서 만나는 아티메뉴">
    <div ref={stage} className={styles.stage}>
      <div className={styles.scene} aria-hidden="true" inert>
        <AnimatePresence initial={false}>
          <motion.div key={scene.image} className={styles.plane} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:reduced?0:.55}}>
            <img src={`${ASSETS}${scene.image}.webp`} className={styles.ambient} alt=""/>
            <motion.div className={styles.canvas} animate={{x,y,scale}} transition={{duration:reduced?0:.8,ease:[.22,1,.36,1]}}>
              <img ref={scene.image==="venue"?firstPhoto:undefined} src={`${ASSETS}${scene.image}.webp`} className={styles.photo} width={1536} height={1024} alt="" fetchPriority={scene.image==="venue"?"high":"auto"} onLoad={()=>setLoaded(true)}/>
              {scene.image==="venue" ? <>{HERO_CAFE_SCREENS.televisions.map((quad,i)=><Screen key={i} quad={quad}><CapturedScreen selected={selected}/></Screen>)}<Screen quad={HERO_CAFE_SCREENS.venueTablet}><CapturedScreen selected={selected}/></Screen></>:null}
              {scene.image==="counter" ? <><Screen quad={HERO_CAFE_SCREENS.counter} width={mobile?820:1280} height={mobile?512:800}><LiveMenu kind="counter" onDetail={setDetailFocus} highlight={detailZoom>0} chapter={chapter} playing={playing} reduced={Boolean(reduced)}/></Screen><img src={`${ASSETS}counter.webp`} className={`${styles.photo} ${styles.finger}`} width={1536} height={1024} alt=""/></>:null}
              {scene.image==="dining" ? <Screen quad={HERO_CAFE_SCREENS.dining} width={mobile?820:1280} height={mobile?512:800}><LiveMenu kind="dining" chapter={chapter} playing={playing} reduced={Boolean(reduced)}/></Screen>:null}
              {scene.image==="phone" ? <><Screen quad={HERO_CAFE_SCREENS.phone} width={390} height={900} phone><LiveMenu key={chapter} kind="phone" chapter={chapter} playing={playing} reduced={Boolean(reduced)}/></Screen>{chapter===3?<span className={styles.qrPulse}/>:null}</>:null}
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className={styles.shade} data-opening={chapter===0}/>
      <div className={`site-marketing-container ${styles.intro}`} data-active={chapter===0}>{children}</div>
      <div className={`site-marketing-container ${styles.sceneCopy}`}>
        <div className={styles.caption} aria-live="off">{chapter===0?<p className="type-body">{scene.body}</p>:<><p className="type-caption">ARTIMENU · {scene.label}</p><h2 className="type-section-title">{scene.title}</h2><p className="type-body">{scene.body}</p></>}</div>
      </div>
      <div className={`site-marketing-container ${styles.bottom}`}>
        <div className={styles.toolbar}>
          <div className={styles.chapters} role="group" aria-label="장면 선택">{HERO_CAFE_CHAPTERS.map((item,i)=><Button key={item.label} size="compact" variant={chapter===i?"default":"outline"} aria-label={`${i+1}. ${item.label} 장면 보기`} aria-current={chapter===i?"step":undefined} onClick={()=>go(i)}><span className="sm:hidden">0{i+1}</span><span className="hidden sm:inline">{item.label}</span></Button>)}</div>
          <div className="site-action-row"><Button variant="outline" size="icon" aria-label={reduced?"기기 설정에 따라 자동 모션을 줄였습니다":paused?"자동 시연 재생":"자동 시연 일시 정지"} onClick={()=>setPaused(value=>!value)} disabled={Boolean(reduced)}>{paused?<Play/>:<Pause/>}</Button><Button variant="outline" onClick={skip}>소개 건너뛰기<ArrowDown/></Button></div>
        </div>
        {chapter===4?<div className={styles.endAction}><Button asChild><Link href="/templates">우리 매장의 메뉴판 고르기<ArrowRight/></Link></Button></div>:null}
      </div>
    </div>
  </section>;
}
