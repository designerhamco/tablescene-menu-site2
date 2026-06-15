import { getTemplateCapabilities } from "@/lib/template-capabilities";
import type { Database, Json } from "@/lib/supabase/types";

export const MENU_WIDGET_TYPES = ["notice_text", "image_banner", "option_list", "store_info"] as const;

export type WidgetType = (typeof MENU_WIDGET_TYPES)[number];

export type MenuWidget = Database["public"]["Tables"]["menu_widgets"]["Row"];
export type MenuWidgetItem = Database["public"]["Tables"]["menu_widget_items"]["Row"];

export type MenuWidgetItemDraft = {
  id: string;
  isNew?: boolean;
  title: string;
  description?: string;
  value?: string;
  price?: string | number | null;
  priceLabel?: string | null;
  imageUrl?: string | null;
  imagePath?: string | null;
  linkUrl?: string | null;
  visible?: boolean;
  sortOrder?: number;
  settings?: Json;
};

export type MenuWidgetDraft = {
  id: string;
  isNew?: boolean;
  menuPageId?: string;
  widgetType: WidgetType;
  title?: string;
  description?: string;
  imageUrl?: string | null;
  imagePath?: string | null;
  linkUrl?: string | null;
  visible?: boolean;
  sortOrder?: number;
  settings?: Json;
  items?: MenuWidgetItemDraft[];
};

export const MENU_WIDGET_TYPE_LABELS: Record<WidgetType, string> = {
  notice_text: "안내 텍스트형",
  image_banner: "이미지 배너형",
  option_list: "선택 옵션형",
  store_info: "매장 정보형",
};

export const MENU_WIDGET_TYPE_DESCRIPTIONS: Record<WidgetType, string> = {
  notice_text: "와이파이, 이용 안내, 공지사항처럼 자유로운 안내문을 보여줍니다.",
  image_banner: "포스터, 이벤트 이미지, 안내 이미지를 메뉴판에 보여줍니다.",
  option_list: "원두 선택, 소스 추가, 토핑 안내처럼 선택 가능한 항목을 보여줍니다.",
  store_info: "영업시간, 주소, SNS, 주차 안내 같은 매장 정보를 보여줍니다.",
};

export const MENU_WIDGET_LIMITS = {
  maxWidgetsPerPage: 8,
  maxItemsPerWidget: 8,
  title: 80,
  description: 500,
  itemTitle: 80,
  itemDescription: 300,
  itemValue: 240,
  priceLabel: 40,
  url: 500,
} as const;

export function isWidgetType(value: unknown): value is WidgetType {
  return MENU_WIDGET_TYPES.includes(value as WidgetType);
}

export function getWidgetTypeLabel(type: string | null | undefined) {
  return isWidgetType(type) ? MENU_WIDGET_TYPE_LABELS[type] : "위젯";
}

export function getAllowedWidgetTypesForTemplate(templateKey: string | null | undefined): WidgetType[] {
  return getTemplateCapabilities(templateKey).widgets.allowedTypes;
}

export function normalizeMenuWidgetItem(input: Partial<MenuWidgetItemDraft> | Partial<MenuWidgetItem>): MenuWidgetItemDraft {
  return {
    id: normalizeString(input.id),
    isNew: "isNew" in input ? input.isNew === true : undefined,
    title: normalizeString(input.title),
    description: normalizeString(input.description),
    value: normalizeString("value" in input ? input.value : undefined),
    price: "price" in input ? input.price ?? null : null,
    priceLabel: normalizeString("priceLabel" in input ? input.priceLabel : "price_label" in input ? input.price_label : undefined),
    imageUrl: normalizeNullableString("imageUrl" in input ? input.imageUrl : "image_url" in input ? input.image_url : undefined),
    imagePath: normalizeNullableString("imagePath" in input ? input.imagePath : "image_path" in input ? input.image_path : undefined),
    linkUrl: normalizeNullableString("linkUrl" in input ? input.linkUrl : "link_url" in input ? input.link_url : undefined),
    visible: input.visible === undefined ? true : input.visible === true,
    sortOrder: normalizeNumber("sortOrder" in input ? input.sortOrder : "sort_order" in input ? input.sort_order : undefined),
    settings: normalizeJsonObject(input.settings),
  };
}

