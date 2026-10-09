"use client";

import { useEffect, useRef, useState } from "react";
import { getKohiDividerLines, type KohiColumn, type KohiDividerSegment, type KohiDividerLine } from "@/lib/kohi-divider-geometry";
import styles from "./KohiMenuDividers.module.css";

type DividerState = { width: number; height: number; lines: KohiDividerLine[] };
const EMPTY_STATE: DividerState = { width: 1, height: 1, lines: [] };

export default function KohiMenuDividers() {
  const layerRef = useRef<SVGSVGElement>(null);
  const [state, setState] = useState<DividerState>(EMPTY_STATE);

  useEffect(() => {
    const layer = layerRef.current;
    const root = layer?.closest<HTMLElement>("[data-template-key='cafe_kohi_a']");
    if (!layer || !root) return;
    let frame = 0;
    let cancelled = false;
    let previousFingerprint = "";
    const visible = (element: Element) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    };
    const update = () => {
      frame = 0;
      if (cancelled) return;
      const rootRect = root.getBoundingClientRect();
      const board = root.querySelector<HTMLElement>(".cafe-a-desktop-fit-board");
      const desktop = Boolean(board && visible(board));
      // Never expose candidate-position lines through the fitting safety cover.
      if (desktop && board?.dataset.fitPresentationState !== "ready") {
        if (previousFingerprint !== "hidden") {
          previousFingerprint = "hidden";
          setState(EMPTY_STATE);
        }
        return;
      }
      const menu = Array.from(root.querySelectorAll<HTMLElement>("[data-cafe-a-fit-menu]")).find(visible);
      if (!menu) {
        if (previousFingerprint !== "empty") {
          previousFingerprint = "empty";
          setState(EMPTY_STATE);
        }
        return;
      }
      const relativeBox = (rect: DOMRect) => ({ left: rect.left - rootRect.left, right: rect.right - rootRect.left, top: rect.top - rootRect.top, bottom: rect.bottom - rootRect.top });
      let columns: KohiColumn[];
      if (desktop && board?.dataset.layoutMode === "orderedFit") {
        const menuRect = menu.getBoundingClientRect();
        const computed = getComputedStyle(menu);
        const count = Math.max(1, Number.parseInt(computed.columnCount, 10) || 1);
        const gap = Number.parseFloat(computed.columnGap) || 0;
        const width = (menuRect.width - gap * (count - 1)) / count;
        columns = Array.from({ length: count }, (_, index) => ({ left: menuRect.left - rootRect.left + index * (width + gap), right: menuRect.left - rootRect.left + index * (width + gap) + width }));
      } else {
        columns = Array.from(menu.querySelectorAll<HTMLElement>(":scope > [data-cafe-a-balanced-column]")).filter(visible).map((column) => relativeBox(column.getBoundingClientRect()));
        if (columns.length === 0) columns = [relativeBox(menu.getBoundingClientRect())];
      }
      const segments: KohiDividerSegment[] = [];
      menu.querySelectorAll<HTMLElement>("[data-cafe-a-category-block], [data-cafe-a-block-type='widget']").forEach((block, index) => {
        const group = `block-${index}`;
        if (block.dataset.cafeABlockType === "widget") {
          Array.from(block.getClientRects()).filter((rect) => rect.width > 0 && rect.height > 0).forEach((rect) => segments.push({ ...relativeBox(rect), group, kind: "widget" }));
          return;
        }
        block.querySelectorAll<HTMLElement>("[data-cafe-a-category-heading], [data-cafe-a-item-stack]").forEach((element) => {
          const kind = element.hasAttribute("data-cafe-a-category-heading") ? "heading" : "item";
          // getClientRects keeps any fragmented content in its own visual column.
          Array.from(element.getClientRects()).filter((rect) => rect.width > 0 && rect.height > 0).forEach((rect) => segments.push({ ...relativeBox(rect), group, kind }));
        });
      });
      const brand = desktop ? board?.querySelector<HTMLElement>("[data-cafe-a-brand-panel]") : null;
      const next = {
        width: rootRect.width,
        height: rootRect.height,
        lines: getKohiDividerLines({ width: rootRect.width, height: rootRect.height, columns, segments, brandRight: brand && visible(brand) ? brand.getBoundingClientRect().right - rootRect.left : undefined }),
      };
      const fingerprint = JSON.stringify(next);
      if (fingerprint !== previousFingerprint) {
        previousFingerprint = fingerprint;
        setState(next);
      }
    };
    const schedule = () => {
      if (!cancelled && frame === 0) frame = requestAnimationFrame(update);
    };
    const observer = new MutationObserver((mutations) => {
      if (mutations.some((mutation) => !layer.contains(mutation.target))) schedule();
    });
    observer.observe(root, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["style", "class", "data-fit-presentation-state", "data-layout-mode", "data-fit-columns", "data-fit-font-scale", "data-fit-gap-scale"] });
    const resizeObserver = new ResizeObserver(schedule);
    resizeObserver.observe(root);
    root.querySelectorAll<HTMLElement>("[data-cafe-a-fit-menu], [data-cafe-a-category-heading], [data-cafe-a-item-stack]").forEach((element) => resizeObserver.observe(element));
    window.addEventListener("resize", schedule);
    root.addEventListener("load", schedule, true);
    document.fonts.addEventListener("loadingdone", schedule);
    void document.fonts.ready.then(schedule);
    schedule();
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener("resize", schedule);
      root.removeEventListener("load", schedule, true);
      document.fonts.removeEventListener("loadingdone", schedule);
    };
  }, []);

  return (
    <svg ref={layerRef} className={styles.layer} aria-hidden="true" focusable="false" data-kohi-dividers="" viewBox={`0 0 ${state.width} ${state.height}`} preserveAspectRatio="none">
      {state.lines.map((line, index) => <line key={`${line.kind}-${index}`} data-kohi-divider={line.kind} x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} />)}
    </svg>
  );
}
