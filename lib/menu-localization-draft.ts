import type { SupportedLocale } from "@/lib/locales";

export type EditableTranslationLocale = Exclude<SupportedLocale, "ko">;
export type EditableTranslationEntityType = "site" | "page" | "category" | "item" | "promotion" | "widget";

export type EditableTranslationField = {
  entityType: EditableTranslationEntityType;
  entityId: string;
  field: string;
  group: "site" | "pages" | "categories" | "items" | "promotions" | "widgets";
  groupLabel: string;
  parentGroupLabel?: string;
  label: string;
  sourceText: string;
  sourceHash: string;
  multiline?: boolean;
  maxLength?: number;
  translations: Record<EditableTranslationLocale, string>;
};

export type EditableTranslationDraftValue = Pick<
  EditableTranslationField,
  "entityType" | "entityId" | "field" | "sourceHash"
> & {
  translations: Partial<Record<EditableTranslationLocale, string>>;
};

export type AutoTranslationDraftPatch = {
  entityType: EditableTranslationEntityType;
  entityId: string;
  field: string;
  locale: EditableTranslationLocale;
  value: string;
  sourceHash: string;
};

export type AutoTranslationLocaleResult = {
  locale: EditableTranslationLocale;
  status: "success" | "failed" | "skipped";
  translatedEntities: number;
  translatedTextUnits: number;
  draftRowCount: number;
  userMessage?: string | null;
};

export type RecoverableAutoTranslationJob = {
  jobId: string;
  completedAt: string | null;
  targetLocales: EditableTranslationLocale[];
  localeResults: AutoTranslationLocaleResult[];
  patches: AutoTranslationDraftPatch[];
  applicableRowCount: number;
  staleRowCount: number;
};

const EDITABLE_TRANSLATION_ENTITY_TYPES = ["site", "page", "category", "item", "promotion", "widget"] as const;
const EDITABLE_TRANSLATION_LOCALES = ["en", "zh", "ja"] as const;
const TRANSLATION_RECOVERY_TEXT_MAX_LENGTH = 10000;
const TRANSLATION_RECOVERY_UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TRANSLATION_RECOVERY_ALLOWED_FIELDS = {
  site: [
    "restaurant_name",
    "brand_description",
    "menu_cover_title",
    "menu_cover_description",
    "menu_cover_label",
    "description",
    "opening_hours",
    "restaurant_address",
    "restaurant_phone",
  ],
  page: ["title", "description"],
  category: ["name", "description"],
  item: ["name", "description", "price_label", "portion_label", "badge_label", "set_name"],
  promotion: ["badge_text", "time_display_text"],
  widget: ["title", "description"],
} as const satisfies Record<EditableTranslationEntityType, readonly string[]>;

function isEditableTranslationEntityType(value: unknown): value is EditableTranslationEntityType {
  return typeof value === "string" && EDITABLE_TRANSLATION_ENTITY_TYPES.includes(value as EditableTranslationEntityType);
}

function isEditableTranslationLocale(value: unknown): value is EditableTranslationLocale {
  return typeof value === "string" && EDITABLE_TRANSLATION_LOCALES.includes(value as EditableTranslationLocale);
}

function isValidRecoveryEntityId(entityType: EditableTranslationEntityType, value: unknown) {
  return typeof value === "string" && value.length > 0 && (entityType === "site" || TRANSLATION_RECOVERY_UUID_PATTERN.test(value));
}

function isAllowedRecoveryField(entityType: EditableTranslationEntityType, field: unknown): field is string {
  return typeof field === "string" && TRANSLATION_RECOVERY_ALLOWED_FIELDS[entityType].includes(field as never);
}

function getFiniteCount(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0;
}

export function parseAutoTranslationDraftPayload(value: unknown): AutoTranslationDraftPatch[] {
  if (!Array.isArray(value)) return [];

  return value.filter((entry): entry is AutoTranslationDraftPatch => {
    if (!entry || typeof entry !== "object") return false;
    const candidate = entry as Partial<AutoTranslationDraftPatch>;
    if (!isEditableTranslationEntityType(candidate.entityType)) return false;
    if (!isValidRecoveryEntityId(candidate.entityType, candidate.entityId)) return false;
    if (!isAllowedRecoveryField(candidate.entityType, candidate.field)) return false;
    if (!isEditableTranslationLocale(candidate.locale)) return false;
    if (typeof candidate.value !== "string" || candidate.value.length === 0) return false;
    if (candidate.value.length > TRANSLATION_RECOVERY_TEXT_MAX_LENGTH) return false;
    if (typeof candidate.sourceHash !== "string" || candidate.sourceHash.length === 0) return false;

    return true;
  });
}

export function parseAutoTranslationLocaleResults(value: unknown): AutoTranslationLocaleResult[] {
  if (!Array.isArray(value)) return [];

  return value.filter((entry): entry is AutoTranslationLocaleResult => {
    if (!entry || typeof entry !== "object") return false;
    const candidate = entry as Partial<AutoTranslationLocaleResult>;
    return (
      isEditableTranslationLocale(candidate.locale) &&
      (candidate.status === "success" || candidate.status === "failed" || candidate.status === "skipped")
    );
  }).map((entry) => ({
    locale: entry.locale,
    status: entry.status,
    translatedEntities: getFiniteCount(entry.translatedEntities),
    translatedTextUnits: getFiniteCount(entry.translatedTextUnits),
    draftRowCount: getFiniteCount(entry.draftRowCount),
    userMessage: typeof entry.userMessage === "string" && entry.userMessage.trim() ? entry.userMessage.trim() : null,
  }));
}

export type PartialMenuItemTranslationResult = {
  name?: string;
  set_name?: string;
  description?: string;
  price_label?: string;
  portion_label?: string;
  badge_label?: string;
};

export type PartialMenuCategoryTranslationResult = {
  name?: string;
  description?: string;
};

export type PartialMenuHeroTranslationResult = {
  restaurant_name?: string;
  brand_description?: string;
  menu_cover_label?: string;
  menu_cover_title?: string;
  menu_cover_description?: string;
  opening_hours?: string;
  restaurant_address?: string;
  restaurant_phone?: string;
};

export type PartialTranslationResult =
  | PartialMenuItemTranslationResult
  | PartialMenuCategoryTranslationResult
  | PartialMenuHeroTranslationResult;

export type PartialTranslationActionResult =
  | {
      ok: true;
      data: PartialTranslationResult;
      usage: {
        used: number;
        limit: number;
      };
      message: string;
    }
  | {
      ok: false;
      message: string;
      usage?: {
        used: number;
        limit: number;
      };
    };
