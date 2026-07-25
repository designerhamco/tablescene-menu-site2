"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";

import CafeACategoryPreviewBlock from "@/components/menu-templates/CafeACategoryPreviewBlock";
import CafeAWidgetBlock, { type CafeAWidgetAspectRatio } from "@/components/menu-templates/CafeAWidgetBlock";
import {
  type CafeABalancedAtomicBlock,
  type CafeAOrderedBalancedMeasuredBlock,
  getCafeAOrderedBalancedBreaksFromColumns,
  getCafeAOrderedBalancedContiguousColumns,
} from "@/components/menu-templates/cafe-a-balanced-layout";
import {
  shouldShowCafeACategoryPreviewDivider,
  sortCafeAContentBlocks,
  type CafeAContentBlock,
} from "@/components/menu-templates/cafe-a-content-blocks";

import styles from "./CafeABalancedContentFlowPreview.module.css";

type BalancedContentPayload = CafeAContentBlock;

type BalancedContentBlock = CafeABalancedAtomicBlock<BalancedContentPayload> &
  CafeAOrderedBalancedMeasuredBlock & {
    payload: BalancedContentPayload;
  };

type BalancedContentDiagnostics = {
  pass: number;
  breaks: string;
  columnSummaries: string[];
  estimatedHeights: string;
  actualHeights: string;
  tallestColumn: number;
  shortestColumn: number;
  spread: number;
  horizontalOverflow: boolean;
  footerOverlapCount: number;
};

type CafeABalancedContentFlowPreviewProps = {
  blocks: readonly CafeAContentBlock[];
  columns?: number;
  columnWidthPx?: number;
  maxStabilizationPasses?: number;
};

const DEFAULT_COLUMNS = 3;
const DEFAULT_COLUMN_WIDTH_PX = 390;
const BLOCK_GAP_PX = 18;
const MAX_EXHAUSTIVE_BLOCKS = 10;
const MAX_EXHAUSTIVE_COLUMNS = 4;
const TARGET_MAX_VISIBLE_GAP = 36;

const ASPECT_RATIO_HEIGHT_MULTIPLIER: Record<CafeAWidgetAspectRatio, number> = {
  "2:1": 1 / 2,
  "3:2": 2 / 3,
  "4:3": 3 / 4,
  "1:1": 1,
  "3:4": 4 / 3,
};

function estimateLineCount(text: string, charsPerLine: number) {
  const normalizedText = text.trim();
  if (!normalizedText) return 0;
  return Math.max(1, Math.ceil(normalizedText.length / charsPerLine));
}

function estimateCategoryHeight(block: Extract<CafeAContentBlock, { blockType: "category" }>, columnWidthPx: number) {
  const contentWidth = Math.max(180, columnWidthPx - 8);
  const charsPerLine = Math.max(12, Math.floor(contentWidth / 12));
  const headingHeight = 34;
  const descriptionHeight = block.category.description ? 12 + estimateLineCount(block.category.description, charsPerLine) * 17 : 0;
  const itemsHeight = block.category.items.reduce((total, item) => {
    const nameHeight = estimateLineCount(item.name, charsPerLine) * 16;
    const secondaryHeight = item.secondaryName ? 13 : 0;
    const descriptionLines = estimateLineCount(item.description ?? "", charsPerLine);
    const descriptionHeight = descriptionLines > 0 ? 5 + descriptionLines * 16 : 0;
    return total + Math.max(36, nameHeight + secondaryHeight + descriptionHeight);
  }, 0);
  const itemGaps = Math.max(0, block.category.items.length - 1) * 12;

  return headingHeight + descriptionHeight + 16 + itemsHeight + itemGaps;
}

function estimateWidgetHeight(block: Extract<CafeAContentBlock, { blockType: "widget" }>, columnWidthPx: number) {
  const widget = block.widget;
  const contentWidth = Math.max(180, columnWidthPx - 28);
  const charsPerLine = Math.max(14, Math.floor(contentWidth / 9));

  if (widget.type === "image") {
    return columnWidthPx * ASPECT_RATIO_HEIGHT_MULTIPLIER[widget.aspectRatio] + 2;
  }

  const titleHeight = widget.title.trim() ? 24 : 0;
  const bodyHeight = estimateLineCount(widget.body, charsPerLine) * 19;
  const copyPadding = widget.type === "text" ? 30 : 29;
  const copyHeight = copyPadding + titleHeight + bodyHeight + (titleHeight > 0 ? 7 : 0);

  if (widget.type === "text") return copyHeight + 2;

  return columnWidthPx * ASPECT_RATIO_HEIGHT_MULTIPLIER[widget.aspectRatio] + copyHeight + 3;
}

