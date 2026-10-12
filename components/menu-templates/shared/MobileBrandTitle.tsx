"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { getMobileBrandTitleCandidates, selectMobileBrandTitleFit } from "@/lib/mobile-brand-title-fit";
import ScriptAwareText from "./ScriptAwareText";

export default function MobileBrandTitle({ title, className, fontSignature }: { title: string; className: string; fontSignature: string }) {
  const rootRef = useRef<HTMLHeadingElement>(null);
  const measurementsRef = useRef<HTMLSpanElement>(null);
  const candidates = useMemo(() => getMobileBrandTitleCandidates(title), [title]);
  const texts = useMemo(() => [...new Set(candidates.flat())], [candidates]);
  const inputKey = `${title}|${fontSignature}`;
  const [fit, setFit] = useState<{ lines: string[]; fontSize: number; fontSizeRem: number; fallbackWrap: boolean; inputKey: string } | null>(null);
  const activeFit = fit?.inputKey === inputKey ? fit : null;

  useLayoutEffect(() => {
    const root = rootRef.current;
    const container = root?.parentElement;
    const measurements = measurementsRef.current;
    if (!root || !container || !measurements) return;
    let disposed = false;
    let frame = 0;
    let previousWidth = -1;
    const measure = () => {
      frame = 0;
      if (disposed) return;
      const width = container.getBoundingClientRect().width;
      if (width <= 0) return;
      const widths = new Map([...measurements.children].map((element, index) => [texts[index], element.getBoundingClientRect().width]));
      const rem = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
      const result = selectMobileBrandTitleFit(candidates, widths, width, rem);
      const next = { ...result, fontSizeRem: result.fontSize / rem, inputKey };
      previousWidth = width;
      setFit((current) => current && JSON.stringify(current) === JSON.stringify(next) ? current : next);
    };
    const schedule = () => { if (!disposed && !frame) frame = requestAnimationFrame(measure); };
    const observer = new ResizeObserver(() => {
      if (Math.abs(container.getBoundingClientRect().width - previousWidth) > 0.25) schedule();
    });
    observer.observe(container);
    void document.fonts.ready.then(schedule);
    document.fonts.addEventListener("loadingdone", schedule);
    schedule();
    return () => { disposed = true; cancelAnimationFrame(frame); observer.disconnect(); document.fonts.removeEventListener("loadingdone", schedule); };
  }, [candidates, texts, inputKey]);

  return (
    <h1 ref={rootRef} className={`${className} cafe-a-mobile-auto-brand-title`} data-cafe-a-store-title="" data-mobile-brand-fit={activeFit ? "ready" : "pending"} aria-label={title}
      style={activeFit ? { fontSize: `${activeFit.fontSizeRem}rem` } : undefined}>
      {(activeFit?.lines.length ? activeFit.lines : [title]).map((line, index) => <span key={`${index}-${line}`} className="block" data-mobile-brand-line=""><ScriptAwareText text={line} /></span>)}
      <span ref={measurementsRef} aria-hidden="true" className="cafe-a-mobile-brand-measurements">
        {texts.map((text) => <span key={text} className="block w-max whitespace-pre"><ScriptAwareText text={text} /></span>)}
      </span>
    </h1>
  );
}
