"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { getMobileBrandMeasurementTexts, type MobileBrandTitleFit } from "@/lib/mobile-brand-title-fit";
import { CANVAS_HEADER_MAX_RATIO, CANVAS_PC_HEADER_BRAND_CEILING_SCALE, getCanvasHeaderGapScale, getCanvasHeaderRatio, getCanvasBrandHeight, getCanvasBrandLimits, selectCanvasBrandTitleFit, type CanvasBrandSlotLayout } from "@/lib/canvas-brand-title-fit";
import type { OnePageLayoutShell } from "@/lib/one-page-layout-shells";
import ScriptAwareText from "./ScriptAwareText";

export default function CanvasBrandTitle({ title, className, fontSignature, device, layoutShell, opticalScale = 1 }: {
  title: string; className: string; fontSignature: string; device: "tablet" | "pc"; layoutShell: OnePageLayoutShell; opticalScale?: number;
}) {
  const rootRef = useRef<HTMLHeadingElement>(null);
  const measurementRef = useRef<HTMLSpanElement>(null);
  const texts = useMemo(() => getMobileBrandMeasurementTexts(title), [title]);
  const inputKey = `${title}|${fontSignature}|${device}|${layoutShell}|${opticalScale}`;
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
      // The template-owned shell is the sizing authority. Inferring this from a
      // parent class collapsed left-rail and center-column templates into one
      // branch and allowed one layout family's PC policy to leak into another.
      const layout: CanvasBrandSlotLayout = layoutShell === "brand_top_band" ? "horizontal-header" : "brand-column";
      const boundedHeader = layout === "horizontal-header" && Boolean(board?.closest('[data-cafe-a-adaptive-fit="true"]'));
      // Recover the unscaled gap so choosing one/two lines never feeds back
      // through the compact gap into the title's own height budget.
      const appliedGapScale = boundedHeader && window.innerWidth >= 1024
        ? Number(board?.style.getPropertyValue("--cafe-a-header-gap-scale")) || 1 : 1;
      const baseGap = (parseFloat(boardStyle?.rowGap ?? "0") || 0) / appliedGapScale;
      const availableHeight = frameHeight - baseGap;
      const header = container.closest("[data-cafe-a-topline-info-header]");
      // Header copy can already be capped by the current row height. Its
      // scroll height preserves the required wrapped-copy height for the next fit.
      const sideHeight = Math.max(0, ...[...header?.querySelectorAll<HTMLElement>(".cafe-a-topline-description, .cafe-a-topline-notice-text") ?? []].map((element) => Math.max(element.getBoundingClientRect().height, element.scrollHeight)));
      const panelFrame = layoutShell === "brand_panel_flow" ? root.closest<HTMLElement>(".cafe-a-panel-intro") : null;
      // Panel brands use the common column target/height budget, bounded only
      // by the actual controls, supporting copy and featured item around them.
      const panelStyle = panelFrame ? getComputedStyle(panelFrame.querySelector<HTMLElement>(".cafe-a-cover-frame")!) : null;
      const panelIdentity = root.closest<HTMLElement>(".cafe-a-panel-identity");
      const panelDescriptionHeight = panelIdentity?.querySelector<HTMLElement>(".cafe-a-store-description")?.getBoundingClientRect().height ?? 0;
      const panelControlsHeight = panelFrame?.querySelector<HTMLElement>(".cafe-a-panel-controls")?.getBoundingClientRect().height ?? 0;
      const panelFeaturedHeight = panelFrame?.querySelector<HTMLElement>(".cafe-a-featured-copy")?.getBoundingClientRect().height ?? 0;
      const panelBottomHeight = Math.max(panelControlsHeight, panelFeaturedHeight);
      const panelBudget = panelFrame ? Math.max(0, panelFrame.clientHeight - panelControlsHeight - panelBottomHeight - panelDescriptionHeight
        - (parseFloat(panelStyle?.paddingTop ?? "0") || 0) - (parseFloat(panelStyle?.paddingBottom ?? "0") || 0)
        - 2 * (parseFloat(panelStyle?.getPropertyValue("--panel-equal-gap") ?? "0") || 0) * (parseFloat(getComputedStyle(document.documentElement).fontSize) || 16) - (panelDescriptionHeight ? parseFloat(getComputedStyle(panelIdentity!).rowGap) || 0 : 0)) : Infinity;
      return { width, height: boundedHeader ? availableHeight * CANVAS_HEADER_MAX_RATIO : Math.min(panelBudget, getCanvasBrandHeight(width, frameHeight, layout)), layout, boundedHeader, availableHeight, frameHeight, baseGap, sideHeight };
    };
    const measure = () => {
      frame = 0;
      if (disposed) return;
      const { width, height, layout, boundedHeader, frameHeight, baseGap, sideHeight } = boxOf();
      if (width <= 0) return;
      const remScale = (parseFloat(getComputedStyle(document.documentElement).fontSize) || 16) / 16;
      const widths = new Map([...measurements.children].map((element, index) => [texts[index], element.getBoundingClientRect().width]));
      const lineAdvance = Math.max(1.08, ...[...measurements.children].map((element) => element.getBoundingClientRect().height / 100));
      const limits = getCanvasBrandLimits(width, layout, remScale);
      // The quieter PC ceiling belongs only to horizontal headers. Vertical
      // shells keep their own width policy and must never inherit that scale.
      const appliedCeilingScale = device === "pc" && layout === "horizontal-header" ? CANVAS_PC_HEADER_BRAND_CEILING_SCALE : 1;
      const next = { ...selectCanvasBrandTitleFit(title, widths, width, height, limits, lineAdvance, appliedCeilingScale, opticalScale), inputKey };
      if (boundedHeader) {
        const gapScale = window.innerWidth >= 1024
          ? getCanvasHeaderGapScale(device, next.lines.length, next.naturalWrap) : 1;
        const availableHeight = frameHeight - baseGap * gapScale;
        const ratio = getCanvasHeaderRatio(availableHeight, next.fontSize, next.lines.length, lineAdvance, sideHeight);
        const board = root.closest<HTMLElement>(".cafe-a-desktop-fit-board");
        board?.style.setProperty("--cafe-a-header-fr", `${ratio * 100}fr`);
        board?.style.setProperty("--cafe-a-body-fr", `${(1 - ratio) * 100}fr`);
        board?.style.setProperty("--cafe-a-header-gap-scale", String(gapScale));
        if (board) {
          board.dataset.fitHeaderRatio = String(ratio);
          board.dataset.fitHeaderGapScale = String(gapScale);
          board.dataset.fitHeaderBrandLines = next.naturalWrap ? "unknown" : String(next.lines.length);
        }
      }
      root.dataset.canvasBrandWidth = String(width);
      root.dataset.canvasBrandHeight = String(height);
      root.dataset.canvasBrandLayout = layout;
      root.dataset.canvasBrandShell = layoutShell;
      root.dataset.canvasBrandTarget = String(limits.widthRatio);
      root.dataset.canvasBrandMinimum = String(limits.minimum);
      root.dataset.canvasBrandMaximum = String(limits.maximum);
      root.dataset.canvasBrandCeilingScale = String(appliedCeilingScale);
      root.dataset.canvasBrandLineAdvance = String(lineAdvance);
      previousBox = `${width}|${height}|${layout}|${sideHeight}`;
      setFit((current) => current && JSON.stringify(current) === JSON.stringify(next) ? current : next);
    };
    const schedule = () => { if (!disposed && !frame) frame = requestAnimationFrame(measure); };
    const observer = new ResizeObserver(() => { const box = boxOf(); if (`${box.width}|${box.height}|${box.layout}|${box.sideHeight}` !== previousBox) schedule(); });
    observer.observe(container);
    const board = root.closest<HTMLElement>(".cafe-a-desktop-fit-board");
    if (board) observer.observe(board);
    const panelFrame = layoutShell === "brand_panel_flow" ? root.closest(".cafe-a-panel-intro") : null;
    for (const element of panelFrame?.querySelectorAll(".cafe-a-panel-controls, .cafe-a-featured-copy, .cafe-a-store-description") ?? []) observer.observe(element);
    for (const element of board?.querySelectorAll(".cafe-a-topline-description, .cafe-a-topline-notice-text") ?? []) observer.observe(element);
    window.addEventListener("resize", schedule);
    schedule();
    void document.fonts.ready.then(schedule);
    document.fonts.addEventListener("loadingdone", schedule);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      document.fonts.removeEventListener("loadingdone", schedule);
      // A logo or another presentation must not inherit the text-only gap.
      board?.style.removeProperty("--cafe-a-header-gap-scale");
      if (board) {
        delete board.dataset.fitHeaderGapScale;
        delete board.dataset.fitHeaderBrandLines;
      }
    };
  }, [title, texts, inputKey, device, layoutShell, opticalScale]);

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
