"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useReducedMotion } from "motion/react";
import { Button } from "@/app/components/ui/button";
import { ArrowLeft, ArrowRight } from "@/app/components/ui/site-arrow";
import { MediaPlayback } from "@/app/components/ui/media-playback";
import type { MarketingFeature } from "@/lib/marketing-service-features";
import type { HomeService } from "@/lib/service-home-navigation";
import MarketingCopyReveal from "./MarketingCopyReveal";
import ServiceFeatureDemo from "./ServiceFeatureDemo";
import styles from "./ServiceFeatureGallery.module.css";

function FeatureMedia({ feature, playing, onToggle, onStop }: { feature: MarketingFeature; playing: boolean; onToggle: () => void; onStop: () => void }) {
  const root = useRef<HTMLDivElement>(null), video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    const element = root.current;
    if (!element || !playing) return;
    let observing = true;
    const observer = new IntersectionObserver(([entry]) => { if (observing && !entry.isIntersecting) onStop(); });
    observer.observe(element);
    let frame = 0;
    const checkCover = () => {
      frame = 0;
      const box = element.getBoundingClientRect();
      const x = Math.max(0, Math.min(innerWidth - 1, box.left + box.width / 2));
      const y = Math.max(0, Math.min(innerHeight - 1, box.top + box.height / 2));
      const front = document.elementFromPoint(x, y);
      if (front && !element.contains(front)) onStop();
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(checkCover); };
    window.addEventListener("scroll", schedule, { passive: true });
    return () => { observing = false; observer.disconnect(); cancelAnimationFrame(frame); window.removeEventListener("scroll", schedule); };
  }, [playing, onStop]);
  useEffect(() => {
    const element = video.current;
    if (!element) return;
    let current = true;
    if (playing) void element.play().catch(error => { if (current && error.name !== "AbortError") { setError(true); onStop(); } });
    else element.pause();
    return () => { current = false; element.pause(); };
  }, [playing, onStop]);
  return <div ref={root} className={styles.media} data-feature-media={feature.kind} data-playing={playing}>
    {feature.media ? <video ref={video} poster={feature.media.poster} muted playsInline preload="none" onEnded={() => { if (playing) onStop(); }} onError={() => { setError(true); if (playing) onStop(); }} aria-label={`${feature.label} 소개 영상`}>
      {feature.media.webm ? <source src={feature.media.webm} type="video/webm"/> : null}
      <source src={feature.media.mp4} type="video/mp4"/>
    </video> : <ServiceFeatureDemo kind={feature.kind} playing={playing}/>}
    <MediaPlayback playing={playing} label={feature.label} onClick={() => { setError(false); onToggle(); }}/>
    {error ? <p className={`type-body-sm ${styles.error}`} role="status">영상을 불러오지 못했습니다.</p> : null}
  </div>;
}

/** Native horizontal scroll keeps touch, keyboard and button navigation in sync. */
export default function ServiceFeatureGallery({ service, title, description, features }: { service: HomeService; title: ReactNode; description: string; features: readonly MarketingFeature[] }) {
  const rail = useRef<HTMLOListElement>(null);
  const reduced = useReducedMotion();
  const railId = useId();
  const [playing, setPlaying] = useState<string | null>(null);
  const [position, setPosition] = useState({ first: 0, start: true, end: false });
  const stop = useCallback(() => setPlaying(null), []);
  useEffect(() => {
    const element = rail.current;
    if (!element) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const left = element.scrollLeft, width = element.clientWidth;
      const cards = [...element.children] as HTMLElement[];
      const edge = element.getBoundingClientRect().left;
      const first = Math.max(0, cards.findIndex(card => card.getBoundingClientRect().right > edge + 1));
      setPosition({ first, start: left <= 1, end: left + width >= element.scrollWidth - 2 });
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(measure); };
    const observer = new ResizeObserver(schedule);
    observer.observe(element);
    element.addEventListener("scroll", schedule, { passive: true });
    measure();
    return () => { observer.disconnect(); cancelAnimationFrame(frame); element.removeEventListener("scroll", schedule); };
  }, [features.length]);
  useEffect(() => {
    const pause = () => { if (document.hidden) stop(); };
    document.addEventListener("visibilitychange", pause);
    return () => document.removeEventListener("visibilitychange", pause);
  }, [stop]);
  const move = (direction: number) => {
    const element = rail.current;
    if (!element) return;
    stop();
    const cards = [...element.children] as HTMLElement[];
    const step = cards.length > 1 ? cards[1].offsetLeft - cards[0].offsetLeft : element.clientWidth;
    const visible = Math.max(1, Math.floor((element.clientWidth + 1) / step));
    const index = Math.max(0, Math.min(cards.length - 1, Math.round(element.scrollLeft / step) + direction * visible));
    element.scrollTo({ left: index * step, behavior: reduced ? "instant" : "smooth" });
  };
  return <div className={`site-marketing-container ${styles.gallery}`} data-service-gallery={service}>
    <div className={styles.intro}>
      <MarketingCopyReveal><h2 id={`service-${service}-heading`} className="type-section-title">{title}</h2></MarketingCopyReveal>
      <MarketingCopyReveal><p className={`type-body-lg ${styles.description}`}>{description}</p></MarketingCopyReveal>
    </div>
    <MarketingCopyReveal className={styles.collection}>
      <div className={`site-action-row ${styles.navigation}`}>
        <Button variant="media" size="icon" aria-label="이전 기능 보기" aria-controls={railId} disabled={position.start} onClick={() => move(-1)}><ArrowLeft/></Button>
        <Button variant="media" size="icon" aria-label="다음 기능 보기" aria-controls={railId} disabled={position.end} onClick={() => move(1)}><ArrowRight/></Button>
        <span className={`type-caption ${styles.count}`} aria-live="polite" aria-atomic="true">{String(position.first + 1).padStart(2, "0")} / {String(features.length).padStart(2, "0")}</span>
      </div>
      <ol ref={rail} id={railId} className={styles.rail} aria-label={`${service === "basic" ? "베이직" : service === "dining" ? "다이닝" : "디스플레이"} 기능 소개`} tabIndex={0} onKeyDown={event => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "ArrowRight" || event.key === "ArrowLeft") { event.preventDefault(); move(event.key === "ArrowRight" ? 1 : -1); }
        if (event.key === "Home" || event.key === "End") { event.preventDefault(); stop(); event.currentTarget.scrollTo({ left: event.key === "Home" ? 0 : event.currentTarget.scrollWidth, behavior: reduced ? "instant" : "smooth" }); }
      }}>
        {features.map(feature => <li className={styles.card} key={feature.kind} data-service-feature={feature.kind}>
          <FeatureMedia feature={feature} playing={playing === feature.kind} onToggle={() => setPlaying(current => current === feature.kind ? null : feature.kind)} onStop={stop}/>
          <div className="site-stack-title">
            <h3 className="type-content-title">{feature.label}</h3>
            <p className={`type-body-sm ${styles.description}`}>{feature.body}</p>
          </div>
        </li>)}
      </ol>
    </MarketingCopyReveal>
  </div>;
}
