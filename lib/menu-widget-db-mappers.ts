import type { Database, Json } from "@/lib/supabase/types";
import {
  MENU_WIDGET_SETTINGS_VERSION,
  type MenuImageTextWidget,
  type MenuImageWidget,
  type MenuTextWidget,
  type MenuWidget,
  type MenuWidgetAspectRatio,
  type MenuWidgetDraft,
  type MenuWidgetObjectFit,
  type MenuWidgetSettingsV1,
  type MenuWidgetTextAlign,
  type MenuWidgetType,
  type MenuWidgetValidationError,
  isMenuWidgetAspectRatio,
  isMenuWidgetObjectFit,
  isMenuWidgetTextAlign,
  isMenuWidgetType,
  normalizeMenuWidgetDraft,
  validateMenuWidgetDraft,
} from "@/lib/menu-widgets";

export type MenuWidgetRow = Database["public"]["Tables"]["menu_widgets"]["Row"];
export type MenuWidgetInsert = Database["public"]["Tables"]["menu_widgets"]["Insert"];
export type MenuWidgetUpdate = Database["public"]["Tables"]["menu_widgets"]["Update"];

export const LEGACY_MENU_WIDGET_TYPES = ["notice_text", "image_banner", "option_list", "store_info"] as const;

export type LegacyMenuWidgetType = (typeof LEGACY_MENU_WIDGET_TYPES)[number];

export type MenuWidgetRowParseIssueCode =
  | "UNSUPPORTED_LEGACY_TYPE"
  | "INVALID_WIDGET_TYPE"
  | "INVALID_SETTINGS"
  | "UNSUPPORTED_SETTINGS_VERSION"
  | "INVALID_PAGE_ID"
  | "INVALID_SITE_ID"
  | "INVALID_SORT_ORDER"
  | "MISSING_IMAGE"
  | "MISSING_TEXT"
  | "INVALID_ASPECT_RATIO"
  | "INVALID_OBJECT_FIT"
  | "INVALID_TEXT_ALIGN";

export type MenuWidgetRowParseIssue = {
  code: MenuWidgetRowParseIssueCode;
  widgetId: string;
  field: string;
  message: string;
};

export type MenuWidgetRowParseResult =
  | {
      ok: true;
      widget: MenuWidget;
      issues: [];
    }
  | {
      ok: false;
      widget: null;
      issues: MenuWidgetRowParseIssue[];
    };

export type MenuWidgetInsertPayloadResult =
  | {
      ok: true;
      payload: MenuWidgetInsert;
      errors: [];
    }
  | {
      ok: false;
      payload: null;
      errors: MenuWidgetValidationError[];
    };

export type MenuWidgetUpdatePayloadResult =
  | {
      ok: true;
      payload: MenuWidgetUpdate;
      errors: [];
    }
  | {
      ok: false;
      payload: null;
      errors: MenuWidgetValidationError[];
    };

export function isLegacyMenuWidgetType(value: unknown): value is LegacyMenuWidgetType {
  return typeof value === "string" && LEGACY_MENU_WIDGET_TYPES.includes(value as LegacyMenuWidgetType);
}

