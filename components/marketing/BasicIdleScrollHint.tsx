"use client";

import { useEffect, useRef } from "react";
import { ChevronDown } from "@/app/components/ui/site-arrow";
import styles from "./BasicServiceStory.module.css";

const IDLE_DELAY_MS = 2400;
const POINTER_OFFSET = 14;
const VIEWPORT_INSET = 8;
const INTERACTIVE = "a, button, input, select, textarea, [role='button'], [contenteditable='true']";

export default function BasicIdleScrollHint({ enabled }: { enabled: boolean }) {
  const hintRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hint = hintRef.current;
    const stage = hint?.parentElement;
    if (!hint || !stage || !enabled) return;

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
      if (!pointer || document.hidden || !mouseQuery.matches || stage.getBoundingClientRect().top > 1) return false;

      const target = document.elementFromPoint(pointer.x, pointer.y);
      if (!target || !stage.contains(target) || target.closest(INTERACTIVE)) return false;

      const { offsetWidth: width, offsetHeight: height } = hint;
      const { clientWidth, clientHeight } = document.documentElement;
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

    stage.addEventListener("pointermove", onPointerMove, { passive: true });
    stage.addEventListener("pointerleave", clear);
    stage.addEventListener("pointerdown", clear);
    window.addEventListener("scroll", waitForIdle, { passive: true });
    window.addEventListener("wheel", waitForIdle, { passive: true });
    window.addEventListener("resize", clear);
    window.addEventListener("blur", clear);
    document.addEventListener("visibilitychange", clear);
    mouseQuery.addEventListener("change", clear);

    return () => {
      clear();
      stage.removeEventListener("pointermove", onPointerMove);
      stage.removeEventListener("pointerleave", clear);
      stage.removeEventListener("pointerdown", clear);
      window.removeEventListener("scroll", waitForIdle);
      window.removeEventListener("wheel", waitForIdle);
      window.removeEventListener("resize", clear);
      window.removeEventListener("blur", clear);
      document.removeEventListener("visibilitychange", clear);
      mouseQuery.removeEventListener("change", clear);
    };
  }, [enabled]);

  return <div ref={hintRef} className={`${styles.scrollHint} type-caption`} data-basic-scroll-hint aria-hidden="true">
    <ChevronDown size={16} />
    스크롤하세요
  </div>;
}
