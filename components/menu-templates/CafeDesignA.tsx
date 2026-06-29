/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";

import KoreanFontAssets from "@/components/menu-templates/shared/KoreanFontAssets";
import MenuLanguageSwitcher from "@/components/menu-templates/shared/MenuLanguageSwitcher";
import type { PublicMenuTemplateProps } from "@/components/menu-templates/types";
import { BASIC_RIGHT_EDGE_SAFETY_GAP_PX } from "@/lib/basic-template-constants";
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
import {
  getCustomTypographySettings,
  getEnglishFontLoadAssets,
  getKoreanFontLoadAssets,
  getTypographyCssVariables,
  mergeTypographySettings,
} from "@/lib/template-typography-presets";
import { formatMenuPrice, shouldShowMenuItemTraits } from "@/types/menu";

// -----------------------------------------------------------------------------
// Basic engine candidate: data contracts, grouping, and fit/fill measurement types
// -----------------------------------------------------------------------------

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
type CafeDesignALayoutMode = "orderedFit" | "balanced" | "orderedBalancedFit";
type CafeDesignABalancedVariant = "estimatedGreedy" | "sourceSequential" | "sourceRoundRobin" | "lastAwareGreedy" | "visibleExhaustive";
type CafeDesignAFitState = {
  columns: number;
  fontScale: number;
  gapScale: number;
  balancedVariant: CafeDesignABalancedVariant;
  orderedBalancedBreaks: string;
  orderedBalancedFingerprint: string;
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
  boardInnerRight: number;
  rightmostMenuNameRight: number;
  rightmostSecondaryRight: number;
  rightmostPriceRight: number;
  rightmostChipRight: number;
  rightmostCategoryRight: number;
  rightSafetyGap: number;
  overflow: boolean;
};
type CafeDesignAFinalFillBoost = {
  fontScale: number;
  gapScale: number;
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
  boardInnerRight: number;
  rightmostMenuNameRight: number;
  rightmostSecondaryRight: number;
  rightmostPriceRight: number;
  rightmostChipRight: number;
  rightmostCategoryRight: number;
  rightSafetyGap: number;
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

// -----------------------------------------------------------------------------
// Basic engine candidate: fit/fill candidate constants and safety thresholds
// -----------------------------------------------------------------------------

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
  0.834,
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
  0.62,
  0.6,
  0.58,
  0.56,
  0.54,
  0.5,
  0.48,
  0.46,
] as const;
const ORDERED_BALANCED_FIT_FONT_SCALE_CANDIDATES = [
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
  1.1,
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
  0.815,
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
  0.7,
  0.68,
  0.67,
  0.66,
  0.64,
] as const;
const BALANCED_LAYOUT_VARIANTS = ["estimatedGreedy", "sourceSequential", "sourceRoundRobin", "lastAwareGreedy", "visibleExhaustive"] as const satisfies readonly CafeDesignABalancedVariant[];
const BALANCED_MIN_SAFETY_GAP = 1;
const BALANCED_TARGET_MIN_GAP = 2;
const BALANCED_TARGET_MAX_GAP = 4;
const BALANCED_VISIBLE_GAP = 8;
const BALANCED_FAILED_GAP = 10;
const BALANCED_MIN_QUALITY_FONT_SCALE = 0.78;
const ORDERED_BALANCED_MIN_QUALITY_FONT_SCALE = 0.75;
const ORDERED_BALANCED_MAX_EXHAUSTIVE_BLOCKS = 12;
const ORDERED_BALANCED_MAX_EXHAUSTIVE_COLUMNS = 4;
const ORDERED_BALANCED_DEFAULT_MAX_COLUMNS = 3;
const ORDERED_BALANCED_GAP_IMPROVEMENT_EPSILON = 2;
const ORDERED_BALANCED_SCALE_EPSILON = 0.005;
const ORDERED_BALANCED_CROP_TOLERANCE = 0.5;
const ORDERED_BALANCED_STABLE_MIN_BOTTOM_GAP = 1.5;
const ORDERED_BALANCED_TARGET_MIN_VISIBLE_GAP = 2;
const ORDERED_BALANCED_TARGET_VISIBLE_GAP = 4;
const ORDERED_BALANCED_TARGET_MAX_VISIBLE_GAP = 6;
const ORDERED_BALANCED_ORPHAN_SAFETY_GAP = 2;
const ORDERED_BALANCED_SIMULATION_CROP_BUFFER = 1;
const ORDERED_BALANCED_ZOOM_SIMULATION_CROP_BUFFER = 28;
const ORDERED_BALANCED_SETTLED_SWITCH_GAP = 6;
const ORDERED_BALANCED_SETTLED_SCALE_DELTA = 0.12;
const ORDERED_BALANCED_SCORE_HYSTERESIS = 4;
const ORDERED_BALANCED_VIEWPORT_BUCKET = 24;
const ORDERED_BALANCED_SIZE_BUCKET = 8;
const ORDERED_BALANCED_DENSE_CATEGORY_THRESHOLD = 5;
const ORDERED_BALANCED_DENSE_ITEM_THRESHOLD = 20;
const ORDERED_BALANCED_FINAL_FILL_BOOST_TRIGGER_GAP = 12;
const ORDERED_BALANCED_FINAL_FILL_BOOST_MIN_GAP = 2;
const ORDERED_BALANCED_FINAL_FILL_BOOST_LEVELS = [
  { fontScale: 1.015, gapScale: 1.01 },
  { fontScale: 1.025, gapScale: 1.018 },
  { fontScale: 1.04, gapScale: 1.03 },
] as const satisfies readonly CafeDesignAFinalFillBoost[];
const DEFAULT_ORDERED_BALANCED_FINAL_FILL_BOOST: CafeDesignAFinalFillBoost = { fontScale: 1, gapScale: 1 };
const ORDERED_FIT_BASE_MENU_VISUAL_SCALE = 0.95;
const DEFAULT_ORDERED_FIT_FINAL_FILL_COMPENSATION = 1;
const ORDERED_FIT_FINAL_FILL_COMPENSATION_LEVELS = [1.015, 1.025, 1.035, 1.045, 1.055, 1.06] as const;
const ORDERED_FIT_FINAL_FILL_TRIGGER_GAP = 12;
const ORDERED_FIT_FINAL_FILL_TARGET_GAP = 8;
const ORDERED_FIT_FINAL_FILL_MIN_GAP = 2;
const ORDERED_FIT_FONT_SCALE_CANDIDATES = [1.24, 1.2, 1.16, 1.12, 1.08, 1.04, 1, 0.95, 0.88, 0.85, 0.83, 0.82, 0.78, 0.76, 0.75, 0.72, 0.71] as const;
const FIT_WARNING_FONT_SCALE = 0.75;
const DEFAULT_BALANCED_VARIANT: CafeDesignABalancedVariant = "estimatedGreedy";
const DEFAULT_FIT_STATE: CafeDesignAFitState = {
  columns: 4,
  fontScale: 1,
  gapScale: 1,
  balancedVariant: DEFAULT_BALANCED_VARIANT,
  orderedBalancedBreaks: "",
  orderedBalancedFingerprint: "",
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
  boardInnerRight: 0,
  rightmostMenuNameRight: 0,
  rightmostSecondaryRight: 0,
  rightmostPriceRight: 0,
  rightmostChipRight: 0,
  rightmostCategoryRight: 0,
  rightSafetyGap: 0,
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
const ORDERED_FIT_MIN_READABLE_COLUMN_WIDTH_PX = 188;
const ORDERED_FIT_COLUMN_EXPANSION_FONT_FLOOR = 0.82;
const CAFE_A_FOOTER_INFO_TOP_SAFETY_GAP_PX = 24;
const CAFE_A_FOOTER_INFO_TABLET_TOP_SAFETY_GAP_PX = 16;

// -----------------------------------------------------------------------------
// Basic engine candidate: layout candidates, scale helpers, and state comparison
// -----------------------------------------------------------------------------

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
  const maxReadableColumns = width >= 820 ? ORDERED_FIT_DESKTOP_MAX_COLUMNS : 3;
  const maxColumns = Math.min(ORDERED_FIT_DESKTOP_MAX_COLUMNS, Math.max(3, maxReadableColumns));
  const minColumns = 2;
  return FIT_COLUMN_CANDIDATES.filter((columns) => columns >= minColumns && columns <= maxColumns).sort((a, b) => b - a);
}

function isDenseOrderedBalancedMenu(groupCount: number, itemCount: number) {
  return groupCount >= ORDERED_BALANCED_DENSE_CATEGORY_THRESHOLD || itemCount >= ORDERED_BALANCED_DENSE_ITEM_THRESHOLD;
}

function getOrderedBalancedFitColumnCandidates(width: number, groupCount: number, itemCount: number) {
  if (groupCount <= 1) return [1];
  if (isDenseOrderedBalancedMenu(groupCount, itemCount)) return [3];

  const defaultMaxColumns = Math.min(ORDERED_BALANCED_DEFAULT_MAX_COLUMNS, groupCount);
  const maxWidthColumns =
    width < 520
      ? 2
        : width < 640
        ? 2
        : width < 1120
        ? 3
        : Math.min(defaultMaxColumns, getMaxFitColumns(width));
  const minColumns = 2;
  const maxUsefulColumns = Math.max(2, Math.min(maxWidthColumns, defaultMaxColumns));

  return FIT_COLUMN_CANDIDATES.filter((columns) => columns >= minColumns && columns <= maxUsefulColumns).sort((a, b) => b - a);
}

function getFitGapScale(fontScale: number) {
  return Math.max(0.68, Math.min(1.16, fontScale + 0.04));
}

function getBalancedFitGapScale(fontScale: number, menuWidth: number) {
  if (menuWidth < 760) return Math.max(0.68, Math.min(0.78, fontScale - 0.02));
  if (menuWidth < 1080) return Math.max(0.74, Math.min(0.95, fontScale + 0.02));
  return getFitGapScale(fontScale);
}

function getOrderedBalancedFitGapScale(fontScale: number, menuWidth: number) {
  if (fontScale <= 0.54) return Math.max(0.44, Math.min(0.52, fontScale + 0.02));
  if (fontScale <= 0.62) return Math.max(0.52, Math.min(0.62, fontScale));
  if (menuWidth < 760) {
    if (fontScale <= 0.68) return Math.max(0.62, Math.min(0.68, fontScale));
    return Math.max(0.68, Math.min(0.78, fontScale - 0.02));
  }
  if (menuWidth < 900 && fontScale <= 0.68) {
    if (fontScale >= 0.68) return 0.6;
    if (fontScale >= 0.67) return 0.62;
    if (fontScale >= 0.66) return 0.64;
    return Math.max(0.64, Math.min(0.68, fontScale + 0.04));
  }
  if (fontScale > 0.805 && fontScale <= 0.815) return 0.805;
  if (menuWidth < 1440) return Math.max(0.74, Math.min(0.825, fontScale + 0.02));
  return getFitGapScale(fontScale);
}

function getOrderedBalancedFitFontScaleCandidates(_viewportWidth: number, menuWidth: number) {
  if (menuWidth < 760) return [...ORDERED_BALANCED_FIT_FONT_SCALE_CANDIDATES.filter((fontScale) => fontScale <= 0.85), 0.62];
  return ORDERED_BALANCED_FIT_FONT_SCALE_CANDIDATES;
}

function getOrderedFitGapScale(fontScale: number, menuWidth: number) {
  if (menuWidth < 760) return Math.max(0.64, Math.min(0.72, fontScale - 0.29));
  if (menuWidth < 1080) return Math.max(0.76, Math.min(0.92, fontScale - 0.12));
  return Math.max(0.84, Math.min(0.96, fontScale - 0.16));
}

function getFitStyle(fitState: CafeDesignAFitState, menuFitState: CafeDesignAFitState = fitState): CSSProperties {
  return {
    "--fit-columns": String(fitState.columns),
    "--fit-font-scale": String(fitState.fontScale),
    "--fit-gap-scale": String(fitState.gapScale),
    "--fit-menu-font-scale": String(menuFitState.fontScale),
    "--fit-menu-gap-scale": String(menuFitState.gapScale),
  } as CSSProperties;
}

function areFinalFillBoostsEqual(currentBoost: CafeDesignAFinalFillBoost, nextBoost: CafeDesignAFinalFillBoost) {
  return currentBoost.fontScale === nextBoost.fontScale && currentBoost.gapScale === nextBoost.gapScale;
}

function getBoostedFitState(fitState: CafeDesignAFitState, boost: CafeDesignAFinalFillBoost): CafeDesignAFitState {
  if (boost.fontScale === 1 && boost.gapScale === 1) return fitState;

  return {
    ...fitState,
    fontScale: roundFitScale(fitState.fontScale * boost.fontScale),
    gapScale: roundFitScale(fitState.gapScale * boost.gapScale),
  };
}

function roundFitMetric(value: number) {
  return Number.isFinite(value) ? Math.round(value * 10) / 10 : 0;
}

function roundFitScale(value: number) {
  return Number.isFinite(value) ? Math.round(value * 1000) / 1000 : 1;
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
    currentState.orderedBalancedBreaks === nextState.orderedBalancedBreaks &&
    currentState.orderedBalancedFingerprint === nextState.orderedBalancedFingerprint &&
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
    currentState.boardInnerRight === nextState.boardInnerRight &&
    currentState.rightmostMenuNameRight === nextState.rightmostMenuNameRight &&
    currentState.rightmostSecondaryRight === nextState.rightmostSecondaryRight &&
    currentState.rightmostPriceRight === nextState.rightmostPriceRight &&
    currentState.rightmostChipRight === nextState.rightmostChipRight &&
    currentState.rightmostCategoryRight === nextState.rightmostCategoryRight &&
    currentState.rightSafetyGap === nextState.rightSafetyGap &&
    currentState.overflow === nextState.overflow
  );
}

function areOrderedBalancedCandidateIdentitiesEqual(currentState: CafeDesignAFitState, nextState: CafeDesignAFitState) {
  return (
    currentState.columns === nextState.columns &&
    Math.abs(currentState.fontScale - nextState.fontScale) < ORDERED_BALANCED_SCALE_EPSILON &&
    Math.abs(currentState.gapScale - nextState.gapScale) < ORDERED_BALANCED_SCALE_EPSILON &&
    currentState.orderedBalancedBreaks === nextState.orderedBalancedBreaks &&
    currentState.orderedBalancedFingerprint === nextState.orderedBalancedFingerprint
  );
}

function shouldKeepOrderedBalancedCurrentState(currentState: CafeDesignAFitState, nextState: CafeDesignAFitState) {
  if (currentState.status === "idle") return false;
  if (currentState.orderedBalancedFingerprint !== nextState.orderedBalancedFingerprint) return false;
  if (currentState.overflow && !nextState.overflow) return false;
  if (!currentState.overflow && nextState.overflow) return false;
  if (!areOrderedBalancedCandidateIdentitiesEqual(currentState, nextState)) return false;

  const currentGap = currentState.visibleContentBottomGap;
  const nextGap = nextState.visibleContentBottomGap;
  const gapImprovement = currentGap - nextGap;
  const currentIsSafe = !currentState.overflow && currentGap >= BALANCED_TARGET_MIN_GAP;

  return currentIsSafe && gapImprovement < ORDERED_BALANCED_GAP_IMPROVEMENT_EPSILON;
}

function getOrderedBalancedCandidateKey(state: CafeDesignAFitState) {
  return [
    state.orderedBalancedFingerprint,
    state.columns,
    state.fontScale.toFixed(3),
    state.gapScale.toFixed(3),
    state.orderedBalancedBreaks || "none",
  ].join("|");
}

function getOrderedBalancedCandidateSortKey({
  score,
  state,
}: {
  score: number;
  state: CafeDesignAFitState;
}) {
  return [
    roundFitMetric(score).toFixed(1),
    (1 - state.primaryFillRatio).toFixed(3),
    state.visibleContentBottomGap.toFixed(1).padStart(7, "0"),
    (1 - state.visibleMinFillRatio).toFixed(3),
    (1 - state.visibleLastColumnFillRatio).toFixed(3),
    (2 - state.fontScale).toFixed(3),
    String(state.columns).padStart(2, "0"),
    state.orderedBalancedBreaks || "z",
  ].join("|");
}

