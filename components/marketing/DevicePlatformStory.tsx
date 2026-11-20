/* eslint-disable @next/next/no-img-element -- Use the original monitor photo and calibrated local menu captures. */
"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Button } from "@/app/components/ui/button";
import { ProgressBar } from "@/app/components/ui/loading-state";
import {
  DEVICE_MONITOR_PHOTO, DEVICE_STAGES, clampDeviceProgress, deviceMorphAt, deviceStageProgress,
} from "@/lib/device-platform-story";
import MarketingCopyReveal from "./MarketingCopyReveal";
import styles from "./DevicePlatformStory.module.css";

export default function DevicePlatformStory() {
  const start = useRef<HTMLDivElement>(null);
  const section = useRef<HTMLElement>(null);
  const story = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const visual = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ progress: 0, width: 0, height: 0, reduced: false });
  const [stillIndex, setStillIndex] = useState(0);

  useEffect(() => {
    const marker = start.current, root = section.current, track = story.current;
    const sticky = stage.current, scene = visual.current;
    if (!marker || !root || !track || !sticky || !scene) return;

    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      const width = scene.clientWidth, height = scene.clientHeight, reduced = preference.matches;
      const inset = parseFloat(getComputedStyle(root).scrollMarginTop) || 0;
      const range = Math.max(1, track.offsetHeight - sticky.offsetHeight);
      const progress = reduced ? 0 : clampDeviceProgress((inset - marker.getBoundingClientRect().top) / range);
      setView(previous => previous.progress === progress && previous.width === width &&
        previous.height === height && previous.reduced === reduced ? previous : { progress, width, height, reduced });
    };
    let pending = 0;
    const schedule = () => {
      if (pending) return;
      pending = requestAnimationFrame(() => {
        pending = 0;
        update();
      });
    };
    const resize = new ResizeObserver(schedule);
    resize.observe(scene);
    resize.observe(track);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    preference.addEventListener("change", schedule);
    update();

    const anchor = requestAnimationFrame(() => {
      if (location.hash === "#device-platform") {
        const inset = parseFloat(getComputedStyle(root).scrollMarginTop) || 0;
        const top = Math.ceil(window.scrollY + marker.getBoundingClientRect().top - inset);
        window.scrollTo({ top, behavior: "instant" });
        schedule();
      }
    });
    return () => {
      cancelAnimationFrame(pending);
      cancelAnimationFrame(anchor);
      resize.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      preference.removeEventListener("change", schedule);
    };
  }, []);

  function select(index: number) {
    if (view.reduced) {
      setStillIndex(index);
      return;
    }
    const marker = start.current, root = section.current, track = story.current, sticky = stage.current;
    if (!marker || !root || !track || !sticky) return;
    const inset = parseFloat(getComputedStyle(root).scrollMarginTop) || 0;
    const range = track.offsetHeight - sticky.offsetHeight;
    window.scrollTo({
      top: Math.ceil(window.scrollY + marker.getBoundingClientRect().top - inset + range * deviceStageProgress(index)),
      behavior: "smooth",
    });
  }

  const progress = view.reduced ? deviceStageProgress(stillIndex) : view.progress;
  const frame = deviceMorphAt(view.width, view.height, progress);
  const style = {
    "--device-width": `${frame.width}px`,
    "--device-height": `${frame.height}px`,
    "--device-bezel": `${frame.bezel}px`,
    "--device-radius": `${frame.radius}px`,
    "--device-rotation": `${frame.rotation}deg`,
    "--inner-width": `${Math.max(0, frame.width - 2 * frame.bezel)}px`,
    "--inner-height": `${Math.max(0, frame.height - 2 * frame.bezel)}px`,
    "--stand-height": `${frame.standHeight}px`,
    "--stand-lift": `${frame.standLift}px`,
    "--stand-top": `${frame.standTop}px`,
    "--stand-opacity": frame.standOpacity,
    "--shadow-top": `${frame.shadowTop}px`,
    "--shadow-width": `${frame.shadowWidth}px`,
    "--tablet-detail": frame.tabletDetail,
    "--phone-detail": frame.phoneDetail,
  } as CSSProperties;

  return <>
    <div ref={start} aria-hidden="true" />
    <section ref={section} id="device-platform" className={styles.section} aria-labelledby="device-platform-heading" data-device-section>
      <div ref={story} className={styles.story} data-device-platform data-progress={progress.toFixed(4)}
        data-device-index={frame.active} data-reduced={view.reduced} data-menu-template="cafe_sunday_line_a" data-image-mode="static">
        <div ref={stage} className={styles.stage} data-device-stage>
          <div className={`site-marketing-container ${styles.copy}`}>
            <MarketingCopyReveal className="site-stack-title">
              <h2 id="device-platform-heading" tabIndex={-1} className="type-section-title">웹 링크 하나로, 어디서든 자유롭게.</h2>
              <p className="type-body-lg site-copy-muted">{view.reduced ? "기기를 선택하면 같은 메뉴판의 화면 배치가 바뀝니다." : "스크롤하면 같은 메뉴판이 기기 크기와 방향에 맞춰 바뀝니다."}</p>
            </MarketingCopyReveal>
          </div>
          <div className={`site-marketing-container ${styles.visual}`}>
            <div ref={visual} className={styles.scene} style={style} role="img"
              aria-label="PC 모니터, 가로·세로 태블릿, 모바일에서 보는 멜로크레마 메뉴판">
              <div className={styles.shadow} />
              <div className={styles.stand} data-device-stand>
                <img src={DEVICE_MONITOR_PHOTO.src} width={DEVICE_MONITOR_PHOTO.width} height={DEVICE_MONITOR_PHOTO.height}
                  loading="lazy" decoding="async" alt="" style={{
                    width: DEVICE_MONITOR_PHOTO.width * frame.photoScale,
                    height: DEVICE_MONITOR_PHOTO.height * frame.photoScale,
                    left: -DEVICE_MONITOR_PHOTO.bodyX * frame.photoScale,
                    top: -DEVICE_MONITOR_PHOTO.standY * frame.photoScale,
                  }} />
              </div>
              <div className={styles.shell} data-device-body>
                <span className={styles.camera} />
                <div className={styles.screen} data-device-screen>
                  {DEVICE_STAGES.map((device, index) => (
                    <img key={device.id} className={index >= 2 ? styles.portrait : undefined}
                      src={device.src} loading="lazy" decoding="async" alt="" data-device-screen-scene={device.id}
                      style={{ opacity: frame.screenOpacity[index] }} />
                  ))}
                  <span className={styles.notch} />
                </div>
              </div>
            </div>
          </div>
          <nav className={`site-marketing-container ${styles.navigation}`} aria-label="미리 볼 기기 선택">
            <div className={styles.controls}>
              {DEVICE_STAGES.map((device, index) => {
                const active = frame.active === index;
                return <div className={styles.control} key={device.id} data-active={active}>
                  <div className={styles.controlDisplay} aria-hidden="true">
                    <ProgressBar label={device.label} value={active ? 100 : 0} />
                    <span className="type-caption">{device.label}</span>
                  </div>
                  <Button className={styles.action} type="button" variant="ghost" size="icon"
                    aria-label={device.label} aria-current={active ? "step" : undefined}
                    onClick={() => select(index)} />
                </div>;
              })}
            </div>
          </nav>
        </div>
      </div>
    </section>
  </>;
}
