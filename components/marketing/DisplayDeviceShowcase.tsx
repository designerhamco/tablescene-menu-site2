/* eslint-disable @next/next/no-img-element -- These photographs use calibrated artwork coordinates. */
"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { heroScreenMatrix, type HeroQuad } from "@/lib/hero-cafe-motion";
import styles from "./DisplayDeviceShowcase.module.css";

const directory = "/assets/service-mockups-v2";
const photoWidth = 1254;
const closeUpScreen = [[77, 134], [1168, 40], [1170, 714], [71, 752]] satisfies HeroQuad;
const screenWidth = 1280;
const screenHeight = 720;

// Bezel edges sampled from the ceiling photograph, in image pixels.
const ceilingPanels = [
  { clip: styles.ceilingLeft, bezel: [[130, 258.9], [458, 232.4], [458, 447.8], [130, 464.9]] },
  { clip: styles.ceilingMiddle, bezel: [[475, 236.4], [808, 209.6], [808, 428.3], [475, 446.7]] },
  { clip: styles.ceilingRight, bezel: [[831, 210.4], [1180, 181.4], [1180, 408.7], [831, 426.7]] },
] satisfies { clip: string; bezel: HeroQuad }[];

const [topLeft, topRight] = closeUpScreen;
const railSlope = (topRight[1] - topLeft[1]) / (topRight[0] - topLeft[0]);
const [firstPanelTop, , , firstPanelBottom] = ceilingPanels[0].bezel;

function scaledQuad(quad: HeroQuad, scale: number): HeroQuad {
  return quad.map(([x, y]) => [x * scale, y * scale]) as unknown as HeroQuad;
}

function ceilingPanelTransform(bezel: HeroQuad, scale: number): string {
  const target = bezel.map(([x], corner) => {
    const isTop = corner < 2;
    const anchor = isTop ? firstPanelTop : firstPanelBottom;
    // Both ceiling edges follow the close-up's top edge, as in the review guides.
    return [x, anchor[1] + (x - anchor[0]) * railSlope];
  }) as unknown as HeroQuad;
  const sourceMatrix = new DOMMatrix(heroScreenMatrix(scaledQuad(bezel, scale), screenWidth, screenHeight));
  const targetMatrix = new DOMMatrix(heroScreenMatrix(scaledQuad(target, scale), screenWidth, screenHeight));
  return targetMatrix.multiply(sourceMatrix.inverse()).toString();
}

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
  const quad = scaledQuad(closeUpScreen, scale);
  const ceilingTransforms = useMemo(
    () => scale > 0 ? ceilingPanels.map(({ bezel }) => ceilingPanelTransform(bezel, scale)) : [],
    [scale],
  );

  const screen = children ?? (capture && readyCapture ? (
    <img className={styles.capture} src={readyCapture} alt="" decoding="async" draggable={false} />
  ) : null);

  return (
    <div className={styles.showcase} data-display-device-showcase role="img" aria-label={`${label} 디스플레이 시연`}>
      <div className={styles.composition} data-display-composition>
        <div className={`${styles.photograph} ${styles.ceiling}`} data-display-ceiling>
          {ceilingPanels.map(({ clip }, index) => (
            <img
              key={clip}
              className={`${styles.hardware} ${styles.ceilingPanel} ${clip}`}
              src={`${directory}/display-ceiling-three.webp`}
              width={photoWidth}
              height={510}
              style={{ transform: ceilingTransforms[index] }}
              alt=""
              loading="lazy"
              decoding="async"
              draggable={false}
            />
          ))}
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
