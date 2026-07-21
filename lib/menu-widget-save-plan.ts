import {
  createMenuWidgetDeletePlan,
  type MenuWidgetAssetChange,
  type MenuWidgetDeletePlan,
} from "@/lib/menu-widget-persistence";
import {
  MAX_MENU_WIDGETS_PER_PAGE,
  type MenuWidget,
  type MenuWidgetDraft,
} from "@/lib/menu-widgets";
import type {
  MenuWidgetFinalSavePageContentBlocks,
  MenuWidgetFinalSavePayload,
  MenuWidgetFinalSaveValidationErrorCode,
} from "@/lib/menu-widget-save-contract";

export type MenuWidgetSavePlanErrorCode =
  | MenuWidgetFinalSaveValidationErrorCode
  | "EXISTING_WIDGET_DUPLICATE"
  | "EXISTING_WIDGET_PAGE_MISMATCH"
  | "FINAL_WIDGET_COUNT_EXCEEDED";

export type MenuWidgetSavePlanError = {
  code: MenuWidgetSavePlanErrorCode;
  field: string;
  message: string;
};

export type MenuWidgetSavePlan = {
  creates: MenuWidgetDraft[];
  updates: Array<{
    existing: MenuWidget;
    draft: MenuWidgetDraft;
  }>;
  deletes: MenuWidgetDeletePlan[];
  assetChanges: MenuWidgetAssetChange[];
  pageOrders: MenuWidgetFinalSavePageContentBlocks[];
};

export type MenuWidgetSavePlanResult =
  | {
      ok: true;
      plan: MenuWidgetSavePlan;
      errors: [];
    }
  | {
      ok: false;
      plan: null;
      errors: MenuWidgetSavePlanError[];
    };

export function createMenuWidgetSavePlan(args: {
  existingWidgets: readonly MenuWidget[];
  payload: MenuWidgetFinalSavePayload;
}): MenuWidgetSavePlanResult {
  const errors: MenuWidgetSavePlanError[] = [];
  const existingById = indexExistingWidgets(args.existingWidgets, errors);
  const draftsById = new Map(args.payload.widgetDrafts.map((draft) => [draft.id, draft]));
  const deletedIds = new Set(args.payload.deletedWidgetIds);
  const blockWidgetsById = indexWidgetBlocks(args.payload.contentBlocksByPage, errors);

  args.payload.widgetDrafts.forEach((draft, index) => {
    const block = blockWidgetsById.get(draft.id);
    if (!block) {
      errors.push(createError("DRAFT_WITHOUT_WIDGET_BLOCK", `widgetDrafts.${index}.id`, "위젯 draft가 콘텐츠 순서에 포함되어 있지 않습니다."));
      return;
    }

    if (block.menuPageId !== draft.menuPageId) {
      errors.push(createError("WIDGET_PAGE_MISMATCH", `widgetDrafts.${index}.menuPageId`, "위젯 draft의 페이지와 블록 페이지가 다릅니다."));
    }
  });

  blockWidgetsById.forEach((block, widgetId) => {
    if (!draftsById.has(widgetId)) {
      errors.push(createError("WIDGET_BLOCK_WITHOUT_DRAFT", block.field, "위젯 블록에 대응하는 draft가 없습니다."));
    }

    if (deletedIds.has(widgetId)) {
      errors.push(createError("DELETED_WIDGET_IN_BLOCKS", block.field, "삭제할 위젯이 콘텐츠 순서에 포함되어 있습니다."));
    }
  });

  const finalWidgetCountsByPage = new Map<string, number>();
  args.payload.contentBlocksByPage.forEach((pageBlocks, pageIndex) => {
    const widgetCount = pageBlocks.blocks.filter((block) => block.blockType === "widget").length;
    finalWidgetCountsByPage.set(pageBlocks.menuPageId, widgetCount);
    if (widgetCount > MAX_MENU_WIDGETS_PER_PAGE) {
      errors.push(
        createError(
          "FINAL_WIDGET_COUNT_EXCEEDED",
          `contentBlocksByPage.${pageIndex}.blocks`,
          `한 페이지에는 위젯을 최대 ${MAX_MENU_WIDGETS_PER_PAGE}개까지 등록할 수 있습니다.`,
        ),
      );
    }
  });

  args.existingWidgets.forEach((widget) => {
    if (deletedIds.has(widget.id)) return;

    const draft = draftsById.get(widget.id);
    if (draft && draft.menuPageId !== widget.menuPageId && !finalWidgetCountsByPage.has(draft.menuPageId)) {
      errors.push(createError("EXISTING_WIDGET_PAGE_MISMATCH", `widgetDrafts.${draft.id}.menuPageId`, "위젯을 이동할 대상 페이지 순서가 없습니다."));
    }
  });

  if (errors.length > 0) {
    return { ok: false, plan: null, errors };
  }

  const creates: MenuWidgetDraft[] = [];
  const updates: MenuWidgetSavePlan["updates"] = [];
  const deletes = args.payload.deletedWidgetIds
    .map((widgetId) => existingById.get(widgetId))
    .filter((widget): widget is MenuWidget => Boolean(widget))
    .map((widget) => createMenuWidgetDeletePlan(widget));
  const assetChanges: MenuWidgetAssetChange[] = [];

  args.payload.widgetDrafts.forEach((draft) => {
    const existing = existingById.get(draft.id);
    if (existing) {
      updates.push({ existing, draft: cloneDraft(draft) });
      const assetChange = getDraftAssetChange(existing, draft);
      if (assetChange.shouldCleanupPreviousImage) {
        assetChanges.push(assetChange);
      }
    } else {
      creates.push(cloneDraft(draft));
    }
  });

  deletes.forEach((deletePlan) => {
    if (deletePlan.imagePath) {
      assetChanges.push({
        widgetId: deletePlan.widgetId,
        menuSiteId: deletePlan.menuSiteId,
        menuPageId: deletePlan.menuPageId,
        previousImagePath: deletePlan.imagePath,
        nextImagePath: null,
        shouldCleanupPreviousImage: true,
      });
    }
  });

  return {
    ok: true,
    plan: {
      creates,
      updates,
      deletes,
      assetChanges: dedupeAssetChanges(assetChanges),
      pageOrders: args.payload.contentBlocksByPage.map((pageBlocks) => ({
        menuPageId: pageBlocks.menuPageId,
        blocks: pageBlocks.blocks.map((block) => ({ ...block })),
      })),
    },
    errors: [],
  };
}

