import type { MenuWidget, MenuWidgetDraft } from "@/lib/menu-widgets";

const MENU_WIDGET_EDITOR_PREVIEW_MAX_LENGTH = 28;

export type MenuWidgetEditorPageInput = {
  id: string;
};

export type MenuWidgetEditorCategoryInput = {
  id: string;
  menu_page_id: string | null;
  sort_order: number;
  visible: boolean;
};

export type MenuCategoryContentBlockDraft = {
  blockType: "category";
  id: string;
  menuPageId: string;
  sortOrder: number;
  visible: boolean;
};

export type MenuWidgetContentBlockDraft = {
  blockType: "widget";
  id: string;
  menuPageId: string;
  sortOrder: number;
  visible: boolean;
};

export type MenuEditorContentBlockDraft =
  | MenuCategoryContentBlockDraft
  | MenuWidgetContentBlockDraft;

export type InitialMenuWidgetEditorDraft = {
  widgetDraftsById: Record<string, MenuWidgetDraft>;
  contentBlockDraftsByPageId: MenuEditorContentBlockDraftsByPageId;
};

export type MenuEditorContentBlockDraftsByPageId = Record<string, MenuEditorContentBlockDraft[]>;

export type MenuEditorCategoryContentBlockInput = {
  id: string;
  menuPageId: string;
  sortOrder: number;
  visible: boolean;
};

export function createMenuWidgetDraftFromWidget(widget: MenuWidget): MenuWidgetDraft {
  return {
    id: widget.id,
    menuPageId: widget.menuPageId,
    type: widget.type,
    title: widget.title ?? "",
    description: widget.description ?? "",
    imageUrl: widget.imageUrl,
    imagePath: widget.imagePath,
    sortOrder: widget.sortOrder,
    visible: widget.visible,
    settings: {
      aspectRatio:
        widget.type === "image" || widget.type === "image_text"
          ? widget.settings.aspectRatio
          : "4:3",
      objectFit:
        widget.type === "image" || widget.type === "image_text"
          ? widget.settings.objectFit
          : "cover",
      textAlign:
        widget.type === "text" || widget.type === "image_text"
          ? widget.settings.textAlign
          : "left",
      altText:
        widget.type === "image" || widget.type === "image_text"
          ? widget.settings.altText ?? ""
          : "",
    },
  };
}

export function createInitialMenuWidgetEditorDraft(args: {
  pages: readonly MenuWidgetEditorPageInput[];
  categories: readonly MenuWidgetEditorCategoryInput[];
  widgets: readonly MenuWidget[];
}): InitialMenuWidgetEditorDraft {
  const pageIds = new Set(args.pages.map((page) => page.id).filter(Boolean));
  const contentBlockDraftsByPageId = Object.fromEntries(
    args.pages.map((page) => [page.id, [] as IndexedContentBlockDraft[]]),
  );
  const widgetDraftsById: Record<string, MenuWidgetDraft> = {};

  args.categories.forEach((category, index) => {
    const menuPageId = category.menu_page_id ?? "";
    if (!pageIds.has(menuPageId)) return;

    contentBlockDraftsByPageId[menuPageId]?.push({
      blockType: "category",
      id: category.id,
      menuPageId,
      sortOrder: category.sort_order,
      visible: category.visible,
      inputIndex: index,
    });
  });

  args.widgets.forEach((widget, index) => {
    if (!pageIds.has(widget.menuPageId)) return;

    widgetDraftsById[widget.id] = createMenuWidgetDraftFromWidget(widget);
    contentBlockDraftsByPageId[widget.menuPageId]?.push({
      blockType: "widget",
      id: widget.id,
      menuPageId: widget.menuPageId,
      sortOrder: widget.sortOrder,
      visible: widget.visible,
      inputIndex: args.categories.length + index,
    });
  });

  return {
    widgetDraftsById,
    contentBlockDraftsByPageId: Object.fromEntries(
      Object.entries(contentBlockDraftsByPageId).map(([pageId, blocks]) => [
        pageId,
        normalizeIndexedContentBlockDrafts(pageId, blocks),
      ]),
    ),
  };
}

export function normalizeMenuEditorContentBlockDrafts(
  pageId: string,
  blocks: readonly MenuEditorContentBlockDraft[],
): MenuEditorContentBlockDraft[] {
  return blocks.map((block, index) => ({
    ...block,
    menuPageId: pageId,
    sortOrder: index,
  }));
}

export function createCategoryContentBlocksForPage(
  pageId: string,
  categories: readonly MenuEditorCategoryContentBlockInput[],
): MenuCategoryContentBlockDraft[] {
  return categories
    .filter((category) => category.menuPageId === pageId)
    .map((category, inputIndex) => ({ category, inputIndex }))
    .sort((left, right) => left.category.sortOrder - right.category.sortOrder || left.inputIndex - right.inputIndex)
    .map(({ category }, index) => ({
      blockType: "category",
      id: category.id,
      menuPageId: pageId,
      sortOrder: index,
      visible: category.visible,
    }));
}

