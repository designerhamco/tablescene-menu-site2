"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import KoreanFontAssets from "@/components/menu-templates/shared/KoreanFontAssets";
import MenuLanguageSwitcher from "@/components/menu-templates/shared/MenuLanguageSwitcher";
import {
  normalizeMenuPageDisplaySettings,
  type MenuPageDisplaySettings,
} from "@/lib/display-page-settings";
import { getMenuItemBadgeLabel } from "@/lib/menu-badges";
import { getBadgeStyleCss, getBadgeStyleForItem } from "@/lib/template-badge-styles";
import { getCustomTypographySettings, getEnglishFontLoadAssets, getFontSizeMultiplier, getKoreanFontLoadAssets, getTypographyCssVariables, mergeTypographySettings } from "@/lib/template-typography-presets";
import { sortMenuPages } from "@/types/menu";

import type { PublicMenuTemplateProps } from "./types";

type DisplayPage = PublicMenuTemplateProps["pages"][number];
type DisplayCategory = PublicMenuTemplateProps["categories"][number];
type DisplayItem = PublicMenuTemplateProps["items"][number];
type DisplayPriceOption = PublicMenuTemplateProps["priceOptions"][number];
type DisplayPriceRow = {
  label: string | null;
  price: string;
};
type DisplayOptionHeader = {
  label: string;
};
type DisplayCategoryBlock = {
  category: DisplayCategory;
  items: DisplayItem[];
  optionHeaders?: DisplayOptionHeader[];
};
type DisplayDensity = "spacious" | "default" | "compact" | "dense" | "ultraDense" | "fitAll" | "micro";
type DisplayColumnCount = 1 | 2;
type MenuLayoutPlan = {
  categoryColumns: DisplayColumnCount;
  rowUnits: number;
  rowCqh: number;
  layoutMode: string;
  isSparseFullMenu: boolean;
};
type DisplayRenderPage = {
  id: string;
  page: DisplayPage;
  categoryBlocks: DisplayCategoryBlock[] | null;
};
type DisplayDensityConfig = {
  categoryTitleStyle: CSSProperties;
  categoryHeadingStyle: CSSProperties;
  categoryRuleStyle: CSSProperties;
  categoryItemsStyle: CSSProperties;
  itemStyle: CSSProperties;
  itemGridStyle: CSSProperties;
  titleRowStyle: CSSProperties;
  menuTitleStyle: CSSProperties;
  badgeStyle: CSSProperties;
  metaStyle: CSSProperties;
  optionHeaderStyle: CSSProperties;
  priceStackStyle: CSSProperties;
  priceRowStyle: CSSProperties;
  priceLabelStyle: CSSProperties;
  priceStyle: CSSProperties;
  showMeta: boolean;
  showBadge: boolean;
  gridGapClassName: string;
  columnStackStyle: CSSProperties;
};
type DisplayFitState = {
  key: string;
  scale: number;
  phase: number;
  iteration: number;
  status: "initial" | "fitting" | "filling" | "settled" | "maxed";
};
type DisplayFitMeasurement = {
  hasOverflow: boolean;
  minBottomGap: number;
  maxBottomGap: number;
  maxContentRatio: number;
  minInnerHeight: number;
};

const DISPLAY_MAX_PRICE_OPTIONS = 3;
const DISPLAY_OPTION_GRID_GAP = "calc(var(--display-row) * 0.26)";
const DISPLAY_PUBLIC_PAGE_INTERVAL_MS = 8000;
const DISPLAY_FIT_MAX_ITERATIONS = 10;
const DISPLAY_FIT_MAX_PHASE = 4;
const DISPLAY_FIT_MIN_SCALE = 0.08;
const DISPLAY_SURFACE_COLOR = "#FFFFFF";
const DISPLAY_TEXT_COLOR = "#17211F";
const DISPLAY_MUTED_TEXT_COLOR = "#5F6F6B";
const DISPLAY_COOL_ACCENT_COLOR = "#007C89";
const DISPLAY_COOL_ACCENT_SOFT_COLOR = "#D7F4F3";
const DISPLAY_COOL_ACCENT_BORDER_COLOR = "#88DAD7";
const DISPLAY_KOREAN_TEXT_FONT_STYLE: CSSProperties = {
  fontFamily: "var(--menu-font-ko), var(--menu-font-en), system-ui, sans-serif",
};
const DISPLAY_ENGLISH_TEXT_FONT_STYLE: CSSProperties = {
  fontFamily: "var(--menu-font-en), var(--menu-font-ko), system-ui, sans-serif",
};
const HANGUL_TEXT_PATTERN = /([\u1100-\u11ff\u3130-\u318f\uac00-\ud7af]+)/g;
const HANGUL_CHAR_PATTERN = /[\u1100-\u11ff\u3130-\u318f\uac00-\ud7af]/;
const DISPLAY_FIT_INITIAL_STATE: DisplayFitState = {
  key: "",
  scale: 1,
  phase: 0,
  iteration: 0,
  status: "initial",
};

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getDisplayDensityFromRowCqh(rowCqh: number): DisplayDensity {
  if (rowCqh >= 6) return "spacious";
  if (rowCqh >= 4.4) return "default";
  if (rowCqh >= 3.2) return "compact";
  if (rowCqh >= 2.2) return "dense";
  if (rowCqh >= 1.45) return "ultraDense";
  if (rowCqh >= 0.85) return "fitAll";
  return "micro";
}

function getDisplayRowCqhFromUnits(rowUnits: number) {
  const baseRowCqh = 100 / Math.max(rowUnits, 1);
  const maxRowCqh = 8.75;

  if (baseRowCqh >= 12) return Math.min(baseRowCqh, maxRowCqh);
  if (baseRowCqh >= 5.6) return Math.min(baseRowCqh * 1.03, maxRowCqh);
  if (baseRowCqh >= 4.5) return Math.min(baseRowCqh * 1.1, maxRowCqh);
  if (baseRowCqh >= 4) return baseRowCqh * 1.18;
  if (baseRowCqh >= 3.2) return baseRowCqh * 1.21;
  if (baseRowCqh >= 2) return baseRowCqh * 1.35;
  if (baseRowCqh >= 1.15) return baseRowCqh * 1.55;
  if (baseRowCqh >= 0.85) return baseRowCqh * 1.75;
  return baseRowCqh;
}

