// Extracted without changing the existing rendering or fit formulas.
import { type CSSProperties } from "react";
import { type CafeAWidgetPreview } from "@/components/menu-templates/CafeAWidgetBlock";
import { applyOnePageChipLayouts } from "@/components/menu-templates/one-page-chip-layout";
import type { PublicMenuTemplateProps } from "@/components/menu-templates/types";
import {
  createCafeAOrderedBalancedColumnsFromBreakIndices,
  getCafeAOrderedBalancedBreaksFromColumns,
  getCafeAOrderedBalancedColumnFillMetrics,
  getCafeAOrderedBalancedContiguousColumnCandidates,
  getCafeAOrderedBalancedContiguousColumns,
} from "@/components/menu-templates/cafe-a-balanced-layout";
import { BASIC_RIGHT_EDGE_SAFETY_GAP_PX } from "@/lib/basic-template-constants";
import { getCafeAMenuWrapDensityDecision, getCafeAMenuWrapDensityDecisionForColumns, type CafeAMenuWrapDensityDecision } from "@/lib/cafe-a-wrap-density";
import { DEFAULT_LOCALE } from "@/lib/locales";
import { parseCategoryOrder } from "@/lib/one-page-category-order";
import { usesOnePageProportionFitPolicy } from "@/lib/one-page-proportion-policy";
import { ONE_PAGE_MAX_MENU_COLUMNS, orderOnePageMenuColumnCandidates } from "@/lib/one-page-fit-policy";
import { MENU_LIMITS } from "@/lib/menu-starter-presets";
import { type TemplateCapabilities } from "@/lib/template-capabilities";
import { type MenuLayoutDensity } from "@/lib/template-layout-rules";
import { shouldShowMenuItemTraits } from "@/types/menu";
import {
  type BalancedColumn,
  type CafeDesignABalancedBlockMeasurement,
  type CafeDesignABalancedSimulatedColumn,
  type CafeDesignABalancedVariant,
  type CafeDesignABalancedWeightedBlock,
  type CafeDesignAColumnMeasurement,
  type CafeDesignAContentBlock,
  type CafeDesignAContentBlockType,
  type CafeDesignAFinalFillBoost,
  type CafeDesignAFitMeasurement,
  type CafeDesignAFitState,
  type MenuGroup,
  type MenuItem,
  type MenuPageGroup,
} from "@/components/menu-templates/shared/cafe-template-types";
import { getItemPriceTokensForCategory } from "@/components/menu-templates/shared/cafe-menu-pricing";
import { getMenuSiteSettings } from "@/components/menu-templates/shared/cafe-template-content";


// -----------------------------------------------------------------------------
// Basic engine candidate: fit/fill candidate constants and safety thresholds
// -----------------------------------------------------------------------------

// CafeA always stays within four menu columns. With the fixed brand rail this
// yields at most five total columns across every single-page template.
const FIT_COLUMN_CANDIDATES = [2, 3, 4] as const;

