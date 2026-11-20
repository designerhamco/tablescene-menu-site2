/* eslint-disable @next/next/no-img-element -- Photographic foregrounds and exact preview captures share calibrated screen coordinates. */
"use client";

import { useEffect, useRef, useState } from "react";
import { heroScreenMatrix, type HeroQuad } from "@/lib/hero-cafe-motion";
import styles from "./BasicDeviceShowcase.module.css";

export type BasicScreenPair = { key: string; desktop: string; mobile: string };

const monitor = {
  asset: "/assets/service-mockups-v2/silver-monitor.webp",
  width: 1536,
  height: 1024,
  display: [[132, 148], [1385, 47], [1385, 743], [132, 764]] satisfies HeroQuad,
  canvas: { width: 1280, height: 720 },
};

const phone = {
  asset: "/assets/service-mockups-v2/handheld-phone.webp",
  width: 1024,
  height: 1536,
  display: [[312, 124], [815, 80], [817, 1227], [312, 1227]] satisfies HeroQuad,
  canvas: { width: 390, height: 844 },
};

function ProjectedDevice({
  device,
  className,
  capture,
  label,
  kind,
  scene,
}: {
  device: typeof monitor;
  className: string;
  capture: string;
  label: string;
  kind: "monitor" | "phone";
  scene: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const scale = width / device.width;
  const quad = device.display.map(([x, y]) => [x * scale, y * scale]) as unknown as HeroQuad;
  const { width: canvasWidth, height: canvasHeight } = device.canvas;

  return <div ref={root} className={className}>
    <img src={device.asset} width={device.width} height={device.height} className={styles.hardware} alt="" fetchPriority="low" decoding="async" draggable={false} />
    <div
      className={styles.screen}
      style={{
        width: canvasWidth,
        height: canvasHeight,
        transform: width ? heroScreenMatrix(quad, canvasWidth, canvasHeight) : undefined,
        visibility: width ? "visible" : "hidden",
      }}
      data-basic-device-screen={kind}
      data-device-scene={scene}
    >
      <img src={capture} width={canvasWidth} height={canvasHeight} alt={label} decoding="async" draggable={false} />
    </div>
  </div>;
}

export default function BasicDeviceShowcase({ screens, label }: { screens: BasicScreenPair; label: string }) {
  const [ready, setReady] = useState({ screens, label });

  useEffect(() => {
    let active = true;
    const decode = (src: string) => {
      const image = new Image();
      image.src = src;
      return image.decode();
    };

    void Promise.all([decode(screens.desktop), decode(screens.mobile)]).then(() => {
      if (active) setReady({ screens, label });
    }).catch(() => {
      // Keep the previous matching pair if a request fails.
    });

    return () => { active = false; };
  }, [screens, label]);

  return <div className={styles.showcase} data-basic-device-showcase>
    <div className={styles.scene}>
      <ProjectedDevice device={monitor} className={styles.monitor} capture={ready.screens.desktop} label={`${ready.label} 모니터 메뉴판`} kind="monitor" scene={ready.screens.key} />
      <ProjectedDevice device={phone} className={styles.phone} capture={ready.screens.mobile} label={`${ready.label} 모바일 메뉴판`} kind="phone" scene={ready.screens.key} />
    </div>
  </div>;
}
