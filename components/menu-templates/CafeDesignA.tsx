/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";

import KoreanFontAssets from "@/components/menu-templates/shared/KoreanFontAssets";
import MenuLanguageSwitcher from "@/components/menu-templates/shared/MenuLanguageSwitcher";
import type { PublicMenuTemplateProps } from "@/components/menu-templates/types";
import { DEFAULT_LOCALE } from "@/lib/locales";
import { getMenuItemBadgeLabel } from "@/lib/menu-badges";
import { getPcTabletLayoutModeFromPageSettings } from "@/lib/menu-layout-modes";
import { getMenuPublicCapabilities } from "@/lib/menu-public-capabilities";
import { MENU_LIMITS } from "@/lib/menu-starter-presets";
import { getBadgeStyleCss, getBadgeStyleForItem, getCustomBadgeStyles } from "@/lib/template-badge-styles";
import { getResolvedBackgroundColor } from "@/lib/template-background-colors";
import { getTemplateCapabilities, type TemplateCapabilities } from "@/lib/template-capabilities";
import {
  getMenuLayoutDensity,
  getTemplateLayoutRules,
  type MenuLayoutDensity,
} from "@/lib/template-layout-rules";
import { getCustomTypographySettings, getEnglishFontLoadAssets, getKoreanFontLoadAssets, getTypographyCssVariables, mergeTypographySettings } from "@/lib/template-typography-presets";
import { formatMenuPrice, shouldShowMenuItemTraits } from "@/types/menu";

type MenuItem = PublicMenuTemplateProps["items"][number];
type MenuCategory = PublicMenuTemplateProps["categories"][number];
type MenuPage = PublicMenuTemplateProps["pages"][number];
type PriceOption = PublicMenuTemplateProps["priceOptions"][number];
type CafeDesignAPriceToken = {
  label: string;
  price: string;
};
type MenuGroup = {
  page: MenuPage;
  category: MenuCategory;
  items: MenuItem[];
};
type MenuPageGroup = {
  page: MenuPage;
  groups: MenuGroup[];
};
type CafeDesignALayoutMode = "orderedFit" | "balanced";
type CafeDesignABalancedVariant = "estimatedGreedy" | "sourceSequential" | "sourceRoundRobin" | "lastAwareGreedy" | "visibleExhaustive";
type CafeDesignAFitState = {
  columns: number;
  fontScale: number;
  gapScale: number;
  balancedVariant: CafeDesignABalancedVariant;
  status: "idle" | "fit" | "warning";
  measuredColumns: number;
  boardInnerHeight: number;
  flowHeight: number;
  primaryColumnBottom: number;
  primaryBottomGap: number;
  longestColumnBottom: number;
  primaryFillRatio: number;
  averageFillRatio: number;
  minFillRatio: number;
  lastColumnFillRatio: number;
  bottomGap: number;
  contentGap: number;
  itemBoxGap: number;
  textVisualGap: number;
  categoryBlockGap: number;
  visibleItemBottomGap: number;
  visibleTextBottomGap: number;
  visiblePriceBottomGap: number;
  visibleContentBottomGap: number;
  visibleAverageFillRatio: number;
  visibleMinFillRatio: number;
  visibleLastColumnFillRatio: number;
  overflow: boolean;
};
type BalancedColumn = {
  id: string;
  groups: MenuGroup[];
  estimatedHeight: number;
};
type CafeDesignAColumnMeasurement = {
  left: number;
  top: number;
  bottom: number;
  elements: DOMRect[];
};
type CafeDesignAFitMeasurement = {
  boardInnerHeight: number;
  flowHeight: number;
  measuredColumns: number;
  primaryColumnBottom: number;
  primaryBottomGap: number;
  longestColumnBottom: number;
  primaryFillRatio: number;
  averageFillRatio: number;
  minFillRatio: number;
  lastColumnFillRatio: number;
  bottomGap: number;
  contentGap: number;
  itemBoxGap: number;
  textVisualGap: number;
  categoryBlockGap: number;
  visibleItemBottomGap: number;
  visibleTextBottomGap: number;
  visiblePriceBottomGap: number;
  visibleContentBottomGap: number;
  visibleAverageFillRatio: number;
  visibleMinFillRatio: number;
  visibleLastColumnFillRatio: number;
  overflow: boolean;
};
type CafeDesignABalancedWeightedGroup = {
  group: MenuGroup;
  index: number;
  estimatedHeight: number;
};
type CafeDesignABalancedBlockMeasurement = {
  key: string;
  order: number;
  height: number;
  visibleItemHeight: number;
  visibleTextHeight: number;
  visiblePriceHeight: number;
  visibleContentHeight: number;
  marginBottom: number;
  estimatedHeight: number;
};
type CafeDesignABalancedSimulatedColumn = {
  blocks: CafeDesignABalancedBlockMeasurement[];
  height: number;
};

const FIT_COLUMN_CANDIDATES = [2, 3, 4, 5, 6] as const;
const FIT_FONT_SCALE_CANDIDATES = [
  1.34,
  1.32,
  1.3,
  1.29,
  1.28,
  1.27,
  1.26,
  1.25,
  1.24,
  1.23,
  1.22,
  1.21,
  1.2,
  1.16,
  1.12,
  1.08,
  1.04,
  1.03,
  1.02,
  1.01,
  1,
  0.99,
  0.98,
  0.97,
  0.95,
  0.9,
  0.89,
  0.88,
  0.879,
  0.87,
  0.85,
  0.805,
  0.8,
  0.798,
  0.796,
  0.795,
  0.792,
  0.79,
  0.785,
  0.784,
  0.78,
  0.75,
  0.72,
  0.68,
  0.64,
] as const;
const BALANCED_LAYOUT_VARIANTS = ["estimatedGreedy", "sourceSequential", "sourceRoundRobin", "lastAwareGreedy", "visibleExhaustive"] as const satisfies readonly CafeDesignABalancedVariant[];
const BALANCED_MIN_SAFETY_GAP = 1;
const BALANCED_TARGET_MIN_GAP = 2;
const BALANCED_TARGET_MAX_GAP = 4;
const BALANCED_VISIBLE_GAP = 8;
const BALANCED_FAILED_GAP = 10;
const BALANCED_MIN_QUALITY_FONT_SCALE = 0.78;
const ORDERED_FIT_FONT_SCALE_CANDIDATES = [1.28, 1.24, 1.2, 1.16, 1.12, 1.08, 1.04, 1, 0.95, 0.9, 0.85, 0.84, 0.83, 0.82, 0.8, 0.78, 0.76, 0.75, 0.72, 0.71] as const;
const FIT_WARNING_FONT_SCALE = 0.75;
const DEFAULT_BALANCED_VARIANT: CafeDesignABalancedVariant = "estimatedGreedy";
const DEFAULT_FIT_STATE: CafeDesignAFitState = {
  columns: 4,
  fontScale: 1,
  gapScale: 1,
  balancedVariant: DEFAULT_BALANCED_VARIANT,
  status: "idle",
  measuredColumns: 0,
  boardInnerHeight: 0,
  flowHeight: 0,
  primaryColumnBottom: 0,
  primaryBottomGap: 0,
  longestColumnBottom: 0,
  primaryFillRatio: 0,
  averageFillRatio: 0,
  minFillRatio: 0,
  lastColumnFillRatio: 0,
  bottomGap: 0,
  contentGap: 0,
  itemBoxGap: 0,
  textVisualGap: 0,
  categoryBlockGap: 0,
  visibleItemBottomGap: 0,
  visibleTextBottomGap: 0,
  visiblePriceBottomGap: 0,
  visibleContentBottomGap: 0,
  visibleAverageFillRatio: 0,
  visibleMinFillRatio: 0,
  visibleLastColumnFillRatio: 0,
  overflow: false,
};
const ORDERED_FIT_TARGET_GAP = 5;
const ORDERED_FIT_TARGET_MIN_GAP = 3;
const ORDERED_FIT_TARGET_MAX_GAP = 5;
const ORDERED_FIT_ACCEPTABLE_MAX_GAP = 7;
const ORDERED_FIT_MIN_SAFETY_GAP = 2;
const ORDERED_FIT_LOOSE_GAP = 20;
const ORDERED_FIT_COLUMN_TOLERANCE = 8;
const ORDERED_FIT_DESKTOP_MAX_COLUMNS = 4;

function getMaxFitColumns(width: number) {
  if (width < 720) return 2;
  if (width < 1120) return 3;
  if (width < 1500) return 4;
  if (width < 1800) return 5;
  return 6;
}

function getBalancedFitColumnCandidates(width: number, groupCount: number) {
  const maxWidthColumns = getMaxFitColumns(width);
  const readableMaxColumns = width < 640 ? 2 : width < 760 ? 3 : maxWidthColumns;
  const maxUsefulColumns = Math.max(2, Math.min(readableMaxColumns, Math.max(2, groupCount)));
  const minColumns = 3;

  return FIT_COLUMN_CANDIDATES.filter((columns) => columns >= minColumns && columns <= maxUsefulColumns).sort((a, b) => b - a);
}

function getOrderedFitColumnCandidates(width: number) {
  const maxColumns = Math.min(ORDERED_FIT_DESKTOP_MAX_COLUMNS, Math.max(3, getMaxFitColumns(width)));
  const minColumns = 2;
  return FIT_COLUMN_CANDIDATES.filter((columns) => columns >= minColumns && columns <= maxColumns).sort((a, b) => b - a);
}

function getFitGapScale(fontScale: number) {
  return Math.max(0.68, Math.min(1.16, fontScale + 0.04));
}

function getBalancedFitGapScale(fontScale: number, menuWidth: number) {
  if (menuWidth < 760) return Math.max(0.68, Math.min(0.78, fontScale - 0.02));
  if (menuWidth < 1080) return Math.max(0.74, Math.min(0.95, fontScale + 0.02));
  return getFitGapScale(fontScale);
}

function getOrderedFitGapScale(fontScale: number, menuWidth: number) {
  if (menuWidth < 760) return Math.max(0.64, Math.min(0.72, fontScale - 0.29));
  if (menuWidth < 1080) return Math.max(0.76, Math.min(0.92, fontScale - 0.12));
  return Math.max(0.84, Math.min(0.96, fontScale - 0.16));
}

function getFitStyle(fitState: CafeDesignAFitState): CSSProperties {
  return {
    "--fit-columns": String(fitState.columns),
    "--fit-font-scale": String(fitState.fontScale),
    "--fit-gap-scale": String(fitState.gapScale),
  } as CSSProperties;
}

function roundFitMetric(value: number) {
  return Number.isFinite(value) ? Math.round(value * 10) / 10 : 0;
}

function roundFitRatio(value: number) {
  return Number.isFinite(value) ? Math.round(value * 1000) / 1000 : 0;
}

function areFitStatesEqual(currentState: CafeDesignAFitState, nextState: CafeDesignAFitState) {
  return (
    currentState.columns === nextState.columns &&
    currentState.fontScale === nextState.fontScale &&
    currentState.gapScale === nextState.gapScale &&
    currentState.balancedVariant === nextState.balancedVariant &&
    currentState.status === nextState.status &&
    currentState.measuredColumns === nextState.measuredColumns &&
    currentState.boardInnerHeight === nextState.boardInnerHeight &&
    currentState.flowHeight === nextState.flowHeight &&
    currentState.primaryColumnBottom === nextState.primaryColumnBottom &&
    currentState.primaryBottomGap === nextState.primaryBottomGap &&
    currentState.longestColumnBottom === nextState.longestColumnBottom &&
    currentState.primaryFillRatio === nextState.primaryFillRatio &&
    currentState.averageFillRatio === nextState.averageFillRatio &&
    currentState.minFillRatio === nextState.minFillRatio &&
    currentState.lastColumnFillRatio === nextState.lastColumnFillRatio &&
    currentState.bottomGap === nextState.bottomGap &&
    currentState.contentGap === nextState.contentGap &&
    currentState.itemBoxGap === nextState.itemBoxGap &&
    currentState.textVisualGap === nextState.textVisualGap &&
    currentState.categoryBlockGap === nextState.categoryBlockGap &&
    currentState.visibleItemBottomGap === nextState.visibleItemBottomGap &&
    currentState.visibleTextBottomGap === nextState.visibleTextBottomGap &&
    currentState.visiblePriceBottomGap === nextState.visiblePriceBottomGap &&
    currentState.visibleContentBottomGap === nextState.visibleContentBottomGap &&
    currentState.visibleAverageFillRatio === nextState.visibleAverageFillRatio &&
    currentState.visibleMinFillRatio === nextState.visibleMinFillRatio &&
    currentState.visibleLastColumnFillRatio === nextState.visibleLastColumnFillRatio &&
    currentState.overflow === nextState.overflow
  );
}

