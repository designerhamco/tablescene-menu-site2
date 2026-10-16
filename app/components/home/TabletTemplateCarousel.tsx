'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import useEmblaCarousel from 'embla-carousel-react';
import { ArrowLeft, ArrowRight, Pause, Play } from 'lucide-react';
import { useInView, useReducedMotion } from 'motion/react';
import styles from './TabletTemplateCarousel.module.css';

// Temporary marketing screens. Replace these with the supplied screen images
// here; the customer-facing menu templates and their renderers are independent.
const PREVIEW_SCREENS = [
  { id: 'cafe', image: '/menu-templates/cafe_design_a/real-matcha-menu-featured.jpg', title: 'Coffee\n& dessert', category: 'CAFE MENU', theme: 'matcha' },
  { id: 'dining', image: '/menu-templates/restaurant_onue_a/onue-dining-atmosphere-v1.webp', title: 'A moment\nto savour', category: 'DINING MENU', theme: 'ivory' },
  { id: 'bakery', image: '/menu-templates/fast_food_loop_bagel_a/featured-plain-bagel-loop-packaging.webp', title: 'Fresh from\nthe oven', category: 'BAKERY MENU', theme: 'cream' },
  { id: 'bar', image: '/menu-templates/cafe_round_focus_a/rosy-orange-cocktail.jpg', title: 'Good food.\nGood company.', category: 'BAR & TABLE', theme: 'dark' },
  { id: 'coffee', image: '/menu-templates/cafe_sunday_line_a/sunday-roasters-featured-01.png', title: 'Your daily\nlittle ritual', category: 'COFFEE MENU', theme: 'blue' },
] as const;

const AUTO_ADVANCE_MS = 3200;

