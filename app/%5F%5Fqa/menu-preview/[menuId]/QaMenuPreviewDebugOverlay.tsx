"use client";

import { useEffect, useState } from "react";

type QaMenuPreviewDebugOverlayProps = {
  debugEnabled: boolean;
  menuId: string;
  restaurantName: string;
  route: string;
};

type DebugMetrics = {
  candidateKey: string;
  clippingBottom: number;
  columnCount: number;
  crop: boolean;
  fontScale: string;
  finalGapBoost: string;
  finalFontBoost: string;
  gapScale: string;
  layoutMode: string;
  longestGap: number;
  longestLeafText: string;
  orphanCategory: string | null;
  pageScroll: boolean;
  partition: string;
  rejectedColumns: string;
  selectedColumns: string;
  shortestGap: number;
};

const LEAF_SELECTOR = [
  "[data-cafe-a-category-heading]",
  "[data-cafe-a-menu-name]",
  "[data-cafe-a-menu-price]",
  ".cafe-a-menu-description",
  ".cafe-a-menu-meta",
  ".cafe-a-menu-badge",
  ".cafe-a-menu-chip",
].join(",");

const ITEM_LEAF_SELECTOR = [
  "[data-cafe-a-menu-name]",
  "[data-cafe-a-menu-price]",
  ".cafe-a-menu-description",
  ".cafe-a-menu-meta",
  ".cafe-a-menu-badge",
  ".cafe-a-menu-chip",
].join(",");

function roundMetric(value: number) {
  return Number.isFinite(value) ? Math.round(value * 10) / 10 : 0;
}

function getVisibleBottom(elements: HTMLElement[]) {
  return elements.reduce((bottom, element) => {
    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return bottom;
    return Math.max(bottom, rect.bottom);
  }, Number.NEGATIVE_INFINITY);
}

function getClippingBottom(boardElement: HTMLElement, menuElement: HTMLElement) {
  const boardRect = boardElement.getBoundingClientRect();
  const menuRect = menuElement.getBoundingClientRect();
  const viewportBottom = window.visualViewport ? window.visualViewport.offsetTop + window.visualViewport.height : window.innerHeight;
  let safeBottom = Math.min(boardRect.bottom, menuRect.bottom, viewportBottom);
  let ancestor: HTMLElement | null = menuElement;

  while (ancestor && ancestor !== document.body) {
    const style = window.getComputedStyle(ancestor);
    const clipsY = /(hidden|clip|auto|scroll)/.test(style.overflowY) || /(hidden|clip|auto|scroll)/.test(style.overflow);
    if (clipsY) safeBottom = Math.min(safeBottom, ancestor.getBoundingClientRect().bottom);
    if (ancestor === boardElement) break;
    ancestor = ancestor.parentElement;
  }

  return safeBottom;
}