function getFitGapStyle(density: MenuLayoutDensity): CSSProperties {
  const gapByDensity = {
    spacious: { x: "clamp(48px, 3.4vw, 68px)", y: "2.5rem", stack: "1.5rem", line: "1.5", inline: "0.5rem" },
    default: { x: "clamp(40px, 3.2vw, 58px)", y: "2rem", stack: "1.25rem", line: "1.45", inline: "0.375rem" },
    compact: { x: "clamp(34px, 2.7vw, 50px)", y: "1.65rem", stack: "1rem", line: "1.4", inline: "0.3125rem" },
    ultraCompact: { x: "clamp(30px, 2.4vw, 44px)", y: "1.35rem", stack: "0.75rem", line: "1.35", inline: "0.25rem" },
  } satisfies Record<MenuLayoutDensity, { x: string; y: string; stack: string; line: string; inline: string }>;
  const gap = gapByDensity[density];

  return {
    "--menu-board-column-gap": gap.x,
    "--fit-gap-y": gap.y,
    "--fit-stack-gap": gap.stack,
    "--menu-line-gap": gap.line,
    "--menu-inline-gap": gap.inline,
  } as CSSProperties;
}

function getColumnMeasurements(menuElement: HTMLElement, measurementSelector: string): CafeDesignAColumnMeasurement[] {
  const menuRect = menuElement.getBoundingClientRect();
  const measuredElements = Array.from(menuElement.querySelectorAll<HTMLElement>(measurementSelector));
  const columns: CafeDesignAColumnMeasurement[] = [];

  for (const element of measuredElements) {
    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) continue;

    const relativeLeft = rect.left - menuRect.left;
    const relativeTop = rect.top - menuRect.top;
    const relativeBottom = rect.bottom - menuRect.top;
    const existingColumn = columns.find((column) => Math.abs(column.left - relativeLeft) <= ORDERED_FIT_COLUMN_TOLERANCE);

    if (existingColumn) {
      existingColumn.top = Math.min(existingColumn.top, relativeTop);
      existingColumn.bottom = Math.max(existingColumn.bottom, relativeBottom);
      existingColumn.elements.push(rect);
    } else {
      columns.push({
        left: relativeLeft,
        top: relativeTop,
        bottom: relativeBottom,
        elements: [rect],
      });
    }
  }

  return columns.sort((a, b) => a.left - b.left);
}

function getAverageItemBoxGap(columns: CafeDesignAColumnMeasurement[]) {
  const gaps: number[] = [];

  for (const column of columns) {
    const sortedElements = [...column.elements].sort((a, b) => a.top - b.top);
    for (let index = 1; index < sortedElements.length; index += 1) {
      const gap = sortedElements[index].top - sortedElements[index - 1].bottom;
      if (gap > 0.5) gaps.push(gap);
    }
  }

  if (gaps.length === 0) return 0;
  return gaps.reduce((total, gap) => total + gap, 0) / gaps.length;
}

function getAverageTextVisualGap(menuElement: HTMLElement) {
  const gaps = Array.from(menuElement.querySelectorAll<HTMLElement>("[data-cafe-a-menu-item]"))
    .map((itemElement) => {
      const itemRect = itemElement.getBoundingClientRect();
      const textElements = Array.from(
        itemElement.querySelectorAll<HTMLElement>("[data-cafe-a-menu-name], [data-cafe-a-menu-price], .cafe-a-menu-description, .cafe-a-menu-meta")
      );
      const textBottom = textElements.reduce((bottom, textElement) => {
        const textRect = textElement.getBoundingClientRect();
        return textRect.width > 0 && textRect.height > 0 ? Math.max(bottom, textRect.bottom) : bottom;
      }, itemRect.top);

      return Math.max(0, itemRect.bottom - textBottom);
    })
    .filter((gap) => Number.isFinite(gap));

  if (gaps.length === 0) return 0;
  return gaps.reduce((total, gap) => total + gap, 0) / gaps.length;
}

function measureCafeAOrderedFit(boardElement: HTMLElement, menuElement: HTMLElement, expectedColumns?: number): CafeDesignAFitMeasurement {
  const boardRect = boardElement.getBoundingClientRect();
  const menuRect = menuElement.getBoundingClientRect();
  const flowHeight = menuElement.clientHeight || menuRect.height;
  const columns = getColumnMeasurements(menuElement, "[data-cafe-a-category-heading], [data-cafe-a-item-stack]");
  const measuredColumnCount = columns.length;
  const expectedColumnCount = Math.max(1, expectedColumns ?? measuredColumnCount);
  const columnFillRatios = Array.from({ length: expectedColumnCount }, (_, index) => {
    const column = columns[index];
    if (!column || flowHeight <= 0) return 0;
    return Math.min(1, Math.max(0, column.bottom / flowHeight));
  });
  const primaryColumnBottom = columns[0]?.bottom ?? 0;
  const longestColumnBottom = columns.reduce((bottom, column) => Math.max(bottom, column.bottom), 0);
  const primaryBottomGap = flowHeight - primaryColumnBottom;
  const primaryFillRatio = columnFillRatios[0] ?? 0;
  const averageFillRatio =
    columnFillRatios.length > 0 ? columnFillRatios.reduce((totalFill, fillRatio) => totalFill + fillRatio, 0) / columnFillRatios.length : 0;
  const minFillRatio = columnFillRatios.length > 0 ? Math.min(...columnFillRatios) : 0;
  const lastColumnFillRatio = columnFillRatios[columnFillRatios.length - 1] ?? 0;
  const bottomGap = primaryBottomGap;
  const overflowsHeight =
    menuElement.scrollHeight > menuElement.clientHeight + 1 ||
    primaryColumnBottom > flowHeight - ORDERED_FIT_MIN_SAFETY_GAP ||
    longestColumnBottom > flowHeight + 1;
  const overflowsWidth = menuElement.scrollWidth > menuElement.clientWidth + 1;

  return {
    boardInnerHeight: roundFitMetric(boardElement.clientHeight || boardRect.height),
    flowHeight: roundFitMetric(flowHeight),
    measuredColumns: measuredColumnCount,
    primaryColumnBottom: roundFitMetric(primaryColumnBottom),
    primaryBottomGap: roundFitMetric(primaryBottomGap),
    longestColumnBottom: roundFitMetric(longestColumnBottom),
    primaryFillRatio: roundFitRatio(primaryFillRatio),
    averageFillRatio: roundFitRatio(averageFillRatio),
    minFillRatio: roundFitRatio(minFillRatio),
    lastColumnFillRatio: roundFitRatio(lastColumnFillRatio),
    bottomGap: roundFitMetric(bottomGap),
    contentGap: roundFitMetric(Math.max(0, bottomGap)),
    itemBoxGap: roundFitMetric(getAverageItemBoxGap(columns)),
    textVisualGap: roundFitMetric(getAverageTextVisualGap(menuElement)),
    categoryBlockGap: roundFitMetric(Math.max(0, bottomGap)),
    visibleItemBottomGap: roundFitMetric(Math.max(0, bottomGap)),
    visibleTextBottomGap: roundFitMetric(getAverageTextVisualGap(menuElement)),
    visiblePriceBottomGap: roundFitMetric(Math.max(0, bottomGap)),
    visibleContentBottomGap: roundFitMetric(Math.max(0, bottomGap)),
    visibleAverageFillRatio: roundFitRatio(averageFillRatio),
    visibleMinFillRatio: roundFitRatio(minFillRatio),
    visibleLastColumnFillRatio: roundFitRatio(lastColumnFillRatio),
    overflow: overflowsHeight || overflowsWidth,
  };
}

function getElementMarginBottom(element: HTMLElement) {
  const parsedMargin = Number.parseFloat(window.getComputedStyle(element).marginBottom);
  return Number.isFinite(parsedMargin) ? parsedMargin : 0;
}

function getVisibleElementBottom(elements: HTMLElement[]) {
  return elements.reduce((bottom, element) => {
    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return bottom;
    return Math.max(bottom, rect.bottom);
  }, Number.NEGATIVE_INFINITY);
}

function getBalancedBlockVisibleHeights(blockElement: HTMLElement) {
  const blockRect = blockElement.getBoundingClientRect();
  const itemBottom = getVisibleElementBottom(Array.from(blockElement.querySelectorAll<HTMLElement>("[data-cafe-a-menu-item]")));
  const textBottom = getVisibleElementBottom(
    Array.from(blockElement.querySelectorAll<HTMLElement>("[data-cafe-a-menu-name], .cafe-a-menu-meta, .cafe-a-menu-description, .cafe-a-menu-badge, .cafe-a-menu-chip"))
  );
  const priceBottom = getVisibleElementBottom(Array.from(blockElement.querySelectorAll<HTMLElement>("[data-cafe-a-menu-price], .cafe-a-menu-price, .cafe-a-price-label")));
  const visibleItemHeight = Number.isFinite(itemBottom) ? Math.max(0, itemBottom - blockRect.top) : blockRect.height;
  const visibleTextHeight = Number.isFinite(textBottom) ? Math.max(0, textBottom - blockRect.top) : visibleItemHeight;
  const visiblePriceHeight = Number.isFinite(priceBottom) ? Math.max(0, priceBottom - blockRect.top) : visibleItemHeight;
  const visibleContentHeight = Math.max(visibleItemHeight, visibleTextHeight, visiblePriceHeight);

  return {
    visibleItemHeight,
    visibleTextHeight,
    visiblePriceHeight,
    visibleContentHeight,
  };
}

function getBalancedBlockMeasurements(menuElement: HTMLElement): CafeDesignABalancedBlockMeasurement[] {
  return Array.from(menuElement.querySelectorAll<HTMLElement>("[data-cafe-a-balanced-category-block]"))
    .map((blockElement) => {
      const rect = blockElement.getBoundingClientRect();
      const order = Number.parseInt(blockElement.dataset.cafeABalancedSourceOrder ?? "", 10);
      const estimatedHeight = Number.parseFloat(blockElement.dataset.balancedEstimatedHeight ?? "");
      const visibleHeights = getBalancedBlockVisibleHeights(blockElement);

      return {
        key: blockElement.dataset.cafeABalancedCategoryBlock ?? "",
        order: Number.isFinite(order) ? order : Number.MAX_SAFE_INTEGER,
        height: rect.height,
        ...visibleHeights,
        marginBottom: getElementMarginBottom(blockElement),
        estimatedHeight: Number.isFinite(estimatedHeight) ? estimatedHeight : rect.height,
      };
    })
    .filter((block) => block.key && block.height > 0)
    .sort((a, b) => a.order - b.order || a.key.localeCompare(b.key));
}

