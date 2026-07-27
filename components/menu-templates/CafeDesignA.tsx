/* eslint-disable @next/next/no-img-element */
"use client";

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type ReactNode, type RefObject } from "react";
import { Clock3, X, ZoomIn } from "lucide-react";
import { useRouter } from "next/navigation";

import KoreanFontAssets from "@/components/menu-templates/shared/KoreanFontAssets";
import CafeAWidgetBlock, { type CafeAWidgetPreview } from "@/components/menu-templates/CafeAWidgetBlock";
import MenuLanguageSwitcher from "@/components/menu-templates/shared/MenuLanguageSwitcher";
import type { PublicMenuTemplateProps } from "@/components/menu-templates/types";
import {
  createCafeAOrderedBalancedColumnsFromBreakIndices,
  getCafeAOrderedBalancedBreaksFromColumns,
  getCafeAOrderedBalancedColumnFillMetrics,
  getCafeAOrderedBalancedContiguousColumnCandidates,
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
  getTemplateContentSeparatorRules,
  shouldShowCategoryContentDivider,
} from "@/lib/template-content-separator-rules";
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
type PublicMenuWidget = NonNullable<PublicMenuTemplateProps["widgets"]>[number];
type PublicItemPriceColumnValue = MenuItem["priceColumnValues"][number];
type CafeDesignALocale = PublicMenuTemplateProps["locale"];
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
const CAFE_A_SOLD_OUT_LABELS: Record<CafeDesignALocale, string> = {
  ko: "품절",
  en: "SOLD OUT",
  zh: "售罄",
  ja: "売り切れ",
};
const FEATURED_CAROUSEL_INTERVAL_MS = 5000;
const FEATURED_CAROUSEL_DRAG_START_THRESHOLD_PX = 6;
const FEATURED_CAROUSEL_SWIPE_THRESHOLD_PX = 40;
type MenuGroup = {
  page: MenuPage;
  category: MenuCategory;
  items: MenuItem[];
};
type CafeDesignAContentBlockType = "category" | "widget";
type CafeDesignACategoryContentBlock = {
  blockType: "category";
  key: string;
  page: MenuPage;
  category: MenuCategory;
  items: MenuItem[];
  sortOrder: number;
  previousVisibleBlockType: CafeDesignAContentBlockType | null;
  nextVisibleBlockType: CafeDesignAContentBlockType | null;
  showDividerBeforeCategory: boolean;
};
type CafeDesignAWidgetContentBlock = {
  blockType: "widget";
  key: string;
  page: MenuPage;
  widget: CafeAWidgetPreview;
  sortOrder: number;
  previousVisibleBlockType: CafeDesignAContentBlockType | null;
  nextVisibleBlockType: CafeDesignAContentBlockType | null;
};
type CafeDesignAContentBlock = CafeDesignACategoryContentBlock | CafeDesignAWidgetContentBlock;
type MenuPageGroup = {
  page: MenuPage;
  groups: MenuGroup[];
  blocks: CafeDesignAContentBlock[];
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
  blocks: CafeDesignAContentBlock[];
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
type CafeDesignABalancedWeightedBlock = {
  block: CafeDesignAContentBlock;
  index: number;
  estimatedHeight: number;
};
type CafeDesignABalancedBlockMeasurement = {
  key: string;
  blockType?: "category" | "widget";
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

function getOrderedBalancedWidgetFitColumnCandidates(width: number, groupCount: number, itemCount: number) {
  const baseCandidates = getOrderedBalancedFitColumnCandidates(width, groupCount, itemCount);
  const rescueMaxColumns = Math.min(ORDERED_FIT_DESKTOP_MAX_COLUMNS, Math.max(2, groupCount));
  const rescueCandidates = getOrderedFitColumnCandidates(width).filter((columns) => columns <= rescueMaxColumns);

  return Array.from(new Set([...baseCandidates, ...rescueCandidates])).sort((a, b) => b - a);
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

function getOrderedBalancedCandidateKeyFromParts({
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

function getOrderedBalancedCandidateKey(state: CafeDesignAFitState) {
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

const CAFE_A_VISIBLE_CONTENT_SELECTOR = [
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

function measureCafeAOrderedFit(boardElement: HTMLElement, menuElement: HTMLElement, expectedColumns?: number): CafeDesignAFitMeasurement {
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

function getBalancedBlockMeasurements(menuElement: HTMLElement): CafeDesignABalancedBlockMeasurement[] {
  return Array.from(menuElement.querySelectorAll<HTMLElement>("[data-cafe-a-balanced-atomic-block], [data-cafe-a-balanced-category-block]"))
    .map((blockElement) => {
      const rect = blockElement.getBoundingClientRect();
      const order = Number.parseInt(blockElement.dataset.cafeABalancedSourceOrder ?? "", 10);
      const estimatedHeight = Number.parseFloat(blockElement.dataset.balancedEstimatedHeight ?? "");
      const visibleHeights = getBalancedBlockVisibleHeights(blockElement);

      return {
        key: blockElement.dataset.cafeABalancedBlockId ?? blockElement.dataset.cafeABalancedCategoryBlock ?? "",
        blockType: blockElement.dataset.cafeABalancedBlockType === "widget" ? ("widget" as const) : ("category" as const),
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

function hasOrderedBalancedAtomicBlockOverflow(
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

function getOrderedBalancedColumnTargetHeights(
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

function getOrderedBalancedContiguousColumns(
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
    maxExhaustiveBlocks: ORDERED_BALANCED_MAX_EXHAUSTIVE_BLOCKS,
    maxExhaustiveColumns: ORDERED_BALANCED_MAX_EXHAUSTIVE_COLUMNS,
    targetMaxVisibleGap: ORDERED_BALANCED_TARGET_MAX_VISIBLE_GAP,
  });
}

function getOrderedBalancedContiguousColumnCandidates(
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
  const blocks = getFlatContentBlocks(pageGroups);
  const safeColumns = Math.max(1, Math.min(ORDERED_BALANCED_MAX_EXHAUSTIVE_COLUMNS, Math.floor(columns), blocks.length || 1));
  const breakIndices = parseOrderedBalancedBreaks(orderedBalancedBreaks, blocks.length, safeColumns);
  const weightedBlocks = blocks.map((block, index) => ({
    block,
    index,
    estimatedHeight: estimateContentBlockHeight(block, data, capabilities),
  }));
  const fallbackBlocks = weightedBlocks.map((weightedBlock) => ({
    key: weightedBlock.block.key,
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

  return partitionColumns.map((column, columnIndex) => ({
    id: `ordered-balanced-column-${columnIndex + 1}`,
    blocks: column.blocks.map((block) => blockByKey.get(block.key)).filter((block): block is CafeDesignAContentBlock => Boolean(block)),
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
    menuElement.querySelectorAll<HTMLElement>(CAFE_A_VISIBLE_CONTENT_SELECTOR)
  );
  const visibleBottom = getVisibleElementBottom(visibleElements);
  const bottomGap = Number.isFinite(visibleBottom) ? safeBottom - visibleBottom : menuElement.clientHeight || menuRect.height;
  const scrollOverflow = menuElement.scrollHeight > menuElement.clientHeight + Math.max(1, cropTolerance);
  const horizontalScrollOverflow =
    menuElement.scrollWidth > menuElement.clientWidth + 1 ||
    document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
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
      widgetInternalClipOverflow ||
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

function getCafeASoldOutLabel(locale: CafeDesignALocale) {
  return CAFE_A_SOLD_OUT_LABELS[locale] ?? CAFE_A_SOLD_OUT_LABELS[DEFAULT_LOCALE];
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
  const shouldRenderWidgets = data.menuSite.template_key === "cafe_design_a";
  const separatorRules = getTemplateContentSeparatorRules(data.menuSite.template_key);
  const widgets = shouldRenderWidgets ? data.widgets ?? [] : [];

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

      const categoryBlocks: CafeDesignACategoryContentBlock[] = groups.map((group) => ({
        ...group,
        blockType: "category",
        key: getMenuGroupKey(group),
        sortOrder: group.category.sort_order,
        previousVisibleBlockType: null,
        nextVisibleBlockType: null,
        showDividerBeforeCategory: false,
      }));
      const widgetBlocks: CafeDesignAWidgetContentBlock[] = widgets
        .filter((widget) => widget.visible && widget.menuPageId === page.id)
        .map((widget): CafeDesignAWidgetContentBlock | null => {
          const previewWidget = getCafeAWidgetPreview(widget);
          if (!previewWidget) return null;

          return {
            blockType: "widget" as const,
            key: `${page.id}:widget:${widget.id}`,
            page,
            widget: previewWidget,
            sortOrder: widget.sortOrder,
            previousVisibleBlockType: null,
            nextVisibleBlockType: null,
          };
        })
        .filter((block): block is CafeDesignAWidgetContentBlock => Boolean(block));
      const sortedBlocks = [...categoryBlocks, ...widgetBlocks]
        .map((block, index) => ({ block, index }))
        .sort((left, right) => left.block.sortOrder - right.block.sortOrder || left.index - right.index)
        .map(({ block }) => block);
      const blocks = sortedBlocks.map((block, blockIndex): CafeDesignAContentBlock => {
        const previousVisibleBlockType = sortedBlocks[blockIndex - 1]?.blockType ?? null;
        const nextVisibleBlockType = sortedBlocks[blockIndex + 1]?.blockType ?? null;

        return block.blockType === "category"
          ? {
              ...block,
              previousVisibleBlockType,
              nextVisibleBlockType,
              showDividerBeforeCategory: shouldShowCategoryContentDivider(separatorRules, previousVisibleBlockType !== null),
            }
          : {
              ...block,
              previousVisibleBlockType,
              nextVisibleBlockType,
            };
      });

      return { page, groups, blocks };
    })
    .filter((pageGroup) => pageGroup.blocks.length > 0);
}

function getFlatMenuGroups(pageGroups: MenuPageGroup[]) {
  return pageGroups.flatMap((pageGroup) => pageGroup.groups);
}

function getFlatContentBlocks(pageGroups: MenuPageGroup[]) {
  return pageGroups.flatMap((pageGroup) => pageGroup.blocks);
}

function getMenuGroupKey(group: MenuGroup) {
  return `${group.page.id}:${group.category.id}`;
}

function getCafeAWidgetPreview(widget: PublicMenuWidget): CafeAWidgetPreview | null {
  if (!widget.visible) return null;
  const altText = widget.settings.altText?.trim() || widget.title?.trim() || "메뉴 이미지";

  if (widget.type === "image") {
    return {
      id: widget.id,
      type: "image",
      visible: widget.visible,
      imageUrl: widget.imageUrl,
      altText,
      aspectRatio: widget.settings.aspectRatio,
      objectFit: widget.settings.objectFit,
    };
  }

  if (widget.type === "text") {
    return {
      id: widget.id,
      type: "text",
      visible: widget.visible,
      title: widget.title ?? "",
      body: widget.description,
      textAlign: widget.settings.textAlign,
    };
  }

  return {
    id: widget.id,
    type: "image_text",
    visible: widget.visible,
    imageUrl: widget.imageUrl,
    altText,
    title: widget.title ?? "",
    body: widget.description,
    aspectRatio: widget.settings.aspectRatio,
    objectFit: widget.settings.objectFit,
    textAlign: widget.settings.textAlign,
  };
}

function getCategoryBlockClassName() {
  return "cafe-a-menu-category-block min-w-0";
}

const CAFE_A_COLUMN_START_TOLERANCE_PX = 3;

function getCafeAColumnKey(columns: number[], left: number) {
  const existingLeft = columns.find((columnLeft) => Math.abs(columnLeft - left) <= CAFE_A_COLUMN_START_TOLERANCE_PX);
  if (existingLeft != null) return existingLeft;

  columns.push(left);
  return left;
}

function syncOrderedFitColumnStartCategoryDividers(menuElement: HTMLElement) {
  const categoryElements = Array.from(menuElement.querySelectorAll<HTMLElement>("[data-cafe-a-category-block]"));
  const suppressedCategoryElements = new Set<HTMLElement>();

  const blockElements = Array.from(menuElement.querySelectorAll<HTMLElement>("[data-cafe-a-block-type]"))
    .map((element, index) => {
      const rect = element.getBoundingClientRect();
      return {
        element,
        index,
        rect,
        type: element.dataset.cafeABlockType,
      };
    })
    .filter(({ rect }) => rect.width > 0 && rect.height > 0);
  if (blockElements.length === 0) return;

  const columnLefts: number[] = [];
  const columns = new Map<number, typeof blockElements>();
  blockElements.forEach((block) => {
    const columnKey = getCafeAColumnKey(columnLefts, block.rect.left);
    const columnBlocks = columns.get(columnKey) ?? [];
    columnBlocks.push(block);
    columns.set(columnKey, columnBlocks);
  });

  const visualNextBlockTypes = new Map<HTMLElement, CafeDesignAContentBlockType>();
  columns.forEach((columnBlocks) => {
    const sortedColumnBlocks = columnBlocks
      .slice()
      .sort((left, right) => left.rect.top - right.rect.top || left.rect.left - right.rect.left || left.index - right.index);
    const firstBlock = sortedColumnBlocks[0];

    if (firstBlock?.type === "category") {
      suppressedCategoryElements.add(firstBlock.element);
    }

    sortedColumnBlocks.forEach((block, blockIndex) => {
      const nextBlockType = sortedColumnBlocks[blockIndex + 1]?.type;
      if (nextBlockType === "category" || nextBlockType === "widget") {
        visualNextBlockTypes.set(block.element, nextBlockType);
      }
    });
  });

  blockElements.forEach(({ element }) => {
    const visualNextBlockType = visualNextBlockTypes.get(element);
    if (visualNextBlockType) {
      element.setAttribute("data-cafe-a-visual-next-block-type", visualNextBlockType);
      return;
    }

    element.removeAttribute("data-cafe-a-visual-next-block-type");
  });

  categoryElements.forEach((element) => {
    if (suppressedCategoryElements.has(element)) {
      element.setAttribute("data-cafe-a-category-divider-desktop-suppressed", "true");
      return;
    }

    element.removeAttribute("data-cafe-a-category-divider-desktop-suppressed");
  });
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

function estimateWidgetHeight(widget: CafeAWidgetPreview) {
  const ratioWeight = widget.type === "text"
    ? 0
    : {
        "2:1": 1.45,
        "3:2": 1.8,
        "4:3": 2.1,
        "1:1": 2.7,
        "3:4": 3.3,
      }[widget.aspectRatio];

  if (widget.type === "image") return ratioWeight + 0.3;

  const textWeight =
    1.1 +
    (widget.title.trim() ? 0.65 : 0) +
    Math.max(1, Math.ceil(widget.body.trim().length / 44)) * 0.42;

  return widget.type === "text" ? textWeight : ratioWeight + textWeight + 0.55;
}

function estimateContentBlockHeight(
  block: CafeDesignAContentBlock,
  data: PublicMenuTemplateProps,
  capabilities: TemplateCapabilities,
) {
  if (block.blockType === "category") {
    return estimateMenuGroupHeight(block, data, capabilities);
  }

  return estimateWidgetHeight(block.widget);
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
  const weightedBlocks = getFlatContentBlocks(pageGroups)
    .map((block, index) => ({
      block,
      index,
      estimatedHeight: estimateContentBlockHeight(block, data, capabilities),
    }));

  return createBalancedColumnsFromWeightedBlocks(weightedBlocks, safeColumns, variant);
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
        <h2
          className={`cafe-a-category-title min-w-0 break-words font-black uppercase leading-tight text-[#191c1b] ${titleClassName}`}
          data-cafe-a-category-title-text=""
        >
          {category.name}
        </h2>
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

function SoldOutBadge({ locale, className = "" }: { locale: CafeDesignALocale; className?: string }) {
  return (
    <span className={`menu-badge cafe-a-menu-badge cafe-a-sold-out-chip inline-flex rounded-none border px-1.5 py-1 font-black uppercase leading-none ${className}`}>
      {getCafeASoldOutLabel(locale)}
    </span>
  );
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
  const isSoldOut = item.is_sold_out === true;
  const { priceTokens, usesPriceColumns } = getItemPriceTokensForCategory(item, category, priceOptions, capabilities, priceDisplayMode);
  const singleTimeSaleItem = timeSale?.item;
  const showTimeSale =
    !isSoldOut &&
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
          !isSoldOut &&
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
  const titleTextColorClassName = isSoldOut ? "cafe-a-sold-out-text" : "text-[#191c1b]";
  const metaTextColorClassName = isSoldOut ? "cafe-a-sold-out-muted" : "text-[#333333]";
  const descriptionTextColorClassName = isSoldOut ? "cafe-a-sold-out-muted" : "text-[#3f4945]";
  const priceTextColorClassName = isSoldOut ? "cafe-a-sold-out-text" : "text-[#191c1b]";
  const priceMutedColorClassName = isSoldOut ? "cafe-a-sold-out-muted" : "text-[#191c1b]/45";
  const showSoldOutBadge = isSoldOut;
  const showRegularBadge = !isSoldOut && !showMenuTimeSale;

  const menuCopyElement = (
    <div className="cafe-a-menu-copy min-w-0">
      <div className={`cafe-a-menu-title-row ${titleRowSpacingClassName} flex flex-wrap items-center gap-1.5`}>
        <h3 className={`cafe-a-menu-title break-words font-bold leading-snug ${titleTextColorClassName} ${titleClassName}`} data-cafe-a-menu-name="">{item.name}</h3>
        {showSoldOutBadge ? <SoldOutBadge locale={locale} /> : null}
        {showRegularBadge ? <Badge item={item} capabilities={capabilities} templateKey={templateKey} customBadgeStyles={customBadgeStyles} /> : null}
        {showMenuTimeSale && timeSale ? <TimeSaleBadge timeSale={timeSale.promotion} /> : null}
      </div>
      {hasSecondaryText && (
        <p className={`menu-font-en cafe-a-menu-meta ${metaSpacingClassName} break-words font-medium uppercase leading-snug ${metaTextColorClassName} ${metaClassName}`}>
          {trimmedMetaText}
        </p>
      )}
      {showMenuTimeSale && timeSale ? <TimeSaleMenuBadge timeSale={timeSale.promotion} /> : null}
      {hasDescriptionText && (
        <p className={`cafe-a-description-text cafe-a-menu-description break-keep ${descriptionTextColorClassName} ${descriptionTextClassName} ${descriptionClassName}`}>{descriptionText}</p>
      )}
      {visibleTraits.length > 0 && (
        <div className="cafe-a-trait-list mt-2 flex flex-wrap gap-1.5">
          {visibleTraits.map((trait) => (
            <span key={trait.id} className={`menu-chip cafe-a-menu-chip border border-[#bfc9c4] px-1.5 py-1 font-black ${descriptionTextColorClassName}`}>
              {trait.label} {trait.value}/{trait.max_value}
            </span>
          ))}
        </div>
      )}
      {hasOriginInfo && <p className={`cafe-a-description-text cafe-a-menu-description cafe-a-menu-description-size-default mt-2 line-clamp-2 break-words ${isSoldOut ? "cafe-a-sold-out-muted" : "text-[#707975]"}`}>원산지 {item.origin_info?.trim()}</p>}
    </div>
  );
  const priceAreaElement = (
    <>
      {priceTokens.length > 0 && usesPriceColumns && (
        <div className={`menu-price cafe-a-price-area shrink-0 text-right ${priceTextColorClassName} lg:justify-self-end`} data-cafe-a-menu-price="">
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
                  <span className={`cafe-a-menu-price whitespace-nowrap font-bold leading-none ${priceTextColorClassName} ${priceClassName}`}>{token.price}</span>
                ) : (
                  <span aria-hidden="true">&nbsp;</span>
                )}
              </span>
            ))}
          </div>
          {priceNote && <p className={`cafe-a-price-note mt-1 break-keep text-right font-bold leading-snug ${isSoldOut ? "cafe-a-sold-out-muted" : "text-[#65706b]"}`}>{priceNote}</p>}
        </div>
      )}
      {priceTokens.length > 0 && !usesPriceColumns && (
        <div className={`menu-price cafe-a-price-area shrink-0 text-right ${priceTextColorClassName} lg:justify-self-end`} data-cafe-a-menu-price="">
          <div className="cafe-a-price-stack cafe-a-price-inline flex flex-wrap items-baseline justify-end">
            {priceTokens.map((token, index) => (
              <span key={`${token.label}-${token.price}-${index}`} className="cafe-a-price-token inline-flex items-baseline whitespace-nowrap">
                {index > 0 && <span className={`cafe-a-price-separator font-bold ${priceMutedColorClassName}`}>/</span>}
                <span className={`cafe-a-price-pair inline-flex whitespace-nowrap ${token.label ? "cafe-a-price-pair-with-note" : ""} ${showTimeSale && timeSalePrice && index === 0 ? "items-baseline gap-x-1" : "items-baseline"}`}>
                  {token.label && <span className={`cafe-a-price-label whitespace-nowrap font-bold uppercase leading-none ${priceTextColorClassName}`}>{token.label}</span>}
                  {showTimeSale && timeSalePrice && index === 0 ? (
                    <TimeSalePriceBlock
                      timeSale={timeSale.promotion}
                      originalPrice={token.price}
                      salePrice={timeSalePrice}
                      priceClassName={priceClassName}
                    />
                  ) : (
                    <span className={`cafe-a-menu-price whitespace-nowrap font-bold leading-none ${priceTextColorClassName} ${priceClassName}`}>{token.price}</span>
                  )}
                </span>
              </span>
            ))}
          </div>
          {priceNote && <p className={`cafe-a-price-note mt-1 break-keep text-right font-bold leading-snug ${isSoldOut ? "cafe-a-sold-out-muted" : "text-[#65706b]"}`}>{priceNote}</p>}
        </div>
      )}
    </>
  );

  return (
    <article
      className={`cafe-a-menu-item grid items-start ${canCenterSparseContent ? "cafe-a-menu-item-align-center" : ""} ${hasItemImage ? "cafe-a-menu-item-with-image" : ""} ${priceCountClassName} ${itemGridClassName}`}
      data-cafe-a-content-variant={contentVariant}
      data-cafe-a-menu-item=""
      data-cafe-a-sold-out={isSoldOut ? "true" : undefined}
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
  const featuredItemSoldOut = featuredItem?.is_sold_out === true;
  const featuredCategory = featuredItem ? data.categories.find((category) => category.id === featuredItem.category_id) ?? null : null;
  const price = featuredItem
    ? featuredCategory
      ? getItemPriceColumnDisplay(featuredItem, featuredCategory, { showOptionLabel: false }, priceDisplayMode) ??
        getItemPriceDisplay(featuredItem, data.priceOptions, capabilities, { showOptionLabel: false, dedupeSamePrices: true }, priceDisplayMode)
      : getItemPriceDisplay(featuredItem, data.priceOptions, capabilities, { showOptionLabel: false, dedupeSamePrices: true }, priceDisplayMode)
    : null;
  const featuredBadgeLabel = featuredItem && !featuredItemSoldOut && capabilities.itemBadges ? getMenuItemBadgeLabel(featuredItem) : "";
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
      data-cafe-a-active-hero-index={safeActiveSlideIndex}
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
          <div
            className="cafe-a-featured-copy absolute bottom-4 left-4 right-4 flex items-end justify-between gap-4 text-white"
            data-cafe-a-sold-out={featuredItemSoldOut ? "true" : undefined}
          >
            <div className="min-w-0">
              {featuredItemSoldOut ? (
                <div className="cafe-a-featured-badges mb-2 flex max-w-full flex-wrap gap-2">
                  <SoldOutBadge locale={data.locale} className="cafe-a-featured-badge" />
                </div>
              ) : featuredBadgeLabel ? (
                <div className="cafe-a-featured-badges mb-2 flex max-w-full flex-wrap gap-2">
                  <HeroOverlayBadge item={featuredItem} capabilities={capabilities} templateKey={data.menuSite.template_key} customBadgeStyles={customBadgeStyles} />
                </div>
              ) : null}
              <h2 className={`cafe-a-featured-title break-words font-bold leading-tight ${featuredItemSoldOut ? "cafe-a-featured-sold-out-text" : ""}`} data-cafe-a-featured-title="">{featuredItem.name}</h2>
              {featuredItem.description && (
                <p className={`cafe-a-description-text cafe-a-featured-description mt-2 break-keep lg:line-clamp-2 ${featuredItemSoldOut ? "cafe-a-featured-sold-out-muted" : "text-white/82"}`} data-cafe-a-featured-description="">
                  {featuredItem.description}
                </p>
              )}
            </div>
            {price && <p className={`menu-price cafe-a-featured-price shrink-0 whitespace-nowrap font-black leading-none ${featuredItemSoldOut ? "cafe-a-featured-sold-out-text" : ""}`} data-cafe-a-featured-price="">{price}</p>}
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

type CafeADebugCounters = {
  layoutEpoch: number;
  resizeObserverCallbackCount: number;
  stateUpdateCount: number;
};

type CafeADebugPanelProps = {
  boardRef: RefObject<HTMLDivElement | null>;
  countersRef: RefObject<CafeADebugCounters>;
  data: PublicMenuTemplateProps;
  density: MenuLayoutDensity;
  fitState: CafeDesignAFitState;
  layoutInputSignature: string;
  layoutMode: CafeDesignALayoutMode;
  orderedBalancedFinalFillBoost: CafeDesignAFinalFillBoost;
  orderedFitFinalFillCompensation: number;
  typographySizeSetting: string;
  visibleCategoryCount: number;
  visibleItemCount: number;
  visibleWidgetCount: number;
};

type CafeADebugRect = {
  bottom: number;
  height: number;
  left: number;
  right: number;
  top: number;
  width: number;
};

type CafeADebugMetrics = {
  computedCss: Record<string, string>;
  input: Record<string, string | number | boolean>;
  layout: Record<string, string | number | boolean>;
  parentChain: Array<Record<string, string | number>>;
  rects: Record<string, CafeADebugRect | number | null>;
  routeKind: string;
  safety: Record<string, string | number | boolean>;
  selectorCounts: Record<string, number>;
  widgetToCategoryTransition: Record<string, string | number | boolean | null>;
  viewport: Record<string, number>;
};

function getCafeADebugRect(element: Element | null | undefined): CafeADebugRect | null {
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  return {
    bottom: roundFitMetric(rect.bottom),
    height: roundFitMetric(rect.height),
    left: roundFitMetric(rect.left),
    right: roundFitMetric(rect.right),
    top: roundFitMetric(rect.top),
    width: roundFitMetric(rect.width),
  };
}

function getCafeADebugRouteKind() {
  const pathname = window.location.pathname;
  if (pathname.includes("/__qa/menu-preview/")) return "qa-preview";
  if (pathname.includes("/mypage/menus/") && pathname.endsWith("/preview")) return "owner-preview";
  if (pathname.includes("/templates/")) return "template-preview";
  if (pathname.startsWith("/m/") || pathname.startsWith("/menu/")) return "public";
  return "unknown";
}

function getCafeADebugClassIdentifier(element: HTMLElement) {
  return Array.from(element.classList)
    .filter((className) => className.startsWith("cafe-a") || className.startsWith("menu-") || className.startsWith("lg:") || className.startsWith("md:"))
    .slice(0, 4)
    .join(".");
}

function getCafeADebugParentChain(rootElement: HTMLElement, widgetElement: HTMLElement | null) {
  if (!widgetElement) return [];

  const chain: Array<Record<string, string | number>> = [];
  let element: HTMLElement | null = widgetElement;

  while (element) {
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    chain.push({
      tag: element.tagName.toLowerCase(),
      class: getCafeADebugClassIdentifier(element) || "-",
      bottom: roundFitMetric(rect.bottom),
      height: roundFitMetric(rect.height),
      overflow: style.overflow,
      overflowY: style.overflowY,
      heightCss: style.height,
      minHeight: style.minHeight,
      maxHeight: style.maxHeight,
      position: style.position,
      transform: style.transform === "none" ? "none" : "set",
      contain: style.contain,
      columnCount: style.columnCount,
      columnFill: style.columnFill,
    });

    if (element === rootElement || element === document.body) break;
    element = element.parentElement;
  }

  return chain.slice(0, 12);
}

function getCafeADebugClippingByAncestor(widgetElement: HTMLElement | null) {
  if (!widgetElement) return false;
  const widgetRect = widgetElement.getBoundingClientRect();
  let element = widgetElement.parentElement;

  while (element && element !== document.body) {
    const style = window.getComputedStyle(element);
    const clipsY = /(hidden|clip|auto|scroll)/.test(style.overflowY) || /(hidden|clip|auto|scroll)/.test(style.overflow);
    if (clipsY && widgetRect.bottom > element.getBoundingClientRect().bottom + 1) return true;
    element = element.parentElement;
  }

  return false;
}

function getCafeADebugComputedSpacing(element: HTMLElement | null | undefined) {
  if (!element) {
    return {
      display: "-",
      marginBottom: "-",
      marginTop: "-",
      paddingBottom: "-",
      paddingTop: "-",
    };
  }

  const style = window.getComputedStyle(element);
  return {
    display: style.display,
    marginBottom: style.marginBottom,
    marginTop: style.marginTop,
    paddingBottom: style.paddingBottom,
    paddingTop: style.paddingTop,
  };
}

function getCafeADebugStyleValue(element: HTMLElement | null | undefined, propertyName: string) {
  if (!element) return "";
  return window.getComputedStyle(element).getPropertyValue(propertyName).trim();
}

function getCafeADebugCssPixelValue(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getCafeADebugLineHeightPx(style: CSSStyleDeclaration, elementRect: DOMRect) {
  const parsedLineHeight = getCafeADebugCssPixelValue(style.lineHeight);
  if (parsedLineHeight != null) return parsedLineHeight;

  const parsedFontSize = getCafeADebugCssPixelValue(style.fontSize);
  if (parsedFontSize != null) return parsedFontSize * 1.2;

  return elementRect.height;
}

function getCafeADebugTitleTextMetrics(titleElement: HTMLElement | null | undefined) {
  if (!titleElement) {
    return {
      actualBoundingBoxAscent: null,
      actualBoundingBoxDescent: null,
      estimatedInkTop: null,
      fontBoundingBoxAscent: null,
      fontBoundingBoxDescent: null,
      lineBoxTopLeading: null,
    };
  }

  const titleRect = titleElement.getBoundingClientRect();
  const titleStyle = window.getComputedStyle(titleElement);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) {
    return {
      actualBoundingBoxAscent: null,
      actualBoundingBoxDescent: null,
      estimatedInkTop: null,
      fontBoundingBoxAscent: null,
      fontBoundingBoxDescent: null,
      lineBoxTopLeading: null,
    };
  }

  context.font = titleStyle.font;
  const text = titleElement.textContent?.trim() || "CATEGORY";
  const metrics = context.measureText(text);
  const actualAscent = metrics.actualBoundingBoxAscent;
  const actualDescent = metrics.actualBoundingBoxDescent;
  const fontAscent = metrics.fontBoundingBoxAscent;
  const fontDescent = metrics.fontBoundingBoxDescent;
  const hasActualMetrics = Number.isFinite(actualAscent) && Number.isFinite(actualDescent);

  const lineHeightPx = getCafeADebugLineHeightPx(titleStyle, titleRect);
  const inkHeight = hasActualMetrics ? actualAscent + actualDescent : titleRect.height;
  const lineBoxTopLeading = Math.max(0, (lineHeightPx - inkHeight) / 2);
  const estimatedInkTop = titleRect.top + lineBoxTopLeading;

  return {
    actualBoundingBoxAscent: hasActualMetrics ? roundFitMetric(actualAscent) : null,
    actualBoundingBoxDescent: hasActualMetrics ? roundFitMetric(actualDescent) : null,
    estimatedInkTop: roundFitMetric(estimatedInkTop),
    fontBoundingBoxAscent: Number.isFinite(fontAscent) ? roundFitMetric(fontAscent) : null,
    fontBoundingBoxDescent: Number.isFinite(fontDescent) ? roundFitMetric(fontDescent) : null,
    lineBoxTopLeading: roundFitMetric(lineBoxTopLeading),
  };
}

function getCafeADebugSafeDataAttributes(element: HTMLElement | null | undefined) {
  if (!element) return "";

  return Array.from(element.attributes)
    .filter((attribute) => attribute.name.startsWith("data-cafe-a-") || attribute.name.startsWith("data-fit-"))
    .map((attribute) => `${attribute.name}=${attribute.value || "true"}`)
    .filter((attribute) => !/id|key|signature|fingerprint|path|url|src/i.test(attribute))
    .slice(0, 16)
    .join(" | ");
}

type CafeADebugBlockElement = {
  element: HTMLElement;
  index: number;
  rect: DOMRect;
  type: string | undefined;
};

type CafeADebugWidgetToCategoryTarget = {
  categoryElement: HTMLElement;
  columnIndex: number;
  indexInVisualColumn: number;
  isLastBlockInVisualColumn: boolean;
  widgetElement: HTMLElement;
};

function getCafeADebugWidgetToCategoryTarget(columns: Map<number, CafeADebugBlockElement[]>) {
  const sortedColumns = Array.from(columns.entries()).sort((left, right) => left[0] - right[0]);

  for (let columnIndex = 0; columnIndex < sortedColumns.length; columnIndex += 1) {
    const [, columnBlocks] = sortedColumns[columnIndex];
    const sortedColumnBlocks = columnBlocks
      .slice()
      .sort((left, right) => left.rect.top - right.rect.top || left.rect.left - right.rect.left || left.index - right.index);

    for (let blockIndex = 0; blockIndex < sortedColumnBlocks.length - 1; blockIndex += 1) {
      const block = sortedColumnBlocks[blockIndex];
      const nextBlock = sortedColumnBlocks[blockIndex + 1];
      if (block.type === "widget" && nextBlock?.type === "category") {
        return {
          categoryElement: nextBlock.element,
          columnIndex,
          indexInVisualColumn: blockIndex,
          isLastBlockInVisualColumn: blockIndex === sortedColumnBlocks.length - 1,
          widgetElement: block.element,
        } satisfies CafeADebugWidgetToCategoryTarget;
      }
    }
  }

  return null;
}

function getCafeADebugWidgetToCategoryTransition(boardElement: HTMLElement) {
  const blockElements: CafeADebugBlockElement[] = Array.from(boardElement.querySelectorAll<HTMLElement>("[data-cafe-a-block-type]"))
    .map((element, index) => ({
      element,
      index,
      rect: element.getBoundingClientRect(),
      type: element.dataset.cafeABlockType,
    }))
    .filter(({ rect }) => rect.width > 0 && rect.height > 0);
  const columnLefts: number[] = [];
  const columns = new Map<number, CafeADebugBlockElement[]>();

  blockElements.forEach((block) => {
    const columnKey = getCafeAColumnKey(columnLefts, block.rect.left);
    const columnBlocks = columns.get(columnKey) ?? [];
    columnBlocks.push(block);
    columns.set(columnKey, columnBlocks);
  });

  const target = getCafeADebugWidgetToCategoryTarget(columns);

  if (!target) {
    return {
      categoryBlockExists: false,
      categoryData: null,
      categoryMarginTop: "-",
      categoryPaddingTop: "-",
      categoryTitleToFirstItemGap: null,
      categoryVisualColumnIndex: null,
      categoryVisualIndex: null,
      categoryWrapperTop: null,
      dividerDisplay: "-",
      dividerExists: false,
      dividerHiddenByColumnStart: false,
      dividerMarginBottom: "-",
      dividerMarginTop: "-",
      dividerLeft: null,
      dividerRight: null,
      dividerToCategoryGap: null,
      dividerToEstimatedInkGap: null,
      firstItemTop: null,
      glyphActualAscent: null,
      glyphActualDescent: null,
      glyphFontAscent: null,
      glyphFontDescent: null,
      lineBoxTopLeading: null,
      parentColumnGap: "-",
      parentRowGap: "-",
      semanticGap: getCafeADebugStyleValue(boardElement, "--cafe-a-category-title-to-items-gap"),
      titleFontFamily: "-",
      titleFontSize: "-",
      titleFontWeight: "-",
      titleLineBoxBottom: null,
      titleLineBoxHeight: null,
      titleLineBoxLeft: null,
      titleLineBoxRight: null,
      titleLineBoxTop: null,
      titleLineBoxWidth: null,
      titleLineHeight: "-",
      titleLetterSpacing: "-",
      titleTransform: "-",
      titleZoom: "-",
      estimatedInkTop: null,
      widgetOuterBottom: null,
      widgetOuterLeft: null,
      widgetOuterRight: null,
      dividerBottom: null,
      dividerTop: null,
      widgetBlockExists: blockElements.some((block) => block.type === "widget"),
      widgetData: null,
      widgetIsLastBlockInVisualColumn: false,
      widgetMarginBottom: "-",
      widgetPaddingBottom: "-",
      widgetToDividerGap: null,
      widgetVisualColumnIndex: null,
      widgetVisualIndex: null,
      widgetVisualNext: null,
    };
  }

  const { categoryElement, columnIndex, indexInVisualColumn, isLastBlockInVisualColumn, widgetElement } = target;
  const dividerElement = categoryElement.querySelector<HTMLElement>(":scope > .cafe-a-menu-category-top-divider");
  const categoryHeadingElement = categoryElement.querySelector<HTMLElement>("[data-cafe-a-category-heading]");
  const categoryTitleElement = categoryElement.querySelector<HTMLElement>("[data-cafe-a-category-title-text]");
  const firstItemElement = categoryElement.querySelector<HTMLElement>("[data-cafe-a-item-stack]");
  const widgetRect = widgetElement.getBoundingClientRect();
  const dividerRect = dividerElement?.getBoundingClientRect();
  const categoryHeadingRect = categoryHeadingElement?.getBoundingClientRect();
  const categoryTitleRect = categoryTitleElement?.getBoundingClientRect();
  const firstItemRect = firstItemElement?.getBoundingClientRect();
  const widgetStyle = getCafeADebugComputedSpacing(widgetElement);
  const categoryStyle = getCafeADebugComputedSpacing(categoryElement);
  const dividerStyle = getCafeADebugComputedSpacing(dividerElement);
  const titleStyle = categoryTitleElement ? window.getComputedStyle(categoryTitleElement) : null;
  const titleMetrics = getCafeADebugTitleTextMetrics(categoryTitleElement);
  const menuElement = boardElement.querySelector<HTMLElement>("[data-cafe-a-fit-menu]") ?? boardElement;
  const menuStyle = window.getComputedStyle(menuElement);

  return {
    categoryBlockExists: true,
    categoryData: getCafeADebugSafeDataAttributes(categoryElement),
    categoryMarginTop: categoryStyle.marginTop,
    categoryPaddingTop: categoryStyle.paddingTop,
    categoryTitleToFirstItemGap:
      categoryHeadingRect && firstItemRect ? roundFitMetric(firstItemRect.top - categoryHeadingRect.bottom) : null,
    categoryVisualColumnIndex: columnIndex,
    categoryVisualIndex: indexInVisualColumn + 1,
    categoryWrapperTop: roundFitMetric(categoryElement.getBoundingClientRect().top),
    dividerDisplay: dividerStyle.display,
    dividerBottom: dividerRect ? roundFitMetric(dividerRect.bottom) : null,
    dividerExists: Boolean(dividerElement),
    dividerHiddenByColumnStart: categoryElement.dataset.cafeACategoryDividerDesktopSuppressed === "true",
    dividerMarginBottom: dividerStyle.marginBottom,
    dividerMarginTop: dividerStyle.marginTop,
    dividerLeft: dividerRect ? roundFitMetric(dividerRect.left) : null,
    dividerRight: dividerRect ? roundFitMetric(dividerRect.right) : null,
    dividerTop: dividerRect ? roundFitMetric(dividerRect.top) : null,
    dividerToCategoryGap:
      dividerRect && categoryHeadingRect ? roundFitMetric(categoryHeadingRect.top - dividerRect.bottom) : null,
    dividerToEstimatedInkGap:
      dividerRect && titleMetrics.estimatedInkTop != null ? roundFitMetric(titleMetrics.estimatedInkTop - dividerRect.bottom) : null,
    firstItemTop: firstItemRect ? roundFitMetric(firstItemRect.top) : null,
    glyphActualAscent: titleMetrics.actualBoundingBoxAscent,
    glyphActualDescent: titleMetrics.actualBoundingBoxDescent,
    glyphFontAscent: titleMetrics.fontBoundingBoxAscent,
    glyphFontDescent: titleMetrics.fontBoundingBoxDescent,
    lineBoxTopLeading: titleMetrics.lineBoxTopLeading,
    parentColumnGap: menuStyle.columnGap,
    parentRowGap: menuStyle.rowGap,
    semanticGap: getCafeADebugStyleValue(boardElement, "--cafe-a-category-title-to-items-gap"),
    titleFontFamily: titleStyle?.fontFamily ?? "-",
    titleFontSize: titleStyle?.fontSize ?? "-",
    titleFontWeight: titleStyle?.fontWeight ?? "-",
    titleLineBoxBottom: categoryTitleRect ? roundFitMetric(categoryTitleRect.bottom) : null,
    titleLineBoxHeight: categoryTitleRect ? roundFitMetric(categoryTitleRect.height) : null,
    titleLineBoxLeft: categoryTitleRect ? roundFitMetric(categoryTitleRect.left) : null,
    titleLineBoxRight: categoryTitleRect ? roundFitMetric(categoryTitleRect.right) : null,
    titleLineBoxTop: categoryTitleRect ? roundFitMetric(categoryTitleRect.top) : null,
    titleLineBoxWidth: categoryTitleRect ? roundFitMetric(categoryTitleRect.width) : null,
    titleLineHeight: titleStyle?.lineHeight ?? "-",
    titleLetterSpacing: titleStyle?.letterSpacing ?? "-",
    titleTransform: titleStyle?.transform === "none" ? "none" : titleStyle?.transform ?? "-",
    titleZoom: titleStyle?.getPropertyValue("zoom") || "-",
    estimatedInkTop: titleMetrics.estimatedInkTop,
    widgetBlockExists: true,
    widgetData: getCafeADebugSafeDataAttributes(widgetElement),
    widgetIsLastBlockInVisualColumn: isLastBlockInVisualColumn,
    widgetMarginBottom: widgetStyle.marginBottom,
    widgetOuterBottom: roundFitMetric(widgetRect.bottom),
    widgetOuterLeft: roundFitMetric(widgetRect.left),
    widgetOuterRight: roundFitMetric(widgetRect.right),
    widgetPaddingBottom: widgetStyle.paddingBottom,
    widgetToDividerGap: dividerRect ? roundFitMetric(dividerRect.top - widgetRect.bottom) : null,
    widgetVisualColumnIndex: columnIndex,
    widgetVisualIndex: indexInVisualColumn,
    widgetVisualNext: widgetElement.dataset.cafeAVisualNextBlockType ?? null,
  };
}

function getCafeADebugMetrics({
  boardElement,
  counters,
  data,
  density,
  fitState,
  layoutInputSignature,
  layoutMode,
  orderedBalancedFinalFillBoost,
  orderedFitFinalFillCompensation,
  typographySizeSetting,
  visibleCategoryCount,
  visibleItemCount,
  visibleWidgetCount,
}: {
  boardElement: HTMLElement;
  counters: CafeADebugCounters;
} & Omit<CafeADebugPanelProps, "boardRef" | "countersRef">): CafeADebugMetrics {
  const menuElement =
    boardElement.querySelector<HTMLElement>("[data-cafe-a-fit-menu]") ??
    boardElement.querySelector<HTMLElement>(".cafe-a-fit-menu-grid");
  const widgetElement = boardElement.querySelector<HTMLElement>("[data-cafe-a-menu-widget-block]");
  const widgetMediaElement = widgetElement?.querySelector<HTMLElement>("[data-cafe-a-widget-media]");
  const widgetCopyElement = widgetElement?.querySelector<HTMLElement>("[data-cafe-a-widget-copy]");
  const widgetTitleElement = widgetElement?.querySelector<HTMLElement>("[data-cafe-a-widget-title]");
  const widgetBodyElement = widgetElement?.querySelector<HTMLElement>("[data-cafe-a-widget-body]");
  const footerElement = boardElement.querySelector<HTMLElement>('[data-cafe-a-footer-info][data-cafe-a-footer-placement="desktop"]');
  const boardRect = boardElement.getBoundingClientRect();
  const menuRect = menuElement?.getBoundingClientRect();
  const widgetRect = widgetElement?.getBoundingClientRect();
  const widgetCopyRect = widgetCopyElement?.getBoundingClientRect();
  const safeBoundary = menuElement ? getCafeAClippingBottom(boardElement, menuElement) : boardRect.bottom;
  const footerRect = footerElement?.getBoundingClientRect();
  const footerVisible = Boolean(footerRect && footerRect.width > 0 && footerRect.height > 0);
  const footerTopSafetyGap =
    footerVisible && boardRect.width < 1120 ? CAFE_A_FOOTER_INFO_TABLET_TOP_SAFETY_GAP_PX : CAFE_A_FOOTER_INFO_TOP_SAFETY_GAP_PX;
  const footerNoGoTop = footerVisible
    ? footerRect!.top - footerTopSafetyGap - Math.max(BASIC_RIGHT_EDGE_SAFETY_GAP_PX, 1)
    : null;
  const widgetStyle = widgetElement ? window.getComputedStyle(widgetElement) : null;
  const menuStyle = menuElement ? window.getComputedStyle(menuElement) : null;
  const activeHeroElement = document.querySelector<HTMLElement>("[data-cafe-a-active-hero-index]");
  const widgetColumnIndex =
    widgetRect && menuRect
      ? Math.max(
          0,
          Math.floor(
            (widgetRect.left - menuRect.left) /
              Math.max(1, ((menuRect.width - (fitState.columns - 1) * (Number.parseFloat(menuStyle?.columnGap ?? "0") || 0)) / Math.max(1, fitState.columns))),
          ),
        )
      : -1;
  const footerOverlap =
    Boolean(widgetRect && footerRect) &&
    widgetRect!.right > footerRect!.left &&
    widgetRect!.left < footerRect!.right &&
    widgetRect!.bottom > footerRect!.top &&
    widgetRect!.top < footerRect!.bottom;
  const horizontalOverflow =
    document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 ||
    Boolean(menuElement && menuElement.scrollWidth > menuElement.clientWidth + 1);
  const pageScroll = document.documentElement.scrollHeight > window.innerHeight + 1 || document.body.scrollHeight > window.innerHeight + 1;
  const widgetScrollHeightOverflow = Boolean(widgetElement && widgetElement.scrollHeight > widgetElement.clientHeight + 1);
  const copyScrollHeightOverflow = Boolean(widgetCopyElement && widgetCopyElement.scrollHeight > widgetCopyElement.clientHeight + 1);
  const widgetOuterSafe = Boolean(widgetRect && widgetRect.bottom <= safeBoundary - 1);
  const widgetCopySafe = Boolean(widgetCopyRect && widgetCopyRect.bottom <= safeBoundary - 1);
  const widgetBodyRect = widgetBodyElement?.getBoundingClientRect();
  const widgetBodySafe = Boolean(widgetBodyRect && widgetBodyRect.bottom <= safeBoundary - 1);
  const rootElement = document.querySelector<HTMLElement>(".cafe-a-typography") ?? boardElement;
  const widgetToCategoryTransition = getCafeADebugWidgetToCategoryTransition(boardElement);

  return {
    routeKind: getCafeADebugRouteKind(),
    viewport: {
      devicePixelRatio: roundFitMetric(window.devicePixelRatio || 1),
      innerHeight: window.innerHeight,
      innerWidth: window.innerWidth,
    },
    input: {
      actualLayoutMode: layoutMode,
      categoryCount: visibleCategoryCount,
      currentDensity: density,
      finalFillScale: layoutMode === "orderedFit" ? orderedFitFinalFillCompensation : orderedBalancedFinalFillBoost.fontScale,
      itemCount: visibleItemCount,
      publicServiceType: data.publicServiceType,
      templateKey: data.menuSite.template_key,
      typographySizeSetting,
      visibleWidgetCount,
      widgetCount: data.widgets?.length ?? 0,
    },
    layout: {
      activeHeroSlideIndex: activeHeroElement?.dataset.cafeAActiveHeroIndex ?? "-",
      columnCount: fitState.columns,
      fitStatus: fitState.status,
      finalGapBoost: orderedBalancedFinalFillBoost.gapScale,
      finalFontBoost: orderedBalancedFinalFillBoost.fontScale,
      fitGapScale: fitState.gapScale,
      fitFontScale: fitState.fontScale,
      layoutEpoch: counters.layoutEpoch,
      layoutInputSignature,
      measuredColumns: fitState.measuredColumns,
      orderedBalancedFingerprint: fitState.orderedBalancedFingerprint ? "set" : "empty",
      orderedFitFinalFillCompensation,
      resizeObserverCallbackCount: counters.resizeObserverCallbackCount,
      stateUpdateCount: counters.stateUpdateCount,
      widgetColumnIndex,
    },
    rects: {
      board: getCafeADebugRect(boardElement),
      contentSafeBoundary: roundFitMetric(safeBoundary),
      footer: getCafeADebugRect(footerElement),
      footerSafeBoundary: footerNoGoTop == null ? null : roundFitMetric(footerNoGoTop),
      widgetBody: getCafeADebugRect(widgetBodyElement),
      widgetCopy: getCafeADebugRect(widgetCopyElement),
      widgetMedia: getCafeADebugRect(widgetMediaElement),
      widgetOuter: getCafeADebugRect(widgetElement),
      widgetTitle: getCafeADebugRect(widgetTitleElement),
    },
    safety: {
      clippedByAncestor: getCafeADebugClippingByAncestor(widgetElement ?? null),
      copyScrollHeightOverflow,
      footerOverlap,
      horizontalOverflow,
      pageScroll,
      widgetBodySafe,
      widgetCopySafe,
      widgetOuterSafe,
      widgetScrollHeightOverflow,
    },
    computedCss: {
      breakInside: widgetStyle?.breakInside ?? "-",
      columnCount: menuStyle?.columnCount ?? "-",
      columnFill: menuStyle?.columnFill ?? "-",
      columnSpan: widgetStyle?.columnSpan ?? "-",
      contain: widgetStyle?.contain ?? "-",
      display: widgetStyle?.display ?? "-",
      overflow: widgetStyle?.overflow ?? "-",
      parentColumnCount: menuStyle?.columnCount ?? "-",
      parentColumnFill: menuStyle?.columnFill ?? "-",
      position: widgetStyle?.position ?? "-",
      transform: widgetStyle?.transform === "none" ? "none" : widgetStyle?.transform ?? "-",
    },
    parentChain: getCafeADebugParentChain(rootElement, widgetElement ?? null),
    selectorCounts: {
      board: 1,
      categoryBlocks: boardElement.querySelectorAll("[data-cafe-a-balanced-category-block]").length,
      itemStacks: boardElement.querySelectorAll("[data-cafe-a-item-stack]").length,
      widgetBlocks: boardElement.querySelectorAll("[data-cafe-a-menu-widget-block]").length,
      widgetBodies: boardElement.querySelectorAll("[data-cafe-a-widget-body]").length,
      widgetCopies: boardElement.querySelectorAll("[data-cafe-a-widget-copy]").length,
      widgetMedia: boardElement.querySelectorAll("[data-cafe-a-widget-media]").length,
      widgetTitles: boardElement.querySelectorAll("[data-cafe-a-widget-title]").length,
    },
    widgetToCategoryTransition,
  };
}

function CafeADebugRectOutline({ className, rect }: { className: string; rect: CafeADebugRect | null | number }) {
  if (!rect || typeof rect === "number") return null;

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed z-[9998] ${className}`}
      style={{
        height: `${rect.height}px`,
        left: `${rect.left}px`,
        top: `${rect.top}px`,
        width: `${rect.width}px`,
      }}
    />
  );
}

function getCafeADebugNumber(value: string | number | boolean | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function CafeADebugHorizontalLine({
  className,
  left,
  right,
  top,
}: {
  className: string;
  left: number | null;
  right: number | null;
  top: number | null;
}) {
  if (left == null || right == null || top == null || right <= left) return null;

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed z-[9998] border-t-2 ${className}`}
      style={{
        left: `${left}px`,
        top: `${top}px`,
        width: `${right - left}px`,
      }}
    />
  );
}

function CafeADebugLineBoxFill({
  bottom,
  left,
  right,
  top,
}: {
  bottom: number | null;
  left: number | null;
  right: number | null;
  top: number | null;
}) {
  if (left == null || right == null || top == null || bottom == null || right <= left || bottom <= top) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed z-[9997] bg-orange-400/25 ring-1 ring-orange-300/80"
      style={{
        height: `${bottom - top}px`,
        left: `${left}px`,
        top: `${top}px`,
        width: `${right - left}px`,
      }}
    />
  );
}

function CafeADebugOverlay({
  boardRef,
  countersRef,
  data,
  density,
  fitState,
  layoutInputSignature,
  layoutMode,
  orderedBalancedFinalFillBoost,
  orderedFitFinalFillCompensation,
  typographySizeSetting,
  visibleCategoryCount,
  visibleItemCount,
  visibleWidgetCount,
}: CafeADebugPanelProps) {
  const [debugEnabled] = useState(
    () =>
      process.env.NODE_ENV !== "production" &&
      data.debugCafeA === true &&
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("debugCafeA") === "1",
  );
  const [metrics, setMetrics] = useState<CafeADebugMetrics | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!debugEnabled) return;

    let frameId = 0;
    const measure = () => {
      const boardElement = boardRef.current;
      if (boardElement) {
        setMetrics(
          getCafeADebugMetrics({
            boardElement,
            counters: countersRef.current,
            data,
            density,
            fitState,
            layoutInputSignature,
            layoutMode,
            orderedBalancedFinalFillBoost,
            orderedFitFinalFillCompensation,
            typographySizeSetting,
            visibleCategoryCount,
            visibleItemCount,
            visibleWidgetCount,
          }),
        );
      }
      frameId = window.requestAnimationFrame(measure);
    };

    frameId = window.requestAnimationFrame(measure);
    return () => window.cancelAnimationFrame(frameId);
  }, [
    boardRef,
    countersRef,
    data,
    debugEnabled,
    density,
    fitState,
    layoutInputSignature,
    layoutMode,
    orderedBalancedFinalFillBoost,
    orderedFitFinalFillCompensation,
    typographySizeSetting,
    visibleCategoryCount,
    visibleItemCount,
    visibleWidgetCount,
  ]);

  const copyMetrics = useCallback(() => {
    if (!metrics) return;
    const payload = JSON.stringify(metrics, null, 2);
    void navigator.clipboard?.writeText(payload).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    });
  }, [metrics]);

  if (process.env.NODE_ENV === "production" || !debugEnabled || !metrics) return null;

  const widgetOuterRect = metrics.rects.widgetOuter;
  const widgetCopyRect = metrics.rects.widgetCopy;
  const contentSafeBoundary = typeof metrics.rects.contentSafeBoundary === "number" ? metrics.rects.contentSafeBoundary : null;
  const footerSafeBoundary = typeof metrics.rects.footerSafeBoundary === "number" ? metrics.rects.footerSafeBoundary : null;
  const transition = metrics.widgetToCategoryTransition;
  const titleLineBoxLeft = getCafeADebugNumber(transition.titleLineBoxLeft);
  const titleLineBoxRight = getCafeADebugNumber(transition.titleLineBoxRight);
  const titleLineBoxTop = getCafeADebugNumber(transition.titleLineBoxTop);
  const titleLineBoxBottom = getCafeADebugNumber(transition.titleLineBoxBottom);
  const dividerLeft = getCafeADebugNumber(transition.dividerLeft);
  const dividerRight = getCafeADebugNumber(transition.dividerRight);
  const widgetGuideLeft = getCafeADebugNumber(transition.widgetOuterLeft);
  const widgetGuideRight = getCafeADebugNumber(transition.widgetOuterRight);

  return (
    <div data-cafe-a-debug-overlay="" className="pointer-events-none fixed inset-0 z-[9999] font-mono text-[11px]">
      <CafeADebugRectOutline rect={widgetOuterRect} className="border-2 border-blue-400/90" />
      <CafeADebugRectOutline rect={widgetCopyRect} className="border-2 border-purple-400/90" />
      <CafeADebugLineBoxFill left={titleLineBoxLeft} right={titleLineBoxRight} top={titleLineBoxTop} bottom={titleLineBoxBottom} />
      <CafeADebugHorizontalLine className="border-blue-300" left={widgetGuideLeft} right={widgetGuideRight} top={getCafeADebugNumber(transition.widgetOuterBottom)} />
      <CafeADebugHorizontalLine className="border-red-400" left={dividerLeft} right={dividerRight} top={getCafeADebugNumber(transition.dividerTop)} />
      <CafeADebugHorizontalLine className="border-red-600" left={dividerLeft} right={dividerRight} top={getCafeADebugNumber(transition.dividerBottom)} />
      <CafeADebugHorizontalLine className="border-emerald-300" left={titleLineBoxLeft} right={titleLineBoxRight} top={getCafeADebugNumber(transition.estimatedInkTop)} />
      <CafeADebugHorizontalLine className="border-fuchsia-300" left={titleLineBoxLeft} right={titleLineBoxRight} top={getCafeADebugNumber(transition.firstItemTop)} />
      {contentSafeBoundary != null && <div aria-hidden="true" className="fixed left-0 right-0 z-[9998] border-t-2 border-emerald-400" style={{ top: `${contentSafeBoundary}px` }} />}
      {footerSafeBoundary != null && <div aria-hidden="true" className="fixed left-0 right-0 z-[9998] border-t-2 border-red-500" style={{ top: `${footerSafeBoundary}px` }} />}
      <div className="pointer-events-auto absolute left-3 top-3 max-h-[calc(100vh-24px)] w-[420px] max-w-[calc(100vw-24px)] overflow-auto rounded bg-black/86 p-3 leading-5 text-white shadow-xl">
        <div className="mb-2 flex items-center justify-between gap-3">
          <strong>CafeA debug</strong>
          <button type="button" className="rounded border border-white/30 px-2 py-1 text-[10px] font-bold hover:bg-white/10" onClick={copyMetrics}>
            {copied ? "복사됨" : "진단값 복사"}
          </button>
        </div>
        <div>route: {metrics.routeKind}</div>
        <div>viewport: {metrics.viewport.innerWidth}x{metrics.viewport.innerHeight} @ {metrics.viewport.devicePixelRatio}</div>
        <div>mode: {metrics.input.actualLayoutMode}</div>
        <div>counts: c{metrics.input.categoryCount} / i{metrics.input.itemCount} / w{metrics.input.visibleWidgetCount}</div>
        <div>density / typo: {metrics.input.currentDensity} / {metrics.input.typographySizeSetting}</div>
        <div>fit: {metrics.layout.fitStatus} · cols {metrics.layout.columnCount} · measured {metrics.layout.measuredColumns}</div>
        <div>scale: {metrics.layout.fitFontScale} / {metrics.layout.fitGapScale} / fill {metrics.layout.orderedFitFinalFillCompensation}</div>
        <div>epoch/state/resize: {metrics.layout.layoutEpoch} / {metrics.layout.stateUpdateCount} / {metrics.layout.resizeObserverCallbackCount}</div>
        <div>hero index: {metrics.layout.activeHeroSlideIndex}</div>
        <div>widget column: {metrics.layout.widgetColumnIndex}</div>
        <div>safe: outer {String(metrics.safety.widgetOuterSafe)} · copy {String(metrics.safety.widgetCopySafe)} · body {String(metrics.safety.widgetBodySafe)}</div>
        <div>overflow: ancestor {String(metrics.safety.clippedByAncestor)} · widgetScroll {String(metrics.safety.widgetScrollHeightOverflow)} · copyScroll {String(metrics.safety.copyScrollHeightOverflow)}</div>
        <div>footer/page/h: {String(metrics.safety.footerOverlap)} / {String(metrics.safety.pageScroll)} / {String(metrics.safety.horizontalOverflow)}</div>
        <div>widget rect: {JSON.stringify(metrics.rects.widgetOuter)}</div>
        <div>copy rect: {JSON.stringify(metrics.rects.widgetCopy)}</div>
        <div>media rect: {JSON.stringify(metrics.rects.widgetMedia)}</div>
        <div>safe lines: content {String(metrics.rects.contentSafeBoundary)} / footer {String(metrics.rects.footerSafeBoundary)}</div>
        <div>css: display {metrics.computedCss.display} · break {metrics.computedCss.breakInside} · overflow {metrics.computedCss.overflow}</div>
        <div>parent columns: {metrics.computedCss.parentColumnCount} / {metrics.computedCss.parentColumnFill}</div>
        <div className="mt-2 border-t border-white/20 pt-2 font-bold">widget → category</div>
        <div>target: w {String(metrics.widgetToCategoryTransition.widgetBlockExists)} · c {String(metrics.widgetToCategoryTransition.categoryBlockExists)} · divider {String(metrics.widgetToCategoryTransition.dividerExists)}</div>
        <div>visual: col {String(metrics.widgetToCategoryTransition.widgetVisualColumnIndex)} · idx {String(metrics.widgetToCategoryTransition.widgetVisualIndex)} → {String(metrics.widgetToCategoryTransition.categoryVisualIndex)} · next {String(metrics.widgetToCategoryTransition.widgetVisualNext)}</div>
        <div>gaps: widget→divider {String(metrics.widgetToCategoryTransition.widgetToDividerGap)} · divider→title {String(metrics.widgetToCategoryTransition.dividerToCategoryGap)} · title→item {String(metrics.widgetToCategoryTransition.categoryTitleToFirstItemGap)}</div>
        <div>ink: divider→ink {String(metrics.widgetToCategoryTransition.dividerToEstimatedInkGap)} · top leading {String(metrics.widgetToCategoryTransition.lineBoxTopLeading)} · ink top {String(metrics.widgetToCategoryTransition.estimatedInkTop)}</div>
        <div>title box: top {String(metrics.widgetToCategoryTransition.titleLineBoxTop)} · bottom {String(metrics.widgetToCategoryTransition.titleLineBoxBottom)} · h {String(metrics.widgetToCategoryTransition.titleLineBoxHeight)}</div>
        <div>title css: fs {String(metrics.widgetToCategoryTransition.titleFontSize)} · lh {String(metrics.widgetToCategoryTransition.titleLineHeight)} · weight {String(metrics.widgetToCategoryTransition.titleFontWeight)}</div>
        <div>semantic: {String(metrics.widgetToCategoryTransition.semanticGap)} · widget mb {String(metrics.widgetToCategoryTransition.widgetMarginBottom)} · divider mb {String(metrics.widgetToCategoryTransition.dividerMarginBottom)}</div>
        <div>category divider hidden: {String(metrics.widgetToCategoryTransition.dividerHiddenByColumnStart)} · display {String(metrics.widgetToCategoryTransition.dividerDisplay)}</div>
        <div>selector counts: {JSON.stringify(metrics.selectorCounts)}</div>
        <details className="mt-2">
          <summary className="cursor-pointer font-bold">parent chain</summary>
          <pre className="mt-1 whitespace-pre-wrap text-[10px] leading-4">{JSON.stringify(metrics.parentChain, null, 2)}</pre>
        </details>
        <details className="mt-2">
          <summary className="cursor-pointer font-bold">widget/category transition</summary>
          <pre className="mt-1 whitespace-pre-wrap text-[10px] leading-4">{JSON.stringify(metrics.widgetToCategoryTransition, null, 2)}</pre>
        </details>
      </div>
    </div>
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

function MenuCategoryContentBlock({
  block,
  density,
  data,
  capabilities,
  customBadgeStyles,
  itemStackSpacing,
  timeSaleByItemId,
  priceDisplayMode,
  onOpenImage,
  suppressDesktopColumnStartDivider,
  visualNextBlockType,
  balancedSourceOrder,
}: {
  block: CafeDesignACategoryContentBlock;
  density: MenuLayoutDensity;
  data: PublicMenuTemplateProps;
  capabilities: TemplateCapabilities;
  customBadgeStyles: unknown;
  itemStackSpacing: string;
  timeSaleByItemId: Map<string, CafeDesignATimeSaleMatch>;
  priceDisplayMode: CafeDesignAPriceDisplayMode;
  onOpenImage?: (preview: CafeMenuImagePreview, trigger: HTMLElement) => void;
  suppressDesktopColumnStartDivider?: boolean;
  visualNextBlockType?: CafeDesignAContentBlockType | null;
  balancedSourceOrder?: number;
}) {
  const groupKey = block.key;
  const balancedAttributes =
    balancedSourceOrder == null
      ? {}
      : {
          "data-cafe-a-balanced-atomic-block": "",
          "data-cafe-a-balanced-block-type": "category",
          "data-cafe-a-balanced-block-id": groupKey,
          "data-cafe-a-balanced-category-block": groupKey,
          "data-cafe-a-balanced-source-order": balancedSourceOrder,
          "data-balanced-estimated-height": estimateContentBlockHeight(block, data, capabilities).toFixed(2),
        };

  return (
    <section
      key={groupKey}
      className={getCategoryBlockClassName()}
      data-cafe-a-category-block=""
      data-cafe-a-block-type="category"
      data-cafe-a-category-divider-before={block.showDividerBeforeCategory ? "true" : undefined}
      data-cafe-a-category-divider-desktop-suppressed={suppressDesktopColumnStartDivider ? "true" : undefined}
      data-cafe-a-previous-block-type={block.previousVisibleBlockType ?? undefined}
      data-cafe-a-next-block-type={block.nextVisibleBlockType ?? undefined}
      data-cafe-a-visual-next-block-type={visualNextBlockType ?? undefined}
      {...balancedAttributes}
    >
      {block.showDividerBeforeCategory ? (
        <div
          className="cafe-a-menu-category-top-divider"
          aria-hidden="true"
          data-cafe-a-category-divider=""
          data-cafe-a-category-divider-position="before"
        />
      ) : null}
      <CategoryTitle category={block.category} density={density} items={block.items} />
      <div className="cafe-a-category-items">
        {block.items.map((item) => (
          <div key={item.id} className={`cafe-a-menu-item-stack break-inside-avoid ${itemStackSpacing}`} data-cafe-a-item-stack="">
            <MenuItemRow
              item={item}
              category={block.category}
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
}

function MenuWidgetContentBlock({
  block,
  data,
  capabilities,
  visualNextBlockType,
  balancedSourceOrder,
}: {
  block: CafeDesignAWidgetContentBlock;
  data: PublicMenuTemplateProps;
  capabilities: TemplateCapabilities;
  visualNextBlockType?: CafeDesignAContentBlockType | null;
  balancedSourceOrder?: number;
}) {
  const balancedAttributes =
    balancedSourceOrder == null
      ? {}
      : {
          "data-cafe-a-balanced-atomic-block": "",
          "data-cafe-a-balanced-block-type": "widget",
          "data-cafe-a-balanced-block-id": block.key,
          "data-cafe-a-balanced-source-order": balancedSourceOrder,
          "data-balanced-estimated-height": estimateContentBlockHeight(block, data, capabilities).toFixed(2),
        };

  return (
    <section
      key={block.key}
      className="cafe-a-menu-widget-block min-w-0 break-inside-avoid"
      data-cafe-a-menu-widget-block=""
      data-cafe-a-block-type="widget"
      data-cafe-a-previous-block-type={block.previousVisibleBlockType ?? undefined}
      data-cafe-a-next-block-type={block.nextVisibleBlockType ?? undefined}
      data-cafe-a-visual-next-block-type={visualNextBlockType ?? undefined}
      {...balancedAttributes}
    >
      <CafeAWidgetBlock widget={block.widget} />
    </section>
  );
}

function MenuContentBlock({
  block,
  density,
  data,
  capabilities,
  customBadgeStyles,
  itemStackSpacing,
  timeSaleByItemId,
  priceDisplayMode,
  onOpenImage,
  suppressDesktopColumnStartDivider,
  visualNextBlockType,
  balancedSourceOrder,
}: {
  block: CafeDesignAContentBlock;
  density: MenuLayoutDensity;
  data: PublicMenuTemplateProps;
  capabilities: TemplateCapabilities;
  customBadgeStyles: unknown;
  itemStackSpacing: string;
  timeSaleByItemId: Map<string, CafeDesignATimeSaleMatch>;
  priceDisplayMode: CafeDesignAPriceDisplayMode;
  onOpenImage?: (preview: CafeMenuImagePreview, trigger: HTMLElement) => void;
  suppressDesktopColumnStartDivider?: boolean;
  visualNextBlockType?: CafeDesignAContentBlockType | null;
  balancedSourceOrder?: number;
}) {
  if (block.blockType === "widget") {
    return (
      <MenuWidgetContentBlock
        block={block}
        data={data}
        capabilities={capabilities}
        visualNextBlockType={visualNextBlockType}
        balancedSourceOrder={balancedSourceOrder}
      />
    );
  }

  return (
    <MenuCategoryContentBlock
      block={block}
      density={density}
      data={data}
      capabilities={capabilities}
      customBadgeStyles={customBadgeStyles}
      itemStackSpacing={itemStackSpacing}
      timeSaleByItemId={timeSaleByItemId}
      priceDisplayMode={priceDisplayMode}
      onOpenImage={onOpenImage}
      suppressDesktopColumnStartDivider={suppressDesktopColumnStartDivider}
      visualNextBlockType={visualNextBlockType}
      balancedSourceOrder={balancedSourceOrder}
    />
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
  timeSaleByItemId: Map<string, CafeDesignATimeSaleMatch>;
  priceDisplayMode: CafeDesignAPriceDisplayMode;
  onOpenImage?: (preview: CafeMenuImagePreview, trigger: HTMLElement) => void;
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
          {pageGroup.blocks.map((block) => {
            return (
              <MenuContentBlock
                key={block.key}
                block={block}
                density={density}
                data={data}
                capabilities={capabilities}
                customBadgeStyles={customBadgeStyles}
                itemStackSpacing={itemStackSpacing}
                timeSaleByItemId={timeSaleByItemId}
                priceDisplayMode={priceDisplayMode}
                onOpenImage={onOpenImage}
              />
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
  const orderedBlocks = useMemo(() => getFlatContentBlocks(pageGroups), [pageGroups]);
  const blockOrderByKey = useMemo(() => new Map(orderedBlocks.map((block, index) => [block.key, index])), [orderedBlocks]);
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
          {column.blocks.map((block, blockIndex) => {
            return (
              <MenuContentBlock
                key={block.key}
                block={block}
                density={density}
                data={data}
                capabilities={capabilities}
                customBadgeStyles={customBadgeStyles}
                itemStackSpacing={itemStackSpacing}
                timeSaleByItemId={timeSaleByItemId}
                priceDisplayMode={priceDisplayMode}
                onOpenImage={onOpenImage}
                suppressDesktopColumnStartDivider={block.blockType === "category" && blockIndex === 0}
                visualNextBlockType={column.blocks[blockIndex + 1]?.blockType ?? null}
                balancedSourceOrder={blockOrderByKey.get(block.key) ?? 0}
              />
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
  const orderedBlocks = useMemo(() => getFlatContentBlocks(pageGroups), [pageGroups]);
  const blockOrderByKey = useMemo(() => new Map(orderedBlocks.map((block, index) => [block.key, index])), [orderedBlocks]);
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
          {column.blocks.map((block, blockIndex) => {
            return (
              <MenuContentBlock
                key={block.key}
                block={block}
                density={density}
                data={data}
                capabilities={capabilities}
                customBadgeStyles={customBadgeStyles}
                itemStackSpacing={itemStackSpacing}
                timeSaleByItemId={timeSaleByItemId}
                priceDisplayMode={priceDisplayMode}
                onOpenImage={onOpenImage}
                suppressDesktopColumnStartDivider={block.blockType === "category" && blockIndex === 0}
                visualNextBlockType={column.blocks[blockIndex + 1]?.blockType ?? null}
                balancedSourceOrder={blockOrderByKey.get(block.key) ?? 0}
              />
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
  const visibleContentBlockCount = visiblePageGroups.reduce((count, pageGroup) => count + pageGroup.blocks.length, 0);
  const visibleFitBlockCount = Math.max(visibleMenuGroupCount, visibleContentBlockCount);
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
  const cafeADebugCountersRef = useRef<CafeADebugCounters>({
    layoutEpoch: 0,
    resizeObserverCallbackCount: 0,
    stateUpdateCount: 0,
  });
  const cafeALastDebugFitSignatureRef = useRef("");
  const visibleItemCount = data.items.filter((item) => item.visible !== false).length;
  const visibleCategoryCount = data.categories.filter((category) => category.visible !== false).length;
  const visibleWidgetCount = data.widgets?.filter((widget) => widget.visible !== false).length ?? 0;
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
    const imageModeColumns = visibleFitBlockCount > 1 ? 3 : 1;
    const shouldClampImageModeColumns =
      hasVisibleItemImages &&
      (layoutMode !== "orderedBalancedFit" || (fitState.orderedBalancedFingerprint && visibleWidgetCount === 0));
    if (shouldClampImageModeColumns) {
      return {
        ...fitState,
        columns: Math.min(fitState.columns, imageModeColumns),
      };
    }
    if (layoutMode !== "orderedBalancedFit" || fitState.orderedBalancedFingerprint) return fitState;

    return {
      ...fitState,
      columns: hasVisibleItemImages && visibleWidgetCount === 0
        ? imageModeColumns
        : isDenseOrderedBalanced
        ? 3
        : Math.max(1, Math.min(orderedBalancedInitialColumns, visibleContentBlockCount || orderedBalancedInitialColumns)),
    };
  }, [
    fitState,
    hasVisibleItemImages,
    isDenseOrderedBalanced,
    layoutMode,
    orderedBalancedInitialColumns,
    visibleContentBlockCount,
    visibleFitBlockCount,
    visibleWidgetCount,
  ]);
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
  const layoutInputSignature = useMemo(
    () =>
      [
        data.mode,
        data.menuSite.template_key,
        layoutMode,
        visibleCategoryCount,
        visibleItemCount,
        visibleWidgetCount,
        visibleContentBlockCount,
        visibleImageSignature,
        typographySettings.font_size_scale_key,
        density,
        data.publicServiceType,
      ].join("|"),
    [
      data.menuSite.template_key,
      data.mode,
      data.publicServiceType,
      density,
      layoutMode,
      typographySettings.font_size_scale_key,
      visibleCategoryCount,
      visibleContentBlockCount,
      visibleImageSignature,
      visibleItemCount,
      visibleWidgetCount,
    ],
  );

  useEffect(() => {
    fitStateRef.current = fitState;
  }, [fitState, layoutMode]);

  useEffect(() => {
    const nextSignature = [
      layoutMode,
      fitState.status,
      fitState.columns,
      fitState.fontScale,
      fitState.gapScale,
      fitState.orderedBalancedFingerprint,
      fitState.orderedBalancedBreaks,
      orderedBalancedFinalFillBoost.fontScale,
      orderedBalancedFinalFillBoost.gapScale,
      orderedFitFinalFillCompensation,
    ].join("|");
    if (cafeALastDebugFitSignatureRef.current === nextSignature) return;
    cafeALastDebugFitSignatureRef.current = nextSignature;
    cafeADebugCountersRef.current.layoutEpoch += 1;
    cafeADebugCountersRef.current.stateUpdateCount += 1;
  }, [fitState, layoutMode, orderedBalancedFinalFillBoost, orderedFitFinalFillCompensation]);

  useLayoutEffect(() => {
    if (layoutMode !== "orderedBalancedFit") return;
    const boardElement = desktopFitBoardRef.current;
    const menuElement = desktopFitMenuRef.current;
    if (!boardElement || !menuElement) return;

    const syncInitialColumns = () => {
      const measuredWidth = menuElement.clientWidth || boardElement.clientWidth;
      const nextColumns = hasVisibleItemImages
        ? getImageMenuColumnCandidates(measuredWidth, visibleFitBlockCount)[0] ?? 2
        : isDenseOrderedBalanced
          ? 3
          : measuredWidth >= 1100
            ? 3
            : 2;
      setOrderedBalancedInitialColumns((currentColumns) => (currentColumns === nextColumns ? currentColumns : nextColumns));
    };

    syncInitialColumns();
    const resizeObserver = new ResizeObserver(() => {
      cafeADebugCountersRef.current.resizeObserverCallbackCount += 1;
      syncInitialColumns();
    });
    resizeObserver.observe(boardElement);
    resizeObserver.observe(menuElement);

    return () => {
      resizeObserver.disconnect();
    };
  }, [hasVisibleItemImages, isDenseOrderedBalanced, layoutMode, visibleFitBlockCount]);

  useLayoutEffect(() => {
    const menuElement = desktopFitMenuRef.current;
    if (!menuElement) return;
    if (layoutMode !== "orderedFit") return;

    let frameId = 0;
    let cancelled = false;

    const sync = () => {
      if (cancelled) return;
      syncOrderedFitColumnStartCategoryDividers(menuElement);
    };

    const scheduleSync = () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
      frameId = window.requestAnimationFrame(() => {
        sync();
        frameId = window.requestAnimationFrame(sync);
      });
    };

    scheduleSync();
    const resizeObserver = new ResizeObserver(scheduleSync);
    resizeObserver.observe(menuElement);
    if (desktopFitBoardRef.current) {
      resizeObserver.observe(desktopFitBoardRef.current);
    }

    return () => {
      cancelled = true;
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
      resizeObserver.disconnect();
    };
  }, [
    layoutMode,
    renderFitState.columns,
    renderFitState.fontScale,
    renderFitState.gapScale,
    orderedFitFinalFillCompensation,
    layoutInputSignature,
  ]);

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
        visibleFitBlockCount,
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
        visibleFitBlockCount,
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
      if (rejectedTwoColumns && visibleFitBlockCount >= 3 && !candidates.includes(3) && !isOrderedBalancedColumnRejected(orderedBalancedFingerprint, 3)) {
        return [3, ...candidates];
      }
      return candidates;
    }

    function getOrderedBalancedFitState(columnCandidates: number[]) {
      let selectedState: CafeDesignAFitState | null = null;
      let selectedScore = Number.POSITIVE_INFINITY;
      let fallbackState: CafeDesignAFitState | null = null;
      let fallbackScore = Number.POSITIVE_INFINITY;
      let emergencyState: CafeDesignAFitState | null = null;
      let emergencyScore = Number.POSITIVE_INFINITY;

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
      const clippingTargetHeight = Math.min(
        fitMenuElement.clientHeight,
        Math.max(0, getCafeAClippingBottom(fitBoardElement, fitMenuElement) - fitMenuElement.getBoundingClientRect().top),
      );
      const targetHeight = clippingTargetHeight && clippingTargetHeight > 0 ? clippingTargetHeight : fitMenuElement.clientHeight || undefined;
      const fitsWidth = fitMenuElement.scrollWidth <= fitMenuElement.clientWidth + 1;
      const fontScaleCandidates = getOrderedBalancedFitFontScaleCandidates(viewportWidth, menuWidth);

      for (const columns of effectiveColumnCandidates) {
        if (isOrderedBalancedColumnRejected(orderedBalancedFingerprint, columns)) continue;
        for (const fontScale of fontScaleCandidates) {
          const candidateGapScale = getOrderedBalancedFitGapScale(fontScale, fitMenuElement.clientWidth);
          const isCandidateRejected = (breakIndices: readonly number[]) =>
            orderedBalancedRejectedCandidateRef.current.has(
              getOrderedBalancedCandidateKeyFromParts({
                orderedBalancedFingerprint,
                columns,
                fontScale,
                gapScale: candidateGapScale,
                orderedBalancedBreaks: breakIndices.join(","),
              }),
            );

          applyFitCandidate(columns, fontScale);
          const blockMeasurements = getBalancedBlockMeasurements(fitMenuElement);
          const columnTargetHeights = getOrderedBalancedColumnTargetHeights(
            fitBoardElement,
            fitMenuElement,
            columns,
            targetHeight,
            ORDERED_BALANCED_CROP_TOLERANCE,
          );
          const simulatedColumnCandidates = getOrderedBalancedContiguousColumnCandidates(
            blockMeasurements,
            columns,
            targetHeight,
            isCandidateRejected,
            columnTargetHeights,
          );

          for (const simulatedColumns of simulatedColumnCandidates) {
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
            if (orderedBalancedRejectedCandidateRef.current.has(getOrderedBalancedCandidateKey(candidateState))) continue;
            if (!fitsWidth) continue;

            const blockOverflow = hasOrderedBalancedAtomicBlockOverflow(
              simulatedColumns,
              targetHeight ?? measurement.flowHeight,
              ORDERED_BALANCED_CROP_TOLERANCE,
              columnTargetHeights,
            );
            if (blockOverflow) continue;

            const nextFallbackScore = getOrderedBalancedFallbackScore(columns, fontScale, measurement, baseBlockMeasurements.length);
            if (measurement.overflow) {
              const nextEmergencyScore = nextFallbackScore + Math.max(0, -measurement.visibleContentBottomGap) * 1200 + 250000;
              if (
                !emergencyState ||
                isOrderedBalancedCandidateBetter({
                  candidateScore: nextEmergencyScore,
                  candidateState,
                  currentScore: emergencyScore,
                  currentState: emergencyState,
                })
              ) {
                emergencyScore = nextEmergencyScore;
                emergencyState = candidateState;
              }
              continue;
            }

            if (
              !fallbackState ||
              isOrderedBalancedCandidateBetter({
                candidateScore: nextFallbackScore,
                candidateState,
                currentScore: fallbackScore,
                currentState: fallbackState,
              })
            ) {
              fallbackScore = nextFallbackScore;
              fallbackState = candidateState;
            }

            if (fontScale < ORDERED_BALANCED_MIN_QUALITY_FONT_SCALE) continue;
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
      }

      const nextState = selectedState ?? fallbackState ?? emergencyState;
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
            : layoutMode === "orderedBalancedFit" && visibleWidgetCount > 0
              ? getOrderedBalancedWidgetFitColumnCandidates(menuWidth, visibleFitBlockCount, visibleItemCount)
              : hasVisibleItemImages
                ? getImageMenuColumnCandidates(menuWidth, visibleFitBlockCount)
                : layoutMode === "orderedBalancedFit"
                  ? getOrderedBalancedFitColumnCandidates(menuWidth, visibleFitBlockCount, visibleItemCount)
                  : getBalancedFitColumnCandidates(menuWidth, visibleFitBlockCount);
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
          const orderedBalancedFallbackFingerprint =
            layoutMode === "orderedBalancedFit" ? getOrderedBalancedFingerprint(orderedBalancedFallbackBlocks) : "";
          const orderedBalancedFallbackGapScale =
            layoutMode === "orderedBalancedFit" ? getOrderedBalancedFitGapScale(fallbackFontScale, fitMenuElement.clientWidth) : 1;
          const orderedBalancedFallbackTargetHeight =
            Math.min(fitMenuElement.clientHeight, Math.max(0, getCafeAClippingBottom(fitBoardElement, fitMenuElement) - fitMenuElement.getBoundingClientRect().top)) ||
            fitMenuElement.clientHeight ||
            undefined;
          const orderedBalancedFallbackColumnTargetHeights =
            layoutMode === "orderedBalancedFit"
              ? getOrderedBalancedColumnTargetHeights(
                  fitBoardElement,
                  fitMenuElement,
                  fallbackColumns,
                  orderedBalancedFallbackTargetHeight,
                  ORDERED_BALANCED_CROP_TOLERANCE,
                )
              : undefined;
          const isOrderedBalancedFallbackCandidateRejected =
            layoutMode === "orderedBalancedFit"
              ? (breakIndices: readonly number[]) =>
                  orderedBalancedRejectedCandidateRef.current.has(
                    getOrderedBalancedCandidateKeyFromParts({
                      orderedBalancedFingerprint: orderedBalancedFallbackFingerprint,
                      columns: fallbackColumns,
                      fontScale: fallbackFontScale,
                      gapScale: orderedBalancedFallbackGapScale,
                      orderedBalancedBreaks: breakIndices.join(","),
                    }),
                  )
              : undefined;
          const orderedBalancedFallbackColumns =
            layoutMode === "orderedBalancedFit"
              ? getOrderedBalancedContiguousColumns(
                  orderedBalancedFallbackBlocks,
                  fallbackColumns,
                  orderedBalancedFallbackTargetHeight,
                  isOrderedBalancedFallbackCandidateRejected,
                  orderedBalancedFallbackColumnTargetHeights,
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
            orderedBalancedFallbackFingerprint,
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

    const resizeObserver = new ResizeObserver(() => {
      cafeADebugCountersRef.current.resizeObserverCallbackCount += 1;
      scheduleMeasure();
    });
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
    visibleFitBlockCount,
    visibleWidgetCount,
    visiblePageGroups.length,
  ]);

  useEffect(() => {
    if (layoutMode !== "balanced" && layoutMode !== "orderedBalancedFit") return;
    const boardElement = desktopFitBoardRef.current;
    const menuElement = desktopFitMenuRef.current;
    if (!boardElement || !menuElement) return;
    const validationBoardElement = boardElement;
    const validationMenuElement = menuElement;
    if (layoutMode === "orderedBalancedFit" && fitState.status === "idle") return;
    let cancelled = false;
    function rejectOrderedBalancedCandidate(state: CafeDesignAFitState) {
      orderedBalancedRejectedCandidateRef.current.add(getOrderedBalancedCandidateKey(state));
    }

    function createOrderedBalancedValidationFitState({
      columns,
      fontScale,
      status,
      measurement,
      orderedBalancedBreaks,
      orderedBalancedFingerprint,
    }: {
      columns: number;
      fontScale: number;
      status: CafeDesignAFitState["status"];
      measurement: CafeDesignAFitMeasurement;
      orderedBalancedBreaks: string;
      orderedBalancedFingerprint: string;
    }): CafeDesignAFitState {
      return {
        columns,
        fontScale,
        gapScale: getOrderedBalancedFitGapScale(fontScale, validationMenuElement.clientWidth),
        balancedVariant: DEFAULT_BALANCED_VARIANT,
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

    function getOrderedBalancedWidgetSafeBreakState(baseState: CafeDesignAFitState) {
      const blocks = getBalancedBlockMeasurements(validationMenuElement);
      const widgetIndex = blocks.findIndex((block) => block.blockType === "widget");
      const breakCount = Math.max(0, Math.min(baseState.columns, blocks.length) - 1);

      if (widgetIndex <= 0 || breakCount <= 0) return null;

      const targetHeight =
        Math.min(
          validationMenuElement.clientHeight,
          Math.max(0, getCafeAClippingBottom(validationBoardElement, validationMenuElement) - validationMenuElement.getBoundingClientRect().top),
        ) || validationMenuElement.clientHeight;
      const columnTargetHeights = getOrderedBalancedColumnTargetHeights(
        validationBoardElement,
        validationMenuElement,
        baseState.columns,
        targetHeight,
        ORDERED_BALANCED_CROP_TOLERANCE,
      );
      const candidateBreakSets: number[][] = [];
      const selectedBreaks: number[] = [];

      function visit(nextBreakStart: number, remainingBreaks: number) {
        if (remainingBreaks === 0) {
          if (selectedBreaks.includes(widgetIndex)) candidateBreakSets.push([...selectedBreaks]);
          return;
        }

        const maxBreak = blocks.length - remainingBreaks;
        for (let breakIndex = nextBreakStart; breakIndex <= maxBreak; breakIndex += 1) {
          selectedBreaks.push(breakIndex);
          visit(breakIndex + 1, remainingBreaks - 1);
          selectedBreaks.pop();
        }
      }

      visit(1, breakCount);

      let bestState: CafeDesignAFitState | null = null;
      let bestScore = Number.POSITIVE_INFINITY;

      for (const breakIndices of candidateBreakSets) {
        const simulatedColumns = createOrderedBalancedColumnsFromBreakIndices(blocks, baseState.columns, breakIndices);
        if (hasOrderedBalancedAtomicBlockOverflow(simulatedColumns, targetHeight, ORDERED_BALANCED_CROP_TOLERANCE, columnTargetHeights)) continue;

        const orderedBalancedBreaks = getOrderedBalancedBreaksFromColumns(simulatedColumns);
        const measurement = getBalancedMeasurementFromColumns({
          boardElement: validationBoardElement,
          menuElement: validationMenuElement,
          columns: simulatedColumns,
          expectedColumns: baseState.columns,
          includeDomOverflow: false,
          cropTolerance: ORDERED_BALANCED_CROP_TOLERANCE,
          includeClippingBottom: true,
        });
        const candidateState = createOrderedBalancedValidationFitState({
          columns: baseState.columns,
          fontScale: baseState.fontScale,
          status: measurement.overflow || baseState.fontScale < ORDERED_BALANCED_MIN_QUALITY_FONT_SCALE ? "warning" : "fit",
          measurement,
          orderedBalancedBreaks,
          orderedBalancedFingerprint: baseState.orderedBalancedFingerprint,
        });

        if (orderedBalancedRejectedCandidateRef.current.has(getOrderedBalancedCandidateKey(candidateState))) continue;

        const score =
          (measurement.overflow ? 1_000_000 : 0) +
          Math.max(0, ORDERED_BALANCED_TARGET_MIN_VISIBLE_GAP - measurement.visibleContentBottomGap) * 4000 +
          Math.max(0, 0.58 - measurement.visibleMinFillRatio) * 1600 +
          Math.max(0, 0.62 - measurement.visibleLastColumnFillRatio) * 900 +
          Math.abs(0.78 - measurement.visibleAverageFillRatio) * 220;

        if (
          !bestState ||
          isOrderedBalancedCandidateBetter({
            candidateScore: score,
            candidateState,
            currentScore: bestScore,
            currentState: bestState,
          })
        ) {
          bestScore = score;
          bestState = candidateState;
        }
      }

      return bestState;
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
            const widgetSafeBreakState = getOrderedBalancedWidgetSafeBreakState(fitState);
            if (widgetSafeBreakState) {
              fitStateRef.current = widgetSafeBreakState;
              setFitState(widgetSafeBreakState);
              if (!widgetSafeBreakState.overflow && widgetSafeBreakState.orderedBalancedFingerprint) {
                orderedBalancedFitCacheRef.current.set(widgetSafeBreakState.orderedBalancedFingerprint, widgetSafeBreakState);
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
            const widgetSafeBreakState = getOrderedBalancedWidgetSafeBreakState(fitState);
            if (widgetSafeBreakState) {
              fitStateRef.current = widgetSafeBreakState;
              setFitState(widgetSafeBreakState);
              if (!widgetSafeBreakState.overflow && widgetSafeBreakState.orderedBalancedFingerprint) {
                orderedBalancedFitCacheRef.current.set(widgetSafeBreakState.orderedBalancedFingerprint, widgetSafeBreakState);
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
  }, [density, fitState, hasVisibleItemImages, layoutMode, orderedBalancedValidationRevision, visibleImageSignature, visibleItemCount, visibleFitBlockCount]);

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
        const previousFontScale = boardElement.style.getPropertyValue("--fit-font-scale");
        const previousGapScale = boardElement.style.getPropertyValue("--fit-gap-scale");
        const previousMenuFontScale = boardElement.style.getPropertyValue("--fit-menu-font-scale");
        const previousMenuGapScale = boardElement.style.getPropertyValue("--fit-menu-gap-scale");
        const restoreOrderedFitValidationStyles = () => {
          if (previousCompensation) {
            boardElement.style.setProperty("--ordered-fit-final-fill-compensation", previousCompensation);
          } else {
            boardElement.style.removeProperty("--ordered-fit-final-fill-compensation");
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
        };
        const getOrderedFitBackoffState = () => {
          for (const candidateFontScale of ORDERED_FIT_FONT_SCALE_CANDIDATES) {
            if (candidateFontScale >= fitState.fontScale - 0.001) continue;
            const candidateGapScale = getOrderedFitGapScale(candidateFontScale, menuElement.clientWidth);
            boardElement.style.setProperty("--fit-font-scale", String(candidateFontScale));
            boardElement.style.setProperty("--fit-gap-scale", String(candidateGapScale));
            boardElement.style.setProperty("--fit-menu-font-scale", String(candidateFontScale));
            boardElement.style.setProperty("--fit-menu-gap-scale", String(candidateGapScale));
            boardElement.style.setProperty("--ordered-fit-final-fill-compensation", String(DEFAULT_ORDERED_FIT_FINAL_FILL_COMPENSATION));

            const candidateActualMeasurement = getCafeAActualDomCropMeasurement(
              boardElement,
              menuElement,
              ORDERED_FIT_MIN_SAFETY_GAP,
              undefined,
              { footerNoGoLeafOnly: true },
            );
            const candidateOrderedMeasurement = measureCafeAOrderedFit(boardElement, menuElement, fitState.columns);
            const isSafe =
              !candidateActualMeasurement.overflow &&
              !candidateOrderedMeasurement.overflow &&
              !hasPageScroll() &&
              candidateActualMeasurement.bottomGap >= ORDERED_FIT_FINAL_FILL_MIN_GAP &&
              candidateOrderedMeasurement.visibleContentBottomGap >= ORDERED_FIT_MIN_SAFETY_GAP;

            if (!isSafe) continue;

            const actualBottomGap = roundFitMetric(candidateActualMeasurement.bottomGap);
            return {
              ...fitState,
              fontScale: candidateFontScale,
              gapScale: candidateGapScale,
              status: "fit" as const,
              measuredColumns: candidateOrderedMeasurement.measuredColumns,
              boardInnerHeight: candidateOrderedMeasurement.boardInnerHeight,
              flowHeight: candidateOrderedMeasurement.flowHeight,
              primaryColumnBottom: candidateOrderedMeasurement.primaryColumnBottom,
              primaryBottomGap: candidateOrderedMeasurement.primaryBottomGap,
              longestColumnBottom: candidateOrderedMeasurement.longestColumnBottom,
              primaryFillRatio: candidateOrderedMeasurement.primaryFillRatio,
              averageFillRatio: candidateOrderedMeasurement.averageFillRatio,
              minFillRatio: candidateOrderedMeasurement.minFillRatio,
              lastColumnFillRatio: candidateOrderedMeasurement.lastColumnFillRatio,
              bottomGap: Math.min(candidateOrderedMeasurement.bottomGap, actualBottomGap),
              contentGap: Math.min(candidateOrderedMeasurement.contentGap, actualBottomGap),
              itemBoxGap: Math.min(candidateOrderedMeasurement.itemBoxGap, actualBottomGap),
              textVisualGap: Math.min(candidateOrderedMeasurement.textVisualGap, actualBottomGap),
              categoryBlockGap: candidateOrderedMeasurement.categoryBlockGap,
              visibleItemBottomGap: Math.min(candidateOrderedMeasurement.visibleItemBottomGap, actualBottomGap),
              visibleTextBottomGap: Math.min(candidateOrderedMeasurement.visibleTextBottomGap, actualBottomGap),
              visiblePriceBottomGap: Math.min(candidateOrderedMeasurement.visiblePriceBottomGap, actualBottomGap),
              visibleContentBottomGap: Math.min(candidateOrderedMeasurement.visibleContentBottomGap, actualBottomGap),
              visibleAverageFillRatio: candidateOrderedMeasurement.visibleAverageFillRatio,
              visibleMinFillRatio: candidateOrderedMeasurement.visibleMinFillRatio,
              visibleLastColumnFillRatio: candidateOrderedMeasurement.visibleLastColumnFillRatio,
              boardInnerRight: candidateActualMeasurement.boardInnerRight,
              rightmostMenuNameRight: candidateActualMeasurement.rightmostMenuNameRight,
              rightmostSecondaryRight: candidateActualMeasurement.rightmostSecondaryRight,
              rightmostPriceRight: candidateActualMeasurement.rightmostPriceRight,
              rightmostChipRight: candidateActualMeasurement.rightmostChipRight,
              rightmostCategoryRight: candidateActualMeasurement.rightmostCategoryRight,
              rightSafetyGap: candidateActualMeasurement.rightSafetyGap,
              overflow: false,
            };
          }

          return null;
        };

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
          const backoffState = baseMeasurement.overflow || baseOrderedMeasurement.overflow || hasPageScroll()
            ? getOrderedFitBackoffState()
            : null;
          restoreOrderedFitValidationStyles();
          if (backoffState) {
            fitStateRef.current = backoffState;
            setFitState(backoffState);
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

        restoreOrderedFitValidationStyles();

        setOrderedFitFinalFillCompensation((currentCompensation) =>
          currentCompensation === selectedCompensation ? currentCompensation : selectedCompensation
        );
      });
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frameId);
    };
  }, [fitState, layoutMode, orderedFitFinalFillCompensation]);

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
            data-cafe-a-layout-input-signature={layoutInputSignature}
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
      <CafeADebugOverlay
        boardRef={desktopFitBoardRef}
        countersRef={cafeADebugCountersRef}
        data={data}
        density={density}
        fitState={fitState}
        layoutInputSignature={layoutInputSignature}
        layoutMode={layoutMode}
        orderedBalancedFinalFillBoost={orderedBalancedFinalFillBoost}
        orderedFitFinalFillCompensation={orderedFitFinalFillCompensation}
        typographySizeSetting={typographySettings.font_size_scale_key}
        visibleCategoryCount={visibleCategoryCount}
        visibleItemCount={visibleItemCount}
        visibleWidgetCount={visibleWidgetCount}
      />
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
