import {
  MAX_MENU_WIDGETS_PER_PAGE,
  validateMenuWidgetDraft,
  type MenuWidgetDraft,
} from "@/lib/menu-widgets";
import type {
  StarterFeaturedSlide,
  StarterItem,
  StarterMixedContentBlock,
  StarterPreset,
  StarterTimeSale,
  StarterWidget,
} from "@/lib/menu-starter-presets";
import type {
  MenuEditorContentBlockDraft,
  MenuEditorContentBlockDraftsByPageId,
} from "@/lib/menu-widget-editor-draft";
import type { TimeSaleDisplayMode } from "@/lib/menu-time-sales";
import {
  DEFAULT_TIME_SALE_BADGE_BACKGROUND_COLOR,
  DEFAULT_TIME_SALE_BADGE_TEXT,
  DEFAULT_TIME_SALE_DISPLAY_MODE,
  TIME_SALE_TIMEZONE,
} from "@/lib/menu-time-sales";
import { normalizeTimeSaleScheduleType, type TimeSaleScheduleType } from "@/lib/menu-time-sale-schedule";

export type CafeAStarterResetIdKind =
  | "page"
  | "category"
  | "priceColumn"
  | "item"
  | "itemPriceColumnValue"
  | "widget";

export type CafeAStarterResetIdFactory = (kind: CafeAStarterResetIdKind, key: string, index: number) => string;

export type CafeAStarterResetPersistedIds = {
  pageIds?: readonly string[];
  categoryIds?: readonly string[];
  itemIds?: readonly string[];
  widgetIds?: readonly string[];
};

export type CafeAStarterResetPageDraft = {
  presetKey: string;
  id: string;
  title: string;
  description: string;
  descriptionVisible: boolean;
  visible: boolean;
  sortOrder: number;
};

export type CafeAStarterResetCategoryDraft = {
  presetKey: string;
  id: string;
  pageId: string;
  name: string;
  description: string;
  descriptionVisible: boolean;
  visible: boolean;
  sortOrder: number;
  priceColumns: CafeAStarterResetCategoryPriceColumnDraft[];
};

export type CafeAStarterResetCategoryPriceColumnDraft = {
  presetKey: string;
  id: string;
  categoryId: string;
  key: string;
  label: string;
  visible: boolean;
  sortOrder: number;
};

export type CafeAStarterResetItemDraft = {
  presetKey: string;
  id: string;
  categoryId: string;
  name: string;
  setName: string;
  description: string;
  originInfo: string;
  price: string;
  priceLabel: string;
  priceNote: string;
  imageUrl: string | null;
  imagePath: string | null;
  imageAction: "keep";
  badgeLabel: string;
  visible: boolean;
  sortOrder: number;
  priceVisible: boolean;
  portionLabel: string;
  portionVisible: boolean;
  traitsVisible: boolean;
  isSoldOut: boolean;
  priceColumnValues: CafeAStarterResetItemPriceColumnValueDraft[];
};

export type CafeAStarterResetItemPriceColumnValueDraft = {
  presetKey: string;
  id: string;
  itemId: string;
  priceColumnId: string;
  price: string;
  priceLabel: string;
  visible: boolean;
  sortOrder: number;
};

export type CafeAStarterResetFeaturedSlideDraft = {
  id: string;
  imageUrl: string | null;
  imagePath: string | null;
  featuredItemId: string | null;
  sortOrder: number;
};

export type CafeAStarterResetCoverSettings = {
  menuCoverTitle: string;
  menuCoverDescription: string;
  coverImageUrl: string | null;
  coverImagePath: string | null;
};

export type CafeAStarterResetTimeSaleTargetDraft = {
  itemId: string;
  priceColumnId: string | null;
  normalPrice: number | null;
  salePrice: number;
  salePriceLabel: string | null;
  visible: boolean;
};

export type CafeAStarterResetTimeSaleDraft = {
  presetKey: string;
  name: string;
  ownerItemId: string;
  active: boolean;
  scheduleType: TimeSaleScheduleType;
  startsAt: string;
  endsAt: string;
  dailyStartTime: string | null;
  dailyEndTime: string | null;
  timezone: typeof TIME_SALE_TIMEZONE;
  badgeText: string;
  badgeBackgroundColor: string;
  timeDisplayMode: TimeSaleDisplayMode;
  timeDisplayText: string | null;
  targets: CafeAStarterResetTimeSaleTargetDraft[];
};

export type CafeAStarterResetReferenceMap = {
  page: Record<string, string>;
  category: Record<string, string>;
  item: Record<string, string>;
  priceColumn: Record<string, string>;
  widget: Record<string, string>;
};

export type CafeAStarterResetSnapshot = {
  pages: CafeAStarterResetPageDraft[];
  categories: CafeAStarterResetCategoryDraft[];
  categoryPriceColumns: CafeAStarterResetCategoryPriceColumnDraft[];
  items: CafeAStarterResetItemDraft[];
  itemPriceColumnValues: CafeAStarterResetItemPriceColumnValueDraft[];
  widgets: MenuWidgetDraft[];
  mixedContentOrder: MenuEditorContentBlockDraftsByPageId;
  featuredEnabled: boolean;
  featuredItemId: string | null;
  featuredSlides: CafeAStarterResetFeaturedSlideDraft[];
  coverSettings: CafeAStarterResetCoverSettings;
  timeSales: CafeAStarterResetTimeSaleDraft[];
  deletedPageIds: string[];
  deletedCategoryIds: string[];
  deletedItemIds: string[];
  deletedWidgetIds: string[];
  referenceMap: CafeAStarterResetReferenceMap;
  saveContractGaps: string[];
};

