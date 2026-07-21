export const MENU_WIDGET_TYPES = ["image", "text", "image_text"] as const;

export type MenuWidgetType = (typeof MENU_WIDGET_TYPES)[number];

export const MENU_WIDGET_ASPECT_RATIOS = ["2:1", "3:2", "4:3", "1:1", "3:4"] as const;

export type MenuWidgetAspectRatio = (typeof MENU_WIDGET_ASPECT_RATIOS)[number];

export const MENU_WIDGET_OBJECT_FITS = ["cover", "contain"] as const;

export type MenuWidgetObjectFit = (typeof MENU_WIDGET_OBJECT_FITS)[number];

export const MENU_WIDGET_TEXT_ALIGNS = ["left", "center"] as const;

export type MenuWidgetTextAlign = (typeof MENU_WIDGET_TEXT_ALIGNS)[number];

export const MENU_WIDGET_SETTINGS_VERSION = 1;
export const MAX_MENU_WIDGETS_PER_PAGE = 3;
export const MAX_MENU_WIDGET_TITLE_LENGTH = 60;
export const MAX_MENU_WIDGET_DESCRIPTION_LENGTH = 300;
export const MAX_MENU_WIDGET_ALT_TEXT_LENGTH = 120;

export type MenuWidgetSettingsV1 = {
  schemaVersion: typeof MENU_WIDGET_SETTINGS_VERSION;
  aspectRatio?: MenuWidgetAspectRatio;
  objectFit?: MenuWidgetObjectFit;
  textAlign?: MenuWidgetTextAlign;
  altText?: string;
};

export type MenuWidgetBase = {
  id: string;
  menuSiteId: string;
  menuPageId: string;
  type: MenuWidgetType;
  sortOrder: number;
  visible: boolean;
};

export type MenuImageWidget = MenuWidgetBase & {
  type: "image";
  imageUrl: string | null;
  imagePath: string | null;
  title: null;
  description: null;
  settings: MenuWidgetSettingsV1 & {
    aspectRatio: MenuWidgetAspectRatio;
    objectFit: MenuWidgetObjectFit;
    altText?: string;
  };
};

export type MenuTextWidget = MenuWidgetBase & {
  type: "text";
  imageUrl: null;
  imagePath: null;
  title: string | null;
  description: string;
  settings: MenuWidgetSettingsV1 & {
    textAlign: MenuWidgetTextAlign;
  };
};

export type MenuImageTextWidget = MenuWidgetBase & {
  type: "image_text";
  imageUrl: string | null;
  imagePath: string | null;
  title: string | null;
  description: string;
  settings: MenuWidgetSettingsV1 & {
    aspectRatio: MenuWidgetAspectRatio;
    objectFit: MenuWidgetObjectFit;
    textAlign: MenuWidgetTextAlign;
    altText?: string;
  };
};

export type MenuWidget = MenuImageWidget | MenuTextWidget | MenuImageTextWidget;

export type MenuWidgetDraft = {
  id: string;
  menuPageId: string;
  type: MenuWidgetType;
  title: string;
  description: string;
  imageUrl: string | null;
  imagePath: string | null;
  sortOrder: number;
  visible: boolean;
  settings: {
    aspectRatio: MenuWidgetAspectRatio;
    objectFit: MenuWidgetObjectFit;
    textAlign: MenuWidgetTextAlign;
    altText: string;
  };
};

export type CreateDefaultMenuWidgetDraftArgs = {
  id: string;
  menuPageId: string;
  sortOrder: number;
};

export type NormalizeMenuWidgetDraftArgs = {
  menuSiteId: string;
};

export type MenuWidgetPersistenceShape = {
  id: string;
  menu_site_id: string;
  menu_page_id: string;
  widget_type: MenuWidgetType;
  title: string | null;
  description: string | null;
  image_url: string | null;
  image_path: string | null;
  sort_order: number;
  visible: boolean;
  settings: MenuWidgetSettingsV1;
};

