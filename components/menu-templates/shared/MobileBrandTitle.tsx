"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { getMobileBrandMeasurementTexts, selectMobileBrandTitleFit, type MobileBrandTitleFit } from "@/lib/mobile-brand-title-fit";
import ScriptAwareText from "./ScriptAwareText";

export default function MobileBrandTitle({
  title,
  className,
  fontSignature,
  ceilingScale = 1,
}: {
  title: string;
  className: string;
  fontSignature: string;
  ceilingScale?: number;
}) {
  const rootRef = useRef<HTMLHeadingElement>(null);
  const measurementRef = useRef<HTMLSpanElement>(null);
  const texts = useMemo(() => getMobileBrandMeasurementTexts(title), [title]);
  const inputKey = `${title}|${fontSignature}|${ceilingScale}`;
  const [fit, setFit] = useState<(MobileBrandTitleFit & { remSize: number; inputKey: string }) | null>(null);
  const activeFit = fit?.inputKey === inputKey ? fit : null;

  useLayoutEffect(() => {
    const root = rootRef.current;
    const container = root?.parentElement;
    const measurements = measurementRef.current;
    if (!root || !container || !measurements) return;
    let disposed = false;
    let frame = 0;
    let previousWidth = -1;
    const measure = () => {
      frame = 0;
      if (disposed) return;
      const width = container.getBoundingClientRect().width;
      if (width <= 0) return;
      const rem = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      const widths = new Map([...measurements.children].map((element, index) => [texts[index], element.getBoundingClientRect().width]));
      const result = selectMobileBrandTitleFit(title, widths, width, Math.max(44, rem * 2.75), ceilingScale);
      const next = { ...result, remSize: result.fontSize / rem, inputKey };
      previousWidth = width;
      setFit((current) => current && JSON.stringify(current) === JSON.stringify(next) ? current : next);
    };
    const schedule = () => { if (!disposed && !frame) frame = requestAnimationFrame(measure); };
    const observer = new ResizeObserver(() => {
      if (Math.abs(container.getBoundingClientRect().width - previousWidth) > 0.25) schedule();
    });
    observer.observe(container);
    schedule();
    void document.fonts.ready.then(schedule);
    document.fonts.addEventListener("loadingdone", schedule);
    return () => { disposed = true; cancelAnimationFrame(frame); observer.disconnect(); document.fonts.removeEventListener("loadingdone", schedule); };
  }, [title, texts, inputKey, ceilingScale]);

  return (
    <h1 ref={rootRef} className={`${className} cafe-a-mobile-auto-brand-title`} data-cafe-a-store-title="" data-mobile-brand-fit={activeFit ? "ready" : "pending"} aria-label={title}
      style={activeFit ? { fontSize: `${activeFit.remSize}rem` } : undefined}>
      <span data-mobile-brand-visible="" className={activeFit?.naturalWrap ? "cafe-a-mobile-brand-natural-wrap" : "block"}>
        {(activeFit?.lines.length ? activeFit.lines : [title]).map((line, index) => <span key={`${index}-${line}`} className="block" data-mobile-brand-line=""><ScriptAwareText text={line} /></span>)}
      </span>
      <span ref={measurementRef} aria-hidden="true" className="cafe-a-mobile-brand-measurements">
        {texts.map((text) => <span key={text} className="block w-max whitespace-pre"><ScriptAwareText text={text} /></span>)}
      </span>
    </h1>
  );
}
