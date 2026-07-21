export type MenuPageCategoryBlock = {
  blockType: "category";
  id: string;
  menuPageId: string;
  sortOrder: number;
  visible: boolean;
};

export type MenuPageWidgetBlock = {
  blockType: "widget";
  id: string;
  menuPageId: string;
  sortOrder: number;
  visible: boolean;
};

export type MenuPageContentBlock = MenuPageCategoryBlock | MenuPageWidgetBlock;

export type MenuPageContentOrderUpdate =
  | {
      blockType: "category";
      id: string;
      menuPageId: string;
      sortOrder: number;
    }
  | {
      blockType: "widget";
      id: string;
      menuPageId: string;
      sortOrder: number;
    };

export type MenuPageContentBlockValidationErrorCode =
  | "INVALID_PAGE_ID"
  | "INVALID_BLOCK_ID"
  | "INVALID_SORT_ORDER"
  | "MIXED_PAGE_BLOCKS"
  | "DUPLICATE_BLOCK_ID";

export type MenuPageContentBlockValidationError = {
  code: MenuPageContentBlockValidationErrorCode;
  field: string;
  message: string;
};

export type MenuPageContentBlockValidationResult =
  | { valid: true; errors: [] }
  | { valid: false; errors: MenuPageContentBlockValidationError[] };

export type MenuPageContentOrderUpdateResult =
  | {
      ok: true;
      updates: MenuPageContentOrderUpdate[];
      errors: [];
    }
  | {
      ok: false;
      updates: [];
      errors: MenuPageContentBlockValidationError[];
    };

export function sortMenuPageContentBlocks(
  blocks: readonly MenuPageContentBlock[],
): MenuPageContentBlock[] {
  return blocks
    .map((block, index) => ({ block, index }))
    .sort((left, right) => left.block.sortOrder - right.block.sortOrder || left.index - right.index)
    .map(({ block }) => block);
}

export function getVisibleMenuPageContentBlocks(
  blocks: readonly MenuPageContentBlock[],
): MenuPageContentBlock[] {
  return sortMenuPageContentBlocks(blocks).filter((block) => block.visible);
}

export function normalizeMenuPageContentBlockOrder(
  blocks: readonly MenuPageContentBlock[],
): MenuPageContentBlock[] {
  assertSingleMenuPage(blocks);

  return blocks.map((block, index) => ({
    ...block,
    sortOrder: index,
  }));
}

export function validateMenuPageContentBlocks(
  blocks: readonly MenuPageContentBlock[],
): MenuPageContentBlockValidationResult {
  const errors: MenuPageContentBlockValidationError[] = [];
  const firstPageId = blocks[0]?.menuPageId ?? null;
  const seenKeys = new Set<string>();

  blocks.forEach((block, index) => {
    if (!block.menuPageId.trim()) {
      errors.push(createContentBlockValidationError("INVALID_PAGE_ID", `blocks.${index}.menuPageId`, "메뉴 페이지가 필요합니다."));
    }

    if (!block.id.trim()) {
      errors.push(createContentBlockValidationError("INVALID_BLOCK_ID", `blocks.${index}.id`, "콘텐츠 블록 ID가 필요합니다."));
    }

    if (!Number.isInteger(block.sortOrder) || block.sortOrder < 0) {
      errors.push(createContentBlockValidationError("INVALID_SORT_ORDER", `blocks.${index}.sortOrder`, "정렬 순서는 0 이상의 정수여야 합니다."));
    }

    if (firstPageId != null && block.menuPageId !== firstPageId) {
      errors.push(createContentBlockValidationError("MIXED_PAGE_BLOCKS", `blocks.${index}.menuPageId`, "한 번에 한 페이지의 콘텐츠 블록만 저장할 수 있습니다."));
    }

    const key = `${block.blockType}:${block.id}`;
    if (seenKeys.has(key)) {
      errors.push(createContentBlockValidationError("DUPLICATE_BLOCK_ID", `blocks.${index}.id`, "중복된 콘텐츠 블록 ID가 있습니다."));
    }
    seenKeys.add(key);
  });

  return errors.length > 0 ? { valid: false, errors } : { valid: true, errors: [] };
}

export function createMenuPageContentOrderUpdates(
  blocks: readonly MenuPageContentBlock[],
): MenuPageContentOrderUpdateResult {
  const validation = validateMenuPageContentBlocks(blocks);
  const errors: MenuPageContentBlockValidationError[] = validation.valid ? [] : [...validation.errors];
  const seenIds = new Set<string>();

  blocks.forEach((block, index) => {
    const id = block.id.trim();
    if (!id) return;

    if (seenIds.has(id)) {
      errors.push(createContentBlockValidationError("DUPLICATE_BLOCK_ID", `blocks.${index}.id`, "중복된 콘텐츠 블록 ID가 있습니다."));
    }
    seenIds.add(id);
  });

  if (errors.length > 0) {
    return { ok: false, updates: [], errors };
  }

  return {
    ok: true,
    updates: blocks.map((block, index) => ({
      blockType: block.blockType,
      id: block.id,
      menuPageId: block.menuPageId,
      sortOrder: index,
    })),
    errors: [],
  };
}

function assertSingleMenuPage(blocks: readonly MenuPageContentBlock[]) {
  const firstPageId = blocks[0]?.menuPageId ?? null;
  if (firstPageId == null) return;

  if (blocks.some((block) => block.menuPageId !== firstPageId)) {
    throw new Error("Cannot normalize content block order across multiple menu pages.");
  }
}

function createContentBlockValidationError(
  code: MenuPageContentBlockValidationErrorCode,
  field: string,
  message: string,
): MenuPageContentBlockValidationError {
  return { code, field, message };
}