export default function TabletTemplateCarousel() {
  const root = useRef<HTMLDivElement>(null);
  const isInView = useInView(root, { amount: 0.2 });
  const reducedMotion = useReducedMotion();
  const [viewportRef, carousel] = useEmblaCarousel({ loop: true, align: 'center', duration: 40 });
  const [selected, setSelected] = useState(0);
  const [paused, setPaused] = useState(false);
  const [motionOptIn, setMotionOptIn] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(true);

  useEffect(() => {
    const updateVisibility = () => setDocumentVisible(!document.hidden);
    updateVisibility();
    document.addEventListener('visibilitychange', updateVisibility);
    return () => document.removeEventListener('visibilitychange', updateVisibility);
  }, []);

  useEffect(() => {
    if (!carousel) return;
    const slides = carousel.slideNodes();
    const panels = slides.map((slide) => slide.querySelector<HTMLElement>('[data-showcase-screen]'));

    // Scale from the actual scroll position so swiping and automatic movement
    // share the same continuous center-to-side transition, including the loop.
    const updateDepth = () => {
      const engine = carousel.internalEngine();
      const progress = carousel.scrollProgress();
      carousel.scrollSnapList().forEach((snap, index) => {
        let distance = snap - progress;
        engine.slideLooper.loopPoints.forEach((point) => {
          if (point.index !== index || point.target() === 0) return;
          if (point.target() < 0) distance = snap - (1 + progress);
          if (point.target() > 0) distance = snap + (1 - progress);
        });
        const steps = Math.abs(distance * slides.length);
        const scale = Math.max(0.72, 1 - steps * 0.18);
        const panel = panels[index];
        if (panel) {
          panel.style.transform = `scale(${scale})`;
          panel.style.filter = `blur(${Math.min(3, steps * 1.8)}px)`;
          panel.style.opacity = String(Math.max(0.5, 1 - steps * 0.28));
        }
        slides[index].style.zIndex = String(10 - Math.min(5, Math.round(steps)));
      });
    };
    const updateSelection = () => setSelected(carousel.selectedScrollSnap());
    const onPointerDown = () => setDragging(true);
    const onPointerUp = () => setDragging(false);
    carousel.on('scroll', updateDepth).on('reInit', updateDepth).on('select', updateSelection)
      .on('pointerDown', onPointerDown).on('pointerUp', onPointerUp);
    updateDepth();
    updateSelection();
    return () => {
      carousel.off('scroll', updateDepth).off('reInit', updateDepth).off('select', updateSelection)
        .off('pointerDown', onPointerDown).off('pointerUp', onPointerUp);
    };
  }, [carousel]);

  const motionAllowed = reducedMotion === false || motionOptIn;
  const playbackPaused = paused || !motionAllowed || focused;
  const autoPlaying = motionAllowed && !paused && !focused && !dragging && documentVisible && isInView;
  useEffect(() => {
    if (!carousel || !autoPlaying) return;
    const timer = window.setInterval(() => carousel.scrollNext(Boolean(reducedMotion)), AUTO_ADVANCE_MS);
    return () => window.clearInterval(timer);
  }, [autoPlaying, carousel, reducedMotion, selected]);

  return (
    <div
      ref={root}
      className={styles.carousel}
      role="region"
      aria-roledescription="캐러셀"
      aria-label="메뉴 디자인 화면 둘러보기"
      data-tablet-carousel
      data-selected-slide={selected}
      data-auto-playing={autoPlaying}
      onFocusCapture={(event) => {
        // Keyboard navigation pauses playback; clicking the arrows does not.
        setFocused(event.target instanceof HTMLElement && event.target.matches(':focus-visible'));
      }}
      onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}
      onKeyDown={(event) => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        event.preventDefault();
        if (event.key === 'ArrowLeft') carousel?.scrollPrev(Boolean(reducedMotion));
        else carousel?.scrollNext(Boolean(reducedMotion));
      }}
    >
      <div className={styles.viewport} ref={viewportRef}>
        <div className={styles.track}>
          {PREVIEW_SCREENS.map((screen, index) => (
            <div
              key={screen.id}
              className={styles.slide}
              role="group"
              aria-roledescription="슬라이드"
              aria-label={`임시 메뉴 화면 ${index + 1} / ${PREVIEW_SCREENS.length}`}
              aria-hidden={selected !== index}
            >
              <div className={styles.panel} data-showcase-screen>
                <div className={styles.screen} data-theme={screen.theme} aria-hidden="true">
                  <Image
                    src={screen.image}
                    alt=""
                    width={960}
                    height={1200}
                    sizes="(max-width: 639px) 40vw, 30vw"
                    className={styles.previewImage}
                    draggable={false}
                  />
                  <div className={styles.previewCopy}>
                    <span className={styles.previewLabel}>{screen.category}</span>
                    <strong className={styles.previewTitle}>{screen.title}</strong>
                    <div className={styles.previewMenu}>
                      {['Signature', 'Seasonal selection', 'House favourites', 'Something sweet'].map((label, row) => (
                        <div className={styles.previewRow} key={label}>
                          <span>{label}</span><span>{[6.5, 7.0, 8.5, 6.0][row].toFixed(1)}</span>
                          <i /><i />
                        </div>
                      ))}
                    </div>
                    <span className={styles.previewFooter}>MADE WITH ARTIMENU</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className={styles.controls}>
        <button type="button" className="site-button site-button-ghost site-button-icon" aria-label="이전 메뉴 디자인" onClick={() => carousel?.scrollPrev(Boolean(reducedMotion))}>
          <ArrowLeft size={18} aria-hidden="true" />
        </button>
        <span className={styles.counter} aria-live={autoPlaying ? 'off' : 'polite'} aria-atomic="true">
          <span className="sr-only">메뉴 디자인 </span>{String(selected + 1).padStart(2, '0')}<span className={styles.counterDivider}>/</span><span className={styles.counterTotal}>{String(PREVIEW_SCREENS.length).padStart(2, '0')}</span>
        </span>
        <button type="button" className="site-button site-button-ghost site-button-icon" aria-label="다음 메뉴 디자인" onClick={() => carousel?.scrollNext(Boolean(reducedMotion))}>
          <ArrowRight size={18} aria-hidden="true" />
        </button>
        <button type="button" className="site-button site-button-ghost site-button-icon" aria-label={playbackPaused ? '메뉴 디자인 자동 넘김 재생' : '메뉴 디자인 자동 넘김 일시 정지'} onClick={() => {
          // Explicit playback must work while the playback button keeps focus.
          if (playbackPaused) {
            setMotionOptIn(true);
            setFocused(false);
            setPaused(false);
          } else setPaused(true);
        }}>
          {playbackPaused ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}
        </button>
      </div>
    </div>
  );
}
