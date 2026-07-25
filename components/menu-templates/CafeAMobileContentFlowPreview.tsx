"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";

import CafeACategoryPreviewBlock from "@/components/menu-templates/CafeACategoryPreviewBlock";
import CafeAWidgetBlock from "@/components/menu-templates/CafeAWidgetBlock";
import {
  shouldShowCafeACategoryPreviewDivider,
  sortCafeAContentBlocks,
  type CafeAContentBlock,
} from "@/components/menu-templates/cafe-a-content-blocks";

import styles from "./CafeAMobileContentFlowPreview.module.css";

type MobileContentDiagnostics = {
  blockOrder: string;
  visibleBlockCount: number;
  categoryDividerCount: number;
  lastCategoryTopDivider: boolean;
  horizontalOverflow: boolean;
  nestedScroll: boolean;
  cropCount: number;
  widgetWidthSummary: string;
  pageScrollAllowed: boolean;
};

type CafeAMobileContentFlowPreviewProps = {
  blocks?: readonly CafeAContentBlock[];
  pages?: readonly (readonly CafeAContentBlock[])[];
};

const CROP_TOLERANCE_PX = 1;

const VISIBLE_LEAF_SELECTOR = [
  "[data-cafe-a-category-heading]",
  "[data-cafe-a-menu-name]",
  "[data-cafe-a-menu-price]",
  ".cafe-a-menu-description",
  ".cafe-a-menu-meta",
  ".cafe-a-menu-badge",
  ".cafe-a-menu-chip",
  "[data-cafe-a-widget-media]",
  "[data-cafe-a-widget-copy]",
  "[data-cafe-a-widget-title]",
  "[data-cafe-a-widget-body]",
].join(",");

function formatNumber(value: number) {
  return Number.isFinite(value) ? Math.round(value).toString() : "0";
}

function getWidgetWidthSummary(widgetElements: HTMLElement[]) {
  if (widgetElements.length === 0) return "none";

  const widths = widgetElements
    .map((element) => element.getBoundingClientRect().width)
    .filter((width) => width > 0);

  if (widths.length === 0) return "0px";

  const min = Math.min(...widths);
  const max = Math.max(...widths);
  return min === max ? `${formatNumber(min)}px` : `${formatNumber(min)}-${formatNumber(max)}px`;
}