function createBalancedSimulatedColumns(
  blocks: CafeDesignABalancedBlockMeasurement[],
  columns: number,
  variant: CafeDesignABalancedVariant,
): CafeDesignABalancedSimulatedColumn[] {
  const safeColumns = Math.max(1, Math.min(6, Math.floor(columns)));
  const simulatedColumns: CafeDesignABalancedSimulatedColumn[] = Array.from({ length: safeColumns }, () => ({
    blocks: [],
    height: 0,
  }));

  function appendBlock(column: CafeDesignABalancedSimulatedColumn, block: CafeDesignABalancedBlockMeasurement) {
    if (column.blocks.length > 0) column.height += column.blocks[column.blocks.length - 1]?.marginBottom ?? 0;
    column.blocks.push(block);
    column.height += block.height;
  }

  if (blocks.length === 0) return simulatedColumns;

  if (variant === "sourceSequential") {
    const totalHeight = blocks.reduce((total, block) => total + block.height, 0);
    const targetHeight = totalHeight / safeColumns;
    let columnIndex = 0;

    blocks.forEach((block, blockIndex) => {
      const currentColumn = simulatedColumns[columnIndex] ?? simulatedColumns[simulatedColumns.length - 1];
      const remainingBlocks = blocks.length - blockIndex;
      const remainingColumns = safeColumns - columnIndex;
      const projectedHeight = currentColumn.height + (currentColumn.blocks.length > 0 ? currentColumn.blocks[currentColumn.blocks.length - 1]?.marginBottom ?? 0 : 0) + block.height;
      const shouldAdvance =
        currentColumn.blocks.length > 0 &&
        columnIndex < safeColumns - 1 &&
        projectedHeight > targetHeight &&
        remainingBlocks >= remainingColumns;

      if (shouldAdvance) columnIndex += 1;
      appendBlock(simulatedColumns[columnIndex] ?? simulatedColumns[simulatedColumns.length - 1], block);
    });

    return simulatedColumns;
  }

  if (variant === "sourceRoundRobin") {
    blocks.forEach((block, index) => appendBlock(simulatedColumns[index % safeColumns], block));
    return simulatedColumns;
  }

  if (variant === "visibleExhaustive") {
    return getVisibleBalancedExhaustiveColumns(blocks, safeColumns);
  }

  const sortedBlocks = [...blocks].sort((a, b) => b.height - a.height || a.order - b.order);
  sortedBlocks.forEach((block) => {
    const targetColumn = simulatedColumns.reduce((shortestColumn, column) => (column.height < shortestColumn.height ? column : shortestColumn));
    appendBlock(targetColumn, block);
  });

  if (variant !== "lastAwareGreedy") return simulatedColumns;

  let bestColumns = simulatedColumns.map((column) => ({ blocks: [...column.blocks], height: column.height }));
  let bestScore = getBalancedSimulatedSpreadScore(bestColumns);

  for (let sourceIndex = 0; sourceIndex < safeColumns; sourceIndex += 1) {
    for (let targetIndex = 0; targetIndex < safeColumns; targetIndex += 1) {
      if (sourceIndex === targetIndex) continue;
      const sourceColumn = simulatedColumns[sourceIndex];
      if (!sourceColumn || sourceColumn.blocks.length <= 1) continue;

      for (const block of sourceColumn.blocks) {
        const nextColumns = simulatedColumns.map((column, columnIndex) => {
          const nextBlocks =
            columnIndex === sourceIndex
              ? column.blocks.filter((candidateBlock) => candidateBlock.key !== block.key)
              : columnIndex === targetIndex
                ? [...column.blocks, block]
                : [...column.blocks];

          return {
            blocks: nextBlocks,
            height: getBalancedSimulatedColumnHeight(nextBlocks),
          };
        });
        const score = getBalancedSimulatedSpreadScore(nextColumns);
        if (score < bestScore) {
          bestScore = score;
          bestColumns = nextColumns;
        }
      }
    }
  }

  return bestColumns;
}

function getBalancedSimulatedColumnHeight(blocks: CafeDesignABalancedBlockMeasurement[]) {
  return blocks.reduce((height, block, index) => height + block.height + (index < blocks.length - 1 ? block.marginBottom : 0), 0);
}

function getBalancedSimulatedColumnVisibleHeight(blocks: CafeDesignABalancedBlockMeasurement[], key: "visibleItemHeight" | "visibleTextHeight" | "visiblePriceHeight" | "visibleContentHeight") {
  if (blocks.length === 0) return 0;

  return blocks.slice(0, -1).reduce((height, block) => height + block.height + block.marginBottom, 0) + (blocks[blocks.length - 1]?.[key] ?? 0);
}

function getBalancedVisibleColumnFillHeights(column: CafeDesignABalancedSimulatedColumn) {
  return {
    visibleItemHeight: getBalancedSimulatedColumnVisibleHeight(column.blocks, "visibleItemHeight"),
    visibleTextHeight: getBalancedSimulatedColumnVisibleHeight(column.blocks, "visibleTextHeight"),
    visiblePriceHeight: getBalancedSimulatedColumnVisibleHeight(column.blocks, "visiblePriceHeight"),
    visibleContentHeight: getBalancedSimulatedColumnVisibleHeight(column.blocks, "visibleContentHeight"),
  };
}

function getVisibleBalancedExhaustiveColumns(blocks: CafeDesignABalancedBlockMeasurement[], safeColumns: number): CafeDesignABalancedSimulatedColumn[] {
  if (safeColumns > 4 || blocks.length > 8 || blocks.length < safeColumns) {
    const fallbackColumns: CafeDesignABalancedSimulatedColumn[] = Array.from({ length: safeColumns }, () => ({ blocks: [], height: 0 }));
    blocks.forEach((block) => {
      const targetColumn = fallbackColumns.reduce((shortestColumn, column) =>
        getBalancedSimulatedColumnVisibleHeight(column.blocks, "visibleContentHeight") < getBalancedSimulatedColumnVisibleHeight(shortestColumn.blocks, "visibleContentHeight")
          ? column
          : shortestColumn
      );
      targetColumn.blocks.push(block);
      targetColumn.blocks.sort((a, b) => a.order - b.order);
      targetColumn.height = getBalancedSimulatedColumnHeight(targetColumn.blocks);
    });
    return fallbackColumns;
  }

  const columns: CafeDesignABalancedSimulatedColumn[] = Array.from({ length: safeColumns }, () => ({ blocks: [], height: 0 }));
  let bestColumns = columns.map((column) => ({ blocks: [...column.blocks], height: column.height }));
  let bestScore = Number.POSITIVE_INFINITY;

  function visit(blockIndex: number) {
    if (blockIndex >= blocks.length) {
      if (columns.some((column) => column.blocks.length === 0)) return;
      const candidateColumns = columns.map((column) => {
        const sortedBlocks = [...column.blocks].sort((a, b) => a.order - b.order);
        return {
          blocks: sortedBlocks,
          height: getBalancedSimulatedColumnHeight(sortedBlocks),
        };
      });
      const score = getBalancedSimulatedSpreadScore(candidateColumns);
      if (score < bestScore) {
        bestScore = score;
        bestColumns = candidateColumns;
      }
      return;
    }

    const block = blocks[blockIndex];
    if (!block) return;

    for (const column of columns) {
      column.blocks.push(block);
      visit(blockIndex + 1);
      column.blocks.pop();
    }
  }

  visit(0);
  return bestColumns;
}

function getBalancedSimulatedSpreadScore(columns: CafeDesignABalancedSimulatedColumn[]) {
  const heights = columns.map((column) => getBalancedVisibleColumnFillHeights(column).visibleContentHeight || column.height);
  const maxHeight = Math.max(...heights, 0);
  const minHeight = Math.min(...heights, 0);
  const averageHeight = heights.length > 0 ? heights.reduce((total, height) => total + height, 0) / heights.length : 0;
  const lastHeight = heights[heights.length - 1] ?? 0;

  return (
    (maxHeight - minHeight) * 2.4 +
    Math.max(0, averageHeight - lastHeight) * 3 +
    columns.filter((column) => column.blocks.length === 0).length * 500
  );
}

function getBalancedMeasurementFromColumns({
  boardElement,
  menuElement,
  columns,
  expectedColumns,
  includeDomOverflow = true,
}: {
  boardElement: HTMLElement;
  menuElement: HTMLElement;
  columns: CafeDesignABalancedSimulatedColumn[];
  expectedColumns: number;
  includeDomOverflow?: boolean;
}): CafeDesignAFitMeasurement {
  const boardRect = boardElement.getBoundingClientRect();
  const menuRect = menuElement.getBoundingClientRect();
  const flowHeight = menuElement.clientHeight || menuRect.height;
  const safeExpectedColumns = Math.max(1, expectedColumns);
  const measuredColumns = Math.max(columns.length, safeExpectedColumns);
  const categoryColumnFillRatios = Array.from({ length: safeExpectedColumns }, (_, index) => {
    const column = columns[index];
    if (!column || flowHeight <= 0) return 0;
    return Math.min(1, Math.max(0, column.height / flowHeight));
  });
  const visibleColumnHeights = columns.map(getBalancedVisibleColumnFillHeights);
  const visibleContentHeights = visibleColumnHeights.map((column) => column.visibleContentHeight);
  const visibleItemHeights = visibleColumnHeights.map((column) => column.visibleItemHeight);
  const visibleTextHeights = visibleColumnHeights.map((column) => column.visibleTextHeight);
  const visiblePriceHeights = visibleColumnHeights.map((column) => column.visiblePriceHeight);
  const visibleFillRatios = Array.from({ length: safeExpectedColumns }, (_, index) => {
    const visibleContentHeight = visibleContentHeights[index] ?? 0;
    if (flowHeight <= 0) return 0;
    return Math.min(1, Math.max(0, visibleContentHeight / flowHeight));
  });
  const primaryColumnBottom = columns[0]?.height ?? 0;
  const longestColumnBottom = columns.reduce((bottom, column) => Math.max(bottom, column.height), 0);
  const longestVisibleContentBottom = visibleContentHeights.reduce((bottom, height) => Math.max(bottom, height), 0);
  const longestVisibleItemBottom = visibleItemHeights.reduce((bottom, height) => Math.max(bottom, height), 0);
  const longestVisibleTextBottom = visibleTextHeights.reduce((bottom, height) => Math.max(bottom, height), 0);
  const longestVisiblePriceBottom = visiblePriceHeights.reduce((bottom, height) => Math.max(bottom, height), 0);
  const primaryBottomGap = flowHeight - primaryColumnBottom;
  const longestBottomGap = flowHeight - longestColumnBottom;
  const visibleItemBottomGap = flowHeight - longestVisibleItemBottom;
  const visibleTextBottomGap = flowHeight - longestVisibleTextBottom;
  const visiblePriceBottomGap = flowHeight - longestVisiblePriceBottom;
  const visibleContentBottomGap = flowHeight - longestVisibleContentBottom;
  const averageFillRatio =
    categoryColumnFillRatios.length > 0 ? categoryColumnFillRatios.reduce((totalFill, fillRatio) => totalFill + fillRatio, 0) / categoryColumnFillRatios.length : 0;
  const minFillRatio = categoryColumnFillRatios.length > 0 ? Math.min(...categoryColumnFillRatios) : 0;
  const lastColumnFillRatio = categoryColumnFillRatios[categoryColumnFillRatios.length - 1] ?? 0;
  const visibleAverageFillRatio =
    visibleFillRatios.length > 0 ? visibleFillRatios.reduce((totalFill, fillRatio) => totalFill + fillRatio, 0) / visibleFillRatios.length : 0;
  const visibleMinFillRatio = visibleFillRatios.length > 0 ? Math.min(...visibleFillRatios) : 0;
  const visibleLastColumnFillRatio = visibleFillRatios[visibleFillRatios.length - 1] ?? 0;
  const overflowsHeight =
    (includeDomOverflow && menuElement.scrollHeight > menuElement.clientHeight + 1) ||
    longestColumnBottom > flowHeight + 1 ||
    visibleContentBottomGap < BALANCED_MIN_SAFETY_GAP;
  const overflowsWidth = includeDomOverflow && menuElement.scrollWidth > menuElement.clientWidth + 1;

  return {
    boardInnerHeight: roundFitMetric(boardElement.clientHeight || boardRect.height),
    flowHeight: roundFitMetric(flowHeight),
    measuredColumns,
    primaryColumnBottom: roundFitMetric(primaryColumnBottom),
    primaryBottomGap: roundFitMetric(primaryBottomGap),
    longestColumnBottom: roundFitMetric(longestVisibleContentBottom),
    primaryFillRatio: roundFitRatio(visibleFillRatios[0] ?? 0),
    averageFillRatio: roundFitRatio(averageFillRatio),
    minFillRatio: roundFitRatio(minFillRatio),
    lastColumnFillRatio: roundFitRatio(lastColumnFillRatio),
    bottomGap: roundFitMetric(visibleContentBottomGap),
    contentGap: roundFitMetric(Math.max(0, visibleContentBottomGap)),
    itemBoxGap: roundFitMetric(Math.max(0, visibleItemBottomGap)),
    textVisualGap: roundFitMetric(Math.max(0, visibleTextBottomGap)),
    categoryBlockGap: roundFitMetric(Math.max(0, longestBottomGap)),
    visibleItemBottomGap: roundFitMetric(Math.max(0, visibleItemBottomGap)),
    visibleTextBottomGap: roundFitMetric(Math.max(0, visibleTextBottomGap)),
    visiblePriceBottomGap: roundFitMetric(Math.max(0, visiblePriceBottomGap)),
    visibleContentBottomGap: roundFitMetric(Math.max(0, visibleContentBottomGap)),
    visibleAverageFillRatio: roundFitRatio(visibleAverageFillRatio),
    visibleMinFillRatio: roundFitRatio(visibleMinFillRatio),
    visibleLastColumnFillRatio: roundFitRatio(visibleLastColumnFillRatio),
    overflow: overflowsHeight || overflowsWidth,
  };
}

