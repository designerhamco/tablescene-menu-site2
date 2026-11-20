/* eslint-disable @next/next/no-img-element -- GIF demo sources must retain their animation. */
"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useReducedMotion } from "motion/react";
import { MediaPlayback } from "@/app/components/ui/media-playback";
import { MARKETING_SERVICE_FEATURES, type MarketingFeature, type MarketingDemoMedia } from "@/lib/marketing-service-features";
import type { HomeService } from "@/lib/service-home-navigation";
import StoryProgress from "./StoryProgress";
import { revealNextHomeSection } from "@/lib/home-service-cover";
import { basicFeatureIndex } from "@/lib/basic-feature-story";
import { BASIC_STORY_SCREENS, SERVICE_STORY_INTROS, TABLET_STORY_SCREENS } from "@/lib/service-story-screens";
import MarketingCopyReveal from "./MarketingCopyReveal";
import ServiceFrameLabel from "./ServiceFrameLabel";
import BasicDeviceShowcase from "./BasicDeviceShowcase";
import ServiceTabletShowcase from "./ServiceTabletShowcase";
import styles from "./ServiceFeatureStory.module.css";

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
const names = { basic: "베이직", dining: "다이닝", display: "디스플레이" } as const;

const nextSection = {
  basic: { anchor: "service-dining", heading: "service-dining-heading", label: "다이닝으로" },
  dining: { anchor: "service-display", heading: "service-display-heading", label: "디스플레이로" },
  display: { anchor: "home-operations", heading: "home-operations-heading", label: "매장 운영으로" },
} as const;

export default function ServiceFeatureStory({
  service,
  features = MARKETING_SERVICE_FEATURES[service],
}: { service: HomeService; features?: readonly MarketingFeature[] }) {
  const basic = service === "basic";
  const intro = SERVICE_STORY_INTROS[service];
  const next = nextSection[service];
  const track = useRef<HTMLDivElement>(null);
  const runway = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const preview = useRef<HTMLDivElement>(null);
  const activeIndex = useRef(-1);
  const reduced=useReducedMotion();
  const [progress, setProgress] = useState(0);
  const [index,setIndex]=useState(-1), [visible,setVisible]=useState(false), [managementPlaying,setManagementPlaying]=useState(false), [desktop,setDesktop]=useState(false);
  const feature=index<0 ? undefined : features[index];
  const sceneKey=feature?.kind ?? "intro";
  const sceneLabel = feature?.label ?? `${names[service]} 소개`;
  const tabletScreens: Record<string, string> | undefined = basic ? undefined : TABLET_STORY_SCREENS[service];
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
  return <div ref={track} className={styles.track} data-service-scroll-track={service} data-basic-scroll-track={basic ? "" : undefined}>
    <div className={styles.stage}>
      <div ref={root} className={`site-marketing-container ${styles.story}`} data-service-story={service} data-basic-feature-story={basic ? "" : undefined} data-feature-index={index}>
        <div className={styles.copy}>
          <MarketingCopyReveal className="site-stack-content">
            <div className="site-stack-title">
              <ServiceFrameLabel service={service}/>
              <div key={sceneKey} className={`site-stack-content ${styles.featureCopy}`} data-service-copy data-basic-feature-copy={basic ? "" : undefined} aria-live="polite" aria-atomic="true">
                <h2 id={`service-${service}-heading`} tabIndex={-1} className="type-section-title">{feature ? <>{feature.kind==="featured" ? "사진으로 시선을 끄는" : feature.title}<br/>{feature.label}</> : <>{intro.title}<br/>{intro.subtitle}</>}</h2>
                <p className={`type-body-lg ${styles.description}`}>{feature?.body ?? intro.body}</p>
              </div>
            </div>
          </MarketingCopyReveal>
        </div>
        {feature ? <div className={`site-stack-block ${styles.management}`} data-service-management data-basic-management={basic ? "" : undefined}>
          <h3 className="type-label">{feature.label} 관리 화면</h3>
          <div className={styles.managementMedia} key={feature.kind}>
            {feature.managementMedia && desktop ? <DemoMedia media={feature.managementMedia} label={`${feature.label} 관리 화면`} running={visible && desktop && managementPlaying}/> : null}
            <MediaPlayback disabled={!feature.managementMedia} playing={managementPlaying} label={`${feature.label} 관리 화면${feature.managementMedia ? "" : " 영상 준비 중"}`} title={feature.managementMedia ? undefined : "관리 화면 영상 준비 중"} onClick={()=>setManagementPlaying(value=>!value)}/>
          </div>
        </div> : null}
        <div ref={preview} className={styles.visual} data-service-preview={sceneKey} data-basic-feature-preview={basic ? sceneKey : undefined} data-playing={running}>
          <MarketingCopyReveal className={styles.reveal}>
            {basic ? (
              <BasicDeviceShowcase screens={BASIC_STORY_SCREENS[sceneKey] ?? BASIC_STORY_SCREENS.intro} label={sceneLabel} />
            ) : (
              <ServiceTabletShowcase label={sceneLabel}>
                <div key={sceneKey} className={styles.demo} data-service-demo={sceneKey}>
                  {feature?.media ? <DemoMedia media={feature.media} label={feature.label} running={running} /> : (
                    <img className={styles.menuCapture} src={tabletScreens?.[sceneKey] ?? intro.image} alt={`${sceneLabel} 메뉴판`} decoding="async" draggable={false} />
                  )}
                </div>
              </ServiceTabletShowcase>
            )}
          </MarketingCopyReveal>
        </div>
        <StoryProgress
          label={`${names[service]} 기능 탐색`}
          chapters={features.map(item => item.label)}
          active={index}
          progress={progress}
          onSelect={featureIndex => select(featureIndex + 1)}
          onStart={() => select(0)}
          story={service}
          className={styles.progress}
          skip={
            <a href={`/#${next.anchor}`} className="type-caption" aria-label={`Skip · ${names[service]} 기능 소개를 건너뛰고 ${next.label} 이동`} onClick={event => {
              if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
              if (!document.getElementById(next.anchor)) return;
              event.preventDefault();
              revealNextHomeSection(next.anchor, next.heading);
            }}><span lang="en">Skip</span></a>
          }
        />
      </div>
    </div>
    <div ref={runway} className={styles.runway} style={{ "--service-story-scene-count": features.length + 1 } as CSSProperties} aria-hidden="true" data-service-scroll-runway data-basic-scroll-runway={basic ? "" : undefined}/>
  </div>;
}