export default function CafeAMobileContentFlowPreview({ blocks, pages }: CafeAMobileContentFlowPreviewProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const sortedPages = useMemo(() => {
    if (pages?.length) return pages.map((pageBlocks) => sortCafeAContentBlocks(pageBlocks));
    return [sortCafeAContentBlocks(blocks ?? [])];
  }, [blocks, pages]);
  const [diagnostics, setDiagnostics] = useState<MobileContentDiagnostics | null>(null);

  useLayoutEffect(() => {
    const rootElement = rootRef.current;
    if (!rootElement) return;

    const stageElement = rootElement.querySelector<HTMLElement>("[data-cafe-a-mobile-content-flow-stage]");
    if (!stageElement) return;

    const blockElements = Array.from(rootElement.querySelectorAll<HTMLElement>("[data-cafe-a-mobile-content-block]"));
    const dividerElements = Array.from(rootElement.querySelectorAll<HTMLElement>("[data-cafe-a-category-divider]"));
    const widgetElements = Array.from(rootElement.querySelectorAll<HTMLElement>("[data-cafe-a-widget-block]"));
    const leafElements = Array.from(rootElement.querySelectorAll<HTMLElement>(VISIBLE_LEAF_SELECTOR)).filter((element) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
    const stageRect = stageElement.getBoundingClientRect();
    const cropCount = leafElements.filter((element) => {
      const rect = element.getBoundingClientRect();
      return (
        rect.left < stageRect.left - CROP_TOLERANCE_PX ||
        rect.right > stageRect.right + CROP_TOLERANCE_PX ||
        rect.top < stageRect.top - CROP_TOLERANCE_PX
      );
    }).length;
    const lastVisibleBlock = blockElements.at(-1);
    const lastCategoryTopDivider =
      lastVisibleBlock?.dataset.cafeAMobileBlockType === "category" &&
      Boolean(lastVisibleBlock.querySelector("[data-cafe-a-category-divider]"));
    const horizontalOverflow =
      stageElement.scrollWidth > stageElement.clientWidth + 1 ||
      document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
    const nestedScroll = stageElement.scrollHeight > stageElement.clientHeight + 1 && getComputedStyle(stageElement).overflowY !== "visible";

    setDiagnostics({
      blockOrder: blockElements
        .map((element) => `${element.dataset.cafeAMobileBlockType}:${element.dataset.cafeAMobileBlockId}`)
        .join(" > "),
      visibleBlockCount: blockElements.length,
      categoryDividerCount: dividerElements.length,
      lastCategoryTopDivider,
      horizontalOverflow,
      nestedScroll,
      cropCount,
      widgetWidthSummary: getWidgetWidthSummary(widgetElements),
      pageScrollAllowed: true,
    });
  }, [sortedPages]);

  return (
    <div
      ref={rootRef}
      className={styles.preview}
      data-cafe-a-mobile-content-flow-preview
      data-cafe-a-flow-mode="mobile-stacked"
    >
      <div className={styles.stage} data-cafe-a-mobile-content-flow-stage>
        {sortedPages.map((visibleBlocks, pageIndex) => (
          <div key={`page-${pageIndex}`} className={styles.page} data-cafe-a-mobile-content-page={pageIndex}>
            {visibleBlocks.map((block, blockIndex) => {
              if (block.blockType === "category") {
                return (
                  <div
                    key={block.id}
                    className={styles.block}
                    data-cafe-a-mobile-content-block
                    data-cafe-a-mobile-block-type="category"
                    data-cafe-a-mobile-block-id={block.id}
                    data-cafe-a-mobile-source-order={blockIndex}
                  >
                    <CafeACategoryPreviewBlock
                      block={block}
                      showDividerBeforeCategory={shouldShowCafeACategoryPreviewDivider(visibleBlocks, blockIndex)}
                    />
                  </div>
                );
              }

              return (
                <div
                  key={block.id}
                  className={`${styles.block} ${styles.widgetBlock}`}
                  data-cafe-a-mobile-content-block
                  data-cafe-a-mobile-block-type="widget"
                  data-cafe-a-mobile-block-id={block.id}
                  data-cafe-a-mobile-source-order={blockIndex}
                >
                  <CafeAWidgetBlock widget={block.widget} />
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <dl className={styles.diagnostics} aria-label="mobile content flow diagnostics">
        <div className={styles.diagnosticRow}>
          <dt className={styles.diagnosticTerm}>source order</dt>
          <dd className={styles.diagnosticValue}>{diagnostics?.blockOrder ?? "pending"}</dd>
        </div>
        <div className={styles.diagnosticRow}>
          <dt className={styles.diagnosticTerm}>blocks</dt>
          <dd className={styles.diagnosticValue}>
            visible {diagnostics?.visibleBlockCount ?? 0} / dividers {diagnostics?.categoryDividerCount ?? 0} / last category{" "}
            {diagnostics?.lastCategoryTopDivider ? "top" : "none"}
          </dd>
        </div>
        <div className={styles.diagnosticRow}>
          <dt className={styles.diagnosticTerm}>safety</dt>
          <dd className={styles.diagnosticValue}>
            horizontal {diagnostics?.horizontalOverflow ? "yes" : "no"} / nested scroll {diagnostics?.nestedScroll ? "yes" : "no"} / crop{" "}
            {diagnostics?.cropCount ?? 0}
          </dd>
        </div>
        <div className={styles.diagnosticRow}>
          <dt className={styles.diagnosticTerm}>widget width</dt>
          <dd className={styles.diagnosticValue}>
            {diagnostics?.widgetWidthSummary ?? "pending"} / page scroll {diagnostics?.pageScrollAllowed ? "allowed" : "blocked"}
          </dd>
        </div>
      </dl>
    </div>
  );
}