function measureCafeABalancedFit(boardElement: HTMLElement, menuElement: HTMLElement, expectedColumns?: number): CafeDesignAFitMeasurement {
  const menuRect = menuElement.getBoundingClientRect();
  const flowHeight = menuElement.clientHeight || menuRect.height;
  const columnElements = Array.from(menuElement.querySelectorAll<HTMLElement>(":scope > [data-cafe-a-balanced-column]"));
  const simulatedColumns = columnElements.map((columnElement) => {
    const blockElements = Array.from(columnElement.querySelectorAll<HTMLElement>(":scope > [data-cafe-a-balanced-category-block]"));
    const blocks = blockElements.map((blockElement) => {
      const rect = blockElement.getBoundingClientRect();
      const order = Number.parseInt(blockElement.dataset.cafeABalancedSourceOrder ?? "", 10);
      const estimatedHeight = Number.parseFloat(blockElement.dataset.balancedEstimatedHeight ?? "");
      const visibleHeights = getBalancedBlockVisibleHeights(blockElement);

      return {
        key: blockElement.dataset.cafeABalancedCategoryBlock ?? "",
        order: Number.isFinite(order) ? order : Number.MAX_SAFE_INTEGER,
        height: Math.max(0, rect.height),
        ...visibleHeights,
        marginBottom: getElementMarginBottom(blockElement),
        estimatedHeight: Number.isFinite(estimatedHeight) ? estimatedHeight : rect.height,
      };
    });
    const columnRect = columnElement.getBoundingClientRect();
    const visibleBottom = blockElements.reduce((bottom, blockElement) => {
      const rect = blockElement.getBoundingClientRect();
      return Math.max(bottom, rect.bottom - menuRect.top);
    }, Math.max(0, columnRect.top - menuRect.top));

    return {
      blocks,
      height: Math.min(flowHeight, Math.max(0, visibleBottom)),
    };
  });

  return getBalancedMeasurementFromColumns({
    boardElement,
    menuElement,
    columns: simulatedColumns,
    expectedColumns: Math.max(1, expectedColumns ?? columnElements.length),
  });
}

function getDisplayName(site: PublicMenuTemplateProps["menuSite"]) {
  return site.restaurant_name || site.name || "MenuLink";
}

function getCategoryItems(items: PublicMenuTemplateProps["items"], categoryId: string) {
  return items
    .filter((item) => item.category_id === categoryId && item.visible !== false)
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "ko"));
}

function getItemTraits(traits: PublicMenuTemplateProps["traits"], itemId: string) {
  return traits
    .filter((trait) => trait.menu_item_id === itemId && trait.visible)
    .sort((a, b) => a.sort_order - b.sort_order)
    .slice(0, MENU_LIMITS.maxTraitsPerItem);
}

function getMenuItemMetaText(item: MenuItem, locale: PublicMenuTemplateProps["locale"]) {
  const displayName = item.name.trim();
  if (locale === DEFAULT_LOCALE) {
    return item.set_name?.trim() ?? "";
  }

  const defaultName = item.default_name?.trim() ?? "";
  return defaultName && defaultName !== displayName ? defaultName : "";
}

function getItemPriceOptions(priceOptions: PublicMenuTemplateProps["priceOptions"], itemId: string, maxOptions: number = MENU_LIMITS.maxPriceOptionsPerItem) {
  return priceOptions
    .filter((option) => option.menu_item_id === itemId && option.visible !== false)
    .sort((a, b) => a.sort_order - b.sort_order)
    .slice(0, maxOptions);
}

function formatPriceOption(option: PriceOption) {
  const priceLabel = option.price_label?.trim();
  if (priceLabel) return priceLabel;

  const rawPrice = option.price as unknown;
  if (typeof rawPrice === "number" && Number.isFinite(rawPrice)) {
    return new Intl.NumberFormat("ko-KR").format(rawPrice) + "원";
  }
  if (typeof rawPrice === "string" && rawPrice.trim()) {
    const numericPrice = Number(rawPrice.replace(/,/g, ""));
    return Number.isFinite(numericPrice) ? new Intl.NumberFormat("ko-KR").format(numericPrice) + "원" : rawPrice.trim();
  }

  return "";
}

function getItemPriceDisplay(item: MenuItem, priceOptions: PublicMenuTemplateProps["priceOptions"], capabilities: TemplateCapabilities) {
  if (item.price_visible === false) return null;

  const maxOptions = capabilities.maxPriceOptionsPerItem ?? MENU_LIMITS.maxPriceOptionsPerItem;
  const visibleOptions = capabilities.priceOptions ? getItemPriceOptions(priceOptions, item.id, maxOptions) : [];
  if (visibleOptions.length > 0) {
    return visibleOptions
      .map((option) => {
        const optionPrice = formatPriceOption(option);
        return optionPrice ? `${option.label} ${optionPrice}` : option.label;
      })
      .filter(Boolean)
      .join(" / ");
  }

  if (item.price_label?.trim()) return item.price_label.trim();

  return formatMenuPrice(item);
}

function getItemPriceTokens(item: MenuItem, priceOptions: PublicMenuTemplateProps["priceOptions"], capabilities: TemplateCapabilities): CafeDesignAPriceToken[] {
  if (item.price_visible === false) return [];

  const maxOptions = capabilities.maxPriceOptionsPerItem ?? MENU_LIMITS.maxPriceOptionsPerItem;
  const visibleOptions = capabilities.priceOptions ? getItemPriceOptions(priceOptions, item.id, maxOptions) : [];
  if (visibleOptions.length > 0) {
    return visibleOptions
      .map((option) => ({
        label: option.label,
        price: formatPriceOption(option),
      }))
      .filter((token) => token.label || token.price);
  }

  const price = item.price_label?.trim() || formatMenuPrice(item);
  if (!price) return [];

  return [
    {
      label: item.portion_visible === false ? "" : item.portion_label?.trim() ?? "",
      price,
    },
  ];
}

function getFeaturedItem(data: PublicMenuTemplateProps, capabilities: TemplateCapabilities) {
  if (!data.pageSettings.featured_item_enabled || !data.pageSettings.featured_item_id) return null;
  if (!capabilities.featuredItemHero) return null;

  const featuredItem = data.items.find((item) => item.id === data.pageSettings.featured_item_id);
  if (!featuredItem || featuredItem.visible === false) return null;

  return featuredItem;
}

function getVisibleMenuPageGroups(data: PublicMenuTemplateProps): MenuPageGroup[] {
  const visiblePages = data.pages
    .filter((page) => page.visible !== false)
    .sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at));

  return visiblePages
    .map((page) => {
    const pageCategories = data.categories
      .filter((category) => category.visible !== false && category.menu_page_id === page.id)
      .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "ko"));

      const groups = pageCategories
        .map((category) => ({
        page,
        category,
        items: getCategoryItems(data.items, category.id),
      }))
      .filter((group) => group.items.length > 0);

      return { page, groups };
    })
    .filter((pageGroup) => pageGroup.groups.length > 0);
}

function getFlatMenuGroups(pageGroups: MenuPageGroup[]) {
  return pageGroups.flatMap((pageGroup) => pageGroup.groups);
}

function getMenuGroupKey(group: MenuGroup) {
  return `${group.page.id}:${group.category.id}`;
}

function isDefaultPageTitle(page: MenuPage) {
  const title = page.title.trim();
  return /^메뉴 페이지\s*\d+$/i.test(title) || /^page\s*\d+$/i.test(title);
}

function estimateMenuGroupHeight(
  group: MenuGroup,
  data: PublicMenuTemplateProps,
  capabilities: TemplateCapabilities,
) {
  const headingWeight = 1.9 + (group.category.description_visible && group.category.description ? 0.75 : 0);
  const itemWeight = group.items.reduce((weight, item) => {
    const priceTokens = getItemPriceTokens(item, data.priceOptions, capabilities);
    const traits = getItemTraits(data.traits, item.id);
    const visibleTraits = capabilities.itemTraits && shouldShowMenuItemTraits(item, traits) ? traits.filter((trait) => trait.visible) : [];

    return (
      weight +
      1 +
      (item.set_name ? 0.28 : 0) +
      (item.description ? 0.55 : 0) +
      (priceTokens.length > 1 ? (priceTokens.length - 1) * 0.12 : 0) +
      (visibleTraits.length > 0 ? 0.35 : 0) +
      (item.origin_info ? 0.3 : 0)
    );
  }, 0);

  return headingWeight + itemWeight;
}

function createBalancedColumns(safeColumns: number): BalancedColumn[] {
  return Array.from({ length: safeColumns }, (_, index) => ({
    id: `balanced-column-${index + 1}`,
    groups: [],
    estimatedHeight: 0,
  }));
}

function appendWeightedGroupToColumn(column: BalancedColumn, weightedGroup: CafeDesignABalancedWeightedGroup) {
  column.groups.push(weightedGroup.group);
  column.estimatedHeight += weightedGroup.estimatedHeight;
}

function getShortestBalancedColumn(columns: BalancedColumn[]) {
  return columns.reduce((shortestColumn, column) =>
    column.estimatedHeight < shortestColumn.estimatedHeight ? column : shortestColumn
  );
}

function getBalancedColumnsSpreadScore(columns: BalancedColumn[]) {
  const heights = columns.map((column) => column.estimatedHeight);
  const maxHeight = Math.max(...heights, 0);
  const minHeight = Math.min(...heights, 0);
  const averageHeight = heights.length > 0 ? heights.reduce((total, height) => total + height, 0) / heights.length : 0;
  const lastHeight = heights[heights.length - 1] ?? 0;

  return (
    (maxHeight - minHeight) * 3 +
    Math.max(0, averageHeight - lastHeight) * 2.4 +
    columns.filter((column) => column.groups.length === 0).length * 100
  );
}

function createBalancedColumnsFromWeightedGroups(
  weightedGroups: CafeDesignABalancedWeightedGroup[],
  safeColumns: number,
  variant: CafeDesignABalancedVariant,
): BalancedColumn[] {
  const columns = createBalancedColumns(safeColumns);
  if (weightedGroups.length === 0) return columns;

  if (variant === "sourceSequential") {
    const totalHeight = weightedGroups.reduce((total, group) => total + group.estimatedHeight, 0);
    const targetHeight = totalHeight / safeColumns;
    let columnIndex = 0;

    weightedGroups.forEach((weightedGroup, groupIndex) => {
      const remainingGroups = weightedGroups.length - groupIndex;
      const remainingColumns = safeColumns - columnIndex;
      const currentColumn = columns[columnIndex] ?? columns[columns.length - 1];
      const shouldAdvance =
        currentColumn.groups.length > 0 &&
        columnIndex < safeColumns - 1 &&
        currentColumn.estimatedHeight + weightedGroup.estimatedHeight > targetHeight &&
        remainingGroups >= remainingColumns;

      if (shouldAdvance) columnIndex += 1;
      appendWeightedGroupToColumn(columns[columnIndex] ?? columns[columns.length - 1], weightedGroup);
    });

    return columns;
  }

  if (variant === "sourceRoundRobin") {
    weightedGroups.forEach((weightedGroup, index) => {
      appendWeightedGroupToColumn(columns[index % safeColumns], weightedGroup);
    });
    return columns;
  }

  const sortedGroups = [...weightedGroups].sort((a, b) => b.estimatedHeight - a.estimatedHeight || a.index - b.index);
  sortedGroups.forEach((weightedGroup) => appendWeightedGroupToColumn(getShortestBalancedColumn(columns), weightedGroup));

  if (variant !== "lastAwareGreedy") return columns;

  let bestColumns = columns.map((column) => ({ ...column, groups: [...column.groups] }));
  let bestScore = getBalancedColumnsSpreadScore(bestColumns);

  for (let sourceIndex = 0; sourceIndex < safeColumns; sourceIndex += 1) {
    for (let targetIndex = 0; targetIndex < safeColumns; targetIndex += 1) {
      if (sourceIndex === targetIndex) continue;
      const sourceColumn = columns[sourceIndex];
      const targetColumn = columns[targetIndex];
      if (!sourceColumn || !targetColumn || sourceColumn.groups.length <= 1) continue;

      for (const group of sourceColumn.groups) {
        const weightedGroup = weightedGroups.find((candidate) => candidate.group === group);
        if (!weightedGroup) continue;

        const nextColumns = columns.map((column) => ({
          ...column,
          groups: column.groups.filter((candidateGroup) => candidateGroup !== group),
          estimatedHeight: column.groups
            .filter((candidateGroup) => candidateGroup !== group)
            .reduce((total, candidateGroup) => {
              const candidateWeightedGroup = weightedGroups.find((candidate) => candidate.group === candidateGroup);
              return total + (candidateWeightedGroup?.estimatedHeight ?? 0);
            }, 0),
        }));
        appendWeightedGroupToColumn(nextColumns[targetIndex], weightedGroup);

        const score = getBalancedColumnsSpreadScore(nextColumns);
        if (score < bestScore) {
          bestScore = score;
          bestColumns = nextColumns;
        }
      }
    }
  }

  return bestColumns;
}

