"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { HERO_CAFE_CHAPTERS, HERO_CHAPTER_DURATION_MS, advanceHeroClock, heroSceneAt } from "@/lib/hero-cafe-motion";

/** One scene clock drives playback and manual scroll seeking. */
export function useHeroPlayback({ root, stage, chapter, enabled, reduced, readyKey }: {
  root: RefObject<HTMLElement | null>;
  stage: RefObject<HTMLDivElement | null>;
  chapter: number;
  enabled: boolean;
  reduced: boolean;
  readyKey: string;
}) {
  const clock = useRef({ chapter: 0, elapsed: 0 }), idleUntil = useRef(0), pointerDown = useRef(false);
  const target = useRef<{ y: number; until: number } | null>(null), autoPosition = useRef<number | null>(null), rewind = useRef<number | undefined>(undefined);
  const [time, setTime] = useState({ chapter: 0, fraction: 0 }), [paused, setPaused] = useState(false);
  const [finished, setFinished] = useState(false), [replay, setReplay] = useState(0);
  const [hovered, setHovered] = useState(false), [focused, setFocused] = useState(false);

  const select = useCallback((index: number, automatic = false) => {
    if (!root.current || !stage.current) return;
    const next = Math.max(0, Math.min(HERO_CAFE_CHAPTERS.length - 1, index));
    const top = window.scrollY + root.current.getBoundingClientRect().top;
    // Stay just inside the chosen scene even when the browser rounds subpixel scroll positions.
    const y = top + (root.current.offsetHeight - stage.current.offsetHeight) * next / HERO_CAFE_CHAPTERS.length + .5;
    window.clearTimeout(rewind.current);
    autoPosition.current = null;
    clock.current = { chapter: next, elapsed: 0 };
    if (!automatic) { setPaused(false); setFinished(false); setTime({ chapter: next, fraction: 0 }); }
    target.current = { y, until: performance.now() + 2500 };
    window.scrollTo({ top: y, behavior: automatic && !reduced ? "smooth" : "instant" });
  }, [root, stage, reduced]);

  const syncScroll = useCallback((progress: number) => {
    if (target.current) {
      if (Math.abs(window.scrollY - target.current.y) < 2 || performance.now() >= target.current.until) target.current = null;
      return;
    }
    if (autoPosition.current !== null && Math.abs(window.scrollY - autoPosition.current) < 2) {
      autoPosition.current = null;
      return;
    }
    const next = heroSceneAt(progress), previous = clock.current;
    // Restore native popup/cart/page state after a backwards seek, once the gesture settles.
    if (previous.chapter !== next.chapter) window.clearTimeout(rewind.current);
    else if (next.elapsed < previous.elapsed - 1) {
      window.clearTimeout(rewind.current);
      rewind.current = window.setTimeout(() => setReplay(value => value + 1), 160);
    }
    clock.current = { chapter: next.chapter, elapsed: next.elapsed };
    idleUntil.current = performance.now() + 2200;
    setTime({ chapter: next.chapter, fraction: next.fraction });
    setFinished(next.chapter === HERO_CAFE_CHAPTERS.length - 1 && next.fraction === 1);
  }, []);

  const activate = useCallback((index: number) => {
    if (index !== chapter) { select(index); return; }
    if (reduced) return;
    if (finished) { setReplay(value => value + 1); select(index); }
    else setPaused(value => !value);
  }, [chapter, finished, reduced, select]);

  useEffect(() => () => window.clearTimeout(rewind.current), []);
  useEffect(() => {
    const cancel = () => {
      autoPosition.current = null;
      if (target.current) {
        target.current = null;
        window.scrollTo({ top: window.scrollY, behavior: "instant" });
      }
      idleUntil.current = performance.now() + 2200;
    };
    const activity = (event: Event) => {
      if (event.target instanceof Element && event.target.closest("[data-hero-dots]")) return;
      if (event instanceof KeyboardEvent && !["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(event.key)) return;
      cancel();
    };
    const down = (event: PointerEvent) => {
      if (event.target instanceof Element && event.target.closest("[data-hero-dots]")) return;
      pointerDown.current = true; cancel();
    };
    const up = () => { if (pointerDown.current) idleUntil.current = performance.now() + 2200; pointerDown.current = false; };
    window.addEventListener("wheel", activity, { passive: true });
    window.addEventListener("touchmove", activity, { passive: true });
    window.addEventListener("keydown", activity);
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    window.addEventListener("resize", cancel);
    return () => {
      window.removeEventListener("wheel", activity); window.removeEventListener("touchmove", activity);
      window.removeEventListener("keydown", activity);
      window.removeEventListener("pointerdown", down); window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up); window.removeEventListener("resize", cancel);
    };
  }, []);

  const playing = enabled && !paused && !finished && !hovered && !focused;
  const ready = chapter === 0 || readyKey === `${chapter}-${replay}`;
  useEffect(() => {
    if (!playing || reduced || !ready) return;
    let last = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now(), delta = now - last; last = now;
      if (!stage.current || !root.current) return;
      const box = stage.current.getBoundingClientRect();
      if (box.top < -1 || box.bottom > window.innerHeight + 1 || pointerDown.current || now < idleUntil.current || document.hidden
        || document.querySelector('[aria-modal="true"], [role="menu"][data-state="open"]')) return;
      if (target.current) {
        if (Math.abs(window.scrollY - target.current.y) < 2 || now >= target.current.until) target.current = null;
        return;
      }
      if (clock.current.chapter !== chapter) return;
      const next = advanceHeroClock(clock.current.elapsed, delta, HERO_CHAPTER_DURATION_MS[chapter]);
      clock.current.elapsed = next.elapsed;
      setTime({ chapter, fraction: next.fraction });
      if (next.done) {
        if (chapter === HERO_CAFE_CHAPTERS.length - 1) setFinished(true);
        else select(chapter + 1, true);
      }
      if (!next.done || chapter === HERO_CAFE_CHAPTERS.length - 1) {
        const top = window.scrollY + root.current.getBoundingClientRect().top;
        const y = top + (root.current.offsetHeight - stage.current.offsetHeight) * (chapter + next.fraction) / HERO_CAFE_CHAPTERS.length;
        autoPosition.current = y;
        window.scrollTo({ top: y, behavior: "instant" });
      }
    }, 80);
    return () => window.clearInterval(timer);
  }, [playing, ready, reduced, chapter, select, root, stage]);

  return { fraction: time.chapter === chapter ? time.fraction : 0, paused, finished, replay, playing, select, activate, syncScroll, setHovered, setFocused };
}