export const CAFE_A_STARTER_RESET_FINAL_SAVE_SOURCE = "cafe_a_starter_reset" as const;
export const CAFE_A_STARTER_RESET_FINAL_SAVE_SCHEMA_VERSION = 1 as const;

export type CafeAStarterResetFinalSavePayload = {
  source: typeof CAFE_A_STARTER_RESET_FINAL_SAVE_SOURCE;
  schemaVersion: typeof CAFE_A_STARTER_RESET_FINAL_SAVE_SCHEMA_VERSION;
  snapshot: CafeAStarterResetSnapshot;
};

export type CafeAStarterResetValidationErrorCode =
  | "MISSING_PAGE"
  | "DUPLICATE_ID"
  | "DUPLICATE_PRESET_KEY"
  | "INVALID_REFERENCE"
  | "INVALID_WIDGET"
  | "TOO_MANY_WIDGETS"
  | "DUPLICATE_CONTENT_BLOCK"
  | "MISSING_CONTENT_BLOCK"
  | "INVALID_SORT_ORDER"
  | "INVALID_VISIBLE"
  | "INVALID_IS_SOLD_OUT"
  | "MIXED_PERSISTED_AND_TEMP_ID"
  | "SAVE_CONTRACT_GAP"
  | "INVALID_FINAL_SAVE_PAYLOAD";

export type CafeAStarterResetValidationError = {
  code: CafeAStarterResetValidationErrorCode;
  field: string;
  message: string;
};

export type CafeAStarterResetValidationResult =
  | { ok: true; errors: [] }
  | { ok: false; errors: CafeAStarterResetValidationError[] };

export type BuildCafeAStarterResetSnapshotArgs = {
  preset: StarterPreset;
  persistedIds?: CafeAStarterResetPersistedIds;
  idFactory?: CafeAStarterResetIdFactory;
  now?: Date;
};

export type BuildCafeAStarterResetSnapshotResult =
  | { ok: true; snapshot: CafeAStarterResetSnapshot; errors: [] }
  | { ok: false; snapshot: null; errors: CafeAStarterResetValidationError[] };

const DEFAULT_PAGE_KEY = "main-menu";