export type MenuWidgetValidationErrorCode =
  | "INVALID_TYPE"
  | "INVALID_PAGE_ID"
  | "INVALID_SORT_ORDER"
  | "MISSING_IMAGE"
  | "MISSING_TEXT"
  | "INVALID_ASPECT_RATIO"
  | "INVALID_OBJECT_FIT"
  | "INVALID_TEXT_ALIGN"
  | "TITLE_TOO_LONG"
  | "DESCRIPTION_TOO_LONG"
  | "ALT_TEXT_TOO_LONG"
  | "TOO_MANY_WIDGETS"
  | "DUPLICATE_WIDGET_ID"
  | "MIXED_PAGE_WIDGETS"
  | "DUPLICATE_SORT_ORDER";

export type MenuWidgetValidationError = {
  code: MenuWidgetValidationErrorCode;
  field: string;
  message: string;
};

export type MenuWidgetValidationResult =
  | { valid: true; errors: [] }
  | { valid: false; errors: MenuWidgetValidationError[] };

export function isMenuWidgetType(value: unknown): value is MenuWidgetType {
  return typeof value === "string" && MENU_WIDGET_TYPES.includes(value as MenuWidgetType);
}

export function isMenuWidgetAspectRatio(value: unknown): value is MenuWidgetAspectRatio {
  return typeof value === "string" && MENU_WIDGET_ASPECT_RATIOS.includes(value as MenuWidgetAspectRatio);
}

export function isMenuWidgetObjectFit(value: unknown): value is MenuWidgetObjectFit {
  return typeof value === "string" && MENU_WIDGET_OBJECT_FITS.includes(value as MenuWidgetObjectFit);
}

export function isMenuWidgetTextAlign(value: unknown): value is MenuWidgetTextAlign {
  return typeof value === "string" && MENU_WIDGET_TEXT_ALIGNS.includes(value as MenuWidgetTextAlign);
}

export function isEmphasisWidgetAspectRatio(ratio: MenuWidgetAspectRatio): boolean {
  return ratio === "3:4";
}

export function createDefaultMenuWidgetDraft(
  type: MenuWidgetType,
  args: CreateDefaultMenuWidgetDraftArgs,
): MenuWidgetDraft {
  const base = {
    id: args.id,
    menuPageId: args.menuPageId,
    type,
    title: "",
    description: "",
    imageUrl: null,
    imagePath: null,
    sortOrder: args.sortOrder,
    visible: true,
  };

  if (type === "image") {
    return {
      ...base,
      settings: {
        aspectRatio: "2:1",
        objectFit: "cover",
        textAlign: "left",
        altText: "",
      },
    };
  }

  if (type === "text") {
    return {
      ...base,
      settings: {
        aspectRatio: "4:3",
        objectFit: "cover",
        textAlign: "left",
        altText: "",
      },
    };
  }

  return {
    ...base,
    settings: {
      aspectRatio: "4:3",
      objectFit: "cover",
      textAlign: "left",
      altText: "",
    },
  };
}

export function normalizeMenuWidgetDraft(
  draft: MenuWidgetDraft,
  args: NormalizeMenuWidgetDraftArgs,
): MenuWidget {
  if (!isMenuWidgetType(draft.type)) {
    throw new TypeError("Invalid menu widget type.");
  }

  const base = {
    id: normalizeText(draft.id),
    menuSiteId: normalizeText(args.menuSiteId),
    menuPageId: normalizeText(draft.menuPageId),
    sortOrder: normalizeSortOrder(draft.sortOrder),
    visible: Boolean(draft.visible),
  };
  const title = normalizeText(draft.title);
  const description = normalizeText(draft.description);
  const altText = normalizeText(draft.settings.altText);

  if (draft.type === "image") {
    return {
      ...base,
      type: "image",
      imageUrl: normalizeNullableText(draft.imageUrl),
      imagePath: normalizeNullableText(draft.imagePath),
      title: null,
      description: null,
      settings: {
        schemaVersion: MENU_WIDGET_SETTINGS_VERSION,
        aspectRatio: requireMenuWidgetAspectRatio(draft.settings.aspectRatio),
        objectFit: requireMenuWidgetObjectFit(draft.settings.objectFit),
        ...(altText ? { altText } : {}),
      },
    };
  }

  if (draft.type === "text") {
    return {
      ...base,
      type: "text",
      imageUrl: null,
      imagePath: null,
      title: title || null,
      description,
      settings: {
        schemaVersion: MENU_WIDGET_SETTINGS_VERSION,
        textAlign: requireMenuWidgetTextAlign(draft.settings.textAlign),
      },
    };
  }

  return {
    ...base,
    type: "image_text",
    imageUrl: normalizeNullableText(draft.imageUrl),
    imagePath: normalizeNullableText(draft.imagePath),
    title: title || null,
    description,
    settings: {
      schemaVersion: MENU_WIDGET_SETTINGS_VERSION,
      aspectRatio: requireMenuWidgetAspectRatio(draft.settings.aspectRatio),
      objectFit: requireMenuWidgetObjectFit(draft.settings.objectFit),
      textAlign: requireMenuWidgetTextAlign(draft.settings.textAlign),
      ...(altText ? { altText } : {}),
    },
  };
}