function getRowBudgetConfig(rowCqh: number, fontSizeScale: number, fitPhase = 0): DisplayDensityConfig {
  const showMeta = fitPhase < 2;
  const showBadge = fitPhase < 4;
  const fontScale = Math.min(Math.max(fontSizeScale, 0.9), 1.2);
  const phaseGapScale = fitPhase >= 4 ? 0.72 : fitPhase >= 3 ? 0.84 : 1;
  const phaseMetaScale = fitPhase >= 1 ? 0.72 : 1;
  const phaseBadgeScale = fitPhase >= 3 ? 0.72 : 1;
  const gapScale = (0.96 + (fontScale - 1) * 0.45) * phaseGapScale;
  const spaciousFillScale = Math.min(Math.max((rowCqh - 3.2) / 2.8, 0), 1);
  const verticalFillScale = Math.min(Math.max((rowCqh - 5.2) / 2.4, 0), 1);
  const menuTitleScale = 0.354 + 0.06 * spaciousFillScale + 0.0185 * verticalFillScale;
  const categoryTitleScale = menuTitleScale * 1.21;
  const categoryHeadingGapScale = 0.28 + 0.05 * spaciousFillScale + 0.035 * verticalFillScale;
  const categoryRuleGapScale = 0.12 + 0.02 * spaciousFillScale + 0.01 * verticalFillScale;
  const itemGapScale = 0.255 + 0.105 * spaciousFillScale + 0.05 * verticalFillScale;
  const titleGapScale = 0.18 + 0.03 * spaciousFillScale + 0.012 * verticalFillScale;
  const titleRowGapScale = 0.06 + 0.02 * spaciousFillScale;
  const badgeFontScale = 0.205 + 0.022 * spaciousFillScale;
  const metaFontScale = 0.17 + 0.018 * spaciousFillScale + 0.006 * verticalFillScale;
  const optionHeaderScale = 0.235 + 0.04 * spaciousFillScale + 0.01 * verticalFillScale;
  const priceScale = 0.344 + 0.058 * spaciousFillScale + 0.0185 * verticalFillScale;
  const columnGapScale = 0.75 + 0.18 * spaciousFillScale + 0.095 * verticalFillScale;

  return {
    categoryTitleStyle: { fontSize: `calc(var(--display-row) * ${categoryTitleScale * fontScale})`, lineHeight: 1.05 },
    categoryHeadingStyle: { marginBottom: `calc(var(--display-row) * ${categoryHeadingGapScale * gapScale})` },
    categoryRuleStyle: rowCqh > 1.2 ? { marginTop: `calc(var(--display-row) * ${categoryRuleGapScale})`, borderBottomWidth: "2px" } : { display: "none" },
    categoryItemsStyle: { rowGap: `calc(var(--display-row) * ${itemGapScale * gapScale})` },
    itemStyle: {
      paddingTop: 0,
      paddingBottom: 0,
    },
    itemGridStyle: { columnGap: "calc(var(--display-row) * 0.4)" },
    titleRowStyle: { columnGap: `calc(var(--display-row) * ${titleGapScale * gapScale})`, rowGap: `calc(var(--display-row) * ${titleRowGapScale * gapScale})` },
    menuTitleStyle: { fontSize: `calc(var(--display-row) * ${menuTitleScale * fontScale})`, lineHeight: 1.14 },
    badgeStyle: showBadge
      ? { fontSize: `calc(var(--display-row) * ${badgeFontScale * fontScale * phaseBadgeScale})`, padding: `calc(var(--display-row) * ${0.07 * gapScale * phaseBadgeScale}) calc(var(--display-row) * ${0.155 * gapScale * phaseBadgeScale})`, borderRadius: "3px" }
      : { display: "none" },
    metaStyle: showMeta ? { fontSize: `calc(var(--display-row) * ${metaFontScale * fontScale * phaseMetaScale})`, lineHeight: 1.2 } : { display: "none" },
    optionHeaderStyle: { fontSize: `calc(var(--display-row) * ${optionHeaderScale * fontScale})`, lineHeight: 1.05 },
    priceStackStyle: { rowGap: `calc(var(--display-row) * ${0.035 * gapScale})` },
    priceRowStyle: { columnGap: `calc(var(--display-row) * ${0.14 * gapScale})` },
    priceLabelStyle: { fontSize: `calc(var(--display-row) * ${0.16 * fontScale})`, lineHeight: 1.05 },
    priceStyle: { fontSize: `calc(var(--display-row) * ${priceScale * fontScale})`, lineHeight: 1 },
    showMeta,
    showBadge,
    gridGapClassName: "",
    columnStackStyle: { rowGap: `calc(var(--display-row) * ${columnGapScale * gapScale})` },
  };
}


function sortByOrder<T extends { sort_order: number }>(rows: T[]) {
  return [...rows].sort((left, right) => left.sort_order - right.sort_order);
}

function normalizeDisplayText(value: string | null | undefined) {
  return value?.trim() || null;
}

function renderDisplayTypographyText(text: string) {
  const parts = text.split(HANGUL_TEXT_PATTERN).filter(Boolean);

  return parts.map((part, index) => (
    <span
      key={`${part}-${index}`}
      style={HANGUL_CHAR_PATTERN.test(part) ? DISPLAY_KOREAN_TEXT_FONT_STYLE : DISPLAY_ENGLISH_TEXT_FONT_STYLE}
    >
      {part}
    </span>
  ));
}

function formatDisplayMenuAKrwPrice(price: number) {
  return (price / 1000).toFixed(1);
}

function parseDisplayMenuAPriceLabel(priceLabel: string) {
  const trimmedLabel = priceLabel.trim();
  if (!trimmedLabel) return "";

  const numericText = trimmedLabel.replace(/[,\s₩원]/g, "");
  if (!/^\d+(\.\d+)?$/.test(numericText)) return trimmedLabel;

  const numericValue = Number(numericText);
  if (!Number.isFinite(numericValue)) return trimmedLabel;

  return numericValue >= 100 ? formatDisplayMenuAKrwPrice(numericValue) : numericValue.toFixed(1);
}

function formatDisplayMenuAPrice(price: number | null | undefined, priceLabel?: string | null) {
  if (typeof price === "number" && Number.isFinite(price)) return formatDisplayMenuAKrwPrice(price);
  if (priceLabel) return parseDisplayMenuAPriceLabel(priceLabel);
  return "";
}

function getPriceOptionRow(option: DisplayPriceOption): DisplayPriceRow | null {
  const label = normalizeDisplayText(option.label);
  const price = formatDisplayMenuAPrice(option.price, option.price_label);

  if (!label && !price) return null;
  if (!price && label) return { label: null, price: label };

  return {
    label,
    price,
  };
}

function getItemPriceRows(item: DisplayItem, priceOptions: DisplayPriceOption[]): DisplayPriceRow[] {
  if (item.price_visible === false) return [];

  const options = sortByOrder(priceOptions.filter((option) => option.menu_item_id === item.id && option.visible)).slice(0, DISPLAY_MAX_PRICE_OPTIONS);
  if (options.length > 0) return options.map(getPriceOptionRow).filter((row): row is DisplayPriceRow => Boolean(row));

  const price = formatDisplayMenuAPrice(item.price, item.price_label);
  if (!price) return [];

  return [
    {
      label: null,
      price,
    },
  ];
}

function getCategoryOptionHeaders(items: DisplayItem[], priceOptions: DisplayPriceOption[]): DisplayOptionHeader[] {
  const itemIds = new Set(items.map((item) => item.id));
  const options = sortByOrder(priceOptions.filter((option) => itemIds.has(option.menu_item_id) && option.visible));
  const labels = new Map<string, { label: string; count: number; firstSortOrder: number }>();

  for (const option of options) {
    const label = normalizeDisplayText(option.label);
    if (!label) continue;

    const current = labels.get(label);
    if (current) {
      current.count += 1;
      current.firstSortOrder = Math.min(current.firstSortOrder, option.sort_order);
    } else {
      labels.set(label, { label, count: 1, firstSortOrder: option.sort_order });
    }
  }

  if (labels.size === 0) return [];

  return Array.from(labels.values())
    .sort((left, right) => left.firstSortOrder - right.firstSortOrder || right.count - left.count)
    .slice(0, DISPLAY_MAX_PRICE_OPTIONS)
    .map((option) => ({ label: option.label }));
}

