import {
  MAX_MENU_WIDGETS_PER_PAGE,
  type MenuWidgetDraft,
  validateMenuWidgetDraft,
} from "@/lib/menu-widgets";

export type MenuWidgetFinalSaveBlockType = "category" | "widget";

export type MenuWidgetFinalSaveContentBlock = {
  blockType: MenuWidgetFinalSaveBlockType;
  id: string;
  sortOrder: number;
};

export type MenuWidgetFinalSavePageContentBlocks = {
  menuPageId: string;
  blocks: MenuWidgetFinalSaveContentBlock[];
};

export type MenuWidgetFinalSavePayload = {
  widgetDrafts: MenuWidgetDraft[];
  deletedWidgetIds: string[];
  contentBlocksByPage: MenuWidgetFinalSavePageContentBlocks[];
};

export type MenuWidgetFinalSaveValidationErrorCode =
  | "INVALID_PAYLOAD"
  | "INVALID_ARRAY"
  | "INVALID_UUID"
  | "INVALID_WIDGET_DRAFT"
  | "INVALID_BLOCK_TYPE"
  | "INVALID_SORT_ORDER"
  | "DUPLICATE_WIDGET_ID"
  | "DUPLICATE_DELETED_WIDGET_ID"
  | "DRAFT_DELETE_CONFLICT"
  | "DUPLICATE_PAGE_ID"
  | "DUPLICATE_BLOCK"
  | "WIDGET_BLOCK_WITHOUT_DRAFT"
  | "DRAFT_WITHOUT_WIDGET_BLOCK"
  | "DELETED_WIDGET_IN_BLOCKS"
  | "WIDGET_PAGE_MISMATCH"
  | "TOO_MANY_WIDGETS_PER_PAGE";

export type MenuWidgetFinalSaveValidationError = {
  code: MenuWidgetFinalSaveValidationErrorCode;
  field: string;
  message: string;
};

export type MenuWidgetFinalSaveParseResult =
  | {
      ok: true;
      value: MenuWidgetFinalSavePayload;
      errors: [];
    }
  | {
      ok: false;
      value: null;
      errors: MenuWidgetFinalSaveValidationError[];
    };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseMenuWidgetFinalSavePayload(value: unknown): MenuWidgetFinalSaveParseResult {
  return parseMenuWidgetFinalSavePayloadInternal(value, { allowDraftPageAndCategoryIds: false });
}

export function parseMenuWidgetFinalSaveDraftPayload(value: unknown): MenuWidgetFinalSaveParseResult {
  return parseMenuWidgetFinalSavePayloadInternal(value, { allowDraftPageAndCategoryIds: true });
}

export function remapMenuWidgetFinalSavePayloadIds(args: {
  payload: MenuWidgetFinalSavePayload;
  pageIdMap: ReadonlyMap<string, string>;
  categoryIdMap: ReadonlyMap<string, string>;
}): MenuWidgetFinalSaveParseResult {
  const remappedPayload: MenuWidgetFinalSavePayload = {
    widgetDrafts: args.payload.widgetDrafts.map((draft) => ({
      ...draft,
      menuPageId: args.pageIdMap.get(draft.menuPageId) ?? draft.menuPageId,
    })),
    deletedWidgetIds: [...args.payload.deletedWidgetIds],
    contentBlocksByPage: args.payload.contentBlocksByPage.map((pageBlocks) => ({
      menuPageId: args.pageIdMap.get(pageBlocks.menuPageId) ?? pageBlocks.menuPageId,
      blocks: pageBlocks.blocks.map((block) => ({
        ...block,
        id: block.blockType === "category"
          ? args.categoryIdMap.get(block.id) ?? block.id
          : block.id,
      })),
    })),
  };

  return parseMenuWidgetFinalSavePayload(remappedPayload);
}

export function shouldRunMenuWidgetFinalSave(payload: MenuWidgetFinalSavePayload): boolean {
  return payload.widgetDrafts.length > 0 || payload.deletedWidgetIds.length > 0;
}