export function parseMenuWidgetRow(row: MenuWidgetRow): MenuWidgetRowParseResult {
  const issues: MenuWidgetRowParseIssue[] = [];
  const widgetId = normalizeText(row.id) || row.id;

  if (isLegacyMenuWidgetType(row.widget_type)) {
    return {
      ok: false,
      widget: null,
      issues: [
        createRowIssue(
          "UNSUPPORTED_LEGACY_TYPE",
          widgetId,
          "widget_type",
          "기존 위젯 유형은 CafeA MVP 위젯으로 자동 변환하지 않습니다.",
        ),
      ],
    };
  }

  if (!isMenuWidgetType(row.widget_type)) {
    return {
      ok: false,
      widget: null,
      issues: [createRowIssue("INVALID_WIDGET_TYPE", widgetId, "widget_type", "지원하지 않는 위젯 유형입니다.")],
    };
  }

  const type = row.widget_type;
  const menuSiteId = normalizeText(row.menu_site_id);
  const menuPageId = normalizeText(row.menu_page_id);
  const title = normalizeText(row.title);
  const description = normalizeText(row.description);
  const imageUrl = normalizeNullableText(row.image_url);
  const imagePath = normalizeNullableText(row.image_path);
  const sortOrder = row.sort_order;
  const hasImage = Boolean(imageUrl || imagePath);
  const hasText = Boolean(title || description);

  if (!menuSiteId) {
    issues.push(createRowIssue("INVALID_SITE_ID", widgetId, "menu_site_id", "메뉴 사이트 ID가 필요합니다."));
  }

  if (!menuPageId) {
    issues.push(createRowIssue("INVALID_PAGE_ID", widgetId, "menu_page_id", "메뉴 페이지 ID가 필요합니다."));
  }

  if (!Number.isInteger(sortOrder) || sortOrder < 0) {
    issues.push(createRowIssue("INVALID_SORT_ORDER", widgetId, "sort_order", "정렬 순서는 0 이상의 정수여야 합니다."));
  }

  if ((type === "image" || type === "image_text") && !hasImage) {
    issues.push(createRowIssue("MISSING_IMAGE", widgetId, "image_url", "이미지 위젯에는 이미지가 필요합니다."));
  }

  if ((type === "text" || type === "image_text") && !hasText) {
    issues.push(createRowIssue("MISSING_TEXT", widgetId, "description", "텍스트 위젯에는 제목 또는 본문이 필요합니다."));
  }

  const settingsResult = parseMenuWidgetSettings(row.settings, type, widgetId);
  issues.push(...settingsResult.issues);

  if (issues.length > 0 || settingsResult.settings == null) {
    return { ok: false, widget: null, issues };
  }

  const base = {
    id: widgetId,
    menuSiteId,
    menuPageId,
    type,
    sortOrder,
    visible: Boolean(row.visible),
  };

  if (type === "image") {
    const widget: MenuImageWidget = {
      ...base,
      type,
      imageUrl,
      imagePath,
      title: null,
      description: null,
      settings: settingsResult.settings as MenuImageWidget["settings"],
    };
    return { ok: true, widget, issues: [] };
  }

  if (type === "text") {
    const widget: MenuTextWidget = {
      ...base,
      type,
      imageUrl: null,
      imagePath: null,
      title: title || null,
      description,
      settings: settingsResult.settings as MenuTextWidget["settings"],
    };
    return { ok: true, widget, issues: [] };
  }

  const widget: MenuImageTextWidget = {
    ...base,
    type,
    imageUrl,
    imagePath,
    title: title || null,
    description,
    settings: settingsResult.settings as MenuImageTextWidget["settings"],
  };
  return { ok: true, widget, issues: [] };
}

export function parseMenuWidgetRows(rows: readonly MenuWidgetRow[]): {
  widgets: MenuWidget[];
  issues: MenuWidgetRowParseIssue[];
} {
  const widgets: MenuWidget[] = [];
  const issues: MenuWidgetRowParseIssue[] = [];

  rows.forEach((row) => {
    const result = parseMenuWidgetRow(row);
    if (result.ok) {
      widgets.push(result.widget);
    } else {
      issues.push(...result.issues);
    }
  });

  return { widgets, issues };
}

export function serializeMenuWidgetSettings(widget: MenuWidget): MenuWidgetSettingsV1 {
  if (widget.type === "image") {
    return createImageSettings(widget.settings.aspectRatio, widget.settings.objectFit, widget.settings.altText);
  }

  if (widget.type === "text") {
    return createTextSettings(widget.settings.textAlign);
  }

  return {
    ...createImageSettings(widget.settings.aspectRatio, widget.settings.objectFit, widget.settings.altText),
    textAlign: widget.settings.textAlign,
  };
}

export function createMenuWidgetInsertPayload(args: {
  menuSiteId: string;
  draft: MenuWidgetDraft;
}): MenuWidgetInsertPayloadResult {
  const validation = validateMenuWidgetDraft(args.draft);
  if (!validation.valid) {
    return { ok: false, payload: null, errors: validation.errors };
  }

  try {
    const widget = normalizeMenuWidgetDraft(args.draft, { menuSiteId: args.menuSiteId });
    return {
      ok: true,
      payload: {
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
        settings: serializeMenuWidgetSettings(widget) as Json,
      },
      errors: [],
    };
  } catch {
    return {
      ok: false,
      payload: null,
      errors: [createValidationError("INVALID_TYPE", "type", "위젯 저장 payload를 만들 수 없습니다.")],
    };
  }
}

export function createMenuWidgetUpdatePayload(
  draft: MenuWidgetDraft,
  options: { includePageId?: boolean } = {},
): MenuWidgetUpdatePayloadResult {
  const validation = validateMenuWidgetDraft(draft);
  if (!validation.valid) {
    return { ok: false, payload: null, errors: validation.errors };
  }

  try {
    const widget = normalizeMenuWidgetDraft(draft, { menuSiteId: "__update_payload_menu_site_id__" });
    return {
      ok: true,
      payload: {
        ...(options.includePageId ? { menu_page_id: widget.menuPageId } : {}),
        widget_type: widget.type,
        title: widget.title,
        description: widget.description,
        image_url: widget.imageUrl,
        image_path: widget.imagePath,
        sort_order: widget.sortOrder,
        visible: widget.visible,
        settings: serializeMenuWidgetSettings(widget) as Json,
      },
      errors: [],
    };
  } catch {
    return {
      ok: false,
      payload: null,
      errors: [createValidationError("INVALID_TYPE", "type", "위젯 수정 payload를 만들 수 없습니다.")],
    };
  }
}

