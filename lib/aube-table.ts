export const AUBE_TABLE_TEMPLATE_KEY = "dining_aube_table_a" as const;
export const AUBE_TABLE_TEMPLATE_KEYS = [
  AUBE_TABLE_TEMPLATE_KEY,
  "dining_aube_table_b",
] as const;
export const AUBE_TABLE_MAX_MENU_PAGES = 10;
export const AUBE_TABLE_DEFAULT_COVER_BACKGROUND_COLOR = "#0D172A";
export const AUBE_TABLE_B_DEFAULT_COVER_BACKGROUND_COLOR = "#401E24";
export const AUBE_TABLE_DEFAULT_COVER_BACKGROUND_OPACITY = 75;
export const AUBE_TABLE_SWIPE_OFFSET_THRESHOLD = 64;
export const AUBE_TABLE_SWIPE_VELOCITY_THRESHOLD = 520;

export type AubeTablePageLayoutColumns = 1 | 2;
export type AubeTableTextAlignment = "left" | "center";

export type AubeTablePageLike = {
  id: string;
  title: string;
  visible: boolean;
  sort_order: number;
  created_at?: string;
};

export type AubeTableCategoryLike = {
  id: string;
  menu_page_id: string | null;
  name: string;
  visible: boolean;
};

export type AubeTableItemLike = {
  id: string;
  menu_page_id?: string | null;
  category_id: string | null;
  visible: boolean;
};

export type AubeTableNavigationUnit =
  | { type: "cover"; id: "cover"; label: "커버" }
  | { type: "page"; id: string; pageId: string; label: string };

export function isAubeTableTemplate(templateKey: string | null | undefined) {
  const normalizedTemplateKey = templateKey?.trim().toLowerCase();
  return AUBE_TABLE_TEMPLATE_KEYS.some((key) => key === normalizedTemplateKey);
}

export function getAubeTableDefaultCoverBackgroundColor(templateKey: string | null | undefined) {
  return templateKey?.trim().toLowerCase() === "dining_aube_table_b"
    ? AUBE_TABLE_B_DEFAULT_COVER_BACKGROUND_COLOR
    : AUBE_TABLE_DEFAULT_COVER_BACKGROUND_COLOR;
}

export function normalizeAubeTableLayoutColumns(value: unknown): AubeTablePageLayoutColumns {
  return value === 2 ? 2 : 1;
}

export function normalizeAubeTableTextAlignment(value: unknown): AubeTableTextAlignment {
  return value === "center" ? "center" : "left";
}

export function normalizeAubeTableCoverBackgroundColor(value: unknown) {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value)
    ? value.toUpperCase()
    : AUBE_TABLE_DEFAULT_COVER_BACKGROUND_COLOR;
}

export function normalizeAubeTableCoverBackgroundOpacity(value: unknown) {
  const numericValue = typeof value === "number"
    ? value
    : typeof value === "string" && value.trim()
      ? Number(value)
      : Number.NaN;

  return Number.isFinite(numericValue)
    ? Math.min(100, Math.max(0, Math.round(numericValue)))
    : AUBE_TABLE_DEFAULT_COVER_BACKGROUND_OPACITY;
}

export function shouldUseAubeTableCoverLogo(
  logoUrl: string | null | undefined,
  failedLogoUrl: string | null,
) {
  return Boolean(logoUrl?.trim() && logoUrl !== failedLogoUrl);
}

export function sortAubeTablePages<T extends AubeTablePageLike>(pages: readonly T[]) {
  return [...pages].sort((left, right) => {
    if (left.sort_order !== right.sort_order) return left.sort_order - right.sort_order;
    const createdAt = (left.created_at ?? "").localeCompare(right.created_at ?? "");
    return createdAt || left.title.localeCompare(right.title, "ko");
  });
}

export function buildAubeTableNavigationUnits(
  coverEnabled: boolean,
  pages: readonly AubeTablePageLike[],
): AubeTableNavigationUnit[] {
  const menuPageUnits = sortAubeTablePages(pages)
    .filter((page) => page.visible)
    .map((page) => ({
      type: "page" as const,
      id: `page:${page.id}`,
      pageId: page.id,
      label: page.title.trim() || "메뉴",
    }));

  return [
    ...(coverEnabled ? [{ type: "cover" as const, id: "cover" as const, label: "커버" as const }] : []),
    ...menuPageUnits,
  ];
}

export function getAubeTableSwipeTargetIndex({
  currentIndex,
  unitCount,
  offsetX,
  velocityX,
}: {
  currentIndex: number;
  unitCount: number;
  offsetX: number;
  velocityX: number;
}) {
  const lastIndex = Math.max(0, unitCount - 1);
  const safeCurrentIndex = Math.min(lastIndex, Math.max(0, currentIndex));
  const horizontalIntent = Math.abs(offsetX) >= AUBE_TABLE_SWIPE_OFFSET_THRESHOLD
    ? offsetX
    : Math.abs(velocityX) >= AUBE_TABLE_SWIPE_VELOCITY_THRESHOLD
      ? velocityX
      : 0;

  if (horizontalIntent === 0) return safeCurrentIndex;
  const requestedIndex = safeCurrentIndex + (horizontalIntent < 0 ? 1 : -1);
  return Math.min(lastIndex, Math.max(0, requestedIndex));
}

export function getAubeTableItemPageId(
  item: AubeTableItemLike,
  categoryById: ReadonlyMap<string, AubeTableCategoryLike>,
) {
  if (item.category_id) return categoryById.get(item.category_id)?.menu_page_id ?? null;
  return item.menu_page_id ?? null;
}

export function validateAubeTablePublishStructure({
  pages,
  categories,
  items,
}: {
  pages: readonly AubeTablePageLike[];
  categories: readonly AubeTableCategoryLike[];
  items: readonly AubeTableItemLike[];
}) {
  const visiblePages = sortAubeTablePages(pages).filter((page) => page.visible);
  if (visiblePages.length === 0) return "노출 중인 메뉴 페이지가 1개 이상 필요합니다.";
  if (visiblePages.length > AUBE_TABLE_MAX_MENU_PAGES) {
    return `메뉴 페이지는 최대 ${AUBE_TABLE_MAX_MENU_PAGES}개까지 노출할 수 있습니다.`;
  }

  const visiblePageIds = new Set(visiblePages.map((page) => page.id));
  const visibleItems = items.filter((item) => item.visible);
  const visibleItemCountByCategoryId = new Map<string, number>();

  for (const item of visibleItems) {
    if (item.category_id) {
      visibleItemCountByCategoryId.set(item.category_id, (visibleItemCountByCategoryId.get(item.category_id) ?? 0) + 1);
    }
  }

  for (const course of categories) {
    if (!course.visible || !course.menu_page_id || !visiblePageIds.has(course.menu_page_id)) continue;
    if ((visibleItemCountByCategoryId.get(course.id) ?? 0) === 0) {
      return `노출 중인 코스 “${course.name}”에 노출 메뉴를 1개 이상 등록해주세요.`;
    }
  }

  const categoryById = new Map(categories.map((category) => [category.id, category]));
  for (const item of visibleItems) {
    const pageId = getAubeTableItemPageId(item, categoryById);
    if (!pageId || !visiblePageIds.has(pageId)) {
      return "노출 메뉴는 노출 중인 메뉴 페이지 또는 코스에 포함되어야 합니다.";
    }
  }

  return null;
}