export function createCategoryOnlyContentBlockDraftsByPageId(args: {
  pages: readonly MenuWidgetEditorPageInput[];
  categories: readonly MenuEditorCategoryContentBlockInput[];
}): MenuEditorContentBlockDraftsByPageId {
  return Object.fromEntries(
    args.pages.map((page) => [
      page.id,
      createCategoryContentBlocksForPage(page.id, args.categories),
    ]),
  );
}

export function addPageContentBlockList(
  state: MenuEditorContentBlockDraftsByPageId,
  pageId: string,
  blocks: readonly MenuEditorContentBlockDraft[] = [],
): MenuEditorContentBlockDraftsByPageId {
  if (!pageId || state[pageId]) return state;

  return {
    ...state,
    [pageId]: normalizeMenuEditorContentBlockDrafts(pageId, [...blocks]),
  };
}

export function removePageContentBlockList(
  state: MenuEditorContentBlockDraftsByPageId,
  pageId: string,
): MenuEditorContentBlockDraftsByPageId {
  if (!state[pageId]) return state;

  const nextState = { ...state };
  delete nextState[pageId];
  return nextState;
}

export function addCategoryContentBlock(
  state: MenuEditorContentBlockDraftsByPageId,
  args: { pageId: string; categoryId: string; visible?: boolean },
): MenuEditorContentBlockDraftsByPageId {
  return prependCategoryContentBlocks(state, {
    pageId: args.pageId,
    categories: [{
      id: args.categoryId,
      visible: args.visible ?? true,
    }],
  });
}

export function copyCategoryContentBlock(
  state: MenuEditorContentBlockDraftsByPageId,
  args: { pageId: string; categoryId: string; visible?: boolean },
): MenuEditorContentBlockDraftsByPageId {
  return addCategoryContentBlock(state, args);
}

export function prependCategoryContentBlocks(
  state: MenuEditorContentBlockDraftsByPageId,
  args: { pageId: string; categories: readonly { id: string; visible?: boolean }[] },
): MenuEditorContentBlockDraftsByPageId {
  if (!args.pageId || args.categories.length === 0) return state;

  const validCategories = args.categories.filter((category) => category.id.trim());
  if (validCategories.length === 0) return state;

  const withoutCategories = removeCategoryContentBlocksById(
    state,
    new Set(validCategories.map((category) => category.id)),
  );
  const pageBlocks = sortPageBlocks(withoutCategories[args.pageId] ?? []);
  const insertedBlocks: MenuCategoryContentBlockDraft[] = validCategories.map((category) => ({
    blockType: "category",
    id: category.id,
    menuPageId: args.pageId,
    sortOrder: 0,
    visible: category.visible ?? true,
  }));

  return replacePageContentBlocks(withoutCategories, args.pageId, [
    ...insertedBlocks,
    ...pageBlocks,
  ]);
}

export function removeCategoryContentBlock(
  state: MenuEditorContentBlockDraftsByPageId,
  categoryId: string,
): MenuEditorContentBlockDraftsByPageId {
  if (!categoryId) return state;
  return removeCategoryContentBlocksById(state, new Set([categoryId]));
}

export function moveCategoryContentBlock(
  state: MenuEditorContentBlockDraftsByPageId,
  args: { categoryId: string; targetPageId: string; visible?: boolean },
): MenuEditorContentBlockDraftsByPageId {
  if (!args.categoryId || !args.targetPageId) return state;

  const existingBlock = Object.values(state)
    .flat()
    .find((block): block is MenuCategoryContentBlockDraft => block.blockType === "category" && block.id === args.categoryId);

  if (!existingBlock && args.visible == null) return state;

  return addCategoryContentBlock(state, {
    pageId: args.targetPageId,
    categoryId: args.categoryId,
    visible: args.visible ?? existingBlock?.visible ?? true,
  });
}

export function reorderCategoryContentBlocks(
  state: MenuEditorContentBlockDraftsByPageId,
  args: { pageId: string; orderedCategoryIds: readonly string[] },
): MenuEditorContentBlockDraftsByPageId {
  const pageBlocks = state[args.pageId];
  if (!pageBlocks) return state;

  const sortedBlocks = sortPageBlocks(pageBlocks);
  const categoryBlocks = sortedBlocks.filter((block): block is MenuCategoryContentBlockDraft => block.blockType === "category");
  const categoryById = new Map(categoryBlocks.map((block) => [block.id, block]));
  const reorderedCategories = args.orderedCategoryIds.flatMap((categoryId) => {
    const block = categoryById.get(categoryId);
    return block ? [block] : [];
  });
  const orderedCategoryIds = new Set(reorderedCategories.map((block) => block.id));
  const remainingCategories = categoryBlocks.filter((block) => !orderedCategoryIds.has(block.id));
  const nextCategories = [...reorderedCategories, ...remainingCategories];
  let categoryIndex = 0;

  const nextBlocks = sortedBlocks.map((block) => {
    if (block.blockType !== "category") return block;
    return nextCategories[categoryIndex++] ?? block;
  });

  return replacePageContentBlocks(state, args.pageId, nextBlocks);
}