export function buildCafeAStarterResetSnapshot({
  preset,
  persistedIds = {},
  idFactory = defaultStarterResetIdFactory,
  now = new Date(),
}: BuildCafeAStarterResetSnapshotArgs): BuildCafeAStarterResetSnapshotResult {
  const referenceMap: CafeAStarterResetReferenceMap = {
    page: {},
    category: {},
    item: {},
    priceColumn: {},
    widget: {},
  };
  const pageKeyByIndex = new Map<number, string>();
  const categoryKeyByName = new Map<string, string>();
  const itemKeyByName = new Map<string, string>();
  const itemByKey = new Map<string, CafeAStarterResetItemDraft>();
  const itemSourceByKey = new Map<string, StarterItem>();
  const priceColumnByCompositeKey = new Map<string, CafeAStarterResetCategoryPriceColumnDraft>();
  const itemPriceColumnValueByCompositeKey = new Map<string, CafeAStarterResetItemPriceColumnValueDraft>();

  const pages = preset.pages.map((page, pageIndex): CafeAStarterResetPageDraft => {
    const pageKey = getStarterPageKey(page, pageIndex);
    pageKeyByIndex.set(pageIndex, pageKey);
    const id = idFactory("page", pageKey, pageIndex);
    referenceMap.page[pageKey] = id;
    return {
      presetKey: pageKey,
      id,
      title: page.title,
      description: "",
      descriptionVisible: false,
      visible: true,
      sortOrder: pageIndex,
    };
  });

  const categories: CafeAStarterResetCategoryDraft[] = [];
  const items: CafeAStarterResetItemDraft[] = [];
  const sourceValidationErrors = validateStarterPresetSource(preset);

  preset.pages.forEach((page, pageIndex) => {
    const pageKey = pageKeyByIndex.get(pageIndex) ?? DEFAULT_PAGE_KEY;
    const pageId = referenceMap.page[pageKey] ?? "";

    page.categories.forEach((category, categoryIndex) => {
      const categoryKey = getStarterCategoryKey(category, pageKey, categoryIndex);
      const categoryId = idFactory("category", `${pageKey}:${categoryKey}`, categories.length);
      categoryKeyByName.set(category.name, categoryKey);
      referenceMap.category[categoryKey] = categoryId;

      const priceColumns = (category.price_columns ?? []).map((column, columnIndex) => {
        const priceColumnKey = `${categoryKey}:${column.key}`;
        const priceColumn: CafeAStarterResetCategoryPriceColumnDraft = {
          presetKey: priceColumnKey,
          id: idFactory("priceColumn", `${pageKey}:${priceColumnKey}`, columnIndex),
          categoryId,
          key: column.key,
          label: column.label,
          visible: column.visible !== false,
          sortOrder: columnIndex,
        };
        referenceMap.priceColumn[priceColumnKey] = priceColumn.id;
        priceColumnByCompositeKey.set(priceColumnKey, priceColumn);
        return priceColumn;
      });

      categories.push({
        presetKey: categoryKey,
        id: categoryId,
        pageId,
        name: category.name,
        description: category.description ?? "",
        descriptionVisible: Boolean(category.description && (category.description_visible ?? true)),
        visible: true,
        sortOrder: categoryIndex,
        priceColumns,
      });

      category.items.forEach((starterItem, itemIndex) => {
        const itemKey = getStarterItemKey(starterItem, categoryKey, itemIndex);
        const itemId = idFactory("item", `${pageKey}:${categoryKey}:${itemKey}`, items.length);
        itemKeyByName.set(starterItem.name, itemKey);
        referenceMap.item[itemKey] = itemId;

        const priceColumnValues = (starterItem.price_column_values ?? []).flatMap((value, valueIndex) => {
          const priceColumn = priceColumnByCompositeKey.get(`${categoryKey}:${value.key}`);
          if (!priceColumn || value.price == null) return [];
          const draft: CafeAStarterResetItemPriceColumnValueDraft = {
            presetKey: `${itemKey}:${value.key}`,
            id: idFactory("itemPriceColumnValue", `${pageKey}:${categoryKey}:${itemKey}:${value.key}`, valueIndex),
            itemId,
            priceColumnId: priceColumn.id,
            price: String(value.price),
            priceLabel: value.price_label ?? "",
            visible: value.visible !== false,
            sortOrder: valueIndex,
          };
          itemPriceColumnValueByCompositeKey.set(`${itemKey}:${value.key}`, draft);
          return [draft];
        });

        const itemDraft: CafeAStarterResetItemDraft = {
          presetKey: itemKey,
          id: itemId,
          categoryId,
          name: starterItem.name,
          setName: starterItem.set_name ?? "",
          description: starterItem.description ?? "",
          originInfo: "",
          price: String(starterItem.price),
          priceLabel: starterItem.price_label ?? "",
          priceNote: starterItem.price_note ?? "",
          imageUrl: starterItem.image_url ?? null,
          imagePath: null,
          imageAction: "keep",
          badgeLabel: starterItem.badge_label ?? (starterItem.recommended ? "추천" : ""),
          visible: preset.sample_items_visible ?? true,
          sortOrder: itemIndex,
          priceVisible: true,
          portionLabel: starterItem.portion_label ?? "",
          portionVisible: Boolean(starterItem.portion_label),
          traitsVisible: false,
          isSoldOut: starterItem.is_sold_out ?? false,
          priceColumnValues,
        };
        items.push(itemDraft);
        itemByKey.set(itemKey, itemDraft);
        itemSourceByKey.set(itemKey, starterItem);
      });
    });
  });

  const widgets = (preset.widgets ?? []).map((widget, widgetIndex) => {
    const widgetKey = widget.key;
    const pageKey = widget.page_key ?? pages[0]?.presetKey ?? DEFAULT_PAGE_KEY;
    const widgetDraft = createStarterWidgetDraft({
      widget,
      widgetId: idFactory("widget", `${pageKey}:${widgetKey}`, widgetIndex),
      pageId: referenceMap.page[pageKey] ?? "",
      sortOrder: widget.sort_order ?? widgetIndex,
    });
    referenceMap.widget[widgetKey] = widgetDraft.id;
    return widgetDraft;
  });

  const mixedContentOrder = buildStarterMixedContentOrder({
    preset,
    pages,
    categories,
    widgets,
    referenceMap,
  });
  const featuredItemId = resolveFeaturedItemId(preset.featured_item_key, preset.featured_item_name, itemByKey, itemKeyByName);
  const featuredSlides = (preset.featured_slides ?? []).map((slide, slideIndex) =>
    createStarterFeaturedSlideDraft(slide, slideIndex, itemByKey, itemKeyByName)
  );
  const firstCompleteSlide = featuredSlides.find((slide) => Boolean(slide.imageUrl && slide.featuredItemId)) ?? null;
  const coverImageUrl = firstCompleteSlide?.imageUrl ?? preset.site.cover_image_url ?? null;
  const coverImagePath = firstCompleteSlide?.imagePath ?? null;
  const timeSales = buildStarterTimeSales({
    timeSales: preset.time_sales ?? [],
    itemByKey,
    itemKeyByName,
    itemSourceByKey,
    itemPriceColumnValueByCompositeKey,
    now,
  });
  const saveContractGaps = timeSales.flatMap((timeSale) => {
    const targetItemIds = new Set(timeSale.targets.map((target) => target.itemId));
    return targetItemIds.size > 1 ? [`SAVE_CONTRACT_GAP_MULTI_ITEM_TIME_SALE:${timeSale.presetKey}`] : [];
  });

  const snapshot: CafeAStarterResetSnapshot = {
    pages,
    categories,
    categoryPriceColumns: categories.flatMap((category) => category.priceColumns),
    items,
    itemPriceColumnValues: items.flatMap((item) => item.priceColumnValues),
    widgets,
    mixedContentOrder,
    featuredEnabled: Boolean(firstCompleteSlide?.featuredItemId ?? featuredItemId),
    featuredItemId: firstCompleteSlide?.featuredItemId ?? featuredItemId,
    featuredSlides,
    coverSettings: {
      menuCoverTitle: preset.site.menu_cover_title,
      menuCoverDescription: preset.site.menu_cover_description,
      coverImageUrl,
      coverImagePath,
    },
    timeSales,
    deletedPageIds: normalizeStringArray(persistedIds.pageIds),
    deletedCategoryIds: normalizeStringArray(persistedIds.categoryIds),
    deletedItemIds: normalizeStringArray(persistedIds.itemIds),
    deletedWidgetIds: normalizeStringArray(persistedIds.widgetIds),
    referenceMap,
    saveContractGaps,
  };
  const validation = validateCafeAStarterResetSnapshot(snapshot, persistedIds);
  const errors = [...sourceValidationErrors, ...validation.errors];
  return errors.length === 0 ? { ok: true, snapshot, errors: [] } : { ok: false, snapshot: null, errors };
}

