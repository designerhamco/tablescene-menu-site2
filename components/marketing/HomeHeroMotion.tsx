/* eslint-disable @next/next/no-img-element -- Authored screen composites use pixel-exact geometry and pre-encoded local WebP assets. */
"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { ProgressBar } from "@/app/components/ui/loading-state";
import { Button } from "@/app/components/ui/button";
import { HERO_CAFE_CHAPTERS, HERO_CAFE_PHOTOS, HERO_CAFE_SCREENS, HERO_CHAPTER_DURATION_MS, HERO_TEMPLATE_SCREENS, HERO_STORY_SVH, HERO_COUNTER_TIMELINE, HERO_PHONE_TIMELINE, heroTween, heroSceneAt, heroProgressAt, heroSaleZoom, heroScreenMatrix, heroTemplateAt, heroPulseAt, heroLiveSceneAt, heroSegmentProgressAt, type HeroQuad } from "@/lib/hero-cafe-motion";
import styles from "./HomeHeroMotion.module.css";
import HeroLiveMenu from "./HeroLiveMenu";
import { HERO_COMPOSITIONS, HERO_RESPONSIVE_COMPOSITIONS, heroLandscapeFrame, heroLandscapeScale, heroLandscapePosition } from "@/lib/hero-background-layout";

const ASSETS = "/assets/hero-cafe-v1/";
function Screen({ quad, width=1280, height=800, children, phone=false }: { quad: HeroQuad; width?: number; height?: number; children: ReactNode; phone?: boolean }) {
  return <div className={styles.screen} data-hero-screen style={{width,height,transform:heroScreenMatrix(quad,width,height),borderRadius:phone?0:8}}>{children}</div>;
}
function CapturedScreen({ selected }: { selected: number }) {
  return <AnimatePresence initial={false}><motion.img key={selected} data-hero-capture src={`${ASSETS}screen-${HERO_TEMPLATE_SCREENS[selected]}.webp`} width={1280} height={800} alt="" draggable={false} className={styles.captured} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:.6,ease:"easeOut"}}/></AnimatePresence>;
}
function IdleScreen({ image }: { image: "counter" | "dining" | "phone" }) {
  return <img className={styles.fallback} src={image==="phone"?"/assets/device-platform-v2/menu-phone.webp":`${ASSETS}screen-${image==="counter"?"matcha":"dining-v2"}.webp`} alt="" loading="lazy"/>;
}