function getOptionGridStyle(optionHeaders: DisplayOptionHeader[]): CSSProperties {
  const optionCount = Math.max(optionHeaders.length, 1);

  return {
    "--display-option-col-width": "clamp(48px, calc(var(--display-row) * 1.18), 104px)",
    "--display-option-grid-gap": DISPLAY_OPTION_GRID_GAP,
    gridTemplateColumns: `repeat(${optionCount}, var(--display-option-col-width))`,
    columnGap: "var(--display-option-grid-gap)",
    justifyContent: "end",
  } as CSSProperties;
}

function getItemPriceByOptionLabel(item: DisplayItem, priceOptions: DisplayPriceOption[]) {
  const options = sortByOrder(priceOptions.filter((option) => option.menu_item_id === item.id && option.visible)).slice(0, DISPLAY_MAX_PRICE_OPTIONS);

  return options.reduce<Map<string, string>>((prices, option) => {
    const row = getPriceOptionRow(option);
    if (row?.label && row.price) prices.set(row.label, row.price);
    return prices;
  }, new Map());
}

function getYouTubeEmbedUrl(url: string) {
  try {
    const parsed = new URL(url);
    const videoId = parsed.hostname.includes("youtu.be")
      ? parsed.pathname.replace("/", "")
      : parsed.hostname.includes("youtube.com")
        ? parsed.searchParams.get("v")
        : null;

    return videoId ? `https://www.youtube.com/embed/${videoId}?mute=1&playsinline=1&loop=1&playlist=${videoId}` : null;
  } catch {
    return null;
  }
}

function isDirectVideoUrl(url: string) {
  return /\.(mp4|webm|ogg)(\?.*)?$/i.test(url);
}

function getCategoryRowUnits({
  group,
  priceOptions,
  categoryGapWeight,
  fontSizeScale,
}: {
  group: DisplayCategoryBlock;
  priceOptions: DisplayPriceOption[];
  categoryGapWeight: number;
  fontSizeScale: number;
}) {
  const fontWeightScale = 1 + (Math.min(Math.max(fontSizeScale, 0.88), 1.16) - 1) * 0.45;
  const categoryHeaderWeight = 0.86 * fontWeightScale;
  const itemRowWeight = 0.82 * fontWeightScale;
  const itemGapWeight = 0.14;
  const itemRows = group.items.length;
  const longCategoryWeight = Math.max(0, itemRows - 8) * 0.18;
  const optionHeaders = group.optionHeaders ?? getCategoryOptionHeaders(group.items, priceOptions);
  const optionExtraRows = group.items.reduce((itemSum, item) => {
    const priceRowCount = getItemPriceRows(item, priceOptions).length;
    const optionWeight = optionHeaders.length > 0 ? 0 : Math.max(0, priceRowCount - 1) * 0.12;
    const metaWeight = item.set_name ? 0.06 : 0;

    return itemSum + optionWeight + metaWeight;
  }, 0);

  return categoryHeaderWeight + itemRows * itemRowWeight + optionExtraRows + Math.max(0, itemRows - 1) * itemGapWeight + longCategoryWeight + categoryGapWeight;
}

function getMaxCategoryItemCount(categoryBlocks: DisplayCategoryBlock[]) {
  return Math.max(0, ...categoryBlocks.map((group) => group.items.length));
}

function getCategoryBlocksForPage(page: DisplayPage, categories: DisplayCategory[], items: DisplayItem[], priceOptions: DisplayPriceOption[]) {
  return sortByOrder(categories.filter((category) => category.menu_page_id === page.id && category.visible))
    .map((category) => {
      const categoryItems = sortByOrder(items.filter((item) => item.category_id === category.id && item.visible));

      return {
        category,
        items: categoryItems,
        optionHeaders: getCategoryOptionHeaders(categoryItems, priceOptions),
      };
    })
    .filter((group) => group.items.length > 0);
}

function getRenderedItemCount(categoryBlocks: DisplayCategoryBlock[]) {
  return categoryBlocks.reduce((sum, group) => sum + group.items.length, 0);
}

function getVisiblePriceOptionCount(categoryBlocks: DisplayCategoryBlock[], priceOptions: DisplayPriceOption[]) {
  return priceOptions.filter((option) => option.visible && categoryBlocks.some((group) => group.items.some((item) => item.id === option.menu_item_id))).length;
}

function distributeCategoryBlocks({
  categoryBlocks,
  priceOptions,
  categoryGapWeight,
  fontSizeScale,
}: {
  categoryBlocks: DisplayCategoryBlock[];
  priceOptions: DisplayPriceOption[];
  categoryGapWeight: number;
  fontSizeScale: number;
}) {
  if (categoryBlocks.length <= 1) return [categoryBlocks, []];

  const weightedBlocks = categoryBlocks.map((group, index) => ({
    group,
    index,
    itemCount: group.items.length,
    weight: getCategoryRowUnits({ group, priceOptions, categoryGapWeight, fontSizeScale }),
  }));
  const maxMask = 1 << weightedBlocks.length;
  let bestColumns: [DisplayCategoryBlock[], DisplayCategoryBlock[]] = [categoryBlocks, []];
  let bestScore = Number.POSITIVE_INFINITY;

  for (let mask = 1; mask < maxMask - 1; mask += 1) {
    const left = weightedBlocks.filter((block) => (mask & (1 << block.index)) !== 0);
    const right = weightedBlocks.filter((block) => (mask & (1 << block.index)) === 0);
    const leftWeight = left.reduce((sum, block) => sum + block.weight, 0);
    const rightWeight = right.reduce((sum, block) => sum + block.weight, 0);
    const leftItems = left.reduce((sum, block) => sum + block.itemCount, 0);
    const rightItems = right.reduce((sum, block) => sum + block.itemCount, 0);
    const score =
      Math.max(leftWeight, rightWeight) * 10 +
      Math.abs(leftWeight - rightWeight) * 1.35 +
      Math.abs(leftItems - rightItems) * 0.28 +
      Math.abs(left.length - right.length) * 0.12;

    if (score < bestScore) {
      bestScore = score;
      bestColumns = [
        left.sort((a, b) => a.index - b.index).map((block) => block.group),
        right.sort((a, b) => a.index - b.index).map((block) => block.group),
      ];
    }
  }

  return bestColumns;
}

function getMenuRowUnits({
  columns,
  categoryColumns,
  categoryBlocks,
  priceOptions,
  fontSizeScale,
}: {
  columns: "auto" | "single";
  categoryColumns: DisplayColumnCount;
  categoryBlocks: DisplayCategoryBlock[];
  priceOptions: DisplayPriceOption[];
  fontSizeScale: number;
}) {
  const categoryGapWeight = columns === "single" ? 0.16 : 0.12;

  if (columns === "auto" && categoryColumns === 2 && categoryBlocks.length > 1) {
    const columnUnits = distributeCategoryBlocks({ categoryBlocks, priceOptions, categoryGapWeight, fontSizeScale }).map((column) =>
      column.reduce((sum, group) => sum + getCategoryRowUnits({ group, priceOptions, categoryGapWeight, fontSizeScale }), 0)
    );
    return Math.max(...columnUnits, 1);
  }

  return categoryBlocks.reduce(
    (sum, group) => sum + getCategoryRowUnits({ group, priceOptions, categoryGapWeight, fontSizeScale }),
    0
  );
}