function parseMenuWidgetSettings(
  settings: MenuWidgetRow["settings"],
  type: MenuWidgetType,
  widgetId: string,
):
  | {
      settings:
        | MenuImageWidget["settings"]
        | MenuTextWidget["settings"]
        | MenuImageTextWidget["settings"];
      issues: [];
    }
  | {
      settings: null;
      issues: MenuWidgetRowParseIssue[];
    } {
  const issues: MenuWidgetRowParseIssue[] = [];

  if (settings != null && !isPlainObject(settings)) {
    return {
      settings: null,
      issues: [createRowIssue("INVALID_SETTINGS", widgetId, "settings", "위젯 설정은 JSON object여야 합니다.")],
    };
  }

  const objectSettings = isPlainObject(settings) ? settings : {};
  const schemaVersion = objectSettings.schemaVersion;

  if (schemaVersion != null && schemaVersion !== MENU_WIDGET_SETTINGS_VERSION) {
    return {
      settings: null,
      issues: [
        createRowIssue(
          "UNSUPPORTED_SETTINGS_VERSION",
          widgetId,
          "settings.schemaVersion",
          "지원하지 않는 위젯 설정 버전입니다.",
        ),
      ],
    };
  }

  for (const key of ["aspectRatio", "objectFit", "textAlign", "altText"] as const) {
    const value = objectSettings[key];
    if (value != null && typeof value !== "string") {
      issues.push(createRowIssue("INVALID_SETTINGS", widgetId, `settings.${key}`, "위젯 설정 값은 문자열이어야 합니다."));
    }
  }

  const aspectRatio = getOptionalStringSetting(objectSettings, "aspectRatio");
  const objectFit = getOptionalStringSetting(objectSettings, "objectFit");
  const textAlign = getOptionalStringSetting(objectSettings, "textAlign");
  const altText = getOptionalStringSetting(objectSettings, "altText");

  if (aspectRatio != null && !isMenuWidgetAspectRatio(aspectRatio)) {
    issues.push(createRowIssue("INVALID_ASPECT_RATIO", widgetId, "settings.aspectRatio", "지원하지 않는 이미지 비율입니다."));
  }

  if (objectFit != null && !isMenuWidgetObjectFit(objectFit)) {
    issues.push(createRowIssue("INVALID_OBJECT_FIT", widgetId, "settings.objectFit", "지원하지 않는 이미지 맞춤 방식입니다."));
  }

  if (textAlign != null && !isMenuWidgetTextAlign(textAlign)) {
    issues.push(createRowIssue("INVALID_TEXT_ALIGN", widgetId, "settings.textAlign", "지원하지 않는 텍스트 정렬입니다."));
  }

  if (issues.length > 0) {
    return { settings: null, issues };
  }

  const normalizedAltText = normalizeText(altText);

  if (type === "image") {
    return {
      settings: createImageSettings(
        (aspectRatio as MenuWidgetAspectRatio | null) ?? "2:1",
        (objectFit as MenuWidgetObjectFit | null) ?? "cover",
        normalizedAltText,
      ),
      issues: [],
    };
  }

  if (type === "text") {
    return {
      settings: createTextSettings((textAlign as MenuWidgetTextAlign | null) ?? "left"),
      issues: [],
    };
  }

  return {
    settings: {
      ...createImageSettings(
        (aspectRatio as MenuWidgetAspectRatio | null) ?? "4:3",
        (objectFit as MenuWidgetObjectFit | null) ?? "cover",
        normalizedAltText,
      ),
      textAlign: (textAlign as MenuWidgetTextAlign | null) ?? "left",
    },
    issues: [],
  };
}

function createImageSettings(
  aspectRatio: MenuWidgetAspectRatio,
  objectFit: MenuWidgetObjectFit,
  altText?: string | null,
): MenuImageWidget["settings"] {
  const normalizedAltText = normalizeText(altText);
  return {
    schemaVersion: MENU_WIDGET_SETTINGS_VERSION,
    aspectRatio,
    objectFit,
    ...(normalizedAltText ? { altText: normalizedAltText } : {}),
  };
}

function createTextSettings(textAlign: MenuWidgetTextAlign): MenuTextWidget["settings"] {
  return {
    schemaVersion: MENU_WIDGET_SETTINGS_VERSION,
    textAlign,
  };
}

function getOptionalStringSetting(settings: Record<string, unknown>, key: string): string | null {
  const value = settings[key];
  if (value == null) return null;
  return typeof value === "string" ? value : null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value != null && !Array.isArray(value);
}

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function normalizeNullableText(value: unknown): string | null {
  const text = normalizeText(value);
  return text || null;
}

function createRowIssue(
  code: MenuWidgetRowParseIssueCode,
  widgetId: string,
  field: string,
  message: string,
): MenuWidgetRowParseIssue {
  return { code, widgetId, field, message };
}

function createValidationError(
  code: MenuWidgetValidationError["code"],
  field: string,
  message: string,
): MenuWidgetValidationError {
  return { code, field, message };
}