export function validateCafeAStarterResetSnapshot(
  snapshot: CafeAStarterResetSnapshot,
  persistedIds: CafeAStarterResetPersistedIds = {},
): CafeAStarterResetValidationResult {
  const errors: CafeAStarterResetValidationError[] = [];
  if (snapshot.pages.length === 0) {
    errors.push(createError("MISSING_PAGE", "pages", "starter reset snapshot에는 페이지가 최소 1개 필요합니다."));
  }

  validateUnique(snapshot.pages.map((page) => page.id), "pages", errors);
  validateUnique(snapshot.categories.map((category) => category.id), "categories", errors);
  validateUnique(snapshot.items.map((item) => item.id), "items", errors);
  validateUnique(snapshot.widgets.map((widget) => widget.id), "widgets", errors);
  validateUnique(snapshot.pages.map((page) => page.presetKey), "pagePresetKeys", errors, "DUPLICATE_PRESET_KEY");
  validateUnique(snapshot.categories.map((category) => category.presetKey), "categoryPresetKeys", errors, "DUPLICATE_PRESET_KEY");
  validateUnique(snapshot.items.map((item) => item.presetKey), "itemPresetKeys", errors, "DUPLICATE_PRESET_KEY");

  const pageIds = new Set(snapshot.pages.map((page) => page.id));
  const categoryIds = new Set(snapshot.categories.map((category) => category.id));
  const itemIds = new Set(snapshot.items.map((item) => item.id));
  const priceColumnIds = new Set(snapshot.categoryPriceColumns.map((column) => column.id));
  const widgetIds = new Set(snapshot.widgets.map((widget) => widget.id));
  const contentBlockRefs = new Set<string>();

  snapshot.categories.forEach((category, index) => {
    if (!pageIds.has(category.pageId)) {
      errors.push(createError("INVALID_REFERENCE", `categories.${index}.pageId`, "카테고리의 페이지 참조가 유효하지 않습니다."));
    }
    validateSortOrder(category.sortOrder, `categories.${index}.sortOrder`, errors);
    validateVisible(category.visible, `categories.${index}.visible`, errors);
    category.priceColumns.forEach((column, columnIndex) => {
      if (column.categoryId !== category.id) {
        errors.push(createError("INVALID_REFERENCE", `categories.${index}.priceColumns.${columnIndex}.categoryId`, "가격 컬럼의 카테고리 참조가 유효하지 않습니다."));
      }
      validateSortOrder(column.sortOrder, `categories.${index}.priceColumns.${columnIndex}.sortOrder`, errors);
      validateVisible(column.visible, `categories.${index}.priceColumns.${columnIndex}.visible`, errors);
    });
  });

  snapshot.items.forEach((item, index) => {
    if (!categoryIds.has(item.categoryId)) {
      errors.push(createError("INVALID_REFERENCE", `items.${index}.categoryId`, "메뉴 아이템의 카테고리 참조가 유효하지 않습니다."));
    }
    if (typeof item.isSoldOut !== "boolean") {
      errors.push(createError("INVALID_IS_SOLD_OUT", `items.${index}.isSoldOut`, "품절 상태는 boolean이어야 합니다."));
    }
    validateSortOrder(item.sortOrder, `items.${index}.sortOrder`, errors);
    validateVisible(item.visible, `items.${index}.visible`, errors);
    item.priceColumnValues.forEach((value, valueIndex) => {
      if (value.itemId !== item.id || !priceColumnIds.has(value.priceColumnId)) {
        errors.push(createError("INVALID_REFERENCE", `items.${index}.priceColumnValues.${valueIndex}`, "메뉴 옵션 컬럼 가격 참조가 유효하지 않습니다."));
      }
      validateSortOrder(value.sortOrder, `items.${index}.priceColumnValues.${valueIndex}.sortOrder`, errors);
      validateVisible(value.visible, `items.${index}.priceColumnValues.${valueIndex}.visible`, errors);
    });
  });

  snapshot.widgets.forEach((widget, index) => {
    const widgetValidation = validateMenuWidgetDraft(widget);
    widgetValidation.errors.forEach((error) => {
      errors.push(createError("INVALID_WIDGET", `widgets.${index}.${error.field}`, error.message));
    });
    if (!pageIds.has(widget.menuPageId)) {
      errors.push(createError("INVALID_REFERENCE", `widgets.${index}.menuPageId`, "위젯의 페이지 참조가 유효하지 않습니다."));
    }
    validateSortOrder(widget.sortOrder, `widgets.${index}.sortOrder`, errors);
    validateVisible(widget.visible, `widgets.${index}.visible`, errors);
  });

  Object.entries(snapshot.mixedContentOrder).forEach(([pageId, blocks]) => {
    if (!pageIds.has(pageId)) {
      errors.push(createError("INVALID_REFERENCE", `mixedContentOrder.${pageId}`, "혼합 순서의 페이지 참조가 유효하지 않습니다."));
    }
    if (blocks.filter((block) => block.blockType === "widget").length > MAX_MENU_WIDGETS_PER_PAGE) {
      errors.push(createError("TOO_MANY_WIDGETS", `mixedContentOrder.${pageId}`, `한 페이지에는 위젯을 최대 ${MAX_MENU_WIDGETS_PER_PAGE}개까지 배치할 수 있습니다.`));
    }
    blocks.forEach((block, blockIndex) => {
      const refKey = `${pageId}:${block.blockType}:${block.id}`;
      if (contentBlockRefs.has(refKey)) {
        errors.push(createError("DUPLICATE_CONTENT_BLOCK", `mixedContentOrder.${pageId}.${blockIndex}`, "중복된 content block 참조가 있습니다."));
      }
      contentBlockRefs.add(refKey);
      const validRef = block.blockType === "category" ? categoryIds.has(block.id) : widgetIds.has(block.id);
      if (!validRef) {
        errors.push(createError("INVALID_REFERENCE", `mixedContentOrder.${pageId}.${blockIndex}.id`, "content block 참조가 유효하지 않습니다."));
      }
      validateSortOrder(block.sortOrder, `mixedContentOrder.${pageId}.${blockIndex}.sortOrder`, errors);
      validateVisible(block.visible, `mixedContentOrder.${pageId}.${blockIndex}.visible`, errors);
    });
  });

  snapshot.categories.forEach((category) => {
    if (!hasContentBlock(snapshot.mixedContentOrder, category.pageId, "category", category.id)) {
      errors.push(createError("MISSING_CONTENT_BLOCK", `categories.${category.presetKey}`, "visible starter category는 mixed order에 정확히 한 번 포함되어야 합니다."));
    }
  });
  snapshot.widgets.forEach((widget) => {
    if (!hasContentBlock(snapshot.mixedContentOrder, widget.menuPageId, "widget", widget.id)) {
      errors.push(createError("MISSING_CONTENT_BLOCK", `widgets.${widget.id}`, "visible starter widget은 mixed order에 정확히 한 번 포함되어야 합니다."));
    }
  });

  if (snapshot.featuredItemId && !itemIds.has(snapshot.featuredItemId)) {
    errors.push(createError("INVALID_REFERENCE", "featuredItemId", "대표 상품 참조가 유효하지 않습니다."));
  }
  snapshot.featuredSlides.forEach((slide, index) => {
    if (slide.imageUrl && !slide.featuredItemId) {
      errors.push(createError("INVALID_REFERENCE", `featuredSlides.${index}.featuredItemId`, "대표 슬라이드는 reset item을 안정적으로 참조해야 합니다."));
    }
    if (slide.featuredItemId && !itemIds.has(slide.featuredItemId)) {
      errors.push(createError("INVALID_REFERENCE", `featuredSlides.${index}.featuredItemId`, "대표 슬라이드의 상품 참조가 유효하지 않습니다."));
    }
  });

  snapshot.timeSales.forEach((timeSale, timeSaleIndex) => {
    if (!itemIds.has(timeSale.ownerItemId)) {
      errors.push(createError("INVALID_REFERENCE", `timeSales.${timeSaleIndex}.ownerItemId`, "타임세일 owner item 참조가 유효하지 않습니다."));
    }
    timeSale.targets.forEach((target, targetIndex) => {
      if (!itemIds.has(target.itemId) || (target.priceColumnId && !priceColumnIds.has(target.priceColumnId))) {
        errors.push(createError("INVALID_REFERENCE", `timeSales.${timeSaleIndex}.targets.${targetIndex}`, "타임세일 target 참조가 유효하지 않습니다."));
      }
    });
  });
  snapshot.saveContractGaps.forEach((gap, index) => {
    errors.push(createError("SAVE_CONTRACT_GAP", `saveContractGaps.${index}`, gap));
  });

  validateNoPersistedIds(snapshot, persistedIds, errors);
  return errors.length === 0 ? { ok: true, errors: [] } : { ok: false, errors };
}