function getBalancedMenuColumns({
  pageGroups,
  columns,
  data,
  capabilities,
  variant = DEFAULT_BALANCED_VARIANT,
}: {
  pageGroups: MenuPageGroup[];
  columns: number;
  data: PublicMenuTemplateProps;
  capabilities: TemplateCapabilities;
  variant?: CafeDesignABalancedVariant;
}): BalancedColumn[] {
  const safeColumns = Math.max(1, Math.min(6, Math.floor(columns)));
  const weightedGroups = getFlatMenuGroups(pageGroups)
    .map((group, index) => ({
      group,
      index,
      estimatedHeight: estimateMenuGroupHeight(group, data, capabilities),
    }));

  return createBalancedColumnsFromWeightedGroups(weightedGroups, safeColumns, variant);
}

function getCategoryTitleSpacing(density: MenuLayoutDensity) {
  return {
    spacious: "mb-4",
    default: "mb-3",
    compact: "mb-3",
    ultraCompact: "mb-2",
  }[density];
}

function getItemStackSpacing(density: MenuLayoutDensity) {
  return {
    spacious: "mb-6",
    default: "mb-5",
    compact: "mb-4",
    ultraCompact: "mb-3",
  }[density];
}

function getMenuAreaClassName(hasCoverSection: boolean) {
  return hasCoverSection ? "lg:col-span-1" : "lg:col-span-1";
}

function getOuterGridGapClassName(density: MenuLayoutDensity) {
  return {
    spacious: "gap-y-12 md:gap-x-8 lg:gap-x-[clamp(28px,3vw,56px)] lg:gap-y-[clamp(32px,3vh,48px)]",
    default: "gap-y-10 md:gap-x-8 lg:gap-x-[clamp(24px,2.6vw,48px)] lg:gap-y-[clamp(24px,2.6vh,40px)]",
    compact: "gap-y-9 md:gap-x-7 lg:gap-x-[clamp(22px,2.3vw,40px)] lg:gap-y-[clamp(22px,2.3vh,34px)]",
    ultraCompact: "gap-y-8 md:gap-x-6 lg:gap-x-[clamp(20px,2vw,34px)] lg:gap-y-[clamp(20px,2vh,30px)]",
  }[density];
}

function getDesktopGridClassName(hasCoverSection: boolean) {
  return hasCoverSection
    ? "lg:grid-cols-[minmax(170px,0.42fr)_minmax(0,2.8fr)] xl:grid-cols-[minmax(220px,0.55fr)_minmax(0,2.8fr)] 2xl:grid-cols-[minmax(260px,0.55fr)_minmax(0,4fr)]"
    : "lg:grid-cols-1";
}

function CategoryTitle({ category, density }: { category: MenuCategory; density: MenuLayoutDensity }) {
  const spacingClassName = getCategoryTitleSpacing(density);
  const titleClassName = {
    spacious: "cafe-a-category-title-size-spacious",
    default: "cafe-a-category-title-size-default",
    compact: "cafe-a-category-title-size-compact",
    ultraCompact: "cafe-a-category-title-size-ultra-compact",
  }[density];
  const descriptionClassName = {
    spacious: "cafe-a-menu-description-size-spacious",
    default: "cafe-a-menu-description-size-default",
    compact: "cafe-a-menu-description-size-compact",
    ultraCompact: "cafe-a-menu-description-size-ultra-compact",
  }[density];

  return (
    <div className={`cafe-a-category-heading ${spacingClassName}`} data-cafe-a-category-heading="">
      <h2 className={`cafe-a-category-title break-words font-black uppercase leading-tight text-[#191c1b] ${titleClassName}`}>{category.name}</h2>
      <div className="cafe-a-category-rule mt-2 border-b border-[#191c1b]" />
      {category.description_visible && category.description && (
        <p className={`cafe-a-menu-description mt-2 break-keep font-semibold leading-relaxed text-[#3f4945] ${descriptionClassName}`}>{category.description}</p>
      )}
    </div>
  );
}

function Badge({
  item,
  capabilities,
  templateKey,
  customBadgeStyles,
}: {
  item: MenuItem;
  capabilities: TemplateCapabilities;
  templateKey: string | null;
  customBadgeStyles: unknown;
}) {
  if (!capabilities.itemBadges) return null;

  const label = getMenuItemBadgeLabel(item);
  if (!label) return null;

  const badgeStyle = getBadgeStyleForItem(item, templateKey, customBadgeStyles);

  return (
    <span className="menu-badge cafe-a-menu-badge inline-flex rounded-none px-1.5 py-1 font-black uppercase leading-none" style={getBadgeStyleCss(badgeStyle)}>
      {label}
    </span>
  );
}

function SoldOutBadge() {
  return <span className="menu-badge cafe-a-menu-badge inline-flex rounded-none bg-[#e1e3e0] px-1.5 py-1 font-black uppercase leading-none text-[#3f4945]">품절</span>;
}

function MenuItemRow({
  item,
  priceOptions,
  traits,
  capabilities,
  density,
  templateKey,
  customBadgeStyles,
  locale,
}: {
  item: MenuItem;
  priceOptions: PublicMenuTemplateProps["priceOptions"];
  traits: PublicMenuTemplateProps["traits"];
  capabilities: TemplateCapabilities;
  density: MenuLayoutDensity;
  templateKey: string | null;
  customBadgeStyles: unknown;
  locale: PublicMenuTemplateProps["locale"];
}) {
  const priceTokens = getItemPriceTokens(item, priceOptions, capabilities);
  const visibleTraits = capabilities.itemTraits && shouldShowMenuItemTraits(item, traits) ? traits.filter((trait) => trait.visible) : [];
  const titleClassName = {
    spacious: "cafe-a-menu-title-size-spacious",
    default: "cafe-a-menu-title-size-default",
    compact: "cafe-a-menu-title-size-compact",
    ultraCompact: "cafe-a-menu-title-size-ultra-compact",
  }[density];
  const descriptionClassName = {
    spacious: "line-clamp-3",
    default: "line-clamp-2",
    compact: "line-clamp-2",
    ultraCompact: "line-clamp-1",
  }[density];
  const priceClassName = {
    spacious: "cafe-a-menu-price-size-spacious",
    default: "cafe-a-menu-price-size-default",
    compact: "cafe-a-menu-price-size-compact",
    ultraCompact: "cafe-a-menu-price-size-ultra-compact",
  }[density];
  const itemGridClassName = {
    spacious: "grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1.5 sm:grid-cols-[minmax(0,1fr)_minmax(3.75rem,auto)] sm:gap-4 lg:grid-cols-[minmax(0,1fr)_auto]",
    default: "grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1.5 sm:grid-cols-[minmax(0,1fr)_minmax(3.25rem,auto)] sm:gap-3 lg:grid-cols-[minmax(0,1fr)_auto]",
    compact: "grid-cols-[minmax(0,1fr)_auto] gap-x-2.5 gap-y-1.5 sm:grid-cols-[minmax(0,1fr)_minmax(3rem,auto)] sm:gap-2.5 lg:grid-cols-[minmax(0,1fr)_auto]",
    ultraCompact: "grid-cols-[minmax(0,1fr)_auto] gap-x-2 gap-y-1.5 sm:grid-cols-[minmax(0,1fr)_minmax(2.75rem,auto)] sm:gap-2 lg:grid-cols-[minmax(0,1fr)_auto]",
  }[density];
  const metaClassName = {
    spacious: "cafe-a-menu-meta-size-spacious",
    default: "cafe-a-menu-meta-size-default",
    compact: "cafe-a-menu-meta-size-compact",
    ultraCompact: "cafe-a-menu-meta-size-ultra-compact",
  }[density];
  const descriptionTextClassName = {
    spacious: "cafe-a-menu-description-size-spacious leading-[1.5]",
    default: "cafe-a-menu-description-size-default leading-[1.45]",
    compact: "cafe-a-menu-description-size-compact leading-[1.4]",
    ultraCompact: "cafe-a-menu-description-size-ultra-compact leading-[1.35]",
  }[density];
  const metaText = getMenuItemMetaText(item, locale);
  const priceCountClassName = `cafe-a-menu-item-price-count-${Math.min(priceTokens.length, 3)}`;

  return (
    <article className={`cafe-a-menu-item grid items-start ${priceCountClassName} ${itemGridClassName}`} data-cafe-a-menu-item="">
      <div className="min-w-0">
        <div className="cafe-a-menu-title-row mb-0.5 flex flex-wrap items-center gap-1.5">
          <h3 className={`cafe-a-menu-title break-words font-bold leading-snug text-[#191c1b] ${titleClassName}`} data-cafe-a-menu-name="">{item.name}</h3>
          <Badge item={item} capabilities={capabilities} templateKey={templateKey} customBadgeStyles={customBadgeStyles} />
          {item.is_sold_out && <SoldOutBadge />}
        </div>
        {metaText && <p className={`menu-font-en cafe-a-menu-meta mb-0.5 break-words font-medium uppercase leading-snug text-[#5e5e5e] ${metaClassName}`}>{metaText}</p>}
        {item.description && (
          <p className={`cafe-a-menu-description break-keep font-normal text-[#3f4945] ${descriptionTextClassName} ${descriptionClassName}`}>{item.description}</p>
        )}
        {visibleTraits.length > 0 && (
          <div className="cafe-a-trait-list mt-2 flex flex-wrap gap-1.5">
            {visibleTraits.map((trait) => (
              <span key={trait.id} className="menu-chip cafe-a-menu-chip border border-[#bfc9c4] px-1.5 py-1 font-black text-[#3f4945]">
                {trait.label} {trait.value}/{trait.max_value}
              </span>
            ))}
          </div>
        )}
        {capabilities.originInfo && item.origin_info && <p className="cafe-a-menu-description cafe-a-menu-description-size-default mt-2 line-clamp-2 break-words font-semibold leading-relaxed text-[#707975]">원산지 {item.origin_info}</p>}
      </div>
      {priceTokens.length > 0 && (
        <div className="menu-price cafe-a-price-stack cafe-a-price-inline flex shrink-0 flex-wrap items-baseline justify-end text-right text-[#191c1b] lg:justify-self-end" data-cafe-a-menu-price="">
          {priceTokens.map((token, index) => (
            <span key={`${token.label}-${token.price}-${index}`} className="cafe-a-price-token inline-flex items-baseline whitespace-nowrap">
              {index > 0 && <span className="cafe-a-price-separator font-bold text-[#191c1b]/45">/</span>}
              <span className="cafe-a-price-pair inline-flex items-baseline whitespace-nowrap">
                {token.label && <span className="cafe-a-price-label whitespace-nowrap font-bold uppercase leading-none text-[#191c1b]">{token.label}</span>}
                <span className={`cafe-a-menu-price whitespace-nowrap font-bold leading-none ${priceClassName}`}>{token.price}</span>
              </span>
            </span>
          ))}
        </div>
      )}
    </article>
  );
}

