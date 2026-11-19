/* eslint-disable @next/next/no-img-element -- Static menu artwork and the transparent photo retain their native proportions. */
"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./BasicTemplateShowcase.module.css";

const templates = [
  "/template-previews/cafe_real_matcha_a.jpg",
  "/template-previews/cafe_round_focus_a.jpg",
  "/template-previews/fast_food_loop_bagel_a.jpg",
  "/template-previews/cafe_sunday_roasters_a.jpg",
  "/template-previews/cafe_mocha_forest_a.jpg",
] as const;

/** Decorative background movement is independent of the page's scroll story. */
export default function BasicTemplateShowcase({ active = true, reveal = 1 }: { active?: boolean; reveal?: number }) {
  const root = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setPlaying(entry.isIntersecting));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const running = playing && active;
  return <div ref={root} className={styles.showcase} data-basic-showcase data-playing={running}>
    <div className={styles.scene}>
      <div className={styles.glow} aria-hidden="true"/>
      <div className={styles.marquee} aria-hidden="true" data-basic-template-marquee>
        <div className={styles.track}>
          {[0, 1].map(copy => <div className={styles.templateSequence} key={copy} data-basic-template-group>
            {templates.map(src => <img key={src} src={src} width={1200} height={900} alt="" loading={running ? "eager" : "lazy"} decoding="async" draggable={false}/>)}
          </div>)}
        </div>
      </div>
      <img className={styles.tablet} style={{ opacity: reveal, transform: `translateY(${(1 - reveal) * 28}px)` }} src="/assets/basic-showcase-v1/tablet-hands-cutout.png" width={1536} height={1024} alt="빈 화면의 가로 태블릿을 양손으로 들고 있는 모습" loading="lazy" decoding="async" draggable={false} data-basic-tablet data-reveal={reveal.toFixed(3)}/>
    </div>
  </div>;
}