export const FIT_FONT_SCALE_CANDIDATES = [
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

export const ORDERED_BALANCED_FIT_FONT_SCALE_CANDIDATES = [
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

export const BALANCED_LAYOUT_VARIANTS = ["estimatedGreedy", "sourceSequential", "sourceRoundRobin", "lastAwareGreedy", "visibleExhaustive"] as const satisfies readonly CafeDesignABalancedVariant[];

const BALANCED_MIN_SAFETY_GAP = 1;

export const BALANCED_TARGET_MIN_GAP = 2;

export const BALANCED_TARGET_MAX_GAP = 4;

export const BALANCED_VISIBLE_GAP = 8;

export const BALANCED_FAILED_GAP = 10;

export const BALANCED_MIN_QUALITY_FONT_SCALE = 0.78;

export const ORDERED_BALANCED_MIN_QUALITY_FONT_SCALE = 0.75;

const ORDERED_BALANCED_MAX_EXHAUSTIVE_BLOCKS = 12;

export const ORDERED_BALANCED_MAX_EXHAUSTIVE_COLUMNS = ONE_PAGE_MAX_MENU_COLUMNS;

const ORDERED_BALANCED_DEFAULT_MAX_COLUMNS = ONE_PAGE_MAX_MENU_COLUMNS;

export const ORDERED_BALANCED_GAP_IMPROVEMENT_EPSILON = 2;

export const ORDERED_BALANCED_SCALE_EPSILON = 0.005;

export const ORDERED_BALANCED_CROP_TOLERANCE = 0.5;

const ORDERED_BALANCED_STABLE_MIN_BOTTOM_GAP = 1.5;

export const ORDERED_BALANCED_TARGET_MIN_VISIBLE_GAP = 2;

export const ORDERED_BALANCED_TARGET_VISIBLE_GAP = 4;

export const ORDERED_BALANCED_TARGET_MAX_VISIBLE_GAP = 6;

const ORDERED_BALANCED_ORPHAN_SAFETY_GAP = 2;

const ORDERED_BALANCED_SIMULATION_CROP_BUFFER = 1;

const ORDERED_BALANCED_ZOOM_SIMULATION_CROP_BUFFER = 28;

const ORDERED_BALANCED_SETTLED_SWITCH_GAP = 6;

const ORDERED_BALANCED_SETTLED_SCALE_DELTA = 0.12;

const ORDERED_BALANCED_SCORE_HYSTERESIS = 4;

export const ORDERED_BALANCED_SAFE_CONVERGENCE_LIMIT = 3;

export const ORDERED_BALANCED_VIEWPORT_BUCKET = 24;

export const ORDERED_BALANCED_SIZE_BUCKET = 8;

const ORDERED_BALANCED_DENSE_CATEGORY_THRESHOLD = 5;

const ORDERED_BALANCED_DENSE_ITEM_THRESHOLD = 20;

const MOCHA_FOREST_MENU_REGION_SAFETY_GAP = 0;

export const ORDERED_BALANCED_FINAL_FILL_BOOST_TRIGGER_GAP = 12;

export const ORDERED_BALANCED_FINAL_FILL_BOOST_MIN_GAP = BALANCED_VISIBLE_GAP;

export const FIT_PRESENTATION_STABLE_MS = 320;

export const FIT_PRESENTATION_FAILURE_GRACE_MS = 160;

export const FIT_PRESENTATION_FONT_WAIT_MS = 1500;

export const ORDERED_BALANCED_FINAL_FILL_BOOST_LEVELS = [
  { fontScale: 1.004, gapScale: 1.003 },
  { fontScale: 1.008, gapScale: 1.005 },
  { fontScale: 1.012, gapScale: 1.008 },
  { fontScale: 1.015, gapScale: 1.01 },
  { fontScale: 1.025, gapScale: 1.018 },
  { fontScale: 1.04, gapScale: 1.03 },
] as const satisfies readonly CafeDesignAFinalFillBoost[];

export const DEFAULT_ORDERED_BALANCED_FINAL_FILL_BOOST: CafeDesignAFinalFillBoost = { fontScale: 1, gapScale: 1 };

export const ORDERED_FIT_BASE_MENU_VISUAL_SCALE = 0.95;

export const DEFAULT_ORDERED_FIT_FINAL_FILL_COMPENSATION = 1;

export const ORDERED_FIT_FINAL_FILL_COMPENSATION_LEVELS = [1.015, 1.025, 1.035, 1.045, 1.055, 1.06] as const;

export const ORDERED_FIT_FINAL_FILL_TRIGGER_GAP = 12;

export const ORDERED_FIT_FINAL_FILL_TARGET_GAP = 12;

export const ORDERED_FIT_FINAL_FILL_MIN_GAP = 2;

export const FIT_PRESENTATION_SAFETY_STEP = 0.91;

export const FIT_PRESENTATION_MIN_SAFETY_SCALE = 0.72;

export const ORDERED_FIT_FONT_SCALE_CANDIDATES = [1.24, 1.2, 1.16, 1.12, 1.08, 1.04, 1, 0.95, 0.88, 0.85, 0.83, 0.82, 0.78, 0.76, 0.75, 0.72, 0.71, 0.68, 0.64, 0.62, 0.6, 0.58, 0.56, 0.54, 0.5, 0.48, 0.46] as const;

const TABLET_LANDSCAPE_MAX_FIT_FONT_SCALE = 1.34;

export const FIT_WARNING_FONT_SCALE = 0.75;

export const DEFAULT_BALANCED_VARIANT: CafeDesignABalancedVariant = "estimatedGreedy";

export const DEFAULT_FIT_STATE: CafeDesignAFitState = {
  columns: 4,
  fontScale: 1,
  wrapScale: 1,
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

export const ORDERED_FIT_TARGET_GAP = 5;

export const ORDERED_FIT_TARGET_MIN_GAP = 3;

export const ORDERED_FIT_TARGET_MAX_GAP = 5;

export const ORDERED_FIT_ACCEPTABLE_MAX_GAP = 7;

export const ORDERED_FIT_MIN_SAFETY_GAP = 2;

export const ORDERED_FIT_LOOSE_GAP = 20;

const ORDERED_FIT_COLUMN_TOLERANCE = 8;

const ORDERED_FIT_DESKTOP_MAX_COLUMNS = 4;

export const ORDERED_FIT_MIN_READABLE_COLUMN_WIDTH_PX = 188;

export const ORDERED_FIT_COLUMN_EXPANSION_FONT_FLOOR = 0.82;

export const ORDERED_FIT_MIN_STANDARD_FONT_SCALE = 0.71;

export const ORDERED_FIT_EMERGENCY_FONT_SCALE_MENU_WIDTH_PX = 820;

const ORDERED_FIT_FOOTER_AWARE_BOTTOM_SAFETY_GAP_PX = 16;

const CAFE_A_FOOTER_NO_GO_HORIZONTAL_SAFETY_GAP_PX = 12;

export const CAFE_A_FOOTER_INFO_TOP_SAFETY_GAP_PX = 24;

export const CAFE_A_FOOTER_INFO_TABLET_TOP_SAFETY_GAP_PX = 16;


// -----------------------------------------------------------------------------
// Basic engine candidate: layout candidates, scale helpers, and state comparison
// -----------------------------------------------------------------------------

function getMaxFitColumns(width: number) {
  if (width < 720) return 2;
  if (width < 1120) return 3;
  return 4;
}


export function getBalancedFitColumnCandidates(width: number, groupCount: number) {
  const maxWidthColumns = getMaxFitColumns(width);
  const readableMaxColumns = width < 640 ? 2 : width < 760 ? 3 : maxWidthColumns;
  const maxUsefulColumns = Math.max(2, Math.min(readableMaxColumns, Math.max(2, groupCount)));
  const minColumns = 3;

  return FIT_COLUMN_CANDIDATES.filter((columns) => columns >= minColumns && columns <= maxUsefulColumns).sort((a, b) => b - a);
}


export function getOrderedFitColumnCandidates(width: number) {
  const maxReadableColumns = width >= 680 ? ORDERED_FIT_DESKTOP_MAX_COLUMNS : 3;
  const maxColumns = Math.min(ORDERED_FIT_DESKTOP_MAX_COLUMNS, Math.max(3, maxReadableColumns));
  const minColumns = 2;
  return FIT_COLUMN_CANDIDATES.filter((columns) => columns >= minColumns && columns <= maxColumns).sort((a, b) => b - a);
}


export function isDenseOrderedBalancedMenu(groupCount: number, itemCount: number) {
  return groupCount >= ORDERED_BALANCED_DENSE_CATEGORY_THRESHOLD || itemCount >= ORDERED_BALANCED_DENSE_ITEM_THRESHOLD;
}


export function getOrderedBalancedFitColumnCandidates(width: number, groupCount: number, itemCount: number) {
  if (groupCount <= 1) return [1];
  if (isDenseOrderedBalancedMenu(groupCount, itemCount)) {
    const denseMaximumColumns = width < 1120 ? 3 : ONE_PAGE_MAX_MENU_COLUMNS;
    return orderOnePageMenuColumnCandidates(
      FIT_COLUMN_CANDIDATES.filter((columns) => columns >= 3 && columns <= Math.min(denseMaximumColumns, groupCount)),
    );
  }

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

  return orderOnePageMenuColumnCandidates(
    FIT_COLUMN_CANDIDATES.filter((columns) => columns >= minColumns && columns <= maxUsefulColumns),
  );
}


export function getOrderedBalancedWidgetFitColumnCandidates(width: number, groupCount: number, itemCount: number) {
  const baseCandidates = getOrderedBalancedFitColumnCandidates(width, groupCount, itemCount);
  const rescueMaxColumns = Math.min(ORDERED_FIT_DESKTOP_MAX_COLUMNS, Math.max(2, groupCount));
  const rescueCandidates = getOrderedFitColumnCandidates(width).filter((columns) => columns <= rescueMaxColumns);

  return orderOnePageMenuColumnCandidates([...baseCandidates, ...rescueCandidates]);
}


export function getImageMenuColumnCandidates(width: number, groupCount: number, maximumColumns = ONE_PAGE_MAX_MENU_COLUMNS) {
  if (groupCount <= 1) return [1];
  if (width < 760) return [2];

  const maxColumns = Math.min(maximumColumns, groupCount);
  const candidates = FIT_COLUMN_CANDIDATES.filter((columns) => columns >= 2 && columns <= maxColumns);
  return orderOnePageMenuColumnCandidates(candidates);
}


function getFitGapScale(fontScale: number) {
  return Math.max(0.68, Math.min(1.16, fontScale + 0.04));
}


export function getBalancedFitGapScale(fontScale: number, menuWidth: number) {
  if (menuWidth < 760) return Math.max(0.68, Math.min(0.78, fontScale - 0.02));
  if (menuWidth < 1080) return Math.max(0.74, Math.min(0.95, fontScale + 0.02));
  return getFitGapScale(fontScale);
}


export function getOrderedBalancedFitGapScale(fontScale: number, menuWidth: number) {
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


export function getOrderedBalancedFitFontScaleCandidates(isTabletPreview: boolean, menuWidth: number) {
  const widthCandidates = menuWidth < 760
    ? [...ORDERED_BALANCED_FIT_FONT_SCALE_CANDIDATES.filter((fontScale) => fontScale <= 0.85), 0.62]
    : ORDERED_BALANCED_FIT_FONT_SCALE_CANDIDATES;

  return isTabletPreview
    ? widthCandidates.filter((fontScale) => fontScale <= TABLET_LANDSCAPE_MAX_FIT_FONT_SCALE)
    : widthCandidates;
}


export function getPreviewFitFontScaleCandidates<T extends number>(candidates: readonly T[], isTabletPreview: boolean) {
  return isTabletPreview
    ? candidates.filter((fontScale) => fontScale <= TABLET_LANDSCAPE_MAX_FIT_FONT_SCALE)
    : candidates;
}


export function getOrderedFitGapScale(fontScale: number, menuWidth: number) {
  if (menuWidth < 760) return Math.max(0.64, Math.min(0.72, fontScale - 0.29));
  if (menuWidth < 1080) return Math.max(0.76, Math.min(0.92, fontScale - 0.12));
  return Math.max(0.84, Math.min(0.96, fontScale - 0.16));
}


export function getFitStyle(fitState: CafeDesignAFitState, menuFitState: CafeDesignAFitState = fitState): CSSProperties {
  return {
    "--fit-columns": String(fitState.columns),
    "--fit-font-scale": String(fitState.fontScale),
    "--fit-gap-scale": String(fitState.gapScale),
    "--fit-menu-font-scale": String(menuFitState.fontScale),
    "--fit-menu-wrap-scale": String(menuFitState.wrapScale),
    "--fit-menu-gap-scale": String(menuFitState.gapScale),
  } as CSSProperties;
}


export function areFinalFillBoostsEqual(currentBoost: CafeDesignAFinalFillBoost, nextBoost: CafeDesignAFinalFillBoost) {
  return currentBoost.fontScale === nextBoost.fontScale && currentBoost.gapScale === nextBoost.gapScale;
}


export function getBoostedFitState(fitState: CafeDesignAFitState, boost: CafeDesignAFinalFillBoost): CafeDesignAFitState {
  if (boost.fontScale === 1 && boost.gapScale === 1) return fitState;

  return {
    ...fitState,
    fontScale: roundFitScale(fitState.fontScale * boost.fontScale),
    wrapScale:
      fitState.wrapScale < 1
        ? roundFitScale(fitState.wrapScale / boost.fontScale)
        : fitState.wrapScale,
    gapScale: roundFitScale(fitState.gapScale * boost.gapScale),
  };
}


export function roundFitMetric(value: number) {
  return Number.isFinite(value) ? Math.round(value * 10) / 10 : 0;
}


export function roundFitScale(value: number) {
  return Number.isFinite(value) ? Math.round(value * 1000) / 1000 : 1;
}


function roundFitRatio(value: number) {
  return Number.isFinite(value) ? Math.round(value * 1000) / 1000 : 0;
}


export function areFitStatesEqual(currentState: CafeDesignAFitState, nextState: CafeDesignAFitState) {
  return (
    currentState.columns === nextState.columns &&
    currentState.fontScale === nextState.fontScale &&
    currentState.wrapScale === nextState.wrapScale &&
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


export function getOrderedFitCycleStateKey(state: CafeDesignAFitState) {
  return [state.columns, state.fontScale.toFixed(3), state.wrapScale.toFixed(3), state.gapScale.toFixed(3), state.measuredColumns, state.status].join(":");
}


function areOrderedBalancedCandidateIdentitiesEqual(currentState: CafeDesignAFitState, nextState: CafeDesignAFitState) {
  return (
    currentState.columns === nextState.columns &&
    Math.abs(currentState.fontScale - nextState.fontScale) < ORDERED_BALANCED_SCALE_EPSILON &&
    Math.abs(currentState.wrapScale - nextState.wrapScale) < ORDERED_BALANCED_SCALE_EPSILON &&
    Math.abs(currentState.gapScale - nextState.gapScale) < ORDERED_BALANCED_SCALE_EPSILON &&
    currentState.orderedBalancedBreaks === nextState.orderedBalancedBreaks &&
    currentState.orderedBalancedFingerprint === nextState.orderedBalancedFingerprint
  );
}


export function shouldKeepOrderedBalancedCurrentState(currentState: CafeDesignAFitState, nextState: CafeDesignAFitState) {
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


export function getOrderedBalancedCandidateKeyFromParts({
  orderedBalancedFingerprint,
  columns,
  fontScale,
  gapScale,
  orderedBalancedBreaks,
}: {
  orderedBalancedFingerprint: string;
  columns: number;
  fontScale: number;
  gapScale: number;
  orderedBalancedBreaks: string;
}) {
  return [
    orderedBalancedFingerprint,
    columns,
    fontScale.toFixed(3),
    gapScale.toFixed(3),
    orderedBalancedBreaks || "none",
  ].join("|");
}


export function getOrderedBalancedCandidateKey(state: CafeDesignAFitState) {
  return getOrderedBalancedCandidateKeyFromParts(state);
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
    (1 - state.wrapScale).toFixed(3),
    (2 - state.fontScale).toFixed(3),
    String(state.columns).padStart(2, "0"),
    state.orderedBalancedBreaks || "z",
  ].join("|");
}


export function isOrderedBalancedCandidateBetter({
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


export function shouldKeepOrderedBalancedSettledCandidate(currentState: CafeDesignAFitState, nextState: CafeDesignAFitState) {
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

export function getFitGapStyle(density: MenuLayoutDensity): CSSProperties {
  const gapByDensity = {
    spacious: {
      x: "clamp(48px, 3.4vw, 68px)",
      y: "clamp(2rem, 3.2vmin, 2.5rem)",
      stack: "clamp(1.2rem, 2vmin, 1.5rem)",
      line: "1.5",
      inline: "clamp(0.42rem, 0.7vmin, 0.5rem)",
    },
    default: {
      x: "clamp(40px, 3.2vw, 58px)",
      y: "clamp(1.65rem, 2.7vmin, 2rem)",
      stack: "clamp(0.95rem, 1.65vmin, 1.25rem)",
      line: "1.45",
      inline: "clamp(0.32rem, 0.55vmin, 0.375rem)",
    },
    compact: {
      x: "clamp(34px, 2.7vw, 50px)",
      y: "clamp(1.35rem, 2.2vmin, 1.65rem)",
      stack: "clamp(0.8rem, 1.35vmin, 1rem)",
      line: "1.4",
      inline: "clamp(0.27rem, 0.46vmin, 0.3125rem)",
    },
    ultraCompact: {
      x: "clamp(30px, 2.4vw, 44px)",
      y: "clamp(1.1rem, 1.8vmin, 1.35rem)",
      stack: "clamp(0.625rem, 1vmin, 0.75rem)",
      line: "1.35",
      inline: "clamp(0.22rem, 0.38vmin, 0.25rem)",
    },
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


function getCafeARenderedLineCount(element: HTMLElement | null) {
  if (!element) return 0;

  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return 0;

  const style = window.getComputedStyle(element);
  const fontSize = Number.parseFloat(style.fontSize);
  const parsedLineHeight = Number.parseFloat(style.lineHeight);
  const lineHeight = Number.isFinite(parsedLineHeight)
    ? parsedLineHeight
    : Number.isFinite(fontSize)
      ? fontSize * 1.2
      : rect.height;
  const paddingTop = Number.parseFloat(style.paddingTop);
  const paddingBottom = Number.parseFloat(style.paddingBottom);
  const borderTop = Number.parseFloat(style.borderTopWidth);
  const borderBottom = Number.parseFloat(style.borderBottomWidth);
  const verticalInset =
    (Number.isFinite(paddingTop) ? paddingTop : 0) +
    (Number.isFinite(paddingBottom) ? paddingBottom : 0) +
    (Number.isFinite(borderTop) ? borderTop : 0) +
    (Number.isFinite(borderBottom) ? borderBottom : 0);
  const contentHeight = Math.max(0, rect.height - verticalInset);

  return Math.max(1, Math.round(contentHeight / Math.max(1, lineHeight)));
}


export function measureCafeAMenuWrapDensity(menuElement: HTMLElement): CafeAMenuWrapDensityDecision {
  const measuringReference = menuElement.closest("[data-cafe-a-three-part-reference]") !== null;
  const itemMeasurements = Array.from(
    menuElement.querySelectorAll<HTMLElement>("[data-cafe-a-menu-item]"),
  )
    .map((itemElement) => ({
      columnElement: itemElement.closest<HTMLElement>("[data-cafe-a-balanced-column]"),
      itemLeft: itemElement.getBoundingClientRect().left,
      titleLines: getCafeARenderedLineCount(
        itemElement.querySelector<HTMLElement>("[data-cafe-a-menu-name]"),
      ),
      descriptionLines: getCafeARenderedLineCount(
        itemElement.querySelector<HTMLElement>(measuringReference ? '[data-cafe-a-reference-copy="description"]' : "[data-cafe-a-menu-description]"),
      ),
    }))
    .filter((measurement) => measurement.titleLines > 0 || measurement.descriptionLines > 0);

  if (itemMeasurements.length === 0) {
    return getCafeAMenuWrapDensityDecision([]);
  }

  const columnGroups = new Map<HTMLElement | number, typeof itemMeasurements>();
  for (const measurement of itemMeasurements) {
    const fallbackLeftKey = Math.round(measurement.itemLeft / 4) * 4;
    const columnKey = measurement.columnElement ?? fallbackLeftKey;
    const column = columnGroups.get(columnKey) ?? [];
    column.push(measurement);
    columnGroups.set(columnKey, column);
  }

  return getCafeAMenuWrapDensityDecisionForColumns(
    Array.from(columnGroups.values()).map((column) =>
      column.map(({ titleLines, descriptionLines }) => ({ titleLines, descriptionLines })),
    ),
  );
}


export const CAFE_A_VISIBLE_CONTENT_SELECTOR = [
  "[data-cafe-a-category-heading]",
  "[data-cafe-a-menu-name]",
  "[data-cafe-a-menu-price]",
  ".cafe-a-menu-description",
  ".cafe-a-menu-meta",
  ".cafe-a-menu-badge",
  ".cafe-a-menu-chip",
  "[data-cafe-a-widget-block]",
  "[data-cafe-a-widget-shell]",
  "[data-cafe-a-widget-media]",
  "[data-cafe-a-widget-copy]",
  "[data-cafe-a-widget-title]",
  "[data-cafe-a-widget-body]",
].join(",");


const CAFE_A_ORDERED_FIT_COLUMN_MEASUREMENT_SELECTOR = [
  "[data-cafe-a-category-heading]",
  "[data-cafe-a-item-stack]",
  "[data-cafe-a-menu-widget-block]",
].join(",");


export function beginCafeAThreePartReference(boardElement: HTMLElement) {
  const suppressedDividers = [...boardElement.querySelectorAll<HTMLElement>('[data-cafe-a-category-divider-desktop-suppressed="true"]')];
  for (const divider of suppressedDividers) divider.removeAttribute("data-cafe-a-category-divider-desktop-suppressed");
  boardElement.setAttribute("data-cafe-a-three-part-reference", "");
  return () => {
    boardElement.removeAttribute("data-cafe-a-three-part-reference");
    for (const divider of suppressedDividers) divider.setAttribute("data-cafe-a-category-divider-desktop-suppressed", "true");
  };
}


function withCafeAThreePartReference<T>(boardElement: HTMLElement, measure: () => T): T {
  if (boardElement.dataset.fitCopyBasis === "actual" || !boardElement.closest('[data-cafe-a-copy-aware-rhythm="true"]') || boardElement.hasAttribute("data-cafe-a-three-part-reference")) return measure();
  const restore = beginCafeAThreePartReference(boardElement);
  try { return measure(); } finally { restore(); }
}


export function measureCafeAOrderedFit(boardElement: HTMLElement, menuElement: HTMLElement, expectedColumns?: number): CafeDesignAFitMeasurement {
  return withCafeAThreePartReference(boardElement, () => measureCafeAOrderedFitReference(boardElement, menuElement, expectedColumns));
}


function measureCafeAOrderedFitReference(boardElement: HTMLElement, menuElement: HTMLElement, expectedColumns?: number): CafeDesignAFitMeasurement {
  const boardRect = boardElement.getBoundingClientRect();
  const menuRect = menuElement.getBoundingClientRect();
  const flowHeight = menuElement.clientHeight || menuRect.height;
  const columns = getColumnMeasurements(menuElement, CAFE_A_ORDERED_FIT_COLUMN_MEASUREMENT_SELECTOR);
  const measuredColumnCount = columns.length;
  const expectedColumnCount = Math.max(1, expectedColumns ?? measuredColumnCount);
  const columnFillRatios = Array.from({ length: expectedColumnCount }, (_, index) => {
    const column = columns[index];
    if (!column || flowHeight <= 0) return 0;
    return Math.min(1, Math.max(0, column.bottom / flowHeight));
  });
  const primaryColumnBottom = columns[0]?.bottom ?? 0;
  const longestColumnBottom = columns.reduce((bottom, column) => Math.max(bottom, column.bottom), 0);
  const lastColumn = columns[columns.length - 1];
  const clippingBottom = getCafeAClippingBottom(boardElement, menuElement);
  const footerElement = boardElement.querySelector<HTMLElement>('[data-cafe-a-footer-info][data-cafe-a-footer-placement="desktop"]');
  const footerRect = footerElement?.getBoundingClientRect();
  const footerIsVisible = Boolean(footerRect && footerRect.width > 0 && footerRect.height > 0);
  const footerIsOverlay = footerIsVisible && !footerElement?.closest("[data-cafe-a-fit-menu]");
  const lastColumnLeft = lastColumn ? menuRect.left + lastColumn.left : 0;
  const lastColumnRight = lastColumn
    ? Math.max(menuRect.left + lastColumn.left, ...lastColumn.elements.map((rect) => rect.right))
    : 0;
  const lastColumnOverlapsFooterX =
    Boolean(lastColumn && footerIsOverlay) &&
    lastColumnLeft < footerRect!.right + 1 &&
    lastColumnRight > footerRect!.left - 1;
  const lastColumnEffectiveBottom = lastColumnOverlapsFooterX
    ? footerRect!.top - ORDERED_FIT_FOOTER_AWARE_BOTTOM_SAFETY_GAP_PX
    : Math.min(boardRect.bottom, menuRect.bottom, clippingBottom) - ORDERED_FIT_FOOTER_AWARE_BOTTOM_SAFETY_GAP_PX;
  const lastColumnEffectiveFlowHeight = Math.max(1, lastColumnEffectiveBottom - menuRect.top);
  const lastColumnVisibleBottomGap = lastColumn ? lastColumnEffectiveFlowHeight - lastColumn.bottom : flowHeight;
  const visibleLastColumnFillRatio = lastColumn ? Math.min(1, Math.max(0, lastColumn.bottom / lastColumnEffectiveFlowHeight)) : 0;
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
    longestColumnBottom > flowHeight + 1 ||
    lastColumnVisibleBottomGap < ORDERED_FIT_MIN_SAFETY_GAP;
  const overflowsWidth = menuElement.scrollWidth > menuElement.clientWidth + 1;
  const rightEdgeSafety = getCafeARightEdgeSafetyMeasurement(boardElement, menuElement);
  const actualDomCropMeasurement = getCafeAActualDomCropMeasurement(
    boardElement,
    menuElement,
    ORDERED_FIT_MIN_SAFETY_GAP,
    undefined,
    { footerNoGoLeafOnly: true }
  );

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
    visibleContentBottomGap: roundFitMetric(Math.max(0, lastColumnVisibleBottomGap)),
    visibleAverageFillRatio: roundFitRatio(averageFillRatio),
    visibleMinFillRatio: roundFitRatio(minFillRatio),
    visibleLastColumnFillRatio: roundFitRatio(visibleLastColumnFillRatio),
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


export function getVisibleElementBottom(elements: HTMLElement[]) {
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
  const rightmostWidgetRight = getRightmostElementRight(
    menuElement,
    "[data-cafe-a-widget-block], [data-cafe-a-widget-shell], [data-cafe-a-widget-media], [data-cafe-a-widget-copy], [data-cafe-a-widget-title], [data-cafe-a-widget-body]"
  );
  const maxRightmostElementRight = Math.max(
    rightmostMenuNameRight,
    rightmostSecondaryRight,
    rightmostPriceRight,
    rightmostChipRight,
    rightmostCategoryRight,
    rightmostWidgetRight
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
    Array.from(blockElement.querySelectorAll<HTMLElement>(
      "[data-cafe-a-menu-name], .cafe-a-menu-meta, .cafe-a-menu-description, .cafe-a-menu-badge, .cafe-a-menu-chip, [data-cafe-a-widget-title], [data-cafe-a-widget-body], [data-cafe-a-widget-copy]"
    ))
  );
  const priceBottom = getVisibleElementBottom(
    Array.from(blockElement.querySelectorAll<HTMLElement>(
      "[data-cafe-a-menu-price], .cafe-a-menu-price, .cafe-a-price-label, [data-cafe-a-widget-media], [data-cafe-a-widget-shell], [data-cafe-a-widget-block]"
    ))
  );
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


export function getBalancedBlockMeasurements(menuElement: HTMLElement): CafeDesignABalancedBlockMeasurement[] {
  return Array.from(menuElement.querySelectorAll<HTMLElement>("[data-cafe-a-balanced-atomic-block], [data-cafe-a-balanced-category-block]"))
    .map((blockElement) => {
      const rect = blockElement.getBoundingClientRect();
      const order = Number.parseInt(blockElement.dataset.cafeABalancedSourceOrder ?? "", 10);
      const estimatedHeight = Number.parseFloat(blockElement.dataset.balancedEstimatedHeight ?? "");
      const visibleHeights = getBalancedBlockVisibleHeights(blockElement);

      return {
        affinity: blockElement.dataset.cafeACategoryAffinity,
        orderBoundary: blockElement.dataset.cafeAOrderBoundary,
        key: blockElement.dataset.cafeABalancedBlockId ?? blockElement.dataset.cafeABalancedCategoryBlock ?? "",
        blockType: blockElement.dataset.cafeABalancedBlockType === "widget" ? ("widget" as const) : ("category" as const),
        widgetPlacement:
          blockElement.dataset.cafeAWidgetPlacement === "bottom"
            ? ("bottom" as const)
            : blockElement.dataset.cafeAWidgetPlacement === "flow"
              ? ("flow" as const)
              : undefined,
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


export function getOrderedBalancedBucketedMetric(value: number, bucketSize: number) {
  if (!Number.isFinite(value) || bucketSize <= 0) return 0;
  return Math.round(value / bucketSize) * bucketSize;
}


export function createBalancedSimulatedColumns(
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


export function createOrderedBalancedColumnsFromBreakIndices(
  blocks: CafeDesignABalancedBlockMeasurement[],
  safeColumns: number,
  breakIndices: number[],
): CafeDesignABalancedSimulatedColumn[] {
  return createCafeAOrderedBalancedColumnsFromBreakIndices(blocks, safeColumns, breakIndices);
}


export function getOrderedBalancedBreaksFromColumns(columns: CafeDesignABalancedSimulatedColumn[]) {
  return getCafeAOrderedBalancedBreaksFromColumns(columns);
}


function parseOrderedBalancedBreaks(value: string, groupCount: number, columns: number) {
  const breaks = value.split("|order=")[0]
    .split(",")
    .map((breakValue) => Number.parseInt(breakValue, 10))
    .filter((breakIndex) => Number.isInteger(breakIndex) && breakIndex > 0 && breakIndex < groupCount)
    .sort((a, b) => a - b);
  const uniqueBreaks = Array.from(new Set(breaks));

  return uniqueBreaks.length === Math.max(0, columns - 1) ? uniqueBreaks : null;
}


export function getOrderedBalancedColumnFillMetrics(columns: CafeDesignABalancedSimulatedColumn[], targetHeight?: number) {
  return getCafeAOrderedBalancedColumnFillMetrics(columns, targetHeight);
}


export function hasOrderedBalancedAtomicBlockOverflow(
  columns: CafeDesignABalancedSimulatedColumn[],
  flowHeight: number,
  cropTolerance: number,
  columnTargetHeights?: readonly number[],
) {
  const hasGlobalFlowHeight = Number.isFinite(flowHeight) && flowHeight > 0;
  const hasColumnTargetHeight = Boolean(columnTargetHeights?.some((height) => Number.isFinite(height) && height > 0));
  if (!hasGlobalFlowHeight && !hasColumnTargetHeight) return false;

  return columns.some((column, columnIndex) => {
    const columnTargetHeight = columnTargetHeights?.[columnIndex];
    const safeBottom =
      Number.isFinite(columnTargetHeight) && (columnTargetHeight ?? 0) > 0
        ? (columnTargetHeight ?? 0) - cropTolerance
        : flowHeight - cropTolerance;
    if (!Number.isFinite(safeBottom) || safeBottom <= 0) return false;
    let cursor = 0;

    return column.blocks.some((block, index) => {
      const blockBottom = cursor + Math.max(block.height, block.visibleContentHeight);
      const overflows = blockBottom > safeBottom;
      cursor += block.height + (index < column.blocks.length - 1 ? block.marginBottom : 0);
      return overflows;
    });
  });
}


export function getOrderedBalancedColumnTargetHeights(
  boardElement: HTMLElement,
  menuElement: HTMLElement,
  columns: number,
  targetHeight?: number,
  cropTolerance = ORDERED_BALANCED_CROP_TOLERANCE,
) {
  if (!Number.isFinite(targetHeight) || (targetHeight ?? 0) <= 0 || columns <= 0) return undefined;
  const footerElement = boardElement.querySelector<HTMLElement>('[data-cafe-a-footer-info][data-cafe-a-footer-placement="desktop"]');
  const footerRect = footerElement?.getBoundingClientRect();
  if (!footerRect || footerRect.width <= 0 || footerRect.height <= 0) return undefined;

  const boardRect = boardElement.getBoundingClientRect();
  const menuRect = menuElement.getBoundingClientRect();
  const footerSafetyGap = Math.max(BASIC_RIGHT_EDGE_SAFETY_GAP_PX, cropTolerance);
  const footerTopSafetyGap =
    boardRect.width < 1120 ? CAFE_A_FOOTER_INFO_TABLET_TOP_SAFETY_GAP_PX : CAFE_A_FOOTER_INFO_TOP_SAFETY_GAP_PX;
  const footerIsInsideLastMenuColumn = Boolean(footerElement?.closest("[data-cafe-a-fit-menu]"));
  if (footerIsInsideLastMenuColumn) {
    const footerReservedTargetHeight = Math.max(
      0,
      (targetHeight ?? 0) - footerRect.height - footerTopSafetyGap,
    );
    return Array.from({ length: columns }, (_, columnIndex) =>
      columnIndex === columns - 1 ? footerReservedTargetHeight : targetHeight ?? 0,
    );
  }
  const footerNoGoRect = {
    left: footerRect.left - CAFE_A_FOOTER_NO_GO_HORIZONTAL_SAFETY_GAP_PX,
    right: footerRect.right + CAFE_A_FOOTER_NO_GO_HORIZONTAL_SAFETY_GAP_PX,
    top: footerRect.top - footerTopSafetyGap - footerSafetyGap,
  };
  const menuStyle = window.getComputedStyle(menuElement);
  const columnGap =
    Number.parseFloat(menuStyle.columnGap || "0") ||
    Number.parseFloat(menuStyle.gap || "0") ||
    0;
  const columnWidth = (menuRect.width - columnGap * Math.max(0, columns - 1)) / Math.max(1, columns);
  const footerLimitedTargetHeight = Math.max(0, footerNoGoRect.top - menuRect.top);
  const columnTargetHeights = Array.from({ length: columns }, (_, columnIndex) => {
    const columnLeft = menuRect.left + columnIndex * (columnWidth + columnGap);
    const columnRight = columnLeft + columnWidth;
    const overlapsFooterNoGo = columnRight > footerNoGoRect.left && columnLeft < footerNoGoRect.right;
    return overlapsFooterNoGo ? Math.min(targetHeight ?? 0, footerLimitedTargetHeight) : targetHeight ?? 0;
  });

  return columnTargetHeights.some((height) => height < (targetHeight ?? 0) - 0.5) ? columnTargetHeights : undefined;
}


export function getOrderedBalancedContiguousColumns(
  blocks: CafeDesignABalancedBlockMeasurement[],
  columns: number,
  targetHeight?: number,
  isCandidateRejected?: (breakIndices: readonly number[]) => boolean,
  columnTargetHeights?: readonly number[],
) {
  return getCafeAOrderedBalancedContiguousColumns(blocks, columns, {
    columnTargetHeights,
    isCandidateRejected,
    targetHeight,
    allowRelatedOrder: blocks.some((block) => Boolean(block.affinity)),
    maxExhaustiveBlocks: ORDERED_BALANCED_MAX_EXHAUSTIVE_BLOCKS,
    maxExhaustiveColumns: ORDERED_BALANCED_MAX_EXHAUSTIVE_COLUMNS,
    targetMaxVisibleGap: ORDERED_BALANCED_TARGET_MAX_VISIBLE_GAP,
  });
}


export function getOrderedBalancedContiguousColumnCandidates(
  blocks: CafeDesignABalancedBlockMeasurement[],
  columns: number,
  targetHeight?: number,
  isCandidateRejected?: (breakIndices: readonly number[]) => boolean,
  columnTargetHeights?: readonly number[],
) {
  return getCafeAOrderedBalancedContiguousColumnCandidates(blocks, columns, {
    columnTargetHeights,
    isCandidateRejected,
    targetHeight,
    allowRelatedOrder: blocks.some((block) => Boolean(block.affinity)),
    maxExhaustiveBlocks: ORDERED_BALANCED_MAX_EXHAUSTIVE_BLOCKS,
    maxExhaustiveColumns: ORDERED_BALANCED_MAX_EXHAUSTIVE_COLUMNS,
    targetMaxVisibleGap: ORDERED_BALANCED_TARGET_MAX_VISIBLE_GAP,
  });
}


export function getOrderedBalancedMenuColumns({
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
  const sourceBlocks = getFlatContentBlocks(pageGroups);
  const order = parseCategoryOrder(orderedBalancedBreaks, sourceBlocks.length);
  const blocks = order ? order.map((index) => sourceBlocks[index]) : sourceBlocks;
  const safeColumns = Math.max(1, Math.min(ORDERED_BALANCED_MAX_EXHAUSTIVE_COLUMNS, Math.floor(columns), blocks.length || 1));
  const breakIndices = parseOrderedBalancedBreaks(orderedBalancedBreaks, blocks.length, safeColumns);
  const weightedBlocks = blocks.map((block, index) => ({
    block,
    index,
    estimatedHeight: estimateContentBlockHeight(block, data, capabilities),
  }));
  const fallbackBlocks = weightedBlocks.map((weightedBlock) => ({
    key: weightedBlock.block.key,
    blockType: weightedBlock.block.blockType,
    widgetPlacement:
      weightedBlock.block.blockType === "widget" ? weightedBlock.block.widget.placement ?? "bottom" : undefined,
    order: weightedBlock.index,
    height: weightedBlock.estimatedHeight,
    visibleItemHeight: weightedBlock.estimatedHeight,
    visibleTextHeight: weightedBlock.estimatedHeight,
    visiblePriceHeight: weightedBlock.estimatedHeight,
    visibleContentHeight: weightedBlock.estimatedHeight,
    marginBottom: 0,
    estimatedHeight: weightedBlock.estimatedHeight,
  }));
  const partitionColumns = breakIndices
    ? createOrderedBalancedColumnsFromBreakIndices(fallbackBlocks, safeColumns, breakIndices)
    : getOrderedBalancedContiguousColumns(fallbackBlocks, safeColumns);
  const blockByKey = new Map(blocks.map((block) => [block.key, block]));

  return dockBottomWidgetContentBlocks({
    columns: partitionColumns.map((column, columnIndex) => ({
      id: `ordered-balanced-column-${columnIndex + 1}`,
      blocks: column.blocks.map((block) => blockByKey.get(block.key)).filter((block): block is CafeDesignAContentBlock => Boolean(block)),
      estimatedHeight: column.height,
    })),
    orderedBlocks: blocks,
    data,
    capabilities,
  });
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


export function getBalancedMeasurementFromColumns({
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
  const directColumnContentHeights = Array.from(
    menuElement.querySelectorAll<HTMLElement>(":scope > [data-cafe-a-balanced-column]"),
  ).flatMap((columnElement) => {
    const style = window.getComputedStyle(columnElement);
    const paddingTop = Number.parseFloat(style.paddingTop);
    const paddingBottom = Number.parseFloat(style.paddingBottom);
    const verticalPadding =
      (Number.isFinite(paddingTop) ? paddingTop : 0) +
      (Number.isFinite(paddingBottom) ? paddingBottom : 0);
    const contentHeight = columnElement.clientHeight - verticalPadding;
    return contentHeight > 0 ? [contentHeight] : [];
  });
  const rawFlowHeight = Math.min(
    menuElement.clientHeight || menuRect.height,
    ...directColumnContentHeights,
  );
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


export function getCafeAClippingBottom(boardElement: HTMLElement, menuElement: HTMLElement) {
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


export function getCafeAActualDomCropMeasurement(
  boardElement: HTMLElement,
  menuElement: HTMLElement,
  cropTolerance: number,
  footerNoGoSafetyGapOverride?: number,
  options: { footerNoGoLeafOnly?: boolean } = {},
) {
  const adaptive = boardElement.closest('[data-cafe-a-adaptive-fit="true"]');
  const resolvedOptions = adaptive && boardElement.dataset.layoutMode === "orderedFit" ? { ...options, footerNoGoLeafOnly: true } : options;
  const actual = measureCafeAActualDomCrop(boardElement, menuElement, cropTolerance, footerNoGoSafetyGapOverride, resolvedOptions);
  if (boardElement.closest('[data-cafe-a-adaptive-fit="true"]') || !boardElement.closest('[data-cafe-a-copy-aware-rhythm="true"]') || boardElement.hasAttribute("data-cafe-a-three-part-reference")) return actual;
  // Final safety/backoff must use the SAME three-part baseline as candidates.
  // Also keep genuine actual-copy clipping (long translations, chips, etc.).
  const restore = beginCafeAThreePartReference(boardElement);
  try {
    const reference = measureCafeAActualDomCrop(boardElement, menuElement, cropTolerance, footerNoGoSafetyGapOverride, options);
    return actual.overflow ? actual : reference;
  } finally {
    restore();
  }
}


function measureCafeAActualDomCrop(
  boardElement: HTMLElement,
  menuElement: HTMLElement,
  cropTolerance: number,
  footerNoGoSafetyGapOverride?: number,
  options: { footerNoGoLeafOnly?: boolean } = {},
) {
  applyOnePageChipLayouts(menuElement);
  const menuRect = menuElement.getBoundingClientRect();
  const safeBottom = getCafeAClippingBottom(boardElement, menuElement);
  const safetyGap = Math.max(cropTolerance, ORDERED_BALANCED_ORPHAN_SAFETY_GAP);
  const rightEdgeSafety = getCafeARightEdgeSafetyMeasurement(boardElement, menuElement);
  const visibleElements = Array.from(
    menuElement.querySelectorAll<HTMLElement>(CAFE_A_VISIBLE_CONTENT_SELECTOR)
  ).filter((element) => !boardElement.closest('[data-cafe-a-adaptive-fit="true"]') || !element.closest("[data-cafe-a-footer-info]"));
  const visibleBottom = getVisibleElementBottom(visibleElements);
  const bottomGap = Number.isFinite(visibleBottom) ? safeBottom - visibleBottom : menuElement.clientHeight || menuRect.height;
  const scrollOverflow = menuElement.scrollHeight > menuElement.clientHeight + Math.max(1, cropTolerance);
  const horizontalScrollOverflow =
    menuElement.scrollWidth > menuElement.clientWidth + 1 ||
    document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
  const headerClipOverflow = Boolean(boardElement.closest('[data-cafe-a-adaptive-fit="true"]')) &&
    [...boardElement.querySelectorAll<HTMLElement>(".cafe-a-topline-description-panel, .cafe-a-topline-notices, .cafe-a-topline-brand-identity")].some((element) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 &&
        (element.scrollHeight > element.clientHeight + Math.max(1, cropTolerance) || element.scrollWidth > element.clientWidth + 1);
    });
  const widgetInternalClipOverflow = Array.from(
    menuElement.querySelectorAll<HTMLElement>("[data-cafe-a-widget-block], [data-cafe-a-widget-shell], [data-cafe-a-widget-copy]")
  ).some((element) => {
    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;
    return (
      element.scrollHeight > element.clientHeight + Math.max(1, cropTolerance) ||
      element.scrollWidth > element.clientWidth + 1 ||
      rect.bottom > safeBottom - safetyGap
    );
  });
  const rectOverflow = Number.isFinite(visibleBottom) && bottomGap < -cropTolerance;
  const columnSafeBottomGaps = Array.from(
    menuElement.querySelectorAll<HTMLElement>(":scope > [data-cafe-a-balanced-column]")
  ).flatMap((columnElement) => {
    const columnVisibleElements = Array.from(
      columnElement.querySelectorAll<HTMLElement>(CAFE_A_VISIBLE_CONTENT_SELECTOR)
    ).filter((element) => !boardElement.closest('[data-cafe-a-adaptive-fit="true"]') || !element.closest("[data-cafe-a-footer-info]"));
    const columnVisibleBottom = getVisibleElementBottom(columnVisibleElements);
    if (!Number.isFinite(columnVisibleBottom)) return [];

    const columnStyle = window.getComputedStyle(columnElement);
    const paddingBottom = Number.parseFloat(columnStyle.paddingBottom);
    const columnSafeBottom = Math.min(safeBottom, menuRect.bottom) - (Number.isFinite(paddingBottom) ? paddingBottom : 0);
    const hasFlushBottomContent = Boolean(
      columnElement.querySelector<HTMLElement>(
        ':scope > [data-cafe-a-menu-widget-block][data-cafe-a-widget-dock-bottom="true"], :scope > [data-cafe-a-footer-info]',
      ),
    );
    return [{ gap: columnSafeBottom - columnVisibleBottom, hasFlushBottomContent }];
  });
  const menuRegionSafeBottomGap = columnSafeBottomGaps.length > 0
    ? Math.min(...columnSafeBottomGaps.map(({ gap }) => gap))
    : bottomGap;
  const menuRegionSafetyGap = boardElement.closest('[data-cafe-a-skin="mocha_forest"]')
    ? MOCHA_FOREST_MENU_REGION_SAFETY_GAP
    : BALANCED_VISIBLE_GAP;
  const menuRegionSafeBottomOverflow = columnSafeBottomGaps.length > 0
    ? columnSafeBottomGaps.some(({ gap, hasFlushBottomContent }) =>
        gap < (hasFlushBottomContent ? -cropTolerance : menuRegionSafetyGap),
      )
    : menuRegionSafeBottomGap < menuRegionSafetyGap;
  const footerElement = boardElement.querySelector<HTMLElement>('[data-cafe-a-footer-info][data-cafe-a-footer-placement="desktop"]');
  const footerRect = footerElement?.getBoundingClientRect();
  const boardRect = boardElement.getBoundingClientRect();
  const footerIsVisible = Boolean(footerRect && footerRect.width > 0 && footerRect.height > 0);
  const footerIsOverlay = footerIsVisible && !footerElement?.closest("[data-cafe-a-fit-menu]");
  const footerSafetyGap = Math.max(BASIC_RIGHT_EDGE_SAFETY_GAP_PX, cropTolerance);
  const footerTopSafetyGap =
    footerIsOverlay && boardRect.width < 1120 ? CAFE_A_FOOTER_INFO_TABLET_TOP_SAFETY_GAP_PX : CAFE_A_FOOTER_INFO_TOP_SAFETY_GAP_PX;
  const footerNoGoVerticalGap = footerNoGoSafetyGapOverride ?? footerTopSafetyGap + footerSafetyGap;
  const footerNoGoTop = footerIsOverlay
    ? footerRect!.top - footerNoGoVerticalGap
    : 0;
  const footerNoGoRect = footerIsOverlay
    ? {
        left: footerRect!.left - CAFE_A_FOOTER_NO_GO_HORIZONTAL_SAFETY_GAP_PX,
        right: footerRect!.right + CAFE_A_FOOTER_NO_GO_HORIZONTAL_SAFETY_GAP_PX,
        top: footerNoGoTop,
        bottom: boardRect.bottom,
      }
    : null;
  const footerOutOfBounds = footerIsOverlay
    ? footerRect!.bottom > boardRect.bottom - footerSafetyGap ||
      footerRect!.right > boardRect.right - footerSafetyGap ||
      footerRect!.left < boardRect.left + footerSafetyGap ||
      footerRect!.top < boardRect.top + footerSafetyGap
    : false;
  const footerNoGoLeafSelectors = [
    "[data-cafe-a-category-heading]",
    "[data-cafe-a-menu-name]",
    "[data-cafe-a-menu-price]",
    ".cafe-a-menu-description",
    ".cafe-a-menu-meta",
    ".cafe-a-menu-badge",
    ".cafe-a-menu-chip",
    ".cafe-a-menu-item-image-slot",
    ".cafe-a-menu-item-image",
    ".cafe-a-price-area",
    ".cafe-a-price-stack",
    ".cafe-a-price-columns-grid",
    ".cafe-a-price-column-cell",
    ".cafe-a-price-pair",
    ".cafe-a-price-token",
    ".cafe-a-price-label",
    ".cafe-a-price-note",
    ".cafe-a-time-sale-price-block",
    ".cafe-a-time-sale-time-text",
    "[data-cafe-a-balanced-atomic-block]",
    "[data-cafe-a-widget-block]",
    "[data-cafe-a-widget-shell]",
    "[data-cafe-a-widget-media]",
    "[data-cafe-a-widget-copy]",
    "[data-cafe-a-widget-title]",
    "[data-cafe-a-widget-body]",
  ];
  const footerNoGoWrapperSelectors = ["[data-cafe-a-item-stack]", "[data-cafe-a-menu-item]"];
  const footerNoGoSelectors = options.footerNoGoLeafOnly
    ? footerNoGoLeafSelectors
    : [...footerNoGoLeafSelectors, ...footerNoGoWrapperSelectors];
  const footerNoGoOverlapElements = footerNoGoRect
    ? Array.from(
        menuElement.querySelectorAll<HTMLElement>(footerNoGoSelectors.join(","))
      ).filter((element) => {
        const rect = element.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return false;
        const horizontalOverlap = rect.right > footerNoGoRect.left && rect.left < footerNoGoRect.right;
        const overlapTolerance = boardElement.closest('[data-cafe-a-adaptive-fit="true"]') ? cropTolerance : 0;
        const verticalOverlap = rect.bottom > footerNoGoRect.top + overlapTolerance && rect.top < footerNoGoRect.bottom - overlapTolerance;
        return horizontalOverlap && verticalOverlap;
      })
    : [];
  const footerNoGoOverflow = footerNoGoOverlapElements.length > 0;
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
    footerNoGoTop,
    footerOverlapElementCount: footerNoGoOverlapElements.length,
    menuRegionSafeBottomGap,
    orphanCategoryHeading,
    overflow:
      orphanCategoryHeading ||
      rectOverflow ||
      menuRegionSafeBottomOverflow ||
      scrollOverflow ||
      widgetInternalClipOverflow ||
      horizontalScrollOverflow ||
      headerClipOverflow ||
      footerOutOfBounds ||
      footerNoGoOverflow ||
      rightEdgeSafety.rightOverflow,
  };
}


export function measureCafeABalancedFit(
  boardElement: HTMLElement,
  menuElement: HTMLElement,
  expectedColumns?: number,
  clampColumnHeight = true,
  cropTolerance = 1,
  includeActualDomCrop = false,
): CafeDesignAFitMeasurement {
  return withCafeAThreePartReference(boardElement, () => measureCafeABalancedFitReference(boardElement, menuElement, expectedColumns, clampColumnHeight, cropTolerance, includeActualDomCrop));
}


function measureCafeABalancedFitReference(
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
    const blockElements = Array.from(columnElement.querySelectorAll<HTMLElement>(":scope > [data-cafe-a-balanced-atomic-block], :scope > [data-cafe-a-balanced-category-block]"));
    const footerElement = columnElement.querySelector<HTMLElement>(":scope > [data-cafe-a-footer-info]");
    const blocks = blockElements.map((blockElement) => {
      const rect = blockElement.getBoundingClientRect();
      const order = Number.parseInt(blockElement.dataset.cafeABalancedSourceOrder ?? "", 10);
      const estimatedHeight = Number.parseFloat(blockElement.dataset.balancedEstimatedHeight ?? "");
      const visibleHeights = getBalancedBlockVisibleHeights(blockElement);

      return {
        affinity: blockElement.dataset.cafeACategoryAffinity,
        orderBoundary: blockElement.dataset.cafeAOrderBoundary,
        key: blockElement.dataset.cafeABalancedBlockId ?? blockElement.dataset.cafeABalancedCategoryBlock ?? "",
        blockType: blockElement.dataset.cafeABalancedBlockType === "widget" ? ("widget" as const) : ("category" as const),
        widgetPlacement:
          blockElement.dataset.cafeAWidgetPlacement === "bottom"
            ? ("bottom" as const)
            : blockElement.dataset.cafeAWidgetPlacement === "flow"
              ? ("flow" as const)
              : undefined,
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


export function getMenuSiteSettingString(site: PublicMenuTemplateProps["menuSite"], key: string) {
  const value = getMenuSiteSettings(site)[key];
  return typeof value === "string" ? value.trim() : "";
}


export function hasMenuSiteSetting(site: PublicMenuTemplateProps["menuSite"], key: string) {
  return Object.prototype.hasOwnProperty.call(getMenuSiteSettings(site), key);
}


export function getCafeAFooterInfo(data: PublicMenuTemplateProps, capabilities: TemplateCapabilities) {
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


export function getCategoryItems(items: PublicMenuTemplateProps["items"], categoryId: string) {
  return items
    .filter((item) => item.category_id === categoryId && item.visible !== false)
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "ko"));
}


export function getItemTraits(traits: PublicMenuTemplateProps["traits"], itemId: string) {
  return traits
    .filter((trait) => trait.menu_item_id === itemId && trait.visible)
    .sort((a, b) => a.sort_order - b.sort_order)
    .slice(0, MENU_LIMITS.maxTraitsPerItem);
}


export function getMenuItemMetaText(item: MenuItem, locale: PublicMenuTemplateProps["locale"]) {
  const displayName = item.name.trim();
  if (locale === DEFAULT_LOCALE) {
    return item.set_name?.trim() ?? "";
  }

  const defaultName = item.default_name?.trim() ?? "";
  return defaultName && defaultName !== displayName ? defaultName : "";
}


export function getFlatContentBlocks(pageGroups: MenuPageGroup[]) {
  return pageGroups.flatMap((pageGroup) => pageGroup.blocks);
}


function estimateMenuGroupHeight(
  group: MenuGroup,
  data: PublicMenuTemplateProps,
  capabilities: TemplateCapabilities,
) {
  const headingWeight = 1.9 + (group.category.description_visible && group.category.description ? 0.75 : 0);
  const itemWeight = group.items.reduce((weight, item) => {
    const { priceTokens } = getItemPriceTokensForCategory(item, group.category, data.priceOptions, capabilities);
    const traits = getItemTraits(data.traits, item.id);
    const visibleTraits = capabilities.itemTraits && shouldShowMenuItemTraits(item, traits) ? traits.filter((trait) => trait.visible) : [];

    return (
      weight +
      1 +
      (usesOnePageProportionFitPolicy(data.menuSite.template_key, data.previewDevice, data.pagePresentation)
        ? 0.83
        : (item.set_name ? 0.28 : 0) + (item.description ? 0.55 : 0)) +
      (priceTokens.length > 1 ? (priceTokens.length - 1) * 0.12 : 0) +
      (visibleTraits.length > 0 ? 0.35 : 0) +
      (item.origin_info ? 0.3 : 0)
    );
  }, 0);

  return headingWeight + itemWeight;
}


function estimateWidgetHeight(widget: CafeAWidgetPreview) {
  const ratioWeight = widget.type === "text"
    ? 0
    : {
        "3:1": 1,
        "2:1": 1.45,
        "3:2": 1.8,
        "4:3": 2.1,
        "1:1": 2.7,
        "3:4": 3.3,
        "1:2": 4.5,
        "1:3": 6,
      }[widget.aspectRatio];

  if (widget.type === "image") return ratioWeight + 0.3;

  const textWeight =
    1.1 +
    (widget.title.trim() ? 0.65 : 0) +
    Math.max(1, Math.ceil(widget.body.trim().length / 44)) * 0.42;

  return widget.type === "text" ? textWeight : ratioWeight + textWeight + 0.55;
}


export function estimateContentBlockHeight(
  block: CafeDesignAContentBlock,
  data: PublicMenuTemplateProps,
  capabilities: TemplateCapabilities,
) {
  if (block.blockType === "category") {
    return estimateMenuGroupHeight(block, data, capabilities);
  }

  return estimateWidgetHeight(block.widget);
}


export function getBottomWidgetBlocks<
  TBlock extends {
    blockType?: CafeDesignAContentBlockType;
    widget?: { placement?: "flow" | "bottom" };
    widgetPlacement?: "flow" | "bottom";
  },
>(blocks: readonly TBlock[]) {
  return blocks.filter(
    (block) =>
      block.blockType === "widget" &&
      (block.widget?.placement === "bottom" || block.widgetPlacement === "bottom"),
  );
}


function dockBottomWidgetContentBlocks({
  columns,
  orderedBlocks,
  data,
  capabilities,
}: {
  columns: BalancedColumn[];
  orderedBlocks: readonly CafeDesignAContentBlock[];
  data: PublicMenuTemplateProps;
  capabilities: TemplateCapabilities;
}) {
  const bottomWidgets = getBottomWidgetBlocks(orderedBlocks);
  if (bottomWidgets.length === 0 || columns.length === 0) return columns;

  const bottomWidgetKeys = new Set(bottomWidgets.map((block) => block.key));
  const nextColumns = columns.map((column) => ({
    ...column,
    blocks: column.blocks.filter((block) => !bottomWidgetKeys.has(block.key)),
  }));
  const lastColumn = nextColumns[nextColumns.length - 1];
  if (!lastColumn) return columns;

  lastColumn.blocks.push(...bottomWidgets);
  return nextColumns.map((column) => ({
    ...column,
    estimatedHeight: column.blocks.reduce(
      (height, block) => height + estimateContentBlockHeight(block, data, capabilities),
      0,
    ),
  }));
}


function createBalancedColumns(safeColumns: number): BalancedColumn[] {
  return Array.from({ length: safeColumns }, (_, index) => ({
    id: `balanced-column-${index + 1}`,
    blocks: [],
    estimatedHeight: 0,
  }));
}


function appendWeightedBlockToColumn(column: BalancedColumn, weightedBlock: CafeDesignABalancedWeightedBlock) {
  column.blocks.push(weightedBlock.block);
  column.estimatedHeight += weightedBlock.estimatedHeight;
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
    columns.filter((column) => column.blocks.length === 0).length * 100
  );
}


function createBalancedColumnsFromWeightedBlocks(
  weightedBlocks: CafeDesignABalancedWeightedBlock[],
  safeColumns: number,
  variant: CafeDesignABalancedVariant,
): BalancedColumn[] {
  const columns = createBalancedColumns(safeColumns);
  if (weightedBlocks.length === 0) return columns;

  if (variant === "sourceSequential") {
    const totalHeight = weightedBlocks.reduce((total, block) => total + block.estimatedHeight, 0);
    const targetHeight = totalHeight / safeColumns;
    let columnIndex = 0;

    weightedBlocks.forEach((weightedBlock, blockIndex) => {
      const remainingBlocks = weightedBlocks.length - blockIndex;
      const remainingColumns = safeColumns - columnIndex;
      const currentColumn = columns[columnIndex] ?? columns[columns.length - 1];
      const shouldAdvance =
        currentColumn.blocks.length > 0 &&
        columnIndex < safeColumns - 1 &&
        currentColumn.estimatedHeight + weightedBlock.estimatedHeight > targetHeight &&
        remainingBlocks >= remainingColumns;

      if (shouldAdvance) columnIndex += 1;
      appendWeightedBlockToColumn(columns[columnIndex] ?? columns[columns.length - 1], weightedBlock);
    });

    return columns;
  }

  if (variant === "sourceRoundRobin") {
    weightedBlocks.forEach((weightedBlock, index) => {
      appendWeightedBlockToColumn(columns[index % safeColumns], weightedBlock);
    });
    return columns;
  }

  const sortedBlocks = [...weightedBlocks].sort((a, b) => b.estimatedHeight - a.estimatedHeight || a.index - b.index);
  sortedBlocks.forEach((weightedBlock) => appendWeightedBlockToColumn(getShortestBalancedColumn(columns), weightedBlock));

  if (variant !== "lastAwareGreedy") return columns;

  let bestColumns = columns.map((column) => ({ ...column, blocks: [...column.blocks] }));
  let bestScore = getBalancedColumnsSpreadScore(bestColumns);

  for (let sourceIndex = 0; sourceIndex < safeColumns; sourceIndex += 1) {
    for (let targetIndex = 0; targetIndex < safeColumns; targetIndex += 1) {
      if (sourceIndex === targetIndex) continue;
      const sourceColumn = columns[sourceIndex];
      const targetColumn = columns[targetIndex];
      if (!sourceColumn || !targetColumn || sourceColumn.blocks.length <= 1) continue;

      for (const block of sourceColumn.blocks) {
        const weightedBlock = weightedBlocks.find((candidate) => candidate.block === block);
        if (!weightedBlock) continue;

        const nextColumns = columns.map((column) => ({
          ...column,
          blocks: column.blocks.filter((candidateBlock) => candidateBlock !== block),
          estimatedHeight: column.blocks
            .filter((candidateBlock) => candidateBlock !== block)
            .reduce((total, candidateBlock) => {
              const candidateWeightedBlock = weightedBlocks.find((candidate) => candidate.block === candidateBlock);
              return total + (candidateWeightedBlock?.estimatedHeight ?? 0);
            }, 0),
        }));
        appendWeightedBlockToColumn(nextColumns[targetIndex], weightedBlock);

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


export function getBalancedMenuColumns({
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
  const weightedBlocks = getFlatContentBlocks(pageGroups)
    .map((block, index) => ({
      block,
      index,
      estimatedHeight: estimateContentBlockHeight(block, data, capabilities),
    }));

  return dockBottomWidgetContentBlocks({
    columns: createBalancedColumnsFromWeightedBlocks(weightedBlocks, safeColumns, variant),
    orderedBlocks: weightedBlocks.map((weightedBlock) => weightedBlock.block),
    data,
    capabilities,
  });
}


export function getCenterRailContentColumns({
  pageGroups,
  data,
  capabilities,
  variant,
}: {
  pageGroups: MenuPageGroup[];
  data: PublicMenuTemplateProps;
  capabilities: TemplateCapabilities;
  variant: CafeDesignABalancedVariant;
}) {
  const orderedBlocks = getFlatContentBlocks(pageGroups);
  const columns: CafeDesignAContentBlock[][] = [[], []];
  const dockBottomWidgets = (sourceColumns: CafeDesignAContentBlock[][]) =>
    dockBottomWidgetContentBlocks({
      columns: sourceColumns.map((blocks, index) => ({
        id: `center-column-${index}`,
        blocks,
        estimatedHeight: blocks.reduce(
          (height, block) => height + estimateContentBlockHeight(block, data, capabilities),
          0,
        ),
      })),
      orderedBlocks,
      data,
      capabilities,
    }).map((column) => column.blocks);

  if (orderedBlocks.length === 0) return columns;

  if (variant === "sourceSequential") {
    const midpoint = Math.ceil(orderedBlocks.length / 2);
    columns[0] = orderedBlocks.slice(0, midpoint);
    columns[1] = orderedBlocks.slice(midpoint);
    return dockBottomWidgets(columns);
  }

  if (variant === "sourceRoundRobin") {
    orderedBlocks.forEach((block, index) => {
      columns[index % columns.length]?.push(block);
    });
    return dockBottomWidgets(columns);
  }

  const heights = [0, 0];
  orderedBlocks.forEach((block) => {
    const targetIndex = heights[0] <= heights[1] ? 0 : 1;
    columns[targetIndex].push(block);
    heights[targetIndex] += estimateContentBlockHeight(block, data, capabilities);
  });

  return dockBottomWidgets(columns);
}