function getLayoutModeName(categoryColumns: DisplayColumnCount) {
  return categoryColumns === 2 ? "pageCategoryGrid" : "singleCategoryFlow";
}

function isSparseFullMenuData(visibleCategoryCount: number, renderedItemCount: number) {
  return visibleCategoryCount === 1 && renderedItemCount <= 8;
}

function getMenuLayoutCandidates({
  columns,
  categoryBlocks,
  priceOptions,
  visibleCategoryCount,
  renderedItemCount,
  fontSizeScale,
}: {
  columns: "auto" | "single";
  categoryBlocks: DisplayCategoryBlock[];
  priceOptions: DisplayPriceOption[];
  visibleCategoryCount: number;
  renderedItemCount: number;
  fontSizeScale: number;
}) {
  const sparseFullMenu = columns === "auto" && isSparseFullMenuData(visibleCategoryCount, renderedItemCount);
  const categoryColumnCandidates: DisplayColumnCount[] = columns === "single" || sparseFullMenu ? [1] : [2];

  return categoryColumnCandidates.map((categoryColumns) => {
    const rowUnits = getMenuRowUnits({ columns, categoryColumns, categoryBlocks, priceOptions, fontSizeScale });
    const baseRowCqh = getDisplayRowCqhFromUnits(rowUnits);
    const maxCategoryItemCount = getMaxCategoryItemCount(categoryBlocks);
    const longCategoryFillBoost = columns === "single" && renderedItemCount <= 28 && maxCategoryItemCount >= 13
      ? 1.13
      : 1;
    const rowCqh = Math.min(baseRowCqh * longCategoryFillBoost, 8.75);
    const isSparseFullMenu = Boolean(sparseFullMenu && categoryColumns === 1);

    return {
      categoryColumns,
      rowUnits,
      rowCqh,
      layoutMode: isSparseFullMenu ? "sparseFullMenu" : getLayoutModeName(categoryColumns),
      isSparseFullMenu,
    };
  });
}

function getMenuLayoutScore({
  candidate,
  categoryCount,
  itemCount,
  priceOptionCount,
  columns,
}: {
  candidate: MenuLayoutPlan;
  categoryCount: number;
  itemCount: number;
  priceOptionCount: number;
  columns: "auto" | "single";
}) {
  const sparse = itemCount <= 10 && categoryCount <= 3 && priceOptionCount <= 2;
  const dense = itemCount >= (columns === "single" ? 14 : 16) || categoryCount >= (columns === "single" ? 4 : 5) || priceOptionCount >= 5;
  const targetRowCqh = columns === "single" ? 3.6 : dense ? 4.8 : 5.2;
  const rowFitPenalty = Math.abs(candidate.rowCqh - targetRowCqh);
  const tinyTextPenalty = candidate.rowCqh < 1.2 ? (1.2 - candidate.rowCqh) * 8 : candidate.rowCqh < 2.1 ? (2.1 - candidate.rowCqh) * 2.5 : 0;
  const emptySpacePenalty = candidate.rowCqh > 7 ? (candidate.rowCqh - 7) * 0.7 : 0;
  const categoryColumnPenalty = candidate.categoryColumns === 2
    ? sparse ? 4 : 0.55
    : columns === "auto" && dense && candidate.rowCqh < 3.4
      ? 1.45
      : 0;
  const denseCategoryGridReward = dense && candidate.categoryColumns === 2 && candidate.rowCqh >= 2.2 ? -0.55 : 0;
  const readableSizeReward = dense && candidate.rowCqh >= 3.2 && candidate.rowCqh <= 5.2 ? -0.35 : 0;

  return rowFitPenalty + tinyTextPenalty + emptySpacePenalty + categoryColumnPenalty + denseCategoryGridReward + readableSizeReward;
}

function selectMenuLayoutPlan({
  columns,
  categoryBlocks,
  priceOptions,
  visibleCategoryCount,
  renderedItemCount,
  priceOptionCount,
  fontSizeScale,
}: {
  columns: "auto" | "single";
  categoryBlocks: DisplayCategoryBlock[];
  priceOptions: DisplayPriceOption[];
  visibleCategoryCount: number;
  renderedItemCount: number;
  priceOptionCount: number;
  fontSizeScale: number;
}) {
  const candidates = getMenuLayoutCandidates({ columns, categoryBlocks, priceOptions, visibleCategoryCount, renderedItemCount, fontSizeScale });

  return candidates.reduce((best, candidate) => {
    const bestScore = getMenuLayoutScore({
      candidate: best,
      categoryCount: categoryBlocks.length,
      itemCount: renderedItemCount,
      priceOptionCount,
      columns,
    });
    const candidateScore = getMenuLayoutScore({
      candidate,
      categoryCount: categoryBlocks.length,
      itemCount: renderedItemCount,
      priceOptionCount,
      columns,
    });

    return candidateScore < bestScore ? candidate : best;
  }, candidates[0]);
}

function getDisplayFitTargetGap(renderedItemCount: number, innerHeight: number) {
  if (renderedItemCount <= 2) return innerHeight * 0.22;
  if (renderedItemCount <= 6) return innerHeight * 0.1;
  if (renderedItemCount <= 12) return clampNumber(innerHeight * 0.016, 8, 16);
  return clampNumber(innerHeight * 0.014, 6, 14);
}