export function toMenuWidgetPersistenceShape(widget: MenuWidget): MenuWidgetPersistenceShape {
  return {
    id: widget.id,
    menu_site_id: widget.menuSiteId,
    menu_page_id: widget.menuPageId,
    widget_type: widget.type,
    title: widget.title,
    description: widget.description,
    image_url: widget.imageUrl,
    image_path: widget.imagePath,
    sort_order: widget.sortOrder,
    visible: widget.visible,
    settings: widget.settings,
  };
}

export function validateMenuWidgetDraft(draft: MenuWidgetDraft): MenuWidgetValidationResult {
  const errors: MenuWidgetValidationError[] = [];
  const title = normalizeText(draft.title);
  const description = normalizeText(draft.description);
  const altText = normalizeText(draft.settings.altText);
  const hasImage = Boolean(normalizeNullableText(draft.imageUrl) || normalizeNullableText(draft.imagePath));
  const hasText = Boolean(title || description);

  if (!isMenuWidgetType(draft.type)) {
    errors.push(createMenuWidgetValidationError("INVALID_TYPE", "type", "지원하지 않는 위젯 유형입니다."));
  }

  if (!normalizeText(draft.menuPageId)) {
    errors.push(createMenuWidgetValidationError("INVALID_PAGE_ID", "menuPageId", "메뉴 페이지가 필요합니다."));
  }

  if (!Number.isInteger(draft.sortOrder) || draft.sortOrder < 0) {
    errors.push(createMenuWidgetValidationError("INVALID_SORT_ORDER", "sortOrder", "정렬 순서는 0 이상의 정수여야 합니다."));
  }

  if (title.length > MAX_MENU_WIDGET_TITLE_LENGTH) {
    errors.push(createMenuWidgetValidationError("TITLE_TOO_LONG", "title", `제목은 ${MAX_MENU_WIDGET_TITLE_LENGTH}자 이하로 입력해주세요.`));
  }

  if (description.length > MAX_MENU_WIDGET_DESCRIPTION_LENGTH) {
    errors.push(
      createMenuWidgetValidationError(
        "DESCRIPTION_TOO_LONG",
        "description",
        `본문은 ${MAX_MENU_WIDGET_DESCRIPTION_LENGTH}자 이하로 입력해주세요.`,
      ),
    );
  }

  if (altText.length > MAX_MENU_WIDGET_ALT_TEXT_LENGTH) {
    errors.push(
      createMenuWidgetValidationError("ALT_TEXT_TOO_LONG", "settings.altText", `대체 텍스트는 ${MAX_MENU_WIDGET_ALT_TEXT_LENGTH}자 이하로 입력해주세요.`),
    );
  }

  if ((draft.type === "image" || draft.type === "image_text") && !hasImage) {
    errors.push(createMenuWidgetValidationError("MISSING_IMAGE", "imageUrl", "이미지 위젯에는 이미지가 필요합니다."));
  }

  if ((draft.type === "text" || draft.type === "image_text") && !hasText) {
    errors.push(createMenuWidgetValidationError("MISSING_TEXT", "description", "텍스트 위젯에는 제목 또는 본문이 필요합니다."));
  }

  if ((draft.type === "image" || draft.type === "image_text") && !isMenuWidgetAspectRatio(draft.settings.aspectRatio)) {
    errors.push(createMenuWidgetValidationError("INVALID_ASPECT_RATIO", "settings.aspectRatio", "지원하지 않는 이미지 비율입니다."));
  }

  if ((draft.type === "image" || draft.type === "image_text") && !isMenuWidgetObjectFit(draft.settings.objectFit)) {
    errors.push(createMenuWidgetValidationError("INVALID_OBJECT_FIT", "settings.objectFit", "지원하지 않는 이미지 맞춤 방식입니다."));
  }

  if ((draft.type === "text" || draft.type === "image_text") && !isMenuWidgetTextAlign(draft.settings.textAlign)) {
    errors.push(createMenuWidgetValidationError("INVALID_TEXT_ALIGN", "settings.textAlign", "지원하지 않는 텍스트 정렬입니다."));
  }

  return createMenuWidgetValidationResult(errors);
}

