'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Pause, Play } from 'lucide-react';
import { useInView, useReducedMotion } from 'motion/react';
import HeroDeviceScene from './HeroDeviceScene';
import styles from './HomeHero.module.css';

const INTERVAL_MS = 4000;
// Temporary photos can be replaced here without changing the hero geometry.
const SLIDES = [
  { id: 'devices', label: '모든 기기에서 만나는 디지털 메뉴판', src: '' },
  { id: 'dining', label: '다이닝 메뉴 이미지 예시', src: '/menu-templates/restaurant_onue_a/onue-dining-atmosphere-v1.webp' },
  { id: 'bakery', label: '베이커리 메뉴 이미지 예시', src: '/menu-templates/fast_food_loop_bagel_a/featured-plain-bagel-loop-packaging.webp' },
  { id: 'coffee', label: '카페 메뉴 이미지 예시', src: '/menu-templates/cafe_sunday_line_a/sunday-roasters-featured-01.png' },
] as const;

export default function HomeHeroCarousel() {
  const root = useRef<HTMLDivElement>(null);
  const inView = useInView(root, { amount: 0.2 });
  const reducedMotion = useReducedMotion();
  const [selected, setSelected] = useState(0);
  const [cycle, setCycle] = useState(0);
  const [paused, setPaused] = useState(false);
  const [motionOptIn, setMotionOptIn] = useState(false);
  const [keyboardFocus, setKeyboardFocus] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(true);
  const [loaded, setLoaded] = useState<boolean[]>(SLIDES.map(() => false));
  const pointerStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const updateVisibility = () => setDocumentVisible(!document.hidden);
    updateVisibility();
    document.addEventListener('visibilitychange', updateVisibility);
    return () => document.removeEventListener('visibilitychange', updateVisibility);
  }, []);

  const requestedPlayback = !paused && !keyboardFocus && (!reducedMotion || motionOptIn);
  const autoPlaying = requestedPlayback && inView && documentVisible && loaded[selected];

  function selectSlide(index: number) {
    setSelected((index + SLIDES.length) % SLIDES.length);
    setCycle((current) => current + 1);
  }

  function markLoaded(index: number) {
    setLoaded((current) => current[index] ? current : current.map((value, i) => i === index || value));
  }

  return (
    <div
      ref={root}
      role="region"
      aria-roledescription="캐러셀"
      aria-label="아티메뉴 다이닝 소개 슬라이드"
      data-hero-carousel
      data-selected-slide={selected}
      data-auto-playing={autoPlaying}
      data-slide-interval={INTERVAL_MS}
      onFocusCapture={(event) => setKeyboardFocus(event.target instanceof HTMLElement && event.target.matches(':focus-visible'))}
      onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setKeyboardFocus(false); }}
      onKeyDown={(event) => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        event.preventDefault();
        selectSlide(selected + (event.key === 'ArrowLeft' ? -1 : 1));
      }}
    >
      <div
        data-home-hero-frame
        className={styles.frame}
        onPointerDown={(event) => { if (event.pointerType !== 'mouse') pointerStart.current = { x: event.clientX, y: event.clientY }; }}
        onPointerCancel={() => { pointerStart.current = null; }}
        onPointerUp={(event) => {
          const start = pointerStart.current;
          pointerStart.current = null;
          if (!start) return;
          const delta = event.clientX - start.x;
          if (Math.abs(delta) > 45 && Math.abs(delta) > Math.abs(event.clientY - start.y) * 1.3) selectSlide(selected + (delta < 0 ? 1 : -1));
        }}
      >
        {SLIDES.map((slide, index) => (
          <div key={slide.id} className={styles.slide} data-active={index === selected} data-hero-slide={slide.id} role="group" aria-roledescription="슬라이드" aria-label={`${index + 1} / ${SLIDES.length}: ${slide.label}`} aria-hidden={index !== selected}>
            {index === 0 ? <HeroDeviceScene onLoad={() => markLoaded(index)} /> : (
              <Image src={slide.src} alt={slide.label} fill sizes="(min-width: 1600px) 1520px, 100vw" className={styles.slidePhoto} onLoad={() => markLoaded(index)} />
            )}
          </div>
        ))}
      </div>
      <div className={styles.controls}>
        <div className={styles.indicators} role="group" aria-label="슬라이드 선택">
          {SLIDES.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              className={styles.indicatorButton}
              data-active={selected === index}
              aria-label={`${index + 1}번 슬라이드 보기`}
              aria-current={selected === index ? 'true' : undefined}
              onClick={(event) => { if (event.detail > 0) setKeyboardFocus(false); selectSlide(index); }}
            >
              <span className={styles.indicatorTrack} aria-hidden="true">
                {selected === index ? <span key={`${selected}-${cycle}`} className={styles.indicatorFill} data-static={Boolean(reducedMotion && !motionOptIn)} style={{ animationDuration: `${INTERVAL_MS}ms`, animationPlayState: autoPlaying ? 'running' : 'paused' }} onAnimationEnd={() => { if (autoPlaying && !document.hidden) selectSlide(selected + 1); }} /> : null}
              </span>
            </button>
          ))}
        </div>
        <button
          type="button"
          className={styles.playbackButton}
          aria-label={requestedPlayback ? '자동 슬라이드 일시 정지' : '자동 슬라이드 재생'}
          onClick={() => {
            if (requestedPlayback) setPaused(true);
            else { setPaused(false); setMotionOptIn(true); setKeyboardFocus(false); }
          }}
        >
          {requestedPlayback ? <Pause size={15} aria-hidden="true" /> : <Play size={15} aria-hidden="true" />}
        </button>
      </div>
      <p className="sr-only" aria-live={autoPlaying ? 'off' : 'polite'} aria-atomic="true">{selected + 1} / {SLIDES.length} 슬라이드</p>
    </div>
  );
}
