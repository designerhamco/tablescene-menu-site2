import type { MenuWidget, MenuWidgetDraft } from "@/lib/menu-widgets";

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
  contentBlockDraftsByPageId: Record<string, MenuEditorContentBlockDraft[]>;
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
        [...blocks]
          .sort((left, right) => left.sortOrder - right.sortOrder || left.inputIndex - right.inputIndex)
          .map((block) => ({
            blockType: block.blockType,
            id: block.id,
            menuPageId: block.menuPageId,
            sortOrder: block.sortOrder,
            visible: block.visible,
          })),
      ]),
    ),
  };
}

type IndexedContentBlockDraft = MenuEditorContentBlockDraft & {
  inputIndex: number;
};