function estimateContentBlockHeight(block: CafeAContentBlock, columnWidthPx: number) {
  return block.blockType === "category"
    ? estimateCategoryHeight(block, columnWidthPx)
    : estimateWidgetHeight(block, columnWidthPx);
}

function toBalancedContentBlocks(
  blocks: readonly CafeAContentBlock[],
  actualHeights: Record<string, number>,
  columnWidthPx: number,
): BalancedContentBlock[] {
  const sortedBlocks = sortCafeAContentBlocks(blocks);

  return sortedBlocks.map((block, sourceIndex) => {
    const estimatedHeight = estimateContentBlockHeight(block, columnWidthPx);
    const actualHeight = actualHeights[block.id];
    const height = Number.isFinite(actualHeight) && actualHeight > 0 ? actualHeight : estimatedHeight;

    return {
      id: block.id,
      key: block.id,
      blockType: block.blockType,
      sourceIndex,
      sortOrder: block.sortOrder,
      order: sourceIndex,
      estimatedHeight,
      height,
      visibleContentHeight: height,
      marginBottom: BLOCK_GAP_PX,
      payload: block,
    };
  });
}

function formatNumber(value: number) {
  return Number.isFinite(value) ? Math.round(value).toString() : "0";
}

function getDiagnosticsSignature(heights: Record<string, number>) {
  return Object.entries(heights)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}:${Math.round(value)}`)
    .join("|");
}

export default function CafeABalancedContentFlowPreview({
  blocks,
  columns = DEFAULT_COLUMNS,
  columnWidthPx = DEFAULT_COLUMN_WIDTH_PX,
  maxStabilizationPasses = 1,
}: CafeABalancedContentFlowPreviewProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [actualHeights, setActualHeights] = useState<Record<string, number>>({});
  const [pass, setPass] = useState(0);
  const [diagnostics, setDiagnostics] = useState<BalancedContentDiagnostics | null>(null);
  const balancedBlocks = useMemo(
    () => toBalancedContentBlocks(blocks, actualHeights, columnWidthPx),
    [actualHeights, blocks, columnWidthPx],
  );
  const safeColumns = Math.max(1, Math.min(MAX_EXHAUSTIVE_COLUMNS, Math.floor(columns), balancedBlocks.length || 1));
  const balancedColumns = useMemo(
    () =>
      getCafeAOrderedBalancedContiguousColumns(balancedBlocks, safeColumns, {
        maxExhaustiveBlocks: MAX_EXHAUSTIVE_BLOCKS,
        maxExhaustiveColumns: MAX_EXHAUSTIVE_COLUMNS,
        targetMaxVisibleGap: TARGET_MAX_VISIBLE_GAP,
      }),
    [balancedBlocks, safeColumns],
  );
  const visibleBlocks = useMemo(() => sortCafeAContentBlocks(blocks), [blocks]);
  const breaks = useMemo(() => getCafeAOrderedBalancedBreaksFromColumns(balancedColumns), [balancedColumns]);

  useLayoutEffect(() => {
    const rootElement = rootRef.current;
    if (!rootElement) return;

    const blockElements = Array.from(rootElement.querySelectorAll<HTMLElement>("[data-cafe-a-balanced-atomic-block]"));
    const nextHeights: Record<string, number> = {};
    blockElements.forEach((blockElement) => {
      const id = blockElement.dataset.cafeABalancedBlockId;
      const rect = blockElement.getBoundingClientRect();
      if (id && rect.width > 0 && rect.height > 0) nextHeights[id] = rect.height;
    });

    const columnElements = Array.from(rootElement.querySelectorAll<HTMLElement>("[data-cafe-a-balanced-column]"));
    const columnHeights = columnElements.map((columnElement) => columnElement.getBoundingClientRect().height);
    const tallestColumn = Math.max(...columnHeights, 0);
    const shortestColumn = columnHeights.length > 0 ? Math.min(...columnHeights) : 0;
    const rootRect = rootElement.getBoundingClientRect();
    const horizontalOverflow = rootElement.scrollWidth > rootElement.clientWidth + 1;
    const footerElement = rootElement.querySelector<HTMLElement>("[data-cafe-a-balanced-lab-footer]");
    const footerRect = footerElement?.getBoundingClientRect();
    const footerOverlapCount =
      footerRect && footerRect.width > 0 && footerRect.height > 0
        ? blockElements.filter((blockElement) => {
            const rect = blockElement.getBoundingClientRect();
            return rect.right > footerRect.left && rect.left < footerRect.right && rect.bottom > footerRect.top && rect.top < footerRect.bottom;
          }).length
        : 0;

    setDiagnostics({
      pass,
      breaks,
      columnSummaries: balancedColumns.map((column, columnIndex) =>
        `C${columnIndex + 1}: ${column.blocks.map((block) => `${block.blockType}:${block.id}`).join(" > ") || "empty"}`,
      ),
      estimatedHeights: balancedBlocks.map((block) => `${block.id}:${formatNumber(block.estimatedHeight)}`).join(", "),
      actualHeights: Object.keys(nextHeights).length > 0
        ? Object.entries(nextHeights).map(([key, value]) => `${key}:${formatNumber(value)}`).join(", ")
        : "pending",
      tallestColumn,
      shortestColumn,
      spread: Math.max(0, tallestColumn - shortestColumn),
      horizontalOverflow,
      footerOverlapCount,
    });

    const nextSignature = getDiagnosticsSignature(nextHeights);
    const currentSignature = getDiagnosticsSignature(actualHeights);
    if (pass < maxStabilizationPasses && nextSignature && nextSignature !== currentSignature && rootRect.width > 0) {
      setActualHeights(nextHeights);
      setPass((currentPass) => currentPass + 1);
    }
  }, [actualHeights, balancedBlocks, balancedColumns, breaks, maxStabilizationPasses, pass]);

  return (
    <div
      ref={rootRef}
      className={styles.preview}
      data-cafe-a-balanced-lab
      data-cafe-a-balanced-lab-pass={pass}
      data-cafe-a-balanced-lab-breaks={breaks}
    >
      <div className={styles.stage}>
        <div
          className={styles.columns}
          style={{ gridTemplateColumns: `repeat(${safeColumns}, minmax(0, 1fr))` }}
          data-cafe-a-balanced-grid
        >
          {balancedColumns.map((column, columnIndex) => (
            <div key={`balanced-lab-column-${columnIndex}`} className={styles.column} data-cafe-a-balanced-column>
              {column.blocks.map((block, blockIndex) => {
                const showDividerBeforeCategory =
                  block.payload.blockType === "category"
                    ? shouldShowCafeACategoryPreviewDivider(visibleBlocks, block.sourceIndex)
                    : false;

                return (
                  <div
                    key={block.id}
                    className={styles.atomicBlock}
                    data-cafe-a-balanced-atomic-block
                    data-cafe-a-balanced-block-type={block.blockType}
                    data-cafe-a-balanced-block-id={block.id}
                    data-cafe-a-balanced-source-order={block.sourceIndex}
                    data-balanced-estimated-height={block.estimatedHeight.toFixed(2)}
                  >
                    {block.payload.blockType === "category" ? (
                      <CafeACategoryPreviewBlock
                        block={block.payload}
                        showDividerBeforeCategory={showDividerBeforeCategory}
                        suppressDesktopColumnStartDivider={blockIndex === 0}
                      />
                    ) : (
                      <CafeAWidgetBlock widget={block.payload.widget} />
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div className={styles.footerNoGo} data-cafe-a-balanced-lab-footer>
          <span>Wi-Fi AUBE_GUEST</span>
          <span>PW 1234-5678</span>
          <span>Instagram @aube_coffee</span>
        </div>
      </div>

      <dl className={styles.diagnostics} aria-label="balanced layout diagnostics">
        <div className={styles.diagnosticRow}>
          <dt className={styles.diagnosticTerm}>breaks</dt>
          <dd className={styles.diagnosticValue}>{breaks || "none"}</dd>
        </div>
        <div className={styles.diagnosticRow}>
          <dt className={styles.diagnosticTerm}>columns</dt>
          <dd className={styles.diagnosticValue}>{diagnostics?.columnSummaries.join(" / ") ?? "pending"}</dd>
        </div>
        <div className={styles.diagnosticRow}>
          <dt className={styles.diagnosticTerm}>estimated</dt>
          <dd className={styles.diagnosticValue}>{diagnostics?.estimatedHeights ?? "pending"}</dd>
        </div>
        <div className={styles.diagnosticRow}>
          <dt className={styles.diagnosticTerm}>actual</dt>
          <dd className={styles.diagnosticValue}>{diagnostics?.actualHeights ?? "pending"}</dd>
        </div>
        <div className={styles.diagnosticRow}>
          <dt className={styles.diagnosticTerm}>spread</dt>
          <dd className={styles.diagnosticValue}>
            {diagnostics
              ? `${formatNumber(diagnostics.shortestColumn)}-${formatNumber(diagnostics.tallestColumn)}px / delta ${formatNumber(diagnostics.spread)}px / pass ${diagnostics.pass}`
              : "pending"}
          </dd>
        </div>
        <div className={styles.diagnosticRow}>
          <dt className={styles.diagnosticTerm}>safety</dt>
          <dd className={styles.diagnosticValue}>
            overflow {diagnostics?.horizontalOverflow ? "yes" : "no"} / footer overlap {diagnostics?.footerOverlapCount ?? 0}
          </dd>
        </div>
      </dl>
    </div>
  );
}
