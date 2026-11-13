"use client";

import { useLayoutEffect, useRef, type HTMLAttributes } from "react";
import ScriptAwareText from "./ScriptAwareText";
import styles from "./MenuHeaderInformation.module.css";

export default function MenuClampedCopy({ text, className = "", ...props }: HTMLAttributes<HTMLParagraphElement> & { text: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    let frame = 0, disposed = false;
    const measure = () => {
      frame = 0;
      if (disposed) return;
      // Reserve the ellipsis inside the copy box only when text overflows.
      // WebKit otherwise paints a right-aligned ellipsis beyond its clip edge.
      element.dataset.menuCopyOverflow = element.scrollHeight > element.clientHeight + 1 ? "true" : "false";
    };
    const schedule = () => { if (!disposed && !frame) frame = requestAnimationFrame(measure); };
    const observer = new ResizeObserver(schedule);
    observer.observe(element);
    document.fonts.addEventListener("loadingdone", schedule);
    void document.fonts.ready.then(schedule);
    measure();
    return () => { disposed = true; cancelAnimationFrame(frame); observer.disconnect(); document.fonts.removeEventListener("loadingdone", schedule); };
  }, [text]);
  return <p {...props} ref={ref} data-menu-header-copy-clamped className={`${styles.clampedCopy} ${className}`}><ScriptAwareText text={text} /></p>;
}
