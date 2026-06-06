export type DisplayMenuQualityLayoutType = "full_menu" | "split_image_menu";
export type DisplayMenuQualityLevel = "ok" | "warning" | "strongWarning";

type DisplayMenuQualityCategory = {
  id: string;
  visible?: boolean | null;
};

type DisplayMenuQualityItem = {
  id?: string;
  category_id: string | null;
  visible?: boolean | null;
  set_name?: string | null;
  badge?: string | null;
  badge_label?: string | null;
  recommended?: boolean | null;
};

type DisplayMenuQualityPriceOption = {
  menu_item_id: string;
  visible?: boolean | null;
  label?: string | null;
};

export type DisplayMenuPageQualityInput = {
  layoutType: DisplayMenuQualityLayoutType;
  categories: DisplayMenuQualityCategory[];
  items: DisplayMenuQualityItem[];
  priceOptions?: DisplayMenuQualityPriceOption[];
};

export type DisplayMenuPageQuality = {
  level: DisplayMenuQualityLevel;
  itemCount: number;
  categoryCount: number;
  estimatedRows: number;
  estimatedRowsPerColumn: number;
  maxCategoryItemCount: number;
  messages: string[];
};

export const DISPLAY_MENU_QUALITY_RULES = {
  fullMenu: {
    recommendedItemMin: 16,
    recommendedItemMax: 28,
    warningItemMin: 29,
    strongWarningItemMin: 37,
    warningEstimatedRowsPerColumnMin: 30,
    strongWarningEstimatedRowsPerColumnMin: 39,
  },
  splitImageMenu: {
    recommendedItemMin: 8,
    recommendedItemMax: 12,
    warningItemMin: 13,
    strongWarningItemMin: 17,
    warningEstimatedRowsPerColumnMin: 24,
    strongWarningEstimatedRowsPerColumnMin: 31,
  },
  category: {
    warningItemMin: 15,
    strongWarningItemMin: 17,
  },
} as const;

function isVisible(value: boolean | null | undefined) {
  return value !== false;
}

function countPriceOptionLabelsForItems(items: DisplayMenuQualityItem[], priceOptions: DisplayMenuQualityPriceOption[]) {
  const itemIds = new Set(items.map((item) => item.id).filter((id): id is string => Boolean(id)));

  if (items.length === 0) return 0;

  const labels = new Set<string>();
  for (const option of priceOptions) {
    if (!isVisible(option.visible)) continue;
    if (itemIds.size > 0 && !itemIds.has(option.menu_item_id)) continue;
    const label = option.label?.trim();
    if (label) labels.add(label.toLocaleUpperCase("ko-KR"));
  }

  return Math.min(labels.size, 3);
}

function estimateRows({
  categoryCount,
  itemCount,
  items,
  priceOptions,
}: {
  categoryCount: number;
  itemCount: number;
  items: DisplayMenuQualityItem[];
  priceOptions: DisplayMenuQualityPriceOption[];
}) {
  const metaRows = items.filter((item) => item.set_name?.trim()).length * 0.12;
  const badgeRows = items.filter((item) => item.badge || item.badge_label || item.recommended).length * 0.06;
  const optionLabelCount = countPriceOptionLabelsForItems(items, priceOptions);
  const optionRows = optionLabelCount >= 3 ? itemCount * 0.05 : 0;

  return Math.ceil(categoryCount * 1.8 + itemCount + metaRows + badgeRows + optionRows);
}

export function getDisplayMenuPageQuality({
  layoutType,
  categories,
  items,
  priceOptions = [],
}: DisplayMenuPageQualityInput): DisplayMenuPageQuality {
  const visibleCategories = categories.filter((category) => isVisible(category.visible));
  const visibleCategoryIds = new Set(visibleCategories.map((category) => category.id));
  const visibleItems = items.filter((item) => isVisible(item.visible) && item.category_id && visibleCategoryIds.has(item.category_id));
  const itemCount = visibleItems.length;
  const categoryCount = visibleCategories.length;
  const categoryItemCounts = visibleCategories.map((category) => visibleItems.filter((item) => item.category_id === category.id).length);
  const maxCategoryItemCount = Math.max(0, ...categoryItemCounts);
  const estimatedRows = estimateRows({ categoryCount, itemCount, items: visibleItems, priceOptions });
  const estimatedRowsPerColumn = layoutType === "full_menu"
    ? Math.ceil(estimatedRows / 2)
    : estimatedRows;
  const messages: string[] = [];
  const isSplit = layoutType === "split_image_menu";
  const rules = isSplit ? DISPLAY_MENU_QUALITY_RULES.splitImageMenu : DISPLAY_MENU_QUALITY_RULES.fullMenu;
  let level: DisplayMenuQualityLevel = "ok";

  const hasEnoughItemsForRowNotice = itemCount >= rules.warningItemMin;
  const hasStrongRowDensity = hasEnoughItemsForRowNotice && estimatedRowsPerColumn >= rules.strongWarningEstimatedRowsPerColumnMin;
  const hasWarningRowDensity = hasEnoughItemsForRowNotice && estimatedRowsPerColumn >= rules.warningEstimatedRowsPerColumnMin;

  if (itemCount >= rules.strongWarningItemMin || hasStrongRowDensity) {
    level = "strongWarning";
    messages.push(
      isSplit
        ? "메뉴가 많아 TV 화면에서 글자가 작게 보일 수 있습니다. 더 크게 보이게 하려면 전체 메뉴형 페이지를 사용하거나 페이지를 나누어보세요."
        : "메뉴가 많아 TV 화면에서 글자가 작게 보일 수 있습니다. 더 크게 보이게 하려면 페이지를 나누거나 카테고리를 정리해보세요."
    );
  } else if (itemCount >= rules.warningItemMin || hasWarningRowDensity) {
    level = "warning";
    messages.push(
      isSplit
        ? "이 페이지는 표시 가능한 범위입니다. 다만 메뉴가 많아 글자와 간격이 조금 더 촘촘하게 보일 수 있습니다."
        : "메뉴가 조금 많은 편이라 화면에서 글자와 간격이 자동으로 작게 조정될 수 있습니다."
    );
  }

  if (maxCategoryItemCount >= DISPLAY_MENU_QUALITY_RULES.category.strongWarningItemMin) {
    level = "strongWarning";
    messages.push("이 카테고리에 메뉴가 많아 TV 화면에서 글자가 작게 보일 수 있습니다. 더 읽기 좋게 보이려면 카테고리를 나누어보세요.");
  } else if (maxCategoryItemCount >= DISPLAY_MENU_QUALITY_RULES.category.warningItemMin) {
    if (level === "ok") level = "warning";
    messages.push("이 카테고리에 메뉴가 많은 편입니다. 표시에는 문제가 없지만, 더 읽기 좋게 보이려면 카테고리를 나누는 것도 좋습니다.");
  }

  return {
    level,
    itemCount,
    categoryCount,
    estimatedRows,
    estimatedRowsPerColumn,
    maxCategoryItemCount,
    messages,
  };
}
