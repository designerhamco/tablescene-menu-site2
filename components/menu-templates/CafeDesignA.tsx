/* eslint-disable @next/next/no-img-element */
"use client";

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type ReactNode, type RefObject } from "react";
import { Clock3, X, ZoomIn } from "lucide-react";
import { useRouter } from "next/navigation";

import KoreanFontAssets from "@/components/menu-templates/shared/KoreanFontAssets";
import MenuLanguageSwitcher from "@/components/menu-templates/shared/MenuLanguageSwitcher";
import type { PublicMenuTemplateProps } from "@/components/menu-templates/types";
import {
  createCafeAOrderedBalancedColumnsFromBreakIndices,
  getCafeAOrderedBalancedBreaksFromColumns,
  getCafeAOrderedBalancedColumnFillMetrics,
  getCafeAOrderedBalancedContiguousColumns,
} from "@/components/menu-templates/cafe-a-balanced-layout";
import { BASIC_RIGHT_EDGE_SAFETY_GAP_PX } from "@/lib/basic-template-constants";
import { DEFAULT_LOCALE } from "@/lib/locales";
import { getMenuItemBadgeLabel } from "@/lib/menu-badges";
import { getPcTabletLayoutModeFromPageSettings } from "@/lib/menu-layout-modes";
import {
  formatMenuPriceByMode,
  getPriceDisplayModeFromSettings,
  type PriceDisplayMode,
} from "@/lib/menu-price-format";
import { getMenuPublicCapabilities } from "@/lib/menu-public-capabilities";
import { getReadableTextColorForTimeSaleBadge, normalizeTimeSaleBadgeBackgroundColor } from "@/lib/menu-time-sales";
import {
  getActiveTimeSaleWindowEndMs,
  getNextTimeSaleBoundaryMs as getScheduleNextTimeSaleBoundaryMs,
  isTimeSaleActiveAt,
  type NormalizedTimeSaleSchedule,
} from "@/lib/menu-time-sale-schedule";
import { MENU_LIMITS } from "@/lib/menu-starter-presets";
import { getBadgeStyleCss, getBadgeStyleForItem, getCustomBadgeStyles } from "@/lib/template-badge-styles";
import { getResolvedBackgroundColor } from "@/lib/template-background-colors";
import { getBasicPricingCapabilities, getTemplateCapabilities, type TemplateCapabilities } from "@/lib/template-capabilities";
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
type PublicTimeSale = PublicMenuTemplateProps["timeSales"][number];
type PublicTimeSaleItem = PublicTimeSale["items"][number];
type PublicFeaturedSlide = NonNullable<PublicMenuTemplateProps["featuredSlides"]>[number];
type PublicItemPriceColumnValue = MenuItem["priceColumnValues"][number];
type CafeDesignAFeaturedHeroSlide = {
  id: string;
  imageUrl: string | null;
  item: MenuItem;
};
type CafeDesignAPriceDisplayMode = PriceDisplayMode | null;
type CafeDesignAPriceToken = {
  label: string;
  price: string;
  priceColumnId?: string;
  originalPrice?: number | null;
  salePrice?: string;
};
type CafeDesignATimeSaleMatch = {
  promotion: PublicTimeSale;
  item?: PublicTimeSaleItem;
  optionItemsByPriceColumnId: Map<string, PublicTimeSaleItem>;
};
type CafeMenuImagePreview = {
  src: string;
  title: string;
  secondaryTitle?: string | null;
};

const CafeATimeSaleInitialNowContext = createContext(0);

function normalizeInitialNowMs(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function useCafeATimeSaleInitialNowMs() {
  return useContext(CafeATimeSaleInitialNowContext);
}
const CAFE_A_TIME_SALE_ACCENT = "#C62828";
const FEATURED_CAROUSEL_INTERVAL_MS = 5000;
const FEATURED_CAROUSEL_DRAG_START_THRESHOLD_PX = 6;
const FEATURED_CAROUSEL_SWIPE_THRESHOLD_PX = 40;
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
  { fontScale: 1.004, gapScale: 1.003 },
  { fontScale: 1.008, gapScale: 1.005 },
  { fontScale: 1.012, gapScale: 1.008 },
  { fontScale: 1.015, gapScale: 1.01 },
  { fontScale: 1.025, gapScale: 1.018 },
  { fontScale: 1.04, gapScale: 1.03 },
] as const satisfies readonly CafeDesignAFinalFillBoost[];
const DEFAULT_ORDERED_BALANCED_FINAL_FILL_BOOST: CafeDesignAFinalFillBoost = { fontScale: 1, gapScale: 1 };
const ORDERED_FIT_BASE_MENU_VISUAL_SCALE = 0.95;
const DEFAULT_ORDERED_FIT_FINAL_FILL_COMPENSATION = 1;
const ORDERED_FIT_FINAL_FILL_COMPENSATION_LEVELS = [1.015, 1.025, 1.035, 1.045, 1.055, 1.06] as const;
const ORDERED_FIT_FINAL_FILL_TRIGGER_GAP = 12;
const ORDERED_FIT_FINAL_FILL_TARGET_GAP = 12;
const ORDERED_FIT_FINAL_FILL_MIN_GAP = 2;
const ORDERED_FIT_FONT_SCALE_CANDIDATES = [1.24, 1.2, 1.16, 1.12, 1.08, 1.04, 1, 0.95, 0.88, 0.85, 0.83, 0.82, 0.78, 0.76, 0.75, 0.72, 0.71, 0.68, 0.64] as const;
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
const ORDERED_FIT_MIN_STANDARD_FONT_SCALE = 0.71;
const ORDERED_FIT_EMERGENCY_FONT_SCALE_MENU_WIDTH_PX = 820;
const ORDERED_FIT_FOOTER_AWARE_BOTTOM_SAFETY_GAP_PX = 16;
const CAFE_A_FOOTER_NO_GO_HORIZONTAL_SAFETY_GAP_PX = 12;
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

function getImageMenuColumnCandidates(width: number, groupCount: number) {
  if (groupCount <= 1) return [1];
  if (width < 760) return [2];

  const maxColumns = Math.min(3, groupCount);
  return FIT_COLUMN_CANDIDATES.filter((columns) => columns >= 2 && columns <= maxColumns).sort((a, b) => b - a);
}