export function createCafeAStarterResetFinalSavePayload(
  snapshot: CafeAStarterResetSnapshot,
): CafeAStarterResetFinalSavePayload {
  return {
    source: CAFE_A_STARTER_RESET_FINAL_SAVE_SOURCE,
    schemaVersion: CAFE_A_STARTER_RESET_FINAL_SAVE_SCHEMA_VERSION,
    snapshot,
  };
}

export function parseCafeAStarterResetFinalSavePayload(
  value: unknown,
): { ok: true; payload: CafeAStarterResetFinalSavePayload; errors: [] } | { ok: false; payload: null; errors: CafeAStarterResetValidationError[] } {
  if (!isPlainObject(value)) {
    return {
      ok: false,
      payload: null,
      errors: [createError("INVALID_FINAL_SAVE_PAYLOAD", "payload", "starter reset final-save payload는 object여야 합니다.")],
    };
  }

  if (value.source !== CAFE_A_STARTER_RESET_FINAL_SAVE_SOURCE) {
    return {
      ok: false,
      payload: null,
      errors: [createError("INVALID_FINAL_SAVE_PAYLOAD", "source", "starter reset final-save source가 올바르지 않습니다.")],
    };
  }

  if (value.schemaVersion !== CAFE_A_STARTER_RESET_FINAL_SAVE_SCHEMA_VERSION) {
    return {
      ok: false,
      payload: null,
      errors: [createError("INVALID_FINAL_SAVE_PAYLOAD", "schemaVersion", "starter reset final-save schemaVersion이 올바르지 않습니다.")],
    };
  }

  const snapshot = value.snapshot;
  if (!isCafeAStarterResetSnapshotShape(snapshot)) {
    return {
      ok: false,
      payload: null,
      errors: [createError("INVALID_FINAL_SAVE_PAYLOAD", "snapshot", "starter reset snapshot이 올바르지 않습니다.")],
    };
  }

  const validation = validateCafeAStarterResetSnapshot(snapshot as CafeAStarterResetSnapshot);
  if (!validation.ok) {
    return {
      ok: false,
      payload: null,
      errors: validation.errors,
    };
  }

  return {
    ok: true,
    payload: {
      source: CAFE_A_STARTER_RESET_FINAL_SAVE_SOURCE,
      schemaVersion: CAFE_A_STARTER_RESET_FINAL_SAVE_SCHEMA_VERSION,
      snapshot: snapshot as CafeAStarterResetSnapshot,
    },
    errors: [],
  };
}