function CoverHero({
  data,
  featuredItem,
  capabilities,
  customBadgeStyles,
  density,
  desktopClassName = "",
}: {
  data: PublicMenuTemplateProps;
  featuredItem: MenuItem | null;
  capabilities: TemplateCapabilities;
  customBadgeStyles: unknown;
  density: MenuLayoutDensity;
  desktopClassName?: string;
}) {
  const price = featuredItem ? getItemPriceDisplay(featuredItem, data.priceOptions, capabilities) : null;
  const coverImageUrl = data.menuSite.cover_image_url;
  const heroMinHeightClassName = {
    spacious: "min-h-[400px]",
    default: "min-h-[380px]",
    compact: "min-h-[340px]",
    ultraCompact: "min-h-[320px]",
  }[density];

  return (
    <section className={`cafe-a-cover-hero flex min-w-0 ${heroMinHeightClassName} flex-col bg-[#eceeec] md:col-span-2 lg:col-span-1 lg:row-span-2 lg:min-h-0 ${desktopClassName}`}>
      <div className={`cafe-a-cover-frame relative h-full ${heroMinHeightClassName} flex-1 overflow-hidden lg:min-h-0`}>
        {coverImageUrl ? (
          <img src={coverImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-[linear-gradient(135deg,#eef1ef_0%,#dfe6e2_42%,#f7f8f6_100%)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        {featuredItem && (
          <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-4 text-white">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap gap-2">
                <span className="menu-badge cafe-a-menu-badge inline-flex rounded-none bg-[#00342b] px-1.5 py-1 font-black uppercase leading-none text-white">대표 추천</span>
                <Badge
                  item={featuredItem}
                  capabilities={capabilities}
                  templateKey={data.menuSite.template_key}
                  customBadgeStyles={customBadgeStyles}
                />
              </div>
              <h2 className="break-words text-2xl font-bold leading-tight">{featuredItem.name}</h2>
              {featuredItem.description && <p className="mt-2 line-clamp-2 break-keep text-xs font-semibold leading-relaxed text-white/82">{featuredItem.description}</p>}
            </div>
            {price && <p className="menu-price shrink-0 whitespace-nowrap text-xl font-black leading-none">{price}</p>}
          </div>
        )}
      </div>
    </section>
  );
}

function HeaderBlock({ data, className = "" }: { data: PublicMenuTemplateProps; className?: string }) {
  const displayName = getDisplayName(data.menuSite);
  const title = displayName || "MenuLink";
  const description = data.menuSite.brand_description || data.menuSite.description;

  return (
    <header className={`w-full shrink-0 border-b border-[#191c1b] px-[clamp(24px,4vw,96px)] py-8 lg:px-[var(--board-padding)] lg:py-[var(--board-padding)] ${className}`}>
      <div className="flex min-w-0 items-start justify-between gap-[clamp(16px,2vw,32px)]">
        <div className="min-w-0 max-w-5xl">
          <h1 className="break-words text-5xl font-black uppercase leading-[1.02] text-[#191c1b] lg:text-[clamp(42px,5.2vh,52px)]">{title}</h1>
          {description && <p className="mt-2 break-keep text-[11px] font-normal leading-[1.5] text-[#3f4945]">{description}</p>}
        </div>
        <div className="menu-font-en group relative shrink-0 cursor-default text-right text-[#191c1b]">
          <MenuLanguageSwitcher currentLocale={data.locale} enabledLocales={data.enabledLocales} />
        </div>
      </div>
    </header>
  );
}

function DesktopFixedRail({
  data,
  children,
}: {
  data: PublicMenuTemplateProps;
  children: ReactNode;
}) {
  const displayName = getDisplayName(data.menuSite);
  const title = displayName || "MenuLink";
  const description = data.menuSite.brand_description || data.menuSite.description;

  return (
    <aside className="cafe-a-fixed-rail hidden min-w-0 lg:flex lg:flex-col">
      <div className="cafe-a-fixed-rail-copy min-w-0">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <h1 className="cafe-a-rail-title break-words font-black uppercase leading-[0.96] text-[#191c1b]">{title}</h1>
          <div className="menu-font-en shrink-0 text-right text-[#191c1b]">
            <MenuLanguageSwitcher currentLocale={data.locale} enabledLocales={data.enabledLocales} />
          </div>
        </div>
        {description && <p className="cafe-a-rail-description mt-3 break-keep font-normal leading-[1.55] text-[#3f4945]">{description}</p>}
      </div>
      {children}
    </aside>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="border border-dashed border-[#bfc9c4] bg-white p-8 text-sm font-bold leading-relaxed text-[#707975]">
      {children}
    </div>
  );
}

function MenuGroupsGrid({
  pageGroups,
  density,
  data,
  capabilities,
  customBadgeStyles,
  itemStackSpacing,
  outerGridGapClassName,
  menuAreaClassName,
  showPageTitles,
  fitRef,
}: {
  pageGroups: MenuPageGroup[];
  density: MenuLayoutDensity;
  data: PublicMenuTemplateProps;
  capabilities: TemplateCapabilities;
  customBadgeStyles: unknown;
  itemStackSpacing: string;
  outerGridGapClassName: string;
  menuAreaClassName: string;
  showPageTitles: boolean;
  fitRef?: RefObject<HTMLElement | null>;
}) {
  return (
    <section
      ref={fitRef}
      className={`cafe-a-fit-menu-grid cafe-a-ordered-menu-flow min-w-0 content-start md:col-span-2 lg:min-h-0 lg:max-h-full lg:overflow-hidden lg:pr-0 ${outerGridGapClassName} ${menuAreaClassName}`}
      data-cafe-a-fit-menu=""
      data-cafe-a-flow-mode="ordered"
    >
      {pageGroups.map((pageGroup) => (
        <div key={pageGroup.page.id} className="contents">
          {showPageTitles && !isDefaultPageTitle(pageGroup.page) && (
            <section className="md:col-span-2 lg:col-span-full">
              <h2 className="border-b border-[#191c1b] pb-2 text-sm font-black uppercase tracking-[0.18em] text-[#3f4945]">
                {pageGroup.page.title}
              </h2>
            </section>
          )}
          {pageGroup.groups.map(({ page, category, items }) => (
            <section key={`${page.id}-${category.id}`} className="cafe-a-menu-category-block min-w-0" data-cafe-a-category-block="">
              <CategoryTitle category={category} density={density} />
              <div className="cafe-a-category-items">
                {items.map((item) => (
                  <div key={item.id} className={`cafe-a-menu-item-stack break-inside-avoid ${itemStackSpacing}`} data-cafe-a-item-stack="">
                    <MenuItemRow
                      item={item}
                      priceOptions={data.priceOptions}
                      traits={getItemTraits(data.traits, item.id)}
                      capabilities={capabilities}
                      density={density}
                      templateKey={data.menuSite.template_key}
                      customBadgeStyles={customBadgeStyles}
                      locale={data.locale}
                    />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      ))}
    </section>
  );
}

function BalancedExperimentalMenuGrid({
  pageGroups,
  density,
  data,
  capabilities,
  customBadgeStyles,
  itemStackSpacing,
  outerGridGapClassName,
  menuAreaClassName,
  columns,
  variant,
  fitRef,
}: {
  pageGroups: MenuPageGroup[];
  density: MenuLayoutDensity;
  data: PublicMenuTemplateProps;
  capabilities: TemplateCapabilities;
  customBadgeStyles: unknown;
  itemStackSpacing: string;
  outerGridGapClassName: string;
  menuAreaClassName: string;
  columns: number;
  variant: CafeDesignABalancedVariant;
  fitRef?: RefObject<HTMLElement | null>;
}) {
  const groupOrderByKey = useMemo(
    () => new Map(getFlatMenuGroups(pageGroups).map((group, index) => [getMenuGroupKey(group), index])),
    [pageGroups],
  );
  const balancedColumns = useMemo(
    () => getBalancedMenuColumns({ pageGroups, columns, data, capabilities, variant }),
    [capabilities, columns, data, pageGroups, variant]
  );

  return (
    <section
      ref={fitRef}
      className={`cafe-a-fit-menu-grid cafe-a-balanced-menu-grid cafe-a-balanced-experimental-grid min-w-0 content-start md:col-span-2 lg:min-h-0 lg:max-h-full lg:overflow-hidden lg:pr-0 ${outerGridGapClassName} ${menuAreaClassName}`}
      data-cafe-a-fit-menu=""
      data-cafe-a-flow-mode="balanced"
      data-cafe-a-balanced-grid=""
    >
      {balancedColumns.map((column) => (
        <div key={column.id} className="cafe-a-balanced-column min-w-0" data-cafe-a-balanced-column="">
          {column.groups.map(({ page, category, items }) => {
            const groupKey = `${page.id}:${category.id}`;

            return (
            <section
              key={`${page.id}-${category.id}`}
              className="cafe-a-menu-category-block min-w-0"
              data-cafe-a-category-block=""
              data-cafe-a-balanced-category-block={groupKey}
              data-cafe-a-balanced-source-order={groupOrderByKey.get(groupKey) ?? 0}
              data-balanced-estimated-height={estimateMenuGroupHeight({ page, category, items }, data, capabilities).toFixed(2)}
            >
              <CategoryTitle category={category} density={density} />
              <div className="cafe-a-category-items">
                {items.map((item) => (
                  <div key={item.id} className={`cafe-a-menu-item-stack break-inside-avoid ${itemStackSpacing}`} data-cafe-a-item-stack="">
                    <MenuItemRow
                      item={item}
                      priceOptions={data.priceOptions}
                      traits={getItemTraits(data.traits, item.id)}
                      capabilities={capabilities}
                      density={density}
                      templateKey={data.menuSite.template_key}
                      customBadgeStyles={customBadgeStyles}
                      locale={data.locale}
                    />
                  </div>
                ))}
              </div>
            </section>
            );
          })}
        </div>
      ))}
    </section>
  );
}

export default function CafeDesignA(data: PublicMenuTemplateProps) {
  const capabilities = getTemplateCapabilities(data.menuSite.template_key);
  const publicCapabilities = getMenuPublicCapabilities(data.publicServiceType);
  const customTypography = getCustomTypographySettings(data.menuSite.settings, data.menuSite.page_settings);
  const typographySettings = mergeTypographySettings(data.menuSite.template_key, customTypography);
  const koreanFontAssets = getKoreanFontLoadAssets(typographySettings.korean_font_key);
  const englishFontAssets = getEnglishFontLoadAssets(typographySettings.english_font_key);
  const customBadgeStyles = getCustomBadgeStyles(data.menuSite.settings, data.menuSite.page_settings);
  const backgroundColor = getResolvedBackgroundColor(data.menuSite.template_key, data.menuSite.page_settings);
  const featuredItem = getFeaturedItem(data, capabilities);
  const savedLayoutMode = getPcTabletLayoutModeFromPageSettings(data.menuSite.page_settings);
  const layoutMode: CafeDesignALayoutMode =
    data.mode === "preview" && data.previewLayoutMode === "balancedExperimental" ? "balanced" : savedLayoutMode;
  const visiblePageGroups = publicCapabilities.menuPages ? getVisibleMenuPageGroups(data) : [];
  const visibleMenuGroupCount = visiblePageGroups.reduce((count, pageGroup) => count + pageGroup.groups.length, 0);
  const desktopFitBoardRef = useRef<HTMLDivElement | null>(null);
  const desktopFitMenuRef = useRef<HTMLElement | null>(null);
  const [fitState, setFitState] = useState<CafeDesignAFitState>(DEFAULT_FIT_STATE);
  const visibleItemCount = data.items.filter((item) => item.visible !== false).length;
  const layoutRules = getTemplateLayoutRules(data.menuSite.template_key, data.menuSite.template_category);
  const density = getMenuLayoutDensity(visibleItemCount, layoutRules, "desktop");
  const hasCoverSection =
    publicCapabilities.menuCoverPage &&
    capabilities.menuCover.coverMode === "section" &&
    data.pageSettings.menu_cover_enabled !== false;
  const shouldRenderMenuCoverSection =
    hasCoverSection;
  const menuAreaClassName = getMenuAreaClassName(hasCoverSection);
  const desktopGridClassName = getDesktopGridClassName(hasCoverSection);
  const outerGridGapClassName = getOuterGridGapClassName(density);
  const itemStackSpacing = getItemStackSpacing(density);
  const typographyStyle = getTypographyCssVariables(typographySettings);
  const fitStyle = useMemo(() => getFitStyle(fitState), [fitState]);
  const fitGapStyle = useMemo(() => getFitGapStyle(density), [density]);

  useEffect(() => {
    const boardElement = desktopFitBoardRef.current;
    const menuElement = desktopFitMenuRef.current;
    if (!boardElement || !menuElement) return;
    const fitBoardElement = boardElement;
    const fitMenuElement = menuElement;

    let frameId = 0;
    let cancelled = false;

    function updateFitState(nextState: CafeDesignAFitState) {
      setFitState((currentState) => (areFitStatesEqual(currentState, nextState) ? currentState : nextState));
    }

    function applyFitCandidate(columns: number, fontScale: number) {
      fitBoardElement.style.setProperty("--fit-columns", String(columns));
      fitBoardElement.style.setProperty("--fit-font-scale", String(fontScale));
      fitBoardElement.style.setProperty(
        "--fit-gap-scale",
        String(layoutMode === "orderedFit" ? getOrderedFitGapScale(fontScale, fitMenuElement.clientWidth) : getBalancedFitGapScale(fontScale, fitMenuElement.clientWidth))
      );
    }

    function getFitStateFromMeasurement(
      columns: number,
      fontScale: number,
      status: CafeDesignAFitState["status"],
      measurement: CafeDesignAFitMeasurement,
      balancedVariant: CafeDesignABalancedVariant = DEFAULT_BALANCED_VARIANT,
    ): CafeDesignAFitState {
      return {
        columns,
        fontScale,
        gapScale: layoutMode === "orderedFit" ? getOrderedFitGapScale(fontScale, fitMenuElement.clientWidth) : getBalancedFitGapScale(fontScale, fitMenuElement.clientWidth),
        balancedVariant,
        status,
        measuredColumns: measurement.measuredColumns,
        boardInnerHeight: measurement.boardInnerHeight,
        flowHeight: measurement.flowHeight,
        primaryColumnBottom: measurement.primaryColumnBottom,
        primaryBottomGap: measurement.primaryBottomGap,
        longestColumnBottom: measurement.longestColumnBottom,
        primaryFillRatio: measurement.primaryFillRatio,
        averageFillRatio: measurement.averageFillRatio,
        minFillRatio: measurement.minFillRatio,
        lastColumnFillRatio: measurement.lastColumnFillRatio,
        bottomGap: measurement.bottomGap,
        contentGap: measurement.contentGap,
        itemBoxGap: measurement.itemBoxGap,
        textVisualGap: measurement.textVisualGap,
        categoryBlockGap: measurement.categoryBlockGap,
        visibleItemBottomGap: measurement.visibleItemBottomGap,
        visibleTextBottomGap: measurement.visibleTextBottomGap,
        visiblePriceBottomGap: measurement.visiblePriceBottomGap,
        visibleContentBottomGap: measurement.visibleContentBottomGap,
        visibleAverageFillRatio: measurement.visibleAverageFillRatio,
        visibleMinFillRatio: measurement.visibleMinFillRatio,
        visibleLastColumnFillRatio: measurement.visibleLastColumnFillRatio,
        overflow: measurement.overflow,
      };
    }

    function getOrderedFitScore(columns: number, fontScale: number, measurement: CafeDesignAFitMeasurement) {
      if (measurement.measuredColumns === 0) return Number.POSITIVE_INFINITY;

      const primaryBottomGap = measurement.primaryBottomGap;
      const targetGapPenalty =
        primaryBottomGap < ORDERED_FIT_TARGET_MIN_GAP
          ? (ORDERED_FIT_TARGET_MIN_GAP - primaryBottomGap) * 20
          : primaryBottomGap > ORDERED_FIT_TARGET_MAX_GAP
            ? (Math.min(primaryBottomGap, ORDERED_FIT_ACCEPTABLE_MAX_GAP) - ORDERED_FIT_TARGET_MAX_GAP) * 3
            : 0;
      const acceptableGapPenalty = Math.max(0, primaryBottomGap - ORDERED_FIT_ACCEPTABLE_MAX_GAP) * 3.5;
      const visibleGapPenalty = Math.max(0, primaryBottomGap - 10) * 3;
      const looseGapPenalty = Math.max(0, primaryBottomGap - ORDERED_FIT_LOOSE_GAP) * 18;
      const tightGapPenalty = Math.max(0, ORDERED_FIT_MIN_SAFETY_GAP - primaryBottomGap) * 90;
      const primaryFillPenalty = Math.max(0, 0.982 - measurement.primaryFillRatio) * 22;
      const averageFillPenalty = Math.max(0, 0.88 - measurement.averageFillRatio) * 130;
      const lastColumnPenalty = Math.max(0, 0.82 - measurement.lastColumnFillRatio) * 520;
      const shortLastColumnPenalty = Math.max(0, 0.68 - measurement.lastColumnFillRatio) * 420;
      const veryShortLastColumnPenalty = Math.max(0, 0.36 - measurement.lastColumnFillRatio) * 720;
      const minColumnPenalty = Math.max(0, 0.5 - measurement.minFillRatio) * 160;
      const missingColumnPenalty = Math.max(0, columns - measurement.measuredColumns) * 260;
      const excessiveColumnPenalty = Math.max(0, columns - 3) * 12 + columns * 1.4;
      const smallTextPenalty = Math.max(0, 0.95 - fontScale) * 110;
      const qualityTextPenalty = Math.max(0, 1.04 - fontScale) * 95;
      const readableTextPenalty = Math.max(0, 0.8 - fontScale) * 600;
      const tinyTextPenalty = Math.max(0, 0.75 - fontScale) * 2400;
      const veryLargeTextPenalty = Math.max(0, fontScale - 1.2) * 14;

      return (
        targetGapPenalty +
        acceptableGapPenalty +
        visibleGapPenalty +
        looseGapPenalty +
        tightGapPenalty +
        primaryFillPenalty +
        averageFillPenalty +
        lastColumnPenalty +
        shortLastColumnPenalty +
        veryShortLastColumnPenalty +
        minColumnPenalty +
        missingColumnPenalty +
        excessiveColumnPenalty +
        smallTextPenalty +
        qualityTextPenalty +
        readableTextPenalty +
        tinyTextPenalty +
        veryLargeTextPenalty
      );
    }

    function getOrderedFallbackScore(columns: number, fontScale: number, measurement: CafeDesignAFitMeasurement) {
      const overflowPenalty = measurement.overflow ? 1000 + Math.abs(Math.min(0, measurement.primaryBottomGap)) * 80 : 0;
      const bottomGapPenalty = Math.max(0, measurement.primaryBottomGap - ORDERED_FIT_TARGET_GAP) * 4;
      const missingColumnPenalty = Math.max(0, columns - measurement.measuredColumns) * 24;
      const tinyTextPenalty = Math.max(0, 0.75 - fontScale) * 80;

      return overflowPenalty + bottomGapPenalty + missingColumnPenalty + tinyTextPenalty;
    }

    function getOrderedFitState(columnCandidates: number[]) {
      let selectedState: CafeDesignAFitState | null = null;
      let selectedScore = Number.POSITIVE_INFINITY;
      let fallbackState: CafeDesignAFitState | null = null;
      let fallbackScore = Number.POSITIVE_INFINITY;

      for (const columns of columnCandidates) {
        for (const fontScale of ORDERED_FIT_FONT_SCALE_CANDIDATES) {
          applyFitCandidate(columns, fontScale);
          const measurement = measureCafeAOrderedFit(fitBoardElement, fitMenuElement, columns);
          const candidateState = getFitStateFromMeasurement(
            columns,
            fontScale,
            fontScale <= FIT_WARNING_FONT_SCALE ? "warning" : "fit",
            measurement,
          );
          const nextFallbackScore = getOrderedFallbackScore(columns, fontScale, measurement);

          if (nextFallbackScore < fallbackScore) {
            fallbackScore = nextFallbackScore;
            fallbackState = {
              ...candidateState,
              status: measurement.overflow || fontScale <= FIT_WARNING_FONT_SCALE ? "warning" : "fit",
            };
          }

          if (measurement.overflow || measurement.primaryBottomGap < ORDERED_FIT_MIN_SAFETY_GAP) continue;

          const score = getOrderedFitScore(columns, fontScale, measurement);
          if (score < selectedScore) {
            selectedScore = score;
            selectedState = candidateState;
          }
        }
      }

      return selectedState ?? fallbackState;
    }

    function getBalancedFitScore(
      columns: number,
      fontScale: number,
      variant: CafeDesignABalancedVariant,
      measurement: CafeDesignAFitMeasurement,
      blockCount: number,
    ) {
      if (measurement.measuredColumns === 0) return Number.POSITIVE_INFINITY;

      const longestBottomGap = measurement.visibleContentBottomGap;
      const visibleItemBottomGap = measurement.visibleItemBottomGap;
      const visibleTextBottomGap = measurement.visibleTextBottomGap;
      const categoryBlockGap = measurement.categoryBlockGap;
      const tightGapPenalty = longestBottomGap < BALANCED_TARGET_MIN_GAP ? (BALANCED_TARGET_MIN_GAP - longestBottomGap) * 220 : 0;
      const targetGapPenalty =
        visibleItemBottomGap > 8
          ? Math.min(visibleItemBottomGap - 8, 180) * 42
          : 0;
      const visibleGapPenalty = Math.max(0, visibleItemBottomGap - BALANCED_VISIBLE_GAP) * 96;
      const textGapPenalty = Math.max(0, visibleTextBottomGap - 12) * 34;
      const failedCandidatePenalty = Math.max(0, visibleItemBottomGap - BALANCED_FAILED_GAP) * 150 + Math.max(0, visibleTextBottomGap - 25) * 180;
      const wrapperOnlyPenalty = categoryBlockGap <= BALANCED_TARGET_MAX_GAP && visibleItemBottomGap >= 20 ? 900 + (visibleItemBottomGap - 20) * 90 : 0;
      const looseGapPenalty = Math.max(0, visibleItemBottomGap - 24) * 44;
      const failedGapPenalty = Math.max(0, visibleItemBottomGap - 50) * 60;
      const longestFillRatio = measurement.flowHeight > 0 ? measurement.longestColumnBottom / measurement.flowHeight : 0;
      const longestFillPenalty = Math.max(0, 0.97 - longestFillRatio) * 900;
      const averageFillPenalty = Math.max(0, 0.84 - measurement.visibleAverageFillRatio) * 900;
      const minFillPenalty = Math.max(0, 0.76 - measurement.visibleMinFillRatio) * 1800;
      const verySparseColumnPenalty = Math.max(0, 0.58 - measurement.visibleMinFillRatio) * 3200;
      const lastColumnPenalty = Math.max(0, 0.8 - measurement.visibleLastColumnFillRatio) * 720;
      const veryShortLastColumnPenalty = Math.max(0, 0.72 - measurement.visibleLastColumnFillRatio) * 1200;
      const emptyColumnPenalty = Math.max(0, columns - measurement.measuredColumns) * 360;
      const sparseColumnPenalty = Math.max(0, 2 - blockCount / columns) * 95;
      const excessiveColumnPenalty = Math.max(0, columns - 3) * 34 + columns * 1.2;
      const tinyTextPenalty = Math.max(0, BALANCED_MIN_QUALITY_FONT_SCALE - fontScale) * 1800;
      const readableTextPenalty = Math.max(0, 0.88 - fontScale) * 460;
      const qualityTextPenalty = Math.max(0, 0.98 - fontScale) * 95;
      const veryLargeTextPenalty = Math.max(0, fontScale - 1.24) * 22;
      const sourceOrderPenalty = variant === "sourceRoundRobin" ? 10 : variant === "sourceSequential" ? 5 : 0;

      return (
        tightGapPenalty +
        targetGapPenalty +
        visibleGapPenalty +
        textGapPenalty +
        failedCandidatePenalty +
        wrapperOnlyPenalty +
        looseGapPenalty +
        failedGapPenalty +
        longestFillPenalty +
        averageFillPenalty +
        minFillPenalty +
        verySparseColumnPenalty +
        lastColumnPenalty +
        veryShortLastColumnPenalty +
        emptyColumnPenalty +
        sparseColumnPenalty +
        excessiveColumnPenalty +
        tinyTextPenalty +
        readableTextPenalty +
        qualityTextPenalty +
        veryLargeTextPenalty +
        sourceOrderPenalty
      );
    }

    function getBalancedFallbackScore(columns: number, fontScale: number, measurement: CafeDesignAFitMeasurement, blockCount: number) {
      const overflowPenalty = measurement.overflow ? 1800 + Math.abs(Math.min(0, measurement.visibleContentBottomGap)) * 120 : 0;
      const visibleGapPenalty = Math.max(0, measurement.visibleItemBottomGap - 12) * 60;
      const readableTextPenalty = Math.max(0, BALANCED_MIN_QUALITY_FONT_SCALE - fontScale) * 520;
      const lastColumnPenalty = Math.max(0, 0.72 - measurement.visibleLastColumnFillRatio) * 180;
      const sparseColumnPenalty = Math.max(0, 2 - blockCount / columns) * 60;

      return overflowPenalty + visibleGapPenalty + readableTextPenalty + lastColumnPenalty + sparseColumnPenalty + columns * 1.5;
    }

    function getBalancedFitState(columnCandidates: number[]) {
      let selectedState: CafeDesignAFitState | null = null;
      let selectedScore = Number.POSITIVE_INFINITY;
      let fallbackState: CafeDesignAFitState | null = null;
      let fallbackScore = Number.POSITIVE_INFINITY;

      for (const columns of columnCandidates) {
        for (const fontScale of FIT_FONT_SCALE_CANDIDATES) {
          applyFitCandidate(columns, fontScale);
          const blockMeasurements = getBalancedBlockMeasurements(fitMenuElement);
          if (blockMeasurements.length === 0) continue;
          const fitsWidth = fitMenuElement.scrollWidth <= fitMenuElement.clientWidth + 1;

          for (const variant of BALANCED_LAYOUT_VARIANTS) {
            const simulatedColumns = createBalancedSimulatedColumns(blockMeasurements, columns, variant);
            const measurement = getBalancedMeasurementFromColumns({
              boardElement: fitBoardElement,
              menuElement: fitMenuElement,
              columns: simulatedColumns,
              expectedColumns: columns,
              includeDomOverflow: false,
            });
            const candidateState = getFitStateFromMeasurement(
              columns,
              fontScale,
              measurement.overflow || fontScale < BALANCED_MIN_QUALITY_FONT_SCALE ? "warning" : "fit",
              measurement,
              variant,
            );
            const nextFallbackScore = getBalancedFallbackScore(columns, fontScale, measurement, blockMeasurements.length);

            if (fitsWidth && nextFallbackScore < fallbackScore) {
              fallbackScore = nextFallbackScore;
              fallbackState = candidateState;
            }

            if (!fitsWidth || measurement.overflow || fontScale < BALANCED_MIN_QUALITY_FONT_SCALE) continue;
            if (measurement.visibleAverageFillRatio < 0.78 || measurement.visibleMinFillRatio < 0.7) continue;

            const score = getBalancedFitScore(columns, fontScale, variant, measurement, blockMeasurements.length);
            if (score < selectedScore) {
              selectedScore = score;
              selectedState = candidateState;
            }
          }
        }
      }

      return selectedState ?? fallbackState;
    }

    function measureFit() {
      if (cancelled) return;
      const isDesktopFitActive = window.matchMedia("(min-width: 1024px)").matches;
      if (!isDesktopFitActive) {
        updateFitState(DEFAULT_FIT_STATE);
        return;
      }

      const menuWidth = fitMenuElement.clientWidth;
      if (menuWidth <= 0 || fitMenuElement.clientHeight <= 0) return;

      const previousColumns = fitBoardElement.style.getPropertyValue("--fit-columns");
      const previousFontScale = fitBoardElement.style.getPropertyValue("--fit-font-scale");
      const previousGapScale = fitBoardElement.style.getPropertyValue("--fit-gap-scale");
      const columnCandidates =
        layoutMode === "orderedFit"
          ? getOrderedFitColumnCandidates(menuWidth)
          : getBalancedFitColumnCandidates(menuWidth, visibleMenuGroupCount);
      let selectedState: CafeDesignAFitState | null = null;

      if (layoutMode === "orderedFit") {
        selectedState = getOrderedFitState(columnCandidates);
      } else {
        selectedState = getBalancedFitState(columnCandidates);
      }

      if (!selectedState) {
        const fallbackFontScale =
          layoutMode === "orderedFit"
            ? ORDERED_FIT_FONT_SCALE_CANDIDATES[ORDERED_FIT_FONT_SCALE_CANDIDATES.length - 1] ?? 0.64
            : FIT_FONT_SCALE_CANDIDATES[FIT_FONT_SCALE_CANDIDATES.length - 1] ?? 0.64;
        const fallbackColumns = columnCandidates[0] ?? DEFAULT_FIT_STATE.columns;
        applyFitCandidate(fallbackColumns, fallbackFontScale);
        selectedState = getFitStateFromMeasurement(
          fallbackColumns,
          fallbackFontScale,
          "warning",
          layoutMode === "orderedFit"
            ? measureCafeAOrderedFit(fitBoardElement, fitMenuElement, fallbackColumns)
            : measureCafeABalancedFit(fitBoardElement, fitMenuElement, fallbackColumns),
        );
      }

      if (previousColumns) {
        fitBoardElement.style.setProperty("--fit-columns", previousColumns);
      } else {
        fitBoardElement.style.removeProperty("--fit-columns");
      }
      if (previousFontScale) {
        fitBoardElement.style.setProperty("--fit-font-scale", previousFontScale);
      } else {
        fitBoardElement.style.removeProperty("--fit-font-scale");
      }
      if (previousGapScale) {
        fitBoardElement.style.setProperty("--fit-gap-scale", previousGapScale);
      } else {
        fitBoardElement.style.removeProperty("--fit-gap-scale");
      }

      updateFitState(selectedState);
    }

    function scheduleMeasure() {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(measureFit);
    }

    const resizeObserver = new ResizeObserver(scheduleMeasure);
    resizeObserver.observe(fitBoardElement);
    resizeObserver.observe(fitMenuElement);
    scheduleMeasure();

    if ("fonts" in document) {
      void document.fonts.ready.then(scheduleMeasure);
    }

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
    };
  }, [
    density,
    fitState.balancedVariant,
    fitState.columns,
    fitState.fontScale,
    fitState.gapScale,
    hasCoverSection,
    layoutMode,
    visibleItemCount,
    visibleMenuGroupCount,
    visiblePageGroups.length,
  ]);

  useEffect(() => {
    if (layoutMode !== "balanced") return;
    const boardElement = desktopFitBoardRef.current;
    const menuElement = desktopFitMenuRef.current;
    if (!boardElement || !menuElement) return;

    let cancelled = false;
    const frameId = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (cancelled) return;
        const measurement = measureCafeABalancedFit(boardElement, menuElement, fitState.columns);
        const nextState: CafeDesignAFitState = {
          ...fitState,
          status: measurement.overflow ? "warning" : fitState.status === "idle" ? "fit" : fitState.status,
          measuredColumns: measurement.measuredColumns,
          boardInnerHeight: measurement.boardInnerHeight,
          flowHeight: measurement.flowHeight,
          primaryColumnBottom: measurement.primaryColumnBottom,
          primaryBottomGap: measurement.primaryBottomGap,
          longestColumnBottom: measurement.longestColumnBottom,
          primaryFillRatio: measurement.primaryFillRatio,
          averageFillRatio: measurement.averageFillRatio,
          minFillRatio: measurement.minFillRatio,
          lastColumnFillRatio: measurement.lastColumnFillRatio,
          bottomGap: measurement.bottomGap,
          contentGap: measurement.contentGap,
          itemBoxGap: measurement.itemBoxGap,
          textVisualGap: measurement.textVisualGap,
          categoryBlockGap: measurement.categoryBlockGap,
          visibleItemBottomGap: measurement.visibleItemBottomGap,
          visibleTextBottomGap: measurement.visibleTextBottomGap,
          visiblePriceBottomGap: measurement.visiblePriceBottomGap,
          visibleContentBottomGap: measurement.visibleContentBottomGap,
          visibleAverageFillRatio: measurement.visibleAverageFillRatio,
          visibleMinFillRatio: measurement.visibleMinFillRatio,
          visibleLastColumnFillRatio: measurement.visibleLastColumnFillRatio,
          overflow: measurement.overflow,
        };

        setFitState((currentState) => (areFitStatesEqual(currentState, nextState) ? currentState : nextState));
      });
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frameId);
    };
  }, [fitState, layoutMode]);

  return (
    <>
      <KoreanFontAssets assets={[koreanFontAssets, englishFontAssets]} />
      <main
        className="menu-typography cafe-a-typography group/cafe-board relative min-h-screen w-full max-w-full min-w-0 text-[#191c1b] lg:h-screen lg:overflow-y-hidden"
        style={{ ...typographyStyle, backgroundColor }}
      >
        <div className="flex min-h-screen w-full max-w-none min-w-0 flex-col lg:h-full lg:min-h-0 lg:overflow-y-hidden">
          <HeaderBlock data={data} className="lg:hidden" />
          <div className={`grid min-w-0 px-[clamp(24px,4vw,96px)] py-8 pb-16 md:grid-cols-2 lg:hidden ${outerGridGapClassName}`}>
            {shouldRenderMenuCoverSection && (
              <CoverHero data={data} featuredItem={featuredItem} capabilities={capabilities} customBadgeStyles={customBadgeStyles} density={density} />
            )}

            {visiblePageGroups.length === 0 ? (
              <section className={hasCoverSection ? "lg:col-span-3" : "lg:col-span-4"}>
                <EmptyState>표시할 메뉴 페이지, 카테고리 또는 아이템이 없습니다.</EmptyState>
              </section>
            ) : (
              <MenuGroupsGrid
                pageGroups={visiblePageGroups}
                density={density}
                data={data}
                capabilities={capabilities}
                customBadgeStyles={customBadgeStyles}
                itemStackSpacing={itemStackSpacing}
                outerGridGapClassName={outerGridGapClassName}
                menuAreaClassName={menuAreaClassName}
                showPageTitles
              />
            )}
          </div>

          <div
            ref={desktopFitBoardRef}
            className={`cafe-a-desktop-fit-board hidden min-w-0 lg:grid lg:min-h-0 lg:flex-1 lg:overflow-y-hidden lg:p-[var(--board-padding)] ${desktopGridClassName}`}
            data-fit-status={fitState.status}
            data-layout-mode={layoutMode}
            data-fit-columns={fitState.columns}
            data-fit-font-scale={fitState.fontScale}
            data-fit-gap-scale={fitState.gapScale}
            data-fit-balanced-variant={fitState.balancedVariant}
            data-fit-measured-columns={fitState.measuredColumns}
            data-fit-board-inner-height={fitState.boardInnerHeight}
            data-fit-flow-height={fitState.flowHeight}
            data-fit-primary-column-bottom={fitState.primaryColumnBottom}
            data-fit-primary-bottom-gap={fitState.primaryBottomGap}
            data-fit-longest-column-bottom={fitState.longestColumnBottom}
            data-fit-primary-fill-ratio={fitState.primaryFillRatio}
            data-fit-average-fill-ratio={fitState.averageFillRatio}
            data-fit-min-fill-ratio={fitState.minFillRatio}
            data-fit-last-column-fill-ratio={fitState.lastColumnFillRatio}
            data-fit-bottom-gap={fitState.bottomGap}
            data-fit-content-gap={fitState.contentGap}
            data-fit-item-box-gap={fitState.itemBoxGap}
            data-fit-text-visual-gap={fitState.textVisualGap}
            data-fit-category-block-gap={fitState.categoryBlockGap}
            data-fit-visible-item-bottom-gap={fitState.visibleItemBottomGap}
            data-fit-visible-text-bottom-gap={fitState.visibleTextBottomGap}
            data-fit-visible-price-bottom-gap={fitState.visiblePriceBottomGap}
            data-fit-visible-content-bottom-gap={fitState.visibleContentBottomGap}
            data-fit-visible-average-fill-ratio={fitState.visibleAverageFillRatio}
            data-fit-visible-min-fill-ratio={fitState.visibleMinFillRatio}
            data-fit-visible-last-column-fill-ratio={fitState.visibleLastColumnFillRatio}
            data-fit-overflow={fitState.overflow ? "true" : "false"}
            style={{ ...fitGapStyle, ...fitStyle }}
          >
            <DesktopFixedRail data={data}>
              {shouldRenderMenuCoverSection && (
                <CoverHero
                  data={data}
                  featuredItem={featuredItem}
                  capabilities={capabilities}
                  customBadgeStyles={customBadgeStyles}
                  density={density}
                />
              )}
            </DesktopFixedRail>

            {visiblePageGroups.length === 0 ? (
              <section className={hasCoverSection ? "lg:col-span-3" : "lg:col-span-4"}>
                <EmptyState>표시할 메뉴 페이지, 카테고리 또는 아이템이 없습니다.</EmptyState>
              </section>
            ) : layoutMode === "balanced" ? (
              <BalancedExperimentalMenuGrid
                fitRef={desktopFitMenuRef}
                pageGroups={visiblePageGroups}
                density={density}
                data={data}
                capabilities={capabilities}
                customBadgeStyles={customBadgeStyles}
                itemStackSpacing={itemStackSpacing}
                outerGridGapClassName={outerGridGapClassName}
                menuAreaClassName={menuAreaClassName}
                columns={fitState.columns}
                variant={fitState.balancedVariant}
              />
            ) : (
              <MenuGroupsGrid
                fitRef={desktopFitMenuRef}
                pageGroups={visiblePageGroups}
                density={density}
                data={data}
                capabilities={capabilities}
                customBadgeStyles={customBadgeStyles}
                itemStackSpacing={itemStackSpacing}
                outerGridGapClassName={outerGridGapClassName}
                menuAreaClassName={menuAreaClassName}
                showPageTitles
              />
            )}
          </div>
        </div>
      </main>
    </>
  );
}
