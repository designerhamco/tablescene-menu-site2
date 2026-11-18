/* eslint-disable @next/next/no-img-element -- Authored stills are used only for reduced motion. */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeftRight, ArrowUpDown } from "@/app/components/ui/site-arrow";
import { HERO_CAFE_SCREENS, HERO_PHONE_TIMELINE, heroDemoPhase, heroTween, heroPhoneValue, heroPulseAt } from "@/lib/hero-cafe-motion";
import styles from "./HomeHeroMotion.module.css";

const preview = (template: string, device: string, extra = "") => `/templates/${template}/preview?view=actual&embedded=1&heroDemo=1&device=${device}${extra}`;
const SOURCES = {
  counter: preview("cafe_real_matcha_a", "tablet"),
  dining: preview("dining_aube_table_a", "tablet", "&callPreview=on"),
  phone: preview("cafe_real_matcha_a", "mobile", "&callPreview=off&orderPreview=on&popupPreview=off&widgetsPreview=off&prepayPreview=off"),
};
type Kind = keyof typeof SOURCES;
type Gesture = "click" | "swipe-x" | "swipe-y";
type Cue = { id: string; x: number; y: number; gesture: Gesture; progress: number };
type Props = { kind: Kind; active: boolean; seconds: number; reduced: boolean; onDetail?: (point: readonly [number, number]) => void };
type Action = { id: string; cueAt: number; at: number; until: number; gesture?: Gesture; find: () => HTMLElement | null; act?: (target: HTMLElement) => void; done?: () => boolean };

/** Rebuild an earlier native UI checkpoint offscreen, keeping the current screen visible. */
export default function HeroLiveMenu(props: Props) {
  const phase=heroDemoPhase(props.kind,props.seconds),target=useRef(phase),epoch=useRef(0);
  const [view,setView]=useState({shown:0,phase:0,pending:null as number|null,pendingPhase:0});
  useEffect(()=>{target.current=phase;},[phase]);
  const report=useCallback((id:number,current:number)=>setView(value=>{
    if(id===value.shown&&current!==value.phase)return {...value,phase:current};
    if(id===value.pending&&current!==value.pendingPhase)return {...value,pendingPhase:current};
    return value;
  }),[]);
  const settled=useCallback((id:number,current:number)=>{
    if(current!==target.current)return;
    setView(value=>id===value.pending?{shown:id,phase:current,pending:null,pendingPhase:0}:value);
  },[]);
  useEffect(()=>{
    const frame=requestAnimationFrame(()=>{
      if(!props.active||props.reduced){if(view.pending!==null)setView(value=>({...value,pending:null}));return;}
      if(view.pending!==null&&phase>=view.phase){setView(value=>({...value,pending:null}));return;}
      if(phase>=view.phase&&view.pending===null)return;
      if(view.pending!==null&&phase>=view.pendingPhase)return;
      const id=++epoch.current;
      setView(value=>({...value,pending:id,pendingPhase:0}));
    });
    return()=>cancelAnimationFrame(frame);
  },[phase,props.active,props.reduced,view.phase,view.pending,view.pendingPhase]);
  const ids=view.pending===null?[view.shown]:[view.shown,view.pending];
  return <div className={styles.live} data-hero-buffer={props.kind} data-rebuilding={view.pending!==null}>
    {ids.map(id=><div className={styles.buffer} key={id} style={{opacity:id===view.shown?1:0}}>
      <NativeFrame {...props} epoch={id} visible={id===view.shown} active={props.active&&(id===view.pending||view.pending===null)} seeking={id===view.pending} report={report} settled={settled}/>
    </div>)}
  </div>;
}