export default function HomeHeroMotion() {
  const root=useRef<HTMLElement>(null), stage=useRef<HTMLDivElement>(null), firstPhoto=useRef<HTMLImageElement>(null);
  const reduced=useReducedMotion(), inView=useInView(stage,{amount:.15});
  const [detailFocus,setDetailFocus]=useState<readonly [number,number]>([1220,370]), [progress,setProgress]=useState(0), [visible,setVisible]=useState(true), [loaded,setLoaded]=useState(false), [size,setSize]=useState({width:1536,height:1024,gutter:40,copyHeight:0,copyBottom:0});
  const scenePosition=heroSceneAt(progress),chapter=scenePosition.chapter,scene=HERO_CAFE_CHAPTERS[chapter];
  const liveScene=heroLiveSceneAt(chapter,inView,visible,Boolean(reduced),scenePosition.fraction);
  const localProgress=scenePosition.fraction;
  const Heading=chapter===0?"h1":"h2";
  const selected=heroTemplateAt(localProgress);
  const phoneTime=localProgress*HERO_CHAPTER_DURATION_MS[3]/1000;
  const qrProgress=(phoneTime-HERO_PHONE_TIMELINE.qr[0])/(HERO_PHONE_TIMELINE.qr[1]-HERO_PHONE_TIMELINE.qr[0]);
  const select=useCallback((index:number)=>{
    if(!root.current||!stage.current)return;
    const top=window.scrollY+root.current.getBoundingClientRect().top;
    window.scrollTo({top:top+(root.current.offsetHeight-stage.current.offsetHeight)*heroProgressAt(index)+.5,behavior:"instant"});
  },[]);
  const onDetail=useCallback((point:readonly [number,number])=>setDetailFocus(current=>Math.abs(current[0]-point[0])+Math.abs(current[1]-point[1])<.2?current:point),[]);
  useEffect(()=>{
    let active=true;
    void firstPhoto.current?.decode().then(()=>{if(active)setLoaded(true);}).catch(()=>{});
    return()=>{active=false;};
  },[]);
  useEffect(()=>{
    const update=()=>{
      if(!root.current || !stage.current)return;
      const rect=root.current.getBoundingClientRect(),height=stage.current.clientHeight;
      const next=Math.max(0,Math.min(1,-rect.top/Math.max(1,root.current.offsetHeight-height)));
      setProgress(next);
      const copy=root.current.querySelector<HTMLElement>("[data-hero-copy]");
      setSize({width:stage.current.clientWidth,height,gutter:copy?parseFloat(getComputedStyle(copy).paddingLeft)||0:0,copyHeight:copy?.offsetHeight??0,copyBottom:copy?parseFloat(getComputedStyle(copy).bottom)||0:0});
    };
    let scheduled=0;const schedule=()=>{if(!scheduled)scheduled=requestAnimationFrame(()=>{scheduled=0;update();});};
    const scroll=schedule;
    const observer=new ResizeObserver(schedule);if(stage.current)observer.observe(stage.current);
    const copy=root.current?.querySelector("[data-hero-copy]");if(copy)observer.observe(copy);
    window.addEventListener("scroll",scroll,{passive:true});window.addEventListener("resize",scroll);update();
    return()=>{cancelAnimationFrame(scheduled);observer.disconnect();window.removeEventListener("scroll",scroll);window.removeEventListener("resize",scroll);};
  },[]);
  useEffect(()=>{const update=()=>setVisible(!document.hidden);update();document.addEventListener("visibilitychange",update);return()=>document.removeEventListener("visibilitychange",update);},[]);
  const mobile=size.width<1024;
  const frame=mobile?{left:0,width:size.width}:heroLandscapeFrame(size.width,size.height);
  const cameraFor=(index:number)=>{
    const item=HERO_CAFE_CHAPTERS[index],active=index===chapter,t=active?localProgress*HERO_CHAPTER_DURATION_MS[index]/1000:0;
    const detailZoom=!reduced&&index===1?heroTween(t,...HERO_COUNTER_TIMELINE.zoom):0;
    const phoneZoom=!reduced&&index===3?heroTween(t,...HERO_PHONE_TIMELINE.camera):0;
    const fit=mobile&&item.image==="counter"?.63:mobile&&item.image==="dining"?.59:mobile&&item.image==="phone"?.95:1;
    const fitted=(mobile?Math.max(size.width/1536,size.height/1024):heroLandscapeScale(size.width,size.height))*fit;
    const tabletFit=mobile&&(item.image==="counter"||item.image==="dining")?Math.min(fitted,(size.width-2*size.gutter)/(item.image==="counter"?760:840)):fitted;
    const desiredScale=tabletFit*(reduced?1:(index===3?1+phoneZoom*.16:item.zoom)*(1+(active?localProgress:0)*.035+(index===1?heroSaleZoom(t,size.width):0)));
    const phoneRoom=Math.max(1,size.height-size.copyHeight-size.copyBottom-size.gutter);
    const scale=mobile&&item.image==="phone"?Math.min(desiredScale,Math.max(1,phoneRoom-size.gutter)/700,(size.width-2*size.gutter)/(600-phoneZoom*260)):desiredScale;
    const start=mobile?item.mobileFocus:item.focus;
    const baseFocus=item.image==="phone"?[start[0]+(970-start[0])*phoneZoom,start[1]+(490-start[1])*phoneZoom]:start;
    const focus=[baseFocus[0]+(detailFocus[0]-baseFocus[0])*detailZoom,baseFocus[1]+(detailFocus[1]-baseFocus[1])*detailZoom];
    const position=mobile?{x:size.width/2-focus[0]*scale,y:(item.image==="phone"?phoneRoom/2:size.height*.52)-focus[1]*scale}:heroLandscapePosition(frame.width,size.height,scale,focus);
    if(item.image==="phone"&&size.width<768){
      const copyClearance=size.height-size.copyHeight-size.copyBottom-size.gutter-(position.y+810*scale);
      position.y+=Math.max(0,Math.min(24,size.height*.025,copyClearance));
    }
    return {...position,scale};
  };
  return <section ref={root} className={styles.story} style={{height:`${HERO_STORY_SVH}svh`}} data-hero-motion data-chapter={chapter} data-live-scene={liveScene??"none"} data-scroll-driven="true" data-template={selected} data-progress={localProgress.toFixed(3)} data-scroll-progress={progress.toFixed(3)} data-image-ready={loaded} data-in-view={inView} data-reduced={Boolean(reduced)} aria-label="매장에서 만나는 아티메뉴">
    <div ref={stage} className={styles.stage} data-rendering={inView&&visible}>
      <div className={styles.scene} aria-hidden="true" inert>
        {(["venue","counter","dining","phone"] as const).map(image=>{
          const active=scene.image===image,index=HERO_CAFE_CHAPTERS.findIndex(item=>item.image===image),camera=cameraFor(index);
          return <motion.div key={image} className={styles.plane} initial={false} animate={{opacity:active?1:0}} transition={{duration:reduced?0:.45}} style={{zIndex:active?1:0}} data-hero-plane={image} data-active={active}>
            <img src={`${ASSETS}${HERO_CAFE_PHOTOS.venue}`} className={styles.ambient} data-hero-ambient alt=""/>
            <div className={styles.framing} data-hero-framing style={{left:frame.left,width:frame.width}}>
            <motion.div className={styles.canvas} data-hero-canvas animate={camera} transition={{duration:reduced?0:.18,ease:[.22,1,.36,1]}}>
              <picture>
                {HERO_RESPONSIVE_COMPOSITIONS.map(source=><source key={source.profile} media={source.media} srcSet={source.sources[image]} data-hero-edge-source={source.profile}/>)}
                <img ref={image==="venue"?firstPhoto:undefined} src={HERO_COMPOSITIONS[image]} className={styles.composition} data-hero-composition={image} width={4608} height={1536} alt="" fetchPriority={image==="venue"?"high":"auto"} onLoad={()=>{if(image==="venue")setLoaded(true);}}/>
              </picture>
              {image==="venue"?<>{HERO_CAFE_SCREENS.televisions.map((quad,i)=><Screen key={i} quad={quad}><CapturedScreen selected={selected}/></Screen>)}<Screen quad={HERO_CAFE_SCREENS.venueTablet}><CapturedScreen selected={selected}/></Screen></>:null}
              {image==="counter"?<div className={styles.screenMask} style={{maskImage:"url(/assets/hero-cafe-v7/counter-screen-mask.png)"}} data-hero-ui-mask="counter"><Screen quad={HERO_CAFE_SCREENS.counter} width={1280} height={800}>{liveScene===image?<HeroLiveMenu key="counter" kind="counter" active={active} onDetail={onDetail} seconds={active?localProgress*HERO_CHAPTER_DURATION_MS[chapter]/1000:0} reduced={false}/>:<IdleScreen image={image}/>}</Screen></div>:null}
              {image==="dining"?<div className={styles.screenMask} style={{maskImage:"url(/assets/hero-cafe-v7/dining-screen-mask.png)"}} data-hero-ui-mask="dining"><Screen quad={HERO_CAFE_SCREENS.dining} width={820} height={512}>{liveScene===image?<HeroLiveMenu key="dining" kind="dining" active seconds={localProgress*HERO_CHAPTER_DURATION_MS[chapter]/1000} reduced={false}/>:<IdleScreen image={image}/>}</Screen></div>:null}
              {image==="phone"?<><div className={styles.screenMask} style={{maskImage:"url(/assets/hero-cafe-v7/phone-screen-mask.png)"}} data-hero-ui-mask="phone"><Screen quad={HERO_CAFE_SCREENS.phone} width={390} height={900} phone>{liveScene===image?<HeroLiveMenu key="phone" kind="phone" active seconds={localProgress*HERO_CHAPTER_DURATION_MS[chapter]/1000} reduced={false}/>:<IdleScreen image={image}/>}</Screen></div>{chapter===3?<span className={styles.qrPulse} data-hero-qr-cue aria-hidden="true" style={{transform:heroScreenMatrix(HERO_CAFE_SCREENS.qrCode,156,80),opacity:qrProgress>=0&&qrProgress<1?.2+.8*heroPulseAt(qrProgress):0}}/>:null}</>:null}
            </motion.div>
            </div>
          </motion.div>;
        })}

      </div>
      <div className={styles.shade}/>
      <div className={styles.headerShade} aria-hidden="true"/>
      {/* Keep native touch scrolling on the home document, above transformed preview frames. */}
      <div className={styles.gestureSurface} data-hero-gesture-surface aria-hidden="true"/>
      <div className={`site-marketing-container ${styles.sceneCopy}`} data-hero-copy>
        <motion.div key={chapter} className={styles.caption} aria-live="off" initial={reduced?false:{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{duration:reduced?0:.5,ease:[.22,1,.36,1]}}>
          <p className="type-caption">{scene.label}</p>
          <Heading className="type-section-title">{scene.title}</Heading>
          <p className="type-body">{scene.body}</p>
        </motion.div>
        <nav className={styles.progress} data-hero-progress aria-label="서비스 소개 진행">
          {HERO_CAFE_CHAPTERS.map((item,index)=>{
            const active=chapter===index;
            const label=`${index+1}. ${item.label} · ${active?"현재 장면":"장면 보기"}`;
            return <div className={styles.segment} key={item.image}>
              <Button className={styles.segmentAction} type="button" variant="ghost" size="icon" aria-label={label} title={label}
                aria-current={active?"step":undefined} data-hero-segment={index} data-active={active}
                onClick={()=>select(index)} onKeyDown={event=>{
                  const next=["ArrowRight","ArrowDown"].includes(event.key)?Math.min(HERO_CAFE_CHAPTERS.length-1,index+1):["ArrowLeft","ArrowUp"].includes(event.key)?Math.max(0,index-1):event.key==="Home"?0:event.key==="End"?HERO_CAFE_CHAPTERS.length-1:null;
                  if(next===null)return;event.preventDefault();event.stopPropagation();select(next);
                  event.currentTarget.closest("nav")?.querySelectorAll<HTMLButtonElement>("button")[next]?.focus({preventScroll:true});
                }}/>
              <ProgressBar label={`${item.label} 장면 스크롤 진행`} value={Math.round(heroSegmentProgressAt(index,chapter,localProgress)*1000)/10} appearance="media"/>
            </div>;
          })}
        </nav>
      </div>
    </div>
  </section>;
}
