/* eslint-disable @next/next/no-img-element -- GIF demo sources must retain their animation. */
"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { Button } from "@/app/components/ui/button";
import { ArrowLeft, ArrowRight } from "@/app/components/ui/site-arrow";
import { MediaPlayback } from "@/app/components/ui/media-playback";
import { MARKETING_SERVICE_FEATURES, type MarketingFeature, type MarketingDemoMedia } from "@/lib/marketing-service-features";
import { basicFeatureIndex, BASIC_FEATURE_INTRO } from "@/lib/basic-feature-story";
import MarketingCopyReveal from "./MarketingCopyReveal";
import BasicTemplateShowcase from "./BasicTemplateShowcase";
import ServiceFeatureDemo from "./ServiceFeatureDemo";
import styles from "./BasicServiceStory.module.css";

export function DemoMedia({ media, label, running }: { media: MarketingDemoMedia; label:string; running:boolean }) {
  const video = useRef<HTMLVideoElement>(null);
  const [error,setError] = useState(false);
  useEffect(() => {
    const element=video.current;
    if (!element) return;
    let current=true;
    if(running) void element.play().catch(error => { if(current && error.name!=="AbortError") setError(true); });
    else element.pause();
    return () => { current=false; element.pause(); };
  }, [running]);
  return <>
    {"image" in media ? <img src={running ? media.image : media.poster} alt={label} decoding="async"/> : <video ref={video} poster={media.poster} autoPlay={running} loop muted playsInline preload="metadata" aria-label={label} onError={() => setError(true)}>
      {media.webm ? <source src={media.webm} type="video/webm"/> : null}<source src={media.mp4} type="video/mp4"/>
    </video>}
    {error ? <p className={`type-body-sm ${styles.error}`} role="status">영상을 불러오지 못했습니다.</p> : null}
  </>;
}

/** Feature selection is manual. Only the selected screen demo repeats automatically. */
export default function BasicServiceStory({ features=MARKETING_SERVICE_FEATURES.basic }: { features?: readonly MarketingFeature[] }) {
  const root=useRef<HTMLDivElement>(null), preview=useRef<HTMLDivElement>(null);
  const contentId=useId();
  const reduced=useReducedMotion();
  const [index,setIndex]=useState(-1), [visible,setVisible]=useState(false), [managementPlaying,setManagementPlaying]=useState(false), [desktop,setDesktop]=useState(false);
  const feature=index<0 ? undefined : features[index];
  const sceneKey=feature?.kind ?? "intro";
  const sceneLabel=feature?.label ?? "베이직 소개";
  useEffect(() => {
    const query=matchMedia("(min-width:768px)");
    const update=() => { setDesktop(query.matches); if(!query.matches) setManagementPlaying(false); };
    update(); query.addEventListener("change",update);
    return () => query.removeEventListener("change",update);
  },[]);
  useEffect(() => {
    const element=preview.current, section=root.current;
    if(!element || !section) return;
    let frame=0, current=true;
    const check = () => {
      frame=0;
      const box=element.getBoundingClientRect();
      const x=Math.max(0,Math.min(innerWidth-1,box.left+box.width/2));
      const y=Math.max(0,Math.min(innerHeight-1,box.top+box.height/2));
      const front=document.elementFromPoint(x,y);
      const shown=!document.hidden && box.bottom>0 && box.top<innerHeight && !!front && section.contains(front);
      if(current) { setVisible(shown); if(!shown) setManagementPlaying(false); }
    };
    const schedule=() => { if(!frame) frame=requestAnimationFrame(check); };
    const observer=new IntersectionObserver(schedule);
    observer.observe(element);
    window.addEventListener("scroll",schedule,{passive:true});
    window.addEventListener("resize",schedule);
    document.addEventListener("visibilitychange",schedule);
    schedule();
    return () => { current=false; observer.disconnect(); cancelAnimationFrame(frame); window.removeEventListener("scroll",schedule); window.removeEventListener("resize",schedule); document.removeEventListener("visibilitychange",schedule); };
  },[]);
  const select=(next:number) => { setIndex(basicFeatureIndex(next,features.length)); setManagementPlaying(false); };
  const running=visible && !reduced && !!feature;
  return <div ref={root} className={`site-marketing-container ${styles.story}`} data-basic-feature-story data-feature-index={index} onKeyDown={event => {
    if(event.key==="ArrowLeft" || event.key==="ArrowRight") { event.preventDefault(); select(index+(event.key==="ArrowRight" ? 1 : -1)); }
  }}>
    <div className={styles.copy}>
      <MarketingCopyReveal className="site-stack-content">
        <div key={sceneKey} id={contentId} className={`site-stack-content ${styles.featureCopy}`} data-basic-feature-copy aria-live="polite" aria-atomic="true">
          <h2 id="service-basic-heading" className="type-section-title">{feature ? <>{feature.kind==="featured" ? "사진으로 시선을 끄는" : feature.title}<br/>{feature.label}</> : <>{BASIC_FEATURE_INTRO.title}<br/>{BASIC_FEATURE_INTRO.subtitle}</>}</h2>
          <p className={`type-body-lg ${styles.description}`}>{feature?.body ?? BASIC_FEATURE_INTRO.body}</p>
        </div>
        <nav className="site-action-row" aria-label="베이직 기능 탐색">
          <Button variant="media" size="icon" aria-label="이전 기능 보기" aria-controls={contentId} disabled={index===-1} onClick={()=>select(index-1)}><ArrowLeft/></Button>
          <span className={`type-caption ${styles.count}`} aria-live="polite" aria-atomic="true">{feature ? <><span>{String(index+1).padStart(2,"0")}</span><span> / {String(features.length).padStart(2,"0")}</span></> : <span>소개</span>}</span>
          <Button variant="media" size="icon" aria-label="다음 기능 보기" aria-controls={contentId} disabled={index===features.length-1} onClick={()=>select(index+1)}><ArrowRight/></Button>
        </nav>
      </MarketingCopyReveal>
      {feature ? <div className={`site-stack-block ${styles.management}`} data-basic-management>
        <h3 className="type-label">{feature.label} 관리 화면</h3>
        <div className={styles.managementMedia} key={feature.kind}>
          {feature.managementMedia && desktop ? <DemoMedia media={feature.managementMedia} label={`${feature.label} 관리 화면`} running={visible && desktop && managementPlaying}/> : null}
          <MediaPlayback disabled={!feature.managementMedia} playing={managementPlaying} label={`${feature.label} 관리 화면${feature.managementMedia ? "" : " 영상 준비 중"}`} title={feature.managementMedia ? undefined : "관리 화면 영상 준비 중"} onClick={()=>setManagementPlaying(value=>!value)}/>
        </div>
      </div> : null}
    </div>
    <div ref={preview} className={styles.visual} data-basic-feature-preview={sceneKey} data-playing={running}>
      <MarketingCopyReveal className={styles.reveal}>
        <BasicTemplateShowcase label={sceneLabel}>
          <div key={sceneKey} className={styles.demo} data-basic-demo={sceneKey}>
            {feature ? (feature.media ? <DemoMedia media={feature.media} label={feature.label} running={running}/> : <ServiceFeatureDemo kind={feature.kind} playing={running}/>) : <img className={styles.introScreen} src={BASIC_FEATURE_INTRO.image} alt="리얼 맛차 베이직 메뉴판 전체 화면" loading="eager" decoding="async"/>}
          </div>
        </BasicTemplateShowcase>
      </MarketingCopyReveal>
    </div>
  </div>;
}
