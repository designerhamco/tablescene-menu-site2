"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { HERO_CAFE_CHAPTERS, HERO_CHAPTER_DURATION_MS, advanceHeroClock } from "@/lib/hero-cafe-motion";

/** Owns only this pinned story. User input always cancels an automatic scroll. */
export function useHeroPlayback({ root, stage, chapter, enabled, reduced, readyKey }: {
  root: RefObject<HTMLElement | null>;
  stage: RefObject<HTMLDivElement | null>;
  chapter: number;
  enabled: boolean;
  reduced: boolean;
  readyKey: string;
}) {
  const elapsed = useRef(0), idleUntil = useRef(0), pointerDown = useRef(false);
  const target = useRef<{ y: number; until: number } | null>(null);
  const [fraction, setFraction] = useState(0), [paused, setPaused] = useState(false);
  const [finished, setFinished] = useState(false), [replay, setReplay] = useState(0);
  const [hovered, setHovered] = useState(false), [focused, setFocused] = useState(false);

  const select = useCallback((index: number, automatic = false) => {
    if (!root.current || !stage.current) return;
    const next = Math.max(0, Math.min(HERO_CAFE_CHAPTERS.length - 1, index));
    const top = window.scrollY + root.current.getBoundingClientRect().top;
    const y = top + (root.current.offsetHeight - stage.current.offsetHeight) * ((next + .02) / HERO_CAFE_CHAPTERS.length);
    elapsed.current = 0;
    if (!automatic) { setPaused(false); setFinished(false); setFraction(0); }
    target.current = { y, until: performance.now() + 2500 };
    window.scrollTo({ top: y, behavior: automatic && !reduced ? "smooth" : "instant" });
  }, [root, stage, reduced]);

  const activate = useCallback((index: number) => {
    if (index !== chapter) { select(index); return; }
    if (reduced) return;
    if (finished) {
      elapsed.current = 0; setFraction(0); setFinished(false); setPaused(false); setReplay(value => value + 1);
    } else setPaused(value => !value);
  }, [chapter, finished, reduced, select]);

  useEffect(() => {
    elapsed.current = 0;
    const reset = requestAnimationFrame(() => { setFraction(0); setFinished(false); });
    return () => cancelAnimationFrame(reset);
  }, [chapter]);

  useEffect(() => {
    const cancel = () => {
      if (target.current) {
        target.current = null;
        window.scrollTo({ top: window.scrollY, behavior: "instant" });
      }
      elapsed.current = 0; idleUntil.current = performance.now() + 2200; setFraction(0); setFinished(false);
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
      window.removeEventListener("keydown", activity); window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", up);
      window.removeEventListener("resize", cancel);
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
      // Never pull someone back after they have left the story or opened another UI.
      if (box.top < -1 || box.bottom > window.innerHeight + 1 || pointerDown.current || now < idleUntil.current || document.hidden
        || document.querySelector('[aria-modal="true"], [role="menu"][data-state="open"]')) return;
      if (target.current) {
        if (Math.abs(window.scrollY - target.current.y) < 2 || now >= target.current.until) target.current = null;
        return;
      }
      const clock = advanceHeroClock(elapsed.current, delta, HERO_CHAPTER_DURATION_MS[chapter]);
      elapsed.current = clock.elapsed; setFraction(clock.fraction);
      if (clock.done) {
        if (chapter === HERO_CAFE_CHAPTERS.length - 1) setFinished(true);
        else select(chapter + 1, true);
      }
    }, 80);
    return () => window.clearInterval(timer);
  }, [playing, ready, reduced, chapter, select, root, stage]);

  return { fraction, paused, finished, replay, playing, select, activate, setHovered, setFocused };
}
