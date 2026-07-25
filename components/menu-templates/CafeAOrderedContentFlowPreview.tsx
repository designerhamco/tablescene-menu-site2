"use client";

import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import CafeACategoryPreviewBlock from "@/components/menu-templates/CafeACategoryPreviewBlock";
import CafeAWidgetBlock from "@/components/menu-templates/CafeAWidgetBlock";
import {
  shouldShowCafeACategoryPreviewDivider,
  sortCafeAContentBlocks,
  type CafeAContentBlock,
} from "@/components/menu-templates/cafe-a-content-blocks";

import styles from "./CafeAOrderedContentFlowPreview.module.css";

type OrderedContentDiagnostics = {
  blockOrder: string;
  columnSummaries: string[];
  categorySplitCount: number;
  widgetSplitCount: number;
  widgetSplitIds: string[];
  footerOverlapCount: number;
  directFooterOverlapCount: number;
  horizontalOverflow: boolean;
  rightEdgeUnsafeCount: number;
  cropCount: number;
  nestedScroll: boolean;
};

type CafeAOrderedContentFlowPreviewProps = {
  blocks: readonly CafeAContentBlock[];
  columns?: number;
  heightPx?: number;
};

const DEFAULT_COLUMNS = 3;
const DEFAULT_HEIGHT_PX = 660;
const FOOTER_NO_GO_TOP_GAP_PX = 32;
const FOOTER_NO_GO_HORIZONTAL_GAP_PX = 12;
const RIGHT_EDGE_SAFETY_GAP_PX = 8;
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

function getUniqueRectColumns(rects: DOMRect[]) {
  return rects.reduce<number[]>((columns, rect) => {
    if (rect.width <= 0 || rect.height <= 0) return columns;
    const left = Math.round(rect.left);
    if (!columns.some((columnLeft) => Math.abs(columnLeft - left) <= 4)) columns.push(left);
    return columns;
  }, []);
}

function getRectSummary(element: Element) {
  const rect = element.getBoundingClientRect();
  return {
    left: rect.left,
    right: rect.right,
    top: rect.top,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height,
  };
}