export function updateCategoryContentBlockVisibility(
  state: MenuEditorContentBlockDraftsByPageId,
  args: { categoryId: string; visible: boolean },
): MenuEditorContentBlockDraftsByPageId {
  if (!args.categoryId) return state;

  let changed = false;
  const nextEntries = Object.entries(state).map(([pageId, blocks]) => {
    let pageChanged = false;
    const nextBlocks = blocks.map((block) => {
      if (block.blockType !== "category" || block.id !== args.categoryId) return block;
      changed = true;
      pageChanged = true;
      return { ...block, visible: args.visible };
    });
    return [pageId, pageChanged ? nextBlocks : blocks] as const;
  });

  return changed ? Object.fromEntries(nextEntries) : state;
}

export function pageHasWidgetContentBlocks(
  state: MenuEditorContentBlockDraftsByPageId,
  pageId: string,
): boolean {
  return Boolean(state[pageId]?.some((block) => block.blockType === "widget"));
}

export function getMenuWidgetEditorTypeLabel(type: string): string {
  if (type === "image") return "이미지 위젯";
  if (type === "text") return "텍스트 위젯";
  if (type === "image_text") return "이미지 + 텍스트 위젯";
  return "지원하지 않는 위젯";
}

export function getMenuWidgetEditorDisplayName(widget: MenuWidgetDraft | null | undefined): string {
  if (!widget) return "지원하지 않는 위젯";

  const title = normalizeEditorPreviewText(widget.title);
  const description = normalizeEditorPreviewText(widget.description);
  const altText = normalizeEditorPreviewText(widget.settings.altText);

  if (widget.type === "image") {
    return title || altText || getMenuWidgetEditorTypeLabel(widget.type);
  }

  if (widget.type === "text" || widget.type === "image_text") {
    return title || description || getMenuWidgetEditorTypeLabel(widget.type);
  }

  return "지원하지 않는 위젯";
}

type IndexedContentBlockDraft = MenuEditorContentBlockDraft & {
  inputIndex: number;
};

function normalizeIndexedContentBlockDrafts(
  pageId: string,
  blocks: readonly IndexedContentBlockDraft[],
): MenuEditorContentBlockDraft[] {
  return [...blocks]
    .sort((left, right) => left.sortOrder - right.sortOrder || left.inputIndex - right.inputIndex)
    .map((block, index) => ({
      blockType: block.blockType,
      id: block.id,
      menuPageId: pageId,
      sortOrder: index,
      visible: block.visible,
    }));
}

function replacePageContentBlocks(
  state: MenuEditorContentBlockDraftsByPageId,
  pageId: string,
  blocks: readonly MenuEditorContentBlockDraft[],
): MenuEditorContentBlockDraftsByPageId {
  return {
    ...state,
    [pageId]: normalizeMenuEditorContentBlockDrafts(pageId, blocks),
  };
}

function sortPageBlocks(blocks: readonly MenuEditorContentBlockDraft[]): MenuEditorContentBlockDraft[] {
  return blocks
    .map((block, inputIndex) => ({ block, inputIndex }))
    .sort((left, right) => left.block.sortOrder - right.block.sortOrder || left.inputIndex - right.inputIndex)
    .map(({ block }) => block);
}

function removeCategoryContentBlocksById(
  state: MenuEditorContentBlockDraftsByPageId,
  categoryIds: ReadonlySet<string>,
): MenuEditorContentBlockDraftsByPageId {
  let changed = false;
  const nextEntries = Object.entries(state).map(([pageId, blocks]) => {
    const nextBlocks = blocks.filter((block) => block.blockType !== "category" || !categoryIds.has(block.id));
    if (nextBlocks.length === blocks.length) return [pageId, blocks] as const;
    changed = true;
    return [pageId, normalizeMenuEditorContentBlockDrafts(pageId, nextBlocks)] as const;
  });

  return changed ? Object.fromEntries(nextEntries) : state;
}

function normalizeEditorPreviewText(value: string | null | undefined): string {
  const normalized = String(value ?? "").replace(/\s+/g, " ").trim();
  if (normalized.length <= MENU_WIDGET_EDITOR_PREVIEW_MAX_LENGTH) return normalized;
  return `${normalized.slice(0, MENU_WIDGET_EDITOR_PREVIEW_MAX_LENGTH - 1)}…`;
}
