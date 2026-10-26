"use client";

import Image from "next/image";
import { Pause, Play } from "lucide-react";
import { useInView } from "motion/react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { DetailFeatureId, DetailFeatureSlide } from "@/lib/template-detail-features";
import styles from "./template-feature-accordion.module.css";

const INTERVAL_MS = 6000;
const subscribeMotion = (callback: () => void) => {
  const query = matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
};

type Props = {
  feature: DetailFeatureId;
  headingId: string;
  label: string;
  title: string;
  description: string;
  slides: readonly DetailFeatureSlide[];
};

export default function TemplateFeatureAccordion({ feature, headingId, label, title, description, slides }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const inView = useInView(root, { amount: .25 });
  const reducedMotion = useSyncExternalStore(subscribeMotion, () => matchMedia("(prefers-reduced-motion: reduce)").matches, () => true);
  const [selected, setSelected] = useState(0);
  const [cycle, setCycle] = useState(0);
  const [paused, setPaused] = useState(false);
  const [motionOptIn, setMotionOptIn] = useState(false);
  const [keyboardFocus, setKeyboardFocus] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(true);
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});
  const slide = slides[selected];
  const requestedPlayback = !paused && (!reducedMotion || motionOptIn);
  const playing = requestedPlayback && !keyboardFocus && inView && documentVisible && Boolean(loaded[slide.image]);

  useEffect(() => {
    const update = () => setDocumentVisible(!document.hidden);
    document.addEventListener("visibilitychange", update);
    update();
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  function select(index: number) {
    setSelected((index + slides.length) % slides.length);
    setCycle(value => value + 1);
  }

  return <div ref={root} className={styles.feature} data-feature-accordion={feature} data-selected-item={selected} data-auto-playing={playing} data-image-ready={Boolean(loaded[slide.image])} data-slide-interval={INTERVAL_MS}
    onFocusCapture={event => setKeyboardFocus(event.target instanceof HTMLElement && event.target.matches(":focus-visible"))}
    onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setKeyboardFocus(false); }}>
    <header className={styles.sectionCopy}>
      <p className={`type-caption ${styles.featureLabel}`}>{label}</p>
      <h2 id={headingId} className="type-section-title">{title}</h2>
      <p className={`type-body ${styles.lede}`}>{description}</p>
    </header>
    <figure className={styles.figure}>
      <div className={styles.imageBox} data-feature-image={slide.image}>
        <Image key={slide.image} src={slide.image} alt={`${label} · ${slide.title} 이미지 예시`} fill sizes="(min-width: 1200px) 38vw, (min-width: 1024px) 32vw, (min-width: 768px) 55vw, 100vw"
          className={styles.image} onLoad={() => setLoaded(current => current[slide.image] ? current : { ...current, [slide.image]: true })} />
      </div>
      <figcaption className={`type-caption ${styles.caption}`}>기능 설명을 위한 이미지 예시</figcaption>
    </figure>
    <ol className={styles.list} aria-label={`${label} 안내 항목`} onKeyDown={event => {
      if (!(event.target instanceof Element) || !event.target.closest("[data-feature-trigger]")) return;
      const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>("[data-feature-trigger]")];
      const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
      const next = event.key === "ArrowDown" ? (index + 1) % buttons.length : event.key === "ArrowUp" ? (index - 1 + buttons.length) % buttons.length : event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : null;
      if (next !== null) { event.preventDefault(); buttons[next]?.focus(); }
    }}>
      {slides.map((item, index) => <li key={item.title} className={styles.item} data-active={selected === index}>
          <button type="button" data-feature-trigger="" aria-pressed={selected === index} className={styles.trigger}
            onClick={event => { if (event.detail > 0) setKeyboardFocus(false); select(index); }}>
            <span className={`type-caption ${styles.itemNumber}`} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
            <span className={styles.itemCopy}>
              <span className={`type-content-title ${styles.itemTitle}`} role="heading" aria-level={3}>{item.title}</span>
              <span className={`type-body-sm ${styles.itemDescription}`}>{item.description}</span>
            </span>
          </button>
          <span className={styles.track} aria-hidden="true">{selected === index ? <span key={`${selected}-${cycle}`} className={styles.progress} style={{ animationDuration: `${INTERVAL_MS}ms`, animationPlayState: playing ? "running" : "paused" }} onAnimationEnd={() => { if (playing && !document.hidden) select(selected + 1); }} /> : null}</span>
        </li>)}
    </ol>
    <div className={styles.playback}>
      <span className="type-caption">자동 전환</span>
      <button type="button" className="site-button site-button-ghost" aria-label={`${label} 자동 전환 ${requestedPlayback ? "일시정지" : "재생"}`} onClick={() => {
        if (requestedPlayback) setPaused(true);
        else { setPaused(false); setMotionOptIn(true); setKeyboardFocus(false); }
      }}>{requestedPlayback ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}</button>
    </div>
  </div>;
}
