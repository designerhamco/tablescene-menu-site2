"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

import {
  createCategoryAction,
  createMenuItemAction,
  createMenuPageAction,
  generateAiMenuCleanupAction,
  generateMenuItemDescriptionAction,
  saveMenuManagementBasicDraftAction,
  updateCategoryAction,
  updateMenuItemAction,
  updateMenuPageAction,
} from "@/app/mypage/menus/actions";
import AiUsageMeter from "@/components/mypage/menu-editor/AiUsageMeter";
import ImageUploadField from "@/components/mypage/menu-editor/ImageUploadField";
import SwitchField from "@/components/mypage/menu-editor/SwitchField";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import type { StarterPreset } from "@/lib/menu-starter-presets";
import {
  DEFAULT_MENU_PAGE_DISPLAY_SETTINGS,
  DEFAULT_PROMOTION_PAGE_DISPLAY_SETTINGS,
  DISPLAY_MENU_LAYOUT_TYPES,
  DISPLAY_PAGE_TYPES,
  DISPLAY_PROMOTION_MEDIA_TYPES,
  getDisplayMenuLayoutTypeLabel,
  getDisplayPageTypeLabel,
  getDisplayPromotionMediaTypeLabel,
  isPromotionDisplayPage,
  normalizeMenuPageDisplaySettings,
  type MenuPageDisplaySettings,
} from "@/lib/display-page-settings";
import {
  DISPLAY_VIDEO_UPLOAD_ADDON_NAME,
  DISPLAY_VIDEO_UPLOAD_ACCEPTED_MIME_TYPES,
  DISPLAY_VIDEO_UPLOAD_MAX_ACTIVE_FILES,
  DISPLAY_VIDEO_UPLOAD_MAX_FILE_SIZE_MB,
  DISPLAY_VIDEO_UPLOAD_MONTHLY_PRICE,
  DISPLAY_VIDEO_UPLOAD_RECOMMENDED_DURATION,
  DISPLAY_VIDEO_UPLOAD_RECOMMENDED_FILE_SIZE_MB,
  DISPLAY_VIDEO_UPLOAD_YEARLY_PRICE,
} from "@/lib/display-video-upload-policy";
import {
  getMenuItemBadgeLabel,
  MENU_BADGE_CUSTOM_VALUE,
  MENU_BADGE_MAX_LENGTH,
  MENU_BADGE_OPTIONS,
  PRICE_LIST_BADGE_OPTIONS,
  normalizeMenuBadgeLabel,
} from "@/lib/menu-badges";
import type { AiUsage } from "@/lib/menu-ai-usage";
import { DISPLAY_MENU_QUALITY_RULES, getDisplayMenuPageQuality, type DisplayMenuPageQuality } from "@/lib/display-menu-quality";
import { MENU_FIELD_LIMITS, MENU_LIMITS } from "@/lib/menu-limits";
import {
  DEFAULT_TIME_SALE_BADGE_BACKGROUND_COLOR,
  DEFAULT_TIME_SALE_DISPLAY_MODE,
  DEFAULT_TIME_SALE_BADGE_TEXT,
  TIME_SALE_BADGE_TEXT_MAX_LENGTH,
  getReadableTextColorForTimeSaleBadge,
  normalizeTimeSaleBadgeBackgroundColor,
  parseTimeSalePriceInputToWon,
  toLocalDateTimeInputValue,
  type MenuEditorTimeSale,
  type TimeSaleDisplayMode,
} from "@/lib/menu-time-sales";
import { normalizePriceDisplayMode, type PriceDisplayMode } from "@/lib/menu-price-format";
import {
  BASIC_LAYOUT_MODE_ORDER,
  DEFAULT_PC_TABLET_LAYOUT_MODE,
  normalizePcTabletLayoutMode,
  type PcTabletLayoutMode,
} from "@/lib/menu-layout-modes";
import type { Database } from "@/lib/supabase/types";
import {
  BADGE_STYLE_LABELS,
  getBadgeStyleCss,
  getBadgeStyleKey,
  type BadgeStyle,
  type BadgeStyleKey,
  type BadgeStyles,
} from "@/lib/template-badge-styles";
import { buildDisplayMenuAPreviewData } from "@/lib/template-demo-data/display-menu-a";
import type { TemplateCapabilities } from "@/lib/template-capabilities";
import { getEditorLabelsByTemplateType, type TemplateEditorLabels } from "@/lib/template-types";
import { formatMenuPrice, formatPortionLabel, getMenuPageTitle, sortMenuPages } from "@/types/menu";

type MenuPage = Pick<
  Database["public"]["Tables"]["menu_pages"]["Row"],
  "id" | "title" | "description" | "description_visible" | "display_settings" | "legacy_section_key" | "visible" | "sort_order" | "created_at"
>;
type MenuCategory = Pick<
  Database["public"]["Tables"]["menu_categories"]["Row"],
  "id" | "menu_page_id" | "name" | "description" | "description_visible" | "sort_order" | "visible"
> & {
  section_key: string | null;
  priceColumns?: CategoryPriceColumnDraft[];
};
type MenuItem = Omit<Pick<
  Database["public"]["Tables"]["menu_items"]["Row"],
  | "id"
  | "category_id"
  | "name"
  | "set_name"
  | "description"
  | "price"
  | "price_label"
  | "price_note"
  | "price_visible"
  | "portion_label"
  | "portion_visible"
  | "image_url"
  | "image_path"
  | "badge_label"
  | "badge_type"
  | "recommended"
  | "origin_info"
  | "is_best"
  | "is_sold_out"
  | "traits_visible"
  | "visible"
  | "sort_order"
>, "price"> & {
  price: number | null;
  priceColumnValues?: ItemPriceColumnValueDraft[];
};
type MenuItemTrait = Database["public"]["Tables"]["menu_item_traits"]["Row"];
type MenuItemPriceOption = Database["public"]["Tables"]["menu_item_price_options"]["Row"];

type MenuManagementSectionProps = {
  menuId: string;
  menuPages: MenuPage[];
  categories: MenuCategory[];
  items: MenuItem[];
  priceOptions: MenuItemPriceOption[];
  traits: MenuItemTrait[];
  capabilities: TemplateCapabilities;
  canManageTimeSales?: boolean;
  canManageCategoryPriceColumns?: boolean;
  maxCategoryPriceColumns?: number;
  supportsPriceDisplayMode?: boolean;
  supportsPriceNote?: boolean;
  supportsPriceNoteWithPriceColumns?: boolean;
  priceDisplayMode?: PriceDisplayMode;
  timeSales?: MenuEditorTimeSale[];
  canManagePages: boolean;
  supportsDisplayPageTypes?: boolean;
  supportsDisplayPromotionPages?: boolean;
  supportsDisplayMenuLayoutTypes?: boolean;
  aiDescriptionUsage: AiUsage;
  aiMenuCleanupUsage: AiUsage;
  badgeStyles: BadgeStyles;
  editorLabels?: TemplateEditorLabels;
  starterPreset?: StarterPreset | null;
  canConfigurePcTabletLayoutMode?: boolean;
  pcTabletLayoutMode?: PcTabletLayoutMode;
  canUseDisplayVideoUpload?: boolean;
  finalSaveMessage?: string | null;
  finalSaveError?: string | null;
};
type DraftTarget =
  | { type: "page"; title: string; description?: string; descriptionVisible?: boolean; visible?: boolean; displaySettings?: MenuPageDisplaySettings }
  | {
      type: "category";
      pageId: string;
      title: string;
      description?: string;
      descriptionVisible?: boolean;
      visible?: boolean;
      priceOptionLabels?: string[];
      priceColumns?: CategoryPriceColumnDraft[];
    };
type DragState =
  | { type: "page"; id: string }
  | { type: "category"; id: string; pageId: string }
  | { type: "item"; id: string; categoryId: string }
  | null;

type PageBasicDraft = {
  isNew?: boolean;
  title: string;
  description?: string;
  descriptionVisible?: boolean;
  visible?: boolean;
  sortOrder: number;
  displaySettings?: MenuPageDisplaySettings;
};

type CategoryBasicDraft = {
  isNew?: boolean;
  pageId?: string;
  name: string;
  description?: string;
  descriptionVisible?: boolean;
  visible?: boolean;
  sortOrder: number;
  priceOptionLabels?: string[];
  priceColumns?: CategoryPriceColumnDraft[];
};

type CategoryPriceColumnDraft = {
  id?: string;
  key: string;
  label: string;
  visible: boolean;
  sortOrder: number;
};

type ItemBasicDraft = {
  categoryId?: string;
  isNew?: boolean;
  imageUrl?: string | null;
  imagePath?: string | null;
  imageAction?: "keep" | "replace" | "delete";
  name: string;
  setName: string;
  description: string;
  originInfo: string;
  price: string;
  priceLabel: string;
  singlePriceInputMode?: SinglePriceInputMode;
  priceNote?: string;
  badgeLabel: string;
  visible: boolean;
  sortOrder: number;
  portionLabel?: string;
  priceVisible?: boolean;
  priceMode?: PriceMode;
  portionVisible?: boolean;
  traitsVisible?: boolean;
  traitDrafts?: ItemTraitDraft[];
  priceOptions?: DraftPriceOption[];
  priceColumnValues?: ItemPriceColumnValueDraft[];
  timeSale?: ItemTimeSaleDraft;
  badgeStyleKey?: BadgeStyleKey;
  badgeBackgroundColor?: string;
  badgeTextColor?: string;
};

type SinglePriceInputMode = "number" | "text";

type AiMenuCleanupItem = {
  name: string;
  price: number | null;
  price_label: string;
  description: string;
  badge_label: string;
};

type AiMenuCleanupCategory = {
  name: string;
  description: string;
  items: AiMenuCleanupItem[];
};

type AiMenuCleanupResult = {
  categories: AiMenuCleanupCategory[];
};
type ItemTraitDraft = {
  id?: string;
  label: string;
  value: number;
  visible: boolean;
  sortOrder: number;
  maxValue?: number;
};
type PriceMode = "single" | "options";
type ItemTimeSaleDraft = {
  enabled: boolean;
  name: string;
  salePrice: string;
  targets?: ItemTimeSaleTargetDraft[];
  startsAt: string;
  endsAt: string;
  timeDisplayMode: TimeSaleDisplayMode;
  badgeText: string;
  badgeBackgroundColor: string;
  active: boolean;
};
type ItemTimeSaleTargetDraft = {
  priceColumnId: string | null;
  salePrice: string;
  salePriceLabel?: string | null;
  visible: boolean;
};
type DraftPriceOption = {
  id: string;
  label: string;
  price: string;
  priceLabel: string;
  visible: boolean;
  sortOrder: number;
};
type ItemPriceColumnValueDraft = {
  id?: string;
  priceColumnId: string;
  price: string;
  priceLabel: string;
  visible: boolean;
  sortOrder: number;
};
type DisplayVideoUploadState =
  | { type: "idle"; message: string | null }
  | { type: "loading"; message: string }
  | { type: "success"; message: string }
  | { type: "error"; message: string };

function normalizeDraftPriceOptionLabels(labels: readonly string[] | undefined, maxOptions: number = MENU_LIMITS.maxPriceOptionsPerItem) {
  const seen = new Set<string>();

  return (labels ?? [])
    .map((label) => label.trim())
    .filter((label) => {
      if (!label) return false;
      const key = label.toLocaleUpperCase("ko-KR");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, maxOptions);
}

function getCategoryPriceColumnKey(label: string, index: number) {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return slug || `column_${index + 1}`;
}

function normalizeCategoryPriceColumnDrafts(
  columns: readonly Partial<CategoryPriceColumnDraft>[] | undefined,
  maxColumns = 3
): CategoryPriceColumnDraft[] {
  return (columns ?? []).slice(0, maxColumns).map((column, index) => {
    const label = normalizeDraftText(column.label);
    return {
      id: normalizeDraftText(column.id) || undefined,
      key: normalizeDraftText(column.key) || getCategoryPriceColumnKey(label, index),
      label,
      visible: normalizeDraftBoolean(column.visible),
      sortOrder: Number.isFinite(Number(column.sortOrder)) ? Number(column.sortOrder) : index,
    };
  });
}

function copyCategoryPriceColumnDrafts(columns: readonly Partial<CategoryPriceColumnDraft>[] | undefined) {
  return normalizeCategoryPriceColumnDrafts(columns).map((column, index) => ({
    ...column,
    id: undefined,
    sortOrder: index,
  }));
}

function createCategoryPriceColumnDraft(index: number): CategoryPriceColumnDraft {
  return {
    key: `column_${index + 1}`,
    label: "",
    visible: true,
    sortOrder: index,
  };
}

function getCategoryPriceColumnValidationMessage(columns: readonly CategoryPriceColumnDraft[], maxColumns = 3) {
  if (columns.length > maxColumns) return `가격 옵션 컬럼은 최대 ${maxColumns}개까지 사용할 수 있습니다.`;

  const labelSet = new Set<string>();
  const keySet = new Set<string>();
  for (const column of columns) {
    const label = normalizeDraftText(column.label);
    if (!label) return "가격 옵션 컬럼 이름을 입력해주세요.";
    const labelKey = label.toLocaleUpperCase("ko-KR");
    if (labelSet.has(labelKey)) return "가격 옵션 컬럼 이름은 중복될 수 없습니다.";
    labelSet.add(labelKey);

    const key = normalizeDraftText(column.key) || getCategoryPriceColumnKey(label, column.sortOrder);
    if (keySet.has(key)) return "가격 옵션 컬럼 내부 키가 중복되었습니다.";
    keySet.add(key);
  }

  return "";
}

function areCategoryPriceColumnDraftsEqual(
  left: readonly Partial<CategoryPriceColumnDraft>[] | undefined,
  right: readonly Partial<CategoryPriceColumnDraft>[] | undefined
) {
  return JSON.stringify(normalizeCategoryPriceColumnDrafts(left)) === JSON.stringify(normalizeCategoryPriceColumnDrafts(right));
}

function normalizeItemPriceColumnValueDrafts(
  values: readonly Partial<ItemPriceColumnValueDraft>[] | undefined
): ItemPriceColumnValueDraft[] {
  return (values ?? [])
    .map((value, index) => ({
      id: normalizeDraftText(value.id) || undefined,
      priceColumnId: normalizeDraftText(value.priceColumnId),
      price: normalizeDraftText(value.price),
      priceLabel: normalizeDraftText(value.priceLabel),
      visible: normalizeDraftBoolean(value.visible),
      sortOrder: Number.isFinite(Number(value.sortOrder)) ? Number(value.sortOrder) : index,
    }))
    .filter((value) => value.priceColumnId)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.priceColumnId.localeCompare(b.priceColumnId));
}

function getItemPriceColumnValuesForColumns(
  values: readonly Partial<ItemPriceColumnValueDraft>[] | undefined,
  columns: readonly Partial<CategoryPriceColumnDraft>[] | undefined
): ItemPriceColumnValueDraft[] {
  const normalizedValues = normalizeItemPriceColumnValueDrafts(values);
  const valueByColumnId = new Map(normalizedValues.map((value) => [value.priceColumnId, value]));

  return normalizeCategoryPriceColumnDrafts(columns)
    .filter((column) => column.visible && column.id)
    .map((column, index) => {
      const source = valueByColumnId.get(column.id ?? "");
      return {
        id: source?.id,
        priceColumnId: column.id ?? "",
        price: source?.price ?? "",
        priceLabel: source?.priceLabel ?? "",
        visible: Boolean(normalizeDraftText(source?.price)),
        sortOrder: index,
      };
    });
}

function areItemPriceColumnValueDraftsEqual(
  left: readonly Partial<ItemPriceColumnValueDraft>[] | undefined,
  right: readonly Partial<ItemPriceColumnValueDraft>[] | undefined
) {
  return JSON.stringify(normalizeItemPriceColumnValueDrafts(left)) === JSON.stringify(normalizeItemPriceColumnValueDrafts(right));
}

function copyItemPriceColumnValueDrafts(values: readonly Partial<ItemPriceColumnValueDraft>[] | undefined) {
  return normalizeItemPriceColumnValueDrafts(values).map((value, index) => ({
    ...value,
    id: undefined,
    sortOrder: index,
  }));
}

function toDraftPriceOptionFromColumn(label: string, index: number, source?: DraftPriceOption | MenuItemPriceOption | null): DraftPriceOption {
  const sourcePrice = source && "price" in source && source.price != null ? String(source.price) : "";
  const sourcePriceLabel = source && "price_label" in source ? source.price_label ?? "" : source && "priceLabel" in source ? source.priceLabel : "";

  return {
    id: source && "id" in source ? source.id : `display-price-column-${index}-${label}`,
    label,
    price: sourcePrice,
    priceLabel: sourcePriceLabel,
    visible: source && "visible" in source ? source.visible : true,
    sortOrder: index,
  };
}

function getPriceOptionSortOrder(option: DraftPriceOption | MenuItemPriceOption) {
  return "sortOrder" in option ? option.sortOrder : option.sort_order;
}

const MENU_BUILDER_STATE_KEY_PREFIX = "tablescene:menu-editor:builder";
const PC_TABLET_LAYOUT_MODE_OPTION_LABELS = {
  orderedBalancedFit: {
    title: "묶음형 자동 배치",
    description: "카테고리 묶음을 유지하면서 화면에 균형 있게 배치합니다.",
  },
  orderedFit: {
    title: "채움형 배치",
    description: "등록한 순서대로 메뉴를 이어서 배치합니다.",
  },
} as const satisfies Record<PcTabletLayoutMode, { title: string; description: string }>;
const PC_TABLET_LAYOUT_MODE_OPTIONS = BASIC_LAYOUT_MODE_ORDER.map((value) => ({
  value,
  ...PC_TABLET_LAYOUT_MODE_OPTION_LABELS[value],
})) satisfies { value: PcTabletLayoutMode; title: string; description: string }[];

type MenuBuilderSavedState = {
  selectedPageId?: string;
  selectedCategoryId?: string;
  editingItemId?: string;
};

function readMenuBuilderState(menuId: string): MenuBuilderSavedState {
  if (typeof window === "undefined") return {};

  try {
    const rawValue = window.sessionStorage.getItem(`${MENU_BUILDER_STATE_KEY_PREFIX}:${menuId}`);
    return rawValue ? (JSON.parse(rawValue) as MenuBuilderSavedState) : {};
  } catch {
    return {};
  }
}

function toItemTraitDrafts(traits: MenuItemTrait[], stripIds = false): ItemTraitDraft[] {
  return [...traits]
    .sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at))
    .slice(0, MENU_LIMITS.maxTraitsPerItem)
    .map((trait) => ({
      id: stripIds ? undefined : trait.id,
      label: trait.label ?? "",
      value: trait.value ?? MENU_FIELD_LIMITS.menuItemTraits.minValue,
      visible: trait.visible,
      sortOrder: trait.sort_order,
      maxValue: trait.max_value ?? MENU_FIELD_LIMITS.menuItemTraits.defaultMaxValue,
    }));
}

function copyItemTraitDrafts(traitDrafts?: ItemTraitDraft[]) {
  return (traitDrafts ?? []).map((trait, index) => ({
    ...trait,
    id: undefined,
    sortOrder: index,
  }));
}

function normalizeDraftText(value: unknown) {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

function normalizeSinglePriceInputMode(value: unknown): SinglePriceInputMode {
  return value === "text" ? "text" : "number";
}

function getSinglePriceInputMode(draft?: Partial<ItemBasicDraft> | null, item?: MenuItem | null): SinglePriceInputMode {
  if (draft?.singlePriceInputMode) {
    return normalizeSinglePriceInputMode(draft.singlePriceInputMode);
  }

  const priceLabel = normalizeDraftText(draft?.priceLabel ?? item?.price_label ?? "");
  const rawPrice = normalizeDraftText(draft?.price ?? (item?.price == null ? "" : String(item.price)));
  const numericPrice = rawPrice ? Number(rawPrice) : null;
  const hasNumericPrice = Number.isFinite(numericPrice) && numericPrice != null && numericPrice > 0;
  return priceLabel && !hasNumericPrice ? "text" : "number";
}

function normalizeDraftBoolean(value: unknown, fallback = true) {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeDraftNumberText(value: unknown) {
  const text = normalizeDraftText(value);
  if (!text) return "0";
  const numericValue = Number(text);
  return Number.isFinite(numericValue) ? String(numericValue) : text;
}

function toDraftPriceOption(option: MenuItemPriceOption, index: number): DraftPriceOption {
  return {
    id: option.id,
    label: option.label,
    price: option.price == null ? "" : String(option.price),
    priceLabel: option.price_label ?? "",
    visible: option.visible,
    sortOrder: option.sort_order ?? index,
  };
}

function toItemTimeSaleDraft(timeSale?: MenuEditorTimeSale | null): ItemTimeSaleDraft | undefined {
  const promotionItem = timeSale?.item;
  if (!timeSale || !promotionItem) return undefined;
  const targets = (timeSale.items.length > 0 ? timeSale.items : [promotionItem])
    .filter((item) => item.visible !== false)
    .map((item) => ({
      priceColumnId: item.priceColumnId,
      salePrice: item.salePriceLabel?.trim() || (item.salePrice == null ? "" : String(item.salePrice)),
      salePriceLabel: item.salePriceLabel,
      visible: item.visible,
    }));
  const singleTarget = targets.find((target) => target.priceColumnId === null) ?? targets[0];

  return {
    enabled: promotionItem.visible !== false,
    name: timeSale.name || "타임세일",
    salePrice: singleTarget?.salePrice ?? "",
    targets,
    startsAt: toLocalDateTimeInputValue(timeSale.startsAt),
    endsAt: toLocalDateTimeInputValue(timeSale.endsAt),
    timeDisplayMode: timeSale.timeDisplayMode ?? DEFAULT_TIME_SALE_DISPLAY_MODE,
    badgeText: timeSale.badgeText || DEFAULT_TIME_SALE_BADGE_TEXT,
    badgeBackgroundColor: normalizeTimeSaleBadgeBackgroundColor(timeSale.badgeBackgroundColor),
    active: timeSale.active,
  };
}

function normalizeItemTimeSaleDraft(value?: ItemTimeSaleDraft) {
  if (!value) {
    return null;
  }

  return {
    enabled: Boolean(value.enabled),
    name: normalizeDraftText(value.name) || "타임세일",
    salePrice: normalizeDraftText(value.salePrice),
    targets: (value.targets ?? [])
      .map((target) => ({
        priceColumnId: target.priceColumnId ?? null,
        salePrice: normalizeDraftText(target.salePrice),
        salePriceLabel: normalizeDraftText(target.salePriceLabel ?? "") || null,
        visible: normalizeDraftBoolean(target.visible),
      }))
      .filter((target) => target.visible && target.salePrice)
      .sort((a, b) => String(a.priceColumnId ?? "").localeCompare(String(b.priceColumnId ?? ""))),
    startsAt: normalizeDraftText(value.startsAt),
    endsAt: normalizeDraftText(value.endsAt),
    timeDisplayMode: value.timeDisplayMode === "countdown" ? "countdown" : DEFAULT_TIME_SALE_DISPLAY_MODE,
    badgeText: normalizeDraftText(value.badgeText) || DEFAULT_TIME_SALE_BADGE_TEXT,
    badgeBackgroundColor: normalizeTimeSaleBadgeBackgroundColor(value.badgeBackgroundColor),
    active: Boolean(value.active),
  };
}

function areItemTimeSaleDraftsEqual(left?: ItemTimeSaleDraft, right?: ItemTimeSaleDraft) {
  return JSON.stringify(normalizeItemTimeSaleDraft(left)) === JSON.stringify(normalizeItemTimeSaleDraft(right));
}

function normalizeDraftPriceOptions(options: DraftPriceOption[] | undefined) {
  return (options ?? [])
    .map((option, index) => ({
      id: option.id,
      label: normalizeDraftText(option.label),
      price: normalizeDraftText(option.price),
      priceLabel: normalizeDraftText(option.priceLabel),
      visible: normalizeDraftBoolean(option.visible),
      sortOrder: Number.isFinite(Number(option.sortOrder)) ? Number(option.sortOrder) : index,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label, "ko"));
}

function areDraftPriceOptionsEqual(left?: DraftPriceOption[], right?: DraftPriceOption[]) {
  return JSON.stringify(normalizeDraftPriceOptions(left)) === JSON.stringify(normalizeDraftPriceOptions(right));
}

function FieldLabel({ children, required = false }: { children: ReactNode; required?: boolean }) {
  return (
    <label className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">
      {children}
      {required && <span className="ml-1 text-red-500">*</span>}
    </label>
  );
}

function HelpTooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="group/help relative inline-flex align-middle">
      <button
        type="button"
        aria-label={label}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-zinc-200 bg-white text-[11px] font-black text-zinc-400 transition-colors hover:border-zinc-400 hover:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:ring-offset-2"
      >
        ?
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-7 z-30 hidden w-72 -translate-x-1/2 rounded-lg border border-zinc-100 bg-white p-3 text-left text-xs font-semibold leading-relaxed text-zinc-600 shadow-xl group-hover/help:block group-focus-within/help:block"
      >
        {children}
      </span>
    </span>
  );
}

function PromotionPageHelpText() {
  return (
    <>
      프로모션 페이지는 이미지 또는 영상으로 매장 소식과 이벤트를 보여주는 화면입니다.
      <br />
      이 페이지에는 메뉴 카테고리와 메뉴 아이템을 추가하지 않습니다.
    </>
  );
}

function LabelWithHelp({ children, help }: { children: ReactNode; help: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span>{children}</span>
      <HelpTooltip label={`${children} 도움말`}>{help}</HelpTooltip>
    </span>
  );
}

function TextInput({ helperText, className, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { helperText?: ReactNode }) {
  const initialValue = props.value ?? props.defaultValue ?? "";
  const [currentLength, setCurrentLength] = useState(String(initialValue).length);

  return (
    <>
      <input
        {...props}
        onChange={(event) => {
          setCurrentLength(event.target.value.length);
          props.onChange?.(event);
        }}
        className={`mt-2 w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 outline-none transition invalid:border-red-200 focus:border-zinc-950 invalid:focus:border-red-500 disabled:bg-zinc-100 disabled:text-zinc-400 ${
          className ?? ""
        }`}
      />
      {(helperText || props.maxLength) && (
        <div className="mt-2 flex items-start justify-between gap-3 text-xs font-bold leading-relaxed text-zinc-400">
          <span className="break-keep">{helperText}</span>
          {props.maxLength && <span className="shrink-0">{currentLength} / {props.maxLength}</span>}
        </div>
      )}
    </>
  );
}

function TextArea({ helperText, className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { helperText?: ReactNode }) {
  const initialValue = props.value ?? props.defaultValue ?? "";
  const [currentLength, setCurrentLength] = useState(String(initialValue).length);

  return (
    <>
      <textarea
        {...props}
        onChange={(event) => {
          setCurrentLength(event.target.value.length);
          props.onChange?.(event);
        }}
        className={`mt-2 min-h-24 w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 outline-none transition invalid:border-red-200 focus:border-zinc-950 invalid:focus:border-red-500 ${
          className ?? ""
        }`}
      />
      {(helperText || props.maxLength) && (
        <div className="mt-2 flex items-start justify-between gap-3 text-xs font-bold leading-relaxed text-zinc-400">
          <span className="break-keep">{helperText}</span>
          {props.maxLength && <span className="shrink-0">{currentLength} / {props.maxLength}</span>}
        </div>
      )}
    </>
  );
}

function ValidatedTextInput({
  name,
  label,
  defaultValue = "",
  placeholder,
  required,
  requiredIndicator,
  maxLength,
  type = "text",
  min,
  max,
  step,
  inputMode,
  helperText,
  errorText,
  form,
  onValueChange,
}: {
  name: string;
  label: string;
  defaultValue?: string | number | null;
  placeholder: string;
  required?: boolean;
  requiredIndicator?: boolean;
  maxLength?: number;
  type?: React.HTMLInputTypeAttribute;
  min?: number;
  max?: number;
  step?: number;
  inputMode?: InputHTMLAttributes<HTMLInputElement>["inputMode"];
  helperText?: string;
  errorText?: string;
  form?: string;
  onValueChange?: (value: string) => void;
}) {
  const [value, setValue] = useState(defaultValue == null ? "" : String(defaultValue));
  const isTooLong = typeof maxLength === "number" && value.length > maxLength;
  const isMissing = Boolean(required && !value.trim());
  const hasError = Boolean(errorText) || isTooLong || isMissing;

  return (
    <div>
      <FieldLabel required={Boolean(required || requiredIndicator)}>{label}</FieldLabel>
      <input
        name={name}
        form={form}
        type={type}
        value={value}
        min={min}
        max={max}
        step={step}
        inputMode={inputMode}
        maxLength={maxLength}
        placeholder={placeholder}
        required={required}
        onChange={(event) => {
          setValue(event.target.value);
          onValueChange?.(event.target.value);
        }}
        className={`mt-2 w-full rounded-lg border bg-white px-4 py-3 text-sm font-semibold text-zinc-900 outline-none transition ${
          hasError ? "border-red-200 focus:border-red-500" : "border-zinc-200 focus:border-zinc-950"
        }`}
      />
      <div className="mt-2 flex items-center justify-between gap-3 text-xs font-bold">
        <span className={hasError ? "text-red-600" : "text-zinc-400"}>
          {errorText ?? (isMissing ? `${label}은 필수 입력입니다.` : isTooLong ? `최대 ${maxLength}자까지 입력 가능합니다.` : helperText ?? "")}
        </span>
        {typeof maxLength === "number" && <span className={isTooLong ? "text-red-600" : "text-zinc-400"}>{value.length} / {maxLength}</span>}
      </div>
    </div>
  );
}

function ValidatedTextArea({
  name,
  label,
  value: controlledValue,
  defaultValue = "",
  placeholder,
  maxLength,
  helperText,
  form,
  onValueChange,
}: {
  name: string;
  label: string;
  value?: string;
  defaultValue?: string | null;
  placeholder: string;
  maxLength: number;
  helperText?: string;
  form?: string;
  onValueChange?: (value: string) => void;
}) {
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue ?? "");
  const value = controlledValue ?? uncontrolledValue;
  const isTooLong = value.length > maxLength;

  return (
    <div>
      {label ? <FieldLabel>{label}</FieldLabel> : null}
      <textarea
        name={name}
        form={form}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(event) => {
          if (controlledValue === undefined) setUncontrolledValue(event.target.value);
          onValueChange?.(event.target.value);
        }}
        className={`mt-2 min-h-24 w-full rounded-lg border bg-white px-4 py-3 text-sm font-semibold text-zinc-900 outline-none transition ${
          isTooLong ? "border-red-200 focus:border-red-500" : "border-zinc-200 focus:border-zinc-950"
        }`}
      />
      <div className="mt-2 flex items-center justify-between gap-3 text-xs font-bold">
        <span className={isTooLong ? "text-red-600" : "text-zinc-400"}>{isTooLong ? `최대 ${maxLength}자까지 입력 가능합니다.` : helperText ?? ""}</span>
        <span className={isTooLong ? "text-red-600" : "text-zinc-400"}>{value.length} / {maxLength}</span>
      </div>
    </div>
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`mt-2 w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 outline-none transition focus:border-zinc-950 ${
        props.className ?? ""
      }`}
    />
  );
}

function Checkbox({
  name,
  defaultChecked,
  label,
  description,
  form,
  onText,
  offText,
  canTurnOn,
  blockedMessage,
  onCheckedChange,
}: {
  name: string;
  defaultChecked?: boolean;
  label: ReactNode;
  description?: ReactNode;
  form?: string;
  onText?: string;
  offText?: string;
  canTurnOn?: boolean;
  blockedMessage?: ReactNode;
  onCheckedChange?: (checked: boolean) => void;
}) {
  return (
    <SwitchField
      name={name}
      form={form}
      label={label}
      description={description}
      defaultChecked={defaultChecked}
      onText={onText}
      offText={offText}
      canTurnOn={canTurnOn}
      blockedMessage={blockedMessage}
      onCheckedChange={onCheckedChange}
    />
  );
}

function SubmitButton({
  children,
  tone = "dark",
  disabled = false,
  loading = false,
  loadingLabel,
  className: customClassName,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  tone?: "dark" | "light" | "danger" | "final";
  loading?: boolean;
  loadingLabel?: string;
}) {
  const { pending } = useFormStatus();
  const className = {
    dark: "bg-zinc-950 text-white hover:bg-zinc-800",
    light: "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100",
    danger: "border border-red-100 bg-red-50 text-red-700 hover:bg-red-100",
    final: "rounded-lg bg-zinc-950 text-white shadow-sm hover:bg-zinc-800",
  }[tone];

  const isSubmitButton = props.type !== "button";
  const isPending = isSubmitButton && pending;
  const isLoading = loading || isPending;

  return (
    <button
      type="submit"
      disabled={disabled || isLoading}
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-400 ${className} ${customClassName ?? ""}`}
    >
      {isLoading ? (
        <>
          <LoadingSpinner className="h-4 w-4" />
          {loadingLabel ?? (isPending ? "저장 중..." : "처리 중...")}
        </>
      ) : (
        children
      )}
    </button>
  );
}

function FinalActionRow({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-4">
      {children}
    </div>
  );
}

function HiddenMenuId({ menuId, form }: { menuId: string; form?: string }) {
  return <input type="hidden" name="menuId" value={menuId} form={form} />;
}

function BadgeSelect({
  defaultValue = "none",
  form,
  value,
  onChange,
  variant = "menu",
}: {
  defaultValue?: string | null;
  form?: string;
  value?: string;
  onChange?: (value: string) => void;
  variant?: "menu" | "price_list";
}) {
  const options = variant === "price_list" ? PRICE_LIST_BADGE_OPTIONS : MENU_BADGE_OPTIONS;

  return (
    <Select
      name="item_badge_label"
      form={form}
      value={value}
      defaultValue={value === undefined ? defaultValue || "none" : undefined}
      onChange={(event) => onChange?.(event.target.value)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </Select>
  );
}

function ColorInput({
  name,
  form,
  value,
  onChange,
}: {
  name: string;
  form?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const colorPickerValue = /^#[0-9A-Fa-f]{6}$/.test(value) ? value : "#000000";

  return (
    <div className="mt-2 flex min-w-0 overflow-hidden rounded-lg border border-zinc-200 bg-white focus-within:border-zinc-950">
      <input type="hidden" name={name} form={form} value={value} />
      <input
        type="color"
        form={form}
        value={colorPickerValue}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-11 shrink-0 cursor-pointer border-0 bg-transparent p-1"
      />
      <input
        type="text"
        form={form}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        pattern="#[0-9A-Fa-f]{6}"
        className="min-w-0 flex-1 px-2 text-xs font-bold uppercase text-zinc-900 outline-none"
        aria-label={name}
      />
    </div>
  );
}

function BadgeColorInlineSettings({
  formId,
  selectedBadgeLabel,
  forceStyleKey,
  badgeStyles,
  onColorChange,
}: {
  formId: string;
  selectedBadgeLabel: string;
  forceStyleKey?: BadgeStyleKey;
  badgeStyles: BadgeStyles;
  onColorChange?: (patch: Pick<ItemBasicDraft, "badgeStyleKey" | "badgeBackgroundColor" | "badgeTextColor">) => void;
}) {
  if (!selectedBadgeLabel && !forceStyleKey) {
    return <p className="mt-2 break-keep text-xs font-bold leading-relaxed text-zinc-400">배지를 선택하면 색상을 조정할 수 있습니다.</p>;
  }

  const styleKey = forceStyleKey ?? getBadgeStyleKey(selectedBadgeLabel);
  const displayLabel = selectedBadgeLabel || "직접 입력";
  const selectedStyle = badgeStyles[styleKey];
  return (
    <BadgeColorFields
      key={styleKey}
      formId={formId}
      styleKey={styleKey}
      displayLabel={displayLabel}
      selectedStyle={selectedStyle}
      onColorChange={onColorChange}
    />
  );
}

function BadgeColorFields({
  formId,
  styleKey,
  displayLabel,
  selectedStyle,
  onColorChange,
}: {
  formId: string;
  styleKey: BadgeStyleKey;
  displayLabel: string;
  selectedStyle: BadgeStyle;
  onColorChange?: (patch: Pick<ItemBasicDraft, "badgeStyleKey" | "badgeBackgroundColor" | "badgeTextColor">) => void;
}) {
  const [backgroundColor, setBackgroundColor] = useState(selectedStyle.background_color);
  const [textColor, setTextColor] = useState(selectedStyle.text_color);
  const previewStyle: BadgeStyle = {
    background_color: backgroundColor,
    text_color: textColor,
  };
  const guideText =
    styleKey === "default"
      ? "기타 배지 기본 색상에 적용됩니다."
      : `${BADGE_STYLE_LABELS[styleKey]} 색상을 변경하면 모든 ${BADGE_STYLE_LABELS[styleKey]} 배지에 공통 적용됩니다.`;

  return (
    <div className="mt-3 max-w-full min-w-0 overflow-hidden rounded-lg border border-zinc-100 bg-zinc-50 p-3">
      <input type="hidden" name="badge_style_key" value={styleKey} form={formId} />
      <div className="grid min-w-0 gap-2">
        <span className="inline-flex w-fit max-w-full rounded-full px-2.5 py-1 text-[11px] font-black" style={getBadgeStyleCss(previewStyle)}>
          {displayLabel}
        </span>
        <p className="min-w-0 break-keep text-xs font-bold leading-relaxed text-zinc-400">{guideText}</p>
      </div>
      <div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2">
        <div>
          <FieldLabel>배경색</FieldLabel>
          <ColorInput
            name="badge_background_color"
            form={formId}
            value={backgroundColor}
            onChange={(value) => {
              setBackgroundColor(value);
              onColorChange?.({ badgeStyleKey: styleKey, badgeBackgroundColor: value, badgeTextColor: textColor });
            }}
          />
        </div>
        <div>
          <FieldLabel>글자색</FieldLabel>
          <ColorInput
            name="badge_text_color"
            form={formId}
            value={textColor}
            onChange={(value) => {
              setTextColor(value);
              onColorChange?.({ badgeStyleKey: styleKey, badgeBackgroundColor: backgroundColor, badgeTextColor: value });
            }}
          />
        </div>
      </div>
    </div>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return <p className="rounded-lg border border-dashed border-zinc-200 p-6 text-center text-sm font-bold text-zinc-400">{children}</p>;
}

function getCopyName(name: string, existingNames: string[] = []) {
  const normalizedName = name.replace(/^(?:\[복사본\]\s*)+/u, "").trim();
  const baseName = `[복사본] ${normalizedName || name.trim() || "이름 없음"}`;
  const existingNameSet = new Set(existingNames.map((existingName) => existingName.trim()));

  if (!existingNameSet.has(baseName)) return baseName;

  let copyIndex = 2;
  while (existingNameSet.has(`${baseName} ${copyIndex}`)) {
    copyIndex += 1;
  }

  return `${baseName} ${copyIndex}`;
}

function getUniqueName(name: string, existingNames: string[] = []) {
  const baseName = name.trim() || "이름 없음";
  const existingNameSet = new Set(existingNames.map((existingName) => existingName.trim()).filter(Boolean));

  if (!existingNameSet.has(baseName)) return baseName;

  let nameIndex = 2;
  while (existingNameSet.has(`${baseName} ${nameIndex}`)) {
    nameIndex += 1;
  }

  return `${baseName} ${nameIndex}`;
}

function DragHandleIcon() {
  return (
    <span aria-hidden="true" className="inline-flex h-4 w-4 flex-col items-center justify-center gap-[3px]">
      <span className="h-px w-[14px] rounded-full bg-current" />
      <span className="h-px w-[14px] rounded-full bg-current" />
      <span className="h-px w-[14px] rounded-full bg-current" />
    </span>
  );
}

function PanelHeader({
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: ReactNode;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex min-w-0 flex-col justify-between gap-4 border-b border-zinc-100 pb-5 md:flex-row md:items-end">
      <div className="min-w-0">
        <h3 className="mt-1 line-clamp-2 break-words text-2xl font-black tracking-tight text-zinc-950">{title}</h3>
        {description ? <p className="mt-2 break-words text-sm font-semibold leading-relaxed text-zinc-500">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function DraftNameInput({
  value,
  onChange,
  placeholder,
  level,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  level: "page" | "category";
}) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className={`w-full rounded-md border border-dashed border-zinc-300 bg-white text-zinc-900 outline-none focus:border-zinc-950 ${
        level === "page" ? "px-3 py-2 text-sm font-bold" : "px-3 py-2 text-xs font-bold"
      }`}
    />
  );
}

function DetailValue({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 overflow-hidden">
      <p className="break-words text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">{label}</p>
      <div className="mt-2 min-w-0 whitespace-pre-wrap break-words text-sm font-semibold leading-relaxed text-zinc-700">{children || <span className="text-zinc-400">입력 전</span>}</div>
    </div>
  );
}

type DisplayMenuQualityNotice = {
  tone: "notice" | "strong";
  quality: DisplayMenuPageQuality;
};
type DisplayMenuCategoryQualityNotice = {
  tone: "notice" | "strong";
  itemCount: number;
  message: string;
};

const DISPLAY_A_MENU_QUALITY_NOTICE_TEXT =
  "표시 품질 안내";
const DISPLAY_A_MENU_QUALITY_STRONG_TEXT =
  "표시 품질을 더 좋게 다듬을 수 있습니다";
const DISPLAY_A_MENU_QUALITY_CTA_TEXT =
  "저장은 그대로 가능하며, Display가 화면에 맞춰 글자와 간격을 자동으로 조정합니다.";

function DisplayMenuQualityNoticeBox({ notice }: { notice: DisplayMenuQualityNotice }) {
  const isStrong = notice.tone === "strong";

  return (
    <div className={`rounded-lg border p-4 ${isStrong ? "border-amber-200 bg-amber-50 text-amber-900" : "border-sky-100 bg-sky-50 text-sky-900"}`}>
      <p className="break-keep text-sm font-black leading-relaxed">
        {isStrong ? DISPLAY_A_MENU_QUALITY_STRONG_TEXT : DISPLAY_A_MENU_QUALITY_NOTICE_TEXT}
      </p>
      <p className="mt-2 break-keep text-xs font-black leading-relaxed opacity-90">
        현재 구성: 카테고리 {notice.quality.categoryCount}개, 메뉴 {notice.quality.itemCount}개
      </p>
      <p className="mt-2 break-keep text-xs font-bold leading-relaxed opacity-80">{DISPLAY_A_MENU_QUALITY_CTA_TEXT}</p>
      {notice.quality.messages.map((message) => (
        <p key={message} className="mt-2 break-keep text-xs font-semibold leading-relaxed opacity-70">{message}</p>
      ))}
    </div>
  );
}

function DisplayMenuCategoryQualityNoticeBox({
  notice,
  compact = false,
}: {
  notice: DisplayMenuCategoryQualityNotice;
  compact?: boolean;
}) {
  const isStrong = notice.tone === "strong";

  return (
    <div className={`rounded-md border ${isStrong ? "border-amber-200 bg-amber-50 text-amber-900" : "border-sky-100 bg-sky-50 text-sky-900"} ${compact ? "px-2 py-1.5" : "p-4"}`}>
      <p className={`${compact ? "text-[11px]" : "text-sm"} break-keep font-black leading-relaxed`}>
        카테고리 표시 품질 안내
      </p>
      <p className={`${compact ? "mt-0.5 text-[10px]" : "mt-2 text-xs"} break-keep font-bold leading-relaxed opacity-80`}>
        현재 {notice.itemCount}개 메뉴입니다. {notice.message}
      </p>
    </div>
  );
}

function getDisplayMenuQualityNotice(
  settings: MenuPageDisplaySettings,
  categories: MenuCategory[],
  items: MenuItem[],
  priceOptions: MenuItemPriceOption[]
): DisplayMenuQualityNotice | null {
  if (settings.pageType !== "menu") return null;

  const quality = getDisplayMenuPageQuality({
    layoutType: settings.menuLayoutType === "split_image_menu" ? "split_image_menu" : "full_menu",
    categories,
    items,
    priceOptions,
  });

  if (quality.level === "ok") return null;

  return {
    tone: quality.level === "strongWarning" ? "strong" : "notice",
    quality,
  };
}

function getDisplayMenuCategoryQualityNotice(
  category: MenuCategory,
  items: MenuItem[],
  enabled: boolean
): DisplayMenuCategoryQualityNotice | null {
  if (!enabled || category.visible === false) return null;

  const itemCount = items.filter((item) => item.visible !== false).length;
  if (itemCount < DISPLAY_MENU_QUALITY_RULES.category.warningItemMin) return null;

  return {
    tone: itemCount >= DISPLAY_MENU_QUALITY_RULES.category.strongWarningItemMin ? "strong" : "notice",
    itemCount,
    message: itemCount >= DISPLAY_MENU_QUALITY_RULES.category.strongWarningItemMin
      ? "글자가 작게 보일 수 있습니다. 더 읽기 좋게 보이려면 카테고리를 나누어보세요."
      : "표시에는 문제가 없지만, 더 읽기 좋게 보이려면 카테고리를 나누는 것도 좋습니다.",
  };
}

function DraftDeleteConfirmButton({
  title = "정말 삭제하시겠습니까?",
  description,
  disabledReason,
  isConfirming,
  onRequestConfirm,
  onConfirm,
  onCancel,
}: {
  title?: string;
  description?: string;
  disabledReason?: string;
  isConfirming: boolean;
  onRequestConfirm: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <>
      <button
        type="button"
        onClick={onRequestConfirm}
        className="inline-flex items-center justify-center rounded-full border border-red-100 bg-red-50 px-5 py-3 text-sm font-bold text-red-700 transition-colors hover:bg-red-100"
      >
        삭제
      </button>
      {isConfirming && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-zinc-950/35 p-4">
          <div className="w-full max-w-sm rounded-xl border border-red-100 bg-white p-5 shadow-xl">
            <p className="text-base font-black text-red-700">{title}</p>
            {description && <p className="mt-2 break-keep text-sm font-bold leading-relaxed text-zinc-600">{description}</p>}
            {disabledReason && <p className="mt-2 break-keep text-xs font-bold leading-relaxed text-red-600">{disabledReason}</p>}
            <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
              <button type="button" onClick={onCancel} className="rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-bold text-zinc-700">
                취소
              </button>
              <SubmitButton type="button" tone="danger" disabled={Boolean(disabledReason)} onClick={onConfirm}>
                삭제 확정
              </SubmitButton>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function MenuPageForm({
  menuId,
  page,
  count,
  formId,
  labels,
  draftTitle,
  onDraftTitleChange,
  onDraftChange,
  onDraftCommit,
  onCancel,
  cancelLabel = "취소",
  deleteAction,
  draftActionLabel,
  draftFeedback,
  draftOnly = false,
  supportsDescription = true,
  supportsDisplaySettings = false,
  supportsDisplayPromotionPages = false,
  supportsDisplayMenuLayoutTypes = false,
  supportsSplitImageText = true,
  supportsPromotionText = true,
  displaySettingsDraft,
  displayQualityNotice,
  canUseDisplayVideoUpload = false,
}: {
  menuId: string;
  page?: MenuPage;
  count: number;
  formId: string;
  labels: TemplateEditorLabels;
  draftTitle?: string;
  onDraftTitleChange?: (title: string) => void;
  onDraftChange?: (patch: Partial<PageBasicDraft>) => void;
  onDraftCommit?: (patch?: Partial<PageBasicDraft>) => void;
  onCancel?: () => void;
  cancelLabel?: string;
  deleteAction?: ReactNode;
  draftActionLabel?: string;
  draftFeedback?: string;
  draftOnly?: boolean;
  supportsDescription?: boolean;
  supportsDisplaySettings?: boolean;
  supportsDisplayPromotionPages?: boolean;
  supportsDisplayMenuLayoutTypes?: boolean;
  supportsSplitImageText?: boolean;
  supportsPromotionText?: boolean;
  displaySettingsDraft?: MenuPageDisplaySettings;
  displayQualityNotice?: ReactNode;
  canUseDisplayVideoUpload?: boolean;
}) {
  const [title, setTitle] = useState(draftTitle ?? page?.title ?? `${labels.pageLabel} ${count + 1}`);
  const [description, setDescription] = useState(page?.description ?? "");
  const [descriptionVisible, setDescriptionVisible] = useState(page?.description_visible ?? false);
  const [sortOrder, setSortOrder] = useState(page?.sort_order ?? 0);
  const [displaySettings, setDisplaySettings] = useState<MenuPageDisplaySettings>(() =>
    normalizeMenuPageDisplaySettings(displaySettingsDraft ?? page?.display_settings)
  );
  const displayVideoInputRef = useRef<HTMLInputElement>(null);
  const [displayVideoUploadState, setDisplayVideoUploadState] = useState<DisplayVideoUploadState>({ type: "idle", message: null });
  const titleValue = page ? title : draftTitle !== undefined ? draftTitle : title;
  const titleInvalid = !titleValue.trim() || titleValue.length > MENU_FIELD_LIMITS.menuPages.title;
  const canUploadDisplayVideoForPage = Boolean(canUseDisplayVideoUpload && page?.id && !page.id.startsWith("temp-"));
  const displayVideoUploadMessageClassName =
    displayVideoUploadState.type === "success"
      ? "border-emerald-100 bg-emerald-50 text-emerald-700"
      : displayVideoUploadState.type === "error"
        ? "border-red-100 bg-red-50 text-red-700"
        : "border-zinc-100 bg-zinc-50 text-zinc-500";
  const isDisplayVideoUploading = displayVideoUploadState.type === "loading";
  const pageFormDirty =
    !page ||
    normalizeDraftText(titleValue) !== normalizeDraftText(page.title) ||
    (supportsDescription && normalizeDraftText(description) !== normalizeDraftText(page.description ?? "")) ||
    (supportsDescription && descriptionVisible !== (page.description_visible ?? false)) ||
    normalizeDraftNumberText(sortOrder) !== normalizeDraftNumberText(page.sort_order) ||
    (supportsDisplaySettings &&
      JSON.stringify(displaySettings) !== JSON.stringify(normalizeMenuPageDisplaySettings(page.display_settings)));

  function handleDraftCommit() {
    if (page && !pageFormDirty) return;
    onDraftTitleChange?.(titleValue);
    onDraftChange?.({
      ...(supportsDescription ? { title: titleValue, description, descriptionVisible, sortOrder } : { title: titleValue, sortOrder }),
      ...(supportsDisplaySettings ? { displaySettings } : {}),
    });
    onDraftCommit?.();
  }

  function updateDisplaySettings(patch: Partial<MenuPageDisplaySettings>) {
    const nextSettings = normalizeMenuPageDisplaySettings({ ...displaySettings, ...patch });
    setDisplaySettings(nextSettings);
    if (!page) onDraftChange?.({ displaySettings: nextSettings });
  }

  function updateSplitImage(patch: Partial<MenuPageDisplaySettings["splitImage"]>) {
    updateDisplaySettings({ splitImage: { ...displaySettings.splitImage, ...patch } });
  }

  function updatePromotion(patch: Partial<MenuPageDisplaySettings["promotion"]>) {
    updateDisplaySettings({ promotion: { ...displaySettings.promotion, ...patch } });
  }

  function getDisplayVideoClientValidationMessage(file: File) {
    const acceptedMimeTypes = DISPLAY_VIDEO_UPLOAD_ACCEPTED_MIME_TYPES as readonly string[];
    const isMp4 = acceptedMimeTypes.includes(file.type) && file.name.trim().toLowerCase().endsWith(".mp4");

    if (!isMp4) {
      return "MP4 파일만 업로드할 수 있습니다.";
    }

    if (file.size > DISPLAY_VIDEO_UPLOAD_MAX_FILE_SIZE_MB * 1024 * 1024) {
      return `동영상 파일은 최대 ${DISPLAY_VIDEO_UPLOAD_MAX_FILE_SIZE_MB}MB까지 업로드할 수 있습니다.`;
    }

    return "";
  }

  async function uploadDisplayVideoFile(file: File) {
    if (!canUploadDisplayVideoForPage || !page?.id) {
      setDisplayVideoUploadState({ type: "error", message: "이 페이지를 먼저 저장한 뒤 동영상을 업로드할 수 있습니다." });
      if (displayVideoInputRef.current) {
        displayVideoInputRef.current.value = "";
      }
      return;
    }

    const validationMessage = getDisplayVideoClientValidationMessage(file);

    if (validationMessage) {
      setDisplayVideoUploadState({ type: "error", message: validationMessage });
      if (displayVideoInputRef.current) {
        displayVideoInputRef.current.value = "";
      }
      return;
    }

    const formData = new FormData();
    formData.set("file", file);
    formData.set("menuId", menuId);
    formData.set("pageId", page.id);

    setDisplayVideoUploadState({ type: "loading", message: "동영상을 업로드하고 있습니다." });

    try {
      const response = await fetch("/api/menu-videos", {
        method: "POST",
        body: formData,
      });
      const result = (await response.json().catch(() => null)) as {
        ok?: boolean;
        message?: string;
        error?: string;
        path?: string | null;
        publicUrl?: string | null;
      } | null;
      const serverErrorMessage = result?.message ?? result?.error;

      if (!response.ok || !result?.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error("동영상 파일 직접 업로드 권한이 없습니다.");
        }

        if (response.status === 413) {
          throw new Error(`동영상 파일은 최대 ${DISPLAY_VIDEO_UPLOAD_MAX_FILE_SIZE_MB}MB까지 업로드할 수 있습니다.`);
        }

        if (serverErrorMessage) {
          throw new Error(serverErrorMessage);
        }

        throw new Error("동영상 업로드 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
      }

      if (!result.path || !result.publicUrl) {
        throw new Error("동영상 업로드 응답이 올바르지 않습니다.");
      }

      updatePromotion({
        mediaType: "video",
        mediaUrl: null,
        mediaPath: null,
        videoUrl: result.publicUrl,
        videoPath: result.path,
        videoSource: "upload",
        videoLoop: true,
      });
      setDisplayVideoUploadState({ type: "success", message: "동영상이 업로드되었습니다. 수정 내용 반영 후 저장하면 공개 메뉴판에 반영됩니다." });
      toast.success("동영상이 업로드되었습니다. 수정 내용 반영 후 저장하면 공개 메뉴판에 반영됩니다.");
    } catch (error) {
      setDisplayVideoUploadState({
        type: "error",
        message: error instanceof Error ? error.message : "동영상 업로드 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
      });
    } finally {
      if (displayVideoInputRef.current) {
        displayVideoInputRef.current.value = "";
      }
    }
  }

  return (
    <form
      id={formId}
      action={draftOnly ? undefined : page ? updateMenuPageAction : createMenuPageAction}
      onSubmit={draftOnly ? (event) => event.preventDefault() : undefined}
      className="mt-4 space-y-4 rounded-lg border border-zinc-100 bg-zinc-50 p-4"
    >
      <HiddenMenuId menuId={menuId} />
      {page && <input type="hidden" name="menuPageId" value={page.id} />}
      <div>
        <FieldLabel required>{labels.pageLabel} 이름</FieldLabel>
        <input
          name="menu_page_title"
          value={titleValue}
          maxLength={MENU_FIELD_LIMITS.menuPages.title}
          placeholder={`${labels.pageLabel} 이름을 입력하세요`}
          required
          onChange={(event) => {
            setTitle(event.target.value);
            if (!page) {
              onDraftTitleChange?.(event.target.value);
              onDraftChange?.({ title: event.target.value });
            }
          }}
          className={`mt-2 w-full rounded-lg border bg-white px-4 py-3 text-sm font-semibold text-zinc-900 outline-none transition ${
            titleInvalid ? "border-red-200 focus:border-red-500" : "border-zinc-200 focus:border-zinc-950"
          }`}
        />
        <div className="mt-2 flex items-center justify-between text-xs font-bold">
          <span className={titleInvalid ? "text-red-600" : "text-zinc-400"}>
            {!titleValue.trim() ? "이름은 필수 입력입니다" : titleValue.length > MENU_FIELD_LIMITS.menuPages.title ? `최대 ${MENU_FIELD_LIMITS.menuPages.title}자까지 입력 가능합니다` : ""}
          </span>
          <span className={titleValue.length > MENU_FIELD_LIMITS.menuPages.title ? "text-red-600" : "text-zinc-400"}>{titleValue.length} / {MENU_FIELD_LIMITS.menuPages.title}</span>
        </div>
      </div>
      {supportsDescription && (
        <ValidatedTextArea
          name="menu_page_description"
          label={`${labels.pageLabel} 설명`}
          defaultValue={description}
          placeholder={`${labels.pageLabel} 설명을 입력하세요`}
          maxLength={MENU_FIELD_LIMITS.menuPages.description}
          helperText={descriptionVisible ? `${labels.pageLabel}를 설명하는 짧은 문구입니다.` : "사용 안 함 상태에서는 공개 메뉴판에 설명이 표시되지 않습니다."}
          onValueChange={(value) => {
            setDescription(value);
            if (!page) onDraftChange?.({ description: value });
          }}
        />
      )}
      <ValidatedTextInput
        name="menu_page_sort_order"
        label="정렬 순서"
        type="number"
        min={0}
        step={1}
        defaultValue={sortOrder}
        placeholder="정렬 순서를 입력하세요"
        required
        helperText="숫자가 낮을수록 먼저 표시됩니다."
        onValueChange={(value) => setSortOrder(Number(value))}
      />
      {supportsDisplaySettings && (
        <section className="rounded-lg border border-zinc-100 bg-white p-4">
          <h4 className="inline-flex items-center gap-2 text-sm font-black text-zinc-950">
            <span>디스플레이 화면 설정</span>
            {displaySettings.pageType === "promotion" && (
              <HelpTooltip label="프로모션 페이지 도움말">
                <PromotionPageHelpText />
              </HelpTooltip>
            )}
          </h4>
          <p className="mt-1 break-keep text-xs font-semibold leading-relaxed text-zinc-400">
            TV/모니터에 표시될 페이지 유형과 화면 구성을 설정합니다. 저장 전까지 공개 화면에는 반영되지 않습니다.
          </p>
          {displayQualityNotice ? <div className="mt-4">{displayQualityNotice}</div> : null}
          <div className="mt-4 grid gap-4">
            <div>
              <FieldLabel required>페이지 유형</FieldLabel>
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                {DISPLAY_PAGE_TYPES.filter((type) => type === "menu" || supportsDisplayPromotionPages).map((type) => {
                  const selected = displaySettings.pageType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() =>
                        updateDisplaySettings(
                          type === "promotion"
                            ? DEFAULT_PROMOTION_PAGE_DISPLAY_SETTINGS
                            : {
                                ...displaySettings,
                                pageType: "menu",
                                menuLayoutType: displaySettings.menuLayoutType ?? DEFAULT_MENU_PAGE_DISPLAY_SETTINGS.menuLayoutType,
                              }
                        )
                      }
                      className={`rounded-lg border p-4 text-left transition ${
                        selected ? "border-zinc-950 bg-zinc-50 text-zinc-950" : "border-zinc-200 bg-white text-zinc-500 hover:border-zinc-400"
                      }`}
                    >
                      <span className="block text-sm font-black">{getDisplayPageTypeLabel(type)}</span>
                      <span className="mt-1 block break-keep text-xs font-semibold leading-relaxed">
                        {type === "promotion"
                          ? "신메뉴, 시즌 이벤트, 안내 포스터를 디스플레이에 보여주는 화면입니다."
                          : "카테고리와 메뉴 아이템을 보여주는 기본 메뉴 화면입니다."}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            {displaySettings.pageType === "menu" && supportsDisplayMenuLayoutTypes && (
              <div>
                <FieldLabel required>화면 구성 방식</FieldLabel>
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  {DISPLAY_MENU_LAYOUT_TYPES.map((type) => {
                    const selected = displaySettings.menuLayoutType === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => updateDisplaySettings({ pageType: "menu", menuLayoutType: type })}
                        className={`rounded-lg border p-4 text-left transition ${
                          selected ? "border-zinc-950 bg-zinc-50 text-zinc-950" : "border-zinc-200 bg-white text-zinc-500 hover:border-zinc-400"
                        }`}
                      >
                        <span className="block text-sm font-black">{getDisplayMenuLayoutTypeLabel(type)}</span>
                        <span className="mt-1 block break-keep text-xs font-semibold leading-relaxed">
                          {type === "split_image_menu"
                            ? supportsSplitImageText
                              ? "한쪽에는 이미지와 짧은 문구를, 다른 한쪽에는 메뉴 목록을 보여주는 구성입니다."
                              : "한쪽에는 이미지를, 다른 한쪽에는 메뉴 목록을 보여주는 구성입니다."
                            : "화면 전체를 메뉴 목록으로 사용하는 구성입니다."}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {displaySettings.pageType === "menu" && displaySettings.menuLayoutType === "split_image_menu" && (
              <div className="grid gap-4 rounded-lg border border-zinc-100 bg-zinc-50 p-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <FieldLabel required>이미지 위치</FieldLabel>
                  <p className="mt-1 break-keep text-xs font-semibold leading-relaxed text-zinc-400">
                    이미지와 메뉴가 50:50으로 나뉘며, 선택한 방향에 따라 이미지 위치가 바뀝니다.
                  </p>
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    {[
                      { value: "left", label: "왼쪽에 이미지" },
                      { value: "right", label: "오른쪽에 이미지" },
                    ].map((option) => {
                      const selected = displaySettings.splitImagePosition === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => updateDisplaySettings({ splitImagePosition: option.value as MenuPageDisplaySettings["splitImagePosition"] })}
                          className={`rounded-lg border p-4 text-left transition ${
                            selected ? "border-zinc-950 bg-white text-zinc-950" : "border-zinc-200 bg-white/70 text-zinc-500 hover:border-zinc-400"
                          }`}
                        >
                          <span className="block text-sm font-black">{option.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="md:col-span-2">
                  <ImageUploadField
                    label="분할 이미지"
                    menuId={menuId}
                    target="display-page-image-draft"
                    recordId={page?.id ?? formId}
                    currentUrl={displaySettings.splitImage.url}
                    description="이미지 + 메뉴 분할형에서 선택한 이미지 영역에 표시할 이미지를 등록합니다."
                    fileGuidance={
                      <>
                        <p>JPG, PNG, WebP / 최대 10MB</p>
                        <p>권장 비율: 8:9 또는 1:1에 가까운 고해상도 이미지</p>
                        <p>분할형에서는 이미지가 화면의 절반 영역에 표시됩니다.</p>
                        <p>업로드된 이미지는 화면에 맞게 자동 최적화될 수 있습니다.</p>
                      </>
                    }
                    uploadSuccessMessage="새 분할 이미지는 저장 후 디스플레이 설정에 반영됩니다."
                    deleteSuccessMessage="분할 이미지 삭제가 임시 반영되었습니다. 저장 후 디스플레이 설정에 반영됩니다."
                    deleteConfirmTitle="분할 이미지를 삭제할까요?"
                    deleteConfirmDescription="삭제하면 저장 후 디스플레이 설정에 반영됩니다."
                    onDraftImageChange={(draft) =>
                      updateSplitImage({
                        url: draft.imageAction === "delete" ? null : draft.imageUrl,
                        path: draft.imageAction === "delete" ? null : draft.imagePath,
                      })
                    }
                  />
                </div>
                {supportsSplitImageText && (
                  <>
                    <ValidatedTextInput
                      name="display_split_image_title"
                      label="이미지 제목"
                      defaultValue={displaySettings.splitImage.title ?? ""}
                      maxLength={MENU_FIELD_LIMITS.menuPageDisplaySettings.splitImageTitle}
                      placeholder="예: 시즌 추천"
                      helperText="이미지와 함께 보여줄 짧은 제목입니다."
                      onValueChange={(value) => updateSplitImage({ title: value })}
                    />
                    <ValidatedTextInput
                      name="display_split_image_description"
                      label="이미지 설명"
                      defaultValue={displaySettings.splitImage.description ?? ""}
                      maxLength={MENU_FIELD_LIMITS.menuPageDisplaySettings.splitImageDescription}
                      placeholder="예: 이번 달에만 만나는 특별 메뉴"
                      helperText="이미지 보조 문구입니다."
                      onValueChange={(value) => updateSplitImage({ description: value })}
                    />
                  </>
                )}
              </div>
            )}
            {displaySettings.pageType === "promotion" && (
              <div className="grid gap-4 rounded-lg border border-amber-100 bg-amber-50 p-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <FieldLabel required>미디어 종류</FieldLabel>
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    {DISPLAY_PROMOTION_MEDIA_TYPES.map((type) => {
                      const selected = displaySettings.promotion.mediaType === type;
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() =>
                            updatePromotion(
                              type === "video"
                                ? { mediaType: "video", mediaUrl: null, mediaPath: null, videoPath: null, videoSource: displaySettings.promotion.videoUrl ? "url" : null, videoLoop: true }
                                : { mediaType: "image", videoUrl: null, videoPath: null, videoSource: null, videoLoop: true }
                            )
                          }
                          className={`rounded-lg border p-4 text-left transition ${
                            selected ? "border-zinc-950 bg-white text-zinc-950" : "border-amber-100 bg-white/70 text-zinc-500 hover:border-zinc-300"
                          }`}
                        >
                          <span className="block text-sm font-black">{getDisplayPromotionMediaTypeLabel(type)}</span>
                          <span className="mt-1 block break-keep text-xs font-semibold leading-relaxed">
                            {type === "video" ? "영상 URL을 등록합니다. 디스플레이에서는 반복 재생됩니다." : "이미지 파일을 직접 등록합니다."}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                {supportsPromotionText && (
                  <>
                    <ValidatedTextInput
                      name="display_promotion_title"
                      label="프로모션 제목"
                      defaultValue={displaySettings.promotion.title ?? ""}
                      maxLength={MENU_FIELD_LIMITS.menuPageDisplaySettings.promotionTitle}
                      placeholder="예: 봄 시즌 안내"
                      helperText="프로모션 화면의 제목입니다."
                      onValueChange={(value) => updatePromotion({ title: value })}
                    />
                    <ValidatedTextInput
                      name="display_promotion_description"
                      label="프로모션 설명"
                      defaultValue={displaySettings.promotion.description ?? ""}
                      maxLength={MENU_FIELD_LIMITS.menuPageDisplaySettings.promotionDescription}
                      placeholder="예: 신메뉴와 시즌 혜택을 확인해보세요."
                      helperText="프로모션 화면의 보조 문구입니다."
                      onValueChange={(value) => updatePromotion({ description: value })}
                    />
                  </>
                )}
                {displaySettings.promotion.mediaType === "image" ? (
                  <div className="md:col-span-2">
                    <ImageUploadField
                      label="프로모션 이미지"
                      menuId={menuId}
                      target="display-page-image-draft"
                      recordId={page?.id ?? formId}
                      currentUrl={displaySettings.promotion.mediaUrl}
                      description="프로모션 페이지에 표시할 이미지를 등록합니다."
                      fileGuidance={
                        <>
                          <p>JPG, PNG, WebP / 최대 10MB</p>
                          <p>권장 크기: 1920×1080px 이상</p>
                        </>
                      }
                      uploadSuccessMessage="새 프로모션 이미지는 저장 후 디스플레이 설정에 반영됩니다."
                      deleteSuccessMessage="프로모션 이미지 삭제가 임시 반영되었습니다. 저장 후 디스플레이 설정에 반영됩니다."
                      deleteConfirmTitle="프로모션 이미지를 삭제할까요?"
                      deleteConfirmDescription="삭제하면 저장 후 디스플레이 설정에 반영됩니다."
                      onDraftImageChange={(draft) =>
                        updatePromotion({
                          mediaType: "image",
                          mediaUrl: draft.imageAction === "delete" ? null : draft.imageUrl,
                          mediaPath: draft.imageAction === "delete" ? null : draft.imagePath,
                          videoUrl: null,
                          videoPath: null,
                          videoSource: null,
                          videoLoop: true,
                        })
                      }
                    />
                  </div>
                ) : (
                  <div className="md:col-span-2">
                    <FieldLabel>영상 URL</FieldLabel>
                    <input
                      value={displaySettings.promotion.videoUrl ?? ""}
                      maxLength={MENU_FIELD_LIMITS.menuPageDisplaySettings.mediaUrl}
                      placeholder="https://..."
                      onChange={(event) => {
                        setDisplayVideoUploadState({ type: "idle", message: null });
                        updatePromotion({
                          mediaType: "video",
                          mediaUrl: null,
                          mediaPath: null,
                          videoUrl: event.target.value,
                          videoPath: null,
                          videoSource: event.target.value.trim() ? "url" : null,
                          videoLoop: true,
                        });
                      }}
                      className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 outline-none transition focus:border-zinc-950"
                    />
                    <p className="mt-2 break-keep text-xs font-bold leading-relaxed text-amber-700">
                      영상은 링크로 등록하며, 디스플레이에서는 반복 재생됩니다.
                    </p>
                    <div className="mt-4 rounded-lg border border-dashed border-amber-200 bg-white/80 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-sm font-black text-zinc-950">{DISPLAY_VIDEO_UPLOAD_ADDON_NAME}</p>
                          <p className="mt-1 break-keep text-xs font-semibold leading-relaxed text-zinc-500">
                            동영상 파일 직접 업로드는 추가 옵션에서 사용할 수 있어요. 영상 URL 입력은 기본으로 사용할 수 있습니다.
                          </p>
                        </div>
                        <span
                          className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-black ${
                            canUseDisplayVideoUpload ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-500"
                          }`}
                        >
                          {canUseDisplayVideoUpload ? "사용 가능" : "잠금"}
                        </span>
                      </div>
                      <div className="mt-3 grid gap-2 text-xs font-bold leading-relaxed text-zinc-500 sm:grid-cols-2">
                        <p>월 +{DISPLAY_VIDEO_UPLOAD_MONTHLY_PRICE.toLocaleString("ko-KR")}원 / 연 +{DISPLAY_VIDEO_UPLOAD_YEARLY_PRICE.toLocaleString("ko-KR")}원 예정</p>
                        <p>MP4, 최대 {DISPLAY_VIDEO_UPLOAD_MAX_FILE_SIZE_MB}MB, 메뉴판당 최대 {DISPLAY_VIDEO_UPLOAD_MAX_ACTIVE_FILES}개</p>
                        <p>권장 용량 {DISPLAY_VIDEO_UPLOAD_RECOMMENDED_FILE_SIZE_MB}MB 이하</p>
                        <p>권장 길이 {DISPLAY_VIDEO_UPLOAD_RECOMMENDED_DURATION}</p>
                      </div>
                      {!canUseDisplayVideoUpload && (
                        <p className="mt-3 break-keep rounded-md bg-amber-50 px-3 py-2 text-xs font-bold leading-relaxed text-amber-800">
                          MP4 파일을 직접 업로드하려면 동영상 업로드 옵션이 필요합니다.
                        </p>
                      )}
                      {canUseDisplayVideoUpload && (
                        <div className="mt-4 rounded-lg border border-emerald-100 bg-emerald-50/70 p-4">
                          <input
                            ref={displayVideoInputRef}
                            type="file"
                            accept={DISPLAY_VIDEO_UPLOAD_ACCEPTED_MIME_TYPES.join(",")}
                            className="hidden"
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              if (file) void uploadDisplayVideoFile(file);
                            }}
                          />
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="break-keep text-xs font-black text-zinc-950">MP4 파일을 업로드하면 메뉴링크에서 직접 재생됩니다.</p>
                              <p className="mt-1 break-keep text-xs font-semibold leading-relaxed text-zinc-500">
                                업로드 성공 시 현재 영상 URL 대신 업로드된 파일이 임시 반영됩니다.
                              </p>
                              {!canUploadDisplayVideoForPage && (
                                <p className="mt-2 break-keep text-xs font-bold leading-relaxed text-amber-700">
                                  새 프로모션 페이지는 먼저 저장한 뒤 동영상을 업로드할 수 있습니다.
                                </p>
                              )}
                              {displaySettings.promotion.videoSource === "upload" && displaySettings.promotion.videoPath && (
                                <p className="mt-2 break-all text-[11px] font-bold leading-relaxed text-emerald-700">
                                  현재 업로드 영상: {displaySettings.promotion.videoPath}
                                </p>
                              )}
                            </div>
                            <button
                              type="button"
                              disabled={isDisplayVideoUploading || !canUploadDisplayVideoForPage}
                              onClick={() => displayVideoInputRef.current?.click()}
                              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-zinc-950 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
                            >
                              {isDisplayVideoUploading ? (
                                <>
                                  <LoadingSpinner className="h-3 w-3" />
                                  업로드 중...
                                </>
                              ) : (
                                "MP4 파일 선택"
                              )}
                            </button>
                          </div>
                          {displayVideoUploadState.message && (
                            <p className={`mt-3 break-keep rounded-md border px-3 py-2 text-xs font-bold leading-relaxed ${displayVideoUploadMessageClassName}`}>
                              {displayVideoUploadState.message}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}
      {supportsDescription && (
        <div className="grid gap-3">
          <Checkbox
            name="menu_page_description_visible"
            label={
              <LabelWithHelp help="사용 안 함으로 바꿔도 입력한 설명은 삭제되지 않습니다. 공개 메뉴판에만 표시되지 않습니다.">
                설명글 사용
              </LabelWithHelp>
            }
            defaultChecked={descriptionVisible}
            onText="사용함"
            offText="사용 안 함"
            onCheckedChange={(checked) => {
              setDescriptionVisible(checked);
              if (!page) onDraftChange?.({ descriptionVisible: checked });
            }}
          />
        </div>
      )}
      {draftOnly ? (
        <>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <SubmitButton type="button" tone="final" disabled={titleInvalid || (Boolean(page) && !pageFormDirty)} onClick={handleDraftCommit}>
              {draftActionLabel ?? (page ? "수정 내용 반영" : `${labels.pageLabel} 추가`)}
            </SubmitButton>
            {onCancel && (
              <button type="button" onClick={onCancel} className="rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-bold text-zinc-700">
                {cancelLabel}
              </button>
            )}
            {deleteAction}
          </div>
          <p className="break-keep text-right text-xs font-bold leading-relaxed text-zinc-400">
            변경 내용은 메뉴 관리 탭에 임시 반영됩니다.
          </p>
          {draftFeedback && <p className="rounded-lg bg-emerald-50 px-4 py-3 text-right text-xs font-bold leading-relaxed text-emerald-700">{draftFeedback}</p>}
        </>
      ) : (
        <div className="flex flex-wrap items-center justify-end gap-3">
          <SubmitButton tone="final" disabled={titleInvalid}>
            수정 내용 반영
          </SubmitButton>
        </div>
      )}
    </form>
  );
}

function MenuCategoryForm({
  menuId,
  pageId,
  category,
  formId,
  labels,
  draftName,
  priceOptionLabels,
  priceColumns,
  supportsDescription = true,
  supportCategoryPriceOptionColumns = false,
  supportBasicPriceColumns = false,
  maxPriceOptionColumns = MENU_LIMITS.maxPriceOptionsPerItem,
  maxCategoryPriceColumns = 0,
  onDraftNameChange,
  onDraftChange,
  onDraftCommit,
  draftActionLabel,
  draftFeedback,
  draftOnly = false,
  onCancel,
  cancelLabel = "취소",
  deleteAction,
  cancelHelperText,
}: {
  menuId: string;
  pageId: string;
  category?: MenuCategory;
  formId: string;
  labels: TemplateEditorLabels;
  draftName?: string;
  priceOptionLabels?: string[];
  priceColumns?: CategoryPriceColumnDraft[];
  supportsDescription?: boolean;
  supportCategoryPriceOptionColumns?: boolean;
  supportBasicPriceColumns?: boolean;
  maxPriceOptionColumns?: number;
  maxCategoryPriceColumns?: number;
  onDraftNameChange?: (name: string) => void;
  onDraftChange?: (patch: Partial<CategoryBasicDraft>) => void;
  onDraftCommit?: (patch?: Partial<CategoryBasicDraft>) => void;
  draftActionLabel?: string;
  draftFeedback?: string;
  draftOnly?: boolean;
  onCancel?: () => void;
  cancelLabel?: string;
  deleteAction?: ReactNode;
  cancelHelperText?: string;
}) {
  const [name, setName] = useState(draftName ?? category?.name ?? "");
  const [description, setDescription] = useState(category?.description ?? "");
  const [descriptionVisible, setDescriptionVisible] = useState(category?.description_visible ?? false);
  const [visible, setVisible] = useState(category?.visible ?? true);
  const [sortOrder, setSortOrder] = useState(category?.sort_order ?? 0);
  const [categoryPriceOptionLabels, setCategoryPriceOptionLabels] = useState(() =>
    normalizeDraftPriceOptionLabels(priceOptionLabels, maxPriceOptionColumns)
  );
  const [initialCategoryPriceOptionLabels] = useState(() => normalizeDraftPriceOptionLabels(priceOptionLabels, maxPriceOptionColumns));
  const [categoryPriceColumns, setCategoryPriceColumns] = useState(() => normalizeCategoryPriceColumnDrafts(priceColumns));
  const [initialCategoryPriceColumns] = useState(() => normalizeCategoryPriceColumnDrafts(priceColumns));
  const nameValue = category ? name : draftName !== undefined ? draftName : name;
  const normalizedCategoryPriceOptionLabels = normalizeDraftPriceOptionLabels(categoryPriceOptionLabels, maxPriceOptionColumns);
  const normalizedCategoryPriceColumns = normalizeCategoryPriceColumnDrafts(categoryPriceColumns);
  const effectiveMaxCategoryPriceColumns = supportBasicPriceColumns ? Math.max(0, maxCategoryPriceColumns) : 0;
  const categoryPriceColumnValidationMessage = supportBasicPriceColumns
    ? getCategoryPriceColumnValidationMessage(categoryPriceColumns, effectiveMaxCategoryPriceColumns)
    : "";
  const nameInvalid = !nameValue.trim() || nameValue.length > MENU_FIELD_LIMITS.menuCategories.name;
  const priceOptionLabelsChanged =
    supportCategoryPriceOptionColumns &&
    JSON.stringify(normalizedCategoryPriceOptionLabels) !== JSON.stringify(initialCategoryPriceOptionLabels);
  const priceColumnsChanged =
    supportBasicPriceColumns &&
    !areCategoryPriceColumnDraftsEqual(normalizedCategoryPriceColumns, initialCategoryPriceColumns);
  const categoryFormDirty =
    !category ||
    normalizeDraftText(nameValue) !== normalizeDraftText(category.name) ||
    (supportsDescription && normalizeDraftText(description) !== normalizeDraftText(category.description ?? "")) ||
    (supportsDescription && descriptionVisible !== (category.description_visible ?? false)) ||
    visible !== (category.visible ?? true) ||
    normalizeDraftNumberText(sortOrder) !== normalizeDraftNumberText(category.sort_order) ||
    priceOptionLabelsChanged ||
    priceColumnsChanged;

  function updateCategoryPriceOptionLabel(index: number, value: string) {
    const nextLabels = [...categoryPriceOptionLabels];
    nextLabels[index] = value;
    const normalizedLabels = normalizeDraftPriceOptionLabels(nextLabels, maxPriceOptionColumns);
    setCategoryPriceOptionLabels(nextLabels.slice(0, maxPriceOptionColumns));
    onDraftChange?.({ priceOptionLabels: normalizedLabels });
  }

  function addCategoryPriceOptionLabel() {
    if (categoryPriceOptionLabels.length >= maxPriceOptionColumns) return;
    const nextLabels = [...categoryPriceOptionLabels, ""];
    setCategoryPriceOptionLabels(nextLabels);
    onDraftChange?.({ priceOptionLabels: normalizeDraftPriceOptionLabels(nextLabels, maxPriceOptionColumns) });
  }

  function removeCategoryPriceOptionLabel(index: number) {
    const nextLabels = categoryPriceOptionLabels.filter((_, labelIndex) => labelIndex !== index);
    setCategoryPriceOptionLabels(nextLabels);
    onDraftChange?.({ priceOptionLabels: normalizeDraftPriceOptionLabels(nextLabels, maxPriceOptionColumns) });
  }

  function updateCategoryPriceColumn(index: number, patch: Partial<CategoryPriceColumnDraft>) {
    const nextColumns = categoryPriceColumns.map((column, columnIndex) => {
      if (columnIndex !== index) return column;
      const label = patch.label !== undefined ? patch.label : column.label;
      return {
        ...column,
        ...patch,
        label,
        key: patch.label !== undefined ? getCategoryPriceColumnKey(label, index) : patch.key ?? column.key,
      };
    });
    setCategoryPriceColumns(nextColumns);
    if (!category) onDraftChange?.({ priceColumns: normalizeCategoryPriceColumnDrafts(nextColumns) });
  }

  function addCategoryPriceColumn() {
    if (categoryPriceColumns.length >= effectiveMaxCategoryPriceColumns) return;
    const nextColumns = [...categoryPriceColumns, createCategoryPriceColumnDraft(categoryPriceColumns.length)];
    setCategoryPriceColumns(nextColumns);
    if (!category) onDraftChange?.({ priceColumns: normalizeCategoryPriceColumnDrafts(nextColumns) });
  }

  function removeCategoryPriceColumn(index: number) {
    const nextColumns = categoryPriceColumns
      .filter((_, columnIndex) => columnIndex !== index)
      .map((column, columnIndex) => ({ ...column, sortOrder: columnIndex }));
    setCategoryPriceColumns(nextColumns);
    if (!category) onDraftChange?.({ priceColumns: normalizeCategoryPriceColumnDrafts(nextColumns) });
  }

  function moveCategoryPriceColumn(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= categoryPriceColumns.length) return;
    const nextColumns = [...categoryPriceColumns];
    [nextColumns[index], nextColumns[targetIndex]] = [nextColumns[targetIndex], nextColumns[index]];
    const reorderedColumns = nextColumns.map((column, columnIndex) => ({ ...column, sortOrder: columnIndex }));
    setCategoryPriceColumns(reorderedColumns);
    if (!category) onDraftChange?.({ priceColumns: normalizeCategoryPriceColumnDrafts(reorderedColumns) });
  }

  function handleDraftCommit() {
    if (category && !categoryFormDirty) return;
    if (categoryPriceColumnValidationMessage) return;
    onDraftNameChange?.(nameValue);
    onDraftChange?.({
      name: nameValue,
      ...(supportsDescription ? { description, descriptionVisible } : {}),
      visible,
      sortOrder,
      ...(supportCategoryPriceOptionColumns ? { priceOptionLabels: normalizedCategoryPriceOptionLabels } : {}),
      ...(supportBasicPriceColumns ? { priceColumns: normalizedCategoryPriceColumns } : {}),
    });
    onDraftCommit?.();
  }

  return (
    <form
      id={formId}
      action={draftOnly ? undefined : category ? updateCategoryAction : createCategoryAction}
      onSubmit={draftOnly ? (event) => event.preventDefault() : undefined}
      className="mt-4 space-y-4 rounded-lg border border-zinc-100 bg-zinc-50 p-4"
    >
      <HiddenMenuId menuId={menuId} />
      {category && <input type="hidden" name="categoryId" value={category.id} />}
      <input type="hidden" name="category_menu_page_id" value={category?.menu_page_id ?? pageId} />
      <div>
        <FieldLabel required>{labels.categoryLabel} 이름</FieldLabel>
        <input
          name="category_name"
          value={nameValue}
          maxLength={MENU_FIELD_LIMITS.menuCategories.name}
          placeholder={labels.categoryNamePlaceholder}
          required
          onChange={(event) => {
            setName(event.target.value);
            if (!category) {
              onDraftNameChange?.(event.target.value);
              onDraftChange?.({ name: event.target.value });
            }
          }}
          className={`mt-2 w-full rounded-lg border bg-white px-4 py-3 text-sm font-semibold text-zinc-900 outline-none transition ${
            nameInvalid ? "border-red-200 focus:border-red-500" : "border-zinc-200 focus:border-zinc-950"
          }`}
        />
        <div className="mt-2 flex items-center justify-between text-xs font-bold">
          <span className={nameInvalid ? "text-red-600" : "text-zinc-400"}>
            {!nameValue.trim() ? "이름은 필수 입력입니다" : nameValue.length > MENU_FIELD_LIMITS.menuCategories.name ? `최대 ${MENU_FIELD_LIMITS.menuCategories.name}자까지 입력 가능합니다` : ""}
          </span>
          <span className={nameValue.length > MENU_FIELD_LIMITS.menuCategories.name ? "text-red-600" : "text-zinc-400"}>{nameValue.length} / {MENU_FIELD_LIMITS.menuCategories.name}</span>
        </div>
      </div>
      {supportsDescription && (
        <ValidatedTextArea
          name="category_description"
          label={`${labels.categoryLabel} 설명`}
          defaultValue={description}
          placeholder={`${labels.categoryLabel} 설명을 입력하세요`}
          maxLength={MENU_FIELD_LIMITS.menuCategories.description}
          helperText={descriptionVisible ? `${labels.categoryLabel} 소개 문구입니다.` : "사용 안 함 상태에서는 공개 메뉴판에 설명이 표시되지 않습니다."}
          onValueChange={(value) => {
            setDescription(value);
            if (!category) onDraftChange?.({ description: value });
          }}
        />
      )}
      <ValidatedTextInput
        name="category_sort_order"
        label="정렬 순서"
        type="number"
        min={0}
        step={1}
        defaultValue={sortOrder}
        placeholder="정렬 순서를 입력하세요"
        required
        helperText="숫자가 낮을수록 먼저 표시됩니다."
        onValueChange={(value) => setSortOrder(Number(value))}
      />
      {supportCategoryPriceOptionColumns && (
        <section className="rounded-lg border border-zinc-100 bg-white p-4">
          <h4 className="text-sm font-black text-zinc-950">가격 옵션 열</h4>
          <p className="mt-2 break-keep text-xs font-bold leading-relaxed text-zinc-400">
            메뉴링크 디스플레이는 TV 메뉴판 가독성을 위해 카테고리별 공통 가격 열을 사용합니다. 예: HOT / ICE / LARGE
          </p>
          <div className="mt-4 grid gap-3">
            {categoryPriceOptionLabels.map((label, index) => (
              <div key={`category-price-option-label-${index}`} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                <ValidatedTextInput
                  name={`category_price_option_label_${index}`}
                  label={`옵션 열 ${index + 1}`}
                  defaultValue={label}
                  placeholder={index === 0 ? "HOT" : index === 1 ? "ICE" : "LARGE"}
                  maxLength={MENU_FIELD_LIMITS.menuItemPriceOptions.label}
                  helperText="이 카테고리의 모든 메뉴가 공유하는 가격 열 이름입니다."
                  onValueChange={(value) => updateCategoryPriceOptionLabel(index, value)}
                />
                <button
                  type="button"
                  onClick={() => removeCategoryPriceOptionLabel(index)}
                  className="rounded-full border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-600 transition hover:border-zinc-300 hover:text-zinc-950"
                >
                  삭제
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addCategoryPriceOptionLabel}
              disabled={categoryPriceOptionLabels.length >= maxPriceOptionColumns}
              className="w-fit rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm font-bold text-zinc-700 transition hover:border-zinc-300 hover:bg-white disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
            >
              옵션 열 추가
            </button>
          </div>
          <p className="mt-3 break-keep text-xs font-bold leading-relaxed text-zinc-400">
            메뉴링크 디스플레이에서는 가격 옵션 열을 최대 {maxPriceOptionColumns}개까지 사용할 수 있습니다.
          </p>
        </section>
      )}
      {supportBasicPriceColumns && effectiveMaxCategoryPriceColumns > 0 && (
        <section className="rounded-lg border border-zinc-100 bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h4 className="text-sm font-black text-zinc-950">가격 옵션 컬럼</h4>
              <p className="mt-2 break-keep text-xs font-bold leading-relaxed text-zinc-400">
                이 카테고리 안의 메뉴에 공통으로 사용할 가격 옵션입니다. 예: HOT, ICE, LARGE
              </p>
            </div>
            <button
              type="button"
              onClick={addCategoryPriceColumn}
              disabled={categoryPriceColumns.length >= effectiveMaxCategoryPriceColumns}
              className="rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm font-bold text-zinc-700 transition hover:border-zinc-300 hover:bg-white disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
            >
              컬럼 추가
            </button>
          </div>
          <div className="mt-4 grid gap-3">
            {categoryPriceColumns.map((column, index) => (
              <div key={column.id ?? `new-price-column-${index}`} className="rounded-lg border border-zinc-100 bg-zinc-50 p-3">
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                  <ValidatedTextInput
                    name={`category_price_column_label_${index}`}
                    label={`컬럼 ${index + 1}`}
                    defaultValue={column.label}
                    placeholder={index === 0 ? "HOT" : index === 1 ? "ICE" : "LARGE"}
                    maxLength={MENU_FIELD_LIMITS.menuItemPriceOptions.label}
                    helperText="메뉴별 가격 입력 단계에서 이 이름의 가격 칸이 생깁니다."
                    errorText={!column.label.trim() ? "컬럼 이름을 입력해주세요." : undefined}
                    onValueChange={(value) => updateCategoryPriceColumn(index, { label: value })}
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => moveCategoryPriceColumn(index, -1)}
                      disabled={index === 0}
                      className="rounded-full border border-zinc-200 bg-white px-3 py-2 text-xs font-black text-zinc-600 transition hover:border-zinc-300 hover:text-zinc-950 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
                      aria-label={`${column.label || `컬럼 ${index + 1}`} 위로 이동`}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveCategoryPriceColumn(index, 1)}
                      disabled={index === categoryPriceColumns.length - 1}
                      className="rounded-full border border-zinc-200 bg-white px-3 py-2 text-xs font-black text-zinc-600 transition hover:border-zinc-300 hover:text-zinc-950 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
                      aria-label={`${column.label || `컬럼 ${index + 1}`} 아래로 이동`}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => updateCategoryPriceColumn(index, { visible: !column.visible })}
                      className="rounded-full border border-zinc-200 bg-white px-3 py-2 text-xs font-black text-zinc-600 transition hover:border-zinc-300 hover:text-zinc-950"
                    >
                      {column.visible ? "표시" : "숨김"}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeCategoryPriceColumn(index)}
                      className="rounded-full border border-zinc-200 bg-white px-3 py-2 text-xs font-black text-zinc-600 transition hover:border-zinc-300 hover:text-zinc-950"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {categoryPriceColumns.length === 0 && (
              <EmptyState>아직 설정된 가격 옵션 컬럼이 없습니다. HOT / ICE / LARGE 같은 공통 가격 컬럼을 추가할 수 있습니다.</EmptyState>
            )}
          </div>
          <p className={`mt-3 break-keep text-xs font-bold leading-relaxed ${categoryPriceColumnValidationMessage ? "text-red-600" : "text-zinc-400"}`}>
            {categoryPriceColumnValidationMessage || `가격 옵션 컬럼은 카테고리당 최대 ${effectiveMaxCategoryPriceColumns}개까지 사용할 수 있습니다.`}
          </p>
        </section>
      )}
      <div className="grid gap-3">
        {supportsDescription && (
          <Checkbox
            name="category_description_visible"
            label={
              <LabelWithHelp help="사용 안 함으로 바꿔도 입력한 설명은 삭제되지 않습니다. 공개 메뉴판에만 표시되지 않습니다.">
                설명글 사용
              </LabelWithHelp>
            }
            defaultChecked={descriptionVisible}
            onText="사용함"
            offText="사용 안 함"
            onCheckedChange={(checked) => {
              setDescriptionVisible(checked);
              if (!category) onDraftChange?.({ descriptionVisible: checked });
            }}
          />
        )}
        <Checkbox
          name="category_visible"
          label="메뉴판 표시"
          defaultChecked={visible}
          onCheckedChange={(checked) => {
            setVisible(checked);
            if (!category) onDraftChange?.({ visible: checked });
          }}
        />
      </div>
      <div className="flex flex-wrap items-center justify-end gap-3">
        {draftOnly ? (
          <SubmitButton
            type="button"
            tone="final"
            disabled={nameInvalid || Boolean(categoryPriceColumnValidationMessage) || (Boolean(category) && !categoryFormDirty)}
            onClick={handleDraftCommit}
          >
            {draftActionLabel ?? (category ? "수정 내용 반영" : `${labels.categoryLabel} 추가`)}
          </SubmitButton>
        ) : (
          <SubmitButton tone="final" disabled={nameInvalid}>
            수정 내용 반영
          </SubmitButton>
        )}
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-bold text-zinc-700">
            {cancelLabel}
          </button>
        )}
        {deleteAction}
      </div>
      {cancelHelperText && <p className="break-keep text-right text-xs font-bold leading-relaxed text-zinc-400">{cancelHelperText}</p>}
      {draftOnly && (
        <>
          <p className="break-keep text-right text-xs font-bold leading-relaxed text-zinc-400">
            변경 내용은 메뉴 관리 탭에 임시 반영됩니다.
          </p>
          {draftFeedback && <p className="rounded-lg bg-emerald-50 px-4 py-3 text-right text-xs font-bold leading-relaxed text-emerald-700">{draftFeedback}</p>}
        </>
      )}
    </form>
  );
}

function MenuItemForm({
  menuId,
  categories,
  capabilities,
  aiDescriptionUsage,
  onAiDescriptionUsageChange,
  badgeStyles,
  labels,
  item,
  draftItem,
  committedDraftItem,
  categoryPriceOptionLabels = [],
  onDraftItemChange,
  onDraftCommit,
  onDraftCommitMessageClear,
  onDraftCopy,
  onCancel,
  cancelLabel = "취소",
  deleteAction,
  cancelHelperText,
  draftOnly = false,
  draftName,
  onDraftNameChange,
  itemCount,
  selectedCategoryId,
  priceOptions = [],
  traits = [],
  priceMode = "single",
  onPriceModeChange,
  canManageTimeSales = false,
  canManageCategoryPriceColumns = false,
  supportsPriceDisplayMode = false,
  supportsPriceNote = false,
  supportsPriceNoteWithPriceColumns = false,
  priceDisplayMode,
  onPriceDisplayModeChange,
  timeSaleOwnerItemId = null,
  timeSaleItemId,
}: {
  menuId: string;
  categories: MenuCategory[];
  capabilities: TemplateCapabilities;
  aiDescriptionUsage: { used: number; limit: number };
  onAiDescriptionUsageChange: (usage: { used: number; limit: number }) => void;
  badgeStyles: BadgeStyles;
  labels: TemplateEditorLabels;
  item?: MenuItem;
  draftItem?: ItemBasicDraft;
  committedDraftItem?: ItemBasicDraft;
  categoryPriceOptionLabels?: string[];
  onDraftItemChange?: (patch: Partial<ItemBasicDraft>) => void;
  onDraftCommit?: (patch?: Partial<ItemBasicDraft>) => void;
  onDraftCommitMessageClear?: () => void;
  onDraftCopy?: (patch: Partial<ItemBasicDraft>) => void;
  onCancel?: () => void;
  cancelLabel?: string;
  deleteAction?: ReactNode;
  cancelHelperText?: string;
  draftOnly?: boolean;
  draftName?: string;
  onDraftNameChange?: (name: string) => void;
  itemCount: number;
  selectedCategoryId: string;
  priceOptions?: MenuItemPriceOption[];
  traits?: MenuItemTrait[];
  priceMode?: PriceMode;
  onPriceModeChange?: (mode: PriceMode) => void;
  canManageTimeSales?: boolean;
  canManageCategoryPriceColumns?: boolean;
  supportsPriceDisplayMode?: boolean;
  supportsPriceNote?: boolean;
  supportsPriceNoteWithPriceColumns?: boolean;
  priceDisplayMode?: PriceDisplayMode;
  onPriceDisplayModeChange?: (mode: PriceDisplayMode) => void;
  timeSaleOwnerItemId?: string | null;
  timeSaleItemId?: string;
}) {
  const initialBadgeLabel = draftItem?.badgeLabel ?? (item ? getMenuItemBadgeLabel(item) : "");
  const initialDefaultBadgeLabel = normalizeMenuBadgeLabel(initialBadgeLabel);
  const [name, setName] = useState(draftItem?.name ?? item?.name ?? "");
  const [setNameValue, setSetNameValue] = useState(draftItem?.setName ?? item?.set_name ?? "");
  const [selectedBadgeLabel, setSelectedBadgeLabel] = useState(initialBadgeLabel ? initialDefaultBadgeLabel ?? MENU_BADGE_CUSTOM_VALUE : "none");
  const [customBadgeLabel, setCustomBadgeLabel] = useState(initialDefaultBadgeLabel ? "" : initialBadgeLabel);
  const [categoryId, setCategoryId] = useState(item?.category_id ?? selectedCategoryId);
  const currentCategoryPriceColumns = useMemo(
    () =>
      canManageCategoryPriceColumns
        ? normalizeCategoryPriceColumnDrafts(categories.find((category) => category.id === categoryId)?.priceColumns)
        : [],
    [canManageCategoryPriceColumns, categories, categoryId]
  );
  const nameValue = !item && draftName !== undefined ? draftName : name;
  const nameInvalid = !nameValue.trim() || nameValue.length > MENU_FIELD_LIMITS.menuItems.name;
  const categoryInvalid = !categoryId;
  const [draftPriceMode, setDraftPriceMode] = useState<PriceMode>(priceMode);
  const requestedPriceMode = item ? priceMode : draftPriceMode;
  const maxPriceOptionsPerItem = capabilities.maxPriceOptionsPerItem ?? MENU_LIMITS.maxPriceOptionsPerItem;
  const currentPriceMode = capabilities.priceOptions ? requestedPriceMode : "single";
  const usesCategoryPriceOptionColumns = Boolean(capabilities.categoryPriceOptionColumns && capabilities.priceOptions);
  const usesLegacyCategoryPriceOptionColumns = usesCategoryPriceOptionColumns && !canManageCategoryPriceColumns;
  const hasCategoryPriceColumns = canManageCategoryPriceColumns && currentCategoryPriceColumns.length > 0;
  const normalizedCategoryPriceOptionLabels = useMemo(
    () =>
      usesLegacyCategoryPriceOptionColumns
        ? normalizeDraftPriceOptionLabels(categoryPriceOptionLabels, maxPriceOptionsPerItem)
        : [],
    [categoryPriceOptionLabels, maxPriceOptionsPerItem, usesLegacyCategoryPriceOptionColumns]
  );
  const isOptionsMode = usesLegacyCategoryPriceOptionColumns ? normalizedCategoryPriceOptionLabels.length > 0 : !canManageCategoryPriceColumns && currentPriceMode === "options";
  const isSingleMode = !isOptionsMode;
  const supportsPortionLabel = capabilities.itemPortionLabel;
  const canEditPortionLabel = supportsPortionLabel && !canManageCategoryPriceColumns;
  const priceOptionLimitMessage = getPriceOptionLimitMessage(labels, maxPriceOptionsPerItem);
  const formId = item ? `menu-item-form-${item.id}` : "menu-item-form-new";
  const [priceValue, setPriceValue] = useState(draftItem?.price ?? (item?.price == null ? "" : String(item.price)));
  const [priceLabelValue, setPriceLabelValue] = useState(draftItem?.priceLabel ?? item?.price_label ?? "");
  const [singlePriceInputMode, setSinglePriceInputMode] = useState<SinglePriceInputMode>(() => getSinglePriceInputMode(draftItem, item));
  const [priceNoteValue, setPriceNoteValue] = useState(draftItem?.priceNote ?? item?.price_note ?? "");
  const [descriptionValue, setDescriptionValue] = useState(draftItem?.description ?? item?.description ?? "");
  const [originInfoValue, setOriginInfoValue] = useState(draftItem?.originInfo ?? item?.origin_info ?? "");
  const [visibleValue, setVisibleValue] = useState(draftItem?.visible ?? item?.visible ?? true);
  const [priceVisibleValue, setPriceVisibleValue] = useState(draftItem?.priceVisible ?? item?.price_visible ?? true);
  const [timeSaleEnabled, setTimeSaleEnabled] = useState(draftItem?.timeSale?.enabled ?? false);
  const [timeSaleName, setTimeSaleName] = useState(draftItem?.timeSale?.name ?? "타임세일");
  const [timeSalePrice, setTimeSalePrice] = useState(draftItem?.timeSale?.salePrice ?? "");
  const [timeSaleTargets, setTimeSaleTargets] = useState<ItemTimeSaleTargetDraft[]>(draftItem?.timeSale?.targets ?? []);
  const [timeSaleStartsAt, setTimeSaleStartsAt] = useState(draftItem?.timeSale?.startsAt ?? "");
  const [timeSaleEndsAt, setTimeSaleEndsAt] = useState(draftItem?.timeSale?.endsAt ?? "");
  const [timeSaleDisplayMode, setTimeSaleDisplayMode] = useState<TimeSaleDisplayMode>(
    draftItem?.timeSale?.timeDisplayMode ?? DEFAULT_TIME_SALE_DISPLAY_MODE
  );
  const [timeSaleBadgeText, setTimeSaleBadgeText] = useState(draftItem?.timeSale?.badgeText ?? DEFAULT_TIME_SALE_BADGE_TEXT);
  const [timeSaleBadgeBackgroundColor, setTimeSaleBadgeBackgroundColor] = useState(
    normalizeTimeSaleBadgeBackgroundColor(draftItem?.timeSale?.badgeBackgroundColor ?? DEFAULT_TIME_SALE_BADGE_BACKGROUND_COLOR)
  );
  const [timeSaleActive, setTimeSaleActive] = useState(draftItem?.timeSale?.active ?? true);
  const [portionVisibleValue, setPortionVisibleValue] = useState(draftItem?.portionVisible ?? item?.portion_visible ?? true);
  const [traitsVisibleValue, setTraitsVisibleValue] = useState(draftItem?.traitsVisible ?? item?.traits_visible ?? true);
  const [sortOrderValue, setSortOrderValue] = useState(draftItem?.sortOrder ?? item?.sort_order ?? itemCount);
  const [draftImageState, setDraftImageState] = useState<{
    imageUrl: string | null;
    imagePath: string | null;
    imageAction: "keep" | "replace" | "delete";
  }>({
    imageUrl: draftItem?.imageUrl ?? item?.image_url ?? null,
    imagePath: draftItem?.imagePath ?? item?.image_path ?? null,
    imageAction: draftItem?.imageAction ?? "keep",
  });
  const [draftPriceOptions, setDraftPriceOptions] = useState<DraftPriceOption[]>(() => {
    const sourceOptions =
      draftItem?.priceOptions ??
      priceOptions
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(toDraftPriceOption);

    if (usesLegacyCategoryPriceOptionColumns && normalizedCategoryPriceOptionLabels.length > 0) {
      const sourceOptionByLabel = new Map(
        sourceOptions.map((option) => [option.label.trim().toLocaleUpperCase("ko-KR"), option])
      );

      return normalizedCategoryPriceOptionLabels.map((label, index) =>
        toDraftPriceOptionFromColumn(label, index, sourceOptionByLabel.get(label.toLocaleUpperCase("ko-KR")))
      );
    }

    return sourceOptions;
  });
  const [draftPriceColumnValues, setDraftPriceColumnValues] = useState<ItemPriceColumnValueDraft[]>(() =>
    getItemPriceColumnValuesForColumns(draftItem?.priceColumnValues ?? item?.priceColumnValues, currentCategoryPriceColumns)
  );
  const [draftPriceOptionLabel, setDraftPriceOptionLabel] = useState("");
  const [draftPriceOptionPrice, setDraftPriceOptionPrice] = useState("");
  const [draftPriceOptionPriceLabel, setDraftPriceOptionPriceLabel] = useState("");
  const [draftPriceOptionError, setDraftPriceOptionError] = useState("");
  const [attemptedItemSubmit, setAttemptedItemSubmit] = useState(false);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [descriptionOverwritePending, setDescriptionOverwritePending] = useState(false);
  const [portionLabelValue, setPortionLabelValue] = useState(draftItem?.portionLabel ?? item?.portion_label ?? "");
  const effectiveDraftPriceOptions = useMemo(() => {
    if (!usesLegacyCategoryPriceOptionColumns || normalizedCategoryPriceOptionLabels.length === 0) return draftPriceOptions;
    const draftOptionByLabel = new Map(
      draftPriceOptions.map((option) => [option.label.trim().toLocaleUpperCase("ko-KR"), option])
    );

    return normalizedCategoryPriceOptionLabels.map((label, index) =>
      toDraftPriceOptionFromColumn(label, index, draftOptionByLabel.get(label.toLocaleUpperCase("ko-KR")))
    );
  }, [draftPriceOptions, normalizedCategoryPriceOptionLabels, usesLegacyCategoryPriceOptionColumns]);
  const effectiveDraftPriceColumnValues = useMemo(
    () => getItemPriceColumnValuesForColumns(draftPriceColumnValues, currentCategoryPriceColumns),
    [currentCategoryPriceColumns, draftPriceColumnValues]
  );

  const initialTraitDrafts = draftItem?.traitDrafts ?? toItemTraitDrafts(traits);
  const [traitLabelValues, setTraitLabelValues] = useState(() =>
    Array.from({ length: MENU_LIMITS.maxTraitsPerItem }, (_, index) => initialTraitDrafts[index]?.label ?? "")
  );
  const hasDraftPriceOption = usesLegacyCategoryPriceOptionColumns
    ? effectiveDraftPriceOptions.some((option) => option.visible && (String(option.price).trim() || option.priceLabel.trim()))
    : effectiveDraftPriceOptions.some((option) => option.visible);
  const hasVisiblePriceColumnValue = effectiveDraftPriceColumnValues.some((value) => value.visible);
  const visiblePriceColumnTimeSaleRows = effectiveDraftPriceColumnValues
    .filter((value) => value.visible && normalizeDraftText(value.price))
    .map((value) => {
      const column = currentCategoryPriceColumns.find((entry) => entry.id === value.priceColumnId);
      const target = timeSaleTargets.find((entry) => entry.priceColumnId === value.priceColumnId);
      return {
        priceColumnId: value.priceColumnId,
        label: column?.label ?? "옵션",
        originalPrice: Number(value.price),
        salePrice: target?.salePrice ?? "",
      };
    })
    .filter((row) => Number.isFinite(row.originalPrice) && row.originalPrice > 0);
  const activePriceColumnTimeSaleTargets = visiblePriceColumnTimeSaleRows
    .map((row) => ({
      priceColumnId: row.priceColumnId,
      salePrice: normalizeDraftText(row.salePrice),
      salePriceLabel: null,
      visible: true,
    }))
    .filter((target) => target.salePrice);
  const priceColumnValueInvalid = false;
  const canEditPriceNote = supportsPriceNote && (!hasVisiblePriceColumnValue || supportsPriceNoteWithPriceColumns);
  const isDirectPriceTextMode = isSingleMode && singlePriceInputMode === "text";
  const currentTimeSaleItemId = timeSaleItemId ?? item?.id ?? "";
  const hasTimeSaleOnAnotherItem = Boolean(timeSaleOwnerItemId && timeSaleOwnerItemId !== currentTimeSaleItemId);
  const basePriceNumber = Number(priceValue);
  const hasNumericBasePrice = Number.isFinite(basePriceNumber) && basePriceNumber > 0;
  const effectiveTimeSaleEnabled = timeSaleEnabled && !isDirectPriceTextMode;
  const timeSaleEligible =
    canManageTimeSales &&
    !hasTimeSaleOnAnotherItem &&
    !isOptionsMode &&
    !isDirectPriceTextMode &&
    priceVisibleValue &&
    (hasVisiblePriceColumnValue ? visiblePriceColumnTimeSaleRows.length > 0 : hasNumericBasePrice);
  const timeSaleBlockedMessage = hasTimeSaleOnAnotherItem
    ? "MVP에서는 메뉴판당 타임세일 1개만 설정할 수 있습니다."
    : isOptionsMode
      ? "옵션 가격이 있는 메뉴에는 타임세일을 사용할 수 없습니다."
      : isDirectPriceTextMode
        ? "직접 표시 문구는 할인 계산에 사용할 수 없어 타임세일을 적용할 수 없습니다."
      : hasVisiblePriceColumnValue && visiblePriceColumnTimeSaleRows.length === 0
        ? "가격이 입력된 옵션에만 타임세일을 적용할 수 있습니다."
        : !priceVisibleValue
          ? "가격을 숨긴 메뉴에는 타임세일을 사용할 수 없습니다."
          : !hasVisiblePriceColumnValue && !hasNumericBasePrice
            ? "숫자 가격이 있는 메뉴에만 타임세일을 사용할 수 있습니다."
            : "";
  const timeSalePriceNumber = parseTimeSalePriceInputToWon(timeSalePrice);
  const invalidPriceColumnTarget = activePriceColumnTimeSaleTargets
    .map((target) => {
      const row = visiblePriceColumnTimeSaleRows.find((entry) => entry.priceColumnId === target.priceColumnId);
      const salePriceNumber = parseTimeSalePriceInputToWon(target.salePrice);
      if (!Number.isFinite(salePriceNumber) || salePriceNumber <= 0) return "타임세일 할인가를 4.5 또는 4500처럼 입력해주세요.";
      if (row && salePriceNumber >= row.originalPrice) return "타임세일 가격은 기존 가격보다 낮아야 합니다.";
      return "";
    })
    .find(Boolean) ?? "";
  const timeSaleStartsAtMs = timeSaleStartsAt ? new Date(timeSaleStartsAt).getTime() : NaN;
  const timeSaleEndsAtMs = timeSaleEndsAt ? new Date(timeSaleEndsAt).getTime() : NaN;
  const timeSaleInvalidReason =
    canManageTimeSales && effectiveTimeSaleEnabled && !timeSaleEligible
      ? timeSaleBlockedMessage || "타임세일 설정 조건을 확인해주세요."
      : canManageTimeSales && effectiveTimeSaleEnabled && !timeSaleName.trim()
        ? "타임세일 이름을 입력해주세요."
        : canManageTimeSales && effectiveTimeSaleEnabled && hasVisiblePriceColumnValue && activePriceColumnTimeSaleTargets.length === 0
          ? "타임세일을 적용할 옵션 가격을 하나 이상 입력해주세요."
        : canManageTimeSales && effectiveTimeSaleEnabled && hasVisiblePriceColumnValue && invalidPriceColumnTarget
          ? invalidPriceColumnTarget
        : canManageTimeSales && effectiveTimeSaleEnabled && !hasVisiblePriceColumnValue && (!Number.isFinite(timeSalePriceNumber) || timeSalePriceNumber <= 0)
          ? "타임세일 할인가를 4.5 또는 4500처럼 입력해주세요."
          : canManageTimeSales && effectiveTimeSaleEnabled && !hasVisiblePriceColumnValue && timeSalePriceNumber >= basePriceNumber
            ? "타임세일 할인가는 기본 가격보다 낮아야 합니다."
            : canManageTimeSales && effectiveTimeSaleEnabled && (!Number.isFinite(timeSaleStartsAtMs) || !Number.isFinite(timeSaleEndsAtMs))
              ? "타임세일 시작/종료 일시를 입력해주세요."
              : canManageTimeSales && effectiveTimeSaleEnabled && timeSaleEndsAtMs <= timeSaleStartsAtMs
                ? "타임세일 종료 일시는 시작 일시보다 뒤여야 합니다."
                : "";
  const singlePriceInvalid = isSingleMode && (isDirectPriceTextMode ? !priceLabelValue.trim() : !priceValue.trim());
  const optionsPriceInvalid = isOptionsMode && !hasDraftPriceOption;
  const draftPriceOptionLimitExceeded = isOptionsMode && effectiveDraftPriceOptions.length > maxPriceOptionsPerItem;
  const draftPriceOptionInvalid =
    isOptionsMode &&
    effectiveDraftPriceOptions.some((option) =>
      option.visible &&
      (!option.label.trim() || (!usesLegacyCategoryPriceOptionColumns && !String(option.price).trim() && !option.priceLabel.trim()))
    );
  const singlePriceErrorText = attemptedItemSubmit && singlePriceInvalid
    ? isDirectPriceTextMode
      ? "표시 문구를 입력해주세요."
      : `${labels.priceLabel}을 숫자로 입력해주세요.`
    : undefined;
  const isCustomBadge = selectedBadgeLabel === MENU_BADGE_CUSTOM_VALUE;
  const customBadgeTooLong = isCustomBadge && customBadgeLabel.length > MENU_BADGE_MAX_LENGTH;
  const itemSaveDisabledReason = nameInvalid
    ? `${labels.itemNameLabel}을 입력해야 반영할 수 있습니다.`
    : categoryInvalid
      ? `${labels.categoryLabel}을 선택해야 반영할 수 있습니다.`
      : singlePriceInvalid
        ? isDirectPriceTextMode
          ? "표시 문구를 입력해야 반영할 수 있습니다."
          : `${labels.priceLabel}을 숫자로 입력해야 반영할 수 있습니다.`
        : priceColumnValueInvalid
          ? "옵션 컬럼 가격을 하나 이상 입력해주세요."
        : optionsPriceInvalid
          ? "옵션별 가격을 1개 이상 추가해야 반영할 수 있습니다."
        : draftPriceOptionLimitExceeded
          ? priceOptionLimitMessage
        : draftPriceOptionInvalid
          ? "가격 옵션의 옵션명과 가격 또는 표시용 가격을 입력해야 반영할 수 있습니다."
            : customBadgeTooLong
              ? `배지 문구는 최대 ${MENU_BADGE_MAX_LENGTH}자까지 입력할 수 있습니다.`
              : timeSaleInvalidReason;
  const itemDraftSaveDisabled =
    nameInvalid ||
    categoryInvalid ||
    singlePriceInvalid ||
    priceColumnValueInvalid ||
    optionsPriceInvalid ||
    draftPriceOptionLimitExceeded ||
    draftPriceOptionInvalid ||
    customBadgeTooLong ||
    Boolean(timeSaleInvalidReason);
  const itemDraftActionLabel = item ? "수정 내용 반영" : labels.itemLabel === "서비스" ? "서비스 추가" : "아이템 추가";
  const hasPortionData = Boolean(portionLabelValue.trim());
  const hasTraitData = traitLabelValues.some((label) => label.trim());
  const visibleBadgeLabel = isCustomBadge ? customBadgeLabel.trim() : selectedBadgeLabel !== "none" ? selectedBadgeLabel : "";
  const badgeVariant = labels.itemLabel === "서비스" ? "price_list" : "menu";
  const displayImageUrl = draftImageState.imageAction === "delete" ? "" : draftImageState.imageUrl ?? "";
  const selectedCategoryName = categories.find((category) => category.id === categoryId)?.name ?? "";
  const aiDescriptionUsageExceeded = aiDescriptionUsage.used >= aiDescriptionUsage.limit;
  const committedPriceOptions = useMemo(
    () => committedDraftItem?.priceOptions ?? [...priceOptions].sort((a, b) => a.sort_order - b.sort_order).map(toDraftPriceOption),
    [committedDraftItem?.priceOptions, priceOptions]
  );
  const committedPriceColumnValues = useMemo(
    () => getItemPriceColumnValuesForColumns(committedDraftItem?.priceColumnValues ?? item?.priceColumnValues, currentCategoryPriceColumns),
    [committedDraftItem?.priceColumnValues, currentCategoryPriceColumns, item?.priceColumnValues]
  );
  const committedPriceMode =
    committedDraftItem?.priceMode ?? (capabilities.priceOptions && committedPriceOptions.some((option) => option.visible !== false) ? "options" : "single");
  const itemFormDirty =
    !item ||
    normalizeDraftText(categoryId) !== normalizeDraftText(committedDraftItem?.categoryId ?? item.category_id ?? "") ||
    normalizeDraftText(nameValue) !== normalizeDraftText(committedDraftItem?.name ?? item.name) ||
    normalizeDraftText(setNameValue) !== normalizeDraftText(committedDraftItem?.setName ?? item.set_name ?? "") ||
    normalizeDraftText(descriptionValue) !== normalizeDraftText(committedDraftItem?.description ?? item.description ?? "") ||
    normalizeDraftText(originInfoValue) !== normalizeDraftText(committedDraftItem?.originInfo ?? item.origin_info ?? "") ||
    normalizeDraftText(priceValue) !== normalizeDraftText(committedDraftItem?.price ?? (item.price == null ? "" : String(item.price))) ||
    (isSingleMode &&
      singlePriceInputMode !== getSinglePriceInputMode(committedDraftItem, item)) ||
    ((isDirectPriceTextMode || !canManageCategoryPriceColumns) &&
      normalizeDraftText(priceLabelValue) !== normalizeDraftText(committedDraftItem?.priceLabel ?? item.price_label ?? "")) ||
    (canEditPriceNote &&
      normalizeDraftText(priceNoteValue) !== normalizeDraftText(committedDraftItem?.priceNote ?? item.price_note ?? "")) ||
    normalizeDraftText(visibleBadgeLabel) !== normalizeDraftText(committedDraftItem?.badgeLabel ?? getMenuItemBadgeLabel(item) ?? "") ||
    visibleValue !== (committedDraftItem?.visible ?? item.visible ?? true) ||
    normalizeDraftNumberText(sortOrderValue) !== normalizeDraftNumberText(committedDraftItem?.sortOrder ?? item.sort_order ?? itemCount) ||
    priceVisibleValue !== (committedDraftItem?.priceVisible ?? item.price_visible ?? true) ||
    currentPriceMode !== committedPriceMode ||
    (canEditPortionLabel && normalizeDraftText(portionLabelValue) !== normalizeDraftText(committedDraftItem?.portionLabel ?? item.portion_label ?? "")) ||
    (canEditPortionLabel && portionVisibleValue !== (committedDraftItem?.portionVisible ?? item.portion_visible ?? true)) ||
    traitsVisibleValue !== (committedDraftItem?.traitsVisible ?? item.traits_visible ?? true) ||
    !areDraftPriceOptionsEqual(effectiveDraftPriceOptions, committedPriceOptions) ||
    !areItemPriceColumnValueDraftsEqual(effectiveDraftPriceColumnValues, committedPriceColumnValues) ||
    draftImageState.imageUrl !== (committedDraftItem?.imageUrl ?? item.image_url ?? null) ||
    draftImageState.imagePath !== (committedDraftItem?.imagePath ?? item.image_path ?? null) ||
    draftImageState.imageAction !== (committedDraftItem?.imageAction ?? "keep") ||
    (canManageTimeSales &&
      !areItemTimeSaleDraftsEqual(
        {
          enabled: effectiveTimeSaleEnabled,
          name: timeSaleName,
          salePrice: timeSalePrice,
          targets: hasVisiblePriceColumnValue ? activePriceColumnTimeSaleTargets : [],
          startsAt: timeSaleStartsAt,
          endsAt: timeSaleEndsAt,
          timeDisplayMode: timeSaleDisplayMode,
          badgeText: timeSaleBadgeText,
          badgeBackgroundColor: timeSaleBadgeBackgroundColor,
          active: timeSaleActive,
        },
        committedDraftItem?.timeSale
      )) ||
    normalizeDraftText(draftItem?.badgeBackgroundColor) !== normalizeDraftText(committedDraftItem?.badgeBackgroundColor) ||
    normalizeDraftText(draftItem?.badgeTextColor) !== normalizeDraftText(committedDraftItem?.badgeTextColor);

  function updateBadgeDraft(nextSelectedBadgeLabel: string, nextCustomBadgeLabel = customBadgeLabel) {
    const nextBadgeLabel =
      nextSelectedBadgeLabel === MENU_BADGE_CUSTOM_VALUE
        ? nextCustomBadgeLabel.trim()
        : nextSelectedBadgeLabel !== "none"
          ? nextSelectedBadgeLabel
          : "";
    if (nextBadgeLabel.length > MENU_BADGE_MAX_LENGTH) return;
    updateDraftItem({ badgeLabel: nextBadgeLabel });
  }

  function updateDraftItem(patch: Partial<ItemBasicDraft>) {
    onDraftCommitMessageClear?.();
    onDraftItemChange?.(patch);
  }

  function getCurrentFormDraftPatch(): Partial<ItemBasicDraft> {
    const formElement = document.getElementById(formId) as HTMLFormElement | null;
    const formData = formElement ? new FormData(formElement) : null;
    const nextSinglePriceInputMode = isSingleMode ? singlePriceInputMode : "number";
    const nextPrice = nextSinglePriceInputMode === "text" ? "" : String(formData?.get("item_price") ?? priceValue);
    const nextPriceLabel =
      nextSinglePriceInputMode === "text"
        ? String(formData?.get("item_price_label") ?? priceLabelValue)
        : canManageCategoryPriceColumns
          ? ""
          : String(formData?.get("item_price_label") ?? priceLabelValue);
    const badgeValue = String(formData?.get("item_badge_label") ?? selectedBadgeLabel);
    const customBadgeValue = String(formData?.get("item_custom_badge_label") ?? customBadgeLabel);
    const nextBadgeLabel =
      badgeValue === MENU_BADGE_CUSTOM_VALUE
        ? customBadgeValue.trim()
        : badgeValue && badgeValue !== "none"
          ? badgeValue
          : "";
    const traitDrafts = Array.from({ length: MENU_LIMITS.maxTraitsPerItem }, (_, index) => ({
      id: String(formData?.get(`trait_slot_${index}_id`) ?? "") || undefined,
      label: String(formData?.get(`trait_slot_${index}_label`) ?? ""),
      value: Number(String(formData?.get(`trait_slot_${index}_value`) ?? MENU_FIELD_LIMITS.menuItemTraits.minValue)) || MENU_FIELD_LIMITS.menuItemTraits.minValue,
      visible: formData ? formData.has(`trait_slot_${index}_visible`) : Boolean(draftItem?.traitDrafts?.[index]?.visible),
      sortOrder: Number(String(formData?.get(`trait_slot_${index}_sort_order`) ?? index)) || index,
      maxValue: initialTraitDrafts[index]?.maxValue ?? MENU_FIELD_LIMITS.menuItemTraits.defaultMaxValue,
    }));

    return {
      categoryId: String(formData?.get("item_category_id") ?? categoryId),
      name: String(formData?.get("item_name") ?? nameValue),
      setName: String(formData?.get("item_set_name") ?? setNameValue),
      description: String(formData?.get("item_description") ?? descriptionValue),
      originInfo: String(formData?.get("item_origin_info") ?? originInfoValue),
      price: nextPrice,
      priceLabel: nextPriceLabel,
      singlePriceInputMode: nextSinglePriceInputMode,
      priceNote: canEditPriceNote
        ? String(formData?.get("item_price_note") ?? priceNoteValue)
        : (committedDraftItem?.priceNote ?? item?.price_note ?? ""),
      badgeLabel: nextBadgeLabel,
      visible: formData ? formData.has("item_visible") : visibleValue,
      sortOrder: Number(String(formData?.get("item_sort_order") ?? item?.sort_order ?? itemCount)) || 0,
      priceVisible: formData ? formData.has("item_price_visible") : priceVisibleValue,
      priceMode: isOptionsMode ? "options" : "single",
      ...(supportsPortionLabel
        ? {
            portionLabel: String(formData?.get("item_portion_label") ?? portionLabelValue),
            portionVisible: formData ? formData.has("item_portion_visible") : portionVisibleValue,
          }
        : {}),
      traitsVisible: formData ? formData.has("item_traits_visible") : traitsVisibleValue,
      traitDrafts,
      priceOptions: canManageCategoryPriceColumns ? undefined : isOptionsMode ? effectiveDraftPriceOptions : [],
      priceColumnValues: canManageCategoryPriceColumns
        ? effectiveDraftPriceColumnValues.map((value) => {
            const price = normalizeDraftText(value.price);
            return { ...value, price, priceLabel: "", visible: Boolean(price) };
          })
        : [],
      ...(canManageTimeSales
        ? {
            timeSale: {
              enabled: nextSinglePriceInputMode === "text" ? false : formData ? formData.has("item_time_sale_enabled") : timeSaleEnabled,
              name: String(formData?.get("item_time_sale_name") ?? timeSaleName),
              salePrice: String(formData?.get("item_time_sale_price") ?? timeSalePrice),
              targets: hasVisiblePriceColumnValue ? activePriceColumnTimeSaleTargets : [],
              startsAt: String(formData?.get("item_time_sale_starts_at") ?? timeSaleStartsAt),
              endsAt: String(formData?.get("item_time_sale_ends_at") ?? timeSaleEndsAt),
              timeDisplayMode:
                String(formData?.get("item_time_sale_display_mode") ?? timeSaleDisplayMode) === "countdown"
                  ? "countdown"
                  : DEFAULT_TIME_SALE_DISPLAY_MODE,
              badgeText: String(formData?.get("item_time_sale_badge_text") ?? timeSaleBadgeText),
              badgeBackgroundColor: normalizeTimeSaleBadgeBackgroundColor(
                formData?.get("item_time_sale_badge_background_color") ?? timeSaleBadgeBackgroundColor
              ),
              active: formData ? formData.has("item_time_sale_active") : timeSaleActive,
            },
          }
        : {}),
      imageUrl: draftImageState.imageUrl,
      imagePath: draftImageState.imagePath,
      imageAction: draftImageState.imageAction,
    };
  }

  function setPriceMode(mode: PriceMode) {
    if (!capabilities.priceOptions && mode === "options") {
      return;
    }

    if (item) {
      onPriceModeChange?.(mode);
      return;
    }

    setDraftPriceMode(mode);
  }

  function addDraftPriceOption() {
    const label = draftPriceOptionLabel.trim();
    const price = draftPriceOptionPrice.trim();
    const priceLabel = draftPriceOptionPriceLabel.trim();

    if (!label) {
      setDraftPriceOptionError("옵션명을 입력해주세요.");
      return;
    }

    if (!price && !priceLabel) {
      setDraftPriceOptionError("옵션 가격 또는 표시용 가격을 입력해주세요.");
      return;
    }

    if (draftPriceOptions.length >= maxPriceOptionsPerItem) {
      setDraftPriceOptionError(priceOptionLimitMessage);
      return;
    }

    setDraftPriceOptions((currentOptions) => [
      ...currentOptions,
      {
        id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${currentOptions.length}`,
        label,
        price,
        priceLabel,
        visible: true,
        sortOrder: currentOptions.length + 1,
      },
    ]);
    setDraftPriceOptionLabel("");
    setDraftPriceOptionPrice("");
    setDraftPriceOptionPriceLabel("");
    setDraftPriceOptionError("");
  }

  async function runAiDescriptionGeneration() {
    if (isGeneratingDescription) return;

    const trimmedName = nameValue.trim();
    if (!trimmedName) {
      toast.error("메뉴명을 먼저 입력해주세요.");
      return;
    }

    if (aiDescriptionUsageExceeded) {
      toast.error(`AI 크레딧이 부족합니다. AI 설명 작성은 1크레딧이 필요합니다. 현재 보유 AI 크레딧: ${Math.max(0, aiDescriptionUsage.limit - aiDescriptionUsage.used)}개`);
      return;
    }

    const optionPriceLabel = isOptionsMode
      ? [
          ...priceOptions.slice(0, maxPriceOptionsPerItem).filter((option) => option.visible).map((option) => `${option.label} ${formatPriceOption(option)}`.trim()),
          ...effectiveDraftPriceOptions.slice(0, maxPriceOptionsPerItem).filter((option) => option.visible).map((option) => `${option.label} ${option.priceLabel || option.price}`.trim()),
        ]
          .filter(Boolean)
          .join(" / ")
      : priceLabelValue;

    setIsGeneratingDescription(true);

    try {
      const result = await generateMenuItemDescriptionAction({
        menuId,
        itemId: item?.id,
        name: trimmedName,
        categoryName: selectedCategoryName,
        price: isSingleMode ? priceValue : null,
        priceLabel: optionPriceLabel,
        badgeLabel: visibleBadgeLabel,
        currentDescription: descriptionValue,
        serviceType: labels.itemLabel === "서비스" ? "service" : "menu",
      });

      if (!result.ok) {
        toast.error(result.message);
        if (result.usage) onAiDescriptionUsageChange(result.usage);
        return;
      }

      setDescriptionValue(result.description);
      onAiDescriptionUsageChange(result.usage);
      toast.success(result.message);
    } catch {
      toast.error("AI 설명 작성 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsGeneratingDescription(false);
      setDescriptionOverwritePending(false);
    }
  }

  function requestAiDescriptionGeneration() {
    if (descriptionValue.trim()) {
      setDescriptionOverwritePending(true);
      return;
    }

    void runAiDescriptionGeneration();
  }

  function removeDraftPriceOption(optionId: string) {
    setDraftPriceOptions((currentOptions) => currentOptions.filter((option) => option.id !== optionId));
  }

  function updateDraftPriceOption(optionId: string, patch: Partial<DraftPriceOption>) {
    setDraftPriceOptions((currentOptions) =>
      currentOptions.some((option) => option.id === optionId)
        ? currentOptions.map((option) => (option.id === optionId ? { ...option, ...patch } : option))
        : [
            ...currentOptions,
            {
              id: optionId,
              label: patch.label ?? "",
              price: patch.price ?? "",
              priceLabel: patch.priceLabel ?? "",
              visible: patch.visible ?? true,
              sortOrder: patch.sortOrder ?? currentOptions.length,
            },
          ]
    );
  }

  function updateDraftPriceColumnValue(priceColumnId: string, patch: Partial<ItemPriceColumnValueDraft>) {
    setDraftPriceColumnValues((currentValues) => {
      const nextValues = currentValues.some((value) => value.priceColumnId === priceColumnId)
        ? currentValues.map((value) => (value.priceColumnId === priceColumnId ? { ...value, ...patch } : value))
        : [
            ...currentValues,
            {
              priceColumnId,
              price: patch.price ?? "",
              priceLabel: patch.priceLabel ?? "",
              visible: patch.visible ?? false,
              sortOrder: patch.sortOrder ?? currentValues.length,
            },
          ];
      return normalizeItemPriceColumnValueDrafts(nextValues);
    });
  }

  function handleTraitLabelChange(index: number, value: string) {
    setTraitLabelValues((currentValues) => {
      const nextValues = [...currentValues];
      nextValues[index] = value;
      return nextValues;
    });
  }

  function handleItemSubmit(event: React.FormEvent<HTMLFormElement>) {
    setAttemptedItemSubmit(true);
    if (singlePriceInvalid || priceColumnValueInvalid || optionsPriceInvalid) {
      event.preventDefault();
    }
  }

  function handleDraftCopy() {
    if (!item || itemDraftSaveDisabled) {
      setAttemptedItemSubmit(true);
      return;
    }
    const draftPatch = getCurrentFormDraftPatch();
    onDraftCommit?.(draftPatch);
    onDraftCopy?.(draftPatch);
  }

  return (
    <div className="mt-4 grid gap-4 rounded-lg border border-zinc-100 bg-zinc-50 p-4">
      <form
        id={formId}
        action={draftOnly ? undefined : item ? updateMenuItemAction : createMenuItemAction}
        onSubmit={draftOnly ? (event) => event.preventDefault() : handleItemSubmit}
        className="hidden"
      />
      <HiddenMenuId menuId={menuId} form={formId} />
      {item && <input type="hidden" name="itemId" value={item.id} form={formId} />}
      <input type="hidden" name="item_price_mode" value={isOptionsMode ? "options" : "single"} form={formId} />
      {item?.is_sold_out && <input type="hidden" name="item_is_sold_out" value="on" form={formId} />}
      {!canManageCategoryPriceColumns && effectiveDraftPriceOptions.map((option, index) => (
        <span key={option.id}>
          <input type="hidden" name={`new_price_option_${index}_label`} value={option.label} form={formId} />
          <input type="hidden" name={`new_price_option_${index}_price`} value={option.price} form={formId} />
          <input type="hidden" name={`new_price_option_${index}_price_label`} value={option.priceLabel} form={formId} />
          <input type="hidden" name={`new_price_option_${index}_sort_order`} value={option.sortOrder} form={formId} />
        </span>
      ))}

      <section className="rounded-lg border border-zinc-100 bg-white p-4">
        <h4 className="text-sm font-black text-zinc-950">기본 정보</h4>
        <p className="mt-1 break-keep text-xs font-semibold leading-relaxed text-zinc-400">
          {labels.itemLabel}의 소속, 이름, 설명, 원산지 정보를 입력합니다.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <FieldLabel required>{labels.categoryLabel}</FieldLabel>
            <Select
              name="item_category_id"
              form={formId}
              value={categoryId}
              required
              onChange={(event) => {
                setCategoryId(event.target.value);
                updateDraftItem({ categoryId: event.target.value });
              }}
            >
              {categories.length === 0 && <option value="">{labels.categoryLabel}을 선택하세요</option>}
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
            <p className={`mt-2 break-keep text-xs font-bold leading-relaxed ${categoryInvalid ? "text-red-600" : "text-zinc-400"}`}>
              {categoryInvalid ? `${labels.categoryLabel}을 선택해주세요.` : `이 ${labels.itemLabel}가 표시될 ${labels.categoryLabel}을 선택하세요.`}
            </p>
          </div>
          <div>
            <FieldLabel required>{labels.itemNameLabel}</FieldLabel>
            <input
              name="item_name"
              form={formId}
              value={nameValue}
              maxLength={MENU_FIELD_LIMITS.menuItems.name}
              placeholder={labels.itemNamePlaceholder}
              required
              onChange={(event) => {
                setName(event.target.value);
                onDraftCommitMessageClear?.();
                if (item) updateDraftItem({ name: event.target.value });
                if (!item) onDraftNameChange?.(event.target.value);
              }}
              className={`mt-2 w-full rounded-lg border bg-white px-4 py-3 text-sm font-semibold text-zinc-900 outline-none transition ${
                nameInvalid ? "border-red-200 focus:border-red-500" : "border-zinc-200 focus:border-zinc-950"
              }`}
            />
            <div className="mt-2 flex items-center justify-between text-xs font-bold">
              <span className={nameInvalid ? "text-red-600" : "text-zinc-400"}>
                {!nameValue.trim()
                  ? `${labels.itemNameLabel}을 입력해주세요.`
                  : nameValue.length > MENU_FIELD_LIMITS.menuItems.name
                    ? `최대 ${MENU_FIELD_LIMITS.menuItems.name}자까지 입력 가능합니다`
                    : ""}
              </span>
              <span className={nameValue.length > MENU_FIELD_LIMITS.menuItems.name ? "text-red-600" : "text-zinc-400"}>{nameValue.length} / {MENU_FIELD_LIMITS.menuItems.name}</span>
            </div>
          </div>
          <div className="md:col-span-2">
            <FieldLabel>보조 언어 표기</FieldLabel>
            <input
              name="item_set_name"
              form={formId}
              value={setNameValue}
              maxLength={MENU_FIELD_LIMITS.menuItems.setName}
              placeholder="예: BASIL CREAM LATTE"
              onChange={(event) => {
                setSetNameValue(event.target.value);
                updateDraftItem({ setName: event.target.value });
              }}
              className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 outline-none transition focus:border-zinc-950"
            />
            <div className="mt-2 flex items-start justify-between gap-3 text-xs font-bold leading-relaxed text-zinc-400">
              <span className="break-keep">
                한국어 메뉴명 아래에 작게 함께 표시됩니다. 언어 전환 화면에서는 원래 한글 메뉴명이 보조 줄로 표시됩니다.
              </span>
              <span className="shrink-0">{setNameValue.length} / {MENU_FIELD_LIMITS.menuItems.setName}</span>
            </div>
          </div>
          {capabilities.itemDescription ? (
            <div className="md:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <FieldLabel>{labels.itemDescriptionLabel}</FieldLabel>
                <button
                  type="button"
                  disabled={isGeneratingDescription || aiDescriptionUsageExceeded}
                  onClick={requestAiDescriptionGeneration}
                  className="inline-flex items-center justify-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-black text-zinc-700 transition-colors hover:border-zinc-400 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
                >
                  {isGeneratingDescription ? (
                    <>
                      <LoadingSpinner className="h-3 w-3" />
                      작성 중...
                    </>
                  ) : (
                    "AI 설명 작성 · 1크레딧"
                  )}
                </button>
              </div>
              <ValidatedTextArea
                form={formId}
                name="item_description"
                label=""
                value={descriptionValue}
                placeholder={labels.itemDescriptionPlaceholder}
                maxLength={MENU_FIELD_LIMITS.menuItems.description}
                helperText={labels.itemDescriptionHelperText}
                onValueChange={(value) => {
                  setDescriptionValue(value);
                  updateDraftItem({ description: value });
                }}
              />
              <div className="mt-3 max-w-sm">
                <AiUsageMeter label="AI 설명 작성" used={aiDescriptionUsage.used} limit={aiDescriptionUsage.limit} compact />
              </div>
              <p className="mt-2 break-keep text-xs font-bold leading-relaxed text-zinc-400">
                AI가 생성한 문구는 참고용 초안입니다. 공개 전 실제 메뉴 정보와 일치하는지 직접 확인해주세요.
              </p>
            </div>
          ) : (
            <input type="hidden" name="item_description" value="" form={formId} />
          )}
          {capabilities.originInfo && (
            <div className="md:col-span-2">
              <FieldLabel>원산지 정보</FieldLabel>
              <TextArea
                name="item_origin_info"
                form={formId}
                value={originInfoValue}
                placeholder="원산지나 주요 재료 정보를 입력하세요"
                maxLength={MENU_FIELD_LIMITS.menuItems.originInfo}
                helperText="필요한 경우 원산지나 주요 재료 정보를 입력하세요. 예: 원두 브라질/콜롬비아, 돼지고기 국내산"
                onChange={(event) => {
                  setOriginInfoValue(event.target.value);
                  updateDraftItem({ originInfo: event.target.value });
                }}
              />
              <p className="mt-2 break-keep text-xs font-bold leading-relaxed text-zinc-400">
                원산지 및 알레르기 정보는 실제 제공 상품 기준으로 직접 확인 후 입력해주세요.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-zinc-100 bg-white p-4">
        <h4 className="text-sm font-black text-zinc-950">노출 설정</h4>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <ValidatedTextInput
            form={formId}
            name="item_sort_order"
            label="정렬 순서"
            type="number"
            min={0}
            step={1}
            defaultValue={sortOrderValue}
            placeholder="정렬 순서를 입력하세요"
            required
            helperText="숫자가 낮을수록 먼저 표시됩니다."
            onValueChange={(value) => setSortOrderValue(Number(value))}
          />
          {capabilities.itemBadges ? (
            <div className="min-w-0">
              <FieldLabel>{labels.itemLabel} 배지</FieldLabel>
              <div className="mt-2 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                <BadgeSelect
                  form={formId}
                  value={selectedBadgeLabel}
                  onChange={(value) => {
                    setSelectedBadgeLabel(value);
                    updateBadgeDraft(value);
                  }}
                  variant={badgeVariant}
                />
                {visibleBadgeLabel && (
                  <span
                    className={
                      capabilities.itemBadgeColorControl === false
                        ? "inline-flex w-fit rounded-full border border-zinc-950 bg-white px-2.5 py-0.5 text-[11px] font-black uppercase tracking-[0.04em] text-zinc-950"
                        : "inline-flex w-fit rounded-full px-2.5 py-1 text-[11px] font-black"
                    }
                    style={capabilities.itemBadgeColorControl === false ? undefined : getBadgeStyleCss(badgeStyles[getBadgeStyleKey(visibleBadgeLabel)])}
                  >
                    {visibleBadgeLabel}
                  </span>
                )}
              </div>
              {isCustomBadge && (
                <div className="mt-3">
                  <FieldLabel>배지 문구</FieldLabel>
                  <input
                    name="item_custom_badge_label"
                    form={formId}
                    value={customBadgeLabel}
                    placeholder="예: 수제, 시그니처"
                    onChange={(event) => {
                      setCustomBadgeLabel(event.target.value);
                      updateBadgeDraft(selectedBadgeLabel, event.target.value);
                    }}
                    className={`mt-2 w-full rounded-lg border bg-white px-4 py-3 text-sm font-semibold text-zinc-900 outline-none transition ${
                      customBadgeTooLong ? "border-red-200 focus:border-red-500" : "border-zinc-200 focus:border-zinc-950"
                    }`}
                  />
                  <div className="mt-2 flex items-start justify-between gap-3 text-xs font-bold leading-relaxed text-zinc-400">
                    <span className={`break-keep ${customBadgeTooLong ? "text-red-600" : ""}`}>
                      {customBadgeTooLong ? `배지 문구는 최대 ${MENU_BADGE_MAX_LENGTH}자까지 입력할 수 있습니다.` : "배지는 메뉴판에 작게 표시되는 문구입니다."}
                    </span>
                    <span className={`shrink-0 ${customBadgeTooLong ? "text-red-600" : ""}`}>{customBadgeLabel.length} / {MENU_BADGE_MAX_LENGTH}</span>
                  </div>
                </div>
              )}
              {capabilities.itemBadgeColorControl !== false && (
                <BadgeColorInlineSettings
                  formId={formId}
                  selectedBadgeLabel={visibleBadgeLabel}
                  forceStyleKey={isCustomBadge ? "default" : undefined}
                  badgeStyles={badgeStyles}
                  onColorChange={(patch) => updateDraftItem(patch)}
                />
              )}
            </div>
          ) : (
            <input type="hidden" name="item_badge_label" value={item ? getMenuItemBadgeLabel(item) || "none" : "none"} form={formId} />
          )}
          <div className="md:col-span-2 grid gap-3 md:grid-cols-2">
            <Checkbox
              form={formId}
              name="item_visible"
              label="공개 메뉴판에 표시"
              defaultChecked={visibleValue}
              onCheckedChange={(checked) => {
                setVisibleValue(checked);
                updateDraftItem({ visible: checked });
              }}
            />
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-zinc-100 bg-white p-4">
        <h4 className="inline-flex items-center gap-2 text-sm font-black text-zinc-950">
          가격 설정
          <HelpTooltip label="가격 설정 도움말">
            단일 가격은 하나의 가격을 보여줄 때 사용하고, 옵션별 가격은 HOT/ICE나 사이즈별 가격처럼 여러 가격을 보여줄 때 사용합니다.
          </HelpTooltip>
        </h4>
        {isSingleMode && canManageCategoryPriceColumns && (
          <div className="mt-4 rounded-lg border border-zinc-100 bg-zinc-50 p-4">
            <h5 className="text-sm font-black text-zinc-950">가격 입력 방식</h5>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {[
                { value: "number" as const, label: "숫자 가격", description: "4500처럼 숫자로 입력하고 표시 형식으로 자동 변환합니다." },
                { value: "text" as const, label: "직접 표시 문구", description: "4.5/5.5처럼 그대로 보여줄 문구를 입력합니다." },
              ].map((option) => {
                const selected = singlePriceInputMode === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setSinglePriceInputMode(option.value);
                      if (option.value === "number") {
                        setPriceLabelValue("");
                        updateDraftItem({ singlePriceInputMode: "number", priceLabel: "" });
                      } else {
                        setPriceValue("");
                        updateDraftItem({ singlePriceInputMode: "text", price: "" });
                      }
                    }}
                    className={`min-h-16 rounded-lg border px-4 py-3 text-left transition-colors ${
                      selected
                        ? "border-zinc-950 bg-white text-zinc-950 shadow-sm"
                        : "border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300 hover:text-zinc-800"
                    }`}
                    aria-pressed={selected}
                  >
                    <span className="block text-sm font-black">{option.label}</span>
                    <span className="mt-1 block break-keep text-xs font-bold leading-relaxed text-zinc-400">{option.description}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {supportsPriceDisplayMode && priceDisplayMode && onPriceDisplayModeChange && !isDirectPriceTextMode && (
          <div className="mt-4 rounded-lg border border-zinc-100 bg-zinc-50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h5 className="text-sm font-black text-zinc-950">가격 표시 형식</h5>
                <p className="mt-1 break-keep text-xs font-bold leading-relaxed text-zinc-500">
                  이 메뉴판의 숫자 가격을 공개 메뉴판에 표시하는 기본 형식입니다.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-white p-1">
                {[
                  { value: "compact_decimal" as const, label: "간단 표기 · 4.5" },
                  { value: "krw" as const, label: "원화 표기 · 4,500원" },
                ].map((option) => {
                  const selected = priceDisplayMode === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => onPriceDisplayModeChange(option.value)}
                      className={`min-h-10 rounded-lg px-4 text-xs font-black transition-colors ${
                        selected
                          ? "bg-zinc-950 text-white shadow-sm"
                          : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
                      }`}
                      aria-pressed={selected}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        {!usesCategoryPriceOptionColumns && !canManageCategoryPriceColumns && (
          <>
            <div className="mt-4">
              <FieldLabel>
                <LabelWithHelp help="단일 가격은 기본 가격 또는 표시용 가격을 한 번만 보여줍니다. 옵션별 가격은 여러 가격 문구를 보여줄 때 사용합니다.">
                  가격 표시 방식
                </LabelWithHelp>
              </FieldLabel>
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {(capabilities.priceOptions ? (["single", "options"] as const) : (["single"] as const)).map((mode) => (
                <label
                  key={mode}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 text-sm font-bold ${
                    currentPriceMode === mode ? "border-zinc-950 bg-zinc-50 text-zinc-950" : "border-zinc-200 bg-white text-zinc-500"
                  }`}
                >
                  <input
                    type="radio"
                    name="price_mode_selector"
                    value={mode}
                    checked={currentPriceMode === mode}
                    onChange={() => setPriceMode(mode)}
                    className="mt-1 accent-zinc-950"
                  />
                  <span>
                    {mode === "single" ? "단일 가격" : "옵션별 가격"}
                    <span className="mt-1 block text-xs font-semibold leading-relaxed text-zinc-400">
                      {mode === "single"
                        ? `기본 가격 또는 ${labels.priceLabelLabel}을 한 번만 보여줍니다.`
                        : "HOT/ICE, 사이즈, 중량처럼 가격이 나뉘는 경우 사용합니다."}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </>
        )}
        {isSingleMode && (
          <div className="mt-4">
            {isDirectPriceTextMode ? (
              <ValidatedTextInput
                form={formId}
                name="item_price_label"
                label="표시 문구"
                defaultValue={priceLabelValue}
                placeholder="예: 4.5/5.5"
                requiredIndicator
                maxLength={MENU_FIELD_LIMITS.menuItems.priceLabel}
                helperText="입력한 문구가 공개 메뉴판 가격 자리에 그대로 표시됩니다."
                errorText={singlePriceErrorText}
                onValueChange={(value) => {
                  setPriceLabelValue(value);
                  updateDraftItem({ priceLabel: value, singlePriceInputMode: "text" });
                }}
              />
            ) : (
              <ValidatedTextInput
                form={formId}
                name="item_price"
                label={`기본 ${labels.priceLabel}`}
                type="number"
                min={0}
                step={1}
                defaultValue={priceValue}
                placeholder={labels.pricePlaceholder}
                requiredIndicator
                helperText="숫자만 입력해주세요. 예: 4500"
                errorText={singlePriceErrorText}
                onValueChange={(value) => {
                  const numericValue = value.replace(/[^0-9]/g, "");
                  setPriceValue(numericValue);
                  updateDraftItem({ price: numericValue, priceLabel: "", singlePriceInputMode: "number" });
                }}
              />
            )}
            {isDirectPriceTextMode ? (
              <p className="mt-2 break-keep text-xs font-bold leading-relaxed text-amber-700">
                직접 표시 문구는 할인 계산에 사용할 수 없어 타임세일을 적용할 수 없습니다.
              </p>
            ) : null}
          </div>
        )}
        {canManageCategoryPriceColumns && !hasCategoryPriceColumns && priceOptions.some((option) => option.visible) && (
          <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-xs font-bold leading-relaxed text-amber-700">
            기존 옵션별 가격 데이터가 있습니다. 새 가격 구조에서는 카테고리 옵션 컬럼 사용을 권장합니다.
          </p>
        )}
        {canManageCategoryPriceColumns && currentCategoryPriceColumns.length > 0 && (
          <div className="mt-4 rounded-lg bg-zinc-50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h5 className="text-sm font-black text-zinc-950">옵션 컬럼 가격</h5>
                <p className="mt-1 break-keep text-xs font-bold leading-relaxed text-zinc-500">
                  이 메뉴가 속한 카테고리의 공통 가격 옵션입니다. 숫자 가격을 입력하면 선택한 표시 형식으로 자동 표시됩니다.
                </p>
                <p className="mt-1 break-keep text-xs font-bold leading-relaxed text-zinc-400">
                  가격을 입력한 옵션만 공개 메뉴판에 표시됩니다.
                </p>
              </div>
              <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-zinc-500">
                {currentCategoryPriceColumns.length}개 컬럼
              </span>
            </div>
            <div className="mt-4 overflow-hidden rounded-lg border border-zinc-200 bg-white">
              <div className="hidden grid-cols-[minmax(4rem,0.65fr)_minmax(0,1fr)] gap-3 border-b border-zinc-100 bg-zinc-50 px-3 py-2 text-[11px] font-black text-zinc-500 sm:grid">
                <span>옵션</span>
                <span>가격</span>
              </div>
              {effectiveDraftPriceColumnValues.map((value, index) => {
                const column = currentCategoryPriceColumns.find((entry) => entry.id === value.priceColumnId);
                const columnLabel = column?.label || `옵션 ${index + 1}`;

                return (
                  <div key={value.priceColumnId} className="border-b border-zinc-100 px-3 py-3 last:border-b-0">
                    <div className="grid grid-cols-[minmax(3.5rem,0.6fr)_minmax(0,1fr)] items-center gap-3">
                      <div>
                        <span className="block text-xs font-black uppercase text-zinc-950">{columnLabel}</span>
                        <span className="mt-0.5 block text-[10px] font-bold text-zinc-400 sm:hidden">옵션</span>
                      </div>
                      <input
                        form={formId}
                        name={`item_price_column_${index}_price`}
                        type="number"
                        min={0}
                        step={1}
                        defaultValue={value.price}
                        placeholder="4500"
                        aria-label={`${columnLabel} 가격`}
                        className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm font-bold text-zinc-900 outline-none transition focus:border-zinc-950"
                        onChange={(event) => {
                          const price = event.target.value.replace(/[^0-9]/g, "");
                          updateDraftPriceColumnValue(value.priceColumnId, {
                            price,
                            visible: Boolean(price),
                            sortOrder: index,
                          });
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            {attemptedItemSubmit && priceColumnValueInvalid ? (
              <p className="mt-3 break-keep text-xs font-bold leading-relaxed text-red-600">
                옵션 컬럼 가격을 하나 이상 입력해주세요.
              </p>
            ) : null}
          </div>
        )}
        {usesLegacyCategoryPriceOptionColumns ? (
          <div className="mt-4 rounded-lg bg-zinc-50 p-4">
            <p className="break-keep text-xs font-bold leading-relaxed text-zinc-500">
              이 메뉴는 카테고리에 설정된 가격 옵션 열만 사용할 수 있습니다. 옵션명을 바꾸려면 카테고리의 “가격 옵션 열”을 수정해주세요.
            </p>
            {normalizedCategoryPriceOptionLabels.length === 0 ? (
              <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-xs font-bold leading-relaxed text-amber-700">
                먼저 카테고리에서 가격 옵션 열을 추가해주세요. 예: HOT / ICE / LARGE
              </p>
            ) : (
              <div className="mt-4 grid gap-4">
                {effectiveDraftPriceOptions.map((option, index) => (
                  <div key={`${option.label}-${index}`} className="rounded-lg border border-zinc-100 bg-white p-4">
                    <h5 className="text-sm font-black text-zinc-950">{option.label}</h5>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <ValidatedTextInput
                        form={formId}
                        name={`display_price_option_${index}_price`}
                        label={`${option.label} 가격`}
                        type="number"
                        min={0}
                        step={1}
                        defaultValue={option.price}
                        placeholder="6500"
                        helperText="제공하지 않는 옵션은 비워둘 수 있습니다."
                        onValueChange={(value) => updateDraftPriceOption(option.id, { label: option.label, price: value.replace(/[^0-9]/g, ""), sortOrder: index })}
                      />
                      <ValidatedTextInput
                        form={formId}
                        name={`display_price_option_${index}_price_label`}
                        label={`${option.label} 표시용 가격`}
                        defaultValue={option.priceLabel}
                        placeholder="예: 6.5, 문의"
                        maxLength={MENU_FIELD_LIMITS.menuItemPriceOptions.priceLabel}
                        helperText="있으면 이 문구를 우선 표시합니다."
                        onValueChange={(value) => updateDraftPriceOption(option.id, { label: option.label, priceLabel: value, sortOrder: index })}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {(draftPriceOptionLimitExceeded || optionsPriceInvalid) && (
              <p className="mt-3 break-keep text-xs font-bold leading-relaxed text-red-600">
                {draftPriceOptionLimitExceeded ? priceOptionLimitMessage : "옵션 가격을 1개 이상 입력해주세요."}
              </p>
            )}
          </div>
        ) : isOptionsMode ? (
          <div className="mt-4">
            <DraftPriceOptionsEditor
              options={draftPriceOptions}
              labels={labels}
              label={draftPriceOptionLabel}
              price={draftPriceOptionPrice}
              priceLabel={draftPriceOptionPriceLabel}
              error={draftPriceOptionError || (draftPriceOptionLimitExceeded ? priceOptionLimitMessage : optionsPriceInvalid ? "옵션별 가격을 1개 이상 추가해주세요." : "")}
              maxOptions={maxPriceOptionsPerItem}
              limitMessage={priceOptionLimitMessage}
              onLabelChange={setDraftPriceOptionLabel}
              onPriceChange={setDraftPriceOptionPrice}
              onPriceLabelChange={setDraftPriceOptionPriceLabel}
              onAdd={addDraftPriceOption}
              onRemove={removeDraftPriceOption}
              onOptionChange={updateDraftPriceOption}
            />
          </div>
        ) : null}
        {canEditPriceNote && isSingleMode && (
          <div className="mt-4">
            <ValidatedTextInput
              form={formId}
              name="item_price_note"
              label="가격 옆 문구"
              defaultValue={priceNoteValue}
              placeholder="예: HOT/ICE, HOT/ICE 동일가, 시즌 한정"
              maxLength={MENU_FIELD_LIMITS.menuItems.priceNote}
              helperText="가격 오른쪽에 짧게 표시할 문구를 입력하세요."
              onValueChange={(value) => {
                setPriceNoteValue(value);
                updateDraftItem({ priceNote: value });
              }}
            />
          </div>
        )}
        <p className="mt-3 break-keep text-xs font-bold leading-relaxed text-zinc-400">
          실제 매장에서 제공하는 가격과 일치하는지 확인해주세요.
        </p>
        <div className="mt-4">
          <Checkbox
            form={formId}
            name="item_price_visible"
            label={`공개 메뉴판에 ${labels.priceLabel} 표시`}
            description={`끄면 공개 메뉴판에서 이 ${labels.itemLabel}의 ${labels.priceLabel} 정보가 숨겨집니다.`}
            defaultChecked={priceVisibleValue}
            onCheckedChange={(checked) => {
              setPriceVisibleValue(checked);
              updateDraftItem({ priceVisible: checked });
            }}
          />
        </div>
      </section>

      {canManageTimeSales && (
        <section className="rounded-lg border border-zinc-100 bg-white p-4">
          <h4 className="text-sm font-black text-zinc-950">
            타임세일
            {effectiveTimeSaleEnabled ? <span className="ml-2 rounded-full bg-zinc-950 px-2 py-0.5 text-[10px] font-black text-white">사용 중</span> : null}
          </h4>
          {isDirectPriceTextMode ? (
            <div className="mt-4 space-y-3 rounded-lg bg-amber-50 px-4 py-3">
              <p className="break-keep text-xs font-bold leading-relaxed text-amber-700">
                직접 표시 문구는 할인 계산에 사용할 수 없어 타임세일을 적용할 수 없습니다.
              </p>
              <p className="break-keep text-xs font-bold leading-relaxed text-zinc-500">
                숫자 가격을 선택하면 타임세일을 사용할 수 있습니다.
              </p>
              {timeSaleEnabled ? (
                <p className="break-keep text-xs font-black leading-relaxed text-amber-800">
                  현재 이 메뉴에 타임세일이 설정되어 있습니다. 직접 표시 문구로 저장하면 이 메뉴의 타임세일은 해제됩니다.
                </p>
              ) : null}
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-4">
              <Checkbox
                form={formId}
                name="item_time_sale_enabled"
                label="이 메뉴에 타임세일 적용"
                description="메뉴판당 1개 메뉴에만 적용됩니다. 하단 저장을 누르기 전까지 공개 메뉴판에는 반영되지 않습니다."
                defaultChecked={effectiveTimeSaleEnabled}
                canTurnOn={timeSaleEligible || effectiveTimeSaleEnabled}
                blockedMessage={timeSaleBlockedMessage}
                onCheckedChange={(checked) => {
                  const nextEnabled = checked && (timeSaleEligible || effectiveTimeSaleEnabled);
                  setTimeSaleEnabled(nextEnabled);
                  updateDraftItem({
                    timeSale: {
                      enabled: nextEnabled,
                      name: timeSaleName,
                      salePrice: timeSalePrice,
                      targets: hasVisiblePriceColumnValue ? activePriceColumnTimeSaleTargets : timeSaleTargets,
                      startsAt: timeSaleStartsAt,
                      endsAt: timeSaleEndsAt,
                      timeDisplayMode: timeSaleDisplayMode,
                      badgeText: timeSaleBadgeText,
                      badgeBackgroundColor: timeSaleBadgeBackgroundColor,
                      active: timeSaleActive,
                    },
                  });
                }}
              />
              {timeSaleBlockedMessage && !effectiveTimeSaleEnabled ? (
                <p className="mt-3 break-keep text-xs font-bold leading-relaxed text-amber-700">{timeSaleBlockedMessage}</p>
              ) : null}
              </div>
              {effectiveTimeSaleEnabled ? (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                  <ValidatedTextInput
                    form={formId}
                    name="item_time_sale_name"
                    label="타임세일 이름"
                    defaultValue={timeSaleName}
                    placeholder="타임세일"
                    maxLength={40}
                    helperText="관리용 이름입니다."
                    onValueChange={(value) => {
                      setTimeSaleName(value);
                      updateDraftItem({
                        timeSale: {
                          enabled: timeSaleEnabled,
                          name: value,
                          salePrice: timeSalePrice,
                          targets: hasVisiblePriceColumnValue ? activePriceColumnTimeSaleTargets : timeSaleTargets,
                          startsAt: timeSaleStartsAt,
                          endsAt: timeSaleEndsAt,
                          timeDisplayMode: timeSaleDisplayMode,
                          badgeText: timeSaleBadgeText,
                          badgeBackgroundColor: timeSaleBadgeBackgroundColor,
                          active: timeSaleActive,
                        },
                      });
                    }}
                  />
                  {!hasVisiblePriceColumnValue && (
                    <ValidatedTextInput
                      form={formId}
                      name="item_time_sale_price"
                      label="할인가 표시"
                      inputMode="decimal"
                      defaultValue={timeSalePrice}
                      placeholder="4.5"
                      helperText="입력한 숫자 가격은 선택한 가격 표시 형식에 따라 공개 메뉴판에 표시됩니다."
                      onValueChange={(value) => {
                        setTimeSalePrice(value);
                        updateDraftItem({
                          timeSale: {
                            enabled: timeSaleEnabled,
                            name: timeSaleName,
                            salePrice: value,
                            targets: hasVisiblePriceColumnValue ? activePriceColumnTimeSaleTargets : timeSaleTargets,
                            startsAt: timeSaleStartsAt,
                            endsAt: timeSaleEndsAt,
                            timeDisplayMode: timeSaleDisplayMode,
                            badgeText: timeSaleBadgeText,
                            badgeBackgroundColor: timeSaleBadgeBackgroundColor,
                            active: timeSaleActive,
                          },
                        });
                      }}
                    />
                  )}
                </div>
                {hasVisiblePriceColumnValue ? (
                  <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-3">
                    <div className="grid grid-cols-[minmax(52px,0.7fr)_minmax(64px,0.8fr)_minmax(92px,1fr)] items-center gap-2 border-b border-zinc-200 pb-2 text-[11px] font-black text-zinc-500">
                      <span>옵션</span>
                      <span>기존 가격</span>
                      <span>할인가</span>
                    </div>
                    <div className="divide-y divide-zinc-100">
                      {visiblePriceColumnTimeSaleRows.map((row) => (
                        <div key={row.priceColumnId} className="grid grid-cols-[minmax(52px,0.7fr)_minmax(64px,0.8fr)_minmax(92px,1fr)] items-center gap-2 py-2">
                          <span className="min-w-0 truncate text-xs font-black text-zinc-800">{row.label}</span>
                          <span className="text-xs font-bold text-zinc-500">{row.originalPrice}</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={row.salePrice}
                            placeholder="3.9"
                            onChange={(event) => {
                              const nextValue = event.target.value;
                              const nextTargets = [
                                ...timeSaleTargets.filter((target) => target.priceColumnId !== row.priceColumnId),
                                { priceColumnId: row.priceColumnId, salePrice: nextValue, salePriceLabel: null, visible: Boolean(nextValue.trim()) },
                              ];
                              setTimeSaleTargets(nextTargets);
                              updateDraftItem({
                                timeSale: {
                                  enabled: timeSaleEnabled,
                                  name: timeSaleName,
                                  salePrice: timeSalePrice,
                                  targets: nextTargets.filter((target) => normalizeDraftText(target.salePrice)),
                                  startsAt: timeSaleStartsAt,
                                  endsAt: timeSaleEndsAt,
                                  timeDisplayMode: timeSaleDisplayMode,
                                  badgeText: timeSaleBadgeText,
                                  badgeBackgroundColor: timeSaleBadgeBackgroundColor,
                                  active: timeSaleActive,
                                },
                              });
                            }}
                            className="min-h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm font-bold text-zinc-950 outline-none transition focus:border-zinc-950"
                          />
                        </div>
                      ))}
                    </div>
                    <p className="mt-2 break-keep text-xs font-bold leading-relaxed text-zinc-400">
                      가격이 입력된 옵션만 타임세일을 적용할 수 있습니다. 빈 할인가 항목은 타임세일에서 제외됩니다.
                    </p>
                  </div>
                ) : null}
                <div className="grid gap-4 md:grid-cols-2">
                  <ValidatedTextInput
                    form={formId}
                    name="item_time_sale_starts_at"
                    label="시작 일시"
                    type="datetime-local"
                    defaultValue={timeSaleStartsAt}
                    placeholder="2026-07-07T10:00"
                    onValueChange={(value) => {
                      setTimeSaleStartsAt(value);
                      updateDraftItem({
                        timeSale: {
                          enabled: timeSaleEnabled,
                          name: timeSaleName,
                          salePrice: timeSalePrice,
                          targets: hasVisiblePriceColumnValue ? activePriceColumnTimeSaleTargets : timeSaleTargets,
                          startsAt: value,
                          endsAt: timeSaleEndsAt,
                          timeDisplayMode: timeSaleDisplayMode,
                          badgeText: timeSaleBadgeText,
                          badgeBackgroundColor: timeSaleBadgeBackgroundColor,
                          active: timeSaleActive,
                        },
                      });
                    }}
                  />
                  <ValidatedTextInput
                    form={formId}
                    name="item_time_sale_ends_at"
                    label="종료 일시"
                    type="datetime-local"
                    defaultValue={timeSaleEndsAt}
                    placeholder="2026-07-07T17:00"
                    onValueChange={(value) => {
                      setTimeSaleEndsAt(value);
                      updateDraftItem({
                        timeSale: {
                          enabled: timeSaleEnabled,
                          name: timeSaleName,
                          salePrice: timeSalePrice,
                          targets: hasVisiblePriceColumnValue ? activePriceColumnTimeSaleTargets : timeSaleTargets,
                          startsAt: timeSaleStartsAt,
                          endsAt: value,
                          timeDisplayMode: timeSaleDisplayMode,
                          badgeText: timeSaleBadgeText,
                          badgeBackgroundColor: timeSaleBadgeBackgroundColor,
                          active: timeSaleActive,
                        },
                      });
                    }}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <FieldLabel>표시 방식</FieldLabel>
                    <Select
                      form={formId}
                      name="item_time_sale_display_mode"
                      value={timeSaleDisplayMode}
                      onChange={(event) => {
                        const nextMode = event.target.value === "countdown" ? "countdown" : DEFAULT_TIME_SALE_DISPLAY_MODE;
                        setTimeSaleDisplayMode(nextMode);
                        updateDraftItem({
                          timeSale: {
                            enabled: timeSaleEnabled,
                            name: timeSaleName,
                            salePrice: timeSalePrice,
                            targets: hasVisiblePriceColumnValue ? activePriceColumnTimeSaleTargets : timeSaleTargets,
                            startsAt: timeSaleStartsAt,
                            endsAt: timeSaleEndsAt,
                            timeDisplayMode: nextMode,
                            badgeText: timeSaleBadgeText,
                            badgeBackgroundColor: timeSaleBadgeBackgroundColor,
                            active: timeSaleActive,
                          },
                        });
                      }}
                    >
                      <option value="deadline">문구 표시 · 오늘 17:00까지</option>
                      <option value="countdown">카운트다운 · 00:42:18 남음</option>
                    </Select>
                    <p className="mt-2 break-keep text-xs font-bold leading-relaxed text-zinc-400">
                      문구 표시는 마감 시각을 차분하게 보여주고, 카운트다운은 남은 시간을 1초 단위로 보여줍니다.
                    </p>
                  </div>
                  <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-4">
                    <Checkbox
                      form={formId}
                      name="item_time_sale_active"
                      label="타임세일 활성화"
                      description="끄면 설정값은 저장하되 공개 메뉴판에서는 비활성 상태로 둘 수 있습니다."
                      defaultChecked={timeSaleActive}
                      onCheckedChange={(checked) => {
                        setTimeSaleActive(checked);
                        updateDraftItem({
                          timeSale: {
                            enabled: timeSaleEnabled,
                            name: timeSaleName,
                            salePrice: timeSalePrice,
                            targets: hasVisiblePriceColumnValue ? activePriceColumnTimeSaleTargets : timeSaleTargets,
                            startsAt: timeSaleStartsAt,
                            endsAt: timeSaleEndsAt,
                            timeDisplayMode: timeSaleDisplayMode,
                            badgeText: timeSaleBadgeText,
                            badgeBackgroundColor: timeSaleBadgeBackgroundColor,
                            active: checked,
                          },
                        });
                      }}
                    />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <ValidatedTextInput
                    form={formId}
                    name="item_time_sale_badge_text"
                    label="타임세일 배지 문구"
                    defaultValue={timeSaleBadgeText}
                    placeholder="타임세일"
                    maxLength={TIME_SALE_BADGE_TEXT_MAX_LENGTH}
                    helperText="메뉴명 옆에 표시할 짧은 문구입니다. 예: 타임세일, HAPPY HOUR"
                    onValueChange={(value) => {
                      setTimeSaleBadgeText(value);
                      updateDraftItem({
                        timeSale: {
                          enabled: timeSaleEnabled,
                          name: timeSaleName,
                          salePrice: timeSalePrice,
                          targets: hasVisiblePriceColumnValue ? activePriceColumnTimeSaleTargets : timeSaleTargets,
                          startsAt: timeSaleStartsAt,
                          endsAt: timeSaleEndsAt,
                          timeDisplayMode: timeSaleDisplayMode,
                          badgeText: value,
                          badgeBackgroundColor: timeSaleBadgeBackgroundColor,
                          active: timeSaleActive,
                        },
                      });
                    }}
                  />
                  <div>
                    <FieldLabel>타임세일 배지 배경색</FieldLabel>
                    <div className="mt-2 flex items-center gap-3">
                      <input
                        form={formId}
                        name="item_time_sale_badge_background_color"
                        type="color"
                        value={timeSaleBadgeBackgroundColor}
                        onChange={(event) => {
                          const nextColor = normalizeTimeSaleBadgeBackgroundColor(event.target.value);
                          setTimeSaleBadgeBackgroundColor(nextColor);
                          updateDraftItem({
                            timeSale: {
                              enabled: timeSaleEnabled,
                              name: timeSaleName,
                              salePrice: timeSalePrice,
                              targets: hasVisiblePriceColumnValue ? activePriceColumnTimeSaleTargets : timeSaleTargets,
                              startsAt: timeSaleStartsAt,
                              endsAt: timeSaleEndsAt,
                              timeDisplayMode: timeSaleDisplayMode,
                              badgeText: timeSaleBadgeText,
                              badgeBackgroundColor: nextColor,
                              active: timeSaleActive,
                            },
                          });
                        }}
                        className="h-11 w-16 rounded-lg border border-zinc-200 bg-white p-1"
                        aria-label="타임세일 배지 배경색"
                      />
                      <span
                        className="inline-flex rounded-full border px-2.5 py-1 text-[11px] font-black leading-none"
                        style={{
                          backgroundColor: timeSaleBadgeBackgroundColor,
                          borderColor: timeSaleBadgeBackgroundColor,
                          color: getReadableTextColorForTimeSaleBadge(timeSaleBadgeBackgroundColor),
                        }}
                      >
                        {timeSaleBadgeText || DEFAULT_TIME_SALE_BADGE_TEXT}
                      </span>
                    </div>
                    <p className="mt-2 break-keep text-xs font-bold leading-relaxed text-zinc-400">
                      원하는 색을 직접 고를 수 있습니다. 텍스트색은 배경 명도에 맞춰 자동으로 조정됩니다.
                    </p>
                  </div>
                </div>
                </>
              ) : (
                <p className="break-keep text-xs font-bold leading-relaxed text-zinc-400">
                  타임세일을 켜면 할인가와 마감 표시 방식을 저장할 수 있습니다.
                </p>
              )}
            </div>
          )}
        </section>
      )}

      {canEditPortionLabel && (
        <section className="rounded-lg border border-zinc-100 bg-white p-4">
          <h4 className="text-sm font-black text-zinc-950">제공량</h4>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <ValidatedTextInput
              form={formId}
              name="item_portion_label"
              label="제공량 표시 문구"
              defaultValue={portionLabelValue}
              placeholder="예: 150g, 1인분, 2pcs, 355ml, Small"
              maxLength={MENU_FIELD_LIMITS.menuItems.portionLabel}
              helperText="용량, 중량, 구성 정보를 짧게 입력하세요."
              onValueChange={(value) => {
                setPortionLabelValue(value);
                updateDraftItem({ portionLabel: value });
              }}
            />
            <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-4">
              <Checkbox
                form={formId}
                name="item_portion_visible"
                label="공개 메뉴판에 제공량 표시"
                defaultChecked={Boolean(portionVisibleValue && hasPortionData)}
                canTurnOn={hasPortionData}
                blockedMessage="제공량 표시 문구를 먼저 입력해주세요."
                onCheckedChange={(checked) => {
                  setPortionVisibleValue(checked);
                  updateDraftItem({ portionVisible: checked });
                }}
              />
            </div>
          </div>
        </section>
      )}

      {capabilities.itemTraits && (
        <section className="rounded-lg border border-zinc-100 bg-white p-4">
          <h4 className="text-sm font-black text-zinc-950">맛/특징 지표</h4>
          <div className="mt-4 rounded-lg border border-zinc-100 bg-zinc-50 p-4">
            <Checkbox
              form={formId}
              name="item_traits_visible"
              label="공개 메뉴판에 맛/특징 지표 표시"
              defaultChecked={Boolean(traitsVisibleValue && hasTraitData)}
              canTurnOn={hasTraitData}
              blockedMessage="맛/특징 지표를 1개 이상 입력해주세요."
              onCheckedChange={(checked) => {
                setTraitsVisibleValue(checked);
                updateDraftItem({ traitsVisible: checked });
              }}
            />
          </div>
          <MenuItemTraitSlots formId={formId} traits={traits} draftTraits={draftItem?.traitDrafts} onTraitLabelChange={handleTraitLabelChange} />
        </section>
      )}

      {capabilities.menuItemImages && (
        <section className="rounded-lg border border-zinc-100 bg-white p-4">
          <h4 className="inline-flex items-center gap-2 text-sm font-black text-zinc-950">
            이미지
            <HelpTooltip label="이미지 도움말">
              이미지는 선택 사항입니다. 이미지가 없으면 공개 메뉴판에서는 이미지 없는 형태로 표시됩니다.
            </HelpTooltip>
          </h4>
          <div className="mt-4">
          <ImageUploadField
            key={item?.id ?? "new-item"}
            label={labels.imageLabel}
            menuId={menuId}
            target="menu-item-draft"
            recordId={item?.id ?? "new-item"}
            currentUrl={displayImageUrl}
            uploadSuccessMessage="새 이미지는 저장 후 공개 메뉴판에 반영됩니다."
            deleteConfirmTitle="이 메뉴 이미지를 삭제할까요?"
            deleteConfirmDescription="삭제해도 하단의 저장을 누르기 전까지 공개 메뉴판에는 반영되지 않습니다."
            onDraftImageChange={(draft) => {
              setDraftImageState(draft);
              updateDraftItem({
                imageUrl: draft.imageUrl,
                imagePath: draft.imagePath,
                imageAction: draft.imageAction,
              });
            }}
          />
          </div>
        </section>
      )}

      <div className="flex flex-wrap items-center justify-end gap-3">
        {draftOnly ? (
          <>
            <SubmitButton
              type="button"
              tone="final"
              disabled={itemDraftSaveDisabled || (Boolean(item) && !itemFormDirty)}
              onClick={() => {
                setAttemptedItemSubmit(true);
                if (itemDraftSaveDisabled || (item && !itemFormDirty)) return;
                onDraftCommit?.(getCurrentFormDraftPatch());
              }}
            >
              {itemDraftActionLabel}
            </SubmitButton>
            {onCancel && (
              <button type="button" onClick={onCancel} className="rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-bold text-zinc-700">
                {cancelLabel}
              </button>
            )}
            {item && onDraftCopy && (
              <SubmitButton type="button" tone="light" disabled={itemDraftSaveDisabled} onClick={handleDraftCopy}>
                복사
              </SubmitButton>
            )}
            {deleteAction}
            {itemSaveDisabledReason && (
              <p className="basis-full break-keep text-right text-xs font-bold leading-relaxed text-amber-700">
                {itemSaveDisabledReason}
              </p>
            )}
          </>
        ) : (
          <SubmitButton
            form={formId}
            tone="final"
            disabled={nameInvalid || categoryInvalid || (Boolean(item) && !itemFormDirty)}
            onClick={() => {
              setAttemptedItemSubmit(true);
            }}
          >
            수정 내용 반영
          </SubmitButton>
        )}
      </div>
      {draftOnly && cancelHelperText && <p className="break-keep text-right text-xs font-bold leading-relaxed text-zinc-400">{cancelHelperText}</p>}
      {descriptionOverwritePending ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 px-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl">
            <h3 className="text-lg font-bold tracking-tight text-zinc-950">기존 설명을 AI 설명으로 바꿀까요?</h3>
            <p className="mt-3 break-keep text-sm font-bold leading-relaxed text-zinc-500">
              현재 입력된 설명이 AI가 작성한 설명으로 바뀝니다. 수정 내용 반영 전까지는 저장 대상에 포함되지 않습니다.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDescriptionOverwritePending(false)}
                className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-bold text-zinc-600 transition-colors hover:border-zinc-400"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => void runAiDescriptionGeneration()}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-zinc-950 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
                disabled={isGeneratingDescription}
              >
                {isGeneratingDescription ? (
                  <>
                    <LoadingSpinner className="h-4 w-4" />
                    작성 중...
                  </>
                ) : (
                  "AI 설명으로 바꾸기 · 1크레딧"
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function sortCategories(categories: MenuCategory[]) {
  return [...categories].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "ko"));
}

function sortItems(items: MenuItem[]) {
  return [...items].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "ko"));
}

function traitSummary(traits: MenuItemTrait[]) {
  return traits
    .filter((trait) => trait.visible)
    .slice(0, MENU_LIMITS.maxTraitsPerItem)
    .map((trait) => `${trait.label} ${trait.value}/${trait.max_value}`)
    .join(" · ");
}

function formatPriceOption(option: Pick<MenuItemPriceOption, "price" | "price_label">) {
  if (option.price_label) return option.price_label;
  if (typeof option.price === "number") return new Intl.NumberFormat("ko-KR").format(option.price) + "원";
  return "";
}

function getPriceOptionLimitMessage(labels: TemplateEditorLabels, maxOptions: number) {
  if (maxOptions === 3) {
    return "이 템플릿에서는 옵션별 가격을 최대 3개까지 표시할 수 있습니다.";
  }

  return `가격 옵션은 ${labels.itemLabel}당 최대 ${maxOptions}개까지 등록할 수 있습니다.`;
}

function priceOptionSummary(options: MenuItemPriceOption[], maxOptions: number = MENU_LIMITS.maxPriceOptionsPerItem) {
  return options
    .filter((option) => option.visible)
    .slice(0, maxOptions)
    .map((option) => `${option.label} ${formatPriceOption(option)}`.trim())
    .join(" · ");
}

function formatDraftPriceOption(option: DraftPriceOption) {
  if (option.priceLabel.trim()) return option.priceLabel.trim();
  const numericPrice = Number(option.price);
  if (Number.isFinite(numericPrice) && option.price.trim()) {
    return new Intl.NumberFormat("ko-KR").format(numericPrice) + "원";
  }
  return option.price.trim();
}

function DraftPriceOptionsEditor({
  options,
  labels,
  label,
  price,
  priceLabel,
  error,
  maxOptions,
  limitMessage,
  onLabelChange,
  onPriceChange,
  onPriceLabelChange,
  onAdd,
  onRemove,
  onOptionChange,
}: {
  options: DraftPriceOption[];
  labels: TemplateEditorLabels;
  label: string;
  price: string;
  priceLabel: string;
  error?: string;
  maxOptions: number;
  limitMessage: string;
  onLabelChange: (value: string) => void;
  onPriceChange: (value: string) => void;
  onPriceLabelChange: (value: string) => void;
  onAdd: () => void;
  onRemove: (optionId: string) => void;
  onOptionChange: (optionId: string, patch: Partial<DraftPriceOption>) => void;
}) {
  const reachedPriceOptionLimit = options.length >= maxOptions;
  const [editingOptionId, setEditingOptionId] = useState<string | null>(null);
  const [editingOptionDraft, setEditingOptionDraft] = useState({
    label: "",
    price: "",
    priceLabel: "",
  });
  const [editingOptionError, setEditingOptionError] = useState("");

  function startEditingOption(option: DraftPriceOption) {
    setEditingOptionId(option.id);
    setEditingOptionDraft({
      label: option.label,
      price: option.price,
      priceLabel: option.priceLabel,
    });
    setEditingOptionError("");
  }

  function cancelEditingOption() {
    setEditingOptionId(null);
    setEditingOptionDraft({ label: "", price: "", priceLabel: "" });
    setEditingOptionError("");
  }

  function completeEditingOption(optionId: string) {
    const nextLabel = editingOptionDraft.label.trim();
    const nextPrice = editingOptionDraft.price.trim();
    const nextPriceLabel = editingOptionDraft.priceLabel.trim();

    if (!nextLabel) {
      setEditingOptionError("옵션명을 입력해주세요.");
      return;
    }

    if (!nextPrice && !nextPriceLabel) {
      setEditingOptionError("옵션 가격 또는 표시용 가격을 입력해주세요.");
      return;
    }

    onOptionChange(optionId, {
      label: nextLabel,
      price: nextPrice,
      priceLabel: nextPriceLabel,
    });
    cancelEditingOption();
  }

  return (
    <div className="mt-4 rounded-lg bg-zinc-50 p-4">
      <p className={`break-keep text-xs font-bold leading-relaxed ${error ? "text-red-600" : "text-zinc-400"}`}>
        {error || limitMessage}
      </p>

      <div className="mt-4 rounded-lg border border-zinc-100 bg-white p-4">
        <h5 className="text-sm font-black text-zinc-950">새 가격 옵션 추가</h5>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_120px_160px_auto] lg:items-end">
          <div>
            <FieldLabel required>옵션명</FieldLabel>
            <TextInput value={label} onChange={(event) => onLabelChange(event.target.value)} placeholder="HOT" maxLength={MENU_FIELD_LIMITS.menuItemPriceOptions.label} helperText="예: HOT, ICE, 150g" />
          </div>
          <div>
            <FieldLabel required>가격</FieldLabel>
            <TextInput value={price} onChange={(event) => onPriceChange(event.target.value.replace(/[^0-9]/g, ""))} type="number" min={0} step={1} placeholder="4000" helperText="표시용 가격만 쓸 경우 비워둘 수 있습니다." />
          </div>
          <div>
            <FieldLabel>{labels.priceLabelLabel}</FieldLabel>
            <TextInput value={priceLabel} onChange={(event) => onPriceLabelChange(event.target.value)} placeholder={labels.priceLabelPlaceholder} maxLength={MENU_FIELD_LIMITS.menuItemPriceOptions.priceLabel} helperText="있으면 이 문구를 우선 표시합니다." />
          </div>
          <div className="flex flex-col gap-2">
            <SubmitButton type="button" tone="light" disabled={reachedPriceOptionLimit} onClick={onAdd}>
              추가
            </SubmitButton>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <h5 className="text-sm font-black text-zinc-950">옵션 목록</h5>
        <p className="mt-1 break-keep text-xs font-bold text-zinc-400">추가된 옵션은 기본 보기 상태로 표시됩니다. 값을 바꾸려면 해당 옵션의 수정 버튼을 눌러주세요.</p>
        <div className="mt-3 space-y-3">
          {options.map((option) => {
            const isEditing = editingOptionId === option.id;
            const displayPrice = formatDraftPriceOption(option);

            if (isEditing) {
              return (
                <div key={option.id} className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_120px_160px_auto] lg:items-end">
                    <div>
                      <FieldLabel required>옵션명</FieldLabel>
                      <TextInput
                        value={editingOptionDraft.label}
                        onChange={(event) => setEditingOptionDraft((currentDraft) => ({ ...currentDraft, label: event.target.value }))}
                        placeholder="HOT"
                        maxLength={MENU_FIELD_LIMITS.menuItemPriceOptions.label}
                      />
                    </div>
                    <div>
                      <FieldLabel>가격</FieldLabel>
                      <TextInput
                        value={editingOptionDraft.price}
                        onChange={(event) => setEditingOptionDraft((currentDraft) => ({ ...currentDraft, price: event.target.value.replace(/[^0-9]/g, "") }))}
                        type="number"
                        min={0}
                        step={1}
                        placeholder="4000"
                      />
                    </div>
                    <div>
                      <FieldLabel>{labels.priceLabelLabel}</FieldLabel>
                      <TextInput
                        value={editingOptionDraft.priceLabel}
                        onChange={(event) => setEditingOptionDraft((currentDraft) => ({ ...currentDraft, priceLabel: event.target.value }))}
                        placeholder={labels.priceLabelPlaceholder}
                        maxLength={MENU_FIELD_LIMITS.menuItemPriceOptions.priceLabel}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2 lg:flex-nowrap">
                      <button
                        type="button"
                        onClick={() => completeEditingOption(option.id)}
                        className="rounded-full border border-zinc-950 bg-zinc-950 px-4 py-3 text-sm font-bold text-white transition hover:bg-zinc-800"
                      >
                        수정 완료
                      </button>
                      <button
                        type="button"
                        onClick={cancelEditingOption}
                        className="rounded-full border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-600 transition hover:border-zinc-300 hover:text-zinc-900"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                  {editingOptionError && <p className="mt-2 text-xs font-bold text-red-600">{editingOptionError}</p>}
                </div>
              );
            }

            return (
              <div key={option.id} className="rounded-lg border border-zinc-100 bg-white p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-zinc-950">
                      {option.label.trim() || "옵션명 없음"}
                      <span className="mx-2 text-zinc-300">·</span>
                      <span className={displayPrice ? "text-zinc-700" : "text-red-600"}>{displayPrice || "가격 미입력"}</span>
                    </p>
                    {option.priceLabel.trim() && option.price.trim() && (
                      <p className="mt-1 text-xs font-bold text-zinc-400">가격 {new Intl.NumberFormat("ko-KR").format(Number(option.price))}원</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 sm:flex-nowrap">
                    <button
                      type="button"
                      onClick={() => startEditingOption(option)}
                      className="rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm font-bold text-zinc-700 transition hover:border-zinc-300 hover:bg-white hover:text-zinc-950"
                    >
                      수정
                    </button>
                    <button type="button" onClick={() => onRemove(option.id)} className="rounded-full border border-red-100 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 transition hover:border-red-200 hover:bg-red-100">
                      삭제
                    </button>
                  </div>
                </div>
                {!option.label.trim() && <p className="mt-2 text-xs font-bold text-red-600">옵션명을 입력해주세요.</p>}
                {!String(option.price).trim() && !option.priceLabel.trim() && <p className="mt-2 text-xs font-bold text-red-600">가격 또는 표시용 가격을 입력해주세요.</p>}
              </div>
            );
          })}
          {options.length === 0 && <EmptyState>아직 등록된 가격 옵션이 없습니다. 위의 “새 가격 옵션 추가”에서 HOT / ICE, Small / Large 같은 옵션을 추가해주세요.</EmptyState>}
        </div>
      </div>
    </div>
  );
}

export default function MenuManagementSection({
  menuId,
  menuPages,
  categories,
  items,
  priceOptions,
  traits,
  capabilities,
  canManageTimeSales = false,
  canManageCategoryPriceColumns = false,
  maxCategoryPriceColumns = 0,
  supportsPriceDisplayMode = false,
  supportsPriceNote = false,
  supportsPriceNoteWithPriceColumns = false,
  priceDisplayMode = "compact_decimal",
  timeSales = [],
  canManagePages,
  supportsDisplayPageTypes = false,
  supportsDisplayPromotionPages = false,
  supportsDisplayMenuLayoutTypes = false,
  aiDescriptionUsage,
  aiMenuCleanupUsage,
  badgeStyles,
  editorLabels,
  starterPreset,
  canConfigurePcTabletLayoutMode = false,
  pcTabletLayoutMode = DEFAULT_PC_TABLET_LAYOUT_MODE,
  canUseDisplayVideoUpload = false,
  finalSaveMessage,
  finalSaveError,
}: MenuManagementSectionProps) {
  const labels = editorLabels ?? getEditorLabelsByTemplateType("menu");
  const initialTimeSaleDraftByItemId = new Map(
    timeSales
      .map((timeSale) => [timeSale.item?.menuItemId ?? "", toItemTimeSaleDraft(timeSale)] as const)
      .filter((entry): entry is [string, ItemTimeSaleDraft] => Boolean(entry[0] && entry[1]))
  );
  const [dismissedFinalSaveError, setDismissedFinalSaveError] = useState<string | null>(null);
  const [localAiDescriptionUsage, setLocalAiDescriptionUsage] = useState({
    used: aiDescriptionUsage.used,
    limit: aiDescriptionUsage.limit,
  });
  const [localAiMenuCleanupUsage, setLocalAiMenuCleanupUsage] = useState({
    used: aiMenuCleanupUsage.used,
    limit: aiMenuCleanupUsage.limit,
  });
  const [isMenuCleanupOpen, setIsMenuCleanupOpen] = useState(false);
  const [menuCleanupText, setMenuCleanupText] = useState("");
  const [menuCleanupResult, setMenuCleanupResult] = useState<AiMenuCleanupResult | null>(null);
  const [isMenuCleanupRunning, setIsMenuCleanupRunning] = useState(false);
  const [isMenuCleanupReplaceConfirming, setIsMenuCleanupReplaceConfirming] = useState(false);
  const [menuCleanupApplyMode, setMenuCleanupApplyMode] = useState<"replace" | "append-current" | "append-new" | null>(null);
  const [pcTabletLayoutModeDraft, setPcTabletLayoutModeDraft] = useState<PcTabletLayoutMode>(() =>
    normalizePcTabletLayoutMode(pcTabletLayoutMode)
  );
  const [priceDisplayModeDraft, setPriceDisplayModeDraft] = useState<PriceDisplayMode>(() =>
    normalizePriceDisplayMode(priceDisplayMode, null)
  );
  const menuFinalSaveError =
    !finalSaveMessage && finalSaveError && dismissedFinalSaveError !== finalSaveError
      ? finalSaveError
      : null;
  const [pageBasicDrafts, setPageBasicDrafts] = useState<Record<string, PageBasicDraft>>(() =>
    Object.fromEntries(
      menuPages.map((page) => [
        page.id,
        {
          title: page.title,
          sortOrder: page.sort_order,
          displaySettings: normalizeMenuPageDisplaySettings(page.display_settings),
        },
      ])
    )
  );
  const [categoryBasicDrafts, setCategoryBasicDrafts] = useState<Record<string, CategoryBasicDraft>>(() =>
    Object.fromEntries(categories.map((category) => [category.id, { name: category.name, sortOrder: category.sort_order }]))
  );
  const [itemBasicDrafts, setItemBasicDrafts] = useState<Record<string, ItemBasicDraft>>(() =>
    Object.fromEntries(
      items.map((item) => [
        item.id,
        {
          name: item.name,
          setName: item.set_name ?? "",
          categoryId: item.category_id ?? undefined,
          isNew: false,
          description: item.description ?? "",
          originInfo: item.origin_info ?? "",
          price: item.price == null ? "" : String(item.price),
          priceLabel: item.price_label ?? "",
          singlePriceInputMode: getSinglePriceInputMode(null, item),
          priceNote: item.price_note ?? "",
          badgeLabel: getMenuItemBadgeLabel(item) ?? "",
          visible: item.visible,
          sortOrder: item.sort_order,
          imageUrl: item.image_url,
          imagePath: item.image_path,
          priceVisible: item.price_visible,
          portionLabel: item.portion_label ?? "",
          portionVisible: item.portion_visible,
          traitsVisible: item.traits_visible,
          traitDrafts: toItemTraitDrafts(traits.filter((trait) => trait.menu_item_id === item.id)),
          priceColumnValues: normalizeItemPriceColumnValueDrafts(item.priceColumnValues),
          timeSale: initialTimeSaleDraftByItemId.get(item.id),
        },
      ])
    )
  );
  const [pendingItemDrafts, setPendingItemDrafts] = useState<Record<string, ItemBasicDraft>>({});
  const [menuManagementDirtyState, setMenuManagementDirtyState] = useState({
    dirty: Boolean(finalSaveError && !finalSaveMessage),
    saveMessage: finalSaveMessage ?? null,
  });
  const menuManagementDirty =
    menuManagementDirtyState.saveMessage === (finalSaveMessage ?? null)
      ? menuManagementDirtyState.dirty
      : Boolean(finalSaveError && !finalSaveMessage);
  const canConfigureDisplayPages = canManagePages && supportsDisplayPageTypes;
  const [deletedPageIds, setDeletedPageIds] = useState<Set<string>>(() => new Set());
  const [deletedCategoryIds, setDeletedCategoryIds] = useState<Set<string>>(() => new Set());
  const [deletedItemIds, setDeletedItemIds] = useState<Set<string>>(() => new Set());
  const draftedPages = useMemo(
    () => {
      const existingPages = menuPages
        .filter((page) => !deletedPageIds.has(page.id))
        .map((page) => {
          const draft = pageBasicDrafts[page.id];
          return {
            ...page,
            title: draft?.title ?? page.title,
            description: draft?.description ?? page.description,
            description_visible: draft?.descriptionVisible ?? page.description_visible,
            display_settings: draft?.displaySettings ?? normalizeMenuPageDisplaySettings(page.display_settings),
            visible: draft?.visible ?? page.visible,
            sort_order: draft?.sortOrder ?? page.sort_order,
          };
        });
      const createdPages: MenuPage[] = Object.entries(pageBasicDrafts)
        .filter(([id, draft]) => draft.isNew && !deletedPageIds.has(id))
        .map(([id, draft]) => ({
          id,
          title: draft.title,
          description: draft.description ?? null,
          description_visible: draft.descriptionVisible ?? false,
          display_settings: draft.displaySettings ?? DEFAULT_MENU_PAGE_DISPLAY_SETTINGS,
          legacy_section_key: null,
          visible: draft.visible ?? true,
          sort_order: draft.sortOrder,
          created_at: "",
        }));

      return [...existingPages, ...createdPages];
    },
    [deletedPageIds, menuPages, pageBasicDrafts]
  );
  const draftedCategories = useMemo(
    () => {
      const existingCategories = categories
        .filter((category) => !deletedCategoryIds.has(category.id) && (!category.menu_page_id || !deletedPageIds.has(category.menu_page_id)))
        .map((category) => ({
          ...category,
          name: categoryBasicDrafts[category.id]?.name ?? category.name,
          description: categoryBasicDrafts[category.id]?.description ?? category.description,
          description_visible: categoryBasicDrafts[category.id]?.descriptionVisible ?? category.description_visible,
          visible: categoryBasicDrafts[category.id]?.visible ?? category.visible,
          sort_order: categoryBasicDrafts[category.id]?.sortOrder ?? category.sort_order,
          priceColumns: categoryBasicDrafts[category.id]?.priceColumns ?? normalizeCategoryPriceColumnDrafts(category.priceColumns),
        }));
      const createdCategories: MenuCategory[] = Object.entries(categoryBasicDrafts)
        .filter(([id, draft]) => draft.isNew && draft.pageId && !deletedCategoryIds.has(id) && !deletedPageIds.has(draft.pageId))
        .map(([id, draft]) => ({
          id,
          menu_page_id: draft.pageId ?? "",
          name: draft.name,
          description: draft.description ?? null,
          description_visible: draft.descriptionVisible ?? false,
          section_key: null,
          sort_order: draft.sortOrder,
          visible: draft.visible ?? true,
          priceColumns: normalizeCategoryPriceColumnDrafts(draft.priceColumns),
        }));

      return [...existingCategories, ...createdCategories];
    },
    [categories, categoryBasicDrafts, deletedCategoryIds, deletedPageIds]
  );
  const draftedItems = useMemo(
    () => {
      const deletedCategoryIdSet = new Set([
        ...Array.from(deletedCategoryIds),
        ...categories.filter((category) => category.menu_page_id && deletedPageIds.has(category.menu_page_id)).map((category) => category.id),
      ]);
      const existingDraftedItems = items.filter((item) => {
        if (deletedItemIds.has(item.id)) return false;
        if (item.category_id && deletedCategoryIdSet.has(item.category_id)) return false;
        return true;
      }).map((item) => {
        const draft = itemBasicDrafts[item.id];
        if (!draft) return item;
        const numericPrice = draft.price.trim() ? Number(draft.price) : null;
        const nextImageUrl = draft.imageAction === "delete" ? null : draft.imageUrl ?? item.image_url;
        const nextImagePath = draft.imageAction === "delete" ? null : draft.imagePath ?? item.image_path;
        return {
          ...item,
          category_id: draft.categoryId ?? item.category_id,
          name: draft.name,
          set_name: draft.setName.trim() ? draft.setName : null,
          description: draft.description.trim() ? draft.description : null,
          origin_info: draft.originInfo.trim() ? draft.originInfo : null,
          price: Number.isFinite(numericPrice) ? numericPrice : item.price,
          price_label: draft.priceLabel.trim() ? draft.priceLabel : null,
          price_note: draft.priceNote?.trim() ? draft.priceNote : null,
          portion_label: capabilities.itemPortionLabel ? (draft.portionLabel?.trim() ? draft.portionLabel : null) : item.portion_label,
          badge_label: draft.badgeLabel.trim() ? draft.badgeLabel : null,
          badge_type: getBadgeStyleKey(draft.badgeLabel),
          recommended: Boolean(draft.badgeLabel.trim()),
          is_best: draft.badgeLabel === "BEST",
          visible: draft.visible,
          sort_order: draft.sortOrder,
          image_url: nextImageUrl,
          image_path: nextImagePath,
          price_visible: draft.priceVisible ?? item.price_visible,
          portion_visible: capabilities.itemPortionLabel ? (draft.portionVisible ?? item.portion_visible) : item.portion_visible,
          traits_visible: draft.traitsVisible ?? item.traits_visible,
        };
      });
      const createdDraftItems: MenuItem[] = Object.entries(itemBasicDrafts)
        .filter(([, draft]) => draft.isNew && draft.categoryId && !deletedCategoryIdSet.has(draft.categoryId))
        .map(([id, draft]) => {
          const numericPrice = draft.price.trim() ? Number(draft.price) : null;
          const badgeLabel = draft.badgeLabel.trim() ? draft.badgeLabel : null;
          return {
            id,
            category_id: draft.categoryId ?? null,
            name: draft.name,
            set_name: draft.setName.trim() ? draft.setName : null,
            description: draft.description.trim() ? draft.description : null,
            price: Number.isFinite(numericPrice) && numericPrice != null ? numericPrice : 0,
            price_label: draft.priceLabel.trim() ? draft.priceLabel : null,
            price_note: draft.priceNote?.trim() ? draft.priceNote : null,
            price_visible: draft.priceVisible ?? true,
            portion_label: capabilities.itemPortionLabel && draft.portionLabel?.trim() ? draft.portionLabel : null,
            portion_visible: capabilities.itemPortionLabel ? (draft.portionVisible ?? true) : false,
            image_url: draft.imageUrl ?? null,
            image_path: draft.imagePath ?? null,
            badge_label: badgeLabel,
            badge_type: getBadgeStyleKey(badgeLabel),
            recommended: Boolean(badgeLabel),
            origin_info: draft.originInfo.trim() ? draft.originInfo : null,
            is_best: badgeLabel === "BEST",
            is_sold_out: false,
            traits_visible: draft.traitsVisible ?? true,
            visible: draft.visible,
            sort_order: draft.sortOrder,
          };
        });

      return [...existingDraftedItems, ...createdDraftItems];
    },
    [capabilities.itemPortionLabel, categories, deletedCategoryIds, deletedItemIds, deletedPageIds, items, itemBasicDrafts]
  );
  const sortedPages = useMemo(() => sortMenuPages(draftedPages), [draftedPages]);
  const firstVisiblePageId = sortedPages.find((page) => page.visible)?.id ?? sortedPages[0]?.id ?? "";
  const firstVisibleCategoryIdForInitialPage = firstVisiblePageId
    ? sortCategories(draftedCategories.filter((category) => category.menu_page_id === firstVisiblePageId)).find((category) => category.visible)?.id ??
      sortCategories(draftedCategories.filter((category) => category.menu_page_id === firstVisiblePageId))[0]?.id ??
      ""
    : "";
  const [selectedPageId, setSelectedPageId] = useState(firstVisiblePageId);
  const [editingPageId, setEditingPageId] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState("");
  const [editingItemId, setEditingItemId] = useState("");
  const [itemEditorEntryMode, setItemEditorEntryMode] = useState<"list" | "edit">("list");
  const [isCreatingPage, setIsCreatingPage] = useState(false);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [isCreatingItem, setIsCreatingItem] = useState(false);
  const [draftTarget, setDraftTarget] = useState<DraftTarget | null>(null);
  const [expandedPageIds, setExpandedPageIds] = useState<Set<string>>(() => new Set(firstVisiblePageId ? [firstVisiblePageId] : []));
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<Set<string>>(() => new Set(firstVisibleCategoryIdForInitialPage ? [firstVisibleCategoryIdForInitialPage] : []));
  const [dragState, setDragState] = useState<DragState>(null);
  const [confirmingDeleteKey, setConfirmingDeleteKey] = useState("");
  const [pageDraftFeedback, setPageDraftFeedback] = useState("");
  const [categoryDraftFeedback, setCategoryDraftFeedback] = useState("");
  const [itemDraftFeedback, setItemDraftFeedback] = useState("");
  const [isSampleResetConfirming, setIsSampleResetConfirming] = useState(false);
  const [isSampleResetApplying, setIsSampleResetApplying] = useState(false);
  const [hasRestoredBuilderState, setHasRestoredBuilderState] = useState(false);
  const newItemFormRef = useRef<HTMLDivElement | null>(null);

  function getDraftedPageDisplaySettings(page?: MenuPage | null) {
    return normalizeMenuPageDisplaySettings(page ? pageBasicDrafts[page.id]?.displaySettings ?? page.display_settings : null);
  }

  function getPromotionPageCountWithPatch(pageId: string | null, displaySettings: MenuPageDisplaySettings) {
    return sortedPages.filter((page) => {
      if (page.id === pageId || deletedPageIds.has(page.id)) return false;
      return isPromotionDisplayPage(getDraftedPageDisplaySettings(page));
    }).length + (isPromotionDisplayPage(displaySettings) ? 1 : 0);
  }

  const effectiveSelectedPageId = canManagePages ? selectedPageId : firstVisiblePageId;
  const selectedPage = sortedPages.find((page) => page.id === effectiveSelectedPageId) ?? sortedPages.find((page) => page.visible) ?? sortedPages[0] ?? null;
  const visiblePageId = selectedPage?.id ?? "";
  const selectedPageDisplaySettings = getDraftedPageDisplaySettings(selectedPage);
  const selectedPageIsPromotion = canConfigureDisplayPages && isPromotionDisplayPage(selectedPageDisplaySettings);
  const supportsDisplayMenuQualityWarnings = Boolean(
    canConfigureDisplayPages &&
    capabilities.categoryPriceOptionColumns &&
    capabilities.priceOptions &&
    !capabilities.itemDescription &&
    !capabilities.itemPortionLabel &&
    !capabilities.splitImageText &&
    !capabilities.promotionText
  );

  const categoriesForPage =
    visiblePageId && !selectedPageIsPromotion
      ? sortCategories(draftedCategories.filter((category) => category.menu_page_id === visiblePageId))
      : [];
  const visibleCategoriesForSelectedPage = categoriesForPage.filter((category) => category.visible);
  const visibleCategoryIdsForSelectedPage = new Set(visibleCategoriesForSelectedPage.map((category) => category.id));
  const visibleItemsForSelectedPage = draftedItems.filter((item) => {
    const categoryId = item.category_id;
    return item.visible && typeof categoryId === "string" && visibleCategoryIdsForSelectedPage.has(categoryId);
  });
  const selectedPageDisplayQualityNotice =
    supportsDisplayMenuQualityWarnings
      ? getDisplayMenuQualityNotice(
          selectedPageDisplaySettings,
          visibleCategoriesForSelectedPage,
          visibleItemsForSelectedPage,
          priceOptions
        )
      : null;

  const [selectedCategoryId, setSelectedCategoryId] = useState(firstVisibleCategoryIdForInitialPage);
  const selectedCategory =
    selectedPageIsPromotion
      ? null
      : categoriesForPage.find((category) => category.id === selectedCategoryId) ??
        (!canManagePages ? categoriesForPage.find((category) => category.visible) ?? categoriesForPage[0] : draftedCategories.find((category) => category.id === selectedCategoryId)) ??
        null;
  const visibleCategoryId = selectedCategory?.id ?? "";
  const itemsForCategory = sortItems(draftedItems.filter((item) => item.category_id === visibleCategoryId));
  const selectedCategoryDisplayQualityNotice = selectedCategory
    ? getDisplayMenuCategoryQualityNotice(selectedCategory, itemsForCategory, supportsDisplayMenuQualityWarnings)
    : null;
  const selectedEditingItem = editingItemId ? draftedItems.find((item) => item.id === editingItemId) ?? null : null;
  const usesCategoryPriceOptionColumns = Boolean(capabilities.categoryPriceOptionColumns && capabilities.priceOptions);
  const usesLegacyCategoryPriceOptionColumns = usesCategoryPriceOptionColumns && !canManageCategoryPriceColumns;
  const maxCategoryPriceOptionColumns = capabilities.maxPriceOptionsPerItem ?? MENU_LIMITS.maxPriceOptionsPerItem;
  const getCategoryPriceColumns = useCallback((categoryId: string) => {
    const draftColumns = categoryBasicDrafts[categoryId]?.priceColumns;
    if (draftColumns !== undefined) {
      return normalizeCategoryPriceColumnDrafts(draftColumns);
    }

    const category = draftedCategories.find((entry) => entry.id === categoryId) ?? categories.find((entry) => entry.id === categoryId);
    return normalizeCategoryPriceColumnDrafts(category?.priceColumns);
  }, [categories, categoryBasicDrafts, draftedCategories]);
  const getCategoryPriceOptionLabels = useCallback((categoryId: string) => {
    const draftLabels = categoryBasicDrafts[categoryId]?.priceOptionLabels;
    if (draftLabels !== undefined) {
      return normalizeDraftPriceOptionLabels(draftLabels, maxCategoryPriceOptionColumns);
    }

    const labels = new Map<string, { label: string; count: number; firstSortOrder: number }>();
    const categoryItems = sortItems(draftedItems.filter((item) => item.category_id === categoryId));
    for (const item of categoryItems) {
      const draftOptions = itemBasicDrafts[item.id]?.priceOptions;
      const sourceOptions = draftOptions
        ? draftOptions.map((option) => ({ label: option.label, sort_order: option.sortOrder }))
        : priceOptions.filter((option) => option.menu_item_id === item.id && option.visible);
      for (const option of sourceOptions.sort((left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0))) {
        const label = option.label.trim();
        if (!label) continue;
        const key = label.toLocaleUpperCase("ko-KR");
        const current = labels.get(key);
        if (current) {
          current.count += 1;
          current.firstSortOrder = Math.min(current.firstSortOrder, option.sort_order ?? 0);
        } else {
          labels.set(key, { label, count: 1, firstSortOrder: option.sort_order ?? 0 });
        }
      }
    }

    return normalizeDraftPriceOptionLabels(
      Array.from(labels.values())
        .sort((left, right) => left.firstSortOrder - right.firstSortOrder || right.count - left.count)
        .map((option) => option.label),
      maxCategoryPriceOptionColumns
    );
  }, [categoryBasicDrafts, draftedItems, itemBasicDrafts, maxCategoryPriceOptionColumns, priceOptions]);
  const getCategoryPriceOptionsForItem = useCallback((item: MenuItem, draft: ItemBasicDraft | undefined, categoryLabels: string[]) => {
    if (!usesLegacyCategoryPriceOptionColumns || categoryLabels.length === 0) return draft?.priceOptions;

    const draftOptions = draft?.priceOptions ?? [];
    const sourceOptions = draftOptions.length > 0
      ? draftOptions
      : priceOptions.filter((option) => option.menu_item_id === item.id && option.visible);
    const sourceOptionsByColumn = [...sourceOptions].sort((left, right) => getPriceOptionSortOrder(left) - getPriceOptionSortOrder(right));
    const sourceOptionByLabel = new Map(
      sourceOptionsByColumn.map((option) => [option.label.trim().toLocaleUpperCase("ko-KR"), option])
    );
    const canFallbackByColumnIndex = sourceOptionsByColumn.length === categoryLabels.length;

    return categoryLabels.map((label, index) =>
      toDraftPriceOptionFromColumn(
        label,
        index,
        sourceOptionByLabel.get(label.toLocaleUpperCase("ko-KR")) ?? (canFallbackByColumnIndex ? sourceOptionsByColumn[index] : undefined)
      )
    );
  }, [priceOptions, usesLegacyCategoryPriceOptionColumns]);
  const visibleStructurePages = canManagePages ? sortedPages : selectedPage ? [selectedPage] : [];
  const reachedPageLimit = sortedPages.length >= MENU_LIMITS.maxPagesPerSite;
  const reachedCategoryLimit = categoriesForPage.length >= MENU_LIMITS.maxCategoriesPerPage;
  const reachedItemsPerCategoryLimit = itemsForCategory.length >= MENU_LIMITS.maxItemsPerCategory;
  const reachedItemsPerSiteLimit = draftedItems.length >= MENU_LIMITS.maxItemsPerSite;
  const reachedItemLimit = reachedItemsPerCategoryLimit || reachedItemsPerSiteLimit;
  const timeSaleOwnerItemId = useMemo(
    () =>
      Object.entries(itemBasicDrafts).find(([itemId, draft]) => {
        if (deletedItemIds.has(itemId)) return false;
        if (canManageCategoryPriceColumns) {
          const categoryPriceColumns = getCategoryPriceColumns(draft.categoryId ?? "");
          const priceColumnValues = getItemPriceColumnValuesForColumns(draft.priceColumnValues, categoryPriceColumns);
          if (priceColumnValues.some((value) => value.visible)) return false;
        }
        return draft.timeSale?.enabled === true;
      })?.[0] ?? null,
    [canManageCategoryPriceColumns, deletedItemIds, getCategoryPriceColumns, itemBasicDrafts]
  );
  const isItemSelected = Boolean(editingItemId || isCreatingItem);
  const isCategorySelected = Boolean(selectedCategory && !isItemSelected);
  const isPageSelectedOnly = Boolean(selectedPage && !visibleCategoryId && !isItemSelected);
  const hasNoSelection = !selectedPage && !visibleCategoryId && !isItemSelected;
  const shouldShowPageCreateButton = canManagePages && !isItemSelected && (hasNoSelection || isPageSelectedOnly || isCategorySelected);
  const shouldShowCategoryCreateButton = Boolean(selectedPage && !selectedPageIsPromotion && !isItemSelected && (isPageSelectedOnly || isCategorySelected));
  const shouldShowItemCreateButton = Boolean(selectedCategory && (isCategorySelected || Boolean(editingItemId)));
  const selectedOrderMoveTarget = (() => {
    if (editingItemId) {
      const selectedItem = draftedItems.find((item) => item.id === editingItemId);
      const categoryId = selectedItem?.category_id ?? "";
      const siblingIds = categoryId ? sortItems(draftedItems.filter((item) => item.category_id === categoryId)).map((item) => item.id) : [];
      return { type: "item" as const, label: labels.itemLabel, selectedId: editingItemId, siblingIds };
    }

    if (selectedCategory) {
      const pageId = selectedCategory.menu_page_id ?? visiblePageId;
      const siblingIds = pageId ? sortCategories(draftedCategories.filter((category) => category.menu_page_id === pageId)).map((category) => category.id) : [];
      return { type: "category" as const, label: labels.categoryLabel, selectedId: selectedCategory.id, siblingIds };
    }

    if (canManagePages && selectedPage) {
      return { type: "page" as const, label: labels.pageLabel, selectedId: selectedPage.id, siblingIds: sortedPages.map((page) => page.id) };
    }

    return null;
  })();
  const selectedOrderMoveIndex = selectedOrderMoveTarget ? selectedOrderMoveTarget.siblingIds.indexOf(selectedOrderMoveTarget.selectedId) : -1;
  const canMoveSelectedOrderUp = selectedOrderMoveIndex > 0;
  const canMoveSelectedOrderDown =
    selectedOrderMoveTarget != null &&
    selectedOrderMoveIndex >= 0 &&
    selectedOrderMoveIndex < selectedOrderMoveTarget.siblingIds.length - 1;
  const pageBasicDraftPayload = useMemo(
    () =>
      JSON.stringify(
        sortedPages.map((page) => {
          const draft = pageBasicDrafts[page.id];
          return {
            id: page.id,
            isNew: Boolean(draft?.isNew),
            title: draft?.title ?? page.title,
            description: draft?.description ?? page.description ?? "",
            descriptionVisible: draft?.descriptionVisible ?? page.description_visible,
            displaySettings: normalizeMenuPageDisplaySettings(draft?.displaySettings ?? page.display_settings),
            visible: draft?.visible ?? page.visible,
            sortOrder: draft?.sortOrder ?? page.sort_order,
          };
        })
      ),
    [pageBasicDrafts, sortedPages]
  );
  const categoryBasicDraftPayload = useMemo(
    () =>
      JSON.stringify(
        draftedCategories.map((category) => ({
          id: category.id,
          isNew: Boolean(categoryBasicDrafts[category.id]?.isNew),
          pageId: categoryBasicDrafts[category.id]?.pageId ?? category.menu_page_id,
          name: categoryBasicDrafts[category.id]?.name ?? category.name,
          description: categoryBasicDrafts[category.id]?.description ?? category.description ?? "",
          descriptionVisible: categoryBasicDrafts[category.id]?.descriptionVisible ?? category.description_visible,
          visible: categoryBasicDrafts[category.id]?.visible ?? category.visible,
          sortOrder: categoryBasicDrafts[category.id]?.sortOrder ?? category.sort_order,
          priceOptionLabels: usesLegacyCategoryPriceOptionColumns ? getCategoryPriceOptionLabels(category.id) : undefined,
          priceColumns: canManageCategoryPriceColumns ? getCategoryPriceColumns(category.id) : undefined,
        }))
      ),
    [canManageCategoryPriceColumns, categoryBasicDrafts, draftedCategories, getCategoryPriceColumns, getCategoryPriceOptionLabels, usesLegacyCategoryPriceOptionColumns]
  );
  const itemBasicDraftPayload = useMemo(
    () =>
      JSON.stringify(
        draftedItems
          .filter((item) => items.some((sourceItem) => sourceItem.id === item.id) || Boolean(itemBasicDrafts[item.id]))
          .map((item) => {
            const draft = itemBasicDrafts[item.id];
            const categoryId = draft?.categoryId ?? item.category_id ?? "";
            const categoryPriceOptionLabels = usesLegacyCategoryPriceOptionColumns ? getCategoryPriceOptionLabels(categoryId) : [];
            const categoryPriceOptions = getCategoryPriceOptionsForItem(item, draft, categoryPriceOptionLabels);
            const categoryPriceColumns = canManageCategoryPriceColumns ? getCategoryPriceColumns(categoryId) : [];
            const priceColumnValues = canManageCategoryPriceColumns
              ? getItemPriceColumnValuesForColumns(draft?.priceColumnValues ?? item.priceColumnValues, categoryPriceColumns)
              : undefined;
            const hasCategoryPriceOptionValue = Boolean(
              categoryPriceOptions?.some((option) => {
                const priceValue = typeof option.price === "string" ? option.price.trim() : String(option.price ?? "").trim();
                return Boolean(priceValue || option.priceLabel.trim());
              })
            );
            return {
              id: item.id,
              isNew: Boolean(draft?.isNew),
              categoryId,
              name: draft?.name ?? item.name,
              setName: draft?.setName ?? item.set_name ?? "",
              description: draft?.description ?? item.description ?? "",
              originInfo: draft?.originInfo ?? item.origin_info ?? "",
              price: draft?.price ?? (item.price == null ? "" : String(item.price)),
              priceLabel: draft?.priceLabel ?? item.price_label ?? "",
              singlePriceInputMode: getSinglePriceInputMode(draft, item),
              priceNote: draft?.priceNote ?? item.price_note ?? "",
              badgeLabel: draft?.badgeLabel ?? getMenuItemBadgeLabel(item) ?? "",
              visible: draft?.visible ?? item.visible,
              sortOrder: draft?.sortOrder ?? item.sort_order,
              imageUrl: draft?.imageUrl ?? item.image_url ?? null,
              imagePath: draft?.imagePath ?? item.image_path ?? null,
              imageAction: draft?.imageAction ?? "keep",
              priceVisible: draft?.priceVisible ?? item.price_visible,
              priceMode: usesLegacyCategoryPriceOptionColumns && hasCategoryPriceOptionValue ? "options" : draft?.priceMode,
              portionLabel: capabilities.itemPortionLabel ? (draft?.portionLabel ?? item.portion_label ?? "") : item.portion_label ?? "",
              portionVisible: capabilities.itemPortionLabel ? (draft?.portionVisible ?? item.portion_visible) : item.portion_visible,
              traitsVisible: draft?.traitsVisible ?? item.traits_visible,
              traitDrafts: draft?.traitDrafts ?? toItemTraitDrafts(traits.filter((trait) => trait.menu_item_id === item.id)),
              priceOptions: canManageCategoryPriceColumns ? undefined : categoryPriceOptions,
              priceColumnValues,
              timeSale: draft?.timeSale,
              badgeStyleKey: draft?.badgeStyleKey,
              badgeBackgroundColor: draft?.badgeBackgroundColor,
              badgeTextColor: draft?.badgeTextColor,
            };
          })
      ),
    [canManageCategoryPriceColumns, capabilities.itemPortionLabel, draftedItems, getCategoryPriceColumns, getCategoryPriceOptionLabels, getCategoryPriceOptionsForItem, itemBasicDrafts, items, traits, usesLegacyCategoryPriceOptionColumns]
  );
  const deletedPageIdsPayload = useMemo(() => JSON.stringify(Array.from(deletedPageIds)), [deletedPageIds]);
  const deletedCategoryIdsPayload = useMemo(() => JSON.stringify(Array.from(deletedCategoryIds)), [deletedCategoryIds]);
  const deletedItemIdsPayload = useMemo(() => JSON.stringify(Array.from(deletedItemIds)), [deletedItemIds]);

  useEffect(() => {
    if (hasRestoredBuilderState) return;

    const focusedItemId = new URLSearchParams(window.location.search).get("editingItemId") ?? "";
    const savedBuilderState = readMenuBuilderState(menuId);
    const targetEditingItemId = focusedItemId || savedBuilderState.editingItemId || "";
    const savedItem = targetEditingItemId
      ? draftedItems.find((item) => item.id === targetEditingItemId)
      : null;
    const savedItemCategory = savedItem ? draftedCategories.find((category) => category.id === savedItem.category_id) : null;

    const timeoutId = window.setTimeout(() => {
      if (savedItem && savedItemCategory) {
        if (savedItemCategory.menu_page_id) setSelectedPageId(savedItemCategory.menu_page_id);
        setSelectedCategoryId(savedItemCategory.id);
        setEditingItemId(savedItem.id);
        setExpandedPageIds(new Set(savedItemCategory.menu_page_id ? [savedItemCategory.menu_page_id] : []));
        setExpandedCategoryIds(new Set([savedItemCategory.id]));
        setHasRestoredBuilderState(true);
        return;
      }

      const nextPageId =
        canManagePages && savedBuilderState.selectedPageId && sortedPages.some((page) => page.id === savedBuilderState.selectedPageId)
          ? savedBuilderState.selectedPageId
          : sortedPages.find((page) => page.visible)?.id ?? sortedPages[0]?.id ?? "";
      const categoriesForNextPage = nextPageId
        ? sortCategories(draftedCategories.filter((category) => category.menu_page_id === nextPageId))
        : [];
      const nextCategoryId =
        savedBuilderState.selectedCategoryId && categoriesForNextPage.some((category) => category.id === savedBuilderState.selectedCategoryId)
          ? savedBuilderState.selectedCategoryId
          : categoriesForNextPage.find((category) => category.visible)?.id ?? categoriesForNextPage[0]?.id ?? "";

      setSelectedPageId(nextPageId);
      setSelectedCategoryId(nextCategoryId);
      setExpandedPageIds(new Set(nextPageId ? [nextPageId] : []));
      setExpandedCategoryIds(new Set(nextCategoryId ? [nextCategoryId] : []));
      setHasRestoredBuilderState(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [canManagePages, draftedCategories, draftedItems, hasRestoredBuilderState, menuId, sortedPages]);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(
        `${MENU_BUILDER_STATE_KEY_PREFIX}:${menuId}`,
        JSON.stringify({
          selectedPageId: visiblePageId,
          selectedCategoryId: visibleCategoryId,
          editingItemId,
        })
      );
    } catch {
      // Session storage can be unavailable in private browsing or strict modes.
    }
  }, [menuId, visiblePageId, visibleCategoryId, editingItemId]);

  useEffect(() => {
    if (!isCreatingItem) return;

    const formElement = newItemFormRef.current;
    if (!formElement) return;

    formElement.scrollIntoView({ block: "nearest", behavior: "smooth" });
    const nameInput = formElement.querySelector<HTMLInputElement>('input[name="item_name"]');
    window.setTimeout(() => nameInput?.focus(), 120);
  }, [isCreatingItem]);

  function clearFinalSaveSummary() {
    if (finalSaveError) setDismissedFinalSaveError(finalSaveError);
  }

  function markMenuManagementDirty() {
    clearFinalSaveSummary();
    setMenuManagementDirtyState({ dirty: true, saveMessage: finalSaveMessage ?? null });
  }

  function updatePcTabletLayoutModeDraft(nextMode: PcTabletLayoutMode) {
    setPcTabletLayoutModeDraft(nextMode);
    markMenuManagementDirty();
  }

  function updatePriceDisplayModeDraft(nextMode: PriceDisplayMode) {
    setPriceDisplayModeDraft(nextMode);
    markMenuManagementDirty();
  }

  function resetModes() {
    clearFinalSaveSummary();
    setEditingPageId("");
    setEditingCategoryId("");
    setEditingItemId("");
    setItemEditorEntryMode("list");
    setIsCreatingPage(false);
    setIsCreatingCategory(false);
    setIsCreatingItem(false);
    setDraftTarget(null);
    setConfirmingDeleteKey("");
    setPageDraftFeedback("");
    setCategoryDraftFeedback("");
    setItemDraftFeedback("");
  }

  function closeMenuCleanupDialog() {
    setIsMenuCleanupOpen(false);
    setMenuCleanupResult(null);
    setIsMenuCleanupRunning(false);
    setIsMenuCleanupReplaceConfirming(false);
    setMenuCleanupApplyMode(null);
  }

  async function runAiMenuCleanup() {
    const rawText = menuCleanupText.trim();

    if (!rawText) {
      toast.error("정리할 메뉴 내용을 입력해주세요.");
      return;
    }

    if (rawText.length < 8) {
      toast.error("정리할 메뉴 내용을 조금 더 입력해주세요.");
      return;
    }

    if (rawText.length > 4000) {
      toast.error("입력 내용이 너무 깁니다. 4,000자 이하로 입력해주세요.");
      return;
    }

    if (localAiMenuCleanupUsage.used >= localAiMenuCleanupUsage.limit) {
      toast.error(`AI 크레딧이 부족합니다. AI 메뉴 정리는 3크레딧이 필요합니다. 현재 보유 AI 크레딧: ${Math.max(0, localAiMenuCleanupUsage.limit - localAiMenuCleanupUsage.used)}개`);
      return;
    }

    setIsMenuCleanupRunning(true);

    try {
      const result = await generateAiMenuCleanupAction({
        menuId,
        rawText,
        serviceType: labels.itemLabel === "서비스" ? "service" : "menu",
      });

      if (!result.ok) {
        toast.error(result.message);
        if (result.usage) setLocalAiMenuCleanupUsage(result.usage);
        return;
      }

      setMenuCleanupResult(result.data);
      setLocalAiMenuCleanupUsage(result.usage);
      toast.success(result.message);
    } catch {
      toast.error("AI 메뉴 정리 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsMenuCleanupRunning(false);
    }
  }

  function getCleanedAiMenuCategories() {
    return (menuCleanupResult?.categories ?? [])
      .map((category) => ({
        ...category,
        name: category.name.trim(),
        description: category.description.trim(),
        items: category.items.filter((item) => item.name.trim()),
      }))
      .filter((category) => category.name && category.items.length > 0);
  }

  function getAiCleanupItemDraft(item: AiMenuCleanupItem, categoryId: string, sortOrder: number): ItemBasicDraft {
    const price = typeof item.price === "number" && Number.isFinite(item.price) ? String(Math.max(0, Math.floor(item.price))) : "";
    const priceLabel = item.price_label.trim() || (price ? "" : "문의");

    return {
      categoryId,
      isNew: true,
      imageUrl: null,
      imagePath: null,
      imageAction: "keep",
      name: item.name.trim().slice(0, MENU_FIELD_LIMITS.menuItems.name),
      setName: "",
      description: capabilities.itemDescription ? item.description.trim().slice(0, MENU_FIELD_LIMITS.menuItems.description) : "",
      originInfo: "",
      price,
      priceLabel: priceLabel.slice(0, MENU_FIELD_LIMITS.menuItems.priceLabel),
      badgeLabel: capabilities.itemBadges ? item.badge_label.trim().slice(0, MENU_BADGE_MAX_LENGTH) : "",
      visible: true,
      sortOrder,
      priceVisible: true,
      portionLabel: "",
      portionVisible: false,
      traitsVisible: false,
      traitDrafts: [],
    };
  }

  function getAiCleanupItemDraftWithName(item: AiMenuCleanupItem, categoryId: string, sortOrder: number, name: string): ItemBasicDraft {
    return {
      ...getAiCleanupItemDraft(item, categoryId, sortOrder),
      name: name.slice(0, MENU_FIELD_LIMITS.menuItems.name),
    };
  }

  function validateAiMenuCleanupResultForApply(categoriesToApply: AiMenuCleanupCategory[]) {
    const itemCount = categoriesToApply.reduce((count, category) => count + category.items.length, 0);
    if (categoriesToApply.length === 0 || itemCount === 0) {
      toast.error("메뉴 관리에 적용할 항목이 없습니다.");
      return false;
    }

    if (categoriesToApply.length > MENU_LIMITS.maxCategoriesPerPage) {
      toast.error(`AI 정리 결과의 ${labels.categoryLabel}가 ${categoriesToApply.length}개입니다. ${labels.categoryLabel}는 최대 ${MENU_LIMITS.maxCategoriesPerPage}개까지 등록할 수 있습니다.`);
      return false;
    }

    const overflowingCategory = categoriesToApply.find((category) => category.items.length > MENU_LIMITS.maxItemsPerCategory);
    if (overflowingCategory) {
      toast.error(`"${overflowingCategory.name}"에는 ${labels.itemLabel}을 최대 ${MENU_LIMITS.maxItemsPerCategory}개까지 추가할 수 있습니다.`);
      return false;
    }

    if (itemCount > MENU_LIMITS.maxItemsPerSite) {
      toast.error(`한 메뉴판에는 ${labels.itemLabel}을 최대 ${MENU_LIMITS.maxItemsPerSite}개까지 등록할 수 있습니다.`);
      return false;
    }

    return true;
  }

  function applyAiMenuCleanupAppendResult() {
    if (menuCleanupApplyMode) return;
    setMenuCleanupApplyMode("append-current");
    const categoriesToAdd = getCleanedAiMenuCategories();
    if (!validateAiMenuCleanupResultForApply(categoriesToAdd)) {
      setMenuCleanupApplyMode(null);
      return;
    }

    const itemsToAddCount = categoriesToAdd.reduce((count, category) => count + category.items.length, 0);
    const targetPage = selectedPage ?? sortedPages.find((page) => page.visible) ?? sortedPages[0] ?? null;
    const shouldCreatePage = !targetPage;
    if (shouldCreatePage && sortedPages.length >= MENU_LIMITS.maxPagesPerSite) {
      toast.error(`${labels.pageLabel}는 최대 ${MENU_LIMITS.maxPagesPerSite}개까지 추가할 수 있습니다.`);
      setMenuCleanupApplyMode(null);
      return;
    }

    const targetPageId = targetPage?.id ?? `temp-page-ai-cleanup-${Date.now()}`;
    const targetPageCategories = sortCategories(draftedCategories.filter((category) => category.menu_page_id === targetPageId));
    const nextCategoryCount = targetPageCategories.length + categoriesToAdd.length;
    if (nextCategoryCount > MENU_LIMITS.maxCategoriesPerPage) {
      toast.error(`현재 메뉴판에는 카테고리를 최대 ${MENU_LIMITS.maxCategoriesPerPage}개까지 등록할 수 있습니다. 현재 ${targetPageCategories.length}개가 등록되어 있고, AI 정리 결과 ${categoriesToAdd.length}개를 추가하면 총 ${nextCategoryCount}개가 됩니다.`);
      setMenuCleanupApplyMode(null);
      return;
    }

    if (draftedItems.length + itemsToAddCount > MENU_LIMITS.maxItemsPerSite) {
      toast.error(`한 메뉴판에는 ${labels.itemLabel}을 최대 ${MENU_LIMITS.maxItemsPerSite}개까지 등록할 수 있습니다.`);
      setMenuCleanupApplyMode(null);
      return;
    }

    const seed = Date.now();
    const newCategoryIds = categoriesToAdd.map((_, index) => `temp-category-ai-cleanup-${seed}-${index + 1}`);
    const categoryNamesForAppend = targetPageCategories.map((category) => category.name);
    const categoriesWithUniqueNames = categoriesToAdd.map((category) => {
      const uniqueName = getUniqueName(category.name, categoryNamesForAppend);
      categoryNamesForAppend.push(uniqueName);
      return { ...category, name: uniqueName };
    });

    if (shouldCreatePage) {
      setPageBasicDrafts((currentDrafts) => ({
        ...currentDrafts,
        [targetPageId]: {
          isNew: true,
          title: labels.pageLabel === "가격표 페이지" ? "가격표" : "메뉴",
          description: "",
          descriptionVisible: false,
          visible: true,
          sortOrder: 0,
          displaySettings: DEFAULT_MENU_PAGE_DISPLAY_SETTINGS,
        },
      }));
    }

    setCategoryBasicDrafts((currentDrafts) => {
      const nextDrafts = { ...currentDrafts };
      targetPageCategories.forEach((category, index) => {
        nextDrafts[category.id] = {
          isNew: nextDrafts[category.id]?.isNew,
          pageId: nextDrafts[category.id]?.pageId ?? category.menu_page_id ?? undefined,
          name: nextDrafts[category.id]?.name ?? category.name,
          description: nextDrafts[category.id]?.description ?? category.description ?? "",
          descriptionVisible: nextDrafts[category.id]?.descriptionVisible ?? category.description_visible,
          visible: nextDrafts[category.id]?.visible ?? category.visible,
          sortOrder: index + categoriesToAdd.length,
        };
      });

      categoriesWithUniqueNames.forEach((category, index) => {
        nextDrafts[newCategoryIds[index]] = {
          isNew: true,
          pageId: targetPageId,
          name: category.name,
          description: capabilities.categoryDescription ? category.description : "",
          descriptionVisible: Boolean(capabilities.categoryDescription && category.description),
          visible: true,
          sortOrder: index,
        };
      });

      return nextDrafts;
    });

    setItemBasicDrafts((currentDrafts) => {
      const nextDrafts = { ...currentDrafts };

      categoriesWithUniqueNames.forEach((category, categoryIndex) => {
        const categoryId = newCategoryIds[categoryIndex];
        const itemNamesForCategory: string[] = [];
        category.items.forEach((item, itemIndex) => {
          const itemId = `temp-item-ai-cleanup-${seed}-${categoryIndex + 1}-${itemIndex + 1}`;
          const itemName = getUniqueName(item.name, itemNamesForCategory);
          itemNamesForCategory.push(itemName);
          nextDrafts[itemId] = getAiCleanupItemDraftWithName(item, categoryId, itemIndex, itemName);
        });
      });

      return nextDrafts;
    });

    resetModes();
    setSelectedPageId(targetPageId);
    setSelectedCategoryId(newCategoryIds[0] ?? "");
    setExpandedPageIds(new Set([targetPageId]));
    setExpandedCategoryIds(new Set(newCategoryIds[0] ? [newCategoryIds[0]] : []));
    markMenuManagementDirty();
    closeMenuCleanupDialog();
    toast.success("AI가 정리한 메뉴가 현재 메뉴판에 임시 추가되었습니다. 저장 후 공개 메뉴판에 반영됩니다.");
  }

  function applyAiMenuCleanupNewPageResult() {
    if (!canManagePages) return;
    if (menuCleanupApplyMode) return;
    setMenuCleanupApplyMode("append-new");
    const categoriesToAdd = getCleanedAiMenuCategories();
    if (!validateAiMenuCleanupResultForApply(categoriesToAdd)) {
      setMenuCleanupApplyMode(null);
      return;
    }

    if (sortedPages.length >= MENU_LIMITS.maxPagesPerSite) {
      toast.error(`${labels.pageLabel}는 최대 ${MENU_LIMITS.maxPagesPerSite}개까지 추가할 수 있습니다.`);
      setMenuCleanupApplyMode(null);
      return;
    }

    const seed = Date.now();
    const pageId = `temp-page-ai-cleanup-new-${seed}`;
    const pageTitle = getUniqueName("AI 정리 메뉴", sortedPages.map((page) => getMenuPageTitle(page)));
    const newCategoryIds = categoriesToAdd.map((_, index) => `temp-category-ai-cleanup-new-${seed}-${index + 1}`);
    const categoryNamesForNewPage: string[] = [];
    const categoriesWithUniqueNames = categoriesToAdd.map((category) => {
      const uniqueName = getUniqueName(category.name, categoryNamesForNewPage);
      categoryNamesForNewPage.push(uniqueName);
      return { ...category, name: uniqueName };
    });

    setPageBasicDrafts((currentDrafts) => ({
      ...sortedPages.reduce<Record<string, PageBasicDraft>>((drafts, page, index) => {
        drafts[page.id] = {
          isNew: currentDrafts[page.id]?.isNew,
          title: currentDrafts[page.id]?.title ?? page.title,
          description: currentDrafts[page.id]?.description ?? page.description ?? "",
          descriptionVisible: currentDrafts[page.id]?.descriptionVisible ?? page.description_visible,
          visible: currentDrafts[page.id]?.visible ?? page.visible,
          sortOrder: index + 1,
          displaySettings: currentDrafts[page.id]?.displaySettings ?? normalizeMenuPageDisplaySettings(page.display_settings),
        };
        return drafts;
      }, {}),
      [pageId]: {
        isNew: true,
        title: pageTitle,
        description: "",
        descriptionVisible: false,
        visible: true,
        sortOrder: 0,
        displaySettings: DEFAULT_MENU_PAGE_DISPLAY_SETTINGS,
      },
    }));

    setCategoryBasicDrafts((currentDrafts) => {
      const nextDrafts = { ...currentDrafts };
      categoriesWithUniqueNames.forEach((category, index) => {
        nextDrafts[newCategoryIds[index]] = {
          isNew: true,
          pageId,
          name: category.name,
          description: capabilities.categoryDescription ? category.description : "",
          descriptionVisible: Boolean(capabilities.categoryDescription && category.description),
          visible: true,
          sortOrder: index,
        };
      });
      return nextDrafts;
    });

    setItemBasicDrafts((currentDrafts) => {
      const nextDrafts = { ...currentDrafts };
      categoriesWithUniqueNames.forEach((category, categoryIndex) => {
        const categoryId = newCategoryIds[categoryIndex];
        const itemNamesForCategory: string[] = [];
        category.items.forEach((item, itemIndex) => {
          const itemId = `temp-item-ai-cleanup-new-${seed}-${categoryIndex + 1}-${itemIndex + 1}`;
          const itemName = getUniqueName(item.name, itemNamesForCategory);
          itemNamesForCategory.push(itemName);
          nextDrafts[itemId] = getAiCleanupItemDraftWithName(item, categoryId, itemIndex, itemName);
        });
      });
      return nextDrafts;
    });

    resetModes();
    setSelectedPageId(pageId);
    setSelectedCategoryId(newCategoryIds[0] ?? "");
    setExpandedPageIds(new Set([pageId]));
    setExpandedCategoryIds(new Set(newCategoryIds[0] ? [newCategoryIds[0]] : []));
    markMenuManagementDirty();
    closeMenuCleanupDialog();
    toast.success("AI가 정리한 메뉴가 새 페이지에 임시 추가되었습니다. 저장 후 공개 메뉴판에 반영됩니다.");
  }

  function applyAiMenuCleanupReplaceResult() {
    if (menuCleanupApplyMode) return;
    setMenuCleanupApplyMode("replace");
    const categoriesToReplace = getCleanedAiMenuCategories();
    if (!validateAiMenuCleanupResultForApply(categoriesToReplace)) {
      setMenuCleanupApplyMode(null);
      return;
    }

    const seed = Date.now();
    const pageId = `temp-page-ai-cleanup-replace-${seed}`;
    const pageTitle = selectedPage ? getMenuPageTitle(selectedPage) : labels.pageLabel === "가격표 페이지" ? "가격표" : "메뉴 페이지 1";
    const nextPageDrafts: Record<string, PageBasicDraft> = {
      [pageId]: {
        isNew: true,
        title: pageTitle || "메뉴 페이지 1",
        description: "",
        descriptionVisible: false,
        visible: true,
        sortOrder: 0,
        displaySettings: DEFAULT_MENU_PAGE_DISPLAY_SETTINGS,
      },
    };
    const nextCategoryDrafts: Record<string, CategoryBasicDraft> = {};
    const nextItemDrafts: Record<string, ItemBasicDraft> = {};
    const firstCategoryId = categoriesToReplace.length > 0 ? `temp-category-ai-cleanup-replace-${seed}-1` : "";

    categoriesToReplace.forEach((category, categoryIndex) => {
      const categoryId = `temp-category-ai-cleanup-replace-${seed}-${categoryIndex + 1}`;
      nextCategoryDrafts[categoryId] = {
        isNew: true,
        pageId,
        name: category.name,
        description: capabilities.categoryDescription ? category.description : "",
        descriptionVisible: Boolean(capabilities.categoryDescription && category.description),
        visible: true,
        sortOrder: categoryIndex,
      };

      category.items.forEach((item, itemIndex) => {
        const itemId = `temp-item-ai-cleanup-replace-${seed}-${categoryIndex + 1}-${itemIndex + 1}`;
        nextItemDrafts[itemId] = getAiCleanupItemDraft(item, categoryId, itemIndex);
      });
    });

    setPageBasicDrafts(nextPageDrafts);
    setCategoryBasicDrafts(nextCategoryDrafts);
    setItemBasicDrafts(nextItemDrafts);
    setPendingItemDrafts({});
    setDeletedPageIds(new Set(menuPages.map((page) => page.id)));
    setDeletedCategoryIds(new Set(categories.map((category) => category.id)));
    setDeletedItemIds(new Set(items.map((item) => item.id)));
    resetModes();
    setSelectedPageId(pageId);
    setSelectedCategoryId(firstCategoryId);
    setExpandedPageIds(new Set([pageId]));
    setExpandedCategoryIds(new Set(firstCategoryId ? [firstCategoryId] : []));
    markMenuManagementDirty();
    closeMenuCleanupDialog();
    toast.success("AI가 정리한 메뉴로 임시 교체되었습니다. 저장 후 공개 메뉴판에 반영됩니다.");
  }

  function confirmDiscardDraft() {
    if (!draftTarget) return true;
    return window.confirm("저장하지 않은 새 항목이 있습니다. 이동하면 입력 내용이 사라집니다.");
  }

  function updateDraftTitle(title: string) {
    clearFinalSaveSummary();
    setDraftTarget((currentDraft) => (currentDraft ? { ...currentDraft, title } : currentDraft));
  }

  function updateDraftTargetDetails(patch: Partial<PageBasicDraft & CategoryBasicDraft>) {
    clearFinalSaveSummary();
    setDraftTarget((currentDraft) => (currentDraft ? { ...currentDraft, ...patch } : currentDraft));
  }

  function updatePageBasicDraft(pageId: string, patch: Partial<PageBasicDraft>) {
    clearFinalSaveSummary();
    const sourcePage = draftedPages.find((page) => page.id === pageId) ?? menuPages.find((page) => page.id === pageId);
    setPageBasicDrafts((currentDrafts) => ({
      ...currentDrafts,
      [pageId]: {
        isNew: currentDrafts[pageId]?.isNew,
        title: currentDrafts[pageId]?.title ?? sourcePage?.title ?? "",
        description: currentDrafts[pageId]?.description ?? sourcePage?.description ?? "",
        descriptionVisible: currentDrafts[pageId]?.descriptionVisible ?? sourcePage?.description_visible ?? false,
        visible: currentDrafts[pageId]?.visible ?? sourcePage?.visible ?? true,
        sortOrder: currentDrafts[pageId]?.sortOrder ?? sourcePage?.sort_order ?? 0,
        displaySettings: currentDrafts[pageId]?.displaySettings ?? normalizeMenuPageDisplaySettings(sourcePage?.display_settings),
        ...patch,
      },
    }));
  }

  function updateCategoryBasicDraft(categoryId: string, patch: Partial<CategoryBasicDraft>) {
    clearFinalSaveSummary();
    const sourceCategory = draftedCategories.find((category) => category.id === categoryId) ?? categories.find((category) => category.id === categoryId);
    setCategoryBasicDrafts((currentDrafts) => ({
      ...currentDrafts,
      [categoryId]: {
        isNew: currentDrafts[categoryId]?.isNew,
        name: currentDrafts[categoryId]?.name ?? sourceCategory?.name ?? "",
        pageId: currentDrafts[categoryId]?.pageId ?? sourceCategory?.menu_page_id ?? visiblePageId,
        description: currentDrafts[categoryId]?.description ?? sourceCategory?.description ?? "",
        descriptionVisible: currentDrafts[categoryId]?.descriptionVisible ?? sourceCategory?.description_visible ?? false,
        visible: currentDrafts[categoryId]?.visible ?? sourceCategory?.visible ?? true,
        sortOrder: currentDrafts[categoryId]?.sortOrder ?? sourceCategory?.sort_order ?? 0,
        priceOptionLabels: currentDrafts[categoryId]?.priceOptionLabels,
        ...patch,
      },
    }));
  }

  function getItemDraftBase(itemId: string): ItemBasicDraft {
    const committedDraft = itemBasicDrafts[itemId];
    if (committedDraft) return committedDraft;

    const sourceItem = items.find((item) => item.id === itemId) ?? draftedItems.find((item) => item.id === itemId);
    return {
      categoryId: sourceItem?.category_id ?? visibleCategoryId ?? undefined,
      isNew: false,
      imageUrl: sourceItem?.image_url ?? null,
      imagePath: sourceItem?.image_path ?? null,
      imageAction: "keep",
      name: sourceItem?.name ?? "",
      setName: sourceItem?.set_name ?? "",
      description: sourceItem?.description ?? "",
      originInfo: sourceItem?.origin_info ?? "",
      price: sourceItem?.price == null ? "" : String(sourceItem.price),
      priceLabel: sourceItem?.price_label ?? "",
      priceNote: sourceItem?.price_note ?? "",
      badgeLabel: sourceItem ? getMenuItemBadgeLabel(sourceItem) ?? "" : "",
      visible: sourceItem?.visible ?? true,
      sortOrder: sourceItem?.sort_order ?? itemsForCategory.length,
      priceVisible: sourceItem?.price_visible ?? true,
      portionLabel: sourceItem?.portion_label ?? "",
      portionVisible: sourceItem?.portion_visible ?? true,
      traitsVisible: sourceItem?.traits_visible ?? true,
      traitDrafts: toItemTraitDrafts(traits.filter((trait) => trait.menu_item_id === itemId)),
      priceOptions: priceOptions.filter((option) => option.menu_item_id === itemId).sort((a, b) => a.sort_order - b.sort_order).map(toDraftPriceOption),
      priceColumnValues: normalizeItemPriceColumnValueDrafts(sourceItem?.priceColumnValues),
      timeSale: itemBasicDrafts[itemId]?.timeSale,
    };
  }

  function buildItemOrderDraft(id: string, sortOrder: number, fallbackCategoryId?: string, sourceDrafts?: Record<string, ItemBasicDraft>): ItemBasicDraft {
    const existingDraft = sourceDrafts?.[id] ?? itemBasicDrafts[id];
    const sourceItem = draftedItems.find((entry) => entry.id === id) ?? items.find((entry) => entry.id === id);

    return {
      categoryId: existingDraft?.categoryId ?? sourceItem?.category_id ?? fallbackCategoryId,
      isNew: existingDraft?.isNew ?? false,
      imageUrl: existingDraft?.imageUrl ?? sourceItem?.image_url ?? null,
      imagePath: existingDraft?.imagePath ?? sourceItem?.image_path ?? null,
      imageAction: existingDraft?.imageAction ?? "keep",
      name: existingDraft?.name ?? sourceItem?.name ?? "",
      setName: existingDraft?.setName ?? sourceItem?.set_name ?? "",
      description: existingDraft?.description ?? sourceItem?.description ?? "",
      originInfo: existingDraft?.originInfo ?? sourceItem?.origin_info ?? "",
      price: existingDraft?.price ?? (sourceItem?.price == null ? "" : String(sourceItem.price)),
      priceLabel: existingDraft?.priceLabel ?? sourceItem?.price_label ?? "",
      priceNote: existingDraft?.priceNote ?? sourceItem?.price_note ?? "",
      badgeLabel: existingDraft?.badgeLabel ?? (sourceItem ? getMenuItemBadgeLabel(sourceItem) ?? "" : ""),
      visible: existingDraft?.visible ?? sourceItem?.visible ?? true,
      sortOrder,
      priceVisible: existingDraft?.priceVisible ?? sourceItem?.price_visible ?? true,
      portionLabel: existingDraft?.portionLabel ?? sourceItem?.portion_label ?? "",
      portionVisible: existingDraft?.portionVisible ?? sourceItem?.portion_visible ?? true,
      traitsVisible: existingDraft?.traitsVisible ?? sourceItem?.traits_visible ?? true,
      traitDrafts: existingDraft?.traitDrafts ?? toItemTraitDrafts(traits.filter((trait) => trait.menu_item_id === id)),
      priceOptions: existingDraft?.priceOptions ?? priceOptions.filter((option) => option.menu_item_id === id).sort((a, b) => a.sort_order - b.sort_order).map(toDraftPriceOption),
      priceColumnValues: existingDraft?.priceColumnValues ?? normalizeItemPriceColumnValueDrafts(sourceItem?.priceColumnValues),
      timeSale: existingDraft?.timeSale,
      badgeStyleKey: existingDraft?.badgeStyleKey,
      badgeBackgroundColor: existingDraft?.badgeBackgroundColor,
      badgeTextColor: existingDraft?.badgeTextColor,
    };
  }

  function updatePendingItemDraft(itemId: string, patch: Partial<ItemBasicDraft>) {
    clearFinalSaveSummary();
    setItemDraftFeedback("");
    setPendingItemDrafts((currentDrafts) => ({
      ...currentDrafts,
      [itemId]: {
        ...getItemDraftBase(itemId),
        ...currentDrafts[itemId],
        ...patch,
      },
    }));
  }

  function commitPendingItemDraft(itemId: string, commitPatch?: Partial<ItemBasicDraft>) {
    clearFinalSaveSummary();
    const pendingDraft = pendingItemDrafts[itemId]
      ? { ...pendingItemDrafts[itemId], ...commitPatch }
      : commitPatch
        ? { ...getItemDraftBase(itemId), ...commitPatch }
        : undefined;
    const isNewDraftCommit = !itemBasicDrafts[itemId];
    if (!pendingDraft) {
      if (itemBasicDrafts[itemId]) {
        const message = "수정 내용이 임시 반영되었습니다. 저장 후 공개 메뉴판에 반영됩니다.";
        const committedCategoryId = itemBasicDrafts[itemId]?.categoryId;
        if (committedCategoryId) setSelectedCategoryId(committedCategoryId);
        setIsCreatingItem(false);
        toast.success(message);
      }
      return;
    }

    const committedDraft = {
      ...getItemDraftBase(itemId),
      ...pendingDraft,
      sortOrder: isNewDraftCommit ? 0 : pendingDraft.sortOrder,
    };
    markMenuManagementDirty();

    setItemBasicDrafts((currentDrafts) => {
      const nextDrafts = { ...currentDrafts };

      if (isNewDraftCommit && committedDraft.categoryId) {
        sortItems(draftedItems.filter((item) => item.category_id === committedDraft.categoryId)).forEach((item, index) => {
          nextDrafts[item.id] = buildItemOrderDraft(item.id, index + 1, committedDraft.categoryId, nextDrafts);
        });
      }

      nextDrafts[itemId] = committedDraft;
      return nextDrafts;
    });
    setPendingItemDrafts((currentDrafts) => {
      const nextDrafts = { ...currentDrafts };
      delete nextDrafts[itemId];
      return nextDrafts;
    });
    setIsCreatingItem(false);
    if (committedDraft.categoryId) {
      const committedCategory = draftedCategories.find((category) => category.id === committedDraft.categoryId);
      if (committedCategory) {
        if (committedCategory.menu_page_id) setSelectedPageId(committedCategory.menu_page_id);
        setExpandedPageIds(new Set(committedCategory.menu_page_id ? [committedCategory.menu_page_id] : []));
      }
      setSelectedCategoryId(committedDraft.categoryId);
      setExpandedCategoryIds(new Set([committedDraft.categoryId]));
    }
    if (isNewDraftCommit) {
      setEditingItemId("");
      setDraftTarget(null);
    }
    setConfirmingDeleteKey("");
    const message = isNewDraftCommit
        ? `${labels.itemLabel === "서비스" ? "서비스가" : "아이템이"} 임시 추가되었습니다. 저장 후 공개 메뉴판에 반영됩니다.`
        : "수정 내용이 임시 반영되었습니다. 저장 후 공개 메뉴판에 반영됩니다.";
    toast.success(message);
  }

  function toggleExpandedPage(pageId: string) {
    const isExpanded = expandedPageIds.has(pageId);

    setExpandedPageIds((currentIds) => {
      const nextIds = new Set(currentIds);
      if (isExpanded) {
        nextIds.delete(pageId);
      } else {
        nextIds.add(pageId);
      }
      return nextIds;
    });

    if (isExpanded) {
      const pageCategoryIds = new Set(draftedCategories.filter((category) => category.menu_page_id === pageId).map((category) => category.id));
      setExpandedCategoryIds((currentIds) => {
        const nextIds = new Set(currentIds);
        pageCategoryIds.forEach((categoryId) => nextIds.delete(categoryId));
        return nextIds;
      });

      const selectedChildIsInPage = Boolean(visibleCategoryId && pageCategoryIds.has(visibleCategoryId));
      const editingItemIsInPage = Boolean(
        editingItemId &&
        draftedItems.some((item) => item.id === editingItemId && item.category_id && pageCategoryIds.has(item.category_id))
      );
      if (selectedChildIsInPage || editingItemIsInPage) {
        resetModes();
        setSelectedPageId(pageId);
        setSelectedCategoryId("");
      }
    }
  }

  function toggleExpandedCategory(categoryId: string) {
    const isExpanded = expandedCategoryIds.has(categoryId);

    setExpandedCategoryIds((currentIds) => {
      const nextIds = new Set(currentIds);
      if (isExpanded) {
        nextIds.delete(categoryId);
      } else {
        nextIds.add(categoryId);
      }
      return nextIds;
    });

    if (isExpanded && editingItemId && draftedItems.some((item) => item.id === editingItemId && item.category_id === categoryId)) {
      resetModes();
      const category = draftedCategories.find((entry) => entry.id === categoryId);
      if (category?.menu_page_id) setSelectedPageId(category.menu_page_id);
      setSelectedCategoryId(categoryId);
    }
  }

  function moveId(ids: string[], draggedId: string, targetId: string) {
    if (draggedId === targetId) return ids;
    const nextIds = ids.filter((id) => id !== draggedId);
    const targetIndex = nextIds.indexOf(targetId);
    if (targetIndex < 0) return ids;
    nextIds.splice(targetIndex, 0, draggedId);
    return nextIds;
  }

  function applyPageOrderDraft(orderedIds: string[]) {
    markMenuManagementDirty();
    setPageBasicDrafts((currentDrafts) => {
      const nextDrafts = { ...currentDrafts };
      orderedIds.forEach((id, index) => {
        const page = menuPages.find((entry) => entry.id === id);
        nextDrafts[id] = {
          title: nextDrafts[id]?.title ?? page?.title ?? "",
          description: nextDrafts[id]?.description ?? page?.description ?? "",
          descriptionVisible: nextDrafts[id]?.descriptionVisible ?? page?.description_visible ?? false,
          visible: nextDrafts[id]?.visible ?? page?.visible ?? true,
          sortOrder: index,
          isNew: nextDrafts[id]?.isNew,
          displaySettings: nextDrafts[id]?.displaySettings ?? normalizeMenuPageDisplaySettings(page?.display_settings),
        };
      });
      return nextDrafts;
    });
  }

  function applyCategoryOrderDraft(orderedIds: string[]) {
    markMenuManagementDirty();
    setCategoryBasicDrafts((currentDrafts) => {
      const nextDrafts = { ...currentDrafts };
      orderedIds.forEach((id, index) => {
        const category = categories.find((entry) => entry.id === id);
        nextDrafts[id] = {
          isNew: nextDrafts[id]?.isNew,
          pageId: nextDrafts[id]?.pageId ?? category?.menu_page_id ?? visiblePageId,
          name: nextDrafts[id]?.name ?? category?.name ?? "",
          description: nextDrafts[id]?.description ?? category?.description ?? "",
          descriptionVisible: nextDrafts[id]?.descriptionVisible ?? category?.description_visible ?? false,
          visible: nextDrafts[id]?.visible ?? category?.visible ?? true,
          sortOrder: index,
          priceOptionLabels: nextDrafts[id]?.priceOptionLabels,
          priceColumns: nextDrafts[id]?.priceColumns ?? normalizeCategoryPriceColumnDrafts(category?.priceColumns),
        };
      });
      return nextDrafts;
    });
  }

  function applyItemOrderDraft(orderedIds: string[]) {
    markMenuManagementDirty();
    setItemBasicDrafts((currentDrafts) => {
      const nextDrafts = { ...currentDrafts };
      orderedIds.forEach((id, index) => {
        nextDrafts[id] = buildItemOrderDraft(id, index, undefined, nextDrafts);
      });
      return nextDrafts;
    });
  }

  function handlePageDrop(targetPageId: string) {
    if (!canManagePages) return;
    if (dragState?.type !== "page") return;
    const orderedIds = moveId(sortedPages.map((page) => page.id), dragState.id, targetPageId);
    setDragState(null);
    applyPageOrderDraft(orderedIds);
  }

  function handleCategoryDrop(pageId: string, targetCategoryId: string) {
    if (dragState?.type !== "category" || dragState.pageId !== pageId) return;
    const pageCategoryIds = sortCategories(draftedCategories.filter((category) => category.menu_page_id === pageId)).map((category) => category.id);
    const orderedIds = moveId(pageCategoryIds, dragState.id, targetCategoryId);
    setDragState(null);
    applyCategoryOrderDraft(orderedIds);
  }

  function handleItemDrop(categoryId: string, targetItemId: string) {
    if (dragState?.type !== "item" || dragState.categoryId !== categoryId) return;
    const categoryItemIds = sortItems(draftedItems.filter((item) => item.category_id === categoryId)).map((item) => item.id);
    const orderedIds = moveId(categoryItemIds, dragState.id, targetItemId);
    setDragState(null);
    applyItemOrderDraft(orderedIds);
  }

  function moveSelectedOrder(direction: -1 | 1) {
    if (!selectedOrderMoveTarget) return;
    const currentIndex = selectedOrderMoveTarget.siblingIds.indexOf(selectedOrderMoveTarget.selectedId);
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= selectedOrderMoveTarget.siblingIds.length) return;

    const orderedIds = [...selectedOrderMoveTarget.siblingIds];
    [orderedIds[currentIndex], orderedIds[nextIndex]] = [orderedIds[nextIndex], orderedIds[currentIndex]];

    if (selectedOrderMoveTarget.type === "page") {
      applyPageOrderDraft(orderedIds);
    } else if (selectedOrderMoveTarget.type === "category") {
      applyCategoryOrderDraft(orderedIds);
    } else {
      applyItemOrderDraft(orderedIds);
    }

    toast.success("순서가 변경되었습니다. 하단의 최종 저장을 눌러야 공개 메뉴판에 반영됩니다.");
  }

  function startCreatePage() {
    if (!canManagePages) return;
    if (reachedPageLimit) return;
    if (!confirmDiscardDraft()) return;
    resetModes();
    setDraftTarget({
      type: "page",
      title: "",
      displaySettings: canConfigureDisplayPages ? DEFAULT_MENU_PAGE_DISPLAY_SETTINGS : undefined,
    });
    setIsCreatingPage(true);
  }

  function startEditPage(pageId: string) {
    if (!canManagePages) return;
    if (!confirmDiscardDraft()) return;
    resetModes();
    setEditingPageId(pageId);
  }

  function commitPageDraft() {
    if (!canManagePages) return;
    if (isCreatingPage) {
      const title = draftTarget?.type === "page" ? draftTarget.title.trim() : "";
      if (!title) return;
      const displaySettings =
        canConfigureDisplayPages && draftTarget?.type === "page"
          ? normalizeMenuPageDisplaySettings(draftTarget.displaySettings)
          : DEFAULT_MENU_PAGE_DISPLAY_SETTINGS;
      if (
        canConfigureDisplayPages &&
        isPromotionDisplayPage(displaySettings) &&
        getPromotionPageCountWithPatch(null, displaySettings) > MENU_LIMITS.maxPromotionPagesPerSite
      ) {
        setPageDraftFeedback(`프로모션 페이지는 최대 ${MENU_LIMITS.maxPromotionPagesPerSite}개까지 추가할 수 있습니다.`);
        return;
      }
      const draftCount = Object.values(pageBasicDrafts).filter((draft) => draft.isNew).length;
      const draftId = `temp-page-${draftCount + 1}`;
      setPageBasicDrafts((currentDrafts) => ({
        ...sortedPages.reduce<Record<string, PageBasicDraft>>((drafts, page, index) => {
          drafts[page.id] = {
            title: currentDrafts[page.id]?.title ?? page.title,
            description: currentDrafts[page.id]?.description ?? page.description ?? "",
            descriptionVisible: currentDrafts[page.id]?.descriptionVisible ?? page.description_visible,
            visible: currentDrafts[page.id]?.visible ?? page.visible,
            sortOrder: index + 1,
            isNew: currentDrafts[page.id]?.isNew,
            displaySettings: currentDrafts[page.id]?.displaySettings ?? normalizeMenuPageDisplaySettings(page.display_settings),
          };
          return drafts;
        }, {}),
        [draftId]: {
          isNew: true,
          title,
          description: draftTarget?.type === "page" ? draftTarget.description ?? "" : "",
          descriptionVisible: draftTarget?.type === "page" ? draftTarget.descriptionVisible ?? false : false,
          visible: draftTarget?.type === "page" ? draftTarget.visible ?? true : true,
          sortOrder: 0,
          displaySettings,
        },
      }));
      setSelectedPageId(draftId);
      setSelectedCategoryId("");
      setExpandedPageIds(new Set([draftId]));
      setExpandedCategoryIds(new Set());
      setDraftTarget(null);
      setIsCreatingPage(false);
      markMenuManagementDirty();
      const message = `${labels.pageLabel}가 임시 추가되었습니다. 저장 후 공개 메뉴판에 반영됩니다.`;
      toast.success(message);
      return;
    }

    if (editingPageId) {
      const displaySettings = getDraftedPageDisplaySettings(selectedPage);
      if (
        canConfigureDisplayPages &&
        isPromotionDisplayPage(displaySettings) &&
        getPromotionPageCountWithPatch(editingPageId, displaySettings) > MENU_LIMITS.maxPromotionPagesPerSite
      ) {
        setPageDraftFeedback(`프로모션 페이지는 최대 ${MENU_LIMITS.maxPromotionPagesPerSite}개까지 추가할 수 있습니다.`);
        return;
      }
      if (canConfigureDisplayPages && isPromotionDisplayPage(displaySettings)) {
        setSelectedCategoryId("");
        setEditingCategoryId("");
        setEditingItemId("");
        setExpandedCategoryIds(new Set());
      }
      markMenuManagementDirty();
      const message = "수정 내용이 임시 반영되었습니다. 저장 후 공개 메뉴판에 반영됩니다.";
      toast.success(message);
    }
  }

  function startCreateCategory() {
    if (!visiblePageId || selectedPageIsPromotion || reachedCategoryLimit) return;
    if (!confirmDiscardDraft()) return;
    resetModes();
    setDraftTarget({ type: "category", pageId: visiblePageId, title: "" });
    setIsCreatingCategory(true);
  }

  function startEditCategory(categoryId: string) {
    if (!confirmDiscardDraft()) return;
    resetModes();
    setEditingCategoryId(categoryId);
  }

  function commitCategoryDraft() {
    if (isCreatingCategory) {
      const title = draftTarget?.type === "category" ? draftTarget.title.trim() : "";
      const pageId = draftTarget?.type === "category" ? draftTarget.pageId : visiblePageId;
      if (!title || !pageId) return;
      const draftCount = Object.values(categoryBasicDrafts).filter((draft) => draft.isNew).length;
      const draftId = `temp-category-${draftCount + 1}`;
      setCategoryBasicDrafts((currentDrafts) => ({
        ...currentDrafts,
        ...categoriesForPage.reduce<Record<string, CategoryBasicDraft>>((drafts, category, index) => {
          drafts[category.id] = {
            isNew: currentDrafts[category.id]?.isNew,
            pageId: currentDrafts[category.id]?.pageId ?? category.menu_page_id ?? undefined,
            name: currentDrafts[category.id]?.name ?? category.name,
            description: currentDrafts[category.id]?.description ?? category.description ?? "",
            descriptionVisible: currentDrafts[category.id]?.descriptionVisible ?? category.description_visible,
            visible: currentDrafts[category.id]?.visible ?? category.visible,
            sortOrder: index + 1,
            priceColumns: currentDrafts[category.id]?.priceColumns ?? normalizeCategoryPriceColumnDrafts(category.priceColumns),
          };
          return drafts;
        }, {}),
        [draftId]: {
          isNew: true,
          pageId,
          name: title,
          description: draftTarget?.type === "category" ? draftTarget.description ?? "" : "",
          descriptionVisible: draftTarget?.type === "category" ? draftTarget.descriptionVisible ?? false : false,
          visible: draftTarget?.type === "category" ? draftTarget.visible ?? true : true,
          sortOrder: 0,
          priceOptionLabels: draftTarget?.type === "category" ? draftTarget.priceOptionLabels : undefined,
          priceColumns: draftTarget?.type === "category" ? normalizeCategoryPriceColumnDrafts(draftTarget.priceColumns) : undefined,
        },
      }));
      setSelectedPageId(pageId);
      setSelectedCategoryId(draftId);
      setExpandedPageIds(new Set([pageId]));
      setExpandedCategoryIds(new Set([draftId]));
      setDraftTarget(null);
      setIsCreatingCategory(false);
      markMenuManagementDirty();
      const message = `${labels.categoryLabel}가 임시 추가되었습니다. 저장 후 공개 메뉴판에 반영됩니다.`;
      toast.success(message);
      return;
    }

    if (editingCategoryId) {
      markMenuManagementDirty();
      const message = "수정 내용이 임시 반영되었습니다. 저장 후 공개 메뉴판에 반영됩니다.";
      toast.success(message);
    }
  }

  function startCreateItem() {
    if (!visibleCategoryId || !visiblePageId || selectedPageIsPromotion || reachedItemLimit) return;
    if (!confirmDiscardDraft()) return;
    resetModes();
    setExpandedPageIds(new Set([visiblePageId]));
    setExpandedCategoryIds(new Set([visibleCategoryId]));
    const draftCount = Object.keys(itemBasicDrafts).filter((id) => id.startsWith(`temp-item-new-${visibleCategoryId}-`)).length;
    const draftId = `temp-item-new-${visibleCategoryId}-${draftCount + 1}`;
    const draftName = labels.itemLabel === "서비스" ? "새 서비스" : "새 메뉴 아이템";
    setPendingItemDrafts((currentDrafts) => ({
      ...currentDrafts,
      [draftId]: {
        categoryId: visibleCategoryId,
        isNew: true,
        name: draftName,
        setName: "",
        description: "",
        originInfo: "",
        price: "",
        priceLabel: "",
        badgeLabel: "",
        imageUrl: null,
        imagePath: null,
        imageAction: "keep",
        visible: true,
        sortOrder: 0,
        priceVisible: true,
        portionLabel: "",
        portionVisible: true,
        traitsVisible: true,
        traitDrafts: [],
      },
    }));
    setEditingItemId(draftId);
    setIsCreatingItem(true);
  }

  function removeCreatedItemDraft(itemId: string) {
    setPendingItemDrafts((currentDrafts) => {
      const nextDrafts = { ...currentDrafts };
      delete nextDrafts[itemId];
      return nextDrafts;
    });
    setItemBasicDrafts((currentDrafts) => {
      const nextDrafts = { ...currentDrafts };
      delete nextDrafts[itemId];
      return nextDrafts;
    });
  }

  function cancelPendingItemDraft(itemId: string) {
    removeCreatedItemDraft(itemId);
    resetModes();
  }

  function markItemDeleted(itemId: string) {
    markMenuManagementDirty();
    const draft = itemBasicDrafts[itemId];
    if (draft?.isNew) {
      removeCreatedItemDraft(itemId);
      return;
    }

    setDeletedItemIds((currentIds) => new Set(currentIds).add(itemId));
  }

  function deleteItemDraft(itemId: string) {
    const item = draftedItems.find((entry) => entry.id === itemId);
    const draft = itemBasicDrafts[itemId];
    markItemDeleted(itemId);
    setConfirmingDeleteKey("");
    if (editingItemId === itemId) {
      setEditingItemId("");
      if (item?.category_id) {
        const itemCategory = draftedCategories.find((category) => category.id === item.category_id);
        if (itemCategory) {
          if (itemCategory.menu_page_id) setSelectedPageId(itemCategory.menu_page_id);
          setExpandedPageIds(new Set(itemCategory.menu_page_id ? [itemCategory.menu_page_id] : []));
        }
        setSelectedCategoryId(item.category_id);
        setExpandedCategoryIds(new Set([item.category_id]));
      }
    }
    const isCopiedDraft = draft?.isNew && (itemId.startsWith("temp-item-copy-") || itemId.startsWith("temp-item-category-copy-") || itemId.startsWith("temp-item-page-copy-"));
    const message = isCopiedDraft
      ? `복사본 ${labels.itemLabel}이 임시 삭제되었습니다. 저장 후 공개 메뉴판에 반영됩니다.`
      : `${labels.itemLabel}이 임시 삭제되었습니다. 저장 후 공개 메뉴판에 반영됩니다.`;
    toast.success(message);
  }

  function deleteCategoryDraft(categoryId: string) {
    markMenuManagementDirty();
    const category = categories.find((entry) => entry.id === categoryId) ?? draftedCategories.find((entry) => entry.id === categoryId);
    const pageId = category?.menu_page_id ?? visiblePageId;
    draftedItems.filter((item) => item.category_id === categoryId).forEach((item) => markItemDeleted(item.id));
    const isCopiedDraft = categoryBasicDrafts[categoryId]?.isNew && (categoryId.startsWith("temp-category-copy-") || categoryId.startsWith("temp-category-page-copy-"));
    if (categoryBasicDrafts[categoryId]?.isNew) {
      setCategoryBasicDrafts((currentDrafts) => {
        const nextDrafts = { ...currentDrafts };
        delete nextDrafts[categoryId];
        return nextDrafts;
      });
    } else {
      setDeletedCategoryIds((currentIds) => new Set(currentIds).add(categoryId));
    }
    const message = isCopiedDraft
      ? `복사본 ${labels.categoryLabel}가 임시 삭제되었습니다. 저장 후 공개 메뉴판에 반영됩니다.`
      : `${labels.categoryLabel}가 임시 삭제되었습니다. 저장 후 공개 메뉴판에 반영됩니다.`;
    toast.success(message);
    setConfirmingDeleteKey("");
    setEditingCategoryId("");
    setEditingItemId("");
    if (pageId) setSelectedPageId(pageId);
    const nextCategories = pageId
      ? sortCategories(draftedCategories.filter((entry) => entry.menu_page_id === pageId && entry.id !== categoryId))
      : [];
    const nextCategoryId = nextCategories.find((entry) => entry.visible)?.id ?? nextCategories[0]?.id ?? "";
    setSelectedCategoryId(nextCategoryId);
    setExpandedPageIds(new Set(pageId ? [pageId] : []));
    setExpandedCategoryIds(new Set(nextCategoryId ? [nextCategoryId] : []));
  }

  function deletePageDraft(pageId: string) {
    if (!canManagePages) return;
    markMenuManagementDirty();
    const remainingPages = sortedPages.filter((page) => page.id !== pageId);
    const categoryIds = draftedCategories.filter((category) => category.menu_page_id === pageId).map((category) => category.id);
    categoryIds.forEach((categoryId) => {
      draftedItems.filter((item) => item.category_id === categoryId).forEach((item) => markItemDeleted(item.id));
    });
    setCategoryBasicDrafts((currentDrafts) => {
      const nextDrafts = { ...currentDrafts };
      categoryIds.forEach((categoryId) => {
        if (nextDrafts[categoryId]?.isNew) delete nextDrafts[categoryId];
      });
      return nextDrafts;
    });
    setDeletedCategoryIds((currentIds) => {
      const nextIds = new Set(currentIds);
      categoryIds.forEach((categoryId) => {
        if (!categoryBasicDrafts[categoryId]?.isNew) nextIds.add(categoryId);
      });
      return nextIds;
    });
    if (pageBasicDrafts[pageId]?.isNew) {
      setPageBasicDrafts((currentDrafts) => {
        const nextDrafts = { ...currentDrafts };
        delete nextDrafts[pageId];
        return nextDrafts;
      });
    } else {
      setDeletedPageIds((currentIds) => new Set(currentIds).add(pageId));
    }
    setConfirmingDeleteKey("");
    resetModes();
    const isCopiedDraft = pageBasicDrafts[pageId]?.isNew && pageId.startsWith("temp-page-copy-");
    const message = isCopiedDraft
      ? `복사본 ${labels.pageLabel}가 임시 삭제되었습니다. 저장 후 공개 메뉴판에 반영됩니다.`
      : `${labels.pageLabel}가 임시 삭제되었습니다. 저장 후 공개 메뉴판에 반영됩니다.`;
    toast.success(message);

    const nextPageId = remainingPages.find((page) => page.visible)?.id ?? remainingPages[0]?.id ?? "";
    setSelectedPageId(nextPageId);
    const nextCategories = nextPageId ? sortCategories(draftedCategories.filter((category) => category.menu_page_id === nextPageId)) : [];
    const nextCategoryId = nextCategories.find((category) => category.visible)?.id ?? nextCategories[0]?.id ?? "";
    setSelectedCategoryId(nextCategoryId);
    setExpandedPageIds(new Set(nextPageId ? [nextPageId] : []));
    setExpandedCategoryIds(new Set(nextCategoryId ? [nextCategoryId] : []));
  }

  function getPageCopyDisabledReason(pageId: string) {
    if (reachedPageLimit) {
      return `${labels.pageLabel}는 최대 ${MENU_LIMITS.maxPagesPerSite}개까지 추가할 수 있습니다.`;
    }

    const sourcePage = sortedPages.find((page) => page.id === pageId);
    const sourceDisplaySettings = getDraftedPageDisplaySettings(sourcePage);
    if (
      canConfigureDisplayPages &&
      isPromotionDisplayPage(sourceDisplaySettings) &&
      getPromotionPageCountWithPatch(null, sourceDisplaySettings) > MENU_LIMITS.maxPromotionPagesPerSite
    ) {
      return `프로모션 페이지는 최대 ${MENU_LIMITS.maxPromotionPagesPerSite}개까지 추가할 수 있습니다.`;
    }

    if (canConfigureDisplayPages && isPromotionDisplayPage(sourceDisplaySettings)) return "";

    const sourceCategories = draftedCategories.filter((category) => category.menu_page_id === pageId);
    if (sourceCategories.length > MENU_LIMITS.maxCategoriesPerPage) {
      return `복사할 ${labels.pageLabel}의 ${labels.categoryLabel} 수가 최대 개수를 초과합니다.`;
    }

    const sourceCategoryIds = new Set(sourceCategories.map((category) => category.id));
    const sourceItems = draftedItems.filter((item) => item.category_id && sourceCategoryIds.has(item.category_id));
    if (draftedItems.length + sourceItems.length > MENU_LIMITS.maxItemsPerSite) {
      return `한 메뉴판에는 ${labels.itemLabel}을 최대 ${MENU_LIMITS.maxItemsPerSite}개까지 등록할 수 있습니다.`;
    }

    const overflowingCategory = sourceCategories.find(
      (category) => draftedItems.filter((item) => item.category_id === category.id).length > MENU_LIMITS.maxItemsPerCategory
    );
    if (overflowingCategory) {
      return `복사할 ${labels.categoryLabel}의 ${labels.itemLabel} 수가 최대 개수를 초과합니다.`;
    }

    return "";
  }

  function copyPageDraft(pageId: string) {
    if (!canManagePages) return;
    const disabledReason = getPageCopyDisabledReason(pageId);
    if (disabledReason) {
      setPageDraftFeedback(disabledReason);
      return;
    }

    const sourcePage = sortedPages.find((page) => page.id === pageId);
    if (!sourcePage) return;

    const sourceDisplaySettings = getDraftedPageDisplaySettings(sourcePage);
    const sourcePageIsPromotion = canConfigureDisplayPages && isPromotionDisplayPage(sourceDisplaySettings);
    const sourceCategories = sourcePageIsPromotion ? [] : sortCategories(draftedCategories.filter((category) => category.menu_page_id === pageId));
    const copyCount = Object.keys(pageBasicDrafts).filter((id) => id.startsWith(`temp-page-copy-${pageId}-`)).length;
    const draftPageId = `temp-page-copy-${pageId}-${copyCount + 1}`;
    const categoryIdMap = new Map<string, string>();
    const existingPageNames = sortedPages.map((page) => getMenuPageTitle(page));

    sourceCategories.forEach((category) => {
      const draftCategoryId = `temp-category-page-copy-${pageId}-${category.id}-${copyCount + 1}`;
      categoryIdMap.set(category.id, draftCategoryId);
    });

    setPageBasicDrafts((currentDrafts) => {
      const nextDrafts = { ...currentDrafts };
      sortedPages.forEach((page, index) => {
        nextDrafts[page.id] = {
          isNew: nextDrafts[page.id]?.isNew,
          title: nextDrafts[page.id]?.title ?? page.title,
          description: nextDrafts[page.id]?.description ?? page.description ?? "",
          descriptionVisible: nextDrafts[page.id]?.descriptionVisible ?? page.description_visible,
          visible: nextDrafts[page.id]?.visible ?? page.visible,
          sortOrder: index + 1,
          displaySettings: nextDrafts[page.id]?.displaySettings ?? normalizeMenuPageDisplaySettings(page.display_settings),
        };
      });
      nextDrafts[draftPageId] = {
        isNew: true,
        title: getCopyName(getMenuPageTitle(sourcePage), existingPageNames),
        description: sourcePage.description ?? "",
        descriptionVisible: sourcePage.description_visible,
        visible: sourcePage.visible,
        sortOrder: 0,
        displaySettings: sourceDisplaySettings,
      };
      return nextDrafts;
    });

    setCategoryBasicDrafts((currentDrafts) => {
      const nextDrafts = { ...currentDrafts };
      const copiedCategoryNames: string[] = [];
      sourceCategories.forEach((category, index) => {
        const draftCategoryId = categoryIdMap.get(category.id);
        if (!draftCategoryId) return;
        const copiedCategoryName = getCopyName(currentDrafts[category.id]?.name ?? category.name, copiedCategoryNames);
        copiedCategoryNames.push(copiedCategoryName);
        nextDrafts[draftCategoryId] = {
          isNew: true,
          pageId: draftPageId,
          name: copiedCategoryName,
          description: currentDrafts[category.id]?.description ?? category.description ?? "",
          descriptionVisible: currentDrafts[category.id]?.descriptionVisible ?? category.description_visible,
          visible: currentDrafts[category.id]?.visible ?? category.visible,
          sortOrder: index,
          priceOptionLabels: currentDrafts[category.id]?.priceOptionLabels ?? getCategoryPriceOptionLabels(category.id),
          priceColumns: copyCategoryPriceColumnDrafts(currentDrafts[category.id]?.priceColumns ?? getCategoryPriceColumns(category.id)),
        };
      });
      return nextDrafts;
    });

    setItemBasicDrafts((currentDrafts) => {
      const nextDrafts = { ...currentDrafts };
      sourceCategories.forEach((category) => {
        const draftCategoryId = categoryIdMap.get(category.id);
        if (!draftCategoryId) return;

        const sourceItems = sortItems(draftedItems.filter((item) => item.category_id === category.id));
        const copiedItemNames: string[] = [];
        sourceItems.forEach((item, index) => {
          const sourceDraft = currentDrafts[item.id];
          const draftItemId = `temp-item-page-copy-${pageId}-${category.id}-${item.id}-${copyCount + 1}`;
          const copiedItemName = getCopyName(sourceDraft?.name ?? item.name, copiedItemNames);
          copiedItemNames.push(copiedItemName);
          nextDrafts[draftItemId] = {
            categoryId: draftCategoryId,
            isNew: true,
            imageUrl: sourceDraft?.imageUrl ?? item.image_url ?? null,
            imagePath: sourceDraft?.imagePath ?? item.image_path ?? null,
            imageAction: sourceDraft?.imageAction ?? "keep",
            name: copiedItemName,
            setName: sourceDraft?.setName ?? item.set_name ?? "",
            description: sourceDraft?.description ?? item.description ?? "",
            originInfo: sourceDraft?.originInfo ?? item.origin_info ?? "",
            price: sourceDraft?.price ?? (item.price == null ? "" : String(item.price)),
            priceLabel: sourceDraft?.priceLabel ?? item.price_label ?? "",
            priceNote: sourceDraft?.priceNote ?? item.price_note ?? "",
            badgeLabel: sourceDraft?.badgeLabel ?? (capabilities.itemBadges ? getMenuItemBadgeLabel(item) ?? "" : ""),
            visible: sourceDraft?.visible ?? item.visible,
            sortOrder: index,
            priceVisible: sourceDraft?.priceVisible ?? item.price_visible,
            portionLabel: sourceDraft?.portionLabel ?? item.portion_label ?? "",
            portionVisible: sourceDraft?.portionVisible ?? item.portion_visible,
            traitsVisible: sourceDraft?.traitsVisible ?? item.traits_visible,
            traitDrafts: copyItemTraitDrafts(sourceDraft?.traitDrafts ?? toItemTraitDrafts(traits.filter((trait) => trait.menu_item_id === item.id))),
            priceOptions: sourceDraft?.priceOptions ?? priceOptions.filter((option) => option.menu_item_id === item.id).sort((a, b) => a.sort_order - b.sort_order).map(toDraftPriceOption),
            priceColumnValues: [],
            badgeStyleKey: sourceDraft?.badgeStyleKey,
            badgeBackgroundColor: sourceDraft?.badgeBackgroundColor,
            badgeTextColor: sourceDraft?.badgeTextColor,
          };
        });
      });
      return nextDrafts;
    });

    resetModes();
    setSelectedPageId(draftPageId);
    setSelectedCategoryId("");
    setEditingPageId(draftPageId);
    setExpandedPageIds(new Set([draftPageId]));
    setExpandedCategoryIds(new Set());
    markMenuManagementDirty();
    const message = `${labels.pageLabel}가 임시 복사되었습니다. 저장 후 공개 메뉴판에 반영됩니다.`;
    toast.success(message);
  }

  function copyItemDraft(itemId: string, draftPatch?: Partial<ItemBasicDraft>) {
    const sourceItem = draftedItems.find((item) => item.id === itemId);
    if (!sourceItem?.category_id) return;
    if (reachedItemsPerSiteLimit) return;

    const categoryItems = sortItems(draftedItems.filter((item) => item.category_id === sourceItem.category_id));
    if (categoryItems.length >= MENU_LIMITS.maxItemsPerCategory) return;

    const copyCount = Object.keys(itemBasicDrafts).filter((id) => id.startsWith(`temp-item-copy-${itemId}-`)).length;
    const draftId = `temp-item-copy-${itemId}-${copyCount + 1}`;
    const nextOrderedIds = [draftId, ...categoryItems.map((item) => item.id)];
    const sourceDraft = draftPatch ? { ...itemBasicDrafts[itemId], ...draftPatch } : itemBasicDrafts[itemId];

    setItemBasicDrafts((currentDrafts) => {
      const copiedDraft: ItemBasicDraft = {
        categoryId: sourceDraft?.categoryId ?? sourceItem.category_id ?? undefined,
        isNew: true,
        imageUrl: sourceDraft?.imageUrl ?? sourceItem.image_url,
        imagePath: sourceDraft?.imagePath ?? sourceItem.image_path,
        imageAction: sourceDraft?.imageAction ?? "keep",
        name: getCopyName(sourceDraft?.name ?? sourceItem.name, categoryItems.map((item) => item.name)),
        setName: sourceDraft?.setName ?? sourceItem.set_name ?? "",
        description: sourceDraft?.description ?? sourceItem.description ?? "",
        originInfo: sourceDraft?.originInfo ?? sourceItem.origin_info ?? "",
        price: sourceDraft?.price ?? (sourceItem.price == null ? "" : String(sourceItem.price)),
        priceLabel: sourceDraft?.priceLabel ?? sourceItem.price_label ?? "",
        priceNote: sourceDraft?.priceNote ?? sourceItem.price_note ?? "",
        badgeLabel: sourceDraft?.badgeLabel ?? (capabilities.itemBadges ? getMenuItemBadgeLabel(sourceItem) ?? "" : ""),
        visible: sourceDraft?.visible ?? sourceItem.visible,
        sortOrder: 0,
        priceVisible: sourceDraft?.priceVisible ?? sourceItem.price_visible,
        priceMode: sourceDraft?.priceMode,
        portionLabel: sourceDraft?.portionLabel ?? sourceItem.portion_label ?? "",
        portionVisible: sourceDraft?.portionVisible ?? sourceItem.portion_visible,
        traitsVisible: sourceDraft?.traitsVisible ?? sourceItem.traits_visible,
        traitDrafts: copyItemTraitDrafts(sourceDraft?.traitDrafts ?? toItemTraitDrafts(traits.filter((trait) => trait.menu_item_id === sourceItem.id))),
        priceOptions: sourceDraft?.priceOptions ?? priceOptions.filter((option) => option.menu_item_id === sourceItem.id).sort((a, b) => a.sort_order - b.sort_order).map(toDraftPriceOption),
        priceColumnValues: copyItemPriceColumnValueDrafts(sourceDraft?.priceColumnValues ?? sourceItem.priceColumnValues),
        badgeStyleKey: sourceDraft?.badgeStyleKey,
        badgeBackgroundColor: sourceDraft?.badgeBackgroundColor,
        badgeTextColor: sourceDraft?.badgeTextColor,
      };
      const nextDrafts = {
        ...currentDrafts,
        [draftId]: copiedDraft,
      };

      nextOrderedIds.forEach((id, index) => {
        nextDrafts[id] = buildItemOrderDraft(id, index, sourceItem.category_id ?? undefined, nextDrafts);
      });

      return nextDrafts;
    });

    const sourceCategory = draftedCategories.find((category) => category.id === sourceItem.category_id);
    if (sourceCategory) {
      if (sourceCategory.menu_page_id) setSelectedPageId(sourceCategory.menu_page_id);
      setSelectedCategoryId(sourceCategory.id);
      setExpandedPageIds(new Set(sourceCategory.menu_page_id ? [sourceCategory.menu_page_id] : []));
      setExpandedCategoryIds(new Set([sourceCategory.id]));
    }
    setEditingItemId(draftId);
    setItemEditorEntryMode("list");
    setIsCreatingItem(false);
    setConfirmingDeleteKey("");
    markMenuManagementDirty();
    const message = `${labels.itemLabel}이 임시 복사되었습니다. 저장 후 공개 메뉴판에 반영됩니다.`;
    toast.success(message);
  }

  function copyCategoryDraft(categoryId: string) {
    const sourceCategory = draftedCategories.find((category) => category.id === categoryId);
    if (!sourceCategory) return;

    const pageId = sourceCategory.menu_page_id;
    if (!pageId) return;
    const pageCategories = sortCategories(draftedCategories.filter((category) => category.menu_page_id === pageId));
    if (pageCategories.length >= MENU_LIMITS.maxCategoriesPerPage) {
      setCategoryDraftFeedback(`이 ${labels.pageLabel}에는 ${labels.categoryLabel}을 최대 ${MENU_LIMITS.maxCategoriesPerPage}개까지 추가할 수 있습니다.`);
      return;
    }

    const sourceItems = sortItems(draftedItems.filter((item) => item.category_id === sourceCategory.id));
    if (sourceItems.length > MENU_LIMITS.maxItemsPerCategory) {
      setCategoryDraftFeedback(`복사할 ${labels.categoryLabel}의 ${labels.itemLabel} 수가 최대 개수를 초과합니다.`);
      return;
    }
    if (draftedItems.length + sourceItems.length > MENU_LIMITS.maxItemsPerSite) {
      setCategoryDraftFeedback(`한 메뉴판에는 ${labels.itemLabel}을 최대 ${MENU_LIMITS.maxItemsPerSite}개까지 등록할 수 있습니다.`);
      return;
    }

    const copyCount = Object.keys(categoryBasicDrafts).filter((id) => id.startsWith(`temp-category-copy-${categoryId}-`)).length;
    const draftCategoryId = `temp-category-copy-${categoryId}-${copyCount + 1}`;
    const existingCategoryNames = pageCategories.map((category) => category.name);

    setCategoryBasicDrafts((currentDrafts) => {
      const nextDrafts = { ...currentDrafts };
      pageCategories.forEach((category, index) => {
        nextDrafts[category.id] = {
          isNew: nextDrafts[category.id]?.isNew,
          pageId: nextDrafts[category.id]?.pageId ?? category.menu_page_id ?? undefined,
          name: nextDrafts[category.id]?.name ?? category.name,
          description: nextDrafts[category.id]?.description ?? category.description ?? "",
          descriptionVisible: nextDrafts[category.id]?.descriptionVisible ?? category.description_visible,
          visible: nextDrafts[category.id]?.visible ?? category.visible,
          sortOrder: index + 1,
          priceOptionLabels: nextDrafts[category.id]?.priceOptionLabels ?? getCategoryPriceOptionLabels(category.id),
          priceColumns: nextDrafts[category.id]?.priceColumns ?? getCategoryPriceColumns(category.id),
        };
      });
      nextDrafts[draftCategoryId] = {
        isNew: true,
        pageId,
        name: getCopyName(sourceCategory.name, existingCategoryNames),
        description: sourceCategory.description ?? "",
        descriptionVisible: sourceCategory.description_visible,
        visible: sourceCategory.visible,
        sortOrder: 0,
        priceOptionLabels: getCategoryPriceOptionLabels(sourceCategory.id),
        priceColumns: copyCategoryPriceColumnDrafts(getCategoryPriceColumns(sourceCategory.id)),
      };
      return nextDrafts;
    });

    setItemBasicDrafts((currentDrafts) => {
      const nextDrafts = { ...currentDrafts };
      const copiedItemNames: string[] = [];
      sourceItems.forEach((item, index) => {
        const sourceDraft = currentDrafts[item.id];
        const draftItemId = `temp-item-category-copy-${categoryId}-${item.id}-${copyCount + 1}`;
        const copiedItemName = getCopyName(sourceDraft?.name ?? item.name, copiedItemNames);
        copiedItemNames.push(copiedItemName);
        nextDrafts[draftItemId] = {
          categoryId: draftCategoryId,
          isNew: true,
          imageUrl: sourceDraft?.imageUrl ?? item.image_url ?? null,
          imagePath: sourceDraft?.imagePath ?? item.image_path ?? null,
          imageAction: sourceDraft?.imageAction ?? "keep",
          name: copiedItemName,
          setName: sourceDraft?.setName ?? item.set_name ?? "",
          description: sourceDraft?.description ?? item.description ?? "",
          originInfo: sourceDraft?.originInfo ?? item.origin_info ?? "",
          price: sourceDraft?.price ?? (item.price == null ? "" : String(item.price)),
          priceLabel: sourceDraft?.priceLabel ?? item.price_label ?? "",
          priceNote: sourceDraft?.priceNote ?? item.price_note ?? "",
          badgeLabel: sourceDraft?.badgeLabel ?? (capabilities.itemBadges ? getMenuItemBadgeLabel(item) ?? "" : ""),
          visible: sourceDraft?.visible ?? item.visible,
          sortOrder: index,
          priceVisible: sourceDraft?.priceVisible ?? item.price_visible,
          portionLabel: sourceDraft?.portionLabel ?? item.portion_label ?? "",
          portionVisible: sourceDraft?.portionVisible ?? item.portion_visible,
          traitsVisible: sourceDraft?.traitsVisible ?? item.traits_visible,
          traitDrafts: copyItemTraitDrafts(sourceDraft?.traitDrafts ?? toItemTraitDrafts(traits.filter((trait) => trait.menu_item_id === item.id))),
          priceOptions: sourceDraft?.priceOptions ?? priceOptions.filter((option) => option.menu_item_id === item.id).sort((a, b) => a.sort_order - b.sort_order).map(toDraftPriceOption),
          priceColumnValues: [],
          badgeStyleKey: sourceDraft?.badgeStyleKey,
          badgeBackgroundColor: sourceDraft?.badgeBackgroundColor,
          badgeTextColor: sourceDraft?.badgeTextColor,
        };
      });
      return nextDrafts;
    });

    resetModes();
    setSelectedPageId(pageId);
    setSelectedCategoryId(draftCategoryId);
    setEditingCategoryId(draftCategoryId);
    setExpandedPageIds(new Set([pageId]));
    setExpandedCategoryIds(new Set([draftCategoryId]));
    markMenuManagementDirty();
    const message = `${labels.categoryLabel}가 임시 복사되었습니다. 저장 후 공개 메뉴판에 반영됩니다.`;
    toast.success(message);
  }

  function startEditItem(itemId: string) {
    if (!confirmDiscardDraft()) return;
    const item = draftedItems.find((entry) => entry.id === itemId);
    const category = item?.category_id ? draftedCategories.find((entry) => entry.id === item.category_id) : null;
    resetModes();
    if (category) {
      if (category.menu_page_id) setSelectedPageId(category.menu_page_id);
      setSelectedCategoryId(category.id);
      setExpandedPageIds(new Set(category.menu_page_id ? [category.menu_page_id] : []));
      setExpandedCategoryIds(new Set([category.id]));
    }
    setEditingItemId(itemId);
    setItemEditorEntryMode("edit");
  }

  function startConfirmDelete(key: string) {
    if (!confirmDiscardDraft()) return;
    setConfirmingDeleteKey(key);
  }

  function selectPage(pageId: string) {
    if (!confirmDiscardDraft()) return;
    resetModes();
    setSelectedPageId(pageId);
    setSelectedCategoryId("");
  }

  function selectCategory(pageId: string, categoryId: string) {
    if (!confirmDiscardDraft()) return;
    resetModes();
    setSelectedPageId(pageId);
    setSelectedCategoryId(categoryId);
  }

  function selectItem(pageId: string, categoryId: string, itemId: string) {
    if (!confirmDiscardDraft()) return;
    resetModes();
    setSelectedPageId(pageId);
    setSelectedCategoryId(categoryId);
    setEditingItemId(itemId);
    setItemEditorEntryMode("list");
  }

  function resetMenuManagementToStarterDraft() {
    if (!starterPreset || isSampleResetApplying) return;
    if (usesLegacyCategoryPriceOptionColumns) {
      resetDisplayMenuAToPreviewDraft();
      return;
    }
    const fixedPageId = !canManagePages ? selectedPage?.id ?? firstVisiblePageId : "";
    if (!canManagePages && !fixedPageId) {
      toast.error("기본 메뉴 페이지를 찾을 수 없어 샘플로 되돌릴 수 없습니다.");
      return;
    }

    setIsSampleResetApplying(true);

    const resetSeed = window.crypto?.randomUUID?.() ?? "sample-reset";
    const nextPageDrafts: Record<string, PageBasicDraft> = {};
    const nextCategoryDrafts: Record<string, CategoryBasicDraft> = {};
    const nextItemDrafts: Record<string, ItemBasicDraft> = {};
    let firstPageId = "";
    let firstCategoryId = "";

    starterPreset.pages.forEach((page, pageIndex) => {
      const pageId = fixedPageId || `temp-page-sample-${resetSeed}-${pageIndex + 1}`;
      if (!firstPageId) firstPageId = pageId;

      if (canManagePages) {
        nextPageDrafts[pageId] = {
          isNew: true,
          title: page.title,
          description: capabilities.pageDescription ? "" : "",
          descriptionVisible: false,
          visible: true,
          sortOrder: pageIndex,
          displaySettings: DEFAULT_MENU_PAGE_DISPLAY_SETTINGS,
        };
      }

      page.categories.forEach((category, categoryIndex) => {
        const categoryId = `temp-category-sample-${resetSeed}-${pageIndex + 1}-${categoryIndex + 1}`;
        if (!firstCategoryId) firstCategoryId = categoryId;

        nextCategoryDrafts[categoryId] = {
          isNew: true,
          pageId,
          name: category.name,
          description: "",
          descriptionVisible: false,
          visible: true,
          sortOrder: categoryIndex,
          priceColumns: [],
        };

        category.items.forEach((starterItem, itemIndex) => {
          const badgeLabel = capabilities.itemBadges ? starterItem.badge_label ?? (starterItem.recommended ? "추천" : "") : "";
          const itemId = `temp-item-sample-${resetSeed}-${pageIndex + 1}-${categoryIndex + 1}-${itemIndex + 1}`;

          nextItemDrafts[itemId] = {
            categoryId,
            isNew: true,
            imageUrl: capabilities.menuItemImages ? starterItem.image_url ?? null : null,
            imagePath: null,
            imageAction: "keep",
            name: starterItem.name,
            setName: starterItem.set_name ?? "",
            description: capabilities.itemDescription ? starterItem.description ?? "" : "",
            originInfo: "",
            price: starterItem.price == null ? "" : String(starterItem.price),
            priceLabel: canManageCategoryPriceColumns ? "" : starterItem.price_label ?? "",
            singlePriceInputMode: "number",
            priceNote: "",
            badgeLabel,
            visible: starterPreset.sample_items_visible ?? true,
            sortOrder: itemIndex,
            priceVisible: true,
            portionLabel: capabilities.itemPortionLabel ? starterItem.portion_label ?? "" : "",
            portionVisible: capabilities.itemPortionLabel ? Boolean(starterItem.portion_label) : false,
            traitsVisible: false,
            traitDrafts: [],
            priceOptions: capabilities.priceOptions
              ? starterItem.price_options?.slice(0, capabilities.maxPriceOptionsPerItem ?? MENU_LIMITS.maxPriceOptionsPerItem).map((option, optionIndex) => ({
                  id: `temp-price-option-sample-${resetSeed}-${pageIndex + 1}-${categoryIndex + 1}-${itemIndex + 1}-${optionIndex + 1}`,
                  label: option.label,
                  price: option.price == null ? "" : String(option.price),
                  priceLabel: option.price_label ?? "",
                  visible: true,
                  sortOrder: optionIndex,
                }))
              : undefined,
            priceColumnValues: [],
          };
        });
      });
    });

    setPageBasicDrafts(canManagePages ? nextPageDrafts : {});
    setCategoryBasicDrafts(nextCategoryDrafts);
    setItemBasicDrafts(nextItemDrafts);
    setPendingItemDrafts({});
    setDeletedPageIds(canManagePages ? new Set(menuPages.map((page) => page.id)) : new Set());
    setDeletedCategoryIds(new Set(categories.map((category) => category.id)));
    setDeletedItemIds(new Set(items.map((item) => item.id)));
    resetModes();
    setIsSampleResetConfirming(false);
    setSelectedPageId(firstPageId);
    setSelectedCategoryId(firstCategoryId);
    setExpandedPageIds(new Set(firstPageId ? [firstPageId] : []));
    setExpandedCategoryIds(new Set(firstCategoryId ? [firstCategoryId] : []));
    markMenuManagementDirty();
    toast.success("메뉴 관리 내용이 샘플 데이터로 임시 변경되었습니다. 저장 후 공개 메뉴판에 반영됩니다.");
    setIsSampleResetApplying(false);
  }

  function resetDisplayMenuAToPreviewDraft() {
    if (isSampleResetApplying) return;

    setIsSampleResetApplying(true);

    const resetSeed = window.crypto?.randomUUID?.() ?? "display-sample-reset";
    const previewData = buildDisplayMenuAPreviewData();
    const sortedPreviewPages = sortMenuPages(previewData.pages.filter((page) => page.visible));
    const previewPageIdMap = new Map(sortedPreviewPages.map((page, pageIndex) => [page.id, `temp-page-sample-${resetSeed}-${pageIndex + 1}`]));
    const previewPageOrderById = new Map(sortedPreviewPages.map((page, pageIndex) => [page.id, pageIndex]));
    const nextPageDrafts: Record<string, PageBasicDraft> = {};
    const nextCategoryDrafts: Record<string, CategoryBasicDraft> = {};
    const nextItemDrafts: Record<string, ItemBasicDraft> = {};
    const priceOptionsByItemId = new Map<string, typeof previewData.priceOptions>();
    const previewItemsByCategoryId = new Map<string, typeof previewData.items>();

    previewData.priceOptions.forEach((option) => {
      const options = priceOptionsByItemId.get(option.menu_item_id) ?? [];
      options.push(option);
      priceOptionsByItemId.set(option.menu_item_id, options);
    });

    previewData.items.forEach((item) => {
      if (!item.category_id) return;
      const categoryItems = previewItemsByCategoryId.get(item.category_id) ?? [];
      categoryItems.push(item);
      previewItemsByCategoryId.set(item.category_id, categoryItems);
    });

    sortedPreviewPages.forEach((page, pageIndex) => {
      const draftPageId = previewPageIdMap.get(page.id);
      if (!draftPageId) return;

      nextPageDrafts[draftPageId] = {
        isNew: true,
        title: page.title,
        description: "",
        descriptionVisible: false,
        visible: true,
        sortOrder: pageIndex,
        displaySettings: normalizeMenuPageDisplaySettings(page.display_settings),
      };
    });

    previewData.categories
      .filter((category) => category.visible)
      .sort((left, right) => {
        const leftPageOrder = previewPageOrderById.get(left.menu_page_id ?? "") ?? Number.MAX_SAFE_INTEGER;
        const rightPageOrder = previewPageOrderById.get(right.menu_page_id ?? "") ?? Number.MAX_SAFE_INTEGER;
        return leftPageOrder - rightPageOrder || (left.sort_order ?? 0) - (right.sort_order ?? 0);
      })
      .forEach((category) => {
        const draftPageId = previewPageIdMap.get(category.menu_page_id ?? "");
        if (!draftPageId) return;

        const categoryIndex = Object.values(nextCategoryDrafts).filter((draft) => draft.pageId === draftPageId).length;
        const draftCategoryId = `temp-category-sample-${resetSeed}-${category.id}`;
        const categoryItems = previewItemsByCategoryId.get(category.id) ?? [];
        const categoryOptionLabelsByKey = new Map<string, { label: string; count: number; firstSortOrder: number }>();
        categoryItems.forEach((item) => {
          (priceOptionsByItemId.get(item.id) ?? [])
            .filter((option) => option.visible)
            .forEach((option) => {
              const label = option.label.trim();
              if (!label) return;
              const key = label.toLocaleUpperCase("ko-KR");
              const current = categoryOptionLabelsByKey.get(key);
              if (current) {
                current.count += 1;
                current.firstSortOrder = Math.min(current.firstSortOrder, option.sort_order ?? 0);
              } else {
                categoryOptionLabelsByKey.set(key, { label, count: 1, firstSortOrder: option.sort_order ?? 0 });
              }
            });
        });
        const categoryOptionLabels = normalizeDraftPriceOptionLabels(
          Array.from(categoryOptionLabelsByKey.values())
            .sort((left, right) => left.firstSortOrder - right.firstSortOrder || right.count - left.count)
            .map((option) => option.label),
          capabilities.maxPriceOptionsPerItem ?? MENU_LIMITS.maxPriceOptionsPerItem
        );

        nextCategoryDrafts[draftCategoryId] = {
          isNew: true,
          pageId: draftPageId,
          name: category.name,
          description: "",
          descriptionVisible: false,
          visible: true,
          sortOrder: categoryIndex,
          priceOptionLabels: categoryOptionLabels,
        };

        categoryItems
          .filter((item) => item.visible)
          .sort((left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0))
          .forEach((item, itemIndex) => {
            const itemOptions = (priceOptionsByItemId.get(item.id) ?? [])
              .filter((option) => option.visible)
              .sort((left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0));

            nextItemDrafts[`temp-item-sample-${resetSeed}-${item.id}`] = {
              categoryId: draftCategoryId,
              isNew: true,
              imageUrl: null,
              imagePath: null,
              imageAction: "keep",
              name: item.name,
              setName: item.set_name ?? "",
              description: "",
              originInfo: "",
              price: item.price == null ? "" : String(item.price),
              priceLabel: item.price_label ?? "",
              priceNote: "",
              badgeLabel: capabilities.itemBadges ? getMenuItemBadgeLabel(item) ?? "" : "",
              visible: true,
              sortOrder: itemIndex,
              priceVisible: item.price_visible,
              portionLabel: "",
              portionVisible: false,
              traitsVisible: false,
              traitDrafts: [],
              priceOptions: itemOptions.length > 0
                ? itemOptions.slice(0, capabilities.maxPriceOptionsPerItem ?? MENU_LIMITS.maxPriceOptionsPerItem).map((option, optionIndex) => ({
                    id: `temp-price-option-sample-${resetSeed}-${item.id}-${optionIndex + 1}`,
                    label: option.label,
                    price: option.price == null ? "" : String(option.price),
                    priceLabel: option.price_label ?? "",
                    visible: true,
                    sortOrder: option.sort_order ?? optionIndex,
                  }))
                : undefined,
            };
          });
      });

    const preferredPreviewPage = sortedPreviewPages.find((page) => {
      const settings = normalizeMenuPageDisplaySettings(page.display_settings);
      return settings.pageType === "menu" && settings.menuLayoutType === "full_menu";
    }) ?? sortedPreviewPages.find((page) => normalizeMenuPageDisplaySettings(page.display_settings).pageType === "menu") ?? sortedPreviewPages[0] ?? null;
    const firstPageId = preferredPreviewPage ? previewPageIdMap.get(preferredPreviewPage.id) ?? "" : "";
    const firstCategoryId = Object.entries(nextCategoryDrafts).find(([, draft]) => draft.pageId === firstPageId)?.[0] ?? Object.keys(nextCategoryDrafts)[0] ?? "";

    setPageBasicDrafts(nextPageDrafts);
    setCategoryBasicDrafts(nextCategoryDrafts);
    setItemBasicDrafts(nextItemDrafts);
    setPendingItemDrafts({});
    setDeletedPageIds(new Set(menuPages.map((page) => page.id)));
    setDeletedCategoryIds(new Set(categories.map((category) => category.id)));
    setDeletedItemIds(new Set(items.map((item) => item.id)));
    resetModes();
    setIsSampleResetConfirming(false);
    setSelectedPageId(firstPageId);
    setSelectedCategoryId(firstCategoryId);
    setExpandedPageIds(new Set(firstPageId ? [firstPageId] : []));
    setExpandedCategoryIds(new Set(firstCategoryId ? [firstCategoryId] : []));
    markMenuManagementDirty();
    toast.success("디스플레이 샘플 데이터가 임시 변경되었습니다. 저장 후 미리보기와 공개 메뉴판에 반영됩니다.");
    setIsSampleResetApplying(false);
  }

  const selectedPageCopyDisabledReason = selectedPage ? getPageCopyDisabledReason(selectedPage.id) : "";
  const sampleResetDisabledReason = starterPreset ? "" : "이 템플릿의 샘플 데이터를 찾을 수 없습니다.";
  const aiMenuCleanupCategories = getCleanedAiMenuCategories();
  const aiMenuCleanupCategoryCount = aiMenuCleanupCategories.length;
  const aiMenuCleanupTargetPage = selectedPage ?? sortedPages.find((page) => page.visible) ?? sortedPages[0] ?? null;
  const aiMenuCleanupTargetPageCategoryCount = aiMenuCleanupTargetPage
    ? draftedCategories.filter((category) => category.menu_page_id === aiMenuCleanupTargetPage.id).length
    : 0;
  const aiMenuCleanupCurrentPageTotal = aiMenuCleanupTargetPageCategoryCount + aiMenuCleanupCategoryCount;
  const aiMenuCleanupResultFitsOnePage =
    aiMenuCleanupCategoryCount > 0 && aiMenuCleanupCategoryCount <= MENU_LIMITS.maxCategoriesPerPage;
  const aiMenuCleanupCurrentPageBlocked =
    Boolean(menuCleanupResult && aiMenuCleanupTargetPage && aiMenuCleanupCurrentPageTotal > MENU_LIMITS.maxCategoriesPerPage);
  const aiMenuCleanupNewPageBlocked = Boolean(menuCleanupResult && (!canManagePages || sortedPages.length >= MENU_LIMITS.maxPagesPerSite));
  const aiMenuCleanupTooManyCategories = Boolean(menuCleanupResult && aiMenuCleanupCategoryCount > MENU_LIMITS.maxCategoriesPerPage);

  return (
    <div className="space-y-6">
      <section className="rounded-lg bg-white p-6 shadow-sm">
        <div className="mb-8 border-b border-zinc-100 pb-6">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div className="min-w-0">
              <h2 className="flex min-w-0 items-center gap-2 text-2xl font-bold tracking-tight">
                <span className="min-w-0 truncate">{labels.itemPluralLabel.includes("서비스") ? "가격표 관리" : "메뉴 관리"}</span>
                <HelpTooltip label="메뉴 관리 도움말">
                  변경사항은 편집 화면에 먼저 반영되며, 하단의 저장을 눌러야 미리보기와 공개 메뉴판에 반영됩니다. 샘플로 되돌리기도 저장 전까지 공개 메뉴판에는 반영되지 않습니다.
                </HelpTooltip>
              </h2>
              <p className="mt-2 break-words text-sm font-semibold leading-relaxed text-zinc-500">
                {labels.pageLabel}, {labels.categoryLabel}, {labels.itemPluralLabel}을 관리합니다.
              </p>
              <p className="mt-3 break-keep rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-3 text-xs font-bold leading-relaxed text-zinc-500">
                메뉴명, 가격, 원산지, 알레르기, 이벤트 정보는 실제 매장 운영 기준과 일치하는지 반드시 확인해주세요. 잘못 입력된 정보로 인한 소비자 분쟁은 메뉴판 운영자에게 책임이 있습니다.
              </p>
            </div>
            <div className="shrink-0">
              <div className="flex flex-col gap-3 sm:items-end">
                <button
                  type="button"
                  onClick={() => {
                    setMenuCleanupResult(null);
                    setIsMenuCleanupOpen(true);
                  }}
                  disabled={localAiMenuCleanupUsage.used >= localAiMenuCleanupUsage.limit}
                  className="inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-bold text-zinc-700 transition-colors hover:border-zinc-400 hover:text-zinc-950 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
                >
                  AI 메뉴 정리 · 3크레딧
                </button>
                <p className="max-w-xs break-keep text-right text-xs font-bold leading-relaxed text-zinc-400">
                  AI가 생성한 문구와 번역은 참고용 초안입니다. 공개 전 실제 메뉴 정보와 일치하는지 직접 확인해주세요.
                </p>
                <div className="w-full min-w-56">
                  <AiUsageMeter label="AI 메뉴 정리" used={localAiMenuCleanupUsage.used} limit={localAiMenuCleanupUsage.limit} compact />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
          <aside className="min-w-0 rounded-lg border border-zinc-100 bg-zinc-50 p-4 lg:sticky lg:top-24">
            <div className="mb-4 min-w-0">
              <h3 className="mt-1 flex min-w-0 items-center gap-2 text-lg font-black text-zinc-950">
                <span className="min-w-0 truncate">메뉴판 구조</span>
                <HelpTooltip label="메뉴판 구조 도움말">
                  {canManagePages
                    ? `${labels.pageLabel} 안에 ${labels.categoryLabel}가 있고, ${labels.categoryLabel} 안에 ${labels.itemLabel}이 들어갑니다.`
                    : `${labels.categoryLabel} 안에 ${labels.itemLabel}이 들어갑니다.`} 왼쪽 순서 이동 아이콘을 드래그하거나, 아래의 위/아래 버튼으로 선택한 항목의 순서를 바꿀 수 있습니다. 페이지를 닫으면 하위 카테고리와 메뉴 아이템이 접혀서 숨겨집니다. 변경사항은 저장 후 공개 메뉴판에 반영됩니다.
                </HelpTooltip>
              </h3>
            </div>
            {canConfigurePcTabletLayoutMode && (
              <section className="mb-4 rounded-lg border border-zinc-100 bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="break-keep text-sm font-black text-zinc-950">PC/태블릿 배치 방식</h4>
                    <p className="mt-1 break-keep text-xs font-bold leading-relaxed text-zinc-500">
                      PC와 태블릿에서 메뉴판이 보이는 방식을 선택합니다.
                    </p>
                    <p className="mt-1 break-keep text-[11px] font-bold leading-relaxed text-zinc-400">
                      모바일은 등록 순서대로 표시됩니다.
                    </p>
                  </div>
                </div>
                <div className="mt-3 grid gap-2">
                  {PC_TABLET_LAYOUT_MODE_OPTIONS.map((option) => {
                    const selected = pcTabletLayoutModeDraft === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => updatePcTabletLayoutModeDraft(option.value)}
                        className={`rounded-lg border px-3 py-2.5 text-left transition ${
                          selected
                            ? "border-zinc-950 bg-zinc-950 text-white"
                            : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400"
                        }`}
                        aria-pressed={selected}
                      >
                        <span className="block break-keep text-xs font-black">{option.title}</span>
                        <span className={`mt-1 block break-keep text-[11px] font-bold leading-relaxed ${selected ? "text-zinc-200" : "text-zinc-400"}`}>
                          {option.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-3 break-keep text-[11px] font-bold leading-relaxed text-zinc-400">
                  기본 추천은 묶음형 자동 배치이며, 필요하면 채움형 배치로 변경할 수 있습니다.
                </p>
              </section>
            )}
            <div className="flex flex-wrap items-center justify-end gap-3">
              {shouldShowPageCreateButton && (
                <button
                  type="button"
                  onClick={startCreatePage}
                  disabled={reachedPageLimit}
                  className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-bold text-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
                >
                  + {labels.pageLabel}
                </button>
              )}
              {shouldShowCategoryCreateButton && (
                <button
                  type="button"
                  onClick={startCreateCategory}
                  disabled={reachedCategoryLimit}
                  className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-bold text-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
                >
                  + {labels.categoryLabel}
                </button>
              )}
              {shouldShowItemCreateButton && (
                <button
                  type="button"
                  onClick={startCreateItem}
                  disabled={reachedItemLimit}
                  className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-bold text-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
                >
                  + {labels.itemLabel}
                </button>
              )}
            </div>

            {sortedPages.length === 0 ? (
              <div className="mt-6 grid gap-3">
                {canManagePages && draftTarget?.type === "page" && <DraftNameInput value={draftTarget.title} onChange={updateDraftTitle} placeholder={labels.pageLabel === "가격표 페이지" ? "새 가격표 페이지명 입력" : "새 페이지명 입력"} level="page" />}
                <EmptyState>{labels.pageLabel}가 없습니다</EmptyState>
              </div>
            ) : (
              <div className="mt-5 grid gap-1.5">
                {canManagePages && draftTarget?.type === "page" && <DraftNameInput value={draftTarget.title} onChange={updateDraftTitle} placeholder={labels.pageLabel === "가격표 페이지" ? "새 가격표 페이지명 입력" : "새 페이지명 입력"} level="page" />}
                {visibleStructurePages.map((page) => {
                  const pageDisplaySettings = getDraftedPageDisplaySettings(page);
                  const pageIsPromotion = canConfigureDisplayPages && isPromotionDisplayPage(pageDisplaySettings);
                  const pageCategories = pageIsPromotion ? [] : sortCategories(draftedCategories.filter((category) => category.menu_page_id === page.id));
                  const pageActive = page.id === visiblePageId && !visibleCategoryId && !editingItemId;
                  const pageCanCollapse = canManagePages && !pageIsPromotion && pageCategories.length > 0;
                  const pageExpanded = expandedPageIds.has(page.id);
                  return (
                    <div
                      key={page.id}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={() => {
                        if (canManagePages) handlePageDrop(page.id);
                      }}
                      className="min-w-0 overflow-hidden"
                      >
                      {canManagePages && <div className={`flex min-w-0 items-center gap-1 rounded-md border px-2 py-2 transition ${pageActive ? "border-zinc-950 bg-zinc-950 text-white" : "border-zinc-100 bg-white text-zinc-800 hover:border-zinc-200 hover:bg-zinc-100"}`}>
                        <button
                          type="button"
                          draggable
                          onDragStart={(event) => {
                            event.stopPropagation();
                            setDragState({ type: "page", id: page.id });
                          }}
                          onClick={(event) => event.stopPropagation()}
                          className={`inline-flex shrink-0 cursor-grab select-none items-center justify-center rounded px-1 active:cursor-grabbing ${pageActive ? "text-zinc-300 hover:text-white" : "text-zinc-300 hover:text-zinc-500"}`}
                          aria-label={`${labels.pageLabel} 순서 이동`}
                        >
                          <DragHandleIcon />
                        </button>
                        <button
                          type="button"
                          onClick={() => selectPage(page.id)}
                          className="min-w-0 flex-1 text-left text-sm font-black"
                        >
                          <span className="block truncate">{getMenuPageTitle(page)}</span>
                          {canConfigureDisplayPages && (
                            <span className={`mt-0.5 block truncate text-[10px] font-bold ${pageActive ? "text-zinc-300" : "text-zinc-400"}`}>
                              {getDisplayPageTypeLabel(pageDisplaySettings.pageType)}
                              {pageDisplaySettings.pageType === "menu" && pageDisplaySettings.menuLayoutType
                                ? ` · ${getDisplayMenuLayoutTypeLabel(pageDisplaySettings.menuLayoutType)}`
                                : ""}
                            </span>
                          )}
                        </button>
                        {pageCanCollapse && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleExpandedPage(page.id);
                            }}
                            className="shrink-0 rounded-md px-1 text-xs font-black"
                            aria-expanded={pageExpanded}
                            aria-label={pageExpanded ? "페이지 접기" : "페이지 펼치기"}
                          >
                            {pageExpanded ? "⌃" : "⌄"}
                          </button>
                        )}
                      </div>}
                      {!pageIsPromotion && pageExpanded && <div className={canManagePages ? "mt-1.5 grid min-w-0 gap-1 border-l border-zinc-200 pl-3" : "grid min-w-0 gap-1"}>
                        {draftTarget?.type === "category" && draftTarget.pageId === page.id && (
                          <DraftNameInput
                            value={draftTarget.title}
                            onChange={updateDraftTitle}
                            placeholder={labels.categoryLabel === "서비스 그룹" ? "새 서비스 그룹명 입력" : "새 카테고리명 입력"}
                            level="category"
                          />
                        )}
                        {pageCategories.map((category) => {
                          const categoryItems = sortItems(draftedItems.filter((item) => item.category_id === category.id));
                          const categoryQualityNotice = getDisplayMenuCategoryQualityNotice(category, categoryItems, supportsDisplayMenuQualityWarnings);
                          const categoryActive = category.id === visibleCategoryId && !editingItemId;
                          const categoryCanCollapse = categoryItems.length > 0;
                          const categoryExpanded = expandedCategoryIds.has(category.id);
                          return (
                            <div
                              key={category.id}
                              onDragOver={(event) => event.preventDefault()}
                              onDrop={() => handleCategoryDrop(page.id, category.id)}
                              className="min-w-0"
                            >
                              <div
                                className={`flex min-w-0 items-center gap-1 rounded-md px-2 py-1.5 transition ${
                                  categoryActive ? "bg-zinc-950 text-white" : "text-zinc-600 hover:bg-zinc-100"
                                }`}
                              >
                                <button
                                  type="button"
                                  draggable
                                  onDragStart={(event) => {
                                    event.stopPropagation();
                                    setDragState({ type: "category", id: category.id, pageId: page.id });
                                  }}
                                  onClick={(event) => event.stopPropagation()}
                                  className={`inline-flex shrink-0 cursor-grab select-none items-center justify-center rounded px-1 active:cursor-grabbing ${categoryActive ? "text-zinc-300 hover:text-white" : "text-zinc-300 hover:text-zinc-500"}`}
                                  aria-label={`${labels.categoryLabel} 순서 이동`}
                                >
                                  <DragHandleIcon />
                                </button>
                                <button type="button" onClick={() => selectCategory(page.id, category.id)} className="flex min-w-0 flex-1 items-center gap-1 text-left text-xs font-bold">
                                  <span className="min-w-0 truncate">{category.name}</span>
                                  <span className={`shrink-0 ${categoryActive ? "text-zinc-300" : "text-zinc-400"}`}>({categoryItems.length})</span>
                                </button>
                                {categoryCanCollapse && (
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      toggleExpandedCategory(category.id);
                                    }}
                                    className="shrink-0 rounded-md px-1 text-xs font-black"
                                    aria-expanded={categoryExpanded}
                                    aria-label={categoryExpanded ? `${labels.categoryLabel} 접기` : `${labels.categoryLabel} 펼치기`}
                                  >
                                    {categoryExpanded ? "⌃" : "⌄"}
                                  </button>
                                )}
                              </div>
                              {categoryQualityNotice && (
                                <div className="ml-3 mt-1">
                                  <DisplayMenuCategoryQualityNoticeBox notice={categoryQualityNotice} compact />
                                </div>
                              )}
                              {categoryExpanded && categoryItems.length > 0 && (
                                <div className="ml-3 mt-1 grid min-w-0 gap-1 border-l border-zinc-100 pl-3">
                                  {categoryItems.map((item) => (
                                    <div
                                      key={item.id}
                                      onDragOver={(event) => event.preventDefault()}
                                      onDrop={() => handleItemDrop(category.id, item.id)}
                                      onPointerUp={(event) => {
                                        if (event.pointerType === "mouse" && event.button !== 0) return;
                                        selectItem(page.id, category.id, item.id);
                                      }}
                                      onKeyDown={(event) => {
                                        if (event.key === "Enter" || event.key === " ") {
                                          event.preventDefault();
                                          selectItem(page.id, category.id, item.id);
                                        }
                                      }}
                                      role="button"
                                      tabIndex={0}
                                      className={`flex min-w-0 cursor-pointer items-center gap-1 rounded-md px-3 py-1.5 text-left text-xs font-semibold transition ${
                                        item.id === editingItemId ? "bg-zinc-100 text-zinc-950" : "text-zinc-400 hover:bg-zinc-50 hover:text-zinc-700"
                                      }`}
                                    >
                                      <button
                                        type="button"
                                        draggable
                                        onDragStart={(event) => {
                                          event.stopPropagation();
                                          setDragState({ type: "item", id: item.id, categoryId: category.id });
                                        }}
                                        onClick={(event) => event.stopPropagation()}
                                        onPointerUp={(event) => event.stopPropagation()}
                                        className="inline-flex shrink-0 cursor-grab select-none items-center justify-center rounded px-1 text-zinc-300 hover:text-zinc-500 active:cursor-grabbing"
                                        aria-label={`${labels.itemLabel} 순서 이동`}
                                      >
                                        <DragHandleIcon />
                                      </button>
                                      <span className="min-w-0 flex-1 truncate text-left">
                                        {item.name}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>}
                    </div>
                  );
                })}
              </div>
            )}
            <div className="mt-3 flex items-center justify-end gap-1.5">
              <button
                type="button"
                onClick={() => moveSelectedOrder(-1)}
                disabled={!canMoveSelectedOrderUp}
                aria-label="위로 이동"
                title="위로 이동"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 bg-white text-sm font-black leading-none text-zinc-500 transition hover:border-zinc-400 hover:text-zinc-950 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-300"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => moveSelectedOrder(1)}
                disabled={!canMoveSelectedOrderDown}
                aria-label="아래로 이동"
                title="아래로 이동"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 bg-white text-sm font-black leading-none text-zinc-500 transition hover:border-zinc-400 hover:text-zinc-950 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-300"
              >
                ↓
              </button>
            </div>
          </aside>

          <section className="min-w-0 rounded-lg border border-zinc-100 bg-white p-4 lg:p-6">
            {canManagePages && isCreatingPage ? (
              <div>
                <PanelHeader eyebrow="New Page" title={`새 ${labels.pageLabel} 추가`} description={`${labels.pageLabel}를 추가하면 왼쪽 구조 트리에 새 구역이 생깁니다.`} />
                <MenuPageForm
                  menuId={menuId}
                  count={sortedPages.length}
                  formId="menu-page-form-new"
                  labels={labels}
                  draftOnly
                  draftTitle={draftTarget?.type === "page" ? draftTarget.title : undefined}
                  onDraftTitleChange={updateDraftTitle}
                  onDraftChange={updateDraftTargetDetails}
                  onDraftCommit={commitPageDraft}
                  onCancel={resetModes}
                  draftActionLabel={`${labels.pageLabel} 추가`}
                  draftFeedback={pageDraftFeedback}
                  supportsDescription={capabilities.pageDescription}
                  supportsDisplaySettings={canConfigureDisplayPages}
                  supportsDisplayPromotionPages={supportsDisplayPromotionPages}
                  supportsDisplayMenuLayoutTypes={supportsDisplayMenuLayoutTypes}
                  supportsSplitImageText={capabilities.splitImageText}
                  supportsPromotionText={capabilities.promotionText}
                  displaySettingsDraft={draftTarget?.type === "page" ? draftTarget.displaySettings : undefined}
                  canUseDisplayVideoUpload={canUseDisplayVideoUpload}
                />
              </div>
            ) : canManagePages && editingPageId && selectedPage ? (
              <div>
                {(() => {
                  const isCopiedPage = selectedPage.id.startsWith("temp-page-copy-");
                  return (
                    <>
                <PanelHeader
                  eyebrow="Page Detail"
                  title={`${labels.pageLabel} 수정`}
                  description={
                    capabilities.pageDescription
                      ? `${labels.pageLabel}의 이름, 설명, 표시 여부를 수정합니다.`
                      : `${labels.pageLabel}의 이름과 표시 여부를 수정합니다.`
                  }
                />
                <MenuPageForm
                  key={selectedPage.id}
                  menuId={menuId}
                  page={selectedPage}
                  count={sortedPages.length}
                  formId={`menu-page-form-${selectedPage.id}`}
                  labels={labels}
                  draftOnly
                  draftTitle={pageBasicDrafts[selectedPage.id]?.title ?? selectedPage.title}
                  onDraftTitleChange={(title) => updatePageBasicDraft(selectedPage.id, { title })}
                  onDraftChange={(patch) => updatePageBasicDraft(selectedPage.id, patch)}
                  onDraftCommit={commitPageDraft}
                  onCancel={resetModes}
                  cancelLabel={isCopiedPage ? "목록으로" : "취소"}
                  draftActionLabel="수정 내용 반영"
                  draftFeedback={pageDraftFeedback}
                  supportsDescription={capabilities.pageDescription}
                  supportsDisplaySettings={canConfigureDisplayPages}
                  supportsDisplayPromotionPages={supportsDisplayPromotionPages}
                  supportsDisplayMenuLayoutTypes={supportsDisplayMenuLayoutTypes}
                  supportsSplitImageText={capabilities.splitImageText}
                  supportsPromotionText={capabilities.promotionText}
                  displaySettingsDraft={pageBasicDrafts[selectedPage.id]?.displaySettings ?? normalizeMenuPageDisplaySettings(selectedPage.display_settings)}
                  displayQualityNotice={
                    selectedPageDisplayQualityNotice ? <DisplayMenuQualityNoticeBox notice={selectedPageDisplayQualityNotice} /> : null
                  }
                  canUseDisplayVideoUpload={canUseDisplayVideoUpload}
                  deleteAction={
                    <DraftDeleteConfirmButton
                      title={isCopiedPage ? "이 복사본을 삭제할까요?" : `${labels.pageLabel}를 삭제할까요?`}
                      description={
                        isCopiedPage
                          ? "삭제해도 하단의 저장을 누르기 전까지 공개 메뉴판에는 반영되지 않습니다."
                          : `이 페이지에 포함된 ${labels.categoryLabel}과 ${labels.itemLabel}도 함께 삭제됩니다. 저장 전까지 실제 데이터에는 반영되지 않습니다.`
                      }
                      disabledReason={sortedPages.length <= 1 ? `최소 1개의 ${labels.pageLabel}는 필요합니다.` : undefined}
                      isConfirming={confirmingDeleteKey === `page:${selectedPage.id}`}
                      onRequestConfirm={() => startConfirmDelete(`page:${selectedPage.id}`)}
                      onConfirm={() => deletePageDraft(selectedPage.id)}
                      onCancel={() => setConfirmingDeleteKey("")}
                    />
                  }
                />
                    </>
                  );
                })()}
              </div>
            ) : isCreatingCategory && selectedPage ? (
              <div>
                <PanelHeader
                  eyebrow="New Group"
                  title={`새 ${labels.categoryLabel} 추가`}
                  description={
                    canManagePages
                      ? `${getMenuPageTitle(selectedPage)} 안에 새 ${labels.categoryLabel}을 추가합니다.`
                      : `메뉴판에 새 ${labels.categoryLabel}을 추가합니다.`
                  }
                />
                <MenuCategoryForm
                  menuId={menuId}
                  pageId={selectedPage.id}
                  formId="menu-category-form-new"
                  labels={labels}
                  draftOnly
                  draftName={draftTarget?.type === "category" ? draftTarget.title : undefined}
                  priceOptionLabels={draftTarget?.type === "category" ? draftTarget.priceOptionLabels : []}
                  priceColumns={draftTarget?.type === "category" ? draftTarget.priceColumns : []}
                  supportsDescription={capabilities.categoryDescription}
                  supportCategoryPriceOptionColumns={usesLegacyCategoryPriceOptionColumns}
                  supportBasicPriceColumns={canManageCategoryPriceColumns}
                  maxPriceOptionColumns={maxCategoryPriceOptionColumns}
                  maxCategoryPriceColumns={maxCategoryPriceColumns}
                  onDraftNameChange={updateDraftTitle}
                  onDraftChange={updateDraftTargetDetails}
                  onDraftCommit={commitCategoryDraft}
                  draftActionLabel={`${labels.categoryLabel} 추가`}
                  draftFeedback={categoryDraftFeedback}
                  onCancel={resetModes}
                />
              </div>
            ) : editingCategoryId && selectedCategory ? (
              <div>
                {(() => {
                  const isCopiedCategory = selectedCategory.id.startsWith("temp-category-copy-") || selectedCategory.id.startsWith("temp-category-page-copy-");
                  return (
                    <>
                <PanelHeader
                  eyebrow="Group Detail"
                  title={`${labels.categoryLabel} 수정`}
                  description={
                    capabilities.categoryDescription
                      ? `${labels.categoryLabel}의 이름, 설명, 표시 여부를 수정합니다.`
                      : `${labels.categoryLabel}의 이름과 표시 여부를 수정합니다.`
                  }
                />
                <MenuCategoryForm
                  key={selectedCategory.id}
                  menuId={menuId}
                  pageId={selectedPage?.id ?? selectedCategory.menu_page_id}
                  category={selectedCategory}
                  formId={`menu-category-form-${selectedCategory.id}`}
                  labels={labels}
                  draftOnly
                  draftName={categoryBasicDrafts[selectedCategory.id]?.name ?? selectedCategory.name}
                  priceOptionLabels={getCategoryPriceOptionLabels(selectedCategory.id)}
                  priceColumns={getCategoryPriceColumns(selectedCategory.id)}
                  supportsDescription={capabilities.categoryDescription}
                  supportCategoryPriceOptionColumns={usesLegacyCategoryPriceOptionColumns}
                  supportBasicPriceColumns={canManageCategoryPriceColumns}
                  maxPriceOptionColumns={maxCategoryPriceOptionColumns}
                  maxCategoryPriceColumns={maxCategoryPriceColumns}
                  onDraftNameChange={(name) => updateCategoryBasicDraft(selectedCategory.id, { name })}
                  onDraftChange={(patch) => updateCategoryBasicDraft(selectedCategory.id, patch)}
                  onDraftCommit={commitCategoryDraft}
                  draftActionLabel="수정 내용 반영"
                  draftFeedback={categoryDraftFeedback}
                  onCancel={resetModes}
                  cancelLabel={isCopiedCategory ? "목록으로" : "취소"}
                  deleteAction={
                    <DraftDeleteConfirmButton
                      title={isCopiedCategory ? "이 복사본을 삭제할까요?" : `${labels.categoryLabel}을 삭제할까요?`}
                      description={
                        isCopiedCategory
                          ? "삭제해도 하단의 저장을 누르기 전까지 공개 메뉴판에는 반영되지 않습니다."
                          : `이 ${labels.categoryLabel}에 포함된 ${labels.itemLabel}도 함께 삭제됩니다. 저장 전까지 실제 데이터에는 반영되지 않습니다.`
                      }
                      isConfirming={confirmingDeleteKey === `category:${selectedCategory.id}`}
                      onRequestConfirm={() => startConfirmDelete(`category:${selectedCategory.id}`)}
                      onConfirm={() => deleteCategoryDraft(selectedCategory.id)}
                      onCancel={() => setConfirmingDeleteKey("")}
                    />
                  }
                  cancelHelperText={
                    isCopiedCategory
                      ? "목록으로 돌아가도 복사본은 삭제되지 않습니다. 복사본을 없애려면 삭제 버튼을 사용해주세요."
                      : undefined
                  }
                />
                {selectedCategoryDisplayQualityNotice ? (
                  <div className="mt-4">
                    <DisplayMenuCategoryQualityNoticeBox notice={selectedCategoryDisplayQualityNotice} />
                  </div>
                ) : null}
                    </>
                  );
                })()}
              </div>
            ) : selectedCategory && isCreatingItem ? (
              <div ref={newItemFormRef} className="fixed inset-0 z-50 overflow-y-auto bg-white p-5 lg:static lg:p-0">
                <PanelHeader eyebrow="New Item" title={`새 ${labels.itemLabel} 추가`} description={`현재 선택한 ${labels.categoryLabel}에 새 ${labels.itemLabel}을 추가합니다.`} />
                <MenuItemForm
                  menuId={menuId}
                  categories={categoriesForPage}
                  capabilities={capabilities}
                  aiDescriptionUsage={localAiDescriptionUsage}
                  onAiDescriptionUsageChange={setLocalAiDescriptionUsage}
                  badgeStyles={badgeStyles}
                  labels={labels}
                  itemCount={itemsForCategory.length}
                  selectedCategoryId={selectedCategory.id}
                  categoryPriceOptionLabels={getCategoryPriceOptionLabels(selectedCategory.id)}
                  canManageTimeSales={canManageTimeSales}
                  canManageCategoryPriceColumns={canManageCategoryPriceColumns}
                  supportsPriceDisplayMode={supportsPriceDisplayMode}
                  supportsPriceNote={supportsPriceNote}
                  supportsPriceNoteWithPriceColumns={supportsPriceNoteWithPriceColumns}
                  priceDisplayMode={priceDisplayModeDraft}
                  onPriceDisplayModeChange={updatePriceDisplayModeDraft}
                  timeSaleOwnerItemId={timeSaleOwnerItemId}
                  timeSaleItemId={editingItemId}
                  draftOnly
                  draftItem={editingItemId ? pendingItemDrafts[editingItemId] : undefined}
                  draftName={editingItemId ? pendingItemDrafts[editingItemId]?.name : undefined}
                  onDraftNameChange={(name) => {
                    if (editingItemId) updatePendingItemDraft(editingItemId, { name });
                  }}
                  onDraftItemChange={(patch) => {
                    if (editingItemId) updatePendingItemDraft(editingItemId, patch);
                  }}
                  onDraftCommit={(patch) => {
                    if (editingItemId) commitPendingItemDraft(editingItemId, patch);
                  }}
                  onDraftCommitMessageClear={() => setItemDraftFeedback("")}
                  onCancel={() => {
                    if (editingItemId) cancelPendingItemDraft(editingItemId);
                  }}
                />
                {itemDraftFeedback && (
                  <p className="mt-3 rounded-lg bg-emerald-50 px-4 py-3 text-right text-xs font-bold leading-relaxed text-emerald-700">
                    {itemDraftFeedback}
                  </p>
                )}
              </div>
            ) : editingItemId && selectedEditingItem ? (
              <div>
                <MenuItemCard
                  key={selectedEditingItem.id}
                  menuId={menuId}
                  categories={categoriesForPage}
                  item={selectedEditingItem}
                  draftItem={pendingItemDrafts[selectedEditingItem.id] ?? itemBasicDrafts[selectedEditingItem.id]}
                  committedDraftItem={itemBasicDrafts[selectedEditingItem.id]}
                  onDraftItemChange={(patch) => updatePendingItemDraft(selectedEditingItem.id, patch)}
                  onDraftCommit={(patch) => commitPendingItemDraft(selectedEditingItem.id, patch)}
                  onDraftCommitMessageClear={() => setItemDraftFeedback("")}
                  draftOnly
                  priceOptions={priceOptions.filter((option) => option.menu_item_id === selectedEditingItem.id)}
                  categoryPriceOptionLabels={getCategoryPriceOptionLabels(selectedEditingItem.category_id ?? "")}
                  traits={traits.filter((trait) => trait.menu_item_id === selectedEditingItem.id)}
                  capabilities={capabilities}
                  canManageTimeSales={canManageTimeSales}
                  canManageCategoryPriceColumns={canManageCategoryPriceColumns}
                  supportsPriceDisplayMode={supportsPriceDisplayMode}
                  supportsPriceNote={supportsPriceNote}
                  supportsPriceNoteWithPriceColumns={supportsPriceNoteWithPriceColumns}
                  priceDisplayMode={priceDisplayModeDraft}
                  onPriceDisplayModeChange={updatePriceDisplayModeDraft}
                  timeSaleOwnerItemId={timeSaleOwnerItemId}
                  timeSaleItemId={selectedEditingItem.id}
                  aiDescriptionUsage={localAiDescriptionUsage}
                  onAiDescriptionUsageChange={setLocalAiDescriptionUsage}
                  badgeStyles={badgeStyles}
                  labels={labels}
                  isEditing
                  cancelLabel={itemEditorEntryMode === "edit" ? "취소" : "목록으로"}
                  isConfirmingDelete={confirmingDeleteKey === `item:${selectedEditingItem.id}`}
                  onEdit={() => startEditItem(selectedEditingItem.id)}
                  onCancel={resetModes}
                  onCancelDelete={() => setConfirmingDeleteKey("")}
                  onRequestDelete={() => startConfirmDelete(`item:${selectedEditingItem.id}`)}
                  onConfirmDelete={() => deleteItemDraft(selectedEditingItem.id)}
                  onCopy={() => copyItemDraft(selectedEditingItem.id)}
                />
                {itemDraftFeedback && (
                  <p className="mt-3 rounded-lg bg-emerald-50 px-4 py-3 text-right text-xs font-bold leading-relaxed text-emerald-700">
                    {itemDraftFeedback}
                  </p>
                )}
              </div>
            ) : selectedCategory ? (
              <div>
                <PanelHeader
                  eyebrow="Group Detail"
                  title={selectedCategory.name}
                  description={`${labels.categoryLabel} 정보를 확인하고, 이 그룹의 ${labels.itemPluralLabel}을 관리합니다.`}
                />
                <div className="grid gap-4 rounded-lg border border-zinc-100 bg-zinc-50 p-5 md:grid-cols-2">
                  <DetailValue label={`${labels.categoryLabel} 이름`}>{selectedCategory.name}</DetailValue>
                  {canManagePages && selectedPage && <DetailValue label="연결 페이지 이름">{getMenuPageTitle(selectedPage)}</DetailValue>}
                  <DetailValue label="정렬 순서">{selectedCategory.sort_order}</DetailValue>
                  {capabilities.categoryDescription && <DetailValue label="설명 표시">{selectedCategory.description_visible ? "사용함" : "사용 안 함"}</DetailValue>}
                  <DetailValue label="메뉴판 표시">{selectedCategory.visible ? "표시" : "숨김"}</DetailValue>
                  {usesLegacyCategoryPriceOptionColumns && (
                    <DetailValue label="가격 옵션 열">{getCategoryPriceOptionLabels(selectedCategory.id).join(" / ") || "입력 전"}</DetailValue>
                  )}
                  {capabilities.categoryDescription && (
                    <div className="md:col-span-2">
                      <DetailValue label={`${labels.categoryLabel} 설명`}>{selectedCategory.description}</DetailValue>
                    </div>
                  )}
                </div>
                {selectedCategoryDisplayQualityNotice ? (
                  <div className="mt-4">
                    <DisplayMenuCategoryQualityNoticeBox notice={selectedCategoryDisplayQualityNotice} />
                  </div>
                ) : null}
                <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={startCreateItem}
                    disabled={reachedItemLimit}
                    title={
                      reachedItemsPerCategoryLimit
                        ? `이 ${labels.categoryLabel}에는 ${labels.itemLabel}을 최대 ${MENU_LIMITS.maxItemsPerCategory}개까지 추가할 수 있습니다.`
                        : reachedItemsPerSiteLimit
                        ? `한 메뉴판에는 ${labels.itemLabel}을 최대 ${MENU_LIMITS.maxItemsPerSite}개까지 등록할 수 있습니다.`
                        : undefined
                    }
                    className="mr-auto rounded-full border border-zinc-200 bg-zinc-950 px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
                  >
                    + {labels.itemLabel} 추가
                  </button>
                  <button type="button" onClick={() => startEditCategory(selectedCategory.id)} className="rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-bold text-zinc-700">
                    수정
                  </button>
                  <button
                    type="button"
                    onClick={() => copyCategoryDraft(selectedCategory.id)}
                    disabled={reachedCategoryLimit || reachedItemsPerSiteLimit}
                    title={
                      reachedCategoryLimit
                        ? `${canManagePages ? `이 ${labels.pageLabel}` : "이 메뉴판"}에는 ${labels.categoryLabel}을 최대 ${MENU_LIMITS.maxCategoriesPerPage}개까지 추가할 수 있습니다.`
                        : reachedItemsPerSiteLimit
                        ? `한 메뉴판에는 ${labels.itemLabel}을 최대 ${MENU_LIMITS.maxItemsPerSite}개까지 등록할 수 있습니다.`
                        : undefined
                    }
                    className="rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-bold text-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
                  >
                    복사
                  </button>
                  <DraftDeleteConfirmButton
                    title={`${labels.categoryLabel}을 삭제할까요?`}
                    description={`이 ${labels.categoryLabel}에 포함된 ${labels.itemLabel}도 함께 삭제됩니다. 저장 전까지 실제 데이터에는 반영되지 않습니다.`}
                    isConfirming={confirmingDeleteKey === `category:${selectedCategory.id}`}
                    onRequestConfirm={() => startConfirmDelete(`category:${selectedCategory.id}`)}
                    onConfirm={() => deleteCategoryDraft(selectedCategory.id)}
                    onCancel={() => setConfirmingDeleteKey("")}
                  />
                </div>
                {categoryDraftFeedback && (
                  <p className="mt-3 rounded-lg bg-emerald-50 px-4 py-3 text-right text-xs font-bold leading-relaxed text-emerald-700">
                    {categoryDraftFeedback}
                  </p>
                )}
                {(reachedCategoryLimit || reachedItemsPerSiteLimit) && (
                  <p className="mt-3 rounded-lg bg-zinc-50 px-4 py-3 text-right text-xs font-bold leading-relaxed text-zinc-400">
                    {reachedCategoryLimit
                      ? `${canManagePages ? `이 ${labels.pageLabel}` : "이 메뉴판"}에는 ${labels.categoryLabel}을 최대 ${MENU_LIMITS.maxCategoriesPerPage}개까지 추가할 수 있습니다.`
                      : `한 메뉴판에는 ${labels.itemLabel}을 최대 ${MENU_LIMITS.maxItemsPerSite}개까지 등록할 수 있습니다.`}
                  </p>
                )}
                {itemsForCategory.length > 0 && (
                  <div className="mt-8 border-t border-zinc-100 pt-6">
                    <h3 className="text-base font-black text-zinc-950">등록된 {labels.itemPluralLabel}</h3>
                    <div className="mt-4 grid gap-3">
                      {itemsForCategory.map((item) => (
                        <MenuItemCard
                          key={item.id}
                          menuId={menuId}
                          categories={categoriesForPage}
                          item={item}
                          draftItem={itemBasicDrafts[item.id]}
                          committedDraftItem={itemBasicDrafts[item.id]}
                          onDraftItemChange={(patch) => updatePendingItemDraft(item.id, patch)}
                          onDraftCommit={(patch) => commitPendingItemDraft(item.id, patch)}
                          draftOnly
                          priceOptions={priceOptions.filter((option) => option.menu_item_id === item.id)}
                          categoryPriceOptionLabels={getCategoryPriceOptionLabels(item.category_id ?? "")}
                          traits={traits.filter((trait) => trait.menu_item_id === item.id)}
                          capabilities={capabilities}
                          canManageTimeSales={canManageTimeSales}
                          canManageCategoryPriceColumns={canManageCategoryPriceColumns}
                          supportsPriceDisplayMode={supportsPriceDisplayMode}
                          supportsPriceNote={supportsPriceNote}
                          supportsPriceNoteWithPriceColumns={supportsPriceNoteWithPriceColumns}
                          priceDisplayMode={priceDisplayModeDraft}
                          onPriceDisplayModeChange={updatePriceDisplayModeDraft}
                          timeSaleOwnerItemId={timeSaleOwnerItemId}
                          timeSaleItemId={item.id}
                          aiDescriptionUsage={localAiDescriptionUsage}
                          onAiDescriptionUsageChange={setLocalAiDescriptionUsage}
                          badgeStyles={badgeStyles}
                          labels={labels}
                          cancelLabel="목록으로"
                          isEditing={false}
                          isConfirmingDelete={confirmingDeleteKey === `item:${item.id}`}
                          onEdit={() => startEditItem(item.id)}
                          onCancel={resetModes}
                          onCancelDelete={() => setConfirmingDeleteKey("")}
                          onRequestDelete={() => startConfirmDelete(`item:${item.id}`)}
                          onConfirmDelete={() => deleteItemDraft(item.id)}
                          onCopy={() => copyItemDraft(item.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : canManagePages && selectedPage ? (
              <div>
                <PanelHeader
                  eyebrow="Page Detail"
                  title={
                    selectedPageIsPromotion ? (
                      <span className="inline-flex min-w-0 items-center gap-2">
                        <span className="min-w-0 truncate">{getMenuPageTitle(selectedPage)}</span>
                        <HelpTooltip label="프로모션 페이지 도움말">
                          <PromotionPageHelpText />
                        </HelpTooltip>
                      </span>
                    ) : (
                      getMenuPageTitle(selectedPage)
                    )
                  }
                  description={`${labels.pageLabel} 정보를 확인합니다.`}
                />
                <div className="grid gap-4 rounded-lg border border-zinc-100 bg-zinc-50 p-5 md:grid-cols-2">
                  <DetailValue label="페이지 이름">{selectedPage.title}</DetailValue>
                  {canConfigureDisplayPages && (
                    <>
                      <DetailValue label="페이지 유형">{getDisplayPageTypeLabel(selectedPageDisplaySettings.pageType)}</DetailValue>
                      {selectedPageDisplaySettings.pageType === "menu" && selectedPageDisplaySettings.menuLayoutType && (
                        <DetailValue label="화면 구성">{getDisplayMenuLayoutTypeLabel(selectedPageDisplaySettings.menuLayoutType)}</DetailValue>
                      )}
                    </>
                  )}
                  <DetailValue label={`${labels.categoryLabel} 수`}>{categoriesForPage.length}개</DetailValue>
                  <DetailValue label={`${labels.itemLabel} 수`}>{draftedItems.filter((item) => categoriesForPage.some((category) => category.id === item.category_id)).length}개</DetailValue>
                  <DetailValue label="정렬 순서">{selectedPage.sort_order}</DetailValue>
                  {capabilities.pageDescription && (
                    <>
                      <DetailValue label="설명 표시">{selectedPage.description_visible ? "사용함" : "사용 안 함"}</DetailValue>
                      <div className="md:col-span-2">
                        <DetailValue label="페이지 설명">{selectedPage.description}</DetailValue>
                      </div>
                    </>
                  )}
                </div>
                {selectedPageDisplayQualityNotice ? (
                  <div className="mt-4">
                    <DisplayMenuQualityNoticeBox notice={selectedPageDisplayQualityNotice} />
                  </div>
                ) : null}
                <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
                  {!selectedPageIsPromotion && (
                    <button
                      type="button"
                      onClick={startCreateCategory}
                      disabled={reachedCategoryLimit}
                      title={
                        reachedCategoryLimit
                          ? `이 ${labels.pageLabel}에는 ${labels.categoryLabel}을 최대 ${MENU_LIMITS.maxCategoriesPerPage}개까지 추가할 수 있습니다.`
                          : undefined
                      }
                      className="mr-auto rounded-full border border-zinc-200 bg-zinc-950 px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
                    >
                      + {labels.categoryLabel} 추가
                    </button>
                  )}
                  <button type="button" onClick={() => startEditPage(selectedPage.id)} className="rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-bold text-zinc-700">
                    수정
                  </button>
                  <button
                    type="button"
                    onClick={() => copyPageDraft(selectedPage.id)}
                    disabled={Boolean(selectedPageCopyDisabledReason)}
                    className="rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-bold text-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
                    title={selectedPageCopyDisabledReason || undefined}
                  >
                    복사
                  </button>
                  <DraftDeleteConfirmButton
                    title={`${labels.pageLabel}를 삭제할까요?`}
                    description={`이 페이지에 포함된 ${labels.categoryLabel}과 ${labels.itemLabel}도 함께 삭제됩니다. 저장 전까지 실제 데이터에는 반영되지 않습니다.`}
                    disabledReason={sortedPages.length <= 1 ? `최소 1개의 ${labels.pageLabel}는 필요합니다.` : undefined}
                    isConfirming={confirmingDeleteKey === `page:${selectedPage.id}`}
                    onRequestConfirm={() => startConfirmDelete(`page:${selectedPage.id}`)}
                    onConfirm={() => deletePageDraft(selectedPage.id)}
                    onCancel={() => setConfirmingDeleteKey("")}
                  />
                </div>
                {selectedPageCopyDisabledReason && (
                  <p className="mt-3 rounded-lg bg-zinc-50 px-4 py-3 text-right text-xs font-bold leading-relaxed text-zinc-400">
                    {selectedPageCopyDisabledReason}
                  </p>
                )}
                {pageDraftFeedback && (
                  <p className="mt-3 rounded-lg bg-emerald-50 px-4 py-3 text-right text-xs font-bold leading-relaxed text-emerald-700">
                    {pageDraftFeedback}
                  </p>
                )}
              </div>
            ) : !canManagePages && selectedPage ? (
              <EmptyState>
                {categoriesForPage.length > 0
                  ? `왼쪽에서 ${labels.categoryLabel} 또는 ${labels.itemLabel}을 선택해 수정할 수 있습니다.`
                  : `${labels.categoryLabel}을 추가해 메뉴를 구성해 주세요.`}
              </EmptyState>
            ) : (
              <EmptyState>{labels.pageLabel}를 선택하거나 새로 추가해주세요.</EmptyState>
            )}
          </section>
        </div>
        <div className="mt-6">
          <form action={saveMenuManagementBasicDraftAction}>
            <HiddenMenuId menuId={menuId} />
            <input type="hidden" name="page_basic_drafts" value={pageBasicDraftPayload} />
            <input type="hidden" name="category_basic_drafts" value={categoryBasicDraftPayload} />
            <input type="hidden" name="item_basic_drafts" value={itemBasicDraftPayload} />
            <input type="hidden" name="deleted_page_ids" value={deletedPageIdsPayload} />
            <input type="hidden" name="deleted_category_ids" value={deletedCategoryIdsPayload} />
            <input type="hidden" name="deleted_item_ids" value={deletedItemIdsPayload} />
            {canConfigurePcTabletLayoutMode && (
              <input type="hidden" name="pc_tablet_layout_mode" value={pcTabletLayoutModeDraft} />
            )}
            {supportsPriceDisplayMode && (
              <input type="hidden" name="price_display_mode" value={priceDisplayModeDraft} />
            )}
            {selectedPageDisplayQualityNotice ? (
              <div className="mb-4">
                <DisplayMenuQualityNoticeBox notice={selectedPageDisplayQualityNotice} />
              </div>
            ) : null}
            <FinalActionRow>
              <button
                type="button"
                onClick={() => setIsSampleResetConfirming(true)}
                disabled={Boolean(sampleResetDisabledReason)}
                title={sampleResetDisabledReason || undefined}
                className="inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 px-5 py-3 text-sm font-bold text-zinc-700 transition-colors hover:border-zinc-400 hover:bg-white hover:text-zinc-950 disabled:cursor-not-allowed disabled:border-zinc-200 disabled:bg-zinc-100 disabled:text-zinc-400"
              >
                샘플로 되돌리기
              </button>
              <SubmitButton tone="final" disabled={!menuManagementDirty}>
                저장
              </SubmitButton>
              {finalSaveMessage && !menuManagementDirty && (
                <p className="basis-full break-keep text-center text-xs font-bold leading-relaxed text-emerald-700">
                  {finalSaveMessage}
                </p>
              )}
              {menuFinalSaveError && (
                <p className="basis-full break-keep text-center text-xs font-bold leading-relaxed text-red-600">
                  {menuFinalSaveError}
                </p>
              )}
              {menuManagementDirty && (
                <p className="basis-full break-keep text-center text-xs font-bold leading-relaxed text-zinc-600">
                  아직 저장되지 않은 변경사항이 있습니다. 저장을 눌러야 미리보기와 공개 메뉴판에 반영됩니다.
                </p>
              )}
            </FinalActionRow>
          </form>
        </div>
        {isMenuCleanupOpen && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-zinc-950/35 p-4">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="menu-cleanup-title"
              className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-zinc-100 bg-white p-6 shadow-xl"
            >
              <h2 id="menu-cleanup-title" className="break-keep text-xl font-black tracking-tight text-zinc-950">
                AI 메뉴 정리 · 3크레딧
              </h2>
              <p className="mt-3 break-keep text-sm font-bold leading-relaxed text-zinc-500">
                메뉴 이름, 가격, 설명을 자유롭게 붙여넣으면 AI가 카테고리와 메뉴 아이템으로 정리합니다.
              </p>
              <p className="mt-2 break-keep text-xs font-bold leading-relaxed text-zinc-400">
                AI 결과물은 참고용 초안입니다. 공개 전 실제 메뉴 정보와 일치하는지 직접 확인하고, 주민등록번호, 카드번호, 계좌번호, 민감정보, 제3자의 개인정보는 입력하지 마세요.
              </p>
              <div className="mt-4 max-w-sm">
                <AiUsageMeter label="AI 메뉴 정리" used={localAiMenuCleanupUsage.used} limit={localAiMenuCleanupUsage.limit} compact />
              </div>
              <div className="mt-5">
                <FieldLabel>메뉴 내용</FieldLabel>
                <textarea
                  value={menuCleanupText}
                  maxLength={4000}
                  disabled={isMenuCleanupRunning}
                  placeholder={`아메리카노 4,500원\n카페라떼 5,000원\n바닐라라떼 5,500원\n레몬에이드 6,000원\n바스크 치즈케이크 6,500원\n\n또는:\n커피: 아메리카노 4500, 라떼 5000\n디저트: 치즈케이크 6500, 티라미수 7000`}
                  onChange={(event) => setMenuCleanupText(event.target.value)}
                  className="mt-2 min-h-48 w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold leading-relaxed text-zinc-900 outline-none transition focus:border-zinc-950 disabled:bg-zinc-100 disabled:text-zinc-400"
                />
                <div className="mt-2 flex items-start justify-between gap-3 text-xs font-bold leading-relaxed text-zinc-400">
                  <span>입력 내용은 4,000자 이하로 정리해주세요.</span>
                  <span className="shrink-0">{menuCleanupText.length} / 4000</span>
                </div>
              </div>

              {menuCleanupResult ? (
                <div className="mt-6 rounded-lg border border-zinc-100 bg-zinc-50 p-4">
                  <h3 className="text-sm font-black text-zinc-950">정리 결과 미리보기</h3>
                  <div className="mt-4 space-y-4">
                    {menuCleanupResult.categories.map((category, categoryIndex) => (
                      <div key={`${category.name}-${categoryIndex}`} className="rounded-lg border border-zinc-100 bg-white p-4">
                        <p className="text-sm font-black text-zinc-950">{category.name}</p>
                        {category.description ? <p className="mt-1 break-keep text-xs font-bold leading-relaxed text-zinc-500">{category.description}</p> : null}
                        <div className="mt-3 space-y-2">
                          {category.items.map((item, itemIndex) => (
                            <div key={`${item.name}-${itemIndex}`} className="rounded-lg bg-zinc-50 px-3 py-2">
                              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                                <p className="min-w-0 break-keep text-sm font-bold text-zinc-900">{item.name}</p>
                                <p className="shrink-0 text-xs font-black text-zinc-500">
                                  / {item.price_label || (item.price == null ? "문의" : `${new Intl.NumberFormat("ko-KR").format(item.price)}원`)}
                                </p>
                              </div>
                              {item.description ? <p className="mt-1 break-keep text-xs font-semibold leading-relaxed text-zinc-500">{item.description}</p> : null}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : isMenuCleanupRunning ? (
                <div className="mt-6 rounded-lg border border-amber-100 bg-amber-50 p-4 text-sm font-bold text-amber-700">
                  <div className="flex items-center gap-2">
                    <LoadingSpinner className="h-4 w-4" />
                    AI가 메뉴 목록을 카테고리와 아이템으로 정리하고 있습니다.
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="h-3 w-2/3 animate-pulse rounded-full bg-amber-100" />
                    <div className="h-3 w-5/6 animate-pulse rounded-full bg-amber-100" />
                    <div className="h-3 w-1/2 animate-pulse rounded-full bg-amber-100" />
                  </div>
                </div>
              ) : null}

              {menuCleanupResult ? (
                <div className="mt-6 rounded-lg border border-zinc-100 bg-white p-4">
                  <h3 className="text-sm font-black text-zinc-950">AI가 정리한 메뉴를 어떻게 적용할까요?</h3>
                  <p className="mt-2 break-keep text-xs font-bold leading-relaxed text-zinc-500">
                    처음 메뉴판을 세팅하는 경우에는 ‘현재 메뉴를 AI 결과로 교체’를 추천합니다. 운영 중 신메뉴를 추가하는 경우에는 ‘현재 메뉴판에 추가’{canManagePages ? " 또는 ‘새 페이지에 추가’" : ""}를 사용할 수 있습니다.
                  </p>
                  {aiMenuCleanupTooManyCategories ? (
                    <p className="mt-3 rounded-lg bg-red-50 px-4 py-3 text-xs font-bold leading-relaxed text-red-700">
                      AI 정리 결과의 카테고리가 {MENU_LIMITS.maxCategoriesPerPage}개를 초과합니다. 입력 내용을 줄이거나 카테고리 수를 줄여 다시 정리해주세요.
                    </p>
                  ) : aiMenuCleanupCurrentPageBlocked ? (
                    <p className="mt-3 rounded-lg bg-amber-50 px-4 py-3 text-xs font-bold leading-relaxed text-amber-700">
                      현재 메뉴판에는 카테고리를 최대 {MENU_LIMITS.maxCategoriesPerPage}개까지 등록할 수 있습니다. 현재 {aiMenuCleanupTargetPageCategoryCount}개가 등록되어 있고, AI 정리 결과 {aiMenuCleanupCategoryCount}개를 추가하면 총 {aiMenuCleanupCurrentPageTotal}개가 됩니다. {canManagePages ? "새 페이지에 추가하거나, 현재 메뉴를 AI 결과로 교체할 수 있습니다." : "현재 메뉴를 AI 결과로 교체할 수 있습니다."}
                    </p>
                  ) : null}
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-4">
                      <p className="text-sm font-black text-zinc-950">현재 메뉴를 AI 결과로 교체</p>
                      <p className="mt-2 break-keep text-xs font-bold leading-relaxed text-zinc-500">
                        샘플 메뉴나 현재 메뉴 구조를 AI가 정리한 결과로 바꿉니다. 저장 전까지 공개 메뉴판에는 반영되지 않습니다.
                      </p>
                    </div>
                    <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-4">
                      <p className="text-sm font-black text-zinc-950">현재 메뉴판에 추가</p>
                      <p className="mt-2 break-keep text-xs font-bold leading-relaxed text-zinc-500">
                        현재 메뉴판은 유지하고, AI가 정리한 카테고리와 아이템을 새 항목으로 추가합니다. 기존 카테고리와 자동으로 합치지 않습니다.
                      </p>
                    </div>
                    {canManagePages && <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-4">
                      <p className="text-sm font-black text-zinc-950">새 페이지에 추가</p>
                      <p className="mt-2 break-keep text-xs font-bold leading-relaxed text-zinc-500">
                        새 페이지를 만들고 AI가 정리한 카테고리와 아이템을 그 아래에 추가합니다. 현재 페이지의 카테고리 수와 합산하지 않습니다.
                      </p>
                    </div>}
                  </div>
                </div>
              ) : null}

              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeMenuCleanupDialog}
                  disabled={isMenuCleanupRunning || Boolean(menuCleanupApplyMode)}
                  className="inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-bold text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
                >
                  취소
                </button>
                {menuCleanupResult ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setMenuCleanupResult(null)}
                      disabled={Boolean(menuCleanupApplyMode)}
                      className="inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-bold text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
                    >
                      다시 정리하기
                    </button>
                    <SubmitButton
                      type="button"
                      tone="final"
                      disabled={!aiMenuCleanupResultFitsOnePage || Boolean(menuCleanupApplyMode)}
                      onClick={() => setIsMenuCleanupReplaceConfirming(true)}
                    >
                      현재 메뉴를 AI 결과로 교체
                    </SubmitButton>
                    <button
                      type="button"
                      onClick={applyAiMenuCleanupAppendResult}
                      disabled={!aiMenuCleanupResultFitsOnePage || aiMenuCleanupCurrentPageBlocked || Boolean(menuCleanupApplyMode)}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-bold text-zinc-700 transition-colors hover:border-zinc-400 hover:text-zinc-950 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
                    >
                      {menuCleanupApplyMode === "append-current" ? (
                        <>
                          <LoadingSpinner className="h-4 w-4" />
                          추가 중...
                        </>
                      ) : (
                        "현재 메뉴판에 추가"
                      )}
                    </button>
                    {canManagePages && <button
                      type="button"
                      onClick={applyAiMenuCleanupNewPageResult}
                      disabled={!aiMenuCleanupResultFitsOnePage || aiMenuCleanupNewPageBlocked || Boolean(menuCleanupApplyMode)}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-bold text-zinc-700 transition-colors hover:border-zinc-400 hover:text-zinc-950 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
                    >
                      {menuCleanupApplyMode === "append-new" ? (
                        <>
                          <LoadingSpinner className="h-4 w-4" />
                          추가 중...
                        </>
                      ) : (
                        "새 페이지에 추가"
                      )}
                    </button>}
                  </>
                ) : (
                  <SubmitButton
                    type="button"
                    tone="final"
                    disabled={isMenuCleanupRunning || localAiMenuCleanupUsage.used >= localAiMenuCleanupUsage.limit}
                    loading={isMenuCleanupRunning}
                    loadingLabel="정리 중..."
                    onClick={() => void runAiMenuCleanup()}
                  >
                    AI로 정리하기
                  </SubmitButton>
                )}
              </div>
              {isMenuCleanupReplaceConfirming ? (
                <div className="fixed inset-0 z-[90] flex items-center justify-center bg-zinc-950/40 px-4">
                  <div className="w-full max-w-md rounded-xl border border-zinc-100 bg-white p-6 shadow-xl">
                    <h3 className="break-keep text-xl font-black tracking-tight text-zinc-950">현재 메뉴를 AI 결과로 교체할까요?</h3>
                    <div className="mt-3 space-y-2 break-keep text-sm font-bold leading-relaxed text-zinc-600">
                      <p>현재 메뉴 관리 탭의 페이지, 카테고리, 메뉴 아이템이 AI가 정리한 결과로 바뀝니다.</p>
                      <p>저장 전까지 미리보기와 공개 메뉴판에는 반영되지 않습니다.</p>
                      <p>저장하지 않고 페이지를 벗어나면 기존 저장 데이터는 유지됩니다.</p>
                    </div>
                    <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                      <button
                        type="button"
                        onClick={() => setIsMenuCleanupReplaceConfirming(false)}
                        disabled={Boolean(menuCleanupApplyMode)}
                        className="inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-bold text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
                      >
                        취소
                      </button>
                      <SubmitButton
                        type="button"
                        tone="danger"
                        loading={menuCleanupApplyMode === "replace"}
                        loadingLabel="교체 중..."
                        onClick={applyAiMenuCleanupReplaceResult}
                      >
                        AI 결과로 교체
                      </SubmitButton>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
        {isSampleResetConfirming && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-zinc-950/35 p-4">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="menu-sample-reset-title"
              className="w-full max-w-md rounded-xl border border-red-100 bg-white p-6 shadow-xl"
            >
              <h2 id="menu-sample-reset-title" className="break-keep text-xl font-black tracking-tight text-zinc-950">
                메뉴 관리 내용을 샘플로 되돌릴까요?
              </h2>
              <div className="mt-3 space-y-2 break-keep text-sm font-bold leading-relaxed text-zinc-600">
                <p>현재 메뉴 관리 탭에서 편집 중인 페이지, 카테고리, 메뉴 아이템 내용이 선택한 템플릿의 샘플 데이터로 바뀝니다.</p>
                <p>저장 전까지 미리보기와 공개 메뉴판에는 반영되지 않습니다.</p>
              </div>
              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setIsSampleResetConfirming(false)}
                  disabled={isSampleResetApplying}
                  className="inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-bold text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
                >
                  취소
                </button>
                <SubmitButton
                  type="button"
                  tone="danger"
                  loading={isSampleResetApplying}
                  loadingLabel="적용 중..."
                  onClick={resetMenuManagementToStarterDraft}
                >
                  샘플로 되돌리기
                </SubmitButton>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function MenuItemCard({
  menuId,
  categories,
  item,
  priceOptions,
  categoryPriceOptionLabels = [],
  traits,
  capabilities,
  canManageTimeSales = false,
  canManageCategoryPriceColumns = false,
  supportsPriceDisplayMode = false,
  supportsPriceNote = false,
  supportsPriceNoteWithPriceColumns = false,
  priceDisplayMode,
  onPriceDisplayModeChange,
  timeSaleOwnerItemId = null,
  timeSaleItemId,
  aiDescriptionUsage,
  onAiDescriptionUsageChange,
  badgeStyles,
  labels,
  cancelLabel,
  draftItem,
  committedDraftItem,
  onDraftItemChange,
  onDraftCommit,
  onDraftCommitMessageClear,
  draftOnly = false,
  isEditing,
  isConfirmingDelete,
  onEdit,
  onCancel,
  onCancelDelete,
  onRequestDelete,
  onConfirmDelete,
  onCopy,
}: {
  menuId: string;
  categories: MenuCategory[];
  item: MenuItem;
  priceOptions: MenuItemPriceOption[];
  categoryPriceOptionLabels?: string[];
  traits: MenuItemTrait[];
  capabilities: TemplateCapabilities;
  canManageTimeSales?: boolean;
  canManageCategoryPriceColumns?: boolean;
  supportsPriceDisplayMode?: boolean;
  supportsPriceNote?: boolean;
  supportsPriceNoteWithPriceColumns?: boolean;
  priceDisplayMode?: PriceDisplayMode;
  onPriceDisplayModeChange?: (mode: PriceDisplayMode) => void;
  timeSaleOwnerItemId?: string | null;
  timeSaleItemId?: string;
  aiDescriptionUsage: { used: number; limit: number };
  onAiDescriptionUsageChange: (usage: { used: number; limit: number }) => void;
  badgeStyles: BadgeStyles;
  labels: TemplateEditorLabels;
  cancelLabel: string;
  draftItem?: ItemBasicDraft;
  committedDraftItem?: ItemBasicDraft;
  onDraftItemChange?: (patch: Partial<ItemBasicDraft>) => void;
  onDraftCommit?: (patch?: Partial<ItemBasicDraft>) => void;
  onDraftCommitMessageClear?: () => void;
  draftOnly?: boolean;
  isEditing: boolean;
  isConfirmingDelete: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onCancelDelete: () => void;
  onRequestDelete: () => void;
  onConfirmDelete: () => void;
  onCopy: (draftPatch?: Partial<ItemBasicDraft>) => void;
}) {
  const badgeLabel = capabilities.itemBadges ? getMenuItemBadgeLabel(item) : null;
  const badgeStyle = badgeLabel ? badgeStyles[getBadgeStyleKey(item)] : null;
  const usesFixedBadgePreviewStyle = capabilities.itemBadgeColorControl === false;
  const price = formatMenuPrice(item);
  const portion = capabilities.itemPortionLabel ? formatPortionLabel(item) : "";
  const priceOptionText = capabilities.priceOptions ? priceOptionSummary(priceOptions, capabilities.maxPriceOptionsPerItem) : "";
  const traitText = capabilities.itemTraits ? traitSummary(traits) : "";
  const [priceMode, setPriceMode] = useState<PriceMode>(
    draftItem?.priceMode ?? (capabilities.priceOptions && priceOptions.some((option) => option.visible) ? "options" : "single")
  );
  const isCopiedDraftItem =
    item.id.startsWith("temp-item-copy-") ||
    item.id.startsWith("temp-item-category-copy-") ||
    item.id.startsWith("temp-item-page-copy-");

  return (
    <article className={isEditing ? "fixed inset-0 z-50 overflow-y-auto bg-white p-5 lg:static lg:rounded-lg lg:border lg:border-zinc-100 lg:p-5" : "rounded-lg border border-zinc-100 p-4"}>
      {isEditing ? (
        <>
          <div className="mb-4 min-w-0 border-b border-zinc-100 pb-4">
            <h4 className="mt-1 line-clamp-2 break-words text-2xl font-bold">{labels.itemLabel} 수정</h4>
            <button type="button" onClick={onCancel} className="mt-3 inline-flex rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-bold text-zinc-700 lg:hidden">
              {isCopiedDraftItem ? "목록으로" : cancelLabel}
            </button>
          </div>
          <MenuItemForm
            menuId={menuId}
            categories={categories}
            capabilities={capabilities}
            aiDescriptionUsage={aiDescriptionUsage}
            onAiDescriptionUsageChange={onAiDescriptionUsageChange}
            badgeStyles={badgeStyles}
            labels={labels}
            item={item}
            draftItem={draftItem}
            committedDraftItem={committedDraftItem}
            categoryPriceOptionLabels={categoryPriceOptionLabels}
            onDraftItemChange={onDraftItemChange}
            onDraftCommit={onDraftCommit}
            onDraftCommitMessageClear={onDraftCommitMessageClear}
            onDraftCopy={onCopy}
            draftOnly={draftOnly}
            itemCount={0}
            selectedCategoryId={item.category_id ?? ""}
            priceOptions={priceOptions}
            traits={traits}
            priceMode={priceMode}
            onPriceModeChange={setPriceMode}
            canManageTimeSales={canManageTimeSales}
            canManageCategoryPriceColumns={canManageCategoryPriceColumns}
            supportsPriceDisplayMode={supportsPriceDisplayMode}
            supportsPriceNote={supportsPriceNote}
            supportsPriceNoteWithPriceColumns={supportsPriceNoteWithPriceColumns}
            priceDisplayMode={priceDisplayMode}
            onPriceDisplayModeChange={onPriceDisplayModeChange}
            timeSaleOwnerItemId={timeSaleOwnerItemId}
            timeSaleItemId={timeSaleItemId ?? item.id}
            onCancel={onCancel}
            cancelLabel={isCopiedDraftItem ? "목록으로" : cancelLabel}
            deleteAction={
              <DraftDeleteConfirmButton
                title={isCopiedDraftItem ? "이 복사본을 삭제할까요?" : `이 ${labels.itemLabel}을 삭제할까요?`}
                description={
                  isCopiedDraftItem
                    ? "삭제해도 하단의 저장을 누르기 전까지 공개 메뉴판에는 반영되지 않습니다."
                    : labels.itemLabel === "서비스"
                    ? "저장을 누르기 전까지는 실제 가격표에 반영되지 않습니다."
                    : "저장을 누르기 전까지는 실제 메뉴판에 반영되지 않습니다."
                }
                isConfirming={isConfirmingDelete}
                onRequestConfirm={onRequestDelete}
                onConfirm={onConfirmDelete}
                onCancel={onCancelDelete}
              />
            }
            cancelHelperText={
              isCopiedDraftItem
                ? "목록으로 돌아가도 복사본은 삭제되지 않습니다. 복사본을 없애려면 삭제 버튼을 사용해주세요."
                : undefined
            }
          />
        </>
      ) : (
      <div className="flex min-w-0 flex-col justify-between gap-3 md:flex-row md:items-start">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h3 className="min-w-0 max-w-full truncate text-base font-black text-zinc-950">{item.name}</h3>
            {badgeLabel && badgeStyle && (
              <span
                className={
                  usesFixedBadgePreviewStyle
                    ? "max-w-full truncate rounded-full border border-zinc-950 bg-white px-2.5 py-0.5 text-[11px] font-black uppercase tracking-[0.04em] text-zinc-950"
                    : "max-w-full truncate rounded-full px-3 py-1 text-xs font-bold"
                }
                style={usesFixedBadgePreviewStyle ? undefined : getBadgeStyleCss(badgeStyle)}
              >
                {badgeLabel}
              </span>
            )}
            {!item.visible && <span className="shrink-0 rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-500">숨김</span>}
          </div>
          <p className="mt-1 break-words text-sm font-semibold text-zinc-600">
            {[portion, priceOptionText || price, item.recommended ? "추천" : null].filter(Boolean).join(" · ") || "표시 정보 없음"}
          </p>
          {traitText && <p className="mt-2 break-words text-xs font-bold text-zinc-400">{traitText}</p>}
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-3">
          <button type="button" onClick={onEdit} className="rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-bold text-zinc-700">
            수정
          </button>
          <SubmitButton type="button" tone="light" onClick={() => onCopy()}>
            복사
          </SubmitButton>
          <DraftDeleteConfirmButton
            title={`이 ${labels.itemLabel}을 삭제할까요?`}
            description={labels.itemLabel === "서비스" ? "저장을 누르기 전까지는 실제 가격표에 반영되지 않습니다." : "저장을 누르기 전까지는 실제 메뉴판에 반영되지 않습니다."}
            isConfirming={isConfirmingDelete}
            onRequestConfirm={onRequestDelete}
            onConfirm={onConfirmDelete}
            onCancel={onCancelDelete}
          />
        </div>
      </div>
      )}
    </article>
  );
}

function MenuItemTraitSlots({
  formId,
  traits,
  draftTraits,
  onTraitLabelChange,
}: {
  formId: string;
  traits: MenuItemTrait[];
  draftTraits?: ItemTraitDraft[];
  onTraitLabelChange?: (index: number, value: string) => void;
}) {
  const orderedTraits = draftTraits?.length ? [...draftTraits].sort((a, b) => a.sortOrder - b.sortOrder) : toItemTraitDrafts(traits);
  const slots = Array.from({ length: MENU_LIMITS.maxTraitsPerItem }, (_, index) => orderedTraits[index] ?? null);
  const [slotLabelValues, setSlotLabelValues] = useState(() => slots.map((trait) => trait?.label ?? ""));

  function handleSlotLabelChange(index: number, value: string) {
    setSlotLabelValues((currentValues) => {
      const nextValues = [...currentValues];
      nextValues[index] = value;
      return nextValues;
    });
    onTraitLabelChange?.(index, value);
  }

  return (
    <div className="mt-4 grid gap-3">
      <p className="break-keep text-xs font-semibold leading-relaxed text-zinc-500">
        지표명을 비워두면 저장하지 않습니다. 강도는 1/5부터 5/5까지 선택할 수 있습니다.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {slots.map((trait, index) => {
          const slotNumber = index + 1;
          const slotLabel = slotLabelValues[index] ?? "";
          const hasSlotLabel = Boolean(slotLabel.trim());

          return (
            <div key={slotNumber} className="rounded-lg border border-zinc-100 bg-zinc-50 p-4">
              <input type="hidden" name={`trait_slot_${index}_id`} value={trait?.id ?? ""} form={formId} />
              <input type="hidden" name={`trait_slot_${index}_sort_order`} value={index} form={formId} />
              <div className="flex items-center justify-between gap-3">
                <h5 className="text-sm font-black text-zinc-950">지표 {slotNumber}</h5>
                <SwitchField
                  name={`trait_slot_${index}_visible`}
                  form={formId}
                  label="표시"
                  defaultChecked={Boolean((trait?.visible ?? false) && hasSlotLabel)}
                  canTurnOn={hasSlotLabel}
                  blockedMessage="지표명을 먼저 입력해주세요."
                  onText="표시 중"
                  offText="숨김"
                />
              </div>
              <div className="mt-4 grid gap-3">
                <div>
                  <FieldLabel>지표명</FieldLabel>
                  <TextInput
                    name={`trait_slot_${index}_label`}
                    form={formId}
                    defaultValue={trait?.label ?? ""}
                    placeholder={index === 0 ? "산미" : "고소함"}
                    maxLength={MENU_FIELD_LIMITS.menuItemTraits.label}
                    helperText="예: 산미, 바디감, 단맛, 고소함, 진함, 부드러움"
                    onChange={(event) => handleSlotLabelChange(index, event.target.value)}
                  />
                </div>
                <div>
                  <FieldLabel>강도 1~5</FieldLabel>
                  <Select name={`trait_slot_${index}_value`} form={formId} defaultValue={String(trait?.value ?? MENU_FIELD_LIMITS.menuItemTraits.minValue)}>
                    {[1, 2, 3, 4, 5].map((value) => (
                      <option key={value} value={value}>
                        {value}/5
                      </option>
                    ))}
                  </Select>
                  <p className="mt-2 break-keep text-xs font-bold leading-relaxed text-zinc-400">값이 높을수록 특징이 강하게 표시됩니다.</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {traits.length > MENU_LIMITS.maxTraitsPerItem && (
        <p className="break-keep text-xs font-bold leading-relaxed text-amber-700">
          기존 지표가 {MENU_LIMITS.maxTraitsPerItem}개를 초과해도 삭제하지 않습니다. 편집 화면과 공개 메뉴판에는 정렬순서 기준 앞 {MENU_LIMITS.maxTraitsPerItem}개만 사용됩니다.
        </p>
      )}
    </div>
  );
}