function isOrderedBalancedCandidateBetter({
  candidateScore,
  candidateState,
  currentScore,
  currentState,
}: {
  candidateScore: number;
  candidateState: CafeDesignAFitState;
  currentScore: number;
  currentState: CafeDesignAFitState;
}) {
  if (candidateScore < currentScore - ORDERED_BALANCED_SCORE_HYSTERESIS) return true;
  if (candidateScore > currentScore + 0.01) return false;

  return getOrderedBalancedCandidateSortKey({ score: candidateScore, state: candidateState }) <
    getOrderedBalancedCandidateSortKey({ score: currentScore, state: currentState });
}

function shouldKeepOrderedBalancedSettledCandidate(currentState: CafeDesignAFitState, nextState: CafeDesignAFitState) {
  if (currentState.status === "idle") return false;
  if (currentState.overflow || nextState.overflow) return false;
  if (!currentState.orderedBalancedFingerprint || currentState.orderedBalancedFingerprint !== nextState.orderedBalancedFingerprint) return false;
  if (currentState.visibleContentBottomGap < ORDERED_BALANCED_STABLE_MIN_BOTTOM_GAP) return false;
  if (nextState.visibleContentBottomGap < ORDERED_BALANCED_STABLE_MIN_BOTTOM_GAP) return false;
  if (currentState.columns !== nextState.columns) return false;
  if (Math.abs(currentState.fontScale - nextState.fontScale) > ORDERED_BALANCED_SETTLED_SCALE_DELTA) return false;
  if (
    currentState.visibleContentBottomGap > ORDERED_BALANCED_TARGET_MAX_VISIBLE_GAP &&
    nextState.visibleContentBottomGap <= ORDERED_BALANCED_TARGET_MAX_VISIBLE_GAP
  ) {
    return false;
  }

  const nextFillImprovement = currentState.visibleContentBottomGap - nextState.visibleContentBottomGap;
  return nextFillImprovement < ORDERED_BALANCED_SETTLED_SWITCH_GAP;
}

// -----------------------------------------------------------------------------
// CafeA skin candidate: visual rhythm variables that still live in this renderer
// -----------------------------------------------------------------------------

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

// -----------------------------------------------------------------------------
// Basic engine safety candidate: DOM measurement, crop, and right-edge checks
// -----------------------------------------------------------------------------

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
  const rightEdgeSafety = getCafeARightEdgeSafetyMeasurement(boardElement, menuElement);
  const actualDomCropMeasurement = getCafeAActualDomCropMeasurement(boardElement, menuElement, ORDERED_FIT_MIN_SAFETY_GAP);

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
    boardInnerRight: rightEdgeSafety.boardInnerRight,
    rightmostMenuNameRight: rightEdgeSafety.rightmostMenuNameRight,
    rightmostSecondaryRight: rightEdgeSafety.rightmostSecondaryRight,
    rightmostPriceRight: rightEdgeSafety.rightmostPriceRight,
    rightmostChipRight: rightEdgeSafety.rightmostChipRight,
    rightmostCategoryRight: rightEdgeSafety.rightmostCategoryRight,
    rightSafetyGap: rightEdgeSafety.rightSafetyGap,
    overflow: overflowsHeight || overflowsWidth || actualDomCropMeasurement.overflow || rightEdgeSafety.rightOverflow,
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

function getRightmostElementRight(menuElement: HTMLElement, selector: string) {
  return Array.from(menuElement.querySelectorAll<HTMLElement>(selector)).reduce((right, element) => {
    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return right;
    return Math.max(right, rect.right);
  }, Number.NEGATIVE_INFINITY);
}

function getCafeARightEdgeSafetyMeasurement(boardElement: HTMLElement, menuElement: HTMLElement) {
  const boardRect = boardElement.getBoundingClientRect();
  const menuRect = menuElement.getBoundingClientRect();
  const boardStyle = window.getComputedStyle(boardElement);
  const paddingRight = Number.parseFloat(boardStyle.paddingRight);
  const boardInnerRight = Math.min(
    boardRect.right,
    Number.isFinite(paddingRight) ? menuRect.right + paddingRight : boardRect.right
  );
  const rightmostMenuNameRight = getRightmostElementRight(menuElement, "[data-cafe-a-menu-name]");
  const rightmostSecondaryRight = getRightmostElementRight(menuElement, ".cafe-a-menu-meta");
  const rightmostPriceRight = getRightmostElementRight(
    menuElement,
    "[data-cafe-a-menu-price], .cafe-a-menu-price, .cafe-a-price-pair, .cafe-a-price-token"
  );
  const rightmostChipRight = getRightmostElementRight(menuElement, ".cafe-a-price-token, .cafe-a-menu-badge, .cafe-a-menu-chip");
  const rightmostCategoryRight = getRightmostElementRight(menuElement, ".cafe-a-category-title");
  const maxRightmostElementRight = Math.max(
    rightmostMenuNameRight,
    rightmostSecondaryRight,
    rightmostPriceRight,
    rightmostChipRight,
    rightmostCategoryRight
  );
  const hasMeasuredElement = Number.isFinite(maxRightmostElementRight);
  const rightSafetyGap = hasMeasuredElement
    ? boardInnerRight - maxRightmostElementRight
    : Math.max(0, boardInnerRight - menuRect.left);

  return {
    boardInnerRight: roundFitMetric(boardInnerRight),
    rightmostMenuNameRight: roundFitMetric(Number.isFinite(rightmostMenuNameRight) ? rightmostMenuNameRight : 0),
    rightmostSecondaryRight: roundFitMetric(Number.isFinite(rightmostSecondaryRight) ? rightmostSecondaryRight : 0),
    rightmostPriceRight: roundFitMetric(Number.isFinite(rightmostPriceRight) ? rightmostPriceRight : 0),
    rightmostChipRight: roundFitMetric(Number.isFinite(rightmostChipRight) ? rightmostChipRight : 0),
    rightmostCategoryRight: roundFitMetric(Number.isFinite(rightmostCategoryRight) ? rightmostCategoryRight : 0),
    rightSafetyGap: roundFitMetric(rightSafetyGap),
    rightOverflow: hasMeasuredElement && rightSafetyGap < BASIC_RIGHT_EDGE_SAFETY_GAP_PX,
  };
}

// -----------------------------------------------------------------------------
// Basic engine candidate: ordered balanced partition and balanced measurement
// -----------------------------------------------------------------------------

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

function getOrderedBalancedBucketedMetric(value: number, bucketSize: number) {
  if (!Number.isFinite(value) || bucketSize <= 0) return 0;
  return Math.round(value / bucketSize) * bucketSize;
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

function createSimulatedColumnFromBlocks(blocks: CafeDesignABalancedBlockMeasurement[]): CafeDesignABalancedSimulatedColumn {
  return {
    blocks,
    height: getBalancedSimulatedColumnHeight(blocks),
  };
}

function createOrderedBalancedColumnsFromBreakIndices(
  blocks: CafeDesignABalancedBlockMeasurement[],
  safeColumns: number,
  breakIndices: number[],
): CafeDesignABalancedSimulatedColumn[] {
  const columns: CafeDesignABalancedSimulatedColumn[] = [];
  let startIndex = 0;

  [...breakIndices, blocks.length].forEach((endIndex) => {
    columns.push(createSimulatedColumnFromBlocks(blocks.slice(startIndex, endIndex)));
    startIndex = endIndex;
  });

  while (columns.length < safeColumns) columns.push(createSimulatedColumnFromBlocks([]));
  return columns.slice(0, safeColumns);
}

function getOrderedBalancedBreaksFromColumns(columns: CafeDesignABalancedSimulatedColumn[]) {
  let cursor = 0;
  const breaks: number[] = [];

  columns.slice(0, -1).forEach((column) => {
    cursor += column.blocks.length;
    if (cursor > 0) breaks.push(cursor);
  });

  return breaks.join(",");
}

function parseOrderedBalancedBreaks(value: string, groupCount: number, columns: number) {
  const breaks = value
    .split(",")
    .map((breakValue) => Number.parseInt(breakValue, 10))
    .filter((breakIndex) => Number.isInteger(breakIndex) && breakIndex > 0 && breakIndex < groupCount)
    .sort((a, b) => a - b);
  const uniqueBreaks = Array.from(new Set(breaks));

  return uniqueBreaks.length === Math.max(0, columns - 1) ? uniqueBreaks : null;
}

function getOrderedBalancedColumnFillMetrics(columns: CafeDesignABalancedSimulatedColumn[], targetHeight?: number) {
  const visibleHeights = columns.map((column) => getBalancedVisibleColumnFillHeights(column).visibleContentHeight || column.height);
  const maxHeight = Math.max(...visibleHeights, 0);
  const averageHeight = visibleHeights.length > 0 ? visibleHeights.reduce((total, height) => total + height, 0) / visibleHeights.length : 0;
  const fillHeight = Number.isFinite(targetHeight) && (targetHeight ?? 0) > 0 ? targetHeight ?? maxHeight : maxHeight;
  const fillRatios = visibleHeights.map((height) => (fillHeight > 0 ? height / fillHeight : 0));
  const bottomGaps = visibleHeights.map((height) => Math.max(0, fillHeight - height));
  const firstIndex = 0;
  const middleIndex = columns.length >= 3 ? 1 : Math.max(0, columns.length - 1);
  const lastIndex = Math.max(0, columns.length - 1);
  const averageFillRatio = fillRatios.length > 0 ? fillRatios.reduce((total, fillRatio) => total + fillRatio, 0) / fillRatios.length : 0;
  const fillVariance =
    fillRatios.length > 0
      ? fillRatios.reduce((total, fillRatio) => total + Math.pow(fillRatio - averageFillRatio, 2), 0) / fillRatios.length
      : 0;

  return {
    visibleHeights,
    maxHeight,
    minHeight: visibleHeights.length > 0 ? Math.min(...visibleHeights) : 0,
    averageHeight,
    fillHeight,
    firstHeight: visibleHeights[firstIndex] ?? 0,
    secondHeight: visibleHeights[middleIndex] ?? visibleHeights[firstIndex] ?? 0,
    lastHeight: visibleHeights[lastIndex] ?? 0,
    firstFillRatio: fillRatios[firstIndex] ?? 0,
    secondFillRatio: fillRatios[middleIndex] ?? fillRatios[firstIndex] ?? 0,
    lastFillRatio: fillRatios[lastIndex] ?? 0,
    minFillRatio: fillRatios.length > 0 ? Math.min(...fillRatios) : 0,
    firstGap: bottomGaps[firstIndex] ?? 0,
    secondGap: bottomGaps[middleIndex] ?? bottomGaps[firstIndex] ?? 0,
    lastGap: bottomGaps[lastIndex] ?? 0,
    fillVariance,
    secondBlockCount: columns[middleIndex]?.blocks.length ?? 0,
  };
}

function getOrderedBalancedSimulatedSpreadScore(columns: CafeDesignABalancedSimulatedColumn[], targetHeight?: number) {
  const {
    maxHeight,
    minHeight,
    averageHeight,
    firstHeight,
    secondHeight,
    lastHeight,
    firstFillRatio,
    secondFillRatio,
    lastFillRatio,
    minFillRatio,
    firstGap,
    secondGap,
    lastGap,
    fillVariance,
    secondBlockCount,
  } = getOrderedBalancedColumnFillMetrics(columns, targetHeight);
  const targetGap = Number.isFinite(targetHeight) ? Math.max(0, (targetHeight ?? 0) - maxHeight) : 0;
  const targetGapPenalty = Number.isFinite(targetHeight)
    ? Math.max(0, maxHeight - (targetHeight ?? 0)) * 1000 +
      Math.max(0, targetGap - ORDERED_BALANCED_TARGET_MAX_VISIBLE_GAP) * 420 +
      Math.max(0, targetGap - 14) * 720 +
      Math.max(0, targetGap - 24) * 1100
    : 0;
  const firstColumnIsShortestPenalty =
    firstHeight <= minHeight + 1 && maxHeight - firstHeight > 40 ? 12000 + (maxHeight - firstHeight) * 42 : 0;
  const firstFillPenalty =
    Math.max(0, 0.8 - firstFillRatio) * 3600 +
    Math.max(0, 0.88 - firstFillRatio) * 1200 +
    Math.max(0, firstGap - 40) * 18 +
    Math.max(0, maxHeight - firstHeight - 80) * 7.2;
  const secondFillPenalty =
    Math.max(0, 0.72 - secondFillRatio) * 3600 +
    Math.max(0, 0.78 - secondFillRatio) * 1400 +
    Math.max(0, secondGap - 40) * 11 +
    Math.max(0, secondGap - 60) * 22;
  const singletonMiddlePenalty =
    columns.length >= 3 && secondBlockCount <= 1 && secondFillRatio < 0.84
      ? 1800 + Math.max(0, 0.84 - secondFillRatio) * 2600 + Math.max(0, secondGap - 40) * 16
      : 0;
  const lastFillPenalty = Math.max(0, 0.58 - lastFillRatio) * 520 + Math.max(0, 0.66 - lastFillRatio) * 260 + Math.max(0, lastGap - 160) * 1.2;
  const minFillPenalty = Math.max(0, 0.58 - minFillRatio) * 720 + Math.max(0, 0.68 - minFillRatio) * 360;
  const fillVariancePenalty = fillVariance * 1200;
  const leftRhythmPenalty = Math.max(0, secondHeight - firstHeight - 40) * 26 + Math.max(0, lastHeight - firstHeight - 70) * 14;

  return (
    targetGapPenalty +
    firstColumnIsShortestPenalty +
    firstFillPenalty +
    secondFillPenalty +
    singletonMiddlePenalty +
    lastFillPenalty +
    minFillPenalty +
    fillVariancePenalty +
    leftRhythmPenalty +
    (maxHeight - minHeight) * 2.6 +
    Math.max(0, averageHeight - lastHeight) * 3.2 +
    Math.max(0, maxHeight * 0.74 - lastHeight) * 2.4 +
    Math.max(0, maxHeight * 0.68 - minHeight) * 2.8 +
    columns.filter((column) => column.blocks.length === 0).length * 800
  );
}

function getOrderedBalancedSequentialColumns(blocks: CafeDesignABalancedBlockMeasurement[], safeColumns: number) {
  const columns: CafeDesignABalancedSimulatedColumn[] = Array.from({ length: safeColumns }, () => ({ blocks: [], height: 0 }));
  const totalHeight = blocks.reduce((total, block) => total + block.height, 0);
  const targetHeight = safeColumns > 0 ? totalHeight / safeColumns : totalHeight;
  let columnIndex = 0;

  blocks.forEach((block, blockIndex) => {
    const currentColumn = columns[columnIndex] ?? columns[columns.length - 1];
    const remainingBlocks = blocks.length - blockIndex;
    const remainingColumns = safeColumns - columnIndex;
    const projectedHeight =
      currentColumn.height +
      (currentColumn.blocks.length > 0 ? currentColumn.blocks[currentColumn.blocks.length - 1]?.marginBottom ?? 0 : 0) +
      block.height;
    const shouldAdvance =
      currentColumn.blocks.length > 0 &&
      columnIndex < safeColumns - 1 &&
      projectedHeight > targetHeight &&
      remainingBlocks >= remainingColumns;

    if (shouldAdvance) columnIndex += 1;
    const targetColumn = columns[columnIndex] ?? columns[columns.length - 1];
    targetColumn.blocks.push(block);
    targetColumn.height = getBalancedSimulatedColumnHeight(targetColumn.blocks);
  });

  return columns;
}

function getOrderedBalancedContiguousColumns(blocks: CafeDesignABalancedBlockMeasurement[], columns: number, targetHeight?: number) {
  const safeColumns = Math.max(1, Math.min(ORDERED_BALANCED_MAX_EXHAUSTIVE_COLUMNS, Math.floor(columns), blocks.length || 1));
  if (blocks.length === 0) return Array.from({ length: safeColumns }, () => createSimulatedColumnFromBlocks([]));
  if (blocks.length < safeColumns) return getOrderedBalancedSequentialColumns(blocks, blocks.length);

  if (blocks.length > ORDERED_BALANCED_MAX_EXHAUSTIVE_BLOCKS || safeColumns > ORDERED_BALANCED_MAX_EXHAUSTIVE_COLUMNS) {
    return getOrderedBalancedSequentialColumns(blocks, safeColumns);
  }

  let bestColumns = getOrderedBalancedSequentialColumns(blocks, safeColumns);
  let bestScore = getOrderedBalancedSimulatedSpreadScore(bestColumns, targetHeight);
  const selectedBreaks: number[] = [];

  function visit(nextBreakStart: number, remainingBreaks: number) {
    if (remainingBreaks === 0) {
      const candidateColumns = createOrderedBalancedColumnsFromBreakIndices(blocks, safeColumns, selectedBreaks);
      if (candidateColumns.some((column) => column.blocks.length === 0)) return;

      const score = getOrderedBalancedSimulatedSpreadScore(candidateColumns, targetHeight);
      if (score < bestScore) {
        bestScore = score;
        bestColumns = candidateColumns;
      }
      return;
    }

    const maxBreak = blocks.length - remainingBreaks;
    for (let breakIndex = nextBreakStart; breakIndex <= maxBreak; breakIndex += 1) {
      selectedBreaks.push(breakIndex);
      visit(breakIndex + 1, remainingBreaks - 1);
      selectedBreaks.pop();
    }
  }

  visit(1, safeColumns - 1);
  return bestColumns;
}

function getOrderedBalancedMenuColumns({
  pageGroups,
  columns,
  data,
  capabilities,
  orderedBalancedBreaks,
}: {
  pageGroups: MenuPageGroup[];
  columns: number;
  data: PublicMenuTemplateProps;
  capabilities: TemplateCapabilities;
  orderedBalancedBreaks: string;
}): BalancedColumn[] {
  const groups = getFlatMenuGroups(pageGroups);
  const safeColumns = Math.max(1, Math.min(ORDERED_BALANCED_MAX_EXHAUSTIVE_COLUMNS, Math.floor(columns), groups.length || 1));
  const breakIndices = parseOrderedBalancedBreaks(orderedBalancedBreaks, groups.length, safeColumns);
  const weightedGroups = groups.map((group, index) => ({
    group,
    index,
    estimatedHeight: estimateMenuGroupHeight(group, data, capabilities),
  }));
  const fallbackBlocks = weightedGroups.map((weightedGroup) => ({
    key: getMenuGroupKey(weightedGroup.group),
    order: weightedGroup.index,
    height: weightedGroup.estimatedHeight,
    visibleItemHeight: weightedGroup.estimatedHeight,
    visibleTextHeight: weightedGroup.estimatedHeight,
    visiblePriceHeight: weightedGroup.estimatedHeight,
    visibleContentHeight: weightedGroup.estimatedHeight,
    marginBottom: 0,
    estimatedHeight: weightedGroup.estimatedHeight,
  }));
  const partitionColumns = breakIndices
    ? createOrderedBalancedColumnsFromBreakIndices(fallbackBlocks, safeColumns, breakIndices)
    : getOrderedBalancedContiguousColumns(fallbackBlocks, safeColumns);
  const groupByKey = new Map(groups.map((group) => [getMenuGroupKey(group), group]));

  return partitionColumns.map((column, columnIndex) => ({
    id: `ordered-balanced-column-${columnIndex + 1}`,
    groups: column.blocks.map((block) => groupByKey.get(block.key)).filter((group): group is MenuGroup => Boolean(group)),
    estimatedHeight: column.height,
  }));
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
  cropTolerance = 1,
  includeClippingBottom = false,
}: {
  boardElement: HTMLElement;
  menuElement: HTMLElement;
  columns: CafeDesignABalancedSimulatedColumn[];
  expectedColumns: number;
  includeDomOverflow?: boolean;
  cropTolerance?: number;
  includeClippingBottom?: boolean;
}): CafeDesignAFitMeasurement {
  const boardRect = boardElement.getBoundingClientRect();
  const menuRect = menuElement.getBoundingClientRect();
  const rawFlowHeight = menuElement.clientHeight || menuRect.height;
  const simulationCropBuffer =
    includeClippingBottom && (window.visualViewport?.scale ?? 1) > 1.01
      ? ORDERED_BALANCED_ZOOM_SIMULATION_CROP_BUFFER
      : includeClippingBottom
        ? ORDERED_BALANCED_SIMULATION_CROP_BUFFER
        : 0;
  const clippedFlowHeight = includeClippingBottom ? Math.max(0, getCafeAClippingBottom(boardElement, menuElement) - menuRect.top - simulationCropBuffer) : rawFlowHeight;
  const flowHeight = includeClippingBottom ? Math.min(rawFlowHeight, clippedFlowHeight || rawFlowHeight) : rawFlowHeight;
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
    longestColumnBottom > flowHeight + cropTolerance ||
    longestVisibleItemBottom > flowHeight + cropTolerance ||
    longestVisibleTextBottom > flowHeight + cropTolerance ||
    longestVisiblePriceBottom > flowHeight + cropTolerance ||
    visibleContentBottomGap < BALANCED_MIN_SAFETY_GAP;
  const overflowsWidth = includeDomOverflow && menuElement.scrollWidth > menuElement.clientWidth + 1;
  const rightEdgeSafety = getCafeARightEdgeSafetyMeasurement(boardElement, menuElement);

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
    boardInnerRight: rightEdgeSafety.boardInnerRight,
    rightmostMenuNameRight: rightEdgeSafety.rightmostMenuNameRight,
    rightmostSecondaryRight: rightEdgeSafety.rightmostSecondaryRight,
    rightmostPriceRight: rightEdgeSafety.rightmostPriceRight,
    rightmostChipRight: rightEdgeSafety.rightmostChipRight,
    rightmostCategoryRight: rightEdgeSafety.rightmostCategoryRight,
    rightSafetyGap: rightEdgeSafety.rightSafetyGap,
    overflow: overflowsHeight || overflowsWidth || (includeDomOverflow && rightEdgeSafety.rightOverflow),
  };
}