function measureDisplayFit(root: HTMLDivElement | null): DisplayFitMeasurement | null {
  if (!root) return null;

  const columns = Array.from(root.querySelectorAll<HTMLElement>("[data-display-menu-column]"));
  if (columns.length === 0) return null;

  const measurements = columns.map((column) => {
    const viewport = column.querySelector<HTMLElement>("[data-display-menu-column-content]");
    const inner = column.querySelector<HTMLElement>("[data-display-menu-column-content-inner]");
    const items = Array.from(column.querySelectorAll<HTMLElement>("[data-display-menu-item]"));
    const categories = Array.from(column.querySelectorAll<HTMLElement>("[data-display-category-block]"));
    const lastMeasuredElement = items.at(-1) ?? categories.at(-1) ?? inner;

    if (!viewport || !inner || !lastMeasuredElement) return null;

    const viewportRect = viewport.getBoundingClientRect();
    const innerRect = inner.getBoundingClientRect();
    const lastRect = lastMeasuredElement.getBoundingClientRect();
    const innerHeight = Math.max(viewport.clientHeight, viewportRect.height, 1);
    const contentHeight = Math.max(inner.scrollHeight, innerRect.height, lastRect.bottom - innerRect.top, 1);
    const bottomGap = viewportRect.bottom - lastRect.bottom;
    const hasOverflow = contentHeight > innerHeight + 1 || bottomGap < -1;

    if (!viewport.dataset.displayFitInitialClientHeight) {
      viewport.dataset.displayFitInitialClientHeight = String(Math.round(innerHeight));
      viewport.dataset.displayFitInitialScrollHeight = String(Math.round(contentHeight));
      viewport.dataset.displayFitInitialBottomGap = String(Math.round(bottomGap));
      viewport.dataset.displayFitInitialOverflow = hasOverflow ? "true" : "false";
    }

    viewport.dataset.displayFitClientHeight = String(Math.round(innerHeight));
    viewport.dataset.displayFitScrollHeight = String(Math.round(contentHeight));
    viewport.dataset.displayFitBottomGap = String(Math.round(bottomGap));
    viewport.dataset.displayFitOverflow = hasOverflow ? "true" : "false";

    return {
      innerHeight,
      contentHeight,
      bottomGap,
      hasOverflow,
      contentRatio: contentHeight / innerHeight,
    };
  }).filter((measurement): measurement is NonNullable<typeof measurement> => Boolean(measurement));

  if (measurements.length === 0) return null;

  return {
    hasOverflow: measurements.some((measurement) => measurement.hasOverflow),
    minBottomGap: Math.min(...measurements.map((measurement) => measurement.bottomGap)),
    maxBottomGap: Math.max(...measurements.map((measurement) => measurement.bottomGap)),
    maxContentRatio: Math.max(...measurements.map((measurement) => measurement.contentRatio)),
    minInnerHeight: Math.min(...measurements.map((measurement) => measurement.innerHeight)),
  };
}

function getNextDisplayFitState({
  current,
  measurement,
  renderedItemCount,
}: {
  current: DisplayFitState;
  measurement: DisplayFitMeasurement;
  renderedItemCount: number;
}): DisplayFitState | null {
  if (current.iteration >= DISPLAY_FIT_MAX_ITERATIONS) {
    if (!measurement.hasOverflow && measurement.minBottomGap >= -1) {
      return current.status === "settled" ? null : { ...current, status: "settled" };
    }

    return current.status === "maxed" ? null : { ...current, status: "maxed" };
  }

  if (measurement.hasOverflow || measurement.minBottomGap < 0) {
    if (current.scale <= 0.24 && current.phase < DISPLAY_FIT_MAX_PHASE) {
      return {
        key: current.key,
        scale: current.scale,
        phase: current.phase + 1,
        iteration: current.iteration + 1,
        status: "fitting",
      };
    }

    const shrinkFactor = clampNumber((1 / Math.max(measurement.maxContentRatio, 1.01)) * 0.985, 0.62, 0.96);

    return {
      key: current.key,
      scale: clampNumber(current.scale * shrinkFactor, DISPLAY_FIT_MIN_SCALE, 1.85),
      phase: current.phase,
      iteration: current.iteration + 1,
      status: "fitting",
    };
  }

  const targetGap = getDisplayFitTargetGap(renderedItemCount, measurement.minInnerHeight);
  const isVerySparse = renderedItemCount <= 2;
  const safetyGap = clampNumber(measurement.minInnerHeight * 0.006, 4, 8);
  const fillReferenceGap = measurement.minBottomGap > targetGap
    ? measurement.minBottomGap
    : measurement.minBottomGap > safetyGap
      ? measurement.maxBottomGap
      : measurement.minBottomGap;
  const fillRoom = (fillReferenceGap - targetGap) / Math.max(measurement.minInnerHeight, 1);
  const maxFillScale = renderedItemCount <= 6 ? 1.55 : renderedItemCount <= 12 ? 1.36 : renderedItemCount <= 24 ? 1.3 : 1.85;

  if (!isVerySparse && fillRoom > 0.012 && current.scale < maxFillScale) {
    const growFactor = 1 + clampNumber(fillRoom * 0.38, 0.01, 0.055);

    return {
      key: current.key,
      scale: Math.min(current.scale * growFactor, maxFillScale),
      phase: current.phase,
      iteration: current.iteration + 1,
      status: "filling",
    };
  }

  return current.status === "settled" ? null : { ...current, status: "settled" };
}

function buildDisplayRenderPages({
  pages,
  categories,
  items,
  priceOptions,
}: {
  pages: DisplayPage[];
  categories: DisplayCategory[];
  items: DisplayItem[];
  priceOptions: DisplayPriceOption[];
}): DisplayRenderPage[] {
  return pages.map<DisplayRenderPage>((page) => {
    const settings = normalizeMenuPageDisplaySettings(page.display_settings);

    if (settings.pageType !== "menu") {
      return {
        id: page.id,
        page,
        categoryBlocks: null,
      };
    }

    const categoryBlocks = getCategoryBlocksForPage(page, categories, items, priceOptions);

    return {
      id: page.id,
      page,
      categoryBlocks,
    };
  });
}

function EmptyDisplayPage() {
  return (
    <div
      className="h-full border border-[#DDE8E7] bg-white"
      aria-hidden="true"
    />
  );
}