function validateStarterPresetSource(preset: StarterPreset): CafeAStarterResetValidationError[] {
  const errors: CafeAStarterResetValidationError[] = [];
  const pageKeys = preset.pages.map((page, index) => getStarterPageKey(page, index));
  validateUnique(pageKeys, "preset.pages.key", errors, "DUPLICATE_PRESET_KEY");

  const categoryKeys: string[] = [];
  const itemKeys: string[] = [];
  const itemCategoryByKey = new Map<string, string>();
  const priceColumnCompositeKeys = new Set<string>();
  preset.pages.forEach((page, pageIndex) => {
    const pageKey = pageKeys[pageIndex] ?? DEFAULT_PAGE_KEY;
    page.categories.forEach((category, categoryIndex) => {
      const categoryKey = getStarterCategoryKey(category, pageKey, categoryIndex);
      categoryKeys.push(categoryKey);
      (category.price_columns ?? []).forEach((column) => {
        priceColumnCompositeKeys.add(`${categoryKey}:${column.key}`);
      });
      category.items.forEach((item, itemIndex) => {
        const itemKey = getStarterItemKey(item, categoryKey, itemIndex);
        itemKeys.push(itemKey);
        itemCategoryByKey.set(itemKey, categoryKey);
      });
    });
  });
  validateUnique(categoryKeys, "preset.categories.key", errors, "DUPLICATE_PRESET_KEY");
  validateUnique(itemKeys, "preset.items.key", errors, "DUPLICATE_PRESET_KEY");
  const widgetKeys = (preset.widgets ?? []).map((widget) => widget.key);
  validateUnique(widgetKeys, "preset.widgets.key", errors, "DUPLICATE_PRESET_KEY");

  const categoryKeySet = new Set(categoryKeys);
  const itemKeySet = new Set(itemKeys);
  const widgetKeySet = new Set(widgetKeys);

  (preset.mixed_content_order ?? []).forEach((block, index) => {
    if (block.block_type === "category" && !categoryKeySet.has(block.category_key)) {
      errors.push(createError("INVALID_REFERENCE", `preset.mixed_content_order.${index}.category_key`, "mixed order category key가 starter category에 존재하지 않습니다."));
    }
    if (block.block_type === "widget" && !widgetKeySet.has(block.widget_key)) {
      errors.push(createError("INVALID_REFERENCE", `preset.mixed_content_order.${index}.widget_key`, "mixed order widget key가 starter widget에 존재하지 않습니다."));
    }
  });

  if (preset.featured_item_key && !itemKeySet.has(preset.featured_item_key)) {
    errors.push(createError("INVALID_REFERENCE", "preset.featured_item_key", "대표 상품 key가 starter item에 존재하지 않습니다."));
  }
  (preset.featured_slides ?? []).forEach((slide, index) => {
    if (slide.featured_item_key && !itemKeySet.has(slide.featured_item_key)) {
      errors.push(createError("INVALID_REFERENCE", `preset.featured_slides.${index}.featured_item_key`, "대표 슬라이드 상품 key가 starter item에 존재하지 않습니다."));
    }
  });

  (preset.time_sales ?? []).forEach((timeSale, timeSaleIndex) => {
    (timeSale.targets ?? []).forEach((target, targetIndex) => {
      const itemKey = target.target_item_key;
      if (itemKey && !itemKeySet.has(itemKey)) {
        errors.push(createError("INVALID_REFERENCE", `preset.time_sales.${timeSaleIndex}.targets.${targetIndex}.target_item_key`, "타임세일 target item key가 starter item에 존재하지 않습니다."));
      }
      const categoryKey = itemKey ? itemCategoryByKey.get(itemKey) : null;
      if (categoryKey && target.target_price_column_key && !priceColumnCompositeKeys.has(`${categoryKey}:${target.target_price_column_key}`)) {
        errors.push(createError("INVALID_REFERENCE", `preset.time_sales.${timeSaleIndex}.targets.${targetIndex}.target_price_column_key`, "타임세일 target price column key가 starter category에 존재하지 않습니다."));
      }
    });
  });

  return errors;
}

function buildStarterMixedContentOrder(args: {
  preset: StarterPreset;
  pages: readonly CafeAStarterResetPageDraft[];
  categories: readonly CafeAStarterResetCategoryDraft[];
  widgets: readonly MenuWidgetDraft[];
  referenceMap: CafeAStarterResetReferenceMap;
}): MenuEditorContentBlockDraftsByPageId {
  const blocksByPageId: Record<string, MenuEditorContentBlockDraft[]> = Object.fromEntries(args.pages.map((page) => [page.id, []]));
  const sourceBlocks = args.preset.mixed_content_order;

  if (sourceBlocks?.length) {
    sourceBlocks
      .slice()
      .sort((left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0))
      .forEach((block, index) => {
        const pageKey = block.page_key ?? args.pages[0]?.presetKey ?? DEFAULT_PAGE_KEY;
        const pageId = args.referenceMap.page[pageKey] ?? args.pages[0]?.id ?? "";
        const id = getContentBlockReferenceId(block, args.referenceMap);
        if (!pageId || !id) return;
        blocksByPageId[pageId]?.push({
          blockType: block.block_type,
          id,
          menuPageId: pageId,
          sortOrder: block.sort_order ?? index,
          visible: block.visible !== false,
        } as MenuEditorContentBlockDraft);
      });
    return normalizeContentBlockDraftsByPageId(blocksByPageId);
  }

  args.categories.forEach((category) => {
    blocksByPageId[category.pageId]?.push({
      blockType: "category",
      id: category.id,
      menuPageId: category.pageId,
      sortOrder: category.sortOrder,
      visible: category.visible,
    });
  });
  args.widgets.forEach((widget) => {
    blocksByPageId[widget.menuPageId]?.push({
      blockType: "widget",
      id: widget.id,
      menuPageId: widget.menuPageId,
      sortOrder: widget.sortOrder,
      visible: widget.visible,
    });
  });

  return normalizeContentBlockDraftsByPageId(blocksByPageId);
}

