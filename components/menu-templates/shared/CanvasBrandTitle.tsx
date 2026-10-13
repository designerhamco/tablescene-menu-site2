"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { getMobileBrandMeasurementTexts, type MobileBrandTitleFit } from "@/lib/mobile-brand-title-fit";
import { getCanvasBrandHeight, getCanvasBrandLimits, selectCanvasBrandTitleFit, type CanvasBrandSlotLayout } from "@/lib/canvas-brand-title-fit";
import ScriptAwareText from "./ScriptAwareText";

export default function CanvasBrandTitle({ title, className, fontSignature, device }: {
  title: string; className: string; fontSignature: string; device: "tablet" | "pc";
}) {
  const rootRef = useRef<HTMLHeadingElement>(null);
  const measurementRef = useRef<HTMLSpanElement>(null);
  const texts = useMemo(() => getMobileBrandMeasurementTexts(title), [title]);
  const inputKey = `${title}|${fontSignature}|${device}`;
  const [fit, setFit] = useState<(MobileBrandTitleFit & { inputKey: string }) | null>(null);
  const activeFit = fit?.inputKey === inputKey ? fit : null;

  useLayoutEffect(() => {
    const root = rootRef.current;
    const container = root?.parentElement;
    const measurements = measurementRef.current;
    if (!root || !container || !measurements) return;
    let disposed = false;
    let frame = 0;
    let previousBox = "";
    const boxOf = () => {
      const style = getComputedStyle(container);
      const width = container.clientWidth - (parseFloat(style.paddingLeft) || 0) - (parseFloat(style.paddingRight) || 0);
      const board = root.closest<HTMLElement>(".cafe-a-desktop-fit-board");
      const boardStyle = board ? getComputedStyle(board) : null;
      const frameHeight = board?.clientHeight ? board.clientHeight - (parseFloat(boardStyle!.paddingTop) || 0) - (parseFloat(boardStyle!.paddingBottom) || 0) : window.innerHeight;
      // Common height budget from the reading frame, independent of title
      // height/menu density so the fit cannot feed back into its own budget.
      const layout: CanvasBrandSlotLayout = container.classList.contains("cafe-a-topline-brand-identity") ? "horizontal-header" : "brand-column";
      const rowHeight = layout === "horizontal-header" && board?.closest('[data-cafe-a-adaptive-fit="true"]')
        ? container.closest("[data-cafe-a-topline-info-header]")?.getBoundingClientRect().height
        : undefined;
      return { width, height: rowHeight || getCanvasBrandHeight(width, frameHeight, layout), layout };
    };
    const measure = () => {
      frame = 0;
      if (disposed) return;
      const { width, height, layout } = boxOf();
      if (width <= 0) return;
      const remScale = (parseFloat(getComputedStyle(document.documentElement).fontSize) || 16) / 16;
      const widths = new Map([...measurements.children].map((element, index) => [texts[index], element.getBoundingClientRect().width]));
      const lineAdvance = Math.max(1.08, ...[...measurements.children].map((element) => element.getBoundingClientRect().height / 100));
      const limits = getCanvasBrandLimits(width, layout, remScale);
      const next = { ...selectCanvasBrandTitleFit(title, widths, width, height, limits, lineAdvance), inputKey };
      root.dataset.canvasBrandWidth = String(width);
      root.dataset.canvasBrandHeight = String(height);
      root.dataset.canvasBrandLayout = layout;
      root.dataset.canvasBrandTarget = String(limits.widthRatio);
      root.dataset.canvasBrandMinimum = String(limits.minimum);
      root.dataset.canvasBrandLineAdvance = String(lineAdvance);
      previousBox = `${width}|${height}|${layout}`;
      setFit((current) => current && JSON.stringify(current) === JSON.stringify(next) ? current : next);
    };
    const schedule = () => { if (!disposed && !frame) frame = requestAnimationFrame(measure); };
    const observer = new ResizeObserver(() => { const box = boxOf(); if (`${box.width}|${box.height}|${box.layout}` !== previousBox) schedule(); });
    observer.observe(container);
    const board = root.closest<HTMLElement>(".cafe-a-desktop-fit-board");
    if (board) observer.observe(board);
    window.addEventListener("resize", schedule);
    schedule();
    void document.fonts.ready.then(schedule);
    document.fonts.addEventListener("loadingdone", schedule);
    return () => { disposed = true; cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener("resize", schedule); document.fonts.removeEventListener("loadingdone", schedule); };
  }, [title, texts, inputKey, device]);

  return (
    <h1 ref={rootRef} className={`${className} cafe-a-canvas-brand-title`} data-cafe-a-store-title="" data-canvas-brand-fit={activeFit ? "ready" : "pending"} aria-label={title}
      style={activeFit ? { fontSize: `${activeFit.fontSize}px` } : undefined}>
      <span className={activeFit?.naturalWrap ? "cafe-a-mobile-brand-natural-wrap" : "block"}>
        {(activeFit?.lines.length ? activeFit.lines : [title]).map((line, index) => <span key={`${index}-${line}`} className="block" data-canvas-brand-line=""><ScriptAwareText text={line} /></span>)}
      </span>
      <span ref={measurementRef} aria-hidden="true" className="cafe-a-mobile-brand-measurements">
        {texts.map((text) => <span key={text} className="block w-max whitespace-pre"><ScriptAwareText text={text} /></span>)}
      </span>
    </h1>
  );
}
