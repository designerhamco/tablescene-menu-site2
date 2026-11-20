/* eslint-disable @next/next/no-img-element -- The two photographs and the projected menu share the original image dimensions. */
"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { heroScreenMatrix, type HeroQuad } from "@/lib/hero-cafe-motion";
import styles from "./DisplayDeviceShowcase.module.css";

const directory = "/assets/service-mockups-v2";
const photoWidth = 1254;
const closeUpScreen = [[77, 134], [1168, 40], [1170, 714], [71, 752]] satisfies HeroQuad;
const screenWidth = 1280;
const screenHeight = 720;

export default function DisplayDeviceShowcase({ children, label, capture }: {
  children: ReactNode;
  label: string;
  capture?: string;
}) {
  const closeUp = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [readyCapture, setReadyCapture] = useState<string>();

  useEffect(() => {
    const element = closeUp.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!capture) return;
    let active = true;
    const image = new Image();
    image.src = capture;
    void image.decode().then(() => {
      if (active) setReadyCapture(capture);
    }).catch(() => {
      // Leave the last loaded menu visible if the next capture is unavailable.
    });
    return () => { active = false; };
  }, [capture]);

  const scale = width / photoWidth;
  const quad = closeUpScreen.map(([x, y]) => [x * scale, y * scale]) as unknown as HeroQuad;

  const screen = children ?? (capture && readyCapture ? (
    <img className={styles.capture} src={readyCapture} alt="" decoding="async" draggable={false} />
  ) : null);

  return (
    <div className={styles.showcase} data-display-device-showcase role="img" aria-label={`${label} 디스플레이 시연`}>
      <div className={styles.composition} data-display-composition>
        <div className={`${styles.photograph} ${styles.ceiling}`}>
          <img className={styles.hardware} src={`${directory}/display-ceiling-three.webp`} width={photoWidth} height={510} alt="" loading="lazy" decoding="async" draggable={false} />
        </div>
        <div ref={closeUp} className={`${styles.photograph} ${styles.closeUp}`}>
          <img className={styles.hardware} src={`${directory}/display-close-up-single.webp`} width={photoWidth} height={834} alt="" loading="lazy" decoding="async" draggable={false} />
          {screen && width > 0 ? (
            <div className={styles.screen} style={{ width: screenWidth, height: screenHeight, transform: heroScreenMatrix(quad, screenWidth, screenHeight) }} data-display-device-screen>
              {screen}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