export function validateMenuWidgetFinalSavePayload(
  payload: MenuWidgetFinalSavePayload,
): MenuWidgetFinalSaveParseResult {
  return parseMenuWidgetFinalSavePayload(payload);
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function isValidReferenceId(value: unknown, allowDraftId: boolean): value is string {
  if (isUuid(value)) return true;
  return allowDraftId && typeof value === "string" && value.trim().length > 0;
}

type MenuWidgetFinalSaveParseOptions = {
  allowDraftPageAndCategoryIds: boolean;
};

function parseMenuWidgetFinalSavePayloadInternal(
  value: unknown,
  options: MenuWidgetFinalSaveParseOptions,
): MenuWidgetFinalSaveParseResult {
  const errors: MenuWidgetFinalSaveValidationError[] = [];

  if (!isPlainObject(value)) {
    return parseFailure([createError("INVALID_PAYLOAD", "payload", "위젯 저장 payload는 object여야 합니다.")]);
  }

  const rawWidgetDrafts = value.widgetDrafts;
  const rawDeletedWidgetIds = value.deletedWidgetIds;
  const rawContentBlocksByPage = value.contentBlocksByPage;

  if (!Array.isArray(rawWidgetDrafts)) {
    errors.push(createError("INVALID_ARRAY", "widgetDrafts", "위젯 목록은 배열이어야 합니다."));
  }

  if (!Array.isArray(rawDeletedWidgetIds)) {
    errors.push(createError("INVALID_ARRAY", "deletedWidgetIds", "삭제 위젯 목록은 배열이어야 합니다."));
  }

  if (!Array.isArray(rawContentBlocksByPage)) {
    errors.push(createError("INVALID_ARRAY", "contentBlocksByPage", "페이지별 콘텐츠 순서는 배열이어야 합니다."));
  }

  if (errors.length > 0) {
    return parseFailure(errors);
  }

  const widgetDrafts = parseWidgetDrafts(rawWidgetDrafts as unknown[], errors, options);
  const deletedWidgetIds = parseDeletedWidgetIds(rawDeletedWidgetIds as unknown[], errors);
  const contentBlocksByPage = parseContentBlocksByPage(rawContentBlocksByPage as unknown[], errors, options);

  validateFinalSavePayloadRelations(
    {
      widgetDrafts,
      deletedWidgetIds,
      contentBlocksByPage,
    },
    errors,
  );

  if (errors.length > 0) {
    return parseFailure(errors);
  }

  return {
    ok: true,
    value: {
      widgetDrafts,
      deletedWidgetIds,
      contentBlocksByPage,
    },
    errors: [],
  };
}

function parseWidgetDrafts(
  rawDrafts: unknown[],
  errors: MenuWidgetFinalSaveValidationError[],
  options: MenuWidgetFinalSaveParseOptions,
) {
  const widgetDrafts: MenuWidgetDraft[] = [];
  const seenWidgetIds = new Set<string>();

  rawDrafts.forEach((rawDraft, index) => {
    const field = `widgetDrafts.${index}`;
    if (!isPlainObject(rawDraft)) {
      errors.push(createError("INVALID_WIDGET_DRAFT", field, "위젯 draft는 object여야 합니다."));
      return;
    }

    const draft = cloneWidgetDraft(rawDraft);
    widgetDrafts.push(draft);

    if (!isUuid(draft.id)) {
      errors.push(createError("INVALID_UUID", `${field}.id`, "위젯 ID는 UUID여야 합니다."));
    }

    if (!isValidReferenceId(draft.menuPageId, options.allowDraftPageAndCategoryIds)) {
      errors.push(createError("INVALID_UUID", `${field}.menuPageId`, "위젯 페이지 ID는 UUID여야 합니다."));
    }

    if (seenWidgetIds.has(draft.id)) {
      errors.push(createError("DUPLICATE_WIDGET_ID", `${field}.id`, "중복된 위젯 ID가 있습니다."));
    }
    seenWidgetIds.add(draft.id);

    const validation = validateMenuWidgetDraft(draft);
    if (!validation.valid) {
      validation.errors.forEach((error) => {
        errors.push(
          createError(
            "INVALID_WIDGET_DRAFT",
            `${field}.${error.field}`,
            error.message,
          ),
        );
      });
    }
  });

  return widgetDrafts;
}

function parseDeletedWidgetIds(rawDeletedWidgetIds: unknown[], errors: MenuWidgetFinalSaveValidationError[]) {
  const deletedWidgetIds: string[] = [];
  const seenDeletedIds = new Set<string>();

  rawDeletedWidgetIds.forEach((rawId, index) => {
    const field = `deletedWidgetIds.${index}`;
    if (!isUuid(rawId)) {
      errors.push(createError("INVALID_UUID", field, "삭제 위젯 ID는 UUID여야 합니다."));
      return;
    }

    deletedWidgetIds.push(rawId);
    if (seenDeletedIds.has(rawId)) {
      errors.push(createError("DUPLICATE_DELETED_WIDGET_ID", field, "중복된 삭제 위젯 ID가 있습니다."));
    }
    seenDeletedIds.add(rawId);
  });

  return deletedWidgetIds;
}

function parseContentBlocksByPage(
  rawPages: unknown[],
  errors: MenuWidgetFinalSaveValidationError[],
  options: MenuWidgetFinalSaveParseOptions,
) {
  const pages: MenuWidgetFinalSavePageContentBlocks[] = [];
  const seenPageIds = new Set<string>();

  rawPages.forEach((rawPage, pageIndex) => {
    const pageField = `contentBlocksByPage.${pageIndex}`;
    if (!isPlainObject(rawPage)) {
      errors.push(createError("INVALID_PAYLOAD", pageField, "페이지별 콘텐츠 순서는 object여야 합니다."));
      return;
    }

    const menuPageId = rawPage.menuPageId;
    if (!isValidReferenceId(menuPageId, options.allowDraftPageAndCategoryIds)) {
      errors.push(createError("INVALID_UUID", `${pageField}.menuPageId`, "메뉴 페이지 ID는 UUID여야 합니다."));
    } else if (seenPageIds.has(menuPageId)) {
      errors.push(createError("DUPLICATE_PAGE_ID", `${pageField}.menuPageId`, "중복된 메뉴 페이지 순서 payload가 있습니다."));
    }

    seenPageIds.add(typeof menuPageId === "string" ? menuPageId : "");

    if (!Array.isArray(rawPage.blocks)) {
      errors.push(createError("INVALID_ARRAY", `${pageField}.blocks`, "콘텐츠 블록은 배열이어야 합니다."));
      return;
    }

    const blocks = parseContentBlocks(rawPage.blocks, pageField, errors, options);
    pages.push({
      menuPageId: typeof menuPageId === "string" ? menuPageId : "",
      blocks,
    });
  });

  return pages;
}

function parseContentBlocks(
  rawBlocks: unknown[],
  pageField: string,
  errors: MenuWidgetFinalSaveValidationError[],
  options: MenuWidgetFinalSaveParseOptions,
) {
  const blocks: MenuWidgetFinalSaveContentBlock[] = [];
  const seenBlockKeys = new Set<string>();
  const seenSortOrders = new Set<number>();

  rawBlocks.forEach((rawBlock, blockIndex) => {
    const field = `${pageField}.blocks.${blockIndex}`;
    if (!isPlainObject(rawBlock)) {
      errors.push(createError("INVALID_PAYLOAD", field, "콘텐츠 블록은 object여야 합니다."));
      return;
    }

    const blockType = rawBlock.blockType;
    const id = rawBlock.id;
    const sortOrder = Number.isInteger(rawBlock.sortOrder) ? (rawBlock.sortOrder as number) : null;

    if (blockType !== "category" && blockType !== "widget") {
      errors.push(createError("INVALID_BLOCK_TYPE", `${field}.blockType`, "블록 유형은 category 또는 widget이어야 합니다."));
    }

    const normalizedBlockType = blockType === "category" || blockType === "widget" ? blockType : "category";
    const allowsDraftId = normalizedBlockType === "category" && options.allowDraftPageAndCategoryIds;
    if (!isValidReferenceId(id, allowsDraftId)) {
      errors.push(createError("INVALID_UUID", `${field}.id`, "블록 ID는 UUID여야 합니다."));
    }

    if (sortOrder == null || sortOrder < 0) {
      errors.push(createError("INVALID_SORT_ORDER", `${field}.sortOrder`, "정렬 순서는 0 이상의 정수여야 합니다."));
    } else if (seenSortOrders.has(sortOrder)) {
      errors.push(createError("INVALID_SORT_ORDER", `${field}.sortOrder`, "중복된 sortOrder가 있습니다."));
    }

    const normalizedId = typeof id === "string" ? id : "";
    const normalizedSortOrder = sortOrder ?? -1;
    const blockKey = `${normalizedBlockType}:${normalizedId}`;

    if (seenBlockKeys.has(blockKey)) {
      errors.push(createError("DUPLICATE_BLOCK", `${field}.id`, "중복된 콘텐츠 블록이 있습니다."));
    }

    seenBlockKeys.add(blockKey);
    if (sortOrder != null) seenSortOrders.add(sortOrder);

    blocks.push({
      blockType: normalizedBlockType,
      id: normalizedId,
      sortOrder: normalizedSortOrder,
    });
  });

  for (let sortOrder = 0; sortOrder < rawBlocks.length; sortOrder += 1) {
    if (!seenSortOrders.has(sortOrder)) {
      errors.push(createError("INVALID_SORT_ORDER", `${pageField}.blocks`, "sortOrder는 0부터 연속된 값이어야 합니다."));
      break;
    }
  }

  return blocks;
}

function validateFinalSavePayloadRelations(
  payload: MenuWidgetFinalSavePayload,
  errors: MenuWidgetFinalSaveValidationError[],
) {
  const draftsById = new Map(payload.widgetDrafts.map((draft) => [draft.id, draft]));
  const deletedIds = new Set(payload.deletedWidgetIds);
  const blockWidgetsById = new Map<string, { pageId: string; field: string }>();
  const widgetCountsByPageId = new Map<string, number>();

  payload.widgetDrafts.forEach((draft, index) => {
    if (deletedIds.has(draft.id)) {
      errors.push(createError("DRAFT_DELETE_CONFLICT", `widgetDrafts.${index}.id`, "저장할 위젯과 삭제할 위젯 ID가 겹칩니다."));
    }
  });

  payload.contentBlocksByPage.forEach((pageBlocks, pageIndex) => {
    let pageWidgetCount = 0;

    pageBlocks.blocks.forEach((block, blockIndex) => {
      if (block.blockType !== "widget") return;

      const field = `contentBlocksByPage.${pageIndex}.blocks.${blockIndex}`;
      pageWidgetCount += 1;

      if (deletedIds.has(block.id)) {
        errors.push(createError("DELETED_WIDGET_IN_BLOCKS", `${field}.id`, "삭제할 위젯이 콘텐츠 순서에 포함되어 있습니다."));
      }

      const draft = draftsById.get(block.id);
      if (!draft) {
        errors.push(createError("WIDGET_BLOCK_WITHOUT_DRAFT", `${field}.id`, "위젯 블록에 대응하는 draft가 없습니다."));
      } else if (draft.menuPageId !== pageBlocks.menuPageId) {
        errors.push(createError("WIDGET_PAGE_MISMATCH", `${field}.id`, "위젯 draft의 페이지와 블록 페이지가 다릅니다."));
      }

      blockWidgetsById.set(block.id, { pageId: pageBlocks.menuPageId, field });
    });

    widgetCountsByPageId.set(pageBlocks.menuPageId, pageWidgetCount);
    if (pageWidgetCount > MAX_MENU_WIDGETS_PER_PAGE) {
      errors.push(
        createError(
          "TOO_MANY_WIDGETS_PER_PAGE",
          `contentBlocksByPage.${pageIndex}.blocks`,
          `한 페이지에는 위젯을 최대 ${MAX_MENU_WIDGETS_PER_PAGE}개까지 등록할 수 있습니다.`,
        ),
      );
    }
  });

  payload.widgetDrafts.forEach((draft, index) => {
    if (!blockWidgetsById.has(draft.id)) {
      errors.push(createError("DRAFT_WITHOUT_WIDGET_BLOCK", `widgetDrafts.${index}.id`, "위젯 draft가 콘텐츠 순서에 포함되어 있지 않습니다."));
    }
  });
}

function cloneWidgetDraft(rawDraft: Record<string, unknown>): MenuWidgetDraft {
  const rawSettings = isPlainObject(rawDraft.settings) ? rawDraft.settings : {};
  return {
    id: toStringValue(rawDraft.id),
    menuPageId: toStringValue(rawDraft.menuPageId),
    type: toStringValue(rawDraft.type) as MenuWidgetDraft["type"],
    title: toStringValue(rawDraft.title),
    description: toStringValue(rawDraft.description),
    imageUrl: toNullableStringValue(rawDraft.imageUrl),
    imagePath: toNullableStringValue(rawDraft.imagePath),
    sortOrder: toIntegerValue(rawDraft.sortOrder),
    visible: Boolean(rawDraft.visible),
    settings: {
      aspectRatio: toStringValue(rawSettings.aspectRatio) as MenuWidgetDraft["settings"]["aspectRatio"],
      objectFit: toStringValue(rawSettings.objectFit) as MenuWidgetDraft["settings"]["objectFit"],
      textAlign: toStringValue(rawSettings.textAlign) as MenuWidgetDraft["settings"]["textAlign"],
      altText: toStringValue(rawSettings.altText),
    },
  };
}

function toStringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function toNullableStringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function toIntegerValue(value: unknown): number {
  return Number.isInteger(value) ? (value as number) : -1;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseFailure(errors: MenuWidgetFinalSaveValidationError[]): MenuWidgetFinalSaveParseResult {
  return {
    ok: false,
    value: null,
    errors,
  };
}

function createError(
  code: MenuWidgetFinalSaveValidationErrorCode,
  field: string,
  message: string,
): MenuWidgetFinalSaveValidationError {
  return { code, field, message };
}