function indexExistingWidgets(widgets: readonly MenuWidget[], errors: MenuWidgetSavePlanError[]) {
  const existingById = new Map<string, MenuWidget>();

  widgets.forEach((widget, index) => {
    if (existingById.has(widget.id)) {
      errors.push(createError("EXISTING_WIDGET_DUPLICATE", `existingWidgets.${index}.id`, "기존 위젯 목록에 중복 ID가 있습니다."));
    }
    existingById.set(widget.id, widget);
  });

  return existingById;
}

function indexWidgetBlocks(
  pages: readonly MenuWidgetFinalSavePageContentBlocks[],
  errors: MenuWidgetSavePlanError[],
) {
  const blockWidgetsById = new Map<string, { menuPageId: string; field: string }>();

  pages.forEach((pageBlocks, pageIndex) => {
    pageBlocks.blocks.forEach((block, blockIndex) => {
      if (block.blockType !== "widget") return;

      const field = `contentBlocksByPage.${pageIndex}.blocks.${blockIndex}.id`;
      if (blockWidgetsById.has(block.id)) {
        errors.push(createError("DUPLICATE_BLOCK", field, "중복된 위젯 블록이 있습니다."));
      }

      blockWidgetsById.set(block.id, {
        menuPageId: pageBlocks.menuPageId,
        field,
      });
    });
  });

  return blockWidgetsById;
}

function getDraftAssetChange(previous: MenuWidget, draft: MenuWidgetDraft): MenuWidgetAssetChange {
  const previousImagePath = previous.imagePath;
  const nextImagePath = getDraftEffectiveImagePath(draft);

  return {
    widgetId: previous.id,
    menuSiteId: previous.menuSiteId,
    menuPageId: previous.menuPageId,
    previousImagePath,
    nextImagePath,
    shouldCleanupPreviousImage: Boolean(previousImagePath && previousImagePath !== nextImagePath),
  };
}

function getDraftEffectiveImagePath(draft: MenuWidgetDraft) {
  if (draft.type !== "image" && draft.type !== "image_text") return null;
  return draft.imagePath?.trim() || null;
}

function dedupeAssetChanges(changes: readonly MenuWidgetAssetChange[]) {
  const seenPreviousPaths = new Set<string>();
  const deduped: MenuWidgetAssetChange[] = [];

  changes.forEach((change) => {
    if (!change.shouldCleanupPreviousImage || !change.previousImagePath) {
      deduped.push(change);
      return;
    }

    if (seenPreviousPaths.has(change.previousImagePath)) return;
    seenPreviousPaths.add(change.previousImagePath);
    deduped.push(change);
  });

  return deduped;
}

function cloneDraft(draft: MenuWidgetDraft): MenuWidgetDraft {
  return {
    ...draft,
    settings: { ...draft.settings },
  };
}

function createError(
  code: MenuWidgetSavePlanErrorCode,
  field: string,
  message: string,
): MenuWidgetSavePlanError {
  return { code, field, message };
}