function getCafeAClippingBottom(boardElement: HTMLElement, menuElement: HTMLElement) {
  const boardRect = boardElement.getBoundingClientRect();
  const menuRect = menuElement.getBoundingClientRect();
  const viewportBottom = window.visualViewport ? window.visualViewport.offsetTop + window.visualViewport.height : window.innerHeight;
  let safeBottom = Math.min(boardRect.bottom, menuRect.bottom, viewportBottom);
  let ancestor: HTMLElement | null = menuElement;
  while (ancestor && ancestor !== document.body) {
    const style = window.getComputedStyle(ancestor);
    const clipsY = /(hidden|clip|auto|scroll)/.test(style.overflowY) || /(hidden|clip|auto|scroll)/.test(style.overflow);
    if (clipsY) {
      safeBottom = Math.min(safeBottom, ancestor.getBoundingClientRect().bottom);
    }
    if (ancestor === boardElement) break;
    ancestor = ancestor.parentElement;
  }
  return safeBottom;
}

function hasCafeADesktopFooterAnchor(boardElement: HTMLElement) {
  const footerElement = boardElement.querySelector<HTMLElement>('[data-cafe-a-footer-info][data-cafe-a-footer-placement="desktop"]');
  if (!footerElement) return false;

  const footerRect = footerElement.getBoundingClientRect();
  const footerStyle = window.getComputedStyle(footerElement);
  return footerRect.width > 0 && footerRect.height > 0 && footerStyle.display !== "none" && footerStyle.visibility !== "hidden";
}

function getCafeAActualDomCropMeasurement(boardElement: HTMLElement, menuElement: HTMLElement, cropTolerance: number) {
  const menuRect = menuElement.getBoundingClientRect();
  const safeBottom = getCafeAClippingBottom(boardElement, menuElement);
  const safetyGap = Math.max(cropTolerance, ORDERED_BALANCED_ORPHAN_SAFETY_GAP);
  const rightEdgeSafety = getCafeARightEdgeSafetyMeasurement(boardElement, menuElement);
  const visibleElements = Array.from(
    menuElement.querySelectorAll<HTMLElement>(
      [
        "[data-cafe-a-category-heading]",
        "[data-cafe-a-menu-name]",
        "[data-cafe-a-menu-price]",
        ".cafe-a-menu-description",
        ".cafe-a-menu-meta",
        ".cafe-a-menu-badge",
        ".cafe-a-menu-chip",
      ].join(",")
    )
  );
  const visibleBottom = getVisibleElementBottom(visibleElements);
  const bottomGap = Number.isFinite(visibleBottom) ? safeBottom - visibleBottom : menuElement.clientHeight || menuRect.height;
  const scrollOverflow = menuElement.scrollHeight > menuElement.clientHeight + Math.max(1, cropTolerance);
  const horizontalScrollOverflow =
    menuElement.scrollWidth > menuElement.clientWidth + 1 ||
    document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
  const rectOverflow = Number.isFinite(visibleBottom) && bottomGap < -cropTolerance;
  const footerElement = boardElement.querySelector<HTMLElement>('[data-cafe-a-footer-info][data-cafe-a-footer-placement="desktop"]');
  const footerRect = footerElement?.getBoundingClientRect();
  const boardRect = boardElement.getBoundingClientRect();
  const footerIsVisible = Boolean(footerRect && footerRect.width > 0 && footerRect.height > 0);
  const footerSafetyGap = Math.max(BASIC_RIGHT_EDGE_SAFETY_GAP_PX, cropTolerance);
  const footerTopSafetyGap =
    footerIsVisible && boardRect.width < 1120 ? CAFE_A_FOOTER_INFO_TABLET_TOP_SAFETY_GAP_PX : CAFE_A_FOOTER_INFO_TOP_SAFETY_GAP_PX;
  const footerNoGoTop = footerIsVisible ? footerRect!.top - footerTopSafetyGap : 0;
  const footerOutOfBounds = footerIsVisible
    ? footerRect!.bottom > boardRect.bottom - footerSafetyGap ||
      footerRect!.right > boardRect.right - footerSafetyGap ||
      footerRect!.left < boardRect.left + footerSafetyGap ||
      footerRect!.top < boardRect.top + footerSafetyGap
    : false;
  const footerNoGoOverflow = footerIsVisible
    ? Array.from(
        menuElement.querySelectorAll<HTMLElement>(
          [
            "[data-cafe-a-item-stack]",
            "[data-cafe-a-menu-name]",
            "[data-cafe-a-menu-price]",
            ".cafe-a-menu-description",
            ".cafe-a-menu-meta",
            ".cafe-a-menu-badge",
            ".cafe-a-menu-chip",
            ".cafe-a-price-token",
          ].join(",")
        )
      ).some((element) => {
        const rect = element.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return false;
        const overlapsFooterX = rect.right > footerRect!.left - 1 && rect.left < footerRect!.right + 1;
        return overlapsFooterX && rect.bottom > footerNoGoTop - footerSafetyGap;
      })
    : false;
  const categoryBlocks = Array.from(menuElement.querySelectorAll<HTMLElement>("[data-cafe-a-balanced-category-block]"));
  let orphanCategoryHeading = false;

  for (const blockElement of categoryBlocks) {
    const headingElement = blockElement.querySelector<HTMLElement>("[data-cafe-a-category-heading]");
    const firstItemElement = blockElement.querySelector<HTMLElement>("[data-cafe-a-item-stack]");
    if (!headingElement || !firstItemElement) continue;

    const headingRect = headingElement.getBoundingClientRect();
    if (headingRect.width <= 0 || headingRect.height <= 0) continue;
    const headingVisible = headingRect.bottom > menuRect.top + cropTolerance && headingRect.top < safeBottom - safetyGap;
    if (!headingVisible) continue;

    const firstItemLeafBottom = getVisibleElementBottom(
      Array.from(
        firstItemElement.querySelectorAll<HTMLElement>(
          [
            "[data-cafe-a-menu-name]",
            "[data-cafe-a-menu-price]",
            ".cafe-a-menu-description",
            ".cafe-a-menu-meta",
            ".cafe-a-menu-badge",
            ".cafe-a-menu-chip",
          ].join(",")
        )
      )
    );
    if (Number.isFinite(firstItemLeafBottom) && firstItemLeafBottom > safeBottom - safetyGap) {
      orphanCategoryHeading = true;
      break;
    }
  }

  return {
    bottomGap,
    boardInnerRight: rightEdgeSafety.boardInnerRight,
    rightmostMenuNameRight: rightEdgeSafety.rightmostMenuNameRight,
    rightmostSecondaryRight: rightEdgeSafety.rightmostSecondaryRight,
    rightmostPriceRight: rightEdgeSafety.rightmostPriceRight,
    rightmostChipRight: rightEdgeSafety.rightmostChipRight,
    rightmostCategoryRight: rightEdgeSafety.rightmostCategoryRight,
    rightSafetyGap: rightEdgeSafety.rightSafetyGap,
    orphanCategoryHeading,
    overflow:
      orphanCategoryHeading ||
      rectOverflow ||
      scrollOverflow ||
      horizontalScrollOverflow ||
      footerOutOfBounds ||
      footerNoGoOverflow ||
      rightEdgeSafety.rightOverflow,
  };
}

function measureCafeABalancedFit(
  boardElement: HTMLElement,
  menuElement: HTMLElement,
  expectedColumns?: number,
  clampColumnHeight = true,
  cropTolerance = 1,
  includeActualDomCrop = false,
): CafeDesignAFitMeasurement {
  const menuRect = menuElement.getBoundingClientRect();
  const flowHeight = menuElement.clientHeight || menuRect.height;
  const columnElements = Array.from(menuElement.querySelectorAll<HTMLElement>(":scope > [data-cafe-a-balanced-column]"));
  const simulatedColumns = columnElements.map((columnElement) => {
    const blockElements = Array.from(columnElement.querySelectorAll<HTMLElement>(":scope > [data-cafe-a-balanced-category-block]"));
    const footerElement = columnElement.querySelector<HTMLElement>(":scope > [data-cafe-a-footer-info]");
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
    const categoryVisibleBottom = blockElements.reduce((bottom, blockElement) => {
      const rect = blockElement.getBoundingClientRect();
      return Math.max(bottom, rect.bottom - menuRect.top);
    }, Math.max(0, columnRect.top - menuRect.top));
    const footerRect = footerElement?.getBoundingClientRect();
    const footerVisibleBottom = footerRect && footerRect.width > 0 && footerRect.height > 0
      ? Math.max(0, footerRect.bottom - menuRect.top)
      : Number.NEGATIVE_INFINITY;
    const visibleBottom = Math.max(categoryVisibleBottom, footerVisibleBottom);
    const columnHeight = Math.max(0, visibleBottom);

    return {
      blocks,
      height: footerElement ? columnHeight : clampColumnHeight ? Math.min(flowHeight, columnHeight) : columnHeight,
    };
  });

  const measurement = getBalancedMeasurementFromColumns({
    boardElement,
    menuElement,
    columns: simulatedColumns,
    expectedColumns: Math.max(1, expectedColumns ?? columnElements.length),
    cropTolerance,
    includeClippingBottom: includeActualDomCrop,
  });

  if (!includeActualDomCrop) return measurement;

  const actualCropMeasurement = getCafeAActualDomCropMeasurement(boardElement, menuElement, cropTolerance);
  if (!actualCropMeasurement.overflow) return measurement;

  const actualBottomGap = roundFitMetric(actualCropMeasurement.bottomGap);

  return {
    ...measurement,
    bottomGap: Math.min(measurement.bottomGap, actualBottomGap),
    contentGap: Math.max(0, Math.min(measurement.contentGap, actualBottomGap)),
    itemBoxGap: Math.max(0, Math.min(measurement.itemBoxGap, actualBottomGap)),
    textVisualGap: Math.max(0, Math.min(measurement.textVisualGap, actualBottomGap)),
    visibleItemBottomGap: actualBottomGap,
    visibleTextBottomGap: actualBottomGap,
    visiblePriceBottomGap: actualBottomGap,
    visibleContentBottomGap: actualBottomGap,
    overflow: true,
  };
}

// -----------------------------------------------------------------------------
// Basic engine candidate: data filtering, price rendering, and grouping helpers
// -----------------------------------------------------------------------------

function getDisplayName(site: PublicMenuTemplateProps["menuSite"]) {
  return site.restaurant_name || site.name || "MenuLink";
}

function getMenuSiteSettings(site: PublicMenuTemplateProps["menuSite"]) {
  return site.settings && typeof site.settings === "object" && !Array.isArray(site.settings) ? (site.settings as Record<string, unknown>) : {};
}

function getMenuSiteSettingString(site: PublicMenuTemplateProps["menuSite"], key: string) {
  const value = getMenuSiteSettings(site)[key];
  return typeof value === "string" ? value.trim() : "";
}

