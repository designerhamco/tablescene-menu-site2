import type { SupportedLocale } from "@/lib/locales";

export type EditableTranslationLocale = Exclude<SupportedLocale, "ko">;
export type EditableTranslationEntityType = "site" | "page" | "category" | "item";

export type EditableTranslationField = {
  entityType: EditableTranslationEntityType;
  entityId: string;
  field: string;
  group: "site" | "pages" | "categories" | "items";
  groupLabel: string;
  label: string;
  sourceText: string;
  sourceHash: string;
  multiline?: boolean;
  translations: Record<EditableTranslationLocale, string>;
};

export type EditableTranslationDraftValue = Pick<
  EditableTranslationField,
  "entityType" | "entityId" | "field" | "sourceHash"
> & {
  translations: Partial<Record<EditableTranslationLocale, string>>;
};

export type PartialMenuItemTranslationResult = {
  name?: string;
  description?: string;
  price_label?: string;
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
