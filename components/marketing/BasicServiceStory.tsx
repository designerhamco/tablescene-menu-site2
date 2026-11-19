"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { BASIC_STORY_SVH, basicStoryAt } from "@/lib/basic-service-story";
import { MARKETING_SERVICE_FEATURES } from "@/lib/marketing-service-features";
import BasicTemplateShowcase from "./BasicTemplateShowcase";
import MarketingVisual from "./MarketingVisual";
import styles from "./BasicServiceStory.module.css";

export default function BasicServiceStory() {
  const root = useRef<HTMLDivElement>(null), stage = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [shortViewport, setShortViewport] = useState(false);
  const [progress, setProgress] = useState(0);
  const staticLayout = Boolean(reduced) || shortViewport;
  useEffect(() => {
    const query = window.matchMedia("(max-height:650px)");
    const update = () => setShortViewport(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    const element = root.current, viewport = stage.current;
    if (!element || !viewport || staticLayout) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const travel = Math.max(1, element.offsetHeight - viewport.offsetHeight);
      setProgress(Math.max(0, Math.min(1, -element.getBoundingClientRect().top / travel)));
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const observer = new ResizeObserver(schedule);
    observer.observe(element);
    observer.observe(viewport);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    update();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [staticLayout]);

  const state = basicStoryAt(progress);
  return <div ref={root} className={styles.story} style={staticLayout ? undefined : { height: `${BASIC_STORY_SVH}svh` }} data-basic-story data-progress={progress.toFixed(4)} data-chapter={state.chapter} data-static={staticLayout}>
    <div ref={stage} className={styles.stage}>
      <div className={styles.scene} style={staticLayout ? undefined : { opacity: state.intro }} aria-hidden={!staticLayout && state.chapter !== -1} data-basic-intro>
        <div className={`site-marketing-container ${styles.introLayout}`}>
          <div className={`site-stack-title ${styles.introCopy}`} style={staticLayout ? undefined : { opacity: state.introCopy, transform: `translateY(${(1 - state.introCopy) * 12}px)` }}>
            <h2 id="service-basic-heading" className="type-section-title">베이직</h2>
            <p className={`type-body-lg ${styles.description}`}>시그니처부터 오늘의 혜택까지, 한 장에 담는 우리 매장의 메뉴판.</p>
          </div>
          <BasicTemplateShowcase active={state.chapter === -1 || staticLayout} reveal={staticLayout ? 1 : state.tablet}/>
        </div>
      </div>
      {MARKETING_SERVICE_FEATURES.basic.map((feature, index) => {
        const opacity = state.features[index];
        const active = state.chapter === index;
        return <div className={styles.scene} key={feature.kind} style={staticLayout ? undefined : { opacity }} aria-hidden={!staticLayout && !active} data-basic-feature={feature.kind} data-active={active}>
          <div className={`site-marketing-container ${styles.featureLayout}`}>
            <div className={`site-stack-title ${styles.featureCopy}`} style={staticLayout ? undefined : { transform: `translateY(${(1 - opacity) * 12}px)` }}>
              <h3 className="type-section-title">{feature.label}</h3>
              <p className={`type-body ${styles.description}`}>{feature.body}</p>
            </div>
            <div className={styles.artwork} data-basic-feature-artwork>
              <MarketingVisual kind={feature.kind}/>
            </div>
          </div>
        </div>;
      })}
    </div>
  </div>;
}