function hasMenuSiteSetting(site: PublicMenuTemplateProps["menuSite"], key: string) {
  return Object.prototype.hasOwnProperty.call(getMenuSiteSettings(site), key);
}

function shouldUseBrandLogo(site: PublicMenuTemplateProps["menuSite"], capabilities: TemplateCapabilities) {
  return Boolean(capabilities.brandLogo && capabilities.brandLogoReplacesName && site.logo_url && getMenuSiteSettings(site).logo_replaces_name === true);
}

function getCafeAFooterInfo(data: PublicMenuTemplateProps, capabilities: TemplateCapabilities) {
  if (!capabilities.footerStoreInfo) return [];

  const site = data.menuSite;
  const footerNotice1 = hasMenuSiteSetting(site, "footer_notice_1")
    ? getMenuSiteSettingString(site, "footer_notice_1")
    : site.opening_hours?.trim() ?? "";
  const footerNotice2 = hasMenuSiteSetting(site, "footer_notice_2")
    ? getMenuSiteSettingString(site, "footer_notice_2")
    : site.restaurant_address?.trim() ?? "";
  const footerNotice3 = hasMenuSiteSetting(site, "footer_notice_3")
    ? getMenuSiteSettingString(site, "footer_notice_3")
    : getMenuSiteSettingString(site, "footer_sns_text") || getMenuSiteSettingString(site, "footer_note");

  return [
    footerNotice1,
    footerNotice2,
    footerNotice3,
  ].filter(Boolean);
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

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripFeaturedPriceOptionLabel(price: string, label?: string | null) {
  const trimmedPrice = price.trim();
  const trimmedLabel = label?.trim();
  if (trimmedLabel) {
    return trimmedPrice.replace(new RegExp(`^${escapeRegExp(trimmedLabel)}[\\s:·/-]+`, "i"), "").trim();
  }

  return trimmedPrice.replace(/^(HOT|ICE)[\s:·/-]+/i, "").trim();
}

function getItemPriceDisplay(
  item: MenuItem,
  priceOptions: PublicMenuTemplateProps["priceOptions"],
  capabilities: TemplateCapabilities,
  options: { showOptionLabel?: boolean; dedupeSamePrices?: boolean } = {},
) {
  if (item.price_visible === false) return null;

  const showOptionLabel = options.showOptionLabel ?? true;
  const dedupeSamePrices = options.dedupeSamePrices ?? false;
  const maxOptions = capabilities.maxPriceOptionsPerItem ?? MENU_LIMITS.maxPriceOptionsPerItem;
  const visibleOptions = capabilities.priceOptions ? getItemPriceOptions(priceOptions, item.id, maxOptions) : [];
  if (visibleOptions.length > 0) {
    const optionPrices = visibleOptions
      .map((option) => {
        const optionPrice = formatPriceOption(option);
        if (showOptionLabel) return optionPrice ? `${option.label} ${optionPrice}` : option.label;
        return optionPrice ? stripFeaturedPriceOptionLabel(optionPrice, option.label) : "";
      })
      .filter(Boolean);
    const displayPrices = dedupeSamePrices ? Array.from(new Set(optionPrices)) : optionPrices;

    return displayPrices.join(" / ");
  }

  if (item.price_label?.trim()) {
    return showOptionLabel ? item.price_label.trim() : stripFeaturedPriceOptionLabel(item.price_label);
  }

  return formatMenuPrice(item);
}

function isCafeADrinkCategory(category: MenuCategory) {
  const categoryName = category.name.trim().toLowerCase();
  if (!categoryName) return false;

  if (/(bakery|dessert|bread|cake|pastry|베이커리|디저트|케이크|구움|빵)/i.test(categoryName)) return false;

  return /(coffee|non-?coffee|tea|ade|drink|beverage|espresso|latte|brew|커피|음료|티|차|에이드|라떼)/i.test(categoryName);
}

function getItemPriceTokens(
  item: MenuItem,
  priceOptions: PublicMenuTemplateProps["priceOptions"],
  capabilities: TemplateCapabilities,
  options: { isDrink?: boolean } = {},
): CafeDesignAPriceToken[] {
  if (item.price_visible === false) return [];

  const maxOptions = capabilities.maxPriceOptionsPerItem ?? MENU_LIMITS.maxPriceOptionsPerItem;
  const visibleOptions = capabilities.priceOptions ? getItemPriceOptions(priceOptions, item.id, maxOptions) : [];
  if (visibleOptions.length > 0) {
    const optionTokens = visibleOptions
      .map((option) => ({
        label: option.label.trim(),
        normalizedLabel: option.label.trim().toUpperCase(),
        price: formatPriceOption(option),
      }))
      .filter((token) => token.label || token.price);

    if (optionTokens.length === 1) {
      const [token] = optionTokens;
      const isTemperatureOption = token.normalizedLabel === "HOT" || token.normalizedLabel === "ICE";
      return [
        {
          label: isTemperatureOption ? `${token.normalizedLabel} ONLY` : token.label,
          price: token.price,
        },
      ].filter((priceToken) => priceToken.label || priceToken.price);
    }

    const hotToken = optionTokens.find((token) => token.normalizedLabel === "HOT");
    const iceToken = optionTokens.find((token) => token.normalizedLabel === "ICE");
    if (hotToken && iceToken && hotToken.price && hotToken.price === iceToken.price) {
      const otherTokens = optionTokens.filter((token) => token.normalizedLabel !== "HOT" && token.normalizedLabel !== "ICE");
      return [
        {
          label: "HOT/ICE",
          price: hotToken.price,
        },
        ...otherTokens.map((token) => ({
          label: token.label,
          price: token.price,
        })),
      ].filter((token) => token.label || token.price);
    }

    return optionTokens.map((token) => ({
      label: token.label,
      price: token.price,
    }));
  }

  const price = item.price_label?.trim() || formatMenuPrice(item);
  if (!price) return [];
  const portionLabel = item.portion_label?.trim() ?? "";
  const fallbackTemperatureLabel = options.isDrink ? "HOT/ICE" : "";

  return [
    {
      label: portionLabel || fallbackTemperatureLabel,
      price,
    },
  ];
}

function getFeaturedItem(data: PublicMenuTemplateProps, capabilities: TemplateCapabilities) {
  if (!data.pageSettings.featured_item_enabled) return null;
  if (!capabilities.featuredItemHero) return null;

  const featuredItem = data.pageSettings.featured_item_id
    ? data.items.find((item) => item.id === data.pageSettings.featured_item_id)
    : null;
  if (featuredItem && featuredItem.visible !== false) return featuredItem;

  return (
    data.items.find((item) => item.visible !== false && item.recommended === true && Boolean(item.image_url)) ??
    data.items.find((item) => item.visible !== false && item.recommended === true) ??
    null
  );
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
    const priceTokens = getItemPriceTokens(item, data.priceOptions, capabilities, { isDrink: isCafeADrinkCategory(group.category) });
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

// -----------------------------------------------------------------------------
// CafeA skin candidate: component class names, cover rail, and menu row visuals
// -----------------------------------------------------------------------------

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
        <p className={`cafe-a-description-text cafe-a-menu-description mt-2 break-keep text-[#3f4945] ${descriptionClassName}`}>{category.description}</p>
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

function HeroOverlayBadge({
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
    <span className="menu-badge cafe-a-menu-badge cafe-a-featured-badge inline-flex rounded-none px-1.5 py-1 font-black uppercase leading-none" style={getBadgeStyleCss(badgeStyle)}>
      {label}
    </span>
  );
}

function MenuItemRow({
  item,
  category,
  priceOptions,
  traits,
  capabilities,
  density,
  templateKey,
  customBadgeStyles,
  locale,
}: {
  item: MenuItem;
  category: MenuCategory;
  priceOptions: PublicMenuTemplateProps["priceOptions"];
  traits: PublicMenuTemplateProps["traits"];
  capabilities: TemplateCapabilities;
  density: MenuLayoutDensity;
  templateKey: string | null;
  customBadgeStyles: unknown;
  locale: PublicMenuTemplateProps["locale"];
}) {
  const priceTokens = getItemPriceTokens(item, priceOptions, capabilities, { isDrink: isCafeADrinkCategory(category) });
  const visibleTraits = capabilities.itemTraits && shouldShowMenuItemTraits(item, traits) ? traits.filter((trait) => trait.visible) : [];
  const titleClassName = {
    spacious: "cafe-a-menu-title-size-spacious",
    default: "cafe-a-menu-title-size-default",
    compact: "cafe-a-menu-title-size-compact",
    ultraCompact: "cafe-a-menu-title-size-ultra-compact",
  }[density];
  const descriptionClassName = {
    spacious: "lg:line-clamp-3",
    default: "lg:line-clamp-2",
    compact: "lg:line-clamp-2",
    ultraCompact: "lg:line-clamp-1",
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
    spacious: "cafe-a-menu-description-size-spacious",
    default: "cafe-a-menu-description-size-default",
    compact: "cafe-a-menu-description-size-compact",
    ultraCompact: "cafe-a-menu-description-size-ultra-compact",
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
        {metaText && <p className={`menu-font-en cafe-a-menu-meta mb-0.5 break-words font-medium uppercase leading-snug text-[#333333] ${metaClassName}`}>{metaText}</p>}
        {item.description && (
          <p className={`cafe-a-description-text cafe-a-menu-description break-keep text-[#3f4945] ${descriptionTextClassName} ${descriptionClassName}`}>{item.description}</p>
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
        {capabilities.originInfo && item.origin_info && <p className="cafe-a-description-text cafe-a-menu-description cafe-a-menu-description-size-default mt-2 line-clamp-2 break-words text-[#707975]">원산지 {item.origin_info}</p>}
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
  density,
  customBadgeStyles,
  desktopClassName = "",
}: {
  data: PublicMenuTemplateProps;
  featuredItem: MenuItem | null;
  capabilities: TemplateCapabilities;
  density: MenuLayoutDensity;
  customBadgeStyles: unknown;
  desktopClassName?: string;
}) {
  const price = featuredItem
    ? getItemPriceDisplay(featuredItem, data.priceOptions, capabilities, { showOptionLabel: false, dedupeSamePrices: true })
    : null;
  const featuredBadgeLabel = featuredItem && capabilities.itemBadges ? getMenuItemBadgeLabel(featuredItem) : "";
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
        <div className="absolute inset-x-0 bottom-0 h-[72%] bg-[linear-gradient(to_top,rgba(0,0,0,0.68)_0%,rgba(0,0,0,0.46)_38%,rgba(0,0,0,0.18)_72%,rgba(0,0,0,0)_100%)]" />
        {featuredItem && (
          <div className="cafe-a-featured-copy absolute bottom-4 left-4 right-4 flex items-end justify-between gap-4 text-white">
            <div className="min-w-0">
              {featuredBadgeLabel ? (
                <div className="cafe-a-featured-badges mb-2 flex max-w-full flex-wrap gap-2">
                  <HeroOverlayBadge item={featuredItem} capabilities={capabilities} templateKey={data.menuSite.template_key} customBadgeStyles={customBadgeStyles} />
                </div>
              ) : null}
              <h2 className="cafe-a-featured-title break-words font-bold leading-tight" data-cafe-a-featured-title="">{featuredItem.name}</h2>
              {featuredItem.description && (
                <p className="cafe-a-description-text cafe-a-featured-description mt-2 break-keep text-white/82 lg:line-clamp-2" data-cafe-a-featured-description="">
                  {featuredItem.description}
                </p>
              )}
            </div>
            {price && <p className="menu-price cafe-a-featured-price shrink-0 whitespace-nowrap font-black leading-none" data-cafe-a-featured-price="">{price}</p>}
          </div>
        )}
      </div>
    </section>
  );
}

function StoreIdentity({
  data,
  capabilities,
  titleClassName,
  logoClassName,
}: {
  data: PublicMenuTemplateProps;
  capabilities: TemplateCapabilities;
  titleClassName: string;
  logoClassName: string;
}) {
  const title = getDisplayName(data.menuSite) || "MenuLink";
  const [logoFailed, setLogoFailed] = useState(false);
  const useLogo = shouldUseBrandLogo(data.menuSite, capabilities) && !logoFailed;

  if (useLogo) {
    return (
      <div className="cafe-a-store-logo-wrap min-w-0" data-cafe-a-store-logo="">
        <img
          src={data.menuSite.logo_url ?? ""}
          alt={`${title} 로고`}
          className={`cafe-a-store-logo ${logoClassName}`}
          onError={() => setLogoFailed(true)}
        />
        <span className="sr-only">{title}</span>
      </div>
    );
  }

  return <h1 className={titleClassName} data-cafe-a-store-title="">{title}</h1>;
}

function CafeAFooterInfo({
  data,
  capabilities,
  placement = "desktop",
}: {
  data: PublicMenuTemplateProps;
  capabilities: TemplateCapabilities;
  placement?: "desktop" | "mobile";
}) {
  const infoRows = getCafeAFooterInfo(data, capabilities);
  if (infoRows.length === 0) return null;

  return (
    <aside
      className={`cafe-a-footer-info break-inside-avoid text-right text-[#58645f] ${
        placement === "desktop" ? "cafe-a-footer-info-anchor hidden lg:block" : "mt-6 md:col-span-2 lg:hidden"
      }`}
      data-cafe-a-footer-info=""
      data-cafe-a-footer-placement={placement}
    >
      <p className="cafe-a-description-text cafe-a-store-description cafe-a-rail-description whitespace-pre-line break-keep">
        {infoRows.join("\n")}
      </p>
    </aside>
  );
}

function HeaderBlock({ data, className = "" }: { data: PublicMenuTemplateProps; className?: string }) {
  const capabilities = getTemplateCapabilities(data.menuSite.template_key);
  const description = data.menuSite.brand_description || data.menuSite.description;

  return (
    <header className={`w-full shrink-0 border-b border-[#191c1b] px-[clamp(24px,4vw,96px)] py-8 lg:px-[var(--board-padding)] lg:py-[var(--board-padding)] ${className}`}>
      <div className="flex min-w-0 items-start justify-between gap-[clamp(16px,2vw,32px)]">
        <div className="min-w-0 max-w-5xl">
          <StoreIdentity
            data={data}
            capabilities={capabilities}
            titleClassName="cafe-a-store-title break-words font-black uppercase leading-[1.02] text-[#191c1b] lg:text-[clamp(42px,5.2vh,52px)]"
            logoClassName="max-h-[72px] max-w-[220px] object-contain"
          />
          {description && <p className="cafe-a-description-text cafe-a-store-description mt-2 break-keep text-[#3f4945]" data-cafe-a-store-description="">{description}</p>}
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
  const capabilities = getTemplateCapabilities(data.menuSite.template_key);
  const description = data.menuSite.brand_description || data.menuSite.description;

  return (
    <aside className="cafe-a-fixed-rail hidden min-w-0 lg:flex lg:flex-col">
      <div className="cafe-a-fixed-rail-copy min-w-0">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <StoreIdentity
            data={data}
            capabilities={capabilities}
            titleClassName="cafe-a-store-title cafe-a-rail-title break-words font-black uppercase leading-[0.96] text-[#191c1b]"
            logoClassName="max-h-[84px] max-w-[210px] object-contain"
          />
          <div className="menu-font-en shrink-0 text-right text-[#191c1b]">
            <MenuLanguageSwitcher currentLocale={data.locale} enabledLocales={data.enabledLocales} />
          </div>
        </div>
        {description && <p className="cafe-a-description-text cafe-a-store-description cafe-a-rail-description mt-3 break-keep text-[#3f4945]" data-cafe-a-store-description="">{description}</p>}
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

// -----------------------------------------------------------------------------
// Basic engine candidate: layout mode renderers for ordered and grouped flows
// -----------------------------------------------------------------------------

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
  footerInfo,
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
  footerInfo?: ReactNode;
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
                      category={category}
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
      {footerInfo}
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
  footerInfo,
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
  footerInfo?: ReactNode;
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
      {balancedColumns.map((column, columnIndex) => (
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
                      category={category}
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
          {columnIndex === balancedColumns.length - 1 && footerInfo}
        </div>
      ))}
    </section>
  );
}

function OrderedBalancedFitMenuGrid({
  pageGroups,
  density,
  data,
  capabilities,
  customBadgeStyles,
  itemStackSpacing,
  outerGridGapClassName,
  menuAreaClassName,
  columns,
  orderedBalancedBreaks,
  fitRef,
  footerInfo,
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
  orderedBalancedBreaks: string;
  fitRef?: RefObject<HTMLElement | null>;
  footerInfo?: ReactNode;
}) {
  const groupOrderByKey = useMemo(
    () => new Map(getFlatMenuGroups(pageGroups).map((group, index) => [getMenuGroupKey(group), index])),
    [pageGroups],
  );
  const orderedBalancedColumns = useMemo(
    () => getOrderedBalancedMenuColumns({ pageGroups, columns, data, capabilities, orderedBalancedBreaks }),
    [capabilities, columns, data, orderedBalancedBreaks, pageGroups],
  );

  return (
    <section
      ref={fitRef}
      className={`cafe-a-fit-menu-grid cafe-a-balanced-menu-grid cafe-a-ordered-balanced-fit-grid min-w-0 content-start md:col-span-2 lg:min-h-0 lg:max-h-full lg:overflow-hidden lg:pr-0 ${outerGridGapClassName} ${menuAreaClassName}`}
      data-cafe-a-fit-menu=""
      data-cafe-a-flow-mode="ordered-balanced"
      data-cafe-a-balanced-grid=""
      data-cafe-a-ordered-balanced-breaks={orderedBalancedBreaks}
    >
      {orderedBalancedColumns.map((column, columnIndex) => (
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
                        category={category}
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
          {columnIndex === orderedBalancedColumns.length - 1 && footerInfo}
          <span aria-hidden="true" className="block h-px w-px opacity-0" data-cafe-a-column-sentinel="" />
        </div>
      ))}
    </section>
  );
}

export default function CafeDesignA(data: PublicMenuTemplateProps) {
  // Basic engine wiring: capabilities, layout mode, visibility, density, and fit state.
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
  const normalizedPreviewLayoutMode = data.mode === "preview" ? data.previewLayoutMode : undefined;
  const layoutMode = (normalizedPreviewLayoutMode ?? savedLayoutMode) as CafeDesignALayoutMode;
  const visiblePageGroups = publicCapabilities.menuPages ? getVisibleMenuPageGroups(data) : [];
  const visibleMenuGroupCount = visiblePageGroups.reduce((count, pageGroup) => count + pageGroup.groups.length, 0);
  const desktopFitBoardRef = useRef<HTMLDivElement | null>(null);
  const desktopFitMenuRef = useRef<HTMLElement | null>(null);
  const [fitState, setFitState] = useState<CafeDesignAFitState>(DEFAULT_FIT_STATE);
  const [orderedBalancedInitialColumns, setOrderedBalancedInitialColumns] = useState(2);
  const [orderedBalancedFitRevision, setOrderedBalancedFitRevision] = useState(0);
  const [orderedBalancedValidationRevision, setOrderedBalancedValidationRevision] = useState(0);
  const [orderedBalancedFinalFillBoost, setOrderedBalancedFinalFillBoost] = useState<CafeDesignAFinalFillBoost>(DEFAULT_ORDERED_BALANCED_FINAL_FILL_BOOST);
  const [orderedFitFinalFillCompensation, setOrderedFitFinalFillCompensation] = useState(DEFAULT_ORDERED_FIT_FINAL_FILL_COMPENSATION);
  const fitStateRef = useRef<CafeDesignAFitState>(DEFAULT_FIT_STATE);
  const orderedBalancedFitCacheRef = useRef<Map<string, CafeDesignAFitState>>(new Map());
  const orderedBalancedRejectedCandidateRef = useRef<Set<string>>(new Set());
  const orderedBalancedRejectedColumnRef = useRef<Set<string>>(new Set());
  const visibleItemCount = data.items.filter((item) => item.visible !== false).length;
  const isDenseOrderedBalanced = isDenseOrderedBalancedMenu(visibleMenuGroupCount, visibleItemCount);
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
  const footerInfo = <CafeAFooterInfo data={data} capabilities={capabilities} />;

  // Basic engine fit state: desktop candidate selection and validation feed these values into the CafeA shell.
  const baseRenderFitState = useMemo<CafeDesignAFitState>(() => {
    if (layoutMode !== "orderedBalancedFit" || fitState.orderedBalancedFingerprint) return fitState;

    return {
      ...fitState,
      columns: isDenseOrderedBalanced
        ? 3
        : Math.max(1, Math.min(orderedBalancedInitialColumns, visibleMenuGroupCount || orderedBalancedInitialColumns)),
    };
  }, [fitState, isDenseOrderedBalanced, layoutMode, orderedBalancedInitialColumns, visibleMenuGroupCount]);
  const renderFitState = useMemo<CafeDesignAFitState>(
    () => (layoutMode === "orderedBalancedFit" ? getBoostedFitState(baseRenderFitState, orderedBalancedFinalFillBoost) : baseRenderFitState),
    [baseRenderFitState, layoutMode, orderedBalancedFinalFillBoost],
  );
  const fitStyle = useMemo(() => getFitStyle(baseRenderFitState, renderFitState), [baseRenderFitState, renderFitState]);
  const orderedFitFillStyle = useMemo<CSSProperties>(
    () =>
      layoutMode === "orderedFit"
        ? ({
            "--ordered-fit-final-fill-compensation": String(orderedFitFinalFillCompensation),
          } as CSSProperties)
        : {},
    [layoutMode, orderedFitFinalFillCompensation],
  );
  const fitGapStyle = useMemo(() => getFitGapStyle(density), [density]);
  const orderedBalancedPriceOptionSignature = useMemo(
    () =>
      data.priceOptions
        .filter((option) => option.visible !== false)
        .map((option) => `${option.menu_item_id}:${option.label}:${option.sort_order}`)
        .sort()
        .join(","),
    [data.priceOptions],
  );

  useEffect(() => {
    fitStateRef.current = fitState;
  }, [fitState, layoutMode]);

  useLayoutEffect(() => {
    if (layoutMode !== "orderedBalancedFit") return;
    const boardElement = desktopFitBoardRef.current;
    const menuElement = desktopFitMenuRef.current;
    if (!boardElement || !menuElement) return;

    const syncInitialColumns = () => {
      const measuredWidth = menuElement.clientWidth || boardElement.clientWidth;
      const nextColumns = isDenseOrderedBalanced ? 3 : measuredWidth >= 1100 ? 3 : 2;
      setOrderedBalancedInitialColumns((currentColumns) => (currentColumns === nextColumns ? currentColumns : nextColumns));
    };

    syncInitialColumns();
    const resizeObserver = new ResizeObserver(syncInitialColumns);
    resizeObserver.observe(boardElement);
    resizeObserver.observe(menuElement);

    return () => {
      resizeObserver.disconnect();
    };
  }, [isDenseOrderedBalanced, layoutMode]);

  useEffect(() => {
    const boardElement = desktopFitBoardRef.current;
    const menuElement = desktopFitMenuRef.current;
    if (!boardElement || !menuElement) return;
    const fitBoardElement = boardElement;
    const fitMenuElement = menuElement;

    let frameId = 0;
    let cancelled = false;
    let measurePending = false;
    let isMeasuring = false;
    let fontReadyScheduled = false;

    function updateFitState(nextState: CafeDesignAFitState) {
      setFitState((currentState) => {
        const resolvedState =
          areFitStatesEqual(currentState, nextState) ||
          (layoutMode === "orderedBalancedFit" && shouldKeepOrderedBalancedCurrentState(currentState, nextState))
            ? currentState
            : nextState;
        fitStateRef.current = resolvedState;
        return resolvedState;
      });
    }

    function applyFitCandidate(columns: number, fontScale: number) {
      const gapScale =
        layoutMode === "orderedFit"
          ? getOrderedFitGapScale(fontScale, fitMenuElement.clientWidth)
          : layoutMode === "orderedBalancedFit"
            ? getOrderedBalancedFitGapScale(fontScale, fitMenuElement.clientWidth)
            : getBalancedFitGapScale(fontScale, fitMenuElement.clientWidth);

      fitBoardElement.style.setProperty("--fit-columns", String(columns));
      fitBoardElement.style.setProperty("--fit-font-scale", String(fontScale));
      fitBoardElement.style.setProperty("--fit-gap-scale", String(gapScale));
      fitBoardElement.style.setProperty("--fit-menu-font-scale", String(fontScale));
      fitBoardElement.style.setProperty("--fit-menu-gap-scale", String(gapScale));
      if (layoutMode === "orderedFit") {
        fitBoardElement.style.setProperty("--ordered-fit-menu-visual-scale", "1");
        fitBoardElement.style.setProperty("--ordered-fit-final-fill-compensation", "1");
        fitBoardElement.style.setProperty("--ordered-fit-item-rhythm-scale", "1");
        fitBoardElement.style.setProperty("--ordered-fit-category-rhythm-scale", "1");
        fitBoardElement.style.setProperty("--ordered-fit-text-rhythm-scale", "1");
      } else if (layoutMode === "orderedBalancedFit") {
        fitBoardElement.style.setProperty("--ordered-balanced-menu-visual-scale", "1");
      }
    }

    function getFitStateFromMeasurement(
      columns: number,
      fontScale: number,
      status: CafeDesignAFitState["status"],
      measurement: CafeDesignAFitMeasurement,
      balancedVariant: CafeDesignABalancedVariant = DEFAULT_BALANCED_VARIANT,
      orderedBalancedBreaks = "",
      orderedBalancedFingerprint = "",
    ): CafeDesignAFitState {
      return {
        columns,
        fontScale,
        gapScale:
          layoutMode === "orderedFit"
            ? getOrderedFitGapScale(fontScale, fitMenuElement.clientWidth)
            : layoutMode === "orderedBalancedFit"
              ? getOrderedBalancedFitGapScale(fontScale, fitMenuElement.clientWidth)
              : getBalancedFitGapScale(fontScale, fitMenuElement.clientWidth),
        balancedVariant,
        orderedBalancedBreaks,
        orderedBalancedFingerprint,
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
        boardInnerRight: measurement.boardInnerRight,
        rightmostMenuNameRight: measurement.rightmostMenuNameRight,
        rightmostSecondaryRight: measurement.rightmostSecondaryRight,
        rightmostPriceRight: measurement.rightmostPriceRight,
        rightmostChipRight: measurement.rightmostChipRight,
        rightmostCategoryRight: measurement.rightmostCategoryRight,
        rightSafetyGap: measurement.rightSafetyGap,
        overflow: measurement.overflow,
      };
    }

    function getOrderedFitCandidateColumnWidth(columns: number) {
      const menuRect = fitMenuElement.getBoundingClientRect();
      const columnGap = Number.parseFloat(window.getComputedStyle(fitMenuElement).columnGap || "0") || 0;
      return (menuRect.width - columnGap * Math.max(0, columns - 1)) / Math.max(1, columns);
    }

    function getOrderedFitScore(columns: number, fontScale: number, measurement: CafeDesignAFitMeasurement) {
      if (measurement.measuredColumns === 0) return Number.POSITIVE_INFINITY;

      const primaryBottomGap = measurement.primaryBottomGap;
      const candidateColumnWidth = getOrderedFitCandidateColumnWidth(columns);
      const hasReadableExtraColumn = columns >= 4 && candidateColumnWidth >= ORDERED_FIT_MIN_READABLE_COLUMN_WIDTH_PX;
      const canUseReadableExtraColumn = fitMenuElement.getBoundingClientRect().width >= 820;
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
      const excessiveColumnPenalty = hasReadableExtraColumn && fontScale >= ORDERED_FIT_COLUMN_EXPANSION_FONT_FLOOR
        ? columns * 0.8
        : Math.max(0, columns - 3) * 28 + columns * 1.4;
      const narrowExtraColumnPenalty = columns >= 4 ? Math.max(0, ORDERED_FIT_MIN_READABLE_COLUMN_WIDTH_PX - candidateColumnWidth) * 18 : 0;
      const readableExtraColumnCredit = hasReadableExtraColumn && fontScale >= ORDERED_FIT_COLUMN_EXPANSION_FONT_FLOOR ? 160 : 0;
      const missedReadableExtraColumnPenalty =
        columns < 4 && canUseReadableExtraColumn ? Math.max(0, ORDERED_FIT_COLUMN_EXPANSION_FONT_FLOOR - fontScale) * 1600 : 0;
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
        narrowExtraColumnPenalty +
        missedReadableExtraColumnPenalty +
        smallTextPenalty +
        qualityTextPenalty +
        readableTextPenalty +
        tinyTextPenalty +
        veryLargeTextPenalty -
        readableExtraColumnCredit
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

    function getOrderedBalancedFitScore(
      columns: number,
      fontScale: number,
      measurement: CafeDesignAFitMeasurement,
      simulatedColumns: CafeDesignABalancedSimulatedColumn[],
      blockCount: number,
    ) {
      if (measurement.measuredColumns === 0) return Number.POSITIVE_INFINITY;

      const columnFillMetrics = getOrderedBalancedColumnFillMetrics(simulatedColumns, measurement.flowHeight);
      const longestVisibleGap = measurement.visibleContentBottomGap;
      const tightGapPenalty =
        longestVisibleGap < ORDERED_BALANCED_TARGET_MIN_VISIBLE_GAP
          ? (ORDERED_BALANCED_TARGET_MIN_VISIBLE_GAP - longestVisibleGap) * 1800
          : 0;
      const targetGapPenalty =
        longestVisibleGap > ORDERED_BALANCED_TARGET_MAX_VISIBLE_GAP
          ? Math.max(0, longestVisibleGap - ORDERED_BALANCED_TARGET_MAX_VISIBLE_GAP) * 980 +
            Math.max(0, longestVisibleGap - 12) * 2200 +
            Math.max(0, longestVisibleGap - 24) * 3200
          : Math.abs(longestVisibleGap - ORDERED_BALANCED_TARGET_VISIBLE_GAP) * 36;
      const itemGapPenalty = Math.max(0, measurement.visibleItemBottomGap - ORDERED_BALANCED_TARGET_MAX_VISIBLE_GAP) * 240;
      const textGapPenalty = Math.max(0, measurement.visibleTextBottomGap - 10) * 120;
      const priceGapPenalty = Math.max(0, measurement.visiblePriceBottomGap - 12) * 90;
      const averageFillPenalty = Math.max(0, 0.88 - measurement.visibleAverageFillRatio) * 1650;
      const minFillPenalty =
        Math.max(0, 0.72 - measurement.visibleMinFillRatio) * 2400 +
        Math.max(0, 0.52 - measurement.visibleMinFillRatio) * 12000 +
        Math.max(0, 0.34 - measurement.visibleMinFillRatio) * 24000;
      const firstColumnFillPenalty =
        Math.max(0, 0.82 - measurement.primaryFillRatio) * 3600 +
        Math.max(0, 0.9 - measurement.primaryFillRatio) * 1400 +
        Math.max(0, measurement.primaryBottomGap - 28) * 26;
      const secondColumnFillPenalty =
        columns >= 3
          ? Math.max(0, 0.74 - columnFillMetrics.secondFillRatio) * 4200 +
            Math.max(0, 0.82 - columnFillMetrics.secondFillRatio) * 1900 +
            Math.max(0, columnFillMetrics.secondGap - 32) * 20 +
            Math.max(0, columnFillMetrics.secondGap - 56) * 34
          : Math.max(0, 0.74 - columnFillMetrics.secondFillRatio) * 1350 + Math.max(0, columnFillMetrics.secondGap - 96) * 8;
      const firstColumnIsShortestPenalty =
        columnFillMetrics.firstHeight <= columnFillMetrics.minHeight + 1 &&
        columnFillMetrics.maxHeight - columnFillMetrics.firstHeight > 40
          ? 14000 + (columnFillMetrics.maxHeight - columnFillMetrics.firstHeight) * 48
          : 0;
      const leftRhythmPenalty =
        Math.max(0, columnFillMetrics.secondHeight - columnFillMetrics.firstHeight - 40) * 26 +
        Math.max(0, columnFillMetrics.lastHeight - columnFillMetrics.firstHeight - 70) * 14;
      const singletonMiddlePenalty =
        columns >= 3 && columnFillMetrics.secondBlockCount <= 1 && columnFillMetrics.secondFillRatio < 0.84
          ? 1900 + Math.max(0, 0.84 - columnFillMetrics.secondFillRatio) * 2600 + Math.max(0, columnFillMetrics.secondGap - 40) * 18
          : 0;
      const fillVariancePenalty = columnFillMetrics.fillVariance * 3600;
      const lastColumnPenalty =
        Math.max(0, 0.76 - measurement.visibleLastColumnFillRatio) * 2200 +
        Math.max(0, 0.52 - measurement.visibleLastColumnFillRatio) * 12000;
      const veryShortLastColumnPenalty =
        Math.max(0, 0.62 - measurement.visibleLastColumnFillRatio) * 6000 +
        Math.max(0, 0.4 - measurement.visibleLastColumnFillRatio) * 5000;
      const emptyColumnPenalty = Math.max(0, columns - measurement.measuredColumns) * 420;
      const sparseColumnPenalty = Math.max(0, 1.6 - blockCount / columns) * 120;
      const excessiveColumnPenalty = Math.max(0, columns - 3) * 120 + columns * 1.4;
      const tinyTextPenalty = Math.max(0, ORDERED_BALANCED_MIN_QUALITY_FONT_SCALE - fontScale) * 2200;
      const readableTextPenalty = Math.max(0, 0.84 - fontScale) * 360;
      const qualityTextPenalty = Math.max(0, 0.92 - fontScale) * 70;
      const veryLargeTextPenalty = Math.max(0, fontScale - 1.24) * 24;
      const gapScale = getOrderedBalancedFitGapScale(fontScale, fitMenuElement.clientWidth);
      const crampedGapPenalty = Math.max(0, 0.64 - gapScale) * 1200;

      return (
        tightGapPenalty +
        targetGapPenalty +
        itemGapPenalty +
        textGapPenalty +
        priceGapPenalty +
        averageFillPenalty +
        minFillPenalty +
        firstColumnFillPenalty +
        secondColumnFillPenalty +
        firstColumnIsShortestPenalty +
        leftRhythmPenalty +
        singletonMiddlePenalty +
        fillVariancePenalty +
        lastColumnPenalty +
        veryShortLastColumnPenalty +
        emptyColumnPenalty +
        sparseColumnPenalty +
        excessiveColumnPenalty +
        tinyTextPenalty +
        readableTextPenalty +
        qualityTextPenalty +
        veryLargeTextPenalty +
        crampedGapPenalty
      );
    }

    function getOrderedBalancedFallbackScore(
      columns: number,
      fontScale: number,
      measurement: CafeDesignAFitMeasurement,
      blockCount: number,
    ) {
      const overflowPenalty = measurement.overflow ? 100000 + Math.abs(Math.min(0, measurement.visibleContentBottomGap)) * 500 : 0;
      const visibleGapPenalty = Math.max(0, measurement.visibleContentBottomGap - 12) * 72;
      const readableTextPenalty = Math.max(0, ORDERED_BALANCED_MIN_QUALITY_FONT_SCALE - fontScale) * 650;
      const lastColumnPenalty = Math.max(0, 0.62 - measurement.visibleLastColumnFillRatio) * 260;
      const sparseColumnPenalty = Math.max(0, 1.6 - blockCount / columns) * 80;

      return overflowPenalty + visibleGapPenalty + readableTextPenalty + lastColumnPenalty + sparseColumnPenalty + columns * 2;
    }

    function getOrderedBalancedFingerprint(blockMeasurements: CafeDesignABalancedBlockMeasurement[]) {
      const fontStatus = "fonts" in document ? document.fonts.status : "unsupported";
      const categorySignature = blockMeasurements.map((block) => block.key).join(",");
      const boardRect = fitBoardElement.getBoundingClientRect();
      const menuRect = fitMenuElement.getBoundingClientRect();
      const visualViewport = window.visualViewport;

      return [
        layoutMode,
        getOrderedBalancedBucketedMetric(window.innerWidth, ORDERED_BALANCED_VIEWPORT_BUCKET),
        getOrderedBalancedBucketedMetric(window.innerHeight, ORDERED_BALANCED_VIEWPORT_BUCKET),
        getOrderedBalancedBucketedMetric(visualViewport?.width ?? window.innerWidth, ORDERED_BALANCED_VIEWPORT_BUCKET),
        getOrderedBalancedBucketedMetric(visualViewport?.height ?? window.innerHeight, ORDERED_BALANCED_VIEWPORT_BUCKET),
        Math.round((window.devicePixelRatio || 1) * 20) / 20,
        Math.round((visualViewport?.scale ?? 1) * 20) / 20,
        getOrderedBalancedBucketedMetric(boardRect.width, ORDERED_BALANCED_SIZE_BUCKET),
        getOrderedBalancedBucketedMetric(boardRect.height, ORDERED_BALANCED_SIZE_BUCKET),
        getOrderedBalancedBucketedMetric(menuRect.width, ORDERED_BALANCED_SIZE_BUCKET),
        density,
        visibleItemCount,
        visibleMenuGroupCount,
        categorySignature,
        orderedBalancedPriceOptionSignature,
        fontStatus,
      ].join("|");
    }

    function getOrderedBalancedViewportColumnRejectKey(columns: number) {
      const boardRect = fitBoardElement.getBoundingClientRect();
      const menuRect = fitMenuElement.getBoundingClientRect();
      const visualViewport = window.visualViewport;

      return [
        "viewport",
        layoutMode,
        getOrderedBalancedBucketedMetric(window.innerWidth, ORDERED_BALANCED_VIEWPORT_BUCKET),
        getOrderedBalancedBucketedMetric(window.innerHeight, ORDERED_BALANCED_VIEWPORT_BUCKET),
        getOrderedBalancedBucketedMetric(visualViewport?.width ?? window.innerWidth, ORDERED_BALANCED_VIEWPORT_BUCKET),
        getOrderedBalancedBucketedMetric(visualViewport?.height ?? window.innerHeight, ORDERED_BALANCED_VIEWPORT_BUCKET),
        Math.round((window.devicePixelRatio || 1) * 20) / 20,
        Math.round((visualViewport?.scale ?? 1) * 20) / 20,
        getOrderedBalancedBucketedMetric(boardRect.width, ORDERED_BALANCED_SIZE_BUCKET),
        getOrderedBalancedBucketedMetric(boardRect.height, ORDERED_BALANCED_SIZE_BUCKET),
        getOrderedBalancedBucketedMetric(menuRect.width, ORDERED_BALANCED_SIZE_BUCKET),
        density,
        visibleItemCount,
        visibleMenuGroupCount,
        `columns:${columns}`,
      ].join("|");
    }

    function getOrderedBalancedColumnRejectKeys(orderedBalancedFingerprint: string, columns: number) {
      const keys = [getOrderedBalancedViewportColumnRejectKey(columns)];
      if (orderedBalancedFingerprint) keys.push(`${orderedBalancedFingerprint}|columns:${columns}`);
      return keys;
    }

    function isOrderedBalancedColumnRejected(orderedBalancedFingerprint: string, columns: number) {
      return getOrderedBalancedColumnRejectKeys(orderedBalancedFingerprint, columns).some((key) =>
        orderedBalancedRejectedColumnRef.current.has(key)
      );
    }

    function getOrderedBalancedEffectiveColumnCandidates(columnCandidates: number[], orderedBalancedFingerprint: string) {
      const rejectedTwoColumns = isOrderedBalancedColumnRejected(orderedBalancedFingerprint, 2);
      const candidates = columnCandidates.filter((columns) => !isOrderedBalancedColumnRejected(orderedBalancedFingerprint, columns));
      if (rejectedTwoColumns && visibleMenuGroupCount >= 3 && !candidates.includes(3) && !isOrderedBalancedColumnRejected(orderedBalancedFingerprint, 3)) {
        return [3, ...candidates];
      }
      return candidates;
    }

    function getOrderedBalancedFitState(columnCandidates: number[]) {
      let selectedState: CafeDesignAFitState | null = null;
      let selectedScore = Number.POSITIVE_INFINITY;
      let fallbackState: CafeDesignAFitState | null = null;
      let fallbackScore = Number.POSITIVE_INFINITY;

      const baseBlockMeasurements = getBalancedBlockMeasurements(fitMenuElement);
      if (baseBlockMeasurements.length === 0) return null;

      const orderedBalancedFingerprint = getOrderedBalancedFingerprint(baseBlockMeasurements);
      const cachedState = orderedBalancedFitCacheRef.current.get(orderedBalancedFingerprint);
      if (
        cachedState &&
        !orderedBalancedRejectedCandidateRef.current.has(getOrderedBalancedCandidateKey(cachedState)) &&
        !isOrderedBalancedColumnRejected(orderedBalancedFingerprint, cachedState.columns)
      ) {
        return cachedState;
      }
      const effectiveColumnCandidates = getOrderedBalancedEffectiveColumnCandidates(columnCandidates, orderedBalancedFingerprint);

      const menuWidth = fitMenuElement.clientWidth;
      const viewportWidth = window.innerWidth;
      const clippingTargetHeight =
        fitMenuElement.clientWidth >= 760
          ? Math.min(fitMenuElement.clientHeight, Math.max(0, getCafeAClippingBottom(fitBoardElement, fitMenuElement) - fitMenuElement.getBoundingClientRect().top))
          : undefined;
      const targetHeight = clippingTargetHeight && clippingTargetHeight > 0 ? clippingTargetHeight : fitMenuElement.clientWidth >= 760 ? fitMenuElement.clientHeight : undefined;
      const fitsWidth = fitMenuElement.scrollWidth <= fitMenuElement.clientWidth + 1;
      const fontScaleCandidates = getOrderedBalancedFitFontScaleCandidates(viewportWidth, menuWidth);

      for (const columns of effectiveColumnCandidates) {
        if (isOrderedBalancedColumnRejected(orderedBalancedFingerprint, columns)) continue;
        for (const fontScale of fontScaleCandidates) {
          applyFitCandidate(columns, fontScale);
          const blockMeasurements = getBalancedBlockMeasurements(fitMenuElement);
          const simulatedColumns = getOrderedBalancedContiguousColumns(blockMeasurements, columns, targetHeight);
          const orderedBalancedBreaks = getOrderedBalancedBreaksFromColumns(simulatedColumns);
          const measurement = getBalancedMeasurementFromColumns({
            boardElement: fitBoardElement,
            menuElement: fitMenuElement,
            columns: simulatedColumns,
            expectedColumns: columns,
            includeDomOverflow: false,
            cropTolerance: ORDERED_BALANCED_CROP_TOLERANCE,
            includeClippingBottom: true,
          });
          const candidateState = getFitStateFromMeasurement(
            columns,
            fontScale,
            measurement.overflow || fontScale < ORDERED_BALANCED_MIN_QUALITY_FONT_SCALE ? "warning" : "fit",
            measurement,
            DEFAULT_BALANCED_VARIANT,
            orderedBalancedBreaks,
            orderedBalancedFingerprint,
          );
          if (columns !== 2 && orderedBalancedRejectedCandidateRef.current.has(getOrderedBalancedCandidateKey(candidateState))) continue;
          const nextFallbackScore = getOrderedBalancedFallbackScore(columns, fontScale, measurement, baseBlockMeasurements.length);

          if (
            fitsWidth &&
            !measurement.overflow &&
            (!fallbackState ||
              isOrderedBalancedCandidateBetter({
                candidateScore: nextFallbackScore,
                candidateState,
                currentScore: fallbackScore,
                currentState: fallbackState,
              }))
          ) {
            fallbackScore = nextFallbackScore;
            fallbackState = candidateState;
          }

          if (!fitsWidth || measurement.overflow || fontScale < ORDERED_BALANCED_MIN_QUALITY_FONT_SCALE) continue;
          if (measurement.visibleAverageFillRatio < 0.56 || measurement.visibleMinFillRatio < 0.25) continue;

          const score = getOrderedBalancedFitScore(columns, fontScale, measurement, simulatedColumns, baseBlockMeasurements.length);
          if (
            !selectedState ||
            isOrderedBalancedCandidateBetter({
              candidateScore: score,
              candidateState,
              currentScore: selectedScore,
              currentState: selectedState,
            })
          ) {
            selectedScore = score;
            selectedState = candidateState;
          }
        }
      }

      const nextState = selectedState ?? fallbackState;
      if (!nextState) return null;
      const currentState = fitStateRef.current;
      if (
        !orderedBalancedRejectedCandidateRef.current.has(getOrderedBalancedCandidateKey(currentState)) &&
        shouldKeepOrderedBalancedSettledCandidate(currentState, nextState)
      ) {
        return currentState;
      }
      if (!nextState.overflow && nextState.orderedBalancedFingerprint) {
        orderedBalancedFitCacheRef.current.set(nextState.orderedBalancedFingerprint, nextState);
      }

      return nextState;
    }

    function measureFit() {
      measurePending = false;
      if (cancelled || isMeasuring) return;
      isMeasuring = true;

      try {
        const isDesktopFitActive = window.matchMedia("(min-width: 1024px)").matches;
        if (!isDesktopFitActive) {
          updateFitState(DEFAULT_FIT_STATE);
          return;
        }

        if (layoutMode === "orderedBalancedFit" && "fonts" in document && document.fonts.status !== "loaded") {
          if (!fontReadyScheduled) {
            fontReadyScheduled = true;
            void document.fonts.ready.then(() => {
              if (!cancelled) scheduleMeasure();
            });
          }
          return;
        }

        const menuWidth = fitMenuElement.clientWidth;
        if (menuWidth <= 0 || fitMenuElement.clientHeight <= 0) return;

        const previousColumns = fitBoardElement.style.getPropertyValue("--fit-columns");
        const previousFontScale = fitBoardElement.style.getPropertyValue("--fit-font-scale");
        const previousGapScale = fitBoardElement.style.getPropertyValue("--fit-gap-scale");
        const previousMenuFontScale = fitBoardElement.style.getPropertyValue("--fit-menu-font-scale");
        const previousMenuGapScale = fitBoardElement.style.getPropertyValue("--fit-menu-gap-scale");
        const previousOrderedFitMenuVisualScale = fitBoardElement.style.getPropertyValue("--ordered-fit-menu-visual-scale");
        const previousOrderedBalancedMenuVisualScale = fitBoardElement.style.getPropertyValue("--ordered-balanced-menu-visual-scale");
        const previousOrderedFitFinalFillCompensation = fitBoardElement.style.getPropertyValue("--ordered-fit-final-fill-compensation");
        const previousOrderedFitItemRhythmScale = fitBoardElement.style.getPropertyValue("--ordered-fit-item-rhythm-scale");
        const previousOrderedFitCategoryRhythmScale = fitBoardElement.style.getPropertyValue("--ordered-fit-category-rhythm-scale");
        const previousOrderedFitTextRhythmScale = fitBoardElement.style.getPropertyValue("--ordered-fit-text-rhythm-scale");
        const columnCandidates =
          layoutMode === "orderedFit"
            ? getOrderedFitColumnCandidates(menuWidth)
            : layoutMode === "orderedBalancedFit"
              ? getOrderedBalancedFitColumnCandidates(menuWidth, visibleMenuGroupCount, visibleItemCount)
              : getBalancedFitColumnCandidates(menuWidth, visibleMenuGroupCount);
        let selectedState: CafeDesignAFitState | null = null;

        if (layoutMode === "orderedFit") {
          selectedState = getOrderedFitState(columnCandidates);
        } else if (layoutMode === "orderedBalancedFit") {
          selectedState = getOrderedBalancedFitState(columnCandidates);
        } else {
          selectedState = getBalancedFitState(columnCandidates);
        }

        if (!selectedState) {
          const fallbackFontScale =
            layoutMode === "orderedFit"
              ? ORDERED_FIT_FONT_SCALE_CANDIDATES[ORDERED_FIT_FONT_SCALE_CANDIDATES.length - 1] ?? 0.64
              : layoutMode === "orderedBalancedFit"
                ? ORDERED_BALANCED_FIT_FONT_SCALE_CANDIDATES[ORDERED_BALANCED_FIT_FONT_SCALE_CANDIDATES.length - 1] ?? 0.64
                : FIT_FONT_SCALE_CANDIDATES[FIT_FONT_SCALE_CANDIDATES.length - 1] ?? 0.64;
          const effectiveFallbackColumnCandidates =
            layoutMode === "orderedBalancedFit" ? getOrderedBalancedEffectiveColumnCandidates(columnCandidates, "") : columnCandidates;
          const fallbackColumns = effectiveFallbackColumnCandidates[0] ?? columnCandidates[0] ?? DEFAULT_FIT_STATE.columns;
          applyFitCandidate(fallbackColumns, fallbackFontScale);
          const orderedBalancedFallbackBlocks = layoutMode === "orderedBalancedFit" ? getBalancedBlockMeasurements(fitMenuElement) : [];
          const orderedBalancedFallbackColumns =
            layoutMode === "orderedBalancedFit"
              ? getOrderedBalancedContiguousColumns(
                  orderedBalancedFallbackBlocks,
                  fallbackColumns,
                  fitMenuElement.clientWidth >= 760
                    ? Math.min(fitMenuElement.clientHeight, Math.max(0, getCafeAClippingBottom(fitBoardElement, fitMenuElement) - fitMenuElement.getBoundingClientRect().top))
                    : undefined,
                )
              : [];
          const orderedBalancedFallbackMeasurement =
            layoutMode === "orderedBalancedFit"
              ? getBalancedMeasurementFromColumns({
                  boardElement: fitBoardElement,
                  menuElement: fitMenuElement,
                  columns: orderedBalancedFallbackColumns,
                  expectedColumns: fallbackColumns,
                  includeDomOverflow: false,
                  cropTolerance: ORDERED_BALANCED_CROP_TOLERANCE,
                  includeClippingBottom: true,
                })
              : null;
          selectedState = getFitStateFromMeasurement(
            fallbackColumns,
            fallbackFontScale,
            "warning",
            layoutMode === "orderedFit"
              ? measureCafeAOrderedFit(fitBoardElement, fitMenuElement, fallbackColumns)
              : layoutMode === "orderedBalancedFit"
                ? orderedBalancedFallbackMeasurement ?? measureCafeABalancedFit(fitBoardElement, fitMenuElement, fallbackColumns)
                : measureCafeABalancedFit(fitBoardElement, fitMenuElement, fallbackColumns),
            DEFAULT_BALANCED_VARIANT,
            layoutMode === "orderedBalancedFit" ? getOrderedBalancedBreaksFromColumns(orderedBalancedFallbackColumns) : "",
            "",
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
        if (previousMenuFontScale) {
          fitBoardElement.style.setProperty("--fit-menu-font-scale", previousMenuFontScale);
        } else {
          fitBoardElement.style.removeProperty("--fit-menu-font-scale");
        }
        if (previousMenuGapScale) {
          fitBoardElement.style.setProperty("--fit-menu-gap-scale", previousMenuGapScale);
        } else {
          fitBoardElement.style.removeProperty("--fit-menu-gap-scale");
        }
        if (previousOrderedFitMenuVisualScale) {
          fitBoardElement.style.setProperty("--ordered-fit-menu-visual-scale", previousOrderedFitMenuVisualScale);
        } else {
          fitBoardElement.style.removeProperty("--ordered-fit-menu-visual-scale");
        }
        if (previousOrderedBalancedMenuVisualScale) {
          fitBoardElement.style.setProperty("--ordered-balanced-menu-visual-scale", previousOrderedBalancedMenuVisualScale);
        } else {
          fitBoardElement.style.removeProperty("--ordered-balanced-menu-visual-scale");
        }
        if (previousOrderedFitFinalFillCompensation) {
          fitBoardElement.style.setProperty("--ordered-fit-final-fill-compensation", previousOrderedFitFinalFillCompensation);
        } else {
          fitBoardElement.style.removeProperty("--ordered-fit-final-fill-compensation");
        }
        if (previousOrderedFitItemRhythmScale) {
          fitBoardElement.style.setProperty("--ordered-fit-item-rhythm-scale", previousOrderedFitItemRhythmScale);
        } else {
          fitBoardElement.style.removeProperty("--ordered-fit-item-rhythm-scale");
        }
        if (previousOrderedFitCategoryRhythmScale) {
          fitBoardElement.style.setProperty("--ordered-fit-category-rhythm-scale", previousOrderedFitCategoryRhythmScale);
        } else {
          fitBoardElement.style.removeProperty("--ordered-fit-category-rhythm-scale");
        }
        if (previousOrderedFitTextRhythmScale) {
          fitBoardElement.style.setProperty("--ordered-fit-text-rhythm-scale", previousOrderedFitTextRhythmScale);
        } else {
          fitBoardElement.style.removeProperty("--ordered-fit-text-rhythm-scale");
        }
        updateFitState(selectedState);
      } finally {
        isMeasuring = false;
      }
    }

    function scheduleMeasure() {
      if (cancelled || isMeasuring) return;
      if (measurePending) return;
      measurePending = true;
      window.cancelAnimationFrame(frameId);
      if (layoutMode === "orderedBalancedFit") {
        frameId = window.requestAnimationFrame(() => {
          frameId = window.requestAnimationFrame(measureFit);
        });
        return;
      }

      frameId = window.requestAnimationFrame(measureFit);
    }

    const resizeObserver = new ResizeObserver(scheduleMeasure);
    resizeObserver.observe(fitBoardElement);
    resizeObserver.observe(fitMenuElement);
    scheduleMeasure();

    const handleViewportChange = () => {
      if (layoutMode === "orderedBalancedFit") {
        orderedBalancedFitCacheRef.current.clear();
        setOrderedBalancedValidationRevision((revision) => revision + 1);
      }
      scheduleMeasure();
    };
    const getViewportSignature = () => {
      const visualViewport = window.visualViewport;
      return [
        window.innerWidth,
        window.innerHeight,
        visualViewport?.width ?? window.innerWidth,
        visualViewport?.height ?? window.innerHeight,
        visualViewport?.scale ?? 1,
        visualViewport?.offsetTop ?? 0,
        visualViewport?.offsetLeft ?? 0,
      ].map((value) => Math.round(value * 100) / 100).join("|");
    };
    let viewportSignature = getViewportSignature();
    const viewportPollId =
      layoutMode === "orderedBalancedFit"
        ? window.setInterval(() => {
            const nextViewportSignature = getViewportSignature();
            if (nextViewportSignature === viewportSignature) return;
            viewportSignature = nextViewportSignature;
            handleViewportChange();
          }, 250)
        : 0;
    window.addEventListener("resize", handleViewportChange);
    window.visualViewport?.addEventListener("resize", handleViewportChange);
    window.visualViewport?.addEventListener("scroll", handleViewportChange);

    if ("fonts" in document && !fontReadyScheduled) {
      fontReadyScheduled = true;
      void document.fonts.ready.then(() => {
        if (!cancelled) scheduleMeasure();
      });
    }

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleViewportChange);
      window.visualViewport?.removeEventListener("resize", handleViewportChange);
      window.visualViewport?.removeEventListener("scroll", handleViewportChange);
      if (viewportPollId) window.clearInterval(viewportPollId);
      resizeObserver.disconnect();
    };
  }, [
    density,
    hasCoverSection,
    layoutMode,
    orderedBalancedFitRevision,
    orderedBalancedPriceOptionSignature,
    orderedBalancedValidationRevision,
    visibleItemCount,
    visibleMenuGroupCount,
    visiblePageGroups.length,
  ]);

  useEffect(() => {
    if (layoutMode !== "balanced" && layoutMode !== "orderedBalancedFit") return;
    const boardElement = desktopFitBoardRef.current;
    const menuElement = desktopFitMenuRef.current;
    if (!boardElement || !menuElement) return;
    if (layoutMode === "orderedBalancedFit" && fitState.status === "idle") return;
    const validationBoardElement = boardElement;
    const validationMenuElement = menuElement;

    let cancelled = false;
    function rejectOrderedBalancedColumn(orderedBalancedFingerprint: string, columns: number) {
      const boardRect = validationBoardElement.getBoundingClientRect();
      const menuRect = validationMenuElement.getBoundingClientRect();
      const visualViewport = window.visualViewport;
      const viewportRejectKey = [
        "viewport",
        layoutMode,
        getOrderedBalancedBucketedMetric(window.innerWidth, ORDERED_BALANCED_VIEWPORT_BUCKET),
        getOrderedBalancedBucketedMetric(window.innerHeight, ORDERED_BALANCED_VIEWPORT_BUCKET),
        getOrderedBalancedBucketedMetric(visualViewport?.width ?? window.innerWidth, ORDERED_BALANCED_VIEWPORT_BUCKET),
        getOrderedBalancedBucketedMetric(visualViewport?.height ?? window.innerHeight, ORDERED_BALANCED_VIEWPORT_BUCKET),
        Math.round((window.devicePixelRatio || 1) * 20) / 20,
        Math.round((visualViewport?.scale ?? 1) * 20) / 20,
        getOrderedBalancedBucketedMetric(boardRect.width, ORDERED_BALANCED_SIZE_BUCKET),
        getOrderedBalancedBucketedMetric(boardRect.height, ORDERED_BALANCED_SIZE_BUCKET),
        getOrderedBalancedBucketedMetric(menuRect.width, ORDERED_BALANCED_SIZE_BUCKET),
        density,
        visibleItemCount,
        visibleMenuGroupCount,
        `columns:${columns}`,
      ].join("|");

      orderedBalancedRejectedColumnRef.current.add(viewportRejectKey);
      if (orderedBalancedFingerprint) {
        orderedBalancedRejectedColumnRef.current.add(`${orderedBalancedFingerprint}|columns:${columns}`);
      }
    }

    const frameId = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (cancelled) return;
        let measurement =
          layoutMode === "orderedBalancedFit"
            ? measureCafeABalancedFit(boardElement, menuElement, fitState.columns, false, ORDERED_BALANCED_CROP_TOLERANCE, true)
            : measureCafeABalancedFit(boardElement, menuElement, fitState.columns);
        if (layoutMode === "orderedBalancedFit") {
          const actualCropMeasurement = getCafeAActualDomCropMeasurement(boardElement, menuElement, ORDERED_BALANCED_CROP_TOLERANCE);
          const actualCropDetected = actualCropMeasurement.overflow;
          if (actualCropDetected) {
            const rejectedCandidateKey = getOrderedBalancedCandidateKey(fitState);
            if (fitState.columns === 2) {
              rejectOrderedBalancedColumn(fitState.orderedBalancedFingerprint, 2);
            } else if (!orderedBalancedRejectedCandidateRef.current.has(rejectedCandidateKey)) {
              orderedBalancedRejectedCandidateRef.current.add(rejectedCandidateKey);
            }
            if (fitState.orderedBalancedFingerprint) {
              orderedBalancedFitCacheRef.current.delete(fitState.orderedBalancedFingerprint);
            }
            setOrderedBalancedFitRevision((revision) => revision + 1);
            return;
          }
          if (actualCropMeasurement.bottomGap > 12) {
            const previousFontScale = boardElement.style.getPropertyValue("--fit-font-scale");
            const previousGapScale = boardElement.style.getPropertyValue("--fit-gap-scale");
            const previousMenuFontScale = boardElement.style.getPropertyValue("--fit-menu-font-scale");
            const previousMenuGapScale = boardElement.style.getPropertyValue("--fit-menu-gap-scale");
            const currentFontScale = fitState.fontScale;
            let nextFillState: CafeDesignAFitState | null = null;

            for (const candidateFontScale of ORDERED_BALANCED_FIT_FONT_SCALE_CANDIDATES) {
              if (candidateFontScale <= currentFontScale + ORDERED_BALANCED_SCALE_EPSILON) continue;
              const candidateGapScale = getOrderedBalancedFitGapScale(candidateFontScale, menuElement.clientWidth);
              boardElement.style.setProperty("--fit-font-scale", String(candidateFontScale));
              boardElement.style.setProperty("--fit-gap-scale", String(candidateGapScale));
              boardElement.style.setProperty("--fit-menu-font-scale", String(candidateFontScale));
              boardElement.style.setProperty("--fit-menu-gap-scale", String(candidateGapScale));

              const candidateMeasurement = measureCafeABalancedFit(boardElement, menuElement, fitState.columns, false, ORDERED_BALANCED_CROP_TOLERANCE, true);
              const candidateActualCropMeasurement = getCafeAActualDomCropMeasurement(boardElement, menuElement, ORDERED_BALANCED_CROP_TOLERANCE);
              const candidateCropDetected = candidateActualCropMeasurement.overflow || candidateActualCropMeasurement.bottomGap < ORDERED_BALANCED_TARGET_MIN_VISIBLE_GAP;
              if (candidateCropDetected) continue;
              if (candidateActualCropMeasurement.bottomGap >= actualCropMeasurement.bottomGap - ORDERED_BALANCED_GAP_IMPROVEMENT_EPSILON) continue;

              nextFillState = {
                ...fitState,
                fontScale: candidateFontScale,
                gapScale: getOrderedBalancedFitGapScale(candidateFontScale, menuElement.clientWidth),
                status: "fit",
                measuredColumns: candidateMeasurement.measuredColumns,
                boardInnerHeight: candidateMeasurement.boardInnerHeight,
                flowHeight: candidateMeasurement.flowHeight,
                primaryColumnBottom: candidateMeasurement.primaryColumnBottom,
                primaryBottomGap: candidateMeasurement.primaryBottomGap,
                longestColumnBottom: candidateMeasurement.longestColumnBottom,
                primaryFillRatio: candidateMeasurement.primaryFillRatio,
                averageFillRatio: candidateMeasurement.averageFillRatio,
                minFillRatio: candidateMeasurement.minFillRatio,
                lastColumnFillRatio: candidateMeasurement.lastColumnFillRatio,
                bottomGap: Math.max(candidateMeasurement.bottomGap, roundFitMetric(candidateActualCropMeasurement.bottomGap)),
                contentGap: Math.max(candidateMeasurement.contentGap, roundFitMetric(candidateActualCropMeasurement.bottomGap)),
                itemBoxGap: Math.max(candidateMeasurement.itemBoxGap, roundFitMetric(candidateActualCropMeasurement.bottomGap)),
                textVisualGap: Math.max(candidateMeasurement.textVisualGap, roundFitMetric(candidateActualCropMeasurement.bottomGap)),
                categoryBlockGap: candidateMeasurement.categoryBlockGap,
                visibleItemBottomGap: Math.max(candidateMeasurement.visibleItemBottomGap, roundFitMetric(candidateActualCropMeasurement.bottomGap)),
                visibleTextBottomGap: Math.max(candidateMeasurement.visibleTextBottomGap, roundFitMetric(candidateActualCropMeasurement.bottomGap)),
                visiblePriceBottomGap: Math.max(candidateMeasurement.visiblePriceBottomGap, roundFitMetric(candidateActualCropMeasurement.bottomGap)),
                visibleContentBottomGap: Math.max(candidateMeasurement.visibleContentBottomGap, roundFitMetric(candidateActualCropMeasurement.bottomGap)),
                visibleAverageFillRatio: candidateMeasurement.visibleAverageFillRatio,
                visibleMinFillRatio: candidateMeasurement.visibleMinFillRatio,
                visibleLastColumnFillRatio: candidateMeasurement.visibleLastColumnFillRatio,
                boardInnerRight: candidateActualCropMeasurement.boardInnerRight,
                rightmostMenuNameRight: candidateActualCropMeasurement.rightmostMenuNameRight,
                rightmostSecondaryRight: candidateActualCropMeasurement.rightmostSecondaryRight,
                rightmostPriceRight: candidateActualCropMeasurement.rightmostPriceRight,
                rightmostChipRight: candidateActualCropMeasurement.rightmostChipRight,
                rightmostCategoryRight: candidateActualCropMeasurement.rightmostCategoryRight,
                rightSafetyGap: candidateActualCropMeasurement.rightSafetyGap,
                overflow: false,
              };
              break;
            }

            if (previousFontScale) {
              boardElement.style.setProperty("--fit-font-scale", previousFontScale);
            } else {
              boardElement.style.removeProperty("--fit-font-scale");
            }
            if (previousGapScale) {
              boardElement.style.setProperty("--fit-gap-scale", previousGapScale);
            } else {
              boardElement.style.removeProperty("--fit-gap-scale");
            }
            if (previousMenuFontScale) {
              boardElement.style.setProperty("--fit-menu-font-scale", previousMenuFontScale);
            } else {
              boardElement.style.removeProperty("--fit-menu-font-scale");
            }
            if (previousMenuGapScale) {
              boardElement.style.setProperty("--fit-menu-gap-scale", previousMenuGapScale);
            } else {
              boardElement.style.removeProperty("--fit-menu-gap-scale");
            }
            if (nextFillState) {
              fitStateRef.current = nextFillState;
              setFitState(nextFillState);
              if (nextFillState.orderedBalancedFingerprint) {
                orderedBalancedFitCacheRef.current.set(nextFillState.orderedBalancedFingerprint, nextFillState);
              }
              return;
            }
          }
        }
        if (layoutMode === "orderedBalancedFit" && measurement.overflow) {
          const actualCropMeasurement = getCafeAActualDomCropMeasurement(boardElement, menuElement, ORDERED_BALANCED_CROP_TOLERANCE);
          const actualCropDetected = actualCropMeasurement.overflow;
          if (!actualCropDetected) {
            measurement = {
              ...measurement,
              bottomGap: Math.max(measurement.bottomGap, roundFitMetric(actualCropMeasurement.bottomGap)),
              contentGap: Math.max(measurement.contentGap, roundFitMetric(actualCropMeasurement.bottomGap)),
              itemBoxGap: Math.max(measurement.itemBoxGap, roundFitMetric(actualCropMeasurement.bottomGap)),
              textVisualGap: Math.max(measurement.textVisualGap, roundFitMetric(actualCropMeasurement.bottomGap)),
              visibleItemBottomGap: Math.max(measurement.visibleItemBottomGap, roundFitMetric(actualCropMeasurement.bottomGap)),
              visibleTextBottomGap: Math.max(measurement.visibleTextBottomGap, roundFitMetric(actualCropMeasurement.bottomGap)),
              visiblePriceBottomGap: Math.max(measurement.visiblePriceBottomGap, roundFitMetric(actualCropMeasurement.bottomGap)),
              visibleContentBottomGap: Math.max(measurement.visibleContentBottomGap, roundFitMetric(actualCropMeasurement.bottomGap)),
              overflow: false,
            };
          }
        }
        if (layoutMode === "orderedBalancedFit" && measurement.overflow) {
          const actualCropMeasurement = getCafeAActualDomCropMeasurement(boardElement, menuElement, ORDERED_BALANCED_CROP_TOLERANCE);
          const actualCropDetected = actualCropMeasurement.overflow;
          if (actualCropDetected) {
            const rejectedCandidateKey = getOrderedBalancedCandidateKey(fitState);
            if (fitState.columns === 2) {
              rejectOrderedBalancedColumn(fitState.orderedBalancedFingerprint, 2);
            } else if (!orderedBalancedRejectedCandidateRef.current.has(rejectedCandidateKey)) {
              orderedBalancedRejectedCandidateRef.current.add(rejectedCandidateKey);
            }
            if (fitState.orderedBalancedFingerprint) {
              orderedBalancedFitCacheRef.current.delete(fitState.orderedBalancedFingerprint);
            }
            setOrderedBalancedFitRevision((revision) => revision + 1);
            return;
          }
        }
        if (
          layoutMode === "orderedBalancedFit" &&
          !measurement.overflow &&
          fitState.orderedBalancedFingerprint &&
          !orderedBalancedRejectedCandidateRef.current.has(getOrderedBalancedCandidateKey(fitState))
        ) {
          orderedBalancedFitCacheRef.current.set(fitState.orderedBalancedFingerprint, fitState);
        }

        const nextState: CafeDesignAFitState = {
          ...fitState,
          status: measurement.overflow ? "warning" : layoutMode === "orderedBalancedFit" || fitState.status === "idle" ? "fit" : fitState.status,
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
          boardInnerRight: measurement.boardInnerRight,
          rightmostMenuNameRight: measurement.rightmostMenuNameRight,
          rightmostSecondaryRight: measurement.rightmostSecondaryRight,
          rightmostPriceRight: measurement.rightmostPriceRight,
          rightmostChipRight: measurement.rightmostChipRight,
          rightmostCategoryRight: measurement.rightmostCategoryRight,
          rightSafetyGap: measurement.rightSafetyGap,
          overflow: measurement.overflow,
        };
        if (layoutMode === "orderedBalancedFit" && !measurement.overflow && fitState.orderedBalancedFingerprint) {
          orderedBalancedFitCacheRef.current.set(fitState.orderedBalancedFingerprint, nextState);
        }

        setFitState((currentState) => {
          const resolvedState =
            areFitStatesEqual(currentState, nextState) ||
            (layoutMode === "orderedBalancedFit" && shouldKeepOrderedBalancedCurrentState(currentState, nextState))
              ? currentState
              : nextState;
          fitStateRef.current = resolvedState;
          return resolvedState;
        });
      });
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frameId);
    };
  }, [density, fitState, layoutMode, orderedBalancedValidationRevision, visibleItemCount, visibleMenuGroupCount]);

  useEffect(() => {
    if (layoutMode !== "orderedFit") {
      const resetFrameId = window.requestAnimationFrame(() => {
        setOrderedFitFinalFillCompensation((currentCompensation) =>
          currentCompensation === DEFAULT_ORDERED_FIT_FINAL_FILL_COMPENSATION ? currentCompensation : DEFAULT_ORDERED_FIT_FINAL_FILL_COMPENSATION
        );
      });
      return () => {
        window.cancelAnimationFrame(resetFrameId);
      };
    }

    const boardElement = desktopFitBoardRef.current;
    const menuElement = desktopFitMenuRef.current;
    if (!boardElement || !menuElement) return;

    let cancelled = false;
    const frameId = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (cancelled) return;

        const shouldResetCompensation =
          fitState.status === "idle" ||
          fitState.overflow ||
          !window.matchMedia("(min-width: 1024px)").matches;

        if (shouldResetCompensation) {
          setOrderedFitFinalFillCompensation((currentCompensation) =>
            currentCompensation === DEFAULT_ORDERED_FIT_FINAL_FILL_COMPENSATION ? currentCompensation : DEFAULT_ORDERED_FIT_FINAL_FILL_COMPENSATION
          );
          return;
        }

        const hasPageScroll = () => document.documentElement.scrollHeight > window.innerHeight + 1 || document.body.scrollHeight > window.innerHeight + 1;
        const previousCompensation = boardElement.style.getPropertyValue("--ordered-fit-final-fill-compensation");

        boardElement.style.setProperty("--ordered-fit-final-fill-compensation", String(DEFAULT_ORDERED_FIT_FINAL_FILL_COMPENSATION));
        const baseMeasurement = getCafeAActualDomCropMeasurement(boardElement, menuElement, ORDERED_FIT_MIN_SAFETY_GAP);

        if (
          baseMeasurement.overflow ||
          hasPageScroll() ||
          baseMeasurement.bottomGap < ORDERED_FIT_FINAL_FILL_MIN_GAP ||
          baseMeasurement.bottomGap < ORDERED_FIT_FINAL_FILL_TRIGGER_GAP
        ) {
          if (previousCompensation) {
            boardElement.style.setProperty("--ordered-fit-final-fill-compensation", previousCompensation);
          } else {
            boardElement.style.removeProperty("--ordered-fit-final-fill-compensation");
          }
          setOrderedFitFinalFillCompensation((currentCompensation) =>
            currentCompensation === DEFAULT_ORDERED_FIT_FINAL_FILL_COMPENSATION ? currentCompensation : DEFAULT_ORDERED_FIT_FINAL_FILL_COMPENSATION
          );
          return;
        }

        let selectedCompensation = DEFAULT_ORDERED_FIT_FINAL_FILL_COMPENSATION;
        let selectedGap = baseMeasurement.bottomGap;

        for (const compensation of ORDERED_FIT_FINAL_FILL_COMPENSATION_LEVELS) {
          boardElement.style.setProperty("--ordered-fit-final-fill-compensation", String(compensation));
          const compensatedMeasurement = getCafeAActualDomCropMeasurement(boardElement, menuElement, ORDERED_FIT_MIN_SAFETY_GAP);
          const isSafe =
            !compensatedMeasurement.overflow &&
            !hasPageScroll() &&
            compensatedMeasurement.bottomGap >= ORDERED_FIT_FINAL_FILL_MIN_GAP;

          if (!isSafe) break;
          if (compensatedMeasurement.bottomGap < selectedGap) {
            selectedCompensation = compensation;
            selectedGap = compensatedMeasurement.bottomGap;
          }
          if (compensatedMeasurement.bottomGap <= ORDERED_FIT_FINAL_FILL_TARGET_GAP) break;
        }

        if (previousCompensation) {
          boardElement.style.setProperty("--ordered-fit-final-fill-compensation", previousCompensation);
        } else {
          boardElement.style.removeProperty("--ordered-fit-final-fill-compensation");
        }

        setOrderedFitFinalFillCompensation((currentCompensation) =>
          currentCompensation === selectedCompensation ? currentCompensation : selectedCompensation
        );
      });
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frameId);
    };
  }, [fitState.columns, fitState.fontScale, fitState.gapScale, fitState.overflow, fitState.status, layoutMode, orderedFitFinalFillCompensation]);

  useEffect(() => {
    if (layoutMode !== "orderedBalancedFit") return;

    const boardElement = desktopFitBoardRef.current;
    const menuElement = desktopFitMenuRef.current;
    if (!boardElement || !menuElement) return;

    let cancelled = false;
    const frameId = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (cancelled) return;

        const shouldResetBoost =
          fitState.status === "idle" ||
          fitState.overflow ||
          !fitState.orderedBalancedFingerprint ||
          baseRenderFitState.columns >= 4 ||
          hasCafeADesktopFooterAnchor(boardElement) ||
          !window.matchMedia("(min-width: 1024px)").matches;

        if (shouldResetBoost) {
          setOrderedBalancedFinalFillBoost((currentBoost) =>
            areFinalFillBoostsEqual(currentBoost, DEFAULT_ORDERED_BALANCED_FINAL_FILL_BOOST) ? currentBoost : DEFAULT_ORDERED_BALANCED_FINAL_FILL_BOOST
          );
          return;
        }

        const hasPageScroll = () => document.documentElement.scrollHeight > window.innerHeight + 1 || document.body.scrollHeight > window.innerHeight + 1;
        const currentMeasurement = getCafeAActualDomCropMeasurement(boardElement, menuElement, ORDERED_BALANCED_CROP_TOLERANCE);

        if (currentMeasurement.overflow || hasPageScroll() || currentMeasurement.bottomGap < ORDERED_BALANCED_FINAL_FILL_BOOST_MIN_GAP) {
          setOrderedBalancedFinalFillBoost((currentBoost) =>
            areFinalFillBoostsEqual(currentBoost, DEFAULT_ORDERED_BALANCED_FINAL_FILL_BOOST) ? currentBoost : DEFAULT_ORDERED_BALANCED_FINAL_FILL_BOOST
          );
          return;
        }

        if (currentMeasurement.bottomGap < ORDERED_BALANCED_FINAL_FILL_BOOST_TRIGGER_GAP) return;

        const previousMenuFontScale = boardElement.style.getPropertyValue("--fit-menu-font-scale");
        const previousMenuGapScale = boardElement.style.getPropertyValue("--fit-menu-gap-scale");
        let selectedBoost: CafeDesignAFinalFillBoost | null = null;

        for (const boost of ORDERED_BALANCED_FINAL_FILL_BOOST_LEVELS) {
          boardElement.style.setProperty("--fit-menu-font-scale", String(roundFitScale(baseRenderFitState.fontScale * boost.fontScale)));
          boardElement.style.setProperty("--fit-menu-gap-scale", String(roundFitScale(baseRenderFitState.gapScale * boost.gapScale)));

          const boostedMeasurement = getCafeAActualDomCropMeasurement(boardElement, menuElement, ORDERED_BALANCED_CROP_TOLERANCE);
          const boostedHasPageScroll = hasPageScroll();
          const isSafe =
            !boostedMeasurement.overflow &&
            !boostedHasPageScroll &&
            boostedMeasurement.bottomGap >= ORDERED_BALANCED_FINAL_FILL_BOOST_MIN_GAP;

          if (!isSafe) break;

          selectedBoost = boost;
          if (boostedMeasurement.bottomGap <= ORDERED_BALANCED_FINAL_FILL_BOOST_TRIGGER_GAP) break;
        }

        if (previousMenuFontScale) {
          boardElement.style.setProperty("--fit-menu-font-scale", previousMenuFontScale);
        } else {
          boardElement.style.removeProperty("--fit-menu-font-scale");
        }
        if (previousMenuGapScale) {
          boardElement.style.setProperty("--fit-menu-gap-scale", previousMenuGapScale);
        } else {
          boardElement.style.removeProperty("--fit-menu-gap-scale");
        }

        const nextBoost = selectedBoost ?? DEFAULT_ORDERED_BALANCED_FINAL_FILL_BOOST;
        setOrderedBalancedFinalFillBoost((currentBoost) => (areFinalFillBoostsEqual(currentBoost, nextBoost) ? currentBoost : nextBoost));
      });
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frameId);
    };
  }, [baseRenderFitState, fitState.orderedBalancedFingerprint, fitState.overflow, fitState.status, layoutMode, orderedBalancedFinalFillBoost]);

  // CafeA skin shell: mobile scroll layout and desktop board share the same CafeA visual components.
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
              <CoverHero data={data} featuredItem={featuredItem} capabilities={capabilities} density={density} customBadgeStyles={customBadgeStyles} />
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
                footerInfo={<CafeAFooterInfo data={data} capabilities={capabilities} placement="mobile" />}
              />
            )}
          </div>

          <div
            ref={desktopFitBoardRef}
            className={`cafe-a-desktop-fit-board relative hidden min-w-0 lg:grid lg:min-h-0 lg:flex-1 lg:overflow-y-hidden lg:p-[var(--board-padding)] ${desktopGridClassName}`}
            data-fit-status={fitState.status}
            data-layout-mode={layoutMode}
            data-fit-columns={renderFitState.columns}
            data-fit-font-scale={renderFitState.fontScale}
            data-fit-gap-scale={renderFitState.gapScale}
            data-fit-final-font-boost={orderedBalancedFinalFillBoost.fontScale}
            data-fit-final-gap-boost={orderedBalancedFinalFillBoost.gapScale}
            data-fit-ordered-fit-base-visual-scale={layoutMode === "orderedFit" ? ORDERED_FIT_BASE_MENU_VISUAL_SCALE : undefined}
            data-fit-ordered-fit-final-fill-compensation={layoutMode === "orderedFit" ? orderedFitFinalFillCompensation : undefined}
            data-fit-ordered-fit-effective-visual-scale={
              layoutMode === "orderedFit" ? roundFitScale(ORDERED_FIT_BASE_MENU_VISUAL_SCALE * orderedFitFinalFillCompensation) : undefined
            }
            data-fit-balanced-variant={fitState.balancedVariant}
            data-fit-ordered-balanced-breaks={fitState.orderedBalancedBreaks}
            data-fit-ordered-balanced-fingerprint={fitState.orderedBalancedFingerprint}
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
            data-fit-board-inner-right={fitState.boardInnerRight}
            data-fit-rightmost-menu-name-right={fitState.rightmostMenuNameRight}
            data-fit-rightmost-secondary-right={fitState.rightmostSecondaryRight}
            data-fit-rightmost-price-right={fitState.rightmostPriceRight}
            data-fit-rightmost-chip-right={fitState.rightmostChipRight}
            data-fit-rightmost-category-right={fitState.rightmostCategoryRight}
            data-fit-right-safety-gap={fitState.rightSafetyGap}
            data-fit-overflow={fitState.overflow ? "true" : "false"}
            style={{ ...fitGapStyle, ...fitStyle, ...orderedFitFillStyle }}
          >
            <DesktopFixedRail data={data}>
              {shouldRenderMenuCoverSection && (
                <CoverHero
                  data={data}
                  featuredItem={featuredItem}
                  capabilities={capabilities}
                  density={density}
                  customBadgeStyles={customBadgeStyles}
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
                columns={renderFitState.columns}
                variant={fitState.balancedVariant}
              />
            ) : layoutMode === "orderedBalancedFit" ? (
              <OrderedBalancedFitMenuGrid
                fitRef={desktopFitMenuRef}
                pageGroups={visiblePageGroups}
                density={density}
                data={data}
                capabilities={capabilities}
                customBadgeStyles={customBadgeStyles}
                itemStackSpacing={itemStackSpacing}
                outerGridGapClassName={outerGridGapClassName}
                menuAreaClassName={menuAreaClassName}
                columns={renderFitState.columns}
                orderedBalancedBreaks={fitState.orderedBalancedBreaks}
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
            {footerInfo}
          </div>
        </div>
      </main>
    </>
  );
}
