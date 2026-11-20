/* eslint-disable @next/next/no-img-element -- GIF demo sources must retain their animation. */
"use client";

import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { useReducedMotion } from "motion/react";
import { MediaPlayback } from "@/app/components/ui/media-playback";
import { MARKETING_SERVICE_FEATURES, type MarketingFeature, type MarketingDemoMedia } from "@/lib/marketing-service-features";
import { SERVICE_HOME_HREFS } from "@/lib/service-home-navigation";
import StoryProgress from "./StoryProgress";
import BasicIdleScrollHint from "./BasicIdleScrollHint";
import { revealDiningFromBasic } from "@/lib/home-dining-cover";
import { basicFeatureIndex, BASIC_FEATURE_INTRO } from "@/lib/basic-feature-story";
import MarketingCopyReveal from "./MarketingCopyReveal";
import ServiceFrameLabel from "./ServiceFrameLabel";
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

/** The vertical page position selects which feature is shown in the sticky stage. */
export default function BasicServiceStory({ features=MARKETING_SERVICE_FEATURES.basic }: { features?: readonly MarketingFeature[] }) {
  const track = useRef<HTMLDivElement>(null);
  const runway = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const preview = useRef<HTMLDivElement>(null);
  const activeIndex = useRef(-1);
  const contentId=useId();
  const reduced=useReducedMotion();
  const [progress, setProgress] = useState(0);
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
    const element = preview.current;
    const section = root.current;
    const scrollTrack = track.current;
    const scrollRunway = runway.current;
    if (!element || !section || !scrollTrack || !scrollRunway) return;
    let frame=0, current=true;
    const check = () => {
      frame=0;
      const chapterLength = scrollRunway.getBoundingClientRect().height / (features.length + 1);
      const distance = -scrollTrack.getBoundingClientRect().top;
      const position = chapterLength > 0 ? Math.max(0, distance / chapterLength) : 0;
      const nextIndex = basicFeatureIndex(Math.floor(position) - 1, features.length);
      setProgress(Math.round(Math.min(1, position - (nextIndex + 1)) * 1000) / 1000);
      if (nextIndex !== activeIndex.current) {
        activeIndex.current = nextIndex;
        setIndex(nextIndex);
        setManagementPlaying(false);
      }
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
  },[features.length]);
  const select = (chapter: number) => {
    if (!track.current || !runway.current) return;
    const chapterLength = runway.current.getBoundingClientRect().height / (features.length + 1);
    const trackTop = window.scrollY + track.current.getBoundingClientRect().top;
    window.scrollTo({ top: Math.ceil(trackTop + chapter * chapterLength), behavior: "instant" });
  };
  const running=visible && !reduced && !!feature;
  return <div ref={track} className={styles.track} data-basic-scroll-track>
    <div className={styles.stage}>
      <div ref={root} className={`site-marketing-container ${styles.story}`} data-basic-feature-story data-feature-index={index}>
        <div className={styles.copy}>
          <MarketingCopyReveal className="site-stack-content">
            <div className="site-stack-title">
              <ServiceFrameLabel service="basic"/>
              <div key={sceneKey} id={contentId} className={`site-stack-content ${styles.featureCopy}`} data-basic-feature-copy aria-live="polite" aria-atomic="true">
                <h2 id="service-basic-heading" className="type-section-title">{feature ? <>{feature.kind==="featured" ? "사진으로 시선을 끄는" : feature.title}<br/>{feature.label}</> : <>{BASIC_FEATURE_INTRO.title}<br/>{BASIC_FEATURE_INTRO.subtitle}</>}</h2>
                <p className={`type-body-lg ${styles.description}`}>{feature?.body ?? BASIC_FEATURE_INTRO.body}</p>
              </div>
            </div>
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
        <StoryProgress
          label="베이직 기능 탐색"
          chapters={features.map(item => item.label)}
          active={index}
          progress={progress}
          onSelect={featureIndex => select(featureIndex + 1)}
          onStart={() => select(0)}
          story="basic"
          className={styles.progress}
          skip={
            <a href={SERVICE_HOME_HREFS.dining} className="type-caption" aria-label="Skip · 베이직 기능 소개를 건너뛰고 다이닝으로 이동" onClick={event => {
              if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
              if (!document.getElementById("service-dining")) return;
              event.preventDefault();
              revealDiningFromBasic();
            }}><span lang="en">Skip</span></a>
          }
        />
      </div>
      <BasicIdleScrollHint enabled={visible} />
    </div>
    <div ref={runway} className={styles.runway} style={{ "--basic-scene-count": features.length + 1 } as CSSProperties} aria-hidden="true" data-basic-scroll-runway/>
  </div>;
}
