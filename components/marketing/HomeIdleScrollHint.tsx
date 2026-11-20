"use client";

import { useEffect, useRef } from "react";
import { ChevronDown } from "@/app/components/ui/site-arrow";
import styles from "./HomeIdleScrollHint.module.css";

const IDLE_DELAY_MS = 2400;
const POINTER_OFFSET = 14;
const VIEWPORT_INSET = 8;
const INTERACTIVE = "a, button, input, select, textarea, summary, [role='button'], [role='menu'], [role='listbox'], [role='dialog'], [data-slot='dialog-overlay'], [data-slot='sheet-overlay'], [contenteditable='true']";

export default function HomeIdleScrollHint() {
  const hintRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hint = hintRef.current;
    if (!hint) return;

    const root = document.documentElement;

    const mouseQuery = matchMedia("(hover: hover) and (pointer: fine)");
    let pointer: { x: number; y: number } | null = null;
    let timer: number | undefined;

    const hide = () => {
      window.clearTimeout(timer);
      delete hint.dataset.visible;
    };
    const clear = () => {
      pointer = null;
      hide();
    };
    const positionHint = () => {
      if (!pointer || document.hidden || !mouseQuery.matches) return false;

      const page = document.scrollingElement;
      if (!page || page.scrollHeight - page.clientHeight - page.scrollTop <= 1) return false;

      const target = document.elementFromPoint(pointer.x, pointer.y);
      if (!target || target.closest(INTERACTIVE)) return false;

      const { offsetWidth: width, offsetHeight: height } = hint;
      const { clientWidth, clientHeight } = root;
      const x = pointer.x + POINTER_OFFSET + width <= clientWidth - VIEWPORT_INSET
        ? pointer.x + POINTER_OFFSET
        : pointer.x - POINTER_OFFSET - width;
      const y = pointer.y + POINTER_OFFSET + height <= clientHeight - VIEWPORT_INSET
        ? pointer.y + POINTER_OFFSET
        : pointer.y - POINTER_OFFSET - height;

      hint.style.setProperty("--scroll-hint-x", `${Math.max(VIEWPORT_INSET, x)}px`);
      hint.style.setProperty("--scroll-hint-y", `${Math.max(VIEWPORT_INSET, y)}px`);
      return true;
    };
    const waitForIdle = () => {
      hide();
      if (!pointer || !mouseQuery.matches) return;
      timer = window.setTimeout(() => {
        if (positionHint()) hint.dataset.visible = "true";
      }, IDLE_DELAY_MS);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || !mouseQuery.matches || (event.target instanceof Element && event.target.closest(INTERACTIVE))) {
        clear();
        return;
      }
      pointer = { x: event.clientX, y: event.clientY };
      if (!hint.dataset.visible || !positionHint()) waitForIdle();
    };

    root.addEventListener("pointermove", onPointerMove, { passive: true });
    root.addEventListener("pointerleave", clear);
    root.addEventListener("pointerdown", clear);
    window.addEventListener("scroll", waitForIdle, { passive: true });
    window.addEventListener("wheel", waitForIdle, { passive: true });
    window.addEventListener("resize", clear);
    window.addEventListener("blur", clear);
    document.addEventListener("visibilitychange", clear);
    mouseQuery.addEventListener("change", clear);

    return () => {
      clear();
      root.removeEventListener("pointermove", onPointerMove);
      root.removeEventListener("pointerleave", clear);
      root.removeEventListener("pointerdown", clear);
      window.removeEventListener("scroll", waitForIdle);
      window.removeEventListener("wheel", waitForIdle);
      window.removeEventListener("resize", clear);
      window.removeEventListener("blur", clear);
      document.removeEventListener("visibilitychange", clear);
      mouseQuery.removeEventListener("change", clear);
    };
  }, []);

  return <div ref={hintRef} className={styles.scrollHint} data-home-scroll-hint aria-hidden="true">
    <svg width={22} height={25} viewBox="0 0 22 25" fill="none" stroke="currentColor" strokeWidth={1.5} focusable="false">
      <rect x={4.25} y={1.75} width={13.5} height={21} rx={6.75} />
      <path className={styles.scrollHintWheel} d="M11 6.5v3" strokeLinecap="round" />
    </svg>
    <ChevronDown className={styles.scrollHintArrow} size={16} />
  </div>;
}