function hasVisibleMenuItemImage(item: MenuItem) {
  return item.visible !== false && Boolean(item.image_url?.trim());
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
  const lastColumn = columns[columns.length - 1];
  const clippingBottom = getCafeAClippingBottom(boardElement, menuElement);
  const footerElement = boardElement.querySelector<HTMLElement>('[data-cafe-a-footer-info][data-cafe-a-footer-placement="desktop"]');
  const footerRect = footerElement?.getBoundingClientRect();
  const footerIsVisible = Boolean(footerRect && footerRect.width > 0 && footerRect.height > 0);
  const lastColumnLeft = lastColumn ? menuRect.left + lastColumn.left : 0;
  const lastColumnRight = lastColumn
    ? Math.max(menuRect.left + lastColumn.left, ...lastColumn.elements.map((rect) => rect.right))
    : 0;
  const lastColumnOverlapsFooterX =
    Boolean(lastColumn && footerIsVisible) &&
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
  return Array.from(menuElement.querySelectorAll<HTMLElement>("[data-cafe-a-balanced-atomic-block], [data-cafe-a-balanced-category-block]"))
    .map((blockElement) => {
      const rect = blockElement.getBoundingClientRect();
      const order = Number.parseInt(blockElement.dataset.cafeABalancedSourceOrder ?? "", 10);
      const estimatedHeight = Number.parseFloat(blockElement.dataset.balancedEstimatedHeight ?? "");
      const visibleHeights = getBalancedBlockVisibleHeights(blockElement);

      return {
        key: blockElement.dataset.cafeABalancedBlockId ?? blockElement.dataset.cafeABalancedCategoryBlock ?? "",
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

function createOrderedBalancedColumnsFromBreakIndices(
  blocks: CafeDesignABalancedBlockMeasurement[],
  safeColumns: number,
  breakIndices: number[],
): CafeDesignABalancedSimulatedColumn[] {
  return createCafeAOrderedBalancedColumnsFromBreakIndices(blocks, safeColumns, breakIndices);
}

function getOrderedBalancedBreaksFromColumns(columns: CafeDesignABalancedSimulatedColumn[]) {
  return getCafeAOrderedBalancedBreaksFromColumns(columns);
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
  return getCafeAOrderedBalancedColumnFillMetrics(columns, targetHeight);
}

function getOrderedBalancedContiguousColumns(blocks: CafeDesignABalancedBlockMeasurement[], columns: number, targetHeight?: number) {
  return getCafeAOrderedBalancedContiguousColumns(blocks, columns, {
    targetHeight,
    maxExhaustiveBlocks: ORDERED_BALANCED_MAX_EXHAUSTIVE_BLOCKS,
    maxExhaustiveColumns: ORDERED_BALANCED_MAX_EXHAUSTIVE_COLUMNS,
    targetMaxVisibleGap: ORDERED_BALANCED_TARGET_MAX_VISIBLE_GAP,
  });
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

function getCafeAActualDomCropMeasurement(
  boardElement: HTMLElement,
  menuElement: HTMLElement,
  cropTolerance: number,
  footerNoGoSafetyGapOverride?: number,
  options: { footerNoGoLeafOnly?: boolean } = {},
) {
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
  const footerNoGoVerticalGap = footerNoGoSafetyGapOverride ?? footerTopSafetyGap + footerSafetyGap;
  const footerNoGoTop = footerIsVisible
    ? footerRect!.top - footerNoGoVerticalGap
    : 0;
  const footerNoGoRect = footerIsVisible
    ? {
        left: footerRect!.left - CAFE_A_FOOTER_NO_GO_HORIZONTAL_SAFETY_GAP_PX,
        right: footerRect!.right + CAFE_A_FOOTER_NO_GO_HORIZONTAL_SAFETY_GAP_PX,
        top: footerNoGoTop,
        bottom: boardRect.bottom,
      }
    : null;
  const footerOutOfBounds = footerIsVisible
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
        const verticalOverlap = rect.bottom > footerNoGoRect.top && rect.top < footerNoGoRect.bottom;
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
    const blockElements = Array.from(columnElement.querySelectorAll<HTMLElement>(":scope > [data-cafe-a-balanced-atomic-block], :scope > [data-cafe-a-balanced-category-block]"));
    const footerElement = columnElement.querySelector<HTMLElement>(":scope > [data-cafe-a-footer-info]");
    const blocks = blockElements.map((blockElement) => {
      const rect = blockElement.getBoundingClientRect();
      const order = Number.parseInt(blockElement.dataset.cafeABalancedSourceOrder ?? "", 10);
      const estimatedHeight = Number.parseFloat(blockElement.dataset.balancedEstimatedHeight ?? "");
      const visibleHeights = getBalancedBlockVisibleHeights(blockElement);

      return {
        key: blockElement.dataset.cafeABalancedBlockId ?? blockElement.dataset.cafeABalancedCategoryBlock ?? "",
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

function formatPriceOption(option: PriceOption, priceDisplayMode: CafeDesignAPriceDisplayMode = null) {
  const rawPrice = option.price as unknown;
  if (priceDisplayMode) {
    if (typeof rawPrice === "number" && Number.isFinite(rawPrice)) return formatMenuPriceByMode(rawPrice, priceDisplayMode);
    if (typeof rawPrice === "string" && rawPrice.trim()) {
      const numericPrice = Number(rawPrice.replace(/,/g, ""));
      return Number.isFinite(numericPrice) ? formatMenuPriceByMode(numericPrice, priceDisplayMode) : "";
    }
    return "";
  }

  const priceLabel = option.price_label?.trim();
  if (priceLabel) return priceLabel;

  if (typeof rawPrice === "number" && Number.isFinite(rawPrice)) {
    return new Intl.NumberFormat("ko-KR").format(rawPrice) + "원";
  }
  if (typeof rawPrice === "string" && rawPrice.trim()) {
    const numericPrice = Number(rawPrice.replace(/,/g, ""));
    if (!Number.isFinite(numericPrice)) return rawPrice.trim();
    return new Intl.NumberFormat("ko-KR").format(numericPrice) + "원";
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
  priceDisplayMode: CafeDesignAPriceDisplayMode = null,
) {
  if (item.price_visible === false) return null;

  const showOptionLabel = options.showOptionLabel ?? true;
  const dedupeSamePrices = options.dedupeSamePrices ?? false;
  const maxOptions = capabilities.maxPriceOptionsPerItem ?? MENU_LIMITS.maxPriceOptionsPerItem;
  const visibleOptions = capabilities.priceOptions ? getItemPriceOptions(priceOptions, item.id, maxOptions) : [];
  if (visibleOptions.length > 0) {
    const optionPrices = visibleOptions
      .map((option) => {
        const optionPrice = formatPriceOption(option, priceDisplayMode);
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

  if (priceDisplayMode) {
    return formatMenuPriceByMode(item.price, priceDisplayMode);
  }

  return formatMenuPrice(item);
}

function getItemPriceTokens(
  item: MenuItem,
  priceOptions: PublicMenuTemplateProps["priceOptions"],
  capabilities: TemplateCapabilities,
  priceDisplayMode: CafeDesignAPriceDisplayMode = null,
): CafeDesignAPriceToken[] {
  if (item.price_visible === false) return [];

  const maxOptions = capabilities.maxPriceOptionsPerItem ?? MENU_LIMITS.maxPriceOptionsPerItem;
  const visibleOptions = capabilities.priceOptions ? getItemPriceOptions(priceOptions, item.id, maxOptions) : [];
  if (visibleOptions.length > 0) {
    const optionTokens = visibleOptions
      .map((option) => ({
        label: option.label.trim(),
        price: formatPriceOption(option, priceDisplayMode),
      }))
      .filter((token) => token.label || token.price);

    return optionTokens.map((token) => ({
      label: token.label,
      price: token.price,
    }));
  }

  const priceLabel = item.price_label?.trim() ?? "";
  const price = priceLabel || (priceDisplayMode ? formatMenuPriceByMode(item.price, priceDisplayMode) : formatMenuPrice(item));
  if (!price) return [];
  const priceNote = item.priceNote?.trim() ?? "";

  return [
    {
      label: priceNote,
      price,
    },
  ];
}

function getVisibleCategoryPriceColumns(category: MenuCategory) {
  return category.priceColumns
    .filter((column) => column.visible)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .slice(0, 3);
}

function getVisibleItemPriceColumnValueMap(item: MenuItem, category: MenuCategory) {
  const visibleColumnIds = new Set(getVisibleCategoryPriceColumns(category).map((column) => column.id));
  const values = new Map<string, PublicItemPriceColumnValue>();

  for (const value of item.priceColumnValues) {
    if (!value.visible || value.price == null || !visibleColumnIds.has(value.priceColumnId)) continue;
    values.set(value.priceColumnId, value);
  }

  return values;
}

function formatPriceColumnValue(value: PublicItemPriceColumnValue, priceDisplayMode: CafeDesignAPriceDisplayMode = null) {
  if (priceDisplayMode) {
    return typeof value.price === "number" && Number.isFinite(value.price) ? formatMenuPriceByMode(value.price, priceDisplayMode) : "";
  }

  const priceLabel = value.priceLabel?.trim();
  if (priceLabel) return priceLabel;

  if (typeof value.price === "number" && Number.isFinite(value.price)) {
    return new Intl.NumberFormat("ko-KR").format(value.price) + "원";
  }

  return "";
}

function getItemPriceColumnTokens(
  item: MenuItem,
  category: MenuCategory,
  priceDisplayMode: CafeDesignAPriceDisplayMode = null,
): CafeDesignAPriceToken[] {
  if (item.price_visible === false) return [];

  const columns = getVisibleCategoryPriceColumns(category);
  if (columns.length === 0) return [];

  const valueByColumnId = getVisibleItemPriceColumnValueMap(item, category);
  if (valueByColumnId.size === 0) return [];

  return columns.map((column) => {
    const value = valueByColumnId.get(column.id);
    const price = value ? formatPriceColumnValue(value, priceDisplayMode) : "";
    return {
      label: column.label.trim(),
      price,
      priceColumnId: column.id,
      originalPrice: value?.price ?? null,
    };
  });
}

function getItemPriceTokensForCategory(
  item: MenuItem,
  category: MenuCategory,
  priceOptions: PublicMenuTemplateProps["priceOptions"],
  capabilities: TemplateCapabilities,
  priceDisplayMode: CafeDesignAPriceDisplayMode = null,
) {
  const columnPriceTokens = getItemPriceColumnTokens(item, category, priceDisplayMode);
  if (columnPriceTokens.some((token) => token.price)) {
    return {
      priceTokens: columnPriceTokens,
      usesPriceColumns: true,
    };
  }

  return {
    priceTokens: getItemPriceTokens(item, priceOptions, capabilities, priceDisplayMode),
    usesPriceColumns: false,
  };
}

function getItemPriceColumnDisplay(
  item: MenuItem,
  category: MenuCategory,
  options: { showOptionLabel?: boolean } = {},
  priceDisplayMode: CafeDesignAPriceDisplayMode = null,
) {
  const showOptionLabel = options.showOptionLabel ?? true;
  const tokens = getItemPriceColumnTokens(item, category, priceDisplayMode).filter((token) => token.price);
  if (tokens.length === 0) return null;

  return tokens.map((token) => (showOptionLabel && token.label ? `${token.label} ${token.price}` : token.price)).join(" / ");
}

function isCafeDesignATimeSaleTemplate(templateKey?: string | null) {
  return templateKey === "cafe_design_a";
}

function getSafeDateMs(value: string | null | undefined) {
  if (!value) return NaN;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : NaN;
}

function getTimeSaleSchedule(timeSale: PublicTimeSale): NormalizedTimeSaleSchedule {
  return {
    active: true,
    scheduleType: timeSale.scheduleType,
    startsAt: timeSale.startsAt,
    endsAt: timeSale.endsAt,
    dailyStartTime: timeSale.dailyStartTime,
    dailyEndTime: timeSale.dailyEndTime,
    timeZone: "Asia/Seoul",
  };
}

function isTimeSaleCurrentlyActive(timeSale: PublicTimeSale, nowMs: number) {
  return isTimeSaleActiveAt(getTimeSaleSchedule(timeSale), nowMs);
}

function getTimeSaleByItemId(timeSales: PublicMenuTemplateProps["timeSales"], templateKey: string | null | undefined, nowMs: number) {
  const map = new Map<string, CafeDesignATimeSaleMatch>();
  if (!isCafeDesignATimeSaleTemplate(templateKey)) return map;

  for (const promotion of timeSales) {
    if (!isTimeSaleCurrentlyActive(promotion, nowMs)) continue;

    for (const item of promotion.items) {
      if (item.visible === false || item.salePrice == null || !Number.isFinite(item.salePrice) || item.salePrice <= 0) continue;

      let match = map.get(item.menuItemId);
      if (!match) {
        match = {
          promotion,
          optionItemsByPriceColumnId: new Map<string, PublicTimeSaleItem>(),
        };
        map.set(item.menuItemId, match);
      }

      if (match.promotion.id !== promotion.id) continue;

      if (item.priceColumnId === null) {
        match.item ??= item;
        continue;
      }

      if (!match.optionItemsByPriceColumnId.has(item.priceColumnId)) {
        match.optionItemsByPriceColumnId.set(item.priceColumnId, item);
      }
    }
  }

  return map;
}

function getNextTimeSaleBoundaryMs(
  timeSales: PublicMenuTemplateProps["timeSales"],
  templateKey: string | null | undefined,
  nowMs: number,
) {
  if (!isCafeDesignATimeSaleTemplate(templateKey)) return null;

  let nextBoundaryMs = Number.POSITIVE_INFINITY;
  for (const promotion of timeSales) {
    const boundaryMs = getScheduleNextTimeSaleBoundaryMs(getTimeSaleSchedule(promotion), nowMs);
    if (boundaryMs != null) nextBoundaryMs = Math.min(nextBoundaryMs, boundaryMs);
  }

  return Number.isFinite(nextBoundaryMs) ? nextBoundaryMs : null;
}

function useTimeSaleBoundaryNowMs(timeSales: PublicMenuTemplateProps["timeSales"], templateKey: string | null | undefined, initialNowMs: number) {
  const [nowMs, setNowMs] = useState(() => normalizeInitialNowMs(initialNowMs));

  useEffect(() => {
    if (!isCafeDesignATimeSaleTemplate(templateKey)) return;

    const refreshNow = () => setNowMs(Date.now());
    const nextBoundaryMs = getNextTimeSaleBoundaryMs(timeSales, templateKey, Date.now());
    const timeoutDelayMs = nextBoundaryMs == null
      ? null
      : Math.min(Math.max(0, nextBoundaryMs - Date.now() + 25), 2_147_483_647);
    const timeoutId = timeoutDelayMs == null ? null : window.setTimeout(refreshNow, timeoutDelayMs);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") refreshNow();
    };

    window.addEventListener("focus", refreshNow);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (timeoutId != null) window.clearTimeout(timeoutId);
      window.removeEventListener("focus", refreshNow);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [templateKey, timeSales, nowMs]);

  return nowMs;
}

function useNextTimeSaleStartRefresh(nextTimeSaleStartAt: string | null | undefined, enabled: boolean) {
  const router = useRouter();
  const handledBoundaryRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !nextTimeSaleStartAt) return;

    const boundaryMs = getSafeDateMs(nextTimeSaleStartAt);
    if (!Number.isFinite(boundaryMs)) return;

    const refreshForBoundary = () => {
      if (handledBoundaryRef.current === nextTimeSaleStartAt) return;

      handledBoundaryRef.current = nextTimeSaleStartAt;
      router.refresh();
    };
    const scheduleFromNow = () => {
      const nowMs = Date.now();

      if (boundaryMs <= nowMs) {
        refreshForBoundary();
        return null;
      }

      return window.setTimeout(refreshForBoundary, Math.min(boundaryMs - nowMs + 100, 2_147_483_647));
    };
    let timeoutId = scheduleFromNow();
    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;

      if (timeoutId != null) {
        window.clearTimeout(timeoutId);
      }

      timeoutId = scheduleFromNow();
    };
    const handleFocus = () => {
      if (timeoutId != null) {
        window.clearTimeout(timeoutId);
      }

      timeoutId = scheduleFromNow();
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (timeoutId != null) window.clearTimeout(timeoutId);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, nextTimeSaleStartAt, router]);
}

function formatTimeSalePrice(price: number | null, priceDisplayMode: CafeDesignAPriceDisplayMode = null) {
  if (typeof price !== "number" || !Number.isFinite(price)) return "";
  if (priceDisplayMode) return formatMenuPriceByMode(price, priceDisplayMode);

  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(price);
}

function getTimeSalePriceDisplay(item: PublicTimeSaleItem, priceDisplayMode: CafeDesignAPriceDisplayMode = null) {
  if (priceDisplayMode) return formatTimeSalePrice(item.salePrice, priceDisplayMode);

  const label = item.salePriceLabel?.trim();
  if (label) return label;
  return formatTimeSalePrice(item.salePrice, priceDisplayMode);
}

function getDatePartsInTimeZone(value: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(value));

  const getPart = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  return {
    year: getPart("year"),
    month: getPart("month"),
    day: getPart("day"),
    hour: getPart("hour"),
    minute: getPart("minute"),
  };
}

function formatTwoDigit(value: number) {
  return String(value).padStart(2, "0");
}

function formatTimeSaleDeadlineLabel(endsAt: string, timezone: string, nowMs: number) {
  const timeZone = timezone || "Asia/Seoul";
  const target = getDatePartsInTimeZone(endsAt, timeZone);
  const today = getDatePartsInTimeZone(new Date(nowMs).toISOString(), timeZone);

  if (![target.year, target.month, target.day, target.hour, target.minute].every(Number.isFinite)) {
    return "마감 시간까지";
  }

  const timeText = `${formatTwoDigit(target.hour)}:${formatTwoDigit(target.minute)}`;
  if (target.year === today.year && target.month === today.month && target.day === today.day) {
    return `오늘 ${timeText}까지`;
  }

  if (target.year === today.year && target.month === today.month) {
    return `${target.day}일 ${timeText}까지`;
  }

  if (target.year === today.year) {
    return `${target.month}월 ${target.day}일 ${timeText}까지`;
  }

  return `${target.year}년 ${target.month}월 ${target.day}일 ${timeText}까지`;
}

function formatCountdownLabel(endsAtMs: number, nowMs: number) {
  const remainingMs = Math.max(0, endsAtMs - nowMs);
  const totalSeconds = Math.floor(remainingMs / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const clock = `${formatTwoDigit(hours)}:${formatTwoDigit(minutes)}:${formatTwoDigit(seconds)}`;
  return days > 0 ? `${days}일 ${clock} 남음` : `${clock} 남음`;
}

function getActiveTimeSaleEndMs(timeSale: PublicTimeSale, nowMs: number) {
  return getActiveTimeSaleWindowEndMs(getTimeSaleSchedule(timeSale), nowMs);
}

function TimeSalePriceBlock({
  timeSale,
  originalPrice,
  salePrice,
  priceClassName,
  stacked = false,
}: {
  timeSale: PublicTimeSale;
  originalPrice: string;
  salePrice: string;
  priceClassName: string;
  stacked?: boolean;
}) {
  const [nowMs, setNowMs] = useState<number | null>(null);
  const accentColor = getCafeATimeSaleAccentColor(timeSale.badgeBackgroundColor);

  useEffect(() => {
    const updateNow = () => setNowMs(Date.now());
    updateNow();
    if (timeSale.timeDisplayMode !== "countdown") return;

    const intervalId = window.setInterval(updateNow, 1000);
    return () => window.clearInterval(intervalId);
  }, [timeSale.timeDisplayMode]);

  if (nowMs != null && !isTimeSaleCurrentlyActive(timeSale, nowMs)) {
    return <span className={`cafe-a-menu-price whitespace-nowrap font-bold leading-none ${priceClassName}`}>{originalPrice}</span>;
  }

  return (
    <span
      className={`cafe-a-time-sale-price-block ${stacked ? "cafe-a-time-sale-price-block-stacked" : "cafe-a-time-sale-price-block-inline"} inline-flex whitespace-nowrap text-right`}
      style={{ "--cafe-a-time-sale-accent": accentColor } as CSSProperties}
      data-cafe-a-time-sale-price=""
    >
      {stacked ? (
        <>
          <span className={`cafe-a-menu-price cafe-a-time-sale-price whitespace-nowrap font-black leading-none ${priceClassName}`}>{salePrice}</span>
          <span className="cafe-a-time-sale-regular-price whitespace-nowrap text-[0.72em] font-bold leading-none line-through decoration-1">
            {originalPrice}
          </span>
        </>
      ) : (
        <>
          <span className="cafe-a-time-sale-regular-price whitespace-nowrap text-[0.72em] font-bold leading-none line-through decoration-1">
            {originalPrice}
          </span>
          <span className={`cafe-a-menu-price cafe-a-time-sale-price whitespace-nowrap font-black leading-none ${priceClassName}`}>{salePrice}</span>
        </>
      )}
    </span>
  );
}

function getCafeATimeSaleAccentColor(backgroundColor: PublicTimeSale["badgeBackgroundColor"]) {
  return normalizeTimeSaleBadgeBackgroundColor(backgroundColor || CAFE_A_TIME_SALE_ACCENT);
}

function getTimeSaleBadgeStyle(backgroundColor: PublicTimeSale["badgeBackgroundColor"]): CSSProperties {
  const normalizedBackgroundColor = getCafeATimeSaleAccentColor(backgroundColor);
  return {
    backgroundColor: normalizedBackgroundColor,
    borderColor: normalizedBackgroundColor,
    color: getReadableTextColorForTimeSaleBadge(normalizedBackgroundColor),
  };
}

function TimeSaleBadge({ timeSale }: { timeSale: PublicTimeSale }) {
  return (
    <span
      className="menu-badge cafe-a-menu-badge cafe-a-time-sale-badge inline-flex rounded-none border px-1.5 py-1 font-black uppercase leading-none"
      style={getTimeSaleBadgeStyle(timeSale.badgeBackgroundColor)}
    >
      {timeSale.badgeText}
    </span>
  );
}

function TimeSaleMenuBadge({ timeSale }: { timeSale: PublicTimeSale }) {
  const initialNowMs = useCafeATimeSaleInitialNowMs();
  const [nowMs, setNowMs] = useState(() => initialNowMs);

  useEffect(() => {
    const updateNow = () => setNowMs(Date.now());
    updateNow();

    if (timeSale.timeDisplayMode !== "countdown" && timeSale.timeDisplayMode !== "message_and_countdown") return;
    const intervalId = window.setInterval(updateNow, 1000);
    return () => window.clearInterval(intervalId);
  }, [timeSale.timeDisplayMode]);

  if (!isTimeSaleCurrentlyActive(timeSale, nowMs)) {
    return null;
  }

  const activeEndsAtMs = getActiveTimeSaleEndMs(timeSale, nowMs);
  const displayText = timeSale.displayText?.trim() ?? "";
  let label = "";

  if (timeSale.timeDisplayMode === "message") {
    label = displayText;
  } else if (timeSale.timeDisplayMode === "message_and_countdown") {
    if (displayText && activeEndsAtMs != null && activeEndsAtMs > nowMs) {
      label = `${displayText} · ${formatCountdownLabel(activeEndsAtMs, nowMs)}`;
    }
  } else if (timeSale.timeDisplayMode === "countdown") {
    if (activeEndsAtMs != null && activeEndsAtMs > nowMs) {
      label = formatCountdownLabel(activeEndsAtMs, nowMs);
    }
  } else if (activeEndsAtMs != null && activeEndsAtMs > nowMs) {
    label = formatTimeSaleDeadlineLabel(new Date(activeEndsAtMs).toISOString(), timeSale.timezone, nowMs);
  }

  if (!label) return null;

  return (
    <span
      className="cafe-a-time-sale-time-text menu-font-en mb-0.5 mt-[0.3125rem] flex w-fit items-center gap-[0.25rem] text-[0.64rem] font-black uppercase leading-snug tracking-[0.08em] tabular-nums"
      style={{ color: getCafeATimeSaleAccentColor(timeSale.badgeBackgroundColor) }}
    >
      <Clock3 aria-hidden="true" focusable="false" className="cafe-a-time-sale-time-icon" strokeWidth={2} />
      <span className="tracking-normal">{label}</span>
    </span>
  );
}

function getLegacyFeaturedItem(data: PublicMenuTemplateProps) {
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

function getFeaturedHeroSlides(data: PublicMenuTemplateProps, capabilities: TemplateCapabilities): CafeDesignAFeaturedHeroSlide[] {
  if (!capabilities.featuredItemHero) return [];

  if (data.featuredSlides !== undefined) {
    return data.featuredSlides.flatMap((slide: PublicFeaturedSlide) => {
      const slideItem = data.items.find((item) => item.id === slide.featuredItemId);
      if (!slide.imageUrl || !slideItem || slideItem.visible === false) return [];
      return [{ id: slide.id, imageUrl: slide.imageUrl, item: slideItem }];
    });
  }

  if (!data.pageSettings.featured_item_enabled) return [];

  const featuredItem = getLegacyFeaturedItem(data);
  if (!featuredItem) return [];

  return [{ id: "legacy-featured-slide", imageUrl: data.menuSite.cover_image_url ?? null, item: featuredItem }];
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

function getCategoryBlockClassName(hasDivider: boolean, isTerminalDivider = false) {
  return `cafe-a-menu-category-block min-w-0${hasDivider ? " cafe-a-menu-category-block-has-divider" : ""}${
    hasDivider && isTerminalDivider ? " cafe-a-menu-category-block-terminal-divider" : ""
  }`;
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
    const { priceTokens } = getItemPriceTokensForCategory(item, group.category, data.priceOptions, capabilities);
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

function CategoryTitle({
  category,
  density,
  items,
}: {
  category: MenuCategory;
  density: MenuLayoutDensity;
  items?: MenuItem[];
}) {
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
      <div className="cafe-a-category-heading-row">
        <h2 className={`cafe-a-category-title min-w-0 break-words font-black uppercase leading-tight text-[#191c1b] ${titleClassName}`}>{category.name}</h2>
        {items ? (
          <div className="cafe-a-category-price-column-slot">
            <CategoryPriceColumnHeader category={category} items={items} />
          </div>
        ) : null}
      </div>
      {category.description_visible && category.description && (
        <p className={`cafe-a-description-text cafe-a-menu-description mt-2 break-keep text-[#3f4945] ${descriptionClassName}`}>{category.description}</p>
      )}
    </div>
  );
}

function CategoryPriceColumnHeader({
  category,
  items,
}: {
  category: MenuCategory;
  items: MenuItem[];
}) {
  const columns = getVisibleCategoryPriceColumns(category);
  if (columns.length === 0) return null;

  const hasColumnPriceValues = items.some((item) => getVisibleItemPriceColumnValueMap(item, category).size > 0);
  if (!hasColumnPriceValues) return null;

  return (
    <div
      className="menu-font-en cafe-a-price-column-header"
      style={{ "--cafe-a-price-column-count": columns.length } as CSSProperties}
      aria-label="가격 옵션 컬럼"
    >
      {columns.map((column) => (
        <span key={column.id} className="cafe-a-price-column-heading">
          {column.label}
        </span>
      ))}
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
  timeSale,
  customBadgeStyles,
  locale,
  priceDisplayMode,
  onOpenImage,
}: {
  item: MenuItem;
  category: MenuCategory;
  priceOptions: PublicMenuTemplateProps["priceOptions"];
  traits: PublicMenuTemplateProps["traits"];
  capabilities: TemplateCapabilities;
  density: MenuLayoutDensity;
  templateKey: string | null;
  timeSale?: CafeDesignATimeSaleMatch;
  customBadgeStyles: unknown;
  locale: PublicMenuTemplateProps["locale"];
  priceDisplayMode?: CafeDesignAPriceDisplayMode;
  onOpenImage?: (preview: CafeMenuImagePreview, trigger: HTMLElement) => void;
}) {
  const initialNowMs = useCafeATimeSaleInitialNowMs();
  const { priceTokens, usesPriceColumns } = getItemPriceTokensForCategory(item, category, priceOptions, capabilities, priceDisplayMode);
  const singleTimeSaleItem = timeSale?.item;
  const showTimeSale =
    !usesPriceColumns &&
    isCafeDesignATimeSaleTemplate(templateKey) &&
    item.price_visible !== false &&
    !item.price_label?.trim() &&
    priceTokens.length === 1 &&
    timeSale &&
    singleTimeSaleItem &&
    singleTimeSaleItem.visible !== false &&
    singleTimeSaleItem.salePrice != null &&
    Number.isFinite(singleTimeSaleItem.salePrice) &&
    isTimeSaleCurrentlyActive(timeSale.promotion, initialNowMs);
  const timeSalePrice = showTimeSale && singleTimeSaleItem ? getTimeSalePriceDisplay(singleTimeSaleItem, priceDisplayMode) : "";
  const priceTokensWithColumnTimeSale = usesPriceColumns
    ? priceTokens.map((token) => {
        const originalPrice = token.originalPrice;
        const saleTarget = token.priceColumnId ? timeSale?.optionItemsByPriceColumnId.get(token.priceColumnId) : undefined;
        const salePrice = saleTarget?.salePrice;
        const showColumnTimeSale =
          isCafeDesignATimeSaleTemplate(templateKey) &&
          timeSale &&
          isTimeSaleCurrentlyActive(timeSale.promotion, initialNowMs) &&
          saleTarget?.visible !== false &&
          typeof originalPrice === "number" &&
          Number.isFinite(originalPrice) &&
          originalPrice > 0 &&
          typeof salePrice === "number" &&
          Number.isFinite(salePrice) &&
          salePrice > 0 &&
          salePrice < originalPrice;

        return {
          ...token,
          salePrice: showColumnTimeSale && saleTarget ? getTimeSalePriceDisplay(saleTarget, priceDisplayMode) : "",
        };
      })
    : priceTokens;
  const showColumnTimeSale = usesPriceColumns && priceTokensWithColumnTimeSale.some((token) => Boolean(token.salePrice));
  const showMenuTimeSale = Boolean(timeSale && ((showTimeSale && timeSalePrice) || showColumnTimeSale));
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
  const trimmedMetaText = metaText.trim();
  const descriptionText = item.description?.trim() ?? "";
  const hasSecondaryText = Boolean(trimmedMetaText);
  const hasDescriptionText = Boolean(descriptionText);
  const priceCountClassName = `cafe-a-menu-item-price-count-${Math.min(priceTokens.length, 3)}${usesPriceColumns ? " cafe-a-menu-item-has-price-columns" : ""}`;
  const priceNote = "";
  const imageUrl = item.image_url?.trim() ?? "";
  const hasItemImage = Boolean(imageUrl);
  const hasOriginInfo = capabilities.originInfo && Boolean(item.origin_info?.trim());
  const contentVariant = hasSecondaryText && hasDescriptionText
    ? "full"
    : hasSecondaryText
      ? "secondary-only"
      : hasDescriptionText
        ? "description-only"
        : "title-only";
  const hasContentAfterTitle = hasSecondaryText || showMenuTimeSale || hasDescriptionText || visibleTraits.length > 0 || hasOriginInfo;
  const hasContentAfterMeta = showMenuTimeSale || hasDescriptionText || visibleTraits.length > 0 || hasOriginInfo;
  const canCenterSparseContent = !hasItemImage && contentVariant !== "full" && !usesPriceColumns && !showMenuTimeSale && visibleTraits.length === 0 && !hasOriginInfo;
  const titleRowSpacingClassName = !hasContentAfterTitle ? "mb-0" : showMenuTimeSale && timeSale && !hasSecondaryText ? "mb-0" : "mb-0.5";
  const metaSpacingClassName = !hasContentAfterMeta ? "mb-0" : showMenuTimeSale && timeSale ? "mb-0" : "mb-0.5";
  const handleOpenImage = useCallback((event: ReactMouseEvent<HTMLButtonElement>) => {
    if (!imageUrl || !onOpenImage) return;

    onOpenImage(
      {
        src: imageUrl,
        title: item.name,
        secondaryTitle: trimmedMetaText || null,
      },
      event.currentTarget,
    );
  }, [imageUrl, item.name, onOpenImage, trimmedMetaText]);

  const menuCopyElement = (
    <div className="cafe-a-menu-copy min-w-0">
      <div className={`cafe-a-menu-title-row ${titleRowSpacingClassName} flex flex-wrap items-center gap-1.5`}>
        <h3 className={`cafe-a-menu-title break-words font-bold leading-snug text-[#191c1b] ${titleClassName}`} data-cafe-a-menu-name="">{item.name}</h3>
        <Badge item={item} capabilities={capabilities} templateKey={templateKey} customBadgeStyles={customBadgeStyles} />
        {showMenuTimeSale && timeSale ? <TimeSaleBadge timeSale={timeSale.promotion} /> : null}
        {item.is_sold_out && <SoldOutBadge />}
      </div>
      {hasSecondaryText && (
        <p className={`menu-font-en cafe-a-menu-meta ${metaSpacingClassName} break-words font-medium uppercase leading-snug text-[#333333] ${metaClassName}`}>
          {trimmedMetaText}
        </p>
      )}
      {showMenuTimeSale && timeSale ? <TimeSaleMenuBadge timeSale={timeSale.promotion} /> : null}
      {hasDescriptionText && (
        <p className={`cafe-a-description-text cafe-a-menu-description break-keep text-[#3f4945] ${descriptionTextClassName} ${descriptionClassName}`}>{descriptionText}</p>
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
      {hasOriginInfo && <p className="cafe-a-description-text cafe-a-menu-description cafe-a-menu-description-size-default mt-2 line-clamp-2 break-words text-[#707975]">원산지 {item.origin_info?.trim()}</p>}
    </div>
  );
  const priceAreaElement = (
    <>
      {priceTokens.length > 0 && usesPriceColumns && (
        <div className="menu-price cafe-a-price-area shrink-0 text-right text-[#191c1b] lg:justify-self-end" data-cafe-a-menu-price="">
          <div
            className="cafe-a-price-columns-grid"
            style={{ "--cafe-a-price-column-count": priceTokens.length } as CSSProperties}
            data-cafe-a-price-columns=""
          >
            {priceTokensWithColumnTimeSale.map((token, index) => (
              <span key={`${token.label}-${token.price}-${index}`} className="cafe-a-price-column-cell">
                {token.price && token.salePrice && timeSale ? (
                  <TimeSalePriceBlock
                    timeSale={timeSale.promotion}
                    originalPrice={token.price}
                    salePrice={token.salePrice}
                    priceClassName={priceClassName}
                    stacked
                  />
                ) : token.price ? (
                  <span className={`cafe-a-menu-price whitespace-nowrap font-bold leading-none ${priceClassName}`}>{token.price}</span>
                ) : (
                  <span aria-hidden="true">&nbsp;</span>
                )}
              </span>
            ))}
          </div>
          {priceNote && <p className="cafe-a-price-note mt-1 break-keep text-right font-bold leading-snug text-[#65706b]">{priceNote}</p>}
        </div>
      )}
      {priceTokens.length > 0 && !usesPriceColumns && (
        <div className="menu-price cafe-a-price-area shrink-0 text-right text-[#191c1b] lg:justify-self-end" data-cafe-a-menu-price="">
          <div className="cafe-a-price-stack cafe-a-price-inline flex flex-wrap items-baseline justify-end">
            {priceTokens.map((token, index) => (
              <span key={`${token.label}-${token.price}-${index}`} className="cafe-a-price-token inline-flex items-baseline whitespace-nowrap">
                {index > 0 && <span className="cafe-a-price-separator font-bold text-[#191c1b]/45">/</span>}
                <span className={`cafe-a-price-pair inline-flex whitespace-nowrap ${token.label ? "cafe-a-price-pair-with-note" : ""} ${showTimeSale && timeSalePrice && index === 0 ? "items-baseline gap-x-1" : "items-baseline"}`}>
                  {token.label && <span className="cafe-a-price-label whitespace-nowrap font-bold uppercase leading-none text-[#191c1b]">{token.label}</span>}
                  {showTimeSale && timeSalePrice && index === 0 ? (
                    <TimeSalePriceBlock
                      timeSale={timeSale.promotion}
                      originalPrice={token.price}
                      salePrice={timeSalePrice}
                      priceClassName={priceClassName}
                    />
                  ) : (
                    <span className={`cafe-a-menu-price whitespace-nowrap font-bold leading-none ${priceClassName}`}>{token.price}</span>
                  )}
                </span>
              </span>
            ))}
          </div>
          {priceNote && <p className="cafe-a-price-note mt-1 break-keep text-right font-bold leading-snug text-[#65706b]">{priceNote}</p>}
        </div>
      )}
    </>
  );

  return (
    <article
      className={`cafe-a-menu-item grid items-start ${canCenterSparseContent ? "cafe-a-menu-item-align-center" : ""} ${hasItemImage ? "cafe-a-menu-item-with-image" : ""} ${priceCountClassName} ${itemGridClassName}`}
      data-cafe-a-content-variant={contentVariant}
      data-cafe-a-menu-item=""
    >
      {hasItemImage && (
        <button
          type="button"
          className="cafe-a-menu-item-image-slot"
          onClick={handleOpenImage}
          aria-label={`${item.name} 이미지 크게 보기`}
        >
          <img
            src={imageUrl}
            alt={`${item.name} 이미지`}
            className="cafe-a-menu-item-image"
            loading="lazy"
            decoding="async"
          />
          <span className="cafe-a-menu-item-image-zoom" aria-hidden="true">
            <ZoomIn className="h-3.5 w-3.5" strokeWidth={2} />
          </span>
        </button>
      )}
      {hasItemImage ? (
        <div className="cafe-a-menu-item-content-shell">
          {menuCopyElement}
          {priceAreaElement}
        </div>
      ) : (
        <>
          {menuCopyElement}
          {priceAreaElement}
        </>
      )}
    </article>
  );
}

function CafeMenuImageLightbox({
  preview,
  onClose,
}: {
  preview: CafeMenuImagePreview | null;
  onClose: () => void;
}) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!preview) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusFrameId = window.requestAnimationFrame(() => {
      closeButtonRef.current?.focus({ preventScroll: true });
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key === "Tab") {
        const focusableElements = Array.from(
          dialogRef.current?.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
          ) ?? [],
        ).filter((element) => !element.hasAttribute("disabled") && element.getAttribute("aria-hidden") !== "true");
        const firstFocusable = focusableElements[0];
        const lastFocusable = focusableElements[focusableElements.length - 1];
        if (!firstFocusable || !lastFocusable) return;

        if (event.shiftKey && document.activeElement === firstFocusable) {
          event.preventDefault();
          lastFocusable.focus();
        } else if (!event.shiftKey && document.activeElement === lastFocusable) {
          event.preventDefault();
          firstFocusable.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrameId);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose, preview]);

  if (!preview) return null;

  return (
    <div
      ref={dialogRef}
      className="cafe-a-image-lightbox fixed inset-0 z-[80] flex items-center justify-center bg-black/78 px-[max(1rem,env(safe-area-inset-left))] py-[max(1rem,env(safe-area-inset-top))] text-white"
      role="dialog"
      aria-modal="true"
      aria-label={`${preview.title} 이미지 크게 보기`}
      onClick={onClose}
    >
      <div className="relative flex max-h-[85vh] w-fit max-w-[90vw] flex-col items-center gap-3" onClick={(event) => event.stopPropagation()}>
        <button
          ref={closeButtonRef}
          type="button"
          className="cafe-a-image-lightbox-close fixed right-[max(1rem,env(safe-area-inset-right))] top-[max(1rem,env(safe-area-inset-top))] z-10 inline-flex h-11 w-11 items-center justify-center bg-transparent text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.55)] transition-[opacity,transform] hover:opacity-75 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent md:absolute md:right-[-3.75rem] md:top-[-0.75rem]"
          onClick={onClose}
          aria-label="이미지 크게 보기 닫기"
        >
          <X aria-hidden="true" className="h-6 w-6" strokeWidth={1.9} />
        </button>
        <img
          src={preview.src}
          alt={`${preview.title} 이미지`}
          className="max-h-[78vh] max-w-full object-contain"
          decoding="async"
        />
        <div className="max-w-full text-center">
          <p className="break-keep text-sm font-black leading-tight">{preview.title}</p>
          {preview.secondaryTitle ? (
            <p className="menu-font-en mt-1 text-[0.68rem] font-semibold uppercase leading-tight text-white/72">{preview.secondaryTitle}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function CoverHero({
  data,
  featuredSlides,
  capabilities,
  density,
  customBadgeStyles,
  priceDisplayMode,
  desktopClassName = "",
}: {
  data: PublicMenuTemplateProps;
  featuredSlides: CafeDesignAFeaturedHeroSlide[];
  capabilities: TemplateCapabilities;
  density: MenuLayoutDensity;
  customBadgeStyles: unknown;
  priceDisplayMode?: CafeDesignAPriceDisplayMode;
  desktopClassName?: string;
}) {
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [isFocusPaused, setIsFocusPaused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isDocumentHidden, setIsDocumentHidden] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [carouselProgress, setCarouselProgress] = useState(0);
  const progressElapsedMsRef = useRef(0);
  const progressFrameRef = useRef<number | null>(null);
  const dragStartXRef = useRef<number | null>(null);
  const dragStartYRef = useRef<number | null>(null);
  const dragDeltaXRef = useRef(0);
  const dragDeltaYRef = useRef(0);
  const dragIntentActiveRef = useRef(false);
  const dragPointerIdRef = useRef<number | null>(null);
  const hasCarousel = featuredSlides.length > 1;
  const safeActiveSlideIndex = featuredSlides.length === 0 ? 0 : Math.min(activeSlideIndex, featuredSlides.length - 1);
  const activeSlide = featuredSlides[safeActiveSlideIndex] ?? featuredSlides[0] ?? null;
  const featuredItem = activeSlide?.item ?? null;
  const featuredCategory = featuredItem ? data.categories.find((category) => category.id === featuredItem.category_id) ?? null : null;
  const price = featuredItem
    ? featuredCategory
      ? getItemPriceColumnDisplay(featuredItem, featuredCategory, { showOptionLabel: false }, priceDisplayMode) ??
        getItemPriceDisplay(featuredItem, data.priceOptions, capabilities, { showOptionLabel: false, dedupeSamePrices: true }, priceDisplayMode)
      : getItemPriceDisplay(featuredItem, data.priceOptions, capabilities, { showOptionLabel: false, dedupeSamePrices: true }, priceDisplayMode)
    : null;
  const featuredBadgeLabel = featuredItem && capabilities.itemBadges ? getMenuItemBadgeLabel(featuredItem) : "";
  const heroMinHeightClassName = {
    spacious: "min-h-[400px]",
    default: "min-h-[380px]",
    compact: "min-h-[340px]",
    ultraCompact: "min-h-[320px]",
  }[density];
  const carouselPaused = isFocusPaused || isDragging || isDocumentHidden;
  const canAutoAdvance = hasCarousel && !prefersReducedMotion && !carouselPaused;
  const progressCircumference = 2 * Math.PI * 5;

  const goToSlide = useCallback(
    (nextIndex: number) => {
      if (featuredSlides.length === 0) return;
      progressElapsedMsRef.current = 0;
      setCarouselProgress(0);
      setActiveSlideIndex(((nextIndex % featuredSlides.length) + featuredSlides.length) % featuredSlides.length);
    },
    [featuredSlides.length],
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateReducedMotionPreference = () => setPrefersReducedMotion(mediaQuery.matches);
    updateReducedMotionPreference();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", updateReducedMotionPreference);
      return () => mediaQuery.removeEventListener("change", updateReducedMotionPreference);
    }

    mediaQuery.addListener(updateReducedMotionPreference);
    return () => mediaQuery.removeListener(updateReducedMotionPreference);
  }, []);

  useEffect(() => {
    const updateVisibility = () => setIsDocumentHidden(document.hidden);
    updateVisibility();
    document.addEventListener("visibilitychange", updateVisibility);
    return () => document.removeEventListener("visibilitychange", updateVisibility);
  }, []);

  useEffect(() => {
    if (!canAutoAdvance) {
      if (progressFrameRef.current != null) {
        window.cancelAnimationFrame(progressFrameRef.current);
        progressFrameRef.current = null;
      }
      return;
    }

    let startedAtMs: number | null = null;
    const tick = (nowMs: number) => {
      if (startedAtMs == null) {
        startedAtMs = nowMs - progressElapsedMsRef.current;
      }

      const elapsedMs = nowMs - startedAtMs;
      progressElapsedMsRef.current = elapsedMs;
      const nextProgress = Math.min(elapsedMs / FEATURED_CAROUSEL_INTERVAL_MS, 1);
      setCarouselProgress(nextProgress);

      if (nextProgress >= 1) {
        progressElapsedMsRef.current = 0;
        setCarouselProgress(0);
        setActiveSlideIndex((currentIndex) => (currentIndex + 1) % featuredSlides.length);
        return;
      }

      progressFrameRef.current = window.requestAnimationFrame(tick);
    };

    progressFrameRef.current = window.requestAnimationFrame(tick);
    return () => {
      if (progressFrameRef.current != null) {
        window.cancelAnimationFrame(progressFrameRef.current);
        progressFrameRef.current = null;
      }
    };
  }, [safeActiveSlideIndex, canAutoAdvance, featuredSlides.length]);

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragPointerIdRef.current === event.pointerId && event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (dragIntentActiveRef.current && Math.abs(dragDeltaXRef.current) >= FEATURED_CAROUSEL_SWIPE_THRESHOLD_PX) {
      goToSlide(safeActiveSlideIndex + (dragDeltaXRef.current < 0 ? 1 : -1));
    } else if (dragIntentActiveRef.current) {
      goToSlide(safeActiveSlideIndex);
    }

    dragStartXRef.current = null;
    dragStartYRef.current = null;
    dragDeltaXRef.current = 0;
    dragDeltaYRef.current = 0;
    dragIntentActiveRef.current = false;
    dragPointerIdRef.current = null;
    setIsDragging(false);
  };

  return (
    <section
      className={`cafe-a-cover-hero flex min-w-0 ${heroMinHeightClassName} flex-col bg-[#eceeec] md:col-span-2 lg:col-span-1 lg:row-span-2 lg:min-h-0 ${desktopClassName}`}
      onFocusCapture={() => setIsFocusPaused(true)}
      onBlurCapture={(event) => {
        const nextFocusedElement = event.relatedTarget instanceof Node ? event.relatedTarget : null;
        if (!event.currentTarget.contains(nextFocusedElement)) {
          setIsFocusPaused(false);
        }
      }}
    >
      <div
        className={`cafe-a-cover-frame relative h-full ${heroMinHeightClassName} flex-1 touch-pan-y overflow-hidden lg:min-h-0`}
        onPointerDown={(event) => {
          if (!hasCarousel || (event.pointerType === "mouse" && event.button !== 0)) return;
          dragStartXRef.current = event.clientX;
          dragStartYRef.current = event.clientY;
          dragDeltaXRef.current = 0;
          dragDeltaYRef.current = 0;
          dragIntentActiveRef.current = false;
          dragPointerIdRef.current = event.pointerId;
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (dragStartXRef.current == null || dragStartYRef.current == null || dragPointerIdRef.current !== event.pointerId) return;
          dragDeltaXRef.current = event.clientX - dragStartXRef.current;
          dragDeltaYRef.current = event.clientY - dragStartYRef.current;

          if (!dragIntentActiveRef.current) {
            const absoluteX = Math.abs(dragDeltaXRef.current);
            const absoluteY = Math.abs(dragDeltaYRef.current);
            if (absoluteX >= FEATURED_CAROUSEL_DRAG_START_THRESHOLD_PX && absoluteX > absoluteY) {
              dragIntentActiveRef.current = true;
              setIsDragging(true);
            }
          }
        }}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={() => {
          dragStartXRef.current = null;
          dragStartYRef.current = null;
          dragDeltaXRef.current = 0;
          dragDeltaYRef.current = 0;
          dragIntentActiveRef.current = false;
          dragPointerIdRef.current = null;
          setIsDragging(false);
        }}
      >
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#eef1ef_0%,#dfe6e2_42%,#f7f8f6_100%)]" />
        {featuredSlides.map((slide, index) =>
          slide.imageUrl ? (
            <img
              key={slide.id}
              src={slide.imageUrl}
              alt=""
              className={`absolute inset-0 h-full w-full select-none object-cover transition-opacity duration-500 ${
                index === safeActiveSlideIndex ? "opacity-100" : "opacity-0"
              }`}
              draggable={false}
            />
          ) : null,
        )}
        <div className="absolute inset-x-0 bottom-0 h-[72%] bg-[linear-gradient(to_top,rgba(0,0,0,0.68)_0%,rgba(0,0,0,0.46)_38%,rgba(0,0,0,0.18)_72%,rgba(0,0,0,0)_100%)]" />
        {hasCarousel && (
          <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
            {featuredSlides.map((slide, index) => {
              const isActive = index === safeActiveSlideIndex;
              return (
                <button
                  key={slide.id}
                  type="button"
                  className="relative h-4 w-4 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  aria-label={`${index + 1}번째 대표 슬라이드 보기`}
                  aria-current={isActive ? "true" : undefined}
                  onClick={() => goToSlide(index)}
                >
                  <span className={`absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full ${isActive ? "bg-white" : "bg-white/55"}`} />
                  {isActive && (
                    <svg className="absolute inset-0 h-4 w-4 -rotate-90" viewBox="0 0 14 14" aria-hidden="true" focusable="false">
                      <circle cx="7" cy="7" r="5" fill="none" stroke="rgba(255,255,255,0.34)" strokeWidth="1.5" />
                      <circle
                        cx="7"
                        cy="7"
                        r="5"
                        fill="none"
                        stroke="white"
                        strokeLinecap="round"
                        strokeWidth="1.5"
                        strokeDasharray={progressCircumference}
                        strokeDashoffset={progressCircumference * (1 - carouselProgress)}
                      />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        )}
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

function CafeLanguageHoverControl({
  data,
  className = "",
}: {
  data: PublicMenuTemplateProps;
  className?: string;
}) {
  const visibleLocaleCount = Array.from(new Set(data.enabledLocales)).length;
  if (visibleLocaleCount <= 1) return null;

  return (
    <div className={`menu-font-en relative shrink-0 text-right text-[#191c1b] ${className}`}>
      <div>
        <MenuLanguageSwitcher currentLocale={data.locale} enabledLocales={data.enabledLocales} compact triggerVariant="cafe" />
      </div>
    </div>
  );
}

function getCafeNoirMenuColumns(groups: MenuGroup[]) {
  if (groups.length <= 4) {
    return [
      groups.slice(0, 2),
      groups.slice(2, 3),
      groups.slice(3),
    ];
  }

  const columns: MenuGroup[][] = [[], [], []];
  groups.forEach((group, index) => {
    columns[index % columns.length].push(group);
  });
  return columns;
}

function getCafeNoirColumnBodyClassName(groupCount: number) {
  const baseClassName = "flex h-full min-h-0 flex-col overflow-visible lg:overflow-hidden";

  return groupCount > 1 ? `${baseClassName} justify-between gap-[clamp(1rem,2.35vh,1.8rem)]` : baseClassName;
}

function getCafeNoirGroupClassName() {
  return "break-inside-avoid";
}

function getCafeNoirItemListClassName() {
  return "space-y-[clamp(0.5rem,1.12vh,0.76rem)]";
}

const CAFE_NOIR_DESCRIPTION_TEXT_CLASS_NAME = "text-[10px] leading-relaxed";
const CAFE_NOIR_BRAND_RAIL_TEXT = "cold desserts & coffee";

function getCafeNoirTextFontClassName(value: string) {
  const hasLatinLikeText = /[A-Za-z0-9]/.test(value);
  const hasHangulText = /[가-힣]/.test(value);
  return hasLatinLikeText && !hasHangulText ? "menu-font-en" : "";
}

function getCafeNoirBrandDescription(site: PublicMenuTemplateProps["menuSite"]) {
  return site.brand_description?.trim() || CAFE_NOIR_BRAND_RAIL_TEXT;
}

function getCafeNoirSupportCopySizeClassName(value: string) {
  const length = Array.from(value.trim()).length;
  if (length > 42) {
    return "max-h-full text-[clamp(24px,3.55vh,34px)] leading-[0.9]";
  }
  if (length > 28) {
    return "max-h-full text-[clamp(34px,5.05vh,48px)] leading-[0.8]";
  }
  return "text-[clamp(42px,5.2vh,54px)] leading-[0.72]";
}

function getCafeNoirNoticeTexts(site: PublicMenuTemplateProps["menuSite"]) {
  return {
    intro:
      (hasMenuSiteSetting(site, "footer_notice_1") ? getMenuSiteSettingString(site, "footer_notice_1") : site.opening_hours?.trim()) ||
      "차분한 온도의 커피와 디저트를 전하는 미니멀 카페입니다.",
    address:
      (hasMenuSiteSetting(site, "footer_notice_2") ? getMenuSiteSettingString(site, "footer_notice_2") : site.restaurant_address?.trim()) ||
      "Address · 14, Menulink-ro, Seoul",
    footer:
      (hasMenuSiteSetting(site, "footer_notice_3") ? getMenuSiteSettingString(site, "footer_notice_3") : site.restaurant_phone?.trim()) ||
      "QUIET SIPS. SOFT FINISH.",
  };
}

function getCafeNoirStoreTitle(site: PublicMenuTemplateProps["menuSite"]) {
  const restaurantName = site.restaurant_name?.trim() || site.name?.trim();
  return restaurantName || "NOIR CAFE";
}

function isCafeNoirStarterPlaceholderLogo(logoUrl: string | null | undefined) {
  return logoUrl?.trim() === "/placeholders/starter/logo.svg";
}

function CafeNoirMonogram({
  logoUrl,
  title,
  onLogoError,
  className = "",
  style,
}: {
  logoUrl: string | null;
  title: string;
  onLogoError: () => void;
  className?: string;
  style?: CSSProperties;
}) {
  if (logoUrl) {
    return (
      <div className={`flex items-start justify-start ${className}`} style={style} data-noir-logo-slot="">
        <img
          src={logoUrl}
          alt={`${title} 로고`}
          className="block"
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            maxWidth: "100%",
            maxHeight: "100%",
            objectFit: "contain",
            objectPosition: "left top",
          }}
          onError={onLogoError}
        />
      </div>
    );
  }

  return <div className={className} style={style} data-noir-logo-slot="" aria-hidden="true" />;
}

function CafeNoirA({ data }: { data: PublicMenuTemplateProps }) {
  const capabilities = getTemplateCapabilities(data.menuSite.template_key);
  const publicCapabilities = getMenuPublicCapabilities(data.publicServiceType);
  const customTypography = getCustomTypographySettings(data.menuSite.settings, data.menuSite.page_settings);
  const typographySettings = mergeTypographySettings(data.menuSite.template_key, customTypography);
  const koreanFontAssets = getKoreanFontLoadAssets(typographySettings.korean_font_key);
  const englishFontAssets = getEnglishFontLoadAssets(typographySettings.english_font_key);
  const typographyStyle = getTypographyCssVariables(typographySettings);
  const pageGroups = publicCapabilities.menuPages ? getVisibleMenuPageGroups(data) : [];
  const menuGroups = getFlatMenuGroups(pageGroups);
  const menuColumns = getCafeNoirMenuColumns(menuGroups);
  const storeTitle = getCafeNoirStoreTitle(data.menuSite);
  const supportCopy = getCafeNoirBrandDescription(data.menuSite);
  const supportCopySizeClassName = getCafeNoirSupportCopySizeClassName(supportCopy);
  const supportCopyFontClassName = getCafeNoirTextFontClassName(supportCopy);
  const notices = getCafeNoirNoticeTexts(data.menuSite);
  const introNoticeFontClassName = getCafeNoirTextFontClassName(notices.intro);
  const addressNoticeFontClassName = getCafeNoirTextFontClassName(notices.address);
  const footerNoticeFontClassName = getCafeNoirTextFontClassName(notices.footer);
  const [logoFailed, setLogoFailed] = useState(false);
  const mobileBrandStackRef = useRef<HTMLDivElement>(null);
  const desktopStoreTitleRef = useRef<HTMLHeadingElement>(null);
  const [logoFitSize, setLogoFitSize] = useState({
    mobileHeight: 52,
    mobileWidth: 124,
    desktopHeight: 56,
    desktopWidth: 134,
  });
  const shouldShowLogo = shouldUseBrandLogo(data.menuSite, capabilities);
  const logoUrl = shouldShowLogo && !logoFailed && !isCafeNoirStarterPlaceholderLogo(data.menuSite.logo_url) ? data.menuSite.logo_url : null;

  useLayoutEffect(() => {
    const updateLogoFitSize = () => {
      const mobileRect = mobileBrandStackRef.current?.getBoundingClientRect();
      const desktopRect = desktopStoreTitleRef.current?.getBoundingClientRect();
      const nextMobileHeight = mobileRect ? Math.max(36, Math.round(mobileRect.height)) : 52;
      const nextDesktopHeight = desktopRect ? Math.max(42, Math.round(desktopRect.height)) : 56;
      const nextMobileWidth = mobileRect
        ? Math.max(nextMobileHeight, Math.min(Math.round(mobileRect.width), Math.round(nextMobileHeight * 2.4)))
        : 124;
      const nextDesktopWidth = desktopRect ? Math.max(nextDesktopHeight, Math.min(142, Math.round(nextDesktopHeight * 2.4))) : 134;

      setLogoFitSize((current) => {
        if (
          current.mobileHeight === nextMobileHeight &&
          current.mobileWidth === nextMobileWidth &&
          current.desktopHeight === nextDesktopHeight &&
          current.desktopWidth === nextDesktopWidth
        ) {
          return current;
        }

        return {
          mobileHeight: nextMobileHeight,
          mobileWidth: nextMobileWidth,
          desktopHeight: nextDesktopHeight,
          desktopWidth: nextDesktopWidth,
        };
      });
    };

    updateLogoFitSize();

    const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updateLogoFitSize);
    if (resizeObserver) {
      if (mobileBrandStackRef.current) resizeObserver.observe(mobileBrandStackRef.current);
      if (desktopStoreTitleRef.current) resizeObserver.observe(desktopStoreTitleRef.current);
    }
    window.addEventListener("resize", updateLogoFitSize);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateLogoFitSize);
    };
  }, [storeTitle, supportCopy]);

  return (
    <>
      <KoreanFontAssets assets={[koreanFontAssets, englishFontAssets]} />
      <main
        className="menu-typography menu-font-ko min-h-screen overflow-x-hidden bg-[#f9f9f6] text-[#111111] lg:h-[100dvh] lg:overflow-hidden"
        style={{ ...typographyStyle, backgroundColor: "#f9f9f6", "--noir-top-band-height": "clamp(56px,7vh,76px)" } as CSSProperties}
      >
        <div className="group/cafe-board relative mx-auto w-full max-w-none px-4 py-5 sm:px-7 sm:py-7 md:px-10 lg:h-full lg:p-[clamp(32px,4.2vmin,68px)] lg:pl-[clamp(26px,3.45vmin,56px)]">
          <CafeLanguageHoverControl data={data} className="absolute right-4 top-4 z-20 sm:right-7 sm:top-7 lg:right-[clamp(32px,4.2vmin,68px)] lg:top-[clamp(32px,4.2vmin,68px)]" />

          <section className="grid min-h-0 grid-cols-1 gap-6 bg-[#f9f9f6] lg:h-full lg:grid-cols-[minmax(328px,1.06fr)_minmax(0,3.08fr)] lg:gap-[clamp(28px,2.8vw,46px)]">
            <aside className="relative min-h-0 overflow-visible border-b border-[#d8d8d2] pb-5 lg:border-b-0 lg:pb-0 lg:pl-[clamp(18px,1.7vmin,26px)] lg:pr-[clamp(10px,1.35vmin,20px)]">
              <div className="flex items-center justify-between gap-4 lg:hidden">
                <CafeNoirMonogram
                  logoUrl={logoUrl}
                  title={storeTitle}
                  onLogoError={() => setLogoFailed(true)}
                  className="shrink-0"
                  style={{
                    width: `${logoFitSize.mobileWidth}px`,
                    height: `${logoFitSize.mobileHeight}px`,
                    maxWidth: `${logoFitSize.mobileWidth}px`,
                    maxHeight: `${logoFitSize.mobileHeight}px`,
                  }}
                />
                <div ref={mobileBrandStackRef} className="flex min-w-0 flex-col justify-center text-right" data-noir-mobile-brand-stack="">
                  <p className="menu-font-en text-[34px] font-semibold uppercase leading-[0.92] tracking-normal" data-noir-mobile-store-title="">{storeTitle}</p>
                  <p className={`${supportCopyFontClassName} mt-2 break-keep text-[11px] leading-relaxed text-[#4b4b48]`} data-noir-mobile-store-description="">{supportCopy}</p>
                </div>
              </div>

              <div className="hidden h-full min-h-0 overflow-hidden lg:grid lg:grid-rows-[var(--noir-top-band-height)_minmax(0,1fr)]">
                <div className="menu-font-en relative min-h-0 overflow-visible">
                  <CafeNoirMonogram
                    logoUrl={logoUrl}
                    title={storeTitle}
                    onLogoError={() => setLogoFailed(true)}
                    className="absolute left-0 top-0 h-full max-h-full w-[clamp(104px,14vh,142px)]"
                    style={{
                      width: `${logoFitSize.desktopWidth}px`,
                      height: `${logoFitSize.desktopHeight}px`,
                      maxWidth: `${logoFitSize.desktopWidth}px`,
                      maxHeight: `${logoFitSize.desktopHeight}px`,
                    }}
                  />
                  <span className="menu-font-en absolute right-0 top-1 text-right text-[10px] font-medium uppercase leading-tight tracking-[0.08em] text-[#4b4b48]">
                    Bitter cacao
                    <br />
                    Quiet butter
                    <br />
                    Soft finish
                  </span>
                </div>

                <div className="relative flex min-h-0 flex-1 items-stretch pb-[clamp(5px,0.9vh,10px)] pl-[clamp(3px,0.5vw,8px)] pr-[clamp(48px,4.25vw,70px)] pt-[clamp(10px,1.5vh,16px)]">
                  <div className="flex min-h-0 items-end gap-[clamp(30px,2.45vw,46px)]">
                    <p
                      className="menu-font-en relative max-h-full text-[clamp(150px,26.6vh,244px)] font-light uppercase leading-[0.56] tracking-normal text-[#111111]"
                      style={{
                        left: "clamp(10px,0.85vw,18px)",
                        writingMode: "vertical-rl",
                        transform: "rotate(180deg)",
                      } as CSSProperties}
                      data-noir-menu-lettering=""
                    >
                      MENU
                    </p>
                    <div className="relative h-full max-h-full w-[clamp(74px,6.8vw,106px)] shrink-0 overflow-visible">
                      <p
                        className={`${supportCopyFontClassName} ${supportCopySizeClassName} absolute bottom-0 left-[50%] w-[clamp(450px,54vh,590px)] origin-bottom-left whitespace-nowrap break-keep font-light tracking-normal text-[#202020]`}
                        style={{ transform: "rotate(-90deg)" } as CSSProperties}
                        data-noir-brand-rail=""
                      >
                        {supportCopy}
                      </p>
                    </div>
                  </div>
                  <div className="menu-font-en absolute bottom-[clamp(8px,1.2vh,14px)] right-0 top-[clamp(10px,1.5vh,16px)] flex flex-col items-end justify-between text-right uppercase tracking-[0.08em] text-[#5d5d58]">
                    <p className={CAFE_NOIR_DESCRIPTION_TEXT_CLASS_NAME} style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" } as CSSProperties}>House brew line</p>
                    <p className={CAFE_NOIR_DESCRIPTION_TEXT_CLASS_NAME} style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" } as CSSProperties}>Daily sweet selection</p>
                    <p className={CAFE_NOIR_DESCRIPTION_TEXT_CLASS_NAME} style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" } as CSSProperties}>02 730 0000</p>
                  </div>
                </div>
              </div>
            </aside>

            {menuGroups.length === 0 ? (
              <section>
                <EmptyState>표시할 메뉴 페이지, 카테고리 또는 아이템이 없습니다.</EmptyState>
              </section>
            ) : (
              <section className="min-h-0 overflow-visible lg:flex lg:h-full lg:flex-col lg:overflow-hidden">
                <div className="hidden min-h-0 shrink-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.12fr)] gap-[clamp(28px,2.8vw,46px)] lg:mb-[clamp(14px,1.9vh,21px)] lg:grid lg:h-[var(--noir-top-band-height)] lg:items-start">
	                  <p className={`${introNoticeFontClassName} max-w-[16rem] text-[10px] font-medium leading-relaxed text-[#5b5b55]`}>
	                    {notices.intro}
	                  </p>
	                  <p className={`${addressNoticeFontClassName} max-w-[16rem] text-[10px] font-medium leading-relaxed text-[#5b5b55]`}>{notices.address}</p>
                  <h1 ref={desktopStoreTitleRef} className="menu-font-en w-full whitespace-nowrap text-right text-[clamp(31px,3.05vw,44px)] font-semibold uppercase leading-[0.9] tracking-normal text-[#101010] xl:text-[clamp(45px,3.5vw,54px)] 2xl:text-[clamp(54px,3.9vw,62px)]">
                    {storeTitle}
                  </h1>
                </div>

                <div className="grid min-h-0 grid-cols-1 gap-6 overflow-visible lg:flex-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.12fr)] lg:gap-[clamp(28px,2.8vw,46px)] lg:overflow-hidden">
                  {menuColumns.map((columnGroups) => (
                    <section key={`noir-column-${columnGroups.map((group) => group.category.id).join("-")}`} className="flex min-h-0 flex-col overflow-visible border-b border-[#deded8] pb-5 last:border-b-0 lg:h-full lg:overflow-hidden lg:border-b-0 lg:pb-0">
                      <div className={getCafeNoirColumnBodyClassName(columnGroups.length)}>
                        {columnGroups.map((group, groupIndex) => {
                          const categoryNumber = String(menuGroups.findIndex((candidate) => candidate.category.id === group.category.id) + 1).padStart(2, "0");
                          const hasMobileGroupDivider = groupIndex > 0;
                          return (
                            <section
                              key={group.category.id}
                              className={`${getCafeNoirGroupClassName()} ${hasMobileGroupDivider ? "border-t border-[#deded8] pt-5 lg:border-t-0 lg:pt-0" : ""}`}
                            >
                              <div className="mb-[clamp(0.52rem,1.05vh,0.72rem)] flex items-baseline gap-2 pb-0">
                                <h2 className="menu-font-en text-[clamp(18px,2.15vh,21px)] font-black uppercase tracking-[0.025em] text-[#111111]">
                                  {categoryNumber} - {group.category.name}
                                </h2>
                              </div>
                              <ul className={getCafeNoirItemListClassName()}>
                                {group.items.map((item) => {
                                  const price =
                                    item.price_visible === false
                                      ? null
                                      : getItemPriceDisplay(item, data.priceOptions, capabilities, {
                                          showOptionLabel: false,
                                          dedupeSamePrices: true,
                                        });
                                  const metaText = getMenuItemMetaText(item, data.locale);
                                  const badgeLabel = getMenuItemBadgeLabel(item);

                                  return (
                                    <li key={item.id} className="text-[#161616]">
                                      <div className="flex min-w-0 items-baseline gap-2">
                                        <div className="flex min-w-0 max-w-[72%] flex-wrap items-baseline gap-x-2 gap-y-1">
                                          <p className="menu-font-en min-w-0 max-w-full whitespace-normal break-words text-[clamp(15px,1.68vh,16px)] font-semibold leading-tight tracking-[-0.002em]">{item.name}</p>
                                          {badgeLabel && (
                                            <span className="menu-font-en shrink-0 rounded-full border border-[#1f1f1f] px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.08em]">
                                              {badgeLabel}
                                            </span>
                                          )}
                                        </div>
                                        {price && (
                                          <span
                                            className="mb-[4px] h-px min-w-4 flex-1 opacity-80"
                                            style={{
                                              backgroundImage: "radial-gradient(circle, #8a8a82 1px, transparent 1.35px)",
                                              backgroundPosition: "left center",
                                              backgroundRepeat: "repeat-x",
                                              backgroundSize: "7px 1px",
                                            }}
                                            aria-hidden="true"
                                          />
                                        )}
                                        {price && <p className="menu-font-en shrink-0 pt-[1px] text-right text-[clamp(14px,1.58vh,15px)] font-medium tabular-nums tracking-[-0.002em]">{price}</p>}
                                      </div>
                                      {metaText && <p className="menu-font-en mt-0.5 text-[10px] uppercase tracking-[0.08em] text-[#76766f]">{metaText}</p>}
                                      {item.description && <p className={`mt-0.5 truncate text-[#676760] ${CAFE_NOIR_DESCRIPTION_TEXT_CLASS_NAME}`}>{item.description}</p>}
                                    </li>
                                  );
                                })}
                              </ul>
                            </section>
                          );
                        })}
                      </div>
                    </section>
                  ))}
                </div>

	                <p className={`${footerNoticeFontClassName} hidden shrink-0 pt-[clamp(6px,1vh,10px)] text-right uppercase tracking-[0.08em] text-[#686862] lg:block ${CAFE_NOIR_DESCRIPTION_TEXT_CLASS_NAME}`}>
	                  {notices.footer}
	                </p>
              </section>
            )}
          </section>
        </div>
      </main>
    </>
  );
}

function HeaderBlock({ data, className = "" }: { data: PublicMenuTemplateProps; className?: string }) {
  const capabilities = getTemplateCapabilities(data.menuSite.template_key);
  const description = data.menuSite.brand_description || data.menuSite.description;

  return (
    <header className={`w-full shrink-0 px-[clamp(24px,4vw,96px)] pt-8 pb-0 lg:border-b lg:border-[#191c1b] lg:px-[var(--board-padding)] lg:py-[var(--board-padding)] ${className}`}>
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
        <CafeLanguageHoverControl data={data} className="cursor-default" />
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
          <CafeLanguageHoverControl data={data} />
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
  categoryDividerScope = "all",
  timeSaleByItemId,
  priceDisplayMode,
  onOpenImage,
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
  categoryDividerScope?: "all" | "page" | "always";
  timeSaleByItemId: Map<string, CafeDesignATimeSaleMatch>;
  priceDisplayMode: CafeDesignAPriceDisplayMode;
  onOpenImage?: (preview: CafeMenuImagePreview, trigger: HTMLElement) => void;
  fitRef?: RefObject<HTMLElement | null>;
  footerInfo?: ReactNode;
}) {
  const orderedGroupKeys = useMemo(() => getFlatMenuGroups(pageGroups).map(getMenuGroupKey), [pageGroups]);
  const lastGroupKey = orderedGroupKeys[orderedGroupKeys.length - 1] ?? "";

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
          {pageGroup.groups.map(({ page, category, items }, groupIndex) => {
            const groupKey = `${page.id}:${category.id}`;
            const hasDivider =
              categoryDividerScope === "always"
                ? true
                : categoryDividerScope === "page"
                  ? groupIndex < pageGroup.groups.length - 1
                  : groupKey !== lastGroupKey;
            const isTerminalDivider = categoryDividerScope === "always" && groupKey === lastGroupKey;

            return (
              <section
                key={groupKey}
                className={getCategoryBlockClassName(hasDivider, isTerminalDivider)}
                data-cafe-a-category-block=""
                data-cafe-a-category-divider={hasDivider ? "true" : undefined}
              >
                <CategoryTitle category={category} density={density} items={items} />
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
                        timeSale={timeSaleByItemId.get(item.id)}
                        customBadgeStyles={customBadgeStyles}
                        locale={data.locale}
                        priceDisplayMode={priceDisplayMode}
                        onOpenImage={onOpenImage}
                      />
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
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
  timeSaleByItemId,
  priceDisplayMode,
  onOpenImage,
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
  timeSaleByItemId: Map<string, CafeDesignATimeSaleMatch>;
  priceDisplayMode: CafeDesignAPriceDisplayMode;
  onOpenImage?: (preview: CafeMenuImagePreview, trigger: HTMLElement) => void;
  fitRef?: RefObject<HTMLElement | null>;
  footerInfo?: ReactNode;
}) {
  const orderedGroupKeys = useMemo(() => getFlatMenuGroups(pageGroups).map(getMenuGroupKey), [pageGroups]);
  const lastGroupKey = orderedGroupKeys[orderedGroupKeys.length - 1] ?? "";
  const groupOrderByKey = useMemo(() => new Map(orderedGroupKeys.map((groupKey, index) => [groupKey, index])), [orderedGroupKeys]);
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
            const hasDivider = groupKey !== lastGroupKey;

            return (
              <section
                key={groupKey}
                className={getCategoryBlockClassName(hasDivider)}
                data-cafe-a-category-block=""
                data-cafe-a-category-divider={hasDivider ? "true" : undefined}
                data-cafe-a-balanced-atomic-block=""
                data-cafe-a-balanced-block-type="category"
                data-cafe-a-balanced-block-id={groupKey}
                data-cafe-a-balanced-category-block={groupKey}
                data-cafe-a-balanced-source-order={groupOrderByKey.get(groupKey) ?? 0}
                data-balanced-estimated-height={estimateMenuGroupHeight({ page, category, items }, data, capabilities).toFixed(2)}
              >
                <CategoryTitle category={category} density={density} items={items} />
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
                        timeSale={timeSaleByItemId.get(item.id)}
                        customBadgeStyles={customBadgeStyles}
                        locale={data.locale}
                        priceDisplayMode={priceDisplayMode}
                        onOpenImage={onOpenImage}
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
  timeSaleByItemId,
  priceDisplayMode,
  onOpenImage,
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
  timeSaleByItemId: Map<string, CafeDesignATimeSaleMatch>;
  priceDisplayMode: CafeDesignAPriceDisplayMode;
  onOpenImage?: (preview: CafeMenuImagePreview, trigger: HTMLElement) => void;
  fitRef?: RefObject<HTMLElement | null>;
  footerInfo?: ReactNode;
}) {
  const orderedGroupKeys = useMemo(() => getFlatMenuGroups(pageGroups).map(getMenuGroupKey), [pageGroups]);
  const groupOrderByKey = useMemo(() => new Map(orderedGroupKeys.map((groupKey, index) => [groupKey, index])), [orderedGroupKeys]);
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
          {column.groups.map(({ page, category, items }, groupIndex) => {
            const groupKey = `${page.id}:${category.id}`;
            const hasDivider = groupIndex < column.groups.length - 1;

            return (
              <section
                key={groupKey}
                className={getCategoryBlockClassName(hasDivider)}
                data-cafe-a-category-block=""
                data-cafe-a-category-divider={hasDivider ? "true" : undefined}
                data-cafe-a-balanced-atomic-block=""
                data-cafe-a-balanced-block-type="category"
                data-cafe-a-balanced-block-id={groupKey}
                data-cafe-a-balanced-category-block={groupKey}
                data-cafe-a-balanced-source-order={groupOrderByKey.get(groupKey) ?? 0}
                data-balanced-estimated-height={estimateMenuGroupHeight({ page, category, items }, data, capabilities).toFixed(2)}
              >
                <CategoryTitle category={category} density={density} items={items} />
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
                        timeSale={timeSaleByItemId.get(item.id)}
                        customBadgeStyles={customBadgeStyles}
                        locale={data.locale}
                        priceDisplayMode={priceDisplayMode}
                        onOpenImage={onOpenImage}
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

function CafeDesignAClassic(data: PublicMenuTemplateProps) {
  // Basic engine wiring: capabilities, layout mode, visibility, density, and fit state.
  const capabilities = getTemplateCapabilities(data.menuSite.template_key);
  const basicPricingCapabilities = getBasicPricingCapabilities(data.menuSite.template_key);
  const priceDisplayMode: CafeDesignAPriceDisplayMode =
    basicPricingCapabilities.supportsPriceDisplayMode
      ? getPriceDisplayModeFromSettings(data.menuSite.settings, data.menuSite.template_key)
      : null;
  const publicCapabilities = getMenuPublicCapabilities(data.publicServiceType);
  const customTypography = getCustomTypographySettings(data.menuSite.settings, data.menuSite.page_settings);
  const typographySettings = mergeTypographySettings(data.menuSite.template_key, customTypography);
  const koreanFontAssets = getKoreanFontLoadAssets(typographySettings.korean_font_key);
  const englishFontAssets = getEnglishFontLoadAssets(typographySettings.english_font_key);
  const customBadgeStyles = getCustomBadgeStyles(data.menuSite.settings, data.menuSite.page_settings);
  const backgroundColor = getResolvedBackgroundColor(data.menuSite.template_key, data.menuSite.page_settings);
  const featuredHeroSlides = getFeaturedHeroSlides(data, capabilities);
  const savedLayoutMode = getPcTabletLayoutModeFromPageSettings(data.menuSite.page_settings);
  const normalizedPreviewLayoutMode = data.mode === "preview" ? data.previewLayoutMode : undefined;
  const layoutMode = (normalizedPreviewLayoutMode ?? savedLayoutMode) as CafeDesignALayoutMode;
  const visiblePageGroups = publicCapabilities.menuPages ? getVisibleMenuPageGroups(data) : [];
  const visibleMenuGroupCount = visiblePageGroups.reduce((count, pageGroup) => count + pageGroup.groups.length, 0);
  const hasVisibleItemImages = visiblePageGroups.some((pageGroup) =>
    pageGroup.groups.some((group) => group.items.some(hasVisibleMenuItemImage)),
  );
  const visibleImageSignature = visiblePageGroups
    .flatMap((pageGroup) =>
      pageGroup.groups.flatMap((group) =>
        group.items
          .filter(hasVisibleMenuItemImage)
          .map((item) => `${group.category.id}:${item.id}:${item.image_url?.trim() ?? ""}`),
      ),
    )
    .sort()
    .join(",");
  const desktopFitBoardRef = useRef<HTMLDivElement | null>(null);
  const desktopFitMenuRef = useRef<HTMLElement | null>(null);
  const [fitState, setFitState] = useState<CafeDesignAFitState>(DEFAULT_FIT_STATE);
  const [orderedBalancedInitialColumns, setOrderedBalancedInitialColumns] = useState(2);
  const [orderedBalancedFitRevision, setOrderedBalancedFitRevision] = useState(0);
  const [orderedBalancedValidationRevision, setOrderedBalancedValidationRevision] = useState(0);
  const [orderedBalancedFinalFillBoost, setOrderedBalancedFinalFillBoost] = useState<CafeDesignAFinalFillBoost>(DEFAULT_ORDERED_BALANCED_FINAL_FILL_BOOST);
  const [orderedFitFinalFillCompensation, setOrderedFitFinalFillCompensation] = useState(DEFAULT_ORDERED_FIT_FINAL_FILL_COMPENSATION);
  const [menuImagePreview, setMenuImagePreview] = useState<CafeMenuImagePreview | null>(null);
  const fitStateRef = useRef<CafeDesignAFitState>(DEFAULT_FIT_STATE);
  const menuImagePreviewTriggerRef = useRef<HTMLElement | null>(null);
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
  const initialNowMs = normalizeInitialNowMs(data.initialNowMs);
  const timeSaleBoundaryNowMs = useTimeSaleBoundaryNowMs(data.timeSales, data.menuSite.template_key, initialNowMs);
  useNextTimeSaleStartRefresh(data.nextTimeSaleStartAt, isCafeDesignATimeSaleTemplate(data.menuSite.template_key));
  const timeSaleByItemId = useMemo(
    () => getTimeSaleByItemId(data.timeSales, data.menuSite.template_key, timeSaleBoundaryNowMs),
    [data.menuSite.template_key, data.timeSales, timeSaleBoundaryNowMs],
  );
  const openMenuImagePreview = useCallback((preview: CafeMenuImagePreview, trigger: HTMLElement) => {
    menuImagePreviewTriggerRef.current = trigger;
    setMenuImagePreview(preview);
  }, [setMenuImagePreview]);
  const closeMenuImagePreview = useCallback(() => {
    const trigger = menuImagePreviewTriggerRef.current;
    setMenuImagePreview(null);
    menuImagePreviewTriggerRef.current = null;
    if (trigger) {
      window.requestAnimationFrame(() => {
        trigger.focus({ preventScroll: true });
      });
    }
  }, [setMenuImagePreview]);

  // Basic engine fit state: desktop candidate selection and validation feed these values into the CafeA shell.
  const baseRenderFitState = useMemo<CafeDesignAFitState>(() => {
    const imageModeColumns = visibleMenuGroupCount > 1 ? 3 : 1;
    if (hasVisibleItemImages && (layoutMode !== "orderedBalancedFit" || fitState.orderedBalancedFingerprint)) {
      return {
        ...fitState,
        columns: Math.min(fitState.columns, imageModeColumns),
      };
    }
    if (layoutMode !== "orderedBalancedFit" || fitState.orderedBalancedFingerprint) return fitState;

    return {
      ...fitState,
      columns: hasVisibleItemImages
        ? imageModeColumns
        : isDenseOrderedBalanced
        ? 3
        : Math.max(1, Math.min(orderedBalancedInitialColumns, visibleMenuGroupCount || orderedBalancedInitialColumns)),
    };
  }, [fitState, hasVisibleItemImages, isDenseOrderedBalanced, layoutMode, orderedBalancedInitialColumns, visibleMenuGroupCount]);
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
      const nextColumns = hasVisibleItemImages
        ? getImageMenuColumnCandidates(measuredWidth, visibleMenuGroupCount)[0] ?? 2
        : isDenseOrderedBalanced
          ? 3
          : measuredWidth >= 1100
            ? 3
            : 2;
      setOrderedBalancedInitialColumns((currentColumns) => (currentColumns === nextColumns ? currentColumns : nextColumns));
    };

    syncInitialColumns();
    const resizeObserver = new ResizeObserver(syncInitialColumns);
    resizeObserver.observe(boardElement);
    resizeObserver.observe(menuElement);

    return () => {
      resizeObserver.disconnect();
    };
  }, [hasVisibleItemImages, isDenseOrderedBalanced, layoutMode, visibleMenuGroupCount]);

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

      const footerAwareLastColumnGap = measurement.visibleContentBottomGap;
      const footerAwareLastColumnFillRatio = measurement.visibleLastColumnFillRatio;
      const candidateColumnWidth = getOrderedFitCandidateColumnWidth(columns);
      const hasReadableExtraColumn = columns >= 4 && candidateColumnWidth >= ORDERED_FIT_MIN_READABLE_COLUMN_WIDTH_PX;
      const canUseReadableExtraColumn = fitMenuElement.getBoundingClientRect().width >= 820;
      const targetGapPenalty =
        footerAwareLastColumnGap < ORDERED_FIT_TARGET_MIN_GAP
          ? (ORDERED_FIT_TARGET_MIN_GAP - footerAwareLastColumnGap) * 20
          : footerAwareLastColumnGap > ORDERED_FIT_TARGET_MAX_GAP
            ? (Math.min(footerAwareLastColumnGap, ORDERED_FIT_ACCEPTABLE_MAX_GAP) - ORDERED_FIT_TARGET_MAX_GAP) * 3
            : 0;
      const acceptableGapPenalty = Math.max(0, footerAwareLastColumnGap - ORDERED_FIT_ACCEPTABLE_MAX_GAP) * 3.5;
      const visibleGapPenalty = Math.max(0, footerAwareLastColumnGap - 10) * 3;
      const looseGapPenalty = Math.max(0, footerAwareLastColumnGap - ORDERED_FIT_LOOSE_GAP) * 18;
      const tightGapPenalty = Math.max(0, ORDERED_FIT_MIN_SAFETY_GAP - footerAwareLastColumnGap) * 90;
      const primaryFillPenalty = Math.max(0, 0.982 - measurement.primaryFillRatio) * 22;
      const averageFillPenalty = Math.max(0, 0.88 - measurement.averageFillRatio) * 130;
      const lastColumnPenalty = Math.max(0, 0.82 - footerAwareLastColumnFillRatio) * 520;
      const shortLastColumnPenalty = Math.max(0, 0.68 - footerAwareLastColumnFillRatio) * 420;
      const veryShortLastColumnPenalty = Math.max(0, 0.36 - footerAwareLastColumnFillRatio) * 720;
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
      const footerAwareLastColumnGap = measurement.visibleContentBottomGap;
      const overflowPenalty = measurement.overflow ? 1000 + Math.abs(Math.min(0, footerAwareLastColumnGap)) * 80 : 0;
      const bottomGapPenalty = Math.max(0, footerAwareLastColumnGap - ORDERED_FIT_TARGET_GAP) * 4;
      const missingColumnPenalty = Math.max(0, columns - measurement.measuredColumns) * 24;
      const tinyTextPenalty = Math.max(0, 0.75 - fontScale) * 80;

      return overflowPenalty + bottomGapPenalty + missingColumnPenalty + tinyTextPenalty;
    }

    function getOrderedFitState(columnCandidates: number[]) {
      let selectedState: CafeDesignAFitState | null = null;
      let selectedScore = Number.POSITIVE_INFINITY;
      let fallbackState: CafeDesignAFitState | null = null;
      let fallbackScore = Number.POSITIVE_INFINITY;
      const canUseEmergencyFontScale = fitMenuElement.clientWidth < ORDERED_FIT_EMERGENCY_FONT_SCALE_MENU_WIDTH_PX;

      for (const columns of columnCandidates) {
        for (const fontScale of ORDERED_FIT_FONT_SCALE_CANDIDATES) {
          if (!canUseEmergencyFontScale && fontScale < ORDERED_FIT_MIN_STANDARD_FONT_SCALE) continue;

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

          if (
            measurement.overflow ||
            measurement.primaryBottomGap < ORDERED_FIT_MIN_SAFETY_GAP ||
            measurement.visibleContentBottomGap < ORDERED_FIT_MIN_SAFETY_GAP
          ) continue;

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
        hasVisibleItemImages ? "image-menu" : "text-menu",
        visibleImageSignature,
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
        hasVisibleItemImages ? "image-menu" : "text-menu",
        visibleImageSignature,
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
            : hasVisibleItemImages
              ? getImageMenuColumnCandidates(menuWidth, visibleMenuGroupCount)
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
    hasVisibleItemImages,
    layoutMode,
    orderedBalancedFitRevision,
    orderedBalancedPriceOptionSignature,
    orderedBalancedValidationRevision,
    visibleImageSignature,
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
        hasVisibleItemImages ? "image-menu" : "text-menu",
        visibleImageSignature,
        `columns:${columns}`,
      ].join("|");

      orderedBalancedRejectedColumnRef.current.add(viewportRejectKey);
      if (orderedBalancedFingerprint) {
        orderedBalancedRejectedColumnRef.current.add(`${orderedBalancedFingerprint}|columns:${columns}`);
      }
    }

    function rejectOrderedBalancedCandidate(state: CafeDesignAFitState) {
      if (state.columns === 2) {
        rejectOrderedBalancedColumn(state.orderedBalancedFingerprint, 2);
        return;
      }

      orderedBalancedRejectedCandidateRef.current.add(getOrderedBalancedCandidateKey(state));
    }

    function getOrderedBalancedStateFromSettledMeasurement(
      baseState: CafeDesignAFitState,
      fontScale: number,
      measurement: CafeDesignAFitMeasurement,
      actualMeasurement: ReturnType<typeof getCafeAActualDomCropMeasurement>,
    ): CafeDesignAFitState {
      const actualBottomGap = roundFitMetric(actualMeasurement.bottomGap);
      const gapScale = getOrderedBalancedFitGapScale(fontScale, validationMenuElement.clientWidth);

      return {
        ...baseState,
        fontScale,
        gapScale,
        status: measurement.overflow || fontScale < ORDERED_BALANCED_MIN_QUALITY_FONT_SCALE ? "warning" : "fit",
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
        bottomGap: Math.min(measurement.bottomGap, actualBottomGap),
        contentGap: Math.min(measurement.contentGap, actualBottomGap),
        itemBoxGap: Math.min(measurement.itemBoxGap, actualBottomGap),
        textVisualGap: Math.min(measurement.textVisualGap, actualBottomGap),
        categoryBlockGap: measurement.categoryBlockGap,
        visibleItemBottomGap: Math.min(measurement.visibleItemBottomGap, actualBottomGap),
        visibleTextBottomGap: Math.min(measurement.visibleTextBottomGap, actualBottomGap),
        visiblePriceBottomGap: Math.min(measurement.visiblePriceBottomGap, actualBottomGap),
        visibleContentBottomGap: Math.min(measurement.visibleContentBottomGap, actualBottomGap),
        visibleAverageFillRatio: measurement.visibleAverageFillRatio,
        visibleMinFillRatio: measurement.visibleMinFillRatio,
        visibleLastColumnFillRatio: measurement.visibleLastColumnFillRatio,
        boardInnerRight: actualMeasurement.boardInnerRight,
        rightmostMenuNameRight: actualMeasurement.rightmostMenuNameRight,
        rightmostSecondaryRight: actualMeasurement.rightmostSecondaryRight,
        rightmostPriceRight: actualMeasurement.rightmostPriceRight,
        rightmostChipRight: actualMeasurement.rightmostChipRight,
        rightmostCategoryRight: actualMeasurement.rightmostCategoryRight,
        rightSafetyGap: actualMeasurement.rightSafetyGap,
        overflow: measurement.overflow || actualMeasurement.overflow,
      };
    }

    function getOrderedBalancedSafeBackoffState(baseState: CafeDesignAFitState) {
      const previousFontScale = validationBoardElement.style.getPropertyValue("--fit-font-scale");
      const previousGapScale = validationBoardElement.style.getPropertyValue("--fit-gap-scale");
      const previousMenuFontScale = validationBoardElement.style.getPropertyValue("--fit-menu-font-scale");
      const previousMenuGapScale = validationBoardElement.style.getPropertyValue("--fit-menu-gap-scale");
      const fontScaleCandidates = getOrderedBalancedFitFontScaleCandidates(window.innerWidth, validationMenuElement.clientWidth).filter(
        (candidateFontScale) => candidateFontScale < baseState.fontScale - ORDERED_BALANCED_SCALE_EPSILON,
      );

      try {
        for (const candidateFontScale of fontScaleCandidates) {
          const candidateGapScale = getOrderedBalancedFitGapScale(candidateFontScale, validationMenuElement.clientWidth);
          validationBoardElement.style.setProperty("--fit-font-scale", String(candidateFontScale));
          validationBoardElement.style.setProperty("--fit-gap-scale", String(candidateGapScale));
          validationBoardElement.style.setProperty("--fit-menu-font-scale", String(candidateFontScale));
          validationBoardElement.style.setProperty("--fit-menu-gap-scale", String(candidateGapScale));

          const candidateMeasurement = measureCafeABalancedFit(
            validationBoardElement,
            validationMenuElement,
            baseState.columns,
            false,
            ORDERED_BALANCED_CROP_TOLERANCE,
            true,
          );
          const candidateActualMeasurement = getCafeAActualDomCropMeasurement(
            validationBoardElement,
            validationMenuElement,
            ORDERED_BALANCED_CROP_TOLERANCE,
          );

          if (candidateMeasurement.overflow || candidateActualMeasurement.overflow) continue;

          return getOrderedBalancedStateFromSettledMeasurement(
            baseState,
            candidateFontScale,
            candidateMeasurement,
            candidateActualMeasurement,
          );
        }
      } finally {
        if (previousFontScale) {
          validationBoardElement.style.setProperty("--fit-font-scale", previousFontScale);
        } else {
          validationBoardElement.style.removeProperty("--fit-font-scale");
        }
        if (previousGapScale) {
          validationBoardElement.style.setProperty("--fit-gap-scale", previousGapScale);
        } else {
          validationBoardElement.style.removeProperty("--fit-gap-scale");
        }
        if (previousMenuFontScale) {
          validationBoardElement.style.setProperty("--fit-menu-font-scale", previousMenuFontScale);
        } else {
          validationBoardElement.style.removeProperty("--fit-menu-font-scale");
        }
        if (previousMenuGapScale) {
          validationBoardElement.style.setProperty("--fit-menu-gap-scale", previousMenuGapScale);
        } else {
          validationBoardElement.style.removeProperty("--fit-menu-gap-scale");
        }
      }

      return null;
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
            rejectOrderedBalancedCandidate(fitState);
            if (fitState.orderedBalancedFingerprint) {
              orderedBalancedFitCacheRef.current.delete(fitState.orderedBalancedFingerprint);
            }
            const safeBackoffState = getOrderedBalancedSafeBackoffState(fitState);
            if (safeBackoffState) {
              fitStateRef.current = safeBackoffState;
              setFitState(safeBackoffState);
              if (!safeBackoffState.overflow && safeBackoffState.orderedBalancedFingerprint) {
                orderedBalancedFitCacheRef.current.set(safeBackoffState.orderedBalancedFingerprint, safeBackoffState);
              }
              return;
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
            rejectOrderedBalancedCandidate(fitState);
            if (fitState.orderedBalancedFingerprint) {
              orderedBalancedFitCacheRef.current.delete(fitState.orderedBalancedFingerprint);
            }
            const safeBackoffState = getOrderedBalancedSafeBackoffState(fitState);
            if (safeBackoffState) {
              fitStateRef.current = safeBackoffState;
              setFitState(safeBackoffState);
              if (!safeBackoffState.overflow && safeBackoffState.orderedBalancedFingerprint) {
                orderedBalancedFitCacheRef.current.set(safeBackoffState.orderedBalancedFingerprint, safeBackoffState);
              }
              return;
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
  }, [density, fitState, hasVisibleItemImages, layoutMode, orderedBalancedValidationRevision, visibleImageSignature, visibleItemCount, visibleMenuGroupCount]);

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
        const baseMeasurement = getCafeAActualDomCropMeasurement(
          boardElement,
          menuElement,
          ORDERED_FIT_MIN_SAFETY_GAP,
          undefined,
          { footerNoGoLeafOnly: true }
        );
        const baseOrderedMeasurement = measureCafeAOrderedFit(boardElement, menuElement, fitState.columns);

        if (
          baseMeasurement.overflow ||
          baseOrderedMeasurement.overflow ||
          hasPageScroll() ||
          baseMeasurement.bottomGap < ORDERED_FIT_FINAL_FILL_MIN_GAP ||
          baseOrderedMeasurement.visibleContentBottomGap < ORDERED_FIT_FINAL_FILL_TRIGGER_GAP
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
        let selectedGap = baseOrderedMeasurement.visibleContentBottomGap;

        for (const compensation of ORDERED_FIT_FINAL_FILL_COMPENSATION_LEVELS) {
          boardElement.style.setProperty("--ordered-fit-final-fill-compensation", String(compensation));
          const compensatedMeasurement = getCafeAActualDomCropMeasurement(
            boardElement,
            menuElement,
            ORDERED_FIT_MIN_SAFETY_GAP,
            undefined,
            { footerNoGoLeafOnly: true }
          );
          const compensatedOrderedMeasurement = measureCafeAOrderedFit(boardElement, menuElement, fitState.columns);
          const compensatedGap = compensatedOrderedMeasurement.visibleContentBottomGap;
          const isSafe =
            !compensatedMeasurement.overflow &&
            !compensatedOrderedMeasurement.overflow &&
            !hasPageScroll() &&
            compensatedMeasurement.bottomGap >= ORDERED_FIT_FINAL_FILL_MIN_GAP &&
            compensatedGap >= ORDERED_FIT_FINAL_FILL_TARGET_GAP;

          if (!isSafe) break;
          if (compensatedGap < selectedGap) {
            selectedCompensation = compensation;
            selectedGap = compensatedGap;
          }
          if (compensatedGap <= ORDERED_FIT_FINAL_FILL_TARGET_GAP) break;
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
    <CafeATimeSaleInitialNowContext.Provider value={initialNowMs}>
      <KoreanFontAssets assets={[koreanFontAssets, englishFontAssets]} />
      <main
        className="menu-typography cafe-a-typography group/cafe-board relative min-h-screen w-full max-w-full min-w-0 text-[#191c1b] lg:h-screen lg:overflow-y-hidden"
        data-cafe-a-menu-image-mode={hasVisibleItemImages ? "true" : "false"}
        style={{ ...typographyStyle, backgroundColor }}
      >
        <div className="flex min-h-screen w-full max-w-none min-w-0 flex-col lg:h-full lg:min-h-0 lg:overflow-y-hidden">
          <HeaderBlock data={data} className="lg:hidden" />
          <div className={`grid min-w-0 px-[clamp(24px,4vw,96px)] pt-6 pb-16 md:grid-cols-2 lg:hidden ${outerGridGapClassName}`}>
            {shouldRenderMenuCoverSection && (
              <CoverHero
                data={data}
                featuredSlides={featuredHeroSlides}
                capabilities={capabilities}
                density={density}
                customBadgeStyles={customBadgeStyles}
                priceDisplayMode={priceDisplayMode}
              />
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
                categoryDividerScope="always"
                timeSaleByItemId={timeSaleByItemId}
                priceDisplayMode={priceDisplayMode}
                onOpenImage={openMenuImagePreview}
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
            data-cafe-a-menu-image-mode={hasVisibleItemImages ? "true" : "false"}
            style={{ ...fitGapStyle, ...fitStyle, ...orderedFitFillStyle }}
          >
            <DesktopFixedRail data={data}>
              {shouldRenderMenuCoverSection && (
                <CoverHero
                  data={data}
                  featuredSlides={featuredHeroSlides}
                  capabilities={capabilities}
                  density={density}
                  customBadgeStyles={customBadgeStyles}
                  priceDisplayMode={priceDisplayMode}
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
                timeSaleByItemId={timeSaleByItemId}
                priceDisplayMode={priceDisplayMode}
                onOpenImage={openMenuImagePreview}
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
                timeSaleByItemId={timeSaleByItemId}
                priceDisplayMode={priceDisplayMode}
                onOpenImage={openMenuImagePreview}
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
                timeSaleByItemId={timeSaleByItemId}
                priceDisplayMode={priceDisplayMode}
                onOpenImage={openMenuImagePreview}
              />
            )}
            {footerInfo}
          </div>
        </div>
      </main>
      <CafeMenuImageLightbox preview={menuImagePreview} onClose={closeMenuImagePreview} />
    </CafeATimeSaleInitialNowContext.Provider>
  );
}

export default function CafeDesignA(data: PublicMenuTemplateProps) {
  if (data.menuSite.template_key === "cafe_noir_a") {
    return <CafeNoirA data={data} />;
  }

  return <CafeDesignAClassic {...data} />;
}