function createStarterWidgetDraft(args: {
  widget: StarterWidget;
  widgetId: string;
  pageId: string;
  sortOrder: number;
}): MenuWidgetDraft {
  return {
    id: args.widgetId,
    menuPageId: args.pageId,
    type: args.widget.type,
    title: args.widget.title ?? "",
    description: args.widget.description ?? "",
    imageUrl: args.widget.image_url ?? null,
    imagePath: args.widget.image_path ?? null,
    sortOrder: args.sortOrder,
    visible: args.widget.visible !== false,
    settings: {
      aspectRatio: args.widget.settings?.aspectRatio ?? (args.widget.type === "image" ? "2:1" : "4:3"),
      objectFit: args.widget.settings?.objectFit ?? "cover",
      textAlign: args.widget.settings?.textAlign ?? "left",
      altText: args.widget.settings?.altText ?? "",
    },
  };
}

function createStarterFeaturedSlideDraft(
  slide: StarterFeaturedSlide,
  index: number,
  itemByKey: ReadonlyMap<string, CafeAStarterResetItemDraft>,
  itemKeyByName: ReadonlyMap<string, string>,
): CafeAStarterResetFeaturedSlideDraft {
  return {
    id: slide.id,
    imageUrl: slide.image_url,
    imagePath: slide.image_path ?? null,
    featuredItemId: resolveFeaturedItemId(slide.featured_item_key, slide.featured_item_name, itemByKey, itemKeyByName),
    sortOrder: index,
  };
}

function buildStarterTimeSales(args: {
  timeSales: readonly StarterTimeSale[];
  itemByKey: ReadonlyMap<string, CafeAStarterResetItemDraft>;
  itemKeyByName: ReadonlyMap<string, string>;
  itemSourceByKey: ReadonlyMap<string, StarterItem>;
  itemPriceColumnValueByCompositeKey: ReadonlyMap<string, CafeAStarterResetItemPriceColumnValueDraft>;
  now: Date;
}): CafeAStarterResetTimeSaleDraft[] {
  return args.timeSales.flatMap((timeSale, timeSaleIndex) => {
    const targets = (timeSale.targets ?? []).flatMap((target) => {
      const itemKey = target.target_item_key ?? args.itemKeyByName.get(target.target_item_name) ?? "";
      const item = args.itemByKey.get(itemKey);
      if (!item) return [];
      const priceColumnValue = target.target_price_column_key
        ? args.itemPriceColumnValueByCompositeKey.get(`${itemKey}:${target.target_price_column_key}`) ?? null
        : null;
      if (target.target_price_column_key && !priceColumnValue) return [];
      const sourceItem = args.itemSourceByKey.get(itemKey);
      const normalPrice = priceColumnValue
        ? parseFiniteNumber(priceColumnValue.price)
        : sourceItem?.price ?? parseFiniteNumber(item.price);
      return [{
        itemId: item.id,
        priceColumnId: priceColumnValue?.priceColumnId ?? null,
        normalPrice,
        salePrice: target.sale_price,
        salePriceLabel: target.sale_price_label ?? null,
        visible: true,
      }];
    });
    const ownerItemId = targets[0]?.itemId;
    if (!ownerItemId || targets.length === 0) return [];
    const window = getStarterTimeSaleWindow(timeSale, args.now);

    return [{
      presetKey: timeSale.key ?? `time-sale-${timeSaleIndex + 1}`,
      name: timeSale.name,
      ownerItemId,
      active: true,
      scheduleType: normalizeTimeSaleScheduleType(timeSale.schedule_type),
      startsAt: window.startsAt,
      endsAt: window.endsAt,
      dailyStartTime: timeSale.daily_start_time ?? null,
      dailyEndTime: timeSale.daily_end_time ?? null,
      timezone: TIME_SALE_TIMEZONE,
      badgeText: timeSale.badge_text ?? DEFAULT_TIME_SALE_BADGE_TEXT,
      badgeBackgroundColor: timeSale.badge_background_color ?? DEFAULT_TIME_SALE_BADGE_BACKGROUND_COLOR,
      timeDisplayMode: timeSale.time_display_mode ?? DEFAULT_TIME_SALE_DISPLAY_MODE,
      timeDisplayText: timeSale.time_display_text ?? null,
      targets,
    }];
  });
}

function getStarterTimeSaleWindow(timeSale: StarterTimeSale, now: Date) {
  const start = Number.isFinite(now.getTime()) ? now : new Date();
  const end = new Date(start.getTime());
  if (typeof timeSale.duration_minutes === "number" && Number.isFinite(timeSale.duration_minutes) && timeSale.duration_minutes > 0) {
    end.setMinutes(end.getMinutes() + timeSale.duration_minutes);
  } else {
    end.setDate(end.getDate() + 30);
  }
  return {
    startsAt: start.toISOString(),
    endsAt: end.toISOString(),
  };
}

function resolveFeaturedItemId(
  itemKey: string | undefined,
  itemName: string | undefined,
  itemByKey: ReadonlyMap<string, CafeAStarterResetItemDraft>,
  itemKeyByName: ReadonlyMap<string, string>,
) {
  if (itemKey && itemByKey.has(itemKey)) return itemByKey.get(itemKey)?.id ?? null;
  if (!itemName) return null;
  const fallbackKey = itemKeyByName.get(itemName);
  return fallbackKey ? itemByKey.get(fallbackKey)?.id ?? null : null;
}