export function normalizeMenuWidget(input: Partial<MenuWidgetDraft> | Partial<MenuWidget>): MenuWidgetDraft {
  const rawWidgetType = "widgetType" in input ? input.widgetType : "widget_type" in input ? input.widget_type : undefined;
  const widgetType = isWidgetType(rawWidgetType) ? rawWidgetType : "notice_text";

  return {
    id: normalizeString(input.id),
    isNew: "isNew" in input ? input.isNew === true : undefined,
    menuPageId: normalizeString("menuPageId" in input ? input.menuPageId : "menu_page_id" in input ? input.menu_page_id : undefined),
    widgetType,
    title: normalizeString(input.title),
    description: normalizeString(input.description),
    imageUrl: normalizeNullableString("imageUrl" in input ? input.imageUrl : "image_url" in input ? input.image_url : undefined),
    imagePath: normalizeNullableString("imagePath" in input ? input.imagePath : "image_path" in input ? input.image_path : undefined),
    linkUrl: normalizeNullableString("linkUrl" in input ? input.linkUrl : "link_url" in input ? input.link_url : undefined),
    visible: input.visible === undefined ? true : input.visible === true,
    sortOrder: normalizeNumber("sortOrder" in input ? input.sortOrder : "sort_order" in input ? input.sort_order : undefined),
    settings: normalizeJsonObject(input.settings),
    items: "items" in input && Array.isArray(input.items) ? input.items.map(normalizeMenuWidgetItem) : [],
  };
}

export function validateMenuWidget(widget: MenuWidgetDraft, allowedTypes: readonly WidgetType[] = MENU_WIDGET_TYPES) {
  if (!isWidgetType(widget.widgetType) || !allowedTypes.includes(widget.widgetType)) {
    return { ok: false as const, message: "이 템플릿에서 사용할 수 없는 위젯 종류입니다." };
  }

  if (!widget.menuPageId) {
    return { ok: false as const, message: "위젯을 추가할 메뉴 페이지를 찾을 수 없습니다." };
  }

  const title = normalizeString(widget.title);
  const description = normalizeString(widget.description);
  if (title.length > MENU_WIDGET_LIMITS.title) {
    return { ok: false as const, message: "위젯 제목은 최대 80자까지 입력 가능합니다." };
  }
  if (description.length > MENU_WIDGET_LIMITS.description) {
    return { ok: false as const, message: "위젯 설명은 최대 500자까지 입력 가능합니다." };
  }
  if (widget.linkUrl && !isValidHttpUrl(widget.linkUrl)) {
    return { ok: false as const, message: "위젯 링크 URL은 http:// 또는 https://로 시작해야 합니다." };
  }
  if (widget.widgetType === "notice_text" && !title && !description) {
    return { ok: false as const, message: "안내 텍스트형 위젯은 제목 또는 안내 내용을 입력해주세요." };
  }
  if (widget.widgetType === "image_banner" && !widget.imageUrl && !widget.imagePath) {
    return { ok: false as const, message: "이미지 배너형 위젯은 이미지 URL 또는 업로드된 이미지가 필요합니다." };
  }

  return { ok: true as const };
}

export function validateMenuWidgetItems(widgetType: WidgetType, items: MenuWidgetItemDraft[], maxItems: number = MENU_WIDGET_LIMITS.maxItemsPerWidget) {
  if (widgetType !== "option_list" && widgetType !== "store_info") {
    return { ok: true as const };
  }

  const activeItems = items.filter((item) => normalizeString(item.title) || normalizeString(item.description) || normalizeString(item.value));
  if (activeItems.length === 0) {
    return { ok: false as const, message: "리스트형 위젯은 항목을 1개 이상 입력해주세요." };
  }
  if (activeItems.length > maxItems) {
    return { ok: false as const, message: `위젯 항목은 최대 ${maxItems}개까지 등록할 수 있습니다.` };
  }

  for (const item of activeItems) {
    if (!normalizeString(item.title)) {
      return { ok: false as const, message: widgetType === "store_info" ? "매장 정보 항목의 라벨을 입력해주세요." : "선택 옵션 항목명을 입력해주세요." };
    }
    if (normalizeString(item.title).length > MENU_WIDGET_LIMITS.itemTitle) {
      return { ok: false as const, message: "위젯 항목명은 최대 80자까지 입력 가능합니다." };
    }
    if (normalizeString(item.description).length > MENU_WIDGET_LIMITS.itemDescription) {
      return { ok: false as const, message: "위젯 항목 설명은 최대 300자까지 입력 가능합니다." };
    }
    if (normalizeString(item.value).length > MENU_WIDGET_LIMITS.itemValue) {
      return { ok: false as const, message: "위젯 항목 내용은 최대 240자까지 입력 가능합니다." };
    }
    if (normalizeString(item.priceLabel).length > MENU_WIDGET_LIMITS.priceLabel) {
      return { ok: false as const, message: "위젯 항목 표시용 가격은 최대 40자까지 입력 가능합니다." };
    }
    if (item.linkUrl && !isValidHttpUrl(item.linkUrl)) {
      return { ok: false as const, message: "위젯 항목 링크 URL은 http:// 또는 https://로 시작해야 합니다." };
    }
  }

  return { ok: true as const };
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

function normalizeNullableString(value: unknown) {
  const normalized = normalizeString(value);
  return normalized || null;
}

function normalizeNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function normalizeJsonObject(value: unknown): Json {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Json) : {};
}

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
