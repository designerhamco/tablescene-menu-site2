"use client";
import { useEffect, useRef, useState } from "react";
import { menuColorContrast } from "@/lib/menu-interaction-theme";
import styles from "./MenuCartCountBadge.module.css";

/** Use the rendered icon ink even on photo covers and after theme changes. */
export default function MenuCartCountBadge({ count, className = "" }: { count: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [colors, setColors] = useState({ ink: "", number: "#fff" });
  useEffect(() => {
    const badge = ref.current;
    const button = badge?.closest("button");
    if (!badge || !button) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const icon = button.querySelector("svg");
      const ink = getComputedStyle(icon ?? button).color;
      const number = menuColorContrast(ink, "#fff") >= menuColorContrast(ink, "#191c1b") ? "#fff" : "#191c1b";
      setColors(previous => previous.ink === ink && previous.number === number ? previous : { ink, number });
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const observer = new MutationObserver(schedule);
    // Theme/cover state can be applied to an ancestor or a sibling of the icon.
    observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ["class", "style", "data-cover-image-active", "data-active-unit"] });
    window.addEventListener("resize", schedule);
    update();
    return () => { observer.disconnect(); cancelAnimationFrame(frame); window.removeEventListener("resize", schedule); };
  }, []);
  return <span ref={ref} className={`${className} ${styles.badge}`} style={{ color: colors.ink || "inherit" }} data-menu-cart-count="" data-public-menu-cart-count="">
    <span style={{ color: colors.number }}>{count > 99 ? "99+" : count}</span>
  </span>;
}