function getStarterPageKey(page: { key?: string; title: string }, index: number) {
  return normalizePresetKey(page.key) || `page-${index + 1}`;
}

function getStarterCategoryKey(category: { key?: string; name: string }, pageKey: string, index: number) {
  return normalizePresetKey(category.key) || `${pageKey}-category-${index + 1}`;
}

function getStarterItemKey(item: { key?: string; name: string }, categoryKey: string, index: number) {
  return normalizePresetKey(item.key) || `${categoryKey}-item-${index + 1}`;
}

function getContentBlockReferenceId(block: StarterMixedContentBlock, referenceMap: CafeAStarterResetReferenceMap) {
  if (block.block_type === "category") return referenceMap.category[block.category_key] ?? "";
  return referenceMap.widget[block.widget_key] ?? "";
}

function normalizeContentBlockDraftsByPageId(blocksByPageId: Record<string, MenuEditorContentBlockDraft[]>): MenuEditorContentBlockDraftsByPageId {
  return Object.fromEntries(
    Object.entries(blocksByPageId).map(([pageId, blocks]) => [
      pageId,
      blocks
        .slice()
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .map((block, index) => ({ ...block, menuPageId: pageId, sortOrder: index })),
    ]),
  );
}

function hasContentBlock(
  blocksByPageId: MenuEditorContentBlockDraftsByPageId,
  pageId: string,
  blockType: MenuEditorContentBlockDraft["blockType"],
  id: string,
) {
  return Boolean(blocksByPageId[pageId]?.some((block) => block.blockType === blockType && block.id === id));
}

function validateUnique(
  values: readonly string[],
  field: string,
  errors: CafeAStarterResetValidationError[],
  code: CafeAStarterResetValidationErrorCode = "DUPLICATE_ID",
) {
  const seen = new Set<string>();
  values.forEach((value, index) => {
    if (!value) return;
    if (seen.has(value)) {
      errors.push(createError(code, `${field}.${index}`, `중복된 값이 있습니다: ${value}`));
    }
    seen.add(value);
  });
}

function validateSortOrder(value: number, field: string, errors: CafeAStarterResetValidationError[]) {
  if (!Number.isInteger(value) || value < 0) {
    errors.push(createError("INVALID_SORT_ORDER", field, "sortOrder는 0 이상의 정수여야 합니다."));
  }
}

function validateVisible(value: boolean, field: string, errors: CafeAStarterResetValidationError[]) {
  if (typeof value !== "boolean") {
    errors.push(createError("INVALID_VISIBLE", field, "visible 값은 boolean이어야 합니다."));
  }
}

function validateNoPersistedIds(
  snapshot: CafeAStarterResetSnapshot,
  persistedIds: CafeAStarterResetPersistedIds,
  errors: CafeAStarterResetValidationError[],
) {
  const persistedIdSet = new Set([
    ...normalizeStringArray(persistedIds.pageIds),
    ...normalizeStringArray(persistedIds.categoryIds),
    ...normalizeStringArray(persistedIds.itemIds),
    ...normalizeStringArray(persistedIds.widgetIds),
  ]);
  const generatedIds = [
    ...snapshot.pages.map((page) => page.id),
    ...snapshot.categories.map((category) => category.id),
    ...snapshot.items.map((item) => item.id),
    ...snapshot.widgets.map((widget) => widget.id),
  ];
  generatedIds.forEach((id, index) => {
    if (persistedIdSet.has(id)) {
      errors.push(createError("MIXED_PERSISTED_AND_TEMP_ID", `generatedIds.${index}`, "reset snapshot의 신규 ID가 기존 DB ID와 섞였습니다."));
    }
  });
}

function createError(
  code: CafeAStarterResetValidationErrorCode,
  field: string,
  message: string,
): CafeAStarterResetValidationError {
  return { code, field, message };
}

function normalizeStringArray(value: readonly string[] | undefined) {
  return Array.from(new Set((value ?? []).map((item) => item.trim()).filter(Boolean))).sort();
}

function normalizePresetKey(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parseFiniteNumber(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCafeAStarterResetSnapshotShape(value: unknown): value is CafeAStarterResetSnapshot {
  if (!isPlainObject(value)) return false;
  const arrayFields = [
    "pages",
    "categories",
    "categoryPriceColumns",
    "items",
    "itemPriceColumnValues",
    "widgets",
    "featuredSlides",
    "timeSales",
    "deletedPageIds",
    "deletedCategoryIds",
    "deletedItemIds",
    "deletedWidgetIds",
    "saveContractGaps",
  ] as const;
  if (!arrayFields.every((field) => Array.isArray(value[field]))) return false;
  if (!isPlainObject(value.mixedContentOrder) || !isPlainObject(value.coverSettings) || !isPlainObject(value.referenceMap)) return false;
  if (!(value.categories as unknown[]).every((category) => isPlainObject(category) && Array.isArray(category.priceColumns))) return false;
  if (!(value.items as unknown[]).every((item) => isPlainObject(item) && Array.isArray(item.priceColumnValues))) return false;
  if (!(value.timeSales as unknown[]).every((timeSale) => isPlainObject(timeSale) && Array.isArray(timeSale.targets))) return false;
  return true;
}

function defaultStarterResetIdFactory(kind: CafeAStarterResetIdKind, key: string, index: number) {
  const suffix = key.replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || String(index + 1);
  const randomId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `temp-${kind}-starter-${suffix}-${randomId}`;
}