/** Fixed public catalog URLs only; reception stays in the existing previewOnly branch. */
function NativeFrame({kind,active,seconds,reduced,onDetail,epoch,visible,seeking,report,settled}:Props&{
  epoch:number;visible:boolean;seeking:boolean;report:(id:number,phase:number)=>void;settled:(id:number,phase:number)=>void;
}) {
  const frame=useRef<HTMLIFrameElement>(null),time=useRef(seconds),performed=useRef(new Set<string>()),points=useRef(new Map<string,{x:number;y:number}>());
  const receipt=useRef(false),settledPhase=useRef(-1),scheduled=useRef<number[]>([]);
  const [ready,setReady]=useState(false),[step,setStep]=useState("preloading"),[orderReceived,setOrderReceived]=useState(false),[cue,setCue]=useState<Cue|null>(null);
  const [typing,setTyping]=useState<{x:number;y:number;height:number;opacity:number}|null>(null);
  const [surface,setSurface]=useState({slide:"",popup:"",request:"",scroll:0,cart:"0",phone:""});
  useEffect(()=>{time.current=seconds;},[seconds]);
  useEffect(()=>()=>scheduled.current.forEach(cancelAnimationFrame),[]);
  useEffect(()=>{
    const received=(event:MessageEvent)=>{if(event.origin===location.origin&&event.source===frame.current?.contentWindow&&event.data?.type==="artimenu-preview-order"){receipt.current=true;setOrderReceived(true);}};
    window.addEventListener("message",received);return()=>window.removeEventListener("message",received);
  },[]);
  useEffect(()=>{
    if(reduced)return;
    let initialised=false;
    const timer=window.setInterval(()=>{
      const doc=frame.current?.contentDocument;if(!doc)return;
      const native=doc.querySelector(kind==="dining"?"[data-aube-table]":kind==="phone"?'[data-cafe-a-mobile-style="true"]':"[data-native-ready], [data-paged-ready]");
      if(!native||doc.fonts.status!=="loaded"||native.getAttribute("data-native-ready")==="false"||native.getAttribute("data-paged-ready")==="false")return;
      if(!initialised){
        doc.scrollingElement?.scrollTo({top:0,behavior:"instant"});
        if(kind==="phone"){
          const style=doc.createElement("style");style.dataset.heroDemoStyle="true";
          style.textContent='[data-menu-cart] :is([data-cart-back],[role="tab"]):focus-visible{outline:none!important;box-shadow:none!important} input[type="tel"]{caret-color:transparent}';
          doc.head.append(style);
        }
        const first=doc.querySelector<HTMLButtonElement>('[aria-label="1번째 대표 슬라이드 보기"]');
        first?.click();first?.dispatchEvent(new FocusEvent("focusin",{bubbles:true}));
        initialised=true;return;
      }
      if([...doc.images].some(image=>{const r=image.getBoundingClientRect();return r.width>0&&r.top<doc.documentElement.clientHeight&&r.bottom>0&&!image.complete;}))return;
      const first=doc.querySelector<HTMLButtonElement>('[aria-label="1번째 대표 슬라이드 보기"]');
      first?.click();first?.dispatchEvent(new FocusEvent("focusin",{bubbles:true}));
      setReady(true);setStep("ready");window.clearInterval(timer);
    },60);
    return()=>window.clearInterval(timer);
  },[kind,reduced]);
  useEffect(()=>{
    if(!active||!ready||reduced)return;
    const timer=window.setInterval(()=>{
      const doc=frame.current?.contentDocument;if(!doc||!frame.current?.src.includes("/templates/"))return;
      const t=time.current,width=doc.documentElement.clientWidth,height=doc.documentElement.clientHeight;
      const button=(selector:string)=>doc.querySelector<HTMLButtonElement>(selector);
      const first=button('[aria-label="1번째 대표 슬라이드 보기"]');
      if(first?.closest('[data-cafe-a-active-hero-index]')?.getAttribute('data-cafe-a-active-hero-index')!=="0")first?.click();
      first?.dispatchEvent(new FocusEvent("focusin",{bubbles:true}));
      const pageIndex=()=>[...doc.querySelectorAll('.aube-table-pagination-dot')].findIndex(item=>item.getAttribute('aria-current')==="page");
      const orderButton=()=>[...doc.querySelectorAll<HTMLButtonElement>("button")].find(item=>item.textContent==="후불로 주문하기")??null;
      const lastItem=()=>[...doc.querySelectorAll<HTMLButtonElement>('button[aria-label$=" 담기"]')].filter(item=>item.getBoundingClientRect().width>0).at(-1)??null;
      const itemSheet=()=>doc.querySelector('[role="dialog"][aria-label$=" 담기"]');
      const cartCount=()=>Number(button('[aria-label^="주문하기, 장바구니"]')?.getAttribute('aria-label')?.match(/장바구니 (\d+)/)?.[1]??0);
      const phone=doc.querySelector<HTMLInputElement>('input[type="tel"]');
      const writePhone=(input:HTMLInputElement,value:string)=>{
        if(input.value===value)return;
        Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input),"value")?.set?.call(input,value);
        input.dispatchEvent(new Event("input",{bubbles:true}));
      };
      let nextTyping:typeof typing=null;
      if(kind==="phone"&&phone&&!performed.current.has("order")){
        const body=doc.querySelector<HTMLElement>('[data-menu-cart] [role="tabpanel"]');
        if(body&&t>=HERO_PHONE_TIMELINE.cart[1]+.5){
          const target=Math.max(0,Math.min(body.scrollHeight-body.clientHeight,body.scrollTop+phone.getBoundingClientRect().top-body.getBoundingClientRect().top-body.clientHeight*.42));
          body.scrollTo({top:target*heroTween(t,HERO_PHONE_TIMELINE.cart[1]+.5,HERO_PHONE_TIMELINE.typing[0]),behavior:"instant"});
        }
        const value=heroPhoneValue(t);writePhone(phone,value);
        if(t>=HERO_PHONE_TIMELINE.typing[0]&&t<HERO_PHONE_TIMELINE.order[0]){
          const r=phone.getBoundingClientRect(),css=doc.defaultView!.getComputedStyle(phone),context=doc.createElement("canvas").getContext("2d");
          if(context)context.font=css.font;
          const height=parseFloat(css.lineHeight)||parseFloat(css.fontSize)*1.5;
          nextTyping={x:(r.left+parseFloat(css.paddingLeft)+(context?.measureText(value).width??0))/width*100,y:(r.top+(r.height-height)/2)/doc.documentElement.clientHeight*100,height,opacity:heroPulseAt((t-HERO_PHONE_TIMELINE.typing[0])/(HERO_PHONE_TIMELINE.order[0]-HERO_PHONE_TIMELINE.typing[0]),14)>.45?1:0};
        }
      }
      setTyping(current=>JSON.stringify(current)===JSON.stringify(nextTyping)?current:nextTyping);
      const actions:Action[]=kind==="dining"?[
        {id:"page1",cueAt:4,at:6,until:8,gesture:"swipe-x",find:()=>button('[aria-label="다음 메뉴 페이지"]'),done:()=>pageIndex()>=1},
        {id:"page2",cueAt:9,at:11,until:13,gesture:"swipe-x",find:()=>button('[aria-label="다음 메뉴 페이지"]'),done:()=>pageIndex()>=2},
        {id:"call",cueAt:15,at:18,until:21,gesture:"click",find:()=>button('[aria-label="직원 호출하기"]'),done:()=>Boolean(doc.querySelector('[data-smart-call-dialog]'))},
        {id:"wine",cueAt:22,at:25,until:27,gesture:"click",find:()=>[...doc.querySelectorAll<HTMLButtonElement>('[aria-label="직원 호출 항목"] button')].find(item=>item.textContent?.includes("와인 문의"))??null,done:()=>Boolean(doc.querySelector('[aria-label="직원 호출 항목"] [aria-pressed="true"]')?.textContent?.includes("와인 문의"))},
        {id:"send",cueAt:28,at:31,until:34,gesture:"click",find:()=>button('[data-smart-call-submit]'),done:()=>Boolean(doc.querySelector('[data-call-status]'))},
      ]:kind==="phone"?[
        {id:"item",cueAt:HERO_PHONE_TIMELINE.item[0],at:HERO_PHONE_TIMELINE.item[1],until:HERO_PHONE_TIMELINE.item[2],gesture:"click",find:lastItem,done:()=>Boolean(itemSheet())},
        {id:"add",cueAt:HERO_PHONE_TIMELINE.add[0],at:HERO_PHONE_TIMELINE.add[1],until:HERO_PHONE_TIMELINE.add[2],gesture:"click",find:()=>[...doc.querySelectorAll<HTMLButtonElement>("button")].find(item=>item.textContent?.includes("· 장바구니 담기"))??null,done:()=>cartCount()>0&&!itemSheet()},
        {id:"cart",cueAt:HERO_PHONE_TIMELINE.cart[0],at:HERO_PHONE_TIMELINE.cart[1],until:HERO_PHONE_TIMELINE.cart[2],gesture:"click",find:()=>button('[aria-label^="주문하기, 장바구니"]'),done:()=>Boolean(doc.querySelector('[data-menu-cart]'))},
        {id:"phone",cueAt:HERO_PHONE_TIMELINE.typing[0],at:HERO_PHONE_TIMELINE.typing[1],until:HERO_PHONE_TIMELINE.order[0],find:()=>phone??orderButton(),act:target=>{if(target.tagName==="INPUT")writePhone(target as HTMLInputElement,heroPhoneValue(HERO_PHONE_TIMELINE.typing[1]));}},
        {id:"order",cueAt:HERO_PHONE_TIMELINE.order[0],at:HERO_PHONE_TIMELINE.order[1],until:HERO_PHONE_TIMELINE.order[2],gesture:"click",find:orderButton,done:()=>receipt.current},
      ]:[];
      const phase=actions.filter(action=>performed.current.has(action.id)).length;
      report(epoch,phase);
      let nextCue:Cue|null=null;
      if(kind==="counter"){
        const scrolling=doc.querySelector<HTMLElement>("[data-native-menu], [data-scroll-menu]"),sale=doc.querySelector<HTMLElement>('[data-native-tracks] [data-cafe-a-time-sale-digital-timer], [data-scroll-content] [data-cafe-a-time-sale-digital-timer]');
        if(scrolling&&sale){
          const maximum=scrolling.scrollHeight-scrolling.clientHeight;
          const target=Math.max(0,Math.min(maximum,scrolling.scrollTop+sale.getBoundingClientRect().top-scrolling.getBoundingClientRect().top-scrolling.clientHeight*.28));
          scrolling.scrollTo({top:t<10?maximum*heroTween(t,4,10):maximum+(target-maximum)*heroTween(t,10,13),behavior:"instant"});
          if(t>=4&&t<13){nextCue={id:"menu-scroll",gesture:"swipe-y",x:79,y:58,progress:heroTween(t,4,13)};setStep("menu-scroll");}
          if(t>=13){
            const r=sale.getBoundingClientRect(),u=(r.x+r.width/2)/width,v=(r.y+r.height/2)/height,q=HERO_CAFE_SCREENS.counter;
            onDetail?.([q[0][0]*(1-u)*(1-v)+q[1][0]*u*(1-v)+q[2][0]*u*v+q[3][0]*(1-u)*v,q[0][1]*(1-u)*(1-v)+q[1][1]*u*(1-v)+q[2][1]*u*v+q[3][1]*(1-u)*v]);
            setStep("sale-focus");
          }
        }
      }
      if(kind==="phone"&&!performed.current.has("item")&&doc.scrollingElement){
        const scrolling=doc.scrollingElement,maximum=scrolling.scrollHeight-scrolling.clientHeight;
        const target=lastItem();
        const itemTop=target?Math.max(0,Math.min(maximum,scrolling.scrollTop+target.getBoundingClientRect().top-height*.58)):maximum;
        scrolling.scrollTo({top:t<HERO_PHONE_TIMELINE.browse[1]?maximum*heroTween(t,...HERO_PHONE_TIMELINE.browse):maximum+(itemTop-maximum)*heroTween(t,...HERO_PHONE_TIMELINE.reposition),behavior:"instant"});
        if(t>=HERO_PHONE_TIMELINE.browse[0]&&t<HERO_PHONE_TIMELINE.reposition[1]){nextCue={id:"menu-scroll",gesture:"swipe-y",x:67,y:57,progress:heroTween(t,HERO_PHONE_TIMELINE.browse[0],HERO_PHONE_TIMELINE.reposition[1])};setStep("menu-scroll");}
      }
      for(const action of actions){
        if(action.gesture&&t>=action.cueAt&&t<=action.until){
          const target=action.find();
          if(target&&!performed.current.has(action.id)&&!action.done?.()){const r=target.getBoundingClientRect();points.current.set(action.id,{x:(r.x+r.width/2)/width*100,y:(r.y+r.height/2)/height*100});}
          const point=action.gesture==="click"?points.current.get(action.id):{x:52,y:52};
          if(point)nextCue={id:action.id,gesture:action.gesture,...point,progress:Math.max(0,Math.min(1,(t-action.cueAt)/(action.until-action.cueAt)))};
        }
      }
      setCue(current=>JSON.stringify(current)===JSON.stringify(nextCue)?current:nextCue);
      const due=actions.find(action=>t>=action.at&&!performed.current.has(action.id));
      if(due){
        if(due.done?.()){performed.current.add(due.id);setStep(due.id);return;}
        const target=due.find();
        if(target&&!(target as HTMLButtonElement).disabled){
          if(due.act)due.act(target);else target.click();
          if(!due.done){performed.current.add(due.id);setStep(due.id);}
        }
      }else if(seeking&&phase===heroDemoPhase(kind,t)&&(kind!=="phone"||phase<5||receipt.current)&&settledPhase.current!==phase){
        settledPhase.current=phase;
        const first=requestAnimationFrame(()=>{const second=requestAnimationFrame(()=>settled(epoch,phase));scheduled.current.push(second);});
        scheduled.current.push(first);
      }
      const snapshot={slide:doc.querySelector('[data-cafe-a-active-hero-index]')?.getAttribute('data-cafe-a-active-hero-index')??"",popup:doc.querySelector('[data-menu-advertisement-popup]')?"open":"closed",request:doc.querySelector('[aria-label="직원 호출 항목"] [aria-pressed="true"]')?.textContent??doc.querySelector('[data-call-status]')?.textContent??"",scroll:Math.round((kind==="counter"?doc.querySelector<HTMLElement>('[data-native-menu], [data-scroll-menu]')?.scrollTop:doc.scrollingElement?.scrollTop)??0),cart:button('[aria-label^="주문하기, 장바구니"]')?.getAttribute('aria-label')??"0",phone:phone?.value??""};
      setSurface(current=>JSON.stringify(current)===JSON.stringify(snapshot)?current:snapshot);
    },60);
    return()=>window.clearInterval(timer);
  },[active,ready,reduced,kind,onDetail,epoch,report,seeking,settled]);
  const source=kind==="phone"?"/assets/device-platform-v2/menu-phone.webp":`/assets/hero-cafe-v1/screen-${kind==="counter"?"matcha":kind}.webp`;
  const motion=cue?.gesture==="swipe-x"?`translateX(${(cue.progress-.5)*-24}px)`:cue?.gesture==="swipe-y"?`translateY(${(cue.progress-.5)*-24}px)`:"";
  const pulse=heroPulseAt(cue?.progress??1);
  return <div className={styles.live} data-hero-live={visible?kind:undefined} data-ready={ready} data-demo-time={seconds.toFixed(2)} data-demo-step={step} data-demo-order={orderReceived?"received":"none"} data-demo-cue={cue?.gesture??"none"} data-demo-slide={surface.slide} data-demo-popup={surface.popup} data-demo-request={surface.request} data-demo-scroll={surface.scroll} data-demo-cart={surface.cart} data-demo-phone={surface.phone}>
    {reduced?<img className={styles.fallback} src={source} alt=""/>:<iframe ref={frame} src={`${SOURCES[kind]}&heroSeek=${epoch}`} title={`아티메뉴 ${kind==="phone"?"모바일":kind==="dining"?"다이닝":"태블릿"} 시연`} tabIndex={-1} aria-hidden="true" loading="eager" className={styles.preview} style={{opacity:ready?1:0}}/>}
    {cue&&active&&!reduced?<span className={styles.cue} data-gesture={cue.gesture} style={{left:`${cue.x}%`,top:`${cue.y}%`,transform:`translate(-50%,-50%) ${motion}`,opacity:cue.gesture==="click"?.35+.65*pulse:1}}>
      {cue.gesture==="click"?<i className={styles.cueRipple} style={{transform:`scale(${1+(1-pulse)*1.3})`,opacity:pulse}}/>:cue.gesture==="swipe-x"?<ArrowLeftRight/>:<ArrowUpDown/>}
    </span>:null}
    {typing&&active&&!reduced?<span className={styles.typingCaret} aria-hidden="true" style={{left:`${typing.x}%`,top:`${typing.y}%`,height:typing.height,opacity:typing.opacity}}/>:null}
  </div>;
}