function MenuItemRow({
  item,
  priceOptions,
  densityConfig,
  optionHeaders,
}: {
  item: DisplayItem;
  priceOptions: DisplayPriceOption[];
  densityConfig: DisplayDensityConfig;
  optionHeaders: DisplayOptionHeader[];
}) {
  const badge = getMenuItemBadgeLabel(item);
  const itemName = normalizeDisplayText(item.name) || "";
  const priceRows = getItemPriceRows(item, priceOptions);
  const badgeStyle = badge ? getBadgeStyleForItem(item, "display_menu_a") : null;
  const optionPriceByLabel = optionHeaders.length > 0 ? getItemPriceByOptionLabel(item, priceOptions) : null;
  const optionGridStyle = optionHeaders.length > 0 ? getOptionGridStyle(optionHeaders) : null;

  return (
    <article className="cafe-a-menu-item min-w-0 px-0" style={densityConfig.itemStyle} data-display-menu-item="">
      <div
        className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start overflow-visible"
        style={densityConfig.itemGridStyle}
      >
        <div className="min-w-0">
          <div className="cafe-a-menu-title-row flex min-w-0 flex-wrap items-center" style={densityConfig.titleRowStyle}>
            <span className="cafe-a-menu-title-badge inline-flex max-w-full shrink-0 items-center" style={{ columnGap: densityConfig.titleRowStyle.columnGap }}>
              <h4
                className="cafe-a-menu-title min-w-0 break-keep font-bold tracking-normal text-[var(--display-text-color)]"
                style={densityConfig.menuTitleStyle}
              >
                {renderDisplayTypographyText(itemName)}
              </h4>
              {densityConfig.showBadge && badge && (
                <span
                  className="menu-badge cafe-a-menu-badge inline-flex shrink-0 rounded-[2px] font-black uppercase leading-none tracking-normal"
                  style={{
                    ...densityConfig.badgeStyle,
                    ...(badgeStyle ? getBadgeStyleCss(badgeStyle) : {}),
                  }}
                >
                  {badge}
                </span>
              )}
            </span>
            {densityConfig.showMeta && item.set_name && (
              <span className="menu-font-en cafe-a-menu-meta min-w-0 max-w-[52%] break-words font-semibold uppercase tracking-normal text-[var(--display-muted-text-color)]" style={densityConfig.metaStyle}>
                {item.set_name}
              </span>
            )}
          </div>
        </div>
        {optionHeaders.length > 0 && optionGridStyle ? (
          <div className="menu-price cafe-a-price-options-grid grid shrink-0 justify-items-center text-center text-[var(--display-text-color)]" style={optionGridStyle}>
            {optionPriceByLabel && optionPriceByLabel.size > 0 ? (
              optionHeaders.map((header) => (
                <span key={header.label} className="cafe-a-menu-price block w-full whitespace-nowrap text-center font-bold leading-none text-[var(--display-text-color)]" style={densityConfig.priceStyle}>
                  {optionPriceByLabel.get(header.label) ?? "-"}
                </span>
              ))
            ) : priceRows[0]?.price ? (
              <span className="cafe-a-menu-price block w-full whitespace-nowrap text-center font-bold leading-none text-[var(--display-text-color)]" style={{ ...densityConfig.priceStyle, gridColumn: "1 / -1" }}>
                {priceRows[0].price}
              </span>
            ) : null}
          </div>
        ) : priceRows.length > 0 ? (
          <div className="menu-price cafe-a-price-stack grid shrink-0 justify-items-end text-right text-[var(--display-text-color)]" style={densityConfig.priceStackStyle}>
            {priceRows.map((row, index) => (
              <div key={`${row.label ?? "price"}-${row.price}-${index}`} className="cafe-a-price-row grid grid-cols-[auto_auto] items-baseline" style={densityConfig.priceRowStyle}>
                {row.label ? (
                  <span className="cafe-a-price-label whitespace-nowrap font-bold uppercase leading-none tracking-normal text-[var(--display-text-color)]" style={densityConfig.priceLabelStyle}>
                    {row.label}
                  </span>
                ) : null}
                <span className="cafe-a-menu-price whitespace-nowrap font-bold leading-none text-[var(--display-text-color)]" style={densityConfig.priceStyle}>
                  {row.price}
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function CategoryBlock({
  category,
  items,
  optionHeaders: providedOptionHeaders,
  priceOptions,
  densityConfig,
}: {
  category: DisplayCategory;
  items: DisplayItem[];
  optionHeaders?: DisplayOptionHeader[];
  priceOptions: DisplayPriceOption[];
  densityConfig: DisplayDensityConfig;
}) {
  const optionHeaders = providedOptionHeaders ?? getCategoryOptionHeaders(items, priceOptions);
  const optionGridStyle = optionHeaders.length > 0 ? getOptionGridStyle(optionHeaders) : null;
  const categoryName = normalizeDisplayText(category.name) || "";

  return (
    <section className="min-w-0" data-display-category-section="" data-display-category-block="">
      <div className="cafe-a-category-heading" style={densityConfig.categoryHeadingStyle}>
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-end" style={densityConfig.itemGridStyle}>
          <h3
            className="cafe-a-category-title break-keep font-black uppercase leading-tight tracking-normal text-[var(--display-accent-color)]"
            style={densityConfig.categoryTitleStyle}
          >
            {renderDisplayTypographyText(categoryName)}
          </h3>
          {optionHeaders.length > 0 && optionGridStyle ? (
            <div className="menu-font-en cafe-a-option-header-grid grid shrink-0 justify-items-center text-center" style={optionGridStyle}>
              {optionHeaders.map((header) => (
                <span key={header.label} className="block w-full whitespace-nowrap text-center font-black uppercase tracking-normal text-[var(--display-accent-color)]" style={densityConfig.optionHeaderStyle}>
                  {header.label}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <div className="cafe-a-category-rule border-b border-[var(--display-accent-border-color)]" style={densityConfig.categoryRuleStyle} />
      </div>
      <div
        className="cafe-a-category-items grid grid-cols-1"
        style={densityConfig.categoryItemsStyle}
        data-display-category-item-grid="1"
      >
        {items.map((item) => (
          <MenuItemRow key={item.id} item={item} priceOptions={priceOptions} densityConfig={densityConfig} optionHeaders={optionHeaders} />
        ))}
      </div>
    </section>
  );
}

function DisplayMenuColumn({
  groups,
  priceOptions,
  densityConfig,
  rowCqh,
}: {
  groups: DisplayCategoryBlock[];
  priceOptions: DisplayPriceOption[];
  densityConfig: DisplayDensityConfig;
  rowCqh: number;
}) {
  return (
    <div
      className="h-full min-h-0 overflow-hidden bg-[var(--display-surface-color)] px-[var(--display-column-padding-x)] py-[var(--display-column-padding-y)]"
      style={{
        "--display-column-padding-x": "clamp(33px, 3.45vw, 62px)",
        "--display-column-padding-y": "clamp(24px, 2.5vw, 46px)",
        containerType: "size",
      } as CSSProperties}
      data-display-menu-column=""
      data-display-column-padding="preserved"
    >
      <div
        className="h-full min-h-0 overflow-hidden"
        style={{
          "--display-row": `${rowCqh}cqh`,
        } as CSSProperties}
        data-display-menu-column-content=""
      >
        <div
          className="grid min-h-0 content-start"
          style={densityConfig.columnStackStyle}
          data-display-menu-column-content-inner=""
        >
          {groups.map((group) => (
            <CategoryBlock
              key={group.category.id}
              category={group.category}
              items={group.items}
              optionHeaders={group.optionHeaders}
              priceOptions={priceOptions}
              densityConfig={densityConfig}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function MenuList({
  page,
  categories,
  items,
  priceOptions,
  categoryBlocks: providedCategoryBlocks,
  columns = "auto",
  fontSizeScale,
}: {
  page: DisplayPage;
  categories: DisplayCategory[];
  items: DisplayItem[];
  priceOptions: DisplayPriceOption[];
  categoryBlocks?: DisplayCategoryBlock[];
  columns?: "auto" | "single";
  fontSizeScale: number;
}) {
  const categoryBlocks = providedCategoryBlocks ?? getCategoryBlocksForPage(page, categories, items, priceOptions);
  const renderedItemCount = getRenderedItemCount(categoryBlocks);
  const priceOptionCount = getVisiblePriceOptionCount(categoryBlocks, priceOptions);
  const fitRootRef = useRef<HTMLDivElement | null>(null);
  const fitInputKey = useMemo(() => [
    page.id,
    columns,
    fontSizeScale,
    categoryBlocks.map((group) => `${group.category.id}:${group.items.map((item) => item.id).join(",")}:${group.optionHeaders?.map((header) => header.label).join(",") ?? ""}`).join("|"),
    priceOptionCount,
  ].join("::"), [categoryBlocks, columns, fontSizeScale, page.id, priceOptionCount]);
  const [storedFitState, setStoredFitState] = useState<DisplayFitState>(DISPLAY_FIT_INITIAL_STATE);
  const fitState = storedFitState.key === fitInputKey
    ? storedFitState
    : { ...DISPLAY_FIT_INITIAL_STATE, key: fitInputKey };
  const layoutPlan = selectMenuLayoutPlan({
    columns,
    categoryBlocks,
    priceOptions,
    visibleCategoryCount: categoryBlocks.length,
    renderedItemCount,
    priceOptionCount,
    fontSizeScale,
  });
  const { categoryColumns, layoutMode, rowUnits, rowCqh, isSparseFullMenu } = layoutPlan;
  const effectiveRowCqh = rowCqh * fitState.scale;
  const density = getDisplayDensityFromRowCqh(effectiveRowCqh);
  const densityConfig = getRowBudgetConfig(effectiveRowCqh, fontSizeScale, fitState.phase);

  useLayoutEffect(() => {
    if (categoryBlocks.length === 0) return undefined;

    const frameId = window.requestAnimationFrame(() => {
      const measurement = measureDisplayFit(fitRootRef.current);
      if (!measurement) return;

      setStoredFitState((current) => {
        const currentForKey = current.key === fitInputKey
          ? current
          : { ...DISPLAY_FIT_INITIAL_STATE, key: fitInputKey };
        const next = getNextDisplayFitState({
          current: currentForKey,
          measurement,
          renderedItemCount,
        });

        if (!next) return currentForKey;
        if (
          next.scale === currentForKey.scale &&
          next.phase === currentForKey.phase &&
          next.iteration === currentForKey.iteration &&
          next.status === currentForKey.status
        ) {
          return currentForKey;
        }

        return next;
      });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [categoryBlocks.length, fitInputKey, fitState.iteration, fitState.phase, fitState.scale, fitState.status, renderedItemCount]);

  if (categoryBlocks.length === 0) {
    return <EmptyDisplayPage />;
  }

  const gridClassName = categoryColumns === 2 ? "grid-cols-2" : "grid-cols-1";
  const gridGapClassName = columns === "single"
    ? ""
    : densityConfig.gridGapClassName;
  const categoryColumnGroups: DisplayCategoryBlock[][] = categoryColumns === 2
    ? distributeCategoryBlocks({
      categoryBlocks,
      priceOptions,
      categoryGapWeight: columns === "single" ? 0.16 : 0.12,
      fontSizeScale,
    })
    : [categoryBlocks];
  const menuGridStyle = {
    columnGap: 0,
    rowGap: 0,
    "--display-fit-scale": fitState.scale.toFixed(4),
    "--display-fit-phase": fitState.phase,
  } as CSSProperties;

  return (
    <div className="h-full w-full min-h-0 overflow-hidden" data-display-row-fit-container="" data-display-menu-area="">
      <div
        ref={fitRootRef}
        className={`grid h-full min-h-0 overflow-visible ${gridClassName} ${gridGapClassName}`}
        style={menuGridStyle}
        data-display-menu-content=""
        data-display-column-policy={columns === "single" ? "single" : "max-2"}
        data-display-density={density}
        data-display-layout-mode={layoutMode}
        data-display-sparse-full-menu={isSparseFullMenu ? "true" : "false"}
        data-display-category-columns={categoryColumns}
        data-display-item-columns="1"
        data-display-row-units={rowUnits.toFixed(2)}
        data-display-row-cqh={rowCqh.toFixed(3)}
        data-display-effective-row-cqh={effectiveRowCqh.toFixed(3)}
        data-display-fit-scale={fitState.scale.toFixed(4)}
        data-display-fit-phase={fitState.phase}
        data-display-fit-iteration={fitState.iteration}
        data-display-fit-status={fitState.status}
        data-display-secondary-hidden={densityConfig.showMeta ? "false" : "true"}
        data-display-badge-hidden={densityConfig.showBadge ? "false" : "true"}
        data-display-rendered-category-count={categoryBlocks.length}
        data-display-rendered-item-count={renderedItemCount}
      >
        {categoryColumnGroups.map((columnGroups, columnIndex) => (
          <DisplayMenuColumn
            key={`display-menu-column-${columnIndex}`}
            groups={columnGroups}
            priceOptions={priceOptions}
            densityConfig={densityConfig}
            rowCqh={effectiveRowCqh}
          />
        ))}
      </div>
    </div>
  );
}

function SplitImagePanel({ settings }: { settings: MenuPageDisplaySettings }) {
  const { splitImage } = settings;

  return (
    <aside className="relative min-h-0 overflow-hidden bg-[#EFF7F6]" data-display-split-image-panel="">
      {splitImage.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={splitImage.url} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#F5FFFE_0%,#DFF6F4_45%,#FFFFFF_100%)]" aria-hidden="true" />
      )}
    </aside>
  );
}

function FullMenuPageView(props: {
  page: DisplayPage;
  categories: DisplayCategory[];
  items: DisplayItem[];
  priceOptions: DisplayPriceOption[];
  categoryBlocks?: DisplayCategoryBlock[];
  fontSizeScale: number;
}) {
  return (
    <section className="h-full min-h-0">
      <MenuList {...props} />
    </section>
  );
}

function SplitMenuPageView(props: {
  page: DisplayPage;
  settings: MenuPageDisplaySettings;
  categories: DisplayCategory[];
  items: DisplayItem[];
  priceOptions: DisplayPriceOption[];
  categoryBlocks?: DisplayCategoryBlock[];
  fontSizeScale: number;
}) {
  const imageFirst = props.settings.splitImagePosition !== "right";
  const menuPanel = (
    <div className="min-h-0 bg-[var(--display-surface-color)]" data-display-split-menu-panel="">
      <MenuList {...props} columns="single" />
    </div>
  );
  const imagePanel = <SplitImagePanel settings={props.settings} />;

  return (
    <section className="grid h-full min-h-0 grid-cols-2" data-display-split-ratio="50-50">
      {imageFirst ? (
        <>
          {imagePanel}
          {menuPanel}
        </>
      ) : (
        <>
          {menuPanel}
          {imagePanel}
        </>
      )}
    </section>
  );
}

function VideoPromotion({ videoUrl }: { videoUrl: string }) {
  const embedUrl = getYouTubeEmbedUrl(videoUrl);

  if (isDirectVideoUrl(videoUrl)) {
    return (
      <video
        src={videoUrl}
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
      />
    );
  }

  if (embedUrl) {
    // TODO: YouTube/Vimeo autoplay loop behavior depends on the provider's iframe policy.
    return (
      <iframe
        src={embedUrl}
        title="프로모션 영상"
        className="absolute inset-0 h-full w-full"
        allow="autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
      />
    );
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-zinc-950">
      <span className="sr-only">{videoUrl}</span>
    </div>
  );
}

function PromotionPageView({ settings }: { settings: MenuPageDisplaySettings }) {
  const { promotion } = settings;
  const hasImage = promotion.mediaType === "image" && Boolean(promotion.mediaUrl);
  const hasVideo = promotion.mediaType === "video" && Boolean(promotion.videoUrl);

  return (
    <section className="relative h-full w-full overflow-hidden bg-zinc-950">
      {hasImage && promotion.mediaUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={promotion.mediaUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : hasVideo && promotion.videoUrl ? (
        <VideoPromotion videoUrl={promotion.videoUrl} />
      ) : (
        <div className="absolute inset-0 bg-zinc-950" aria-hidden="true" />
      )}
    </section>
  );
}

function DisplayPageView({
  renderPage,
  data,
  fontSizeScale,
}: {
  renderPage: DisplayRenderPage;
  data: PublicMenuTemplateProps;
  fontSizeScale: number;
}) {
  const { page, categoryBlocks } = renderPage;
  const settings = normalizeMenuPageDisplaySettings(page.display_settings);

  if (settings.pageType === "promotion") {
    return <PromotionPageView settings={settings} />;
  }

  if (settings.menuLayoutType === "split_image_menu") {
    return (
      <SplitMenuPageView
        page={page}
        settings={settings}
        categories={data.categories}
        items={data.items}
        priceOptions={data.priceOptions}
        categoryBlocks={categoryBlocks ?? undefined}
        fontSizeScale={fontSizeScale}
      />
    );
  }

  return (
    <FullMenuPageView
      page={page}
      categories={data.categories}
      items={data.items}
      priceOptions={data.priceOptions}
      categoryBlocks={categoryBlocks ?? undefined}
      fontSizeScale={fontSizeScale}
    />
  );
}

function DisplayPageIndicator({
  pages,
  activePageId,
  onSelect,
}: {
  pages: DisplayRenderPage[];
  activePageId: string | null | undefined;
  onSelect: (pageId: string) => void;
}) {
  return (
    <div className="pointer-events-none absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
      <p className="hidden rounded-full bg-slate-950/18 px-3 py-1 text-center text-[11px] font-bold leading-relaxed text-white shadow-[0_8px_24px_rgba(15,23,42,0.14)] [text-shadow:0_1px_8px_rgba(0,0,0,0.6)] md:block">
        마우스를 메뉴판 밖으로 옮기면 페이지 버튼과 언어 선택이 자동으로 숨겨집니다.
      </p>
      <div className="pointer-events-none flex items-center gap-1.5 rounded-full border border-slate-200/75 bg-white/78 px-2.5 py-2 shadow-[0_10px_30px_rgba(15,23,42,0.12)] backdrop-blur-md transition-opacity duration-200 group-hover:pointer-events-auto group-focus-within:pointer-events-auto">
        {pages.map((displayPage, index) => {
          const isActive = activePageId === displayPage.id;

          return (
            <button
              key={displayPage.id}
              type="button"
              onClick={() => onSelect(displayPage.id)}
              title={displayPage.page.title}
              aria-current={isActive ? "page" : undefined}
              className={`grid h-7 min-w-7 place-items-center rounded-full px-2 text-[11px] font-black transition ${
                isActive
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:bg-slate-100 focus-visible:text-slate-900"
              }`}
            >
              {index + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function DisplayMenuA(props: PublicMenuTemplateProps) {
  const pages = useMemo(
    () => sortMenuPages(props.pages.filter((page) => page.visible)),
    [props.pages]
  );
  const customTypography = getCustomTypographySettings(props.menuSite.settings, props.menuSite.page_settings);
  const typographySettings = mergeTypographySettings(props.menuSite.template_key, customTypography);
  const koreanFontAssets = getKoreanFontLoadAssets(typographySettings.korean_font_key);
  const englishFontAssets = getEnglishFontLoadAssets(typographySettings.english_font_key);
  const typographyStyle = {
    ...getTypographyCssVariables(typographySettings, props.menuSite.template_key),
    "--display-surface-color": DISPLAY_SURFACE_COLOR,
    "--display-text-color": DISPLAY_TEXT_COLOR,
    "--display-muted-text-color": DISPLAY_MUTED_TEXT_COLOR,
    "--display-accent-color": DISPLAY_COOL_ACCENT_COLOR,
    "--display-accent-soft-color": DISPLAY_COOL_ACCENT_SOFT_COLOR,
    "--display-accent-border-color": DISPLAY_COOL_ACCENT_BORDER_COLOR,
  } as CSSProperties;
  const fontSizeScale = getFontSizeMultiplier(typographySettings.font_size_scale_key, props.menuSite.template_key);
  const displayPages = useMemo(
    () => buildDisplayRenderPages({
      pages,
      categories: props.categories,
      items: props.items,
      priceOptions: props.priceOptions,
    }),
    [pages, props.categories, props.items, props.priceOptions]
  );
  const initialSelectedPageId =
    props.initialPreviewPageId &&
    displayPages.some((page) => page.id === props.initialPreviewPageId)
      ? props.initialPreviewPageId
      : displayPages[0]?.id ?? "";
  const [selectedPageId, setSelectedPageId] = useState(initialSelectedPageId);
  const activeRenderPage = displayPages.find((page) => page.id === selectedPageId) ?? displayPages[0] ?? null;
  const activePage = activeRenderPage?.page ?? null;
  const activePageIndex = activeRenderPage ? displayPages.findIndex((page) => page.id === activeRenderPage.id) : -1;
  const activePageParam = activePageIndex >= 0 ? String(activePageIndex + 1) : null;
  const showPreviewSelector = props.mode === "preview" && displayPages.length > 1;
  const activeSettings = activePage ? normalizeMenuPageDisplaySettings(activePage.display_settings) : null;
  const isPromotionPage = activeSettings?.pageType === "promotion";
  const isSplitMenuPage = activeSettings?.pageType !== "promotion" && activeSettings?.menuLayoutType === "split_image_menu";

  useEffect(() => {
    if (props.mode !== "public" || displayPages.length <= 1) return undefined;

    const intervalId = window.setInterval(() => {
      setSelectedPageId((currentPageId) => {
        const currentIndex = displayPages.findIndex((page) => page.id === currentPageId);
        const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % displayPages.length : 0;
        return displayPages[nextIndex]?.id ?? currentPageId;
      });
    }, DISPLAY_PUBLIC_PAGE_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [displayPages, props.mode]);

  if (!activeRenderPage || !activePage) {
    return (
      <>
        <KoreanFontAssets assets={[koreanFontAssets, englishFontAssets]} />
        <main className="flex min-h-screen items-center justify-center bg-white p-8 text-[var(--display-text-color)]" style={typographyStyle}>
          <div className="aspect-video w-full max-w-6xl">
            <EmptyDisplayPage />
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <KoreanFontAssets assets={[koreanFontAssets, englishFontAssets]} />
      <main className="menu-typography group relative h-screen w-screen overflow-hidden bg-[var(--display-surface-color)] text-[var(--display-text-color)]" style={typographyStyle}>
        {showPreviewSelector && (
          <DisplayPageIndicator pages={displayPages} activePageId={activeRenderPage?.id} onSelect={setSelectedPageId} />
        )}
        <div className="pointer-events-none absolute bottom-5 right-5 z-20 opacity-0 transition-opacity duration-200 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
          <MenuLanguageSwitcher
            currentLocale={props.locale}
            enabledLocales={props.enabledLocales}
            compact
            menuPlacement="top"
            extraSearchParams={{ page: activePageParam }}
          />
        </div>
        <section className={`relative h-screen w-screen overflow-hidden ${
          isPromotionPage ? "bg-zinc-950" : isSplitMenuPage ? "bg-[var(--display-surface-color)]" : "bg-[var(--display-surface-color)]"
        }`}>
          <div className="relative flex h-full min-h-0 flex-col">
            <div className="min-h-0 flex-1">
              <DisplayPageView renderPage={activeRenderPage} data={props} fontSizeScale={fontSizeScale} />
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
