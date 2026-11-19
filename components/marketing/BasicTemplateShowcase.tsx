/* eslint-disable @next/next/no-img-element -- Approved transparent photo is layered with a projective screen. */
"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { basicTabletScreenMatrix, BASIC_DEMO_CANVAS } from "@/lib/basic-feature-story";
import styles from "./BasicTemplateShowcase.module.css";

/** The approved foreground and demo use one responsive scene coordinate system. */
export default function BasicTemplateShowcase({ children, label }: { children: ReactNode; label: string }) {
  const scene = useRef<HTMLDivElement>(null);
  const [width,setWidth] = useState(0);
  useEffect(() => {
    const element=scene.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return <div className={styles.showcase} data-basic-showcase>
    <div ref={scene} className={styles.scene}>
      <div className={styles.glow} aria-hidden="true"/>
      <img className={styles.tablet} src="/assets/basic-showcase-v1/tablet-hands-cutout.png" width={1536} height={1024} alt="" loading="lazy" decoding="async" draggable={false}/>
      <div className={styles.screen} style={{ width:BASIC_DEMO_CANVAS.width, height:BASIC_DEMO_CANVAS.height, transform:width ? basicTabletScreenMatrix(width) : undefined, visibility:width ? "visible" : "hidden" }} role="img" aria-label={`${label} 태블릿 시연`} data-basic-tablet-screen>
        {children}
      </div>
    </div>
  </div>;
}