export function validateMenuWidgetsForPage(widgets: readonly MenuWidgetDraft[]): MenuWidgetValidationResult {
  const errors: MenuWidgetValidationError[] = [];
  const firstPageId = widgets[0]?.menuPageId ?? null;
  const seenIds = new Set<string>();
  const seenSortOrders = new Set<number>();

  if (widgets.length > MAX_MENU_WIDGETS_PER_PAGE) {
    errors.push(
      createMenuWidgetValidationError(
        "TOO_MANY_WIDGETS",
        "widgets",
        `한 페이지에는 위젯을 최대 ${MAX_MENU_WIDGETS_PER_PAGE}개까지 등록할 수 있습니다.`,
      ),
    );
  }

  widgets.forEach((widget, index) => {
    const widgetValidation = validateMenuWidgetDraft(widget);
    const widgetErrors: readonly MenuWidgetValidationError[] = widgetValidation.errors;
    widgetErrors.forEach((error) => errors.push({ ...error, field: `widgets.${index}.${error.field}` }));

    if (firstPageId != null && widget.menuPageId !== firstPageId) {
      errors.push(createMenuWidgetValidationError("MIXED_PAGE_WIDGETS", `widgets.${index}.menuPageId`, "한 번에 한 페이지의 위젯만 저장할 수 있습니다."));
    }

    const normalizedId = normalizeText(widget.id);
    if (seenIds.has(normalizedId)) {
      errors.push(createMenuWidgetValidationError("DUPLICATE_WIDGET_ID", `widgets.${index}.id`, "중복된 위젯 ID가 있습니다."));
    }
    seenIds.add(normalizedId);

    if (seenSortOrders.has(widget.sortOrder)) {
      errors.push(createMenuWidgetValidationError("DUPLICATE_SORT_ORDER", `widgets.${index}.sortOrder`, "중복된 sortOrder는 저장 전 재정렬이 필요합니다."));
    }
    seenSortOrders.add(widget.sortOrder);
  });

  return createMenuWidgetValidationResult(errors);
}

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function normalizeNullableText(value: unknown): string | null {
  const text = normalizeText(value);
  return text || null;
}

function normalizeSortOrder(value: number): number {
  return Number.isFinite(value) ? Math.trunc(value) : 0;
}

function requireMenuWidgetAspectRatio(value: unknown): MenuWidgetAspectRatio {
  if (!isMenuWidgetAspectRatio(value)) throw new TypeError("Invalid menu widget aspect ratio.");
  return value;
}

function requireMenuWidgetObjectFit(value: unknown): MenuWidgetObjectFit {
  if (!isMenuWidgetObjectFit(value)) throw new TypeError("Invalid menu widget object fit.");
  return value;
}

function requireMenuWidgetTextAlign(value: unknown): MenuWidgetTextAlign {
  if (!isMenuWidgetTextAlign(value)) throw new TypeError("Invalid menu widget text align.");
  return value;
}

function createMenuWidgetValidationError(
  code: MenuWidgetValidationErrorCode,
  field: string,
  message: string,
): MenuWidgetValidationError {
  return { code, field, message };
}

function createMenuWidgetValidationResult(errors: MenuWidgetValidationError[]): MenuWidgetValidationResult {
  return errors.length > 0 ? { valid: false, errors } : { valid: true, errors: [] };
}