export default function CafeAOrderedContentFlowPreview({
  blocks,
  columns = DEFAULT_COLUMNS,
  heightPx = DEFAULT_HEIGHT_PX,
}: CafeAOrderedContentFlowPreviewProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const visibleBlocks = useMemo(() => sortCafeAContentBlocks(blocks), [blocks]);
  const safeColumns = Math.max(1, Math.floor(columns));
  const [diagnostics, setDiagnostics] = useState<OrderedContentDiagnostics | null>(null);
  const style = {
    "--cafe-a-ordered-lab-columns": String(safeColumns),
    "--cafe-a-ordered-lab-height": `${heightPx}px`,
  } as CSSProperties;

  useLayoutEffect(() => {
    const rootElement = rootRef.current;
    if (!rootElement) return;

    const flowElement = rootElement.querySelector<HTMLElement>("[data-cafe-a-ordered-content-flow]");
    if (!flowElement) return;

    const blockElements = Array.from(rootElement.querySelectorAll<HTMLElement>("[data-cafe-a-ordered-atomic-block]"));
    const leafElements = Array.from(rootElement.querySelectorAll<HTMLElement>(VISIBLE_LEAF_SELECTOR)).filter((element) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
    const footerElement = rootElement.querySelector<HTMLElement>("[data-cafe-a-ordered-lab-footer]");
    const footerRect = footerElement?.getBoundingClientRect();
    const flowRect = flowElement.getBoundingClientRect();
    const footerNoGoRect =
      footerRect && footerRect.width > 0 && footerRect.height > 0
        ? {
            left: footerRect.left - FOOTER_NO_GO_HORIZONTAL_GAP_PX,
            right: footerRect.right + FOOTER_NO_GO_HORIZONTAL_GAP_PX,
            top: footerRect.top - FOOTER_NO_GO_TOP_GAP_PX,
            bottom: flowRect.bottom,
          }
        : null;

    const suppressedCategoryElements = new Set<HTMLElement>();
    const blockSummaries = blockElements.map((blockElement) => {
      const rects = Array.from(blockElement.getClientRects());
      const columnsForBlock = getUniqueRectColumns(rects);
      const blockId = blockElement.dataset.cafeAOrderedBlockId ?? "unknown";
      const blockType = blockElement.dataset.cafeAOrderedBlockType ?? "unknown";
      const primaryRect = getRectSummary(blockElement);
      const firstFragmentLeft = columnsForBlock[0] ?? primaryRect.left;

      return {
        id: blockId,
        element: blockElement,
        firstFragmentLeft,
        type: blockType,
        columns: columnsForBlock,
        left: primaryRect.left,
        top: primaryRect.top,
      };
    });
    const columnLefts = blockSummaries
      .flatMap((block) => block.columns)
      .reduce<number[]>((columnsForFlow, left) => {
        if (!columnsForFlow.some((columnLeft) => Math.abs(columnLeft - left) <= 4)) columnsForFlow.push(left);
        return columnsForFlow;
      }, [])
      .sort((left, right) => left - right);
    const columnSummaries = columnLefts.map((columnLeft, columnIndex) => {
      const blocksInColumn = blockSummaries
        .filter((block) => block.columns.some((blockColumnLeft) => Math.abs(blockColumnLeft - columnLeft) <= 4))
        .sort((left, right) => left.top - right.top || left.left - right.left)
        .map((block, blockIndex) => {
          const isFirstFragmentColumn = Math.abs(block.firstFragmentLeft - columnLeft) <= 4;
          if (blockIndex === 0 && block.type === "category" && isFirstFragmentColumn) {
            suppressedCategoryElements.add(block.element);
          }
          return block;
        })
        .map((block) => `${block.type}:${block.id}`);

      return `C${columnIndex + 1}: ${blocksInColumn.join(" > ") || "empty"}`;
    });
    blockElements.forEach((blockElement) => {
      if (suppressedCategoryElements.has(blockElement)) {
        blockElement.setAttribute("data-cafe-a-category-divider-desktop-suppressed", "true");
        return;
      }

      blockElement.removeAttribute("data-cafe-a-category-divider-desktop-suppressed");
    });
    const categorySplitCount = blockSummaries.filter((block) => block.type === "category" && block.columns.length > 1).length;
    const widgetSplitIds = blockSummaries
      .filter((block) => block.type === "widget" && block.columns.length > 1)
      .map((block) => block.id);
    const footerOverlapCount = footerNoGoRect
      ? leafElements.filter((element) => {
          const rect = element.getBoundingClientRect();
          return (
            rect.right > footerNoGoRect.left &&
            rect.left < footerNoGoRect.right &&
            rect.bottom > footerNoGoRect.top &&
            rect.top < footerNoGoRect.bottom
          );
        }).length
      : 0;
    const directFooterOverlapCount =
      footerRect && footerRect.width > 0 && footerRect.height > 0
        ? leafElements.filter((element) => {
            const rect = element.getBoundingClientRect();
            return rect.right > footerRect.left && rect.left < footerRect.right && rect.bottom > footerRect.top && rect.top < footerRect.bottom;
          }).length
        : 0;
    const rightEdgeUnsafeCount = leafElements.filter((element) => {
      const rect = element.getBoundingClientRect();
      return rect.right > flowRect.right - RIGHT_EDGE_SAFETY_GAP_PX + 1;
    }).length;
    const cropCount = leafElements.filter((element) => {
      const rect = element.getBoundingClientRect();
      return (
        rect.left < flowRect.left - CROP_TOLERANCE_PX ||
        rect.right > flowRect.right + CROP_TOLERANCE_PX ||
        rect.top < flowRect.top - CROP_TOLERANCE_PX ||
        rect.bottom > flowRect.bottom + CROP_TOLERANCE_PX
      );
    }).length;
    const horizontalOverflow =
      flowElement.scrollWidth > flowElement.clientWidth + 1 ||
      document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
    const nestedScroll = flowElement.scrollHeight > flowElement.clientHeight + 1 && getComputedStyle(flowElement).overflowY !== "visible";

    setDiagnostics({
      blockOrder: blockSummaries.map((block) => `${block.type}:${block.id}`).join(" > "),
      columnSummaries,
      categorySplitCount,
      widgetSplitCount: widgetSplitIds.length,
      widgetSplitIds,
      footerOverlapCount,
      directFooterOverlapCount,
      horizontalOverflow,
      rightEdgeUnsafeCount,
      cropCount,
      nestedScroll,
    });
  }, [heightPx, safeColumns, visibleBlocks]);

  return (
    <div
      ref={rootRef}
      className={styles.preview}
      style={style}
      data-cafe-a-ordered-content-flow-preview
      data-cafe-a-ordered-content-columns={safeColumns}
    >
      <div className={styles.stage}>
        <div className={styles.flow} data-cafe-a-ordered-content-flow data-cafe-a-flow-mode="ordered">
          {visibleBlocks.map((block, index) => {
            const showDividerBeforeCategory = shouldShowCafeACategoryPreviewDivider(visibleBlocks, index);

            if (block.blockType === "category") {
              return (
                <div
                  key={block.id}
                  className={`${styles.block} ${styles.categoryBlock}`}
                  data-cafe-a-ordered-atomic-block
                  data-cafe-a-ordered-block-type="category"
                  data-cafe-a-ordered-block-id={block.id}
                  data-cafe-a-ordered-source-order={index}
                >
                  <CafeACategoryPreviewBlock block={block} showDividerBeforeCategory={showDividerBeforeCategory} allowSplit />
                </div>
              );
            }

            return (
              <div
                key={block.id}
                className={`${styles.block} ${styles.widgetBlock}`}
                data-cafe-a-ordered-atomic-block
                data-cafe-a-ordered-block-type="widget"
                data-cafe-a-ordered-block-id={block.id}
                data-cafe-a-ordered-source-order={index}
              >
                <CafeAWidgetBlock widget={block.widget} />
              </div>
            );
          })}
        </div>
        <div className={styles.footerNoGo} data-cafe-a-ordered-lab-footer>
          <span>Wi-Fi AUBE_GUEST</span>
          <span>PW 1234-5678</span>
          <span>Instagram @aube_coffee</span>
        </div>
      </div>

      <dl className={styles.diagnostics} aria-label="orderedFit layout diagnostics">
        <div className={styles.diagnosticRow}>
          <dt className={styles.diagnosticTerm}>source order</dt>
          <dd className={styles.diagnosticValue}>{diagnostics?.blockOrder ?? "pending"}</dd>
        </div>
        <div className={styles.diagnosticRow}>
          <dt className={styles.diagnosticTerm}>visual columns</dt>
          <dd className={styles.diagnosticValue}>{diagnostics?.columnSummaries.join(" / ") ?? "pending"}</dd>
        </div>
        <div className={styles.diagnosticRow}>
          <dt className={styles.diagnosticTerm}>split</dt>
          <dd className={styles.diagnosticValue}>
            category {diagnostics?.categorySplitCount ?? 0} / widget {diagnostics?.widgetSplitCount ?? 0}
            {diagnostics?.widgetSplitIds.length ? ` (${diagnostics.widgetSplitIds.join(", ")})` : ""}
          </dd>
        </div>
        <div className={styles.diagnosticRow}>
          <dt className={styles.diagnosticTerm}>safety</dt>
          <dd className={styles.diagnosticValue}>
            footer {diagnostics?.footerOverlapCount ?? 0} / direct {diagnostics?.directFooterOverlapCount ?? 0} / right{" "}
            {diagnostics?.rightEdgeUnsafeCount ?? 0} / crop {diagnostics?.cropCount ?? 0}
          </dd>
        </div>
        <div className={styles.diagnosticRow}>
          <dt className={styles.diagnosticTerm}>overflow</dt>
          <dd className={styles.diagnosticValue}>
            horizontal {diagnostics?.horizontalOverflow ? "yes" : "no"} / nested scroll {diagnostics?.nestedScroll ? "yes" : "no"} / height{" "}
            {formatNumber(heightPx)}px
          </dd>
        </div>
      </dl>
    </div>
  );
}