function collectMetrics(): DebugMetrics | null {
  const boardElement = Array.from(document.querySelectorAll<HTMLElement>(".cafe-a-desktop-fit-board")).find((element) => {
    return window.getComputedStyle(element).display !== "none";
  });
  const menuElement = boardElement?.querySelector<HTMLElement>(".cafe-a-ordered-balanced-fit-grid");
  if (!boardElement || !menuElement) return null;

  const clippingBottom = getClippingBottom(boardElement, menuElement);
  const columnElements = Array.from(menuElement.querySelectorAll<HTMLElement>(":scope > [data-cafe-a-balanced-column]"));
  const columnGaps = columnElements.map((columnElement) => {
    const leaves = Array.from(columnElement.querySelectorAll<HTMLElement>(LEAF_SELECTOR));
    return clippingBottom - getVisibleBottom(leaves);
  });
  const leafElements = Array.from(menuElement.querySelectorAll<HTMLElement>(LEAF_SELECTOR));
  const longestLeaf = leafElements.reduce<HTMLElement | null>((current, element) => {
    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return current;
    if (!current) return element;
    return rect.bottom > current.getBoundingClientRect().bottom ? element : current;
  }, null);
  const maxLeafBottom = longestLeaf ? longestLeaf.getBoundingClientRect().bottom : Number.NEGATIVE_INFINITY;
  let orphanCategory: string | null = null;

  for (const blockElement of Array.from(menuElement.querySelectorAll<HTMLElement>("[data-cafe-a-balanced-category-block]"))) {
    const headingElement = blockElement.querySelector<HTMLElement>("[data-cafe-a-category-heading]");
    const firstItemElement = blockElement.querySelector<HTMLElement>("[data-cafe-a-item-stack]");
    if (!headingElement || !firstItemElement) continue;

    const headingRect = headingElement.getBoundingClientRect();
    if (headingRect.width <= 0 || headingRect.height <= 0) continue;
    const headingVisible = headingRect.bottom > menuElement.getBoundingClientRect().top && headingRect.top < clippingBottom - 2;
    if (!headingVisible) continue;

    const firstItemBottom = getVisibleBottom(Array.from(firstItemElement.querySelectorAll<HTMLElement>(ITEM_LEAF_SELECTOR)));
    if (Number.isFinite(firstItemBottom) && firstItemBottom > clippingBottom - 2) {
      orphanCategory = headingElement.textContent?.trim() || "unknown";
      break;
    }
  }

  const selectedColumns = boardElement.dataset.fitColumns ?? "";
  const crop = orphanCategory !== null || maxLeafBottom > clippingBottom - 2 || menuElement.scrollHeight > menuElement.clientHeight + 1;

  return {
    candidateKey: boardElement.dataset.fitOrderedBalancedFingerprint ?? "",
    clippingBottom: roundMetric(clippingBottom),
    columnCount: columnElements.length,
    crop,
    fontScale: boardElement.dataset.fitFontScale ?? "",
    finalGapBoost: boardElement.dataset.fitFinalGapBoost ?? "",
    finalFontBoost: boardElement.dataset.fitFinalFontBoost ?? "",
    gapScale: boardElement.dataset.fitGapScale ?? "",
    layoutMode: boardElement.dataset.layoutMode ?? "",
    longestGap: roundMetric(Math.min(...columnGaps)),
    longestLeafText: longestLeaf?.textContent?.trim().replace(/\s+/g, " ").slice(0, 52) ?? "",
    orphanCategory,
    pageScroll: document.documentElement.scrollHeight > window.innerHeight + 1,
    partition: columnElements.map((columnElement) => columnElement.querySelectorAll(":scope > [data-cafe-a-balanced-category-block]").length).join(","),
    rejectedColumns: selectedColumns === "2" && crop ? "2 (current candidate unsafe)" : "none detected in DOM",
    selectedColumns,
    shortestGap: roundMetric(Math.max(...columnGaps)),
  };
}

export default function QaMenuPreviewDebugOverlay({ debugEnabled, menuId, restaurantName, route }: QaMenuPreviewDebugOverlayProps) {
  const [metrics, setMetrics] = useState<DebugMetrics | null>(null);

  useEffect(() => {
    if (!debugEnabled) return;

    let frameId = 0;
    const measure = () => {
      setMetrics(collectMetrics());
      frameId = window.requestAnimationFrame(measure);
    };

    frameId = window.requestAnimationFrame(measure);
    return () => window.cancelAnimationFrame(frameId);
  }, [debugEnabled]);

  if (!debugEnabled || !metrics) return null;

  return (
    <div data-qa-layout-debug-overlay="" className="pointer-events-none fixed inset-0 z-[9999] text-[11px] font-mono">
      <div className="absolute left-3 top-3 max-w-[420px] rounded bg-black/82 p-3 leading-5 text-white shadow-xl">
        <div>QA menuId: {menuId}</div>
        <div>route: {route}</div>
        <div>name: {restaurantName}</div>
        <div>layoutMode: {metrics.layoutMode}</div>
        <div>selected columns: {metrics.selectedColumns}</div>
        <div>column count: {metrics.columnCount}</div>
        <div>partition: {metrics.partition}</div>
        <div>fontScale / gapScale: {metrics.fontScale} / {metrics.gapScale}</div>
        <div>final boost: {metrics.finalFontBoost} / {metrics.finalGapBoost}</div>
        <div>longest gap: {metrics.longestGap}px</div>
        <div>shortest gap: {metrics.shortestGap}px</div>
        <div>clipping bottom: {metrics.clippingBottom}px</div>
        <div>crop: {String(metrics.crop)}</div>
        <div>orphan category: {metrics.orphanCategory ?? "none"}</div>
        <div>rejected columns: {metrics.rejectedColumns}</div>
        <div>page scroll: {String(metrics.pageScroll)}</div>
        <div>candidate key: {metrics.candidateKey.slice(0, 80)}</div>
        <div>last leaf: {metrics.longestLeafText}</div>
      </div>
      <div className="absolute left-0 right-0 border-t-2 border-red-500" style={{ top: `${metrics.clippingBottom}px` }} />
      <div className="absolute left-0 right-0 border-t-2 border-emerald-400" style={{ top: `${metrics.clippingBottom - metrics.longestGap}px` }} />
    </div>
  );
}
