import { createHash } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import { PARTIAL_TRANSLATION_FAILURE_MESSAGE } from "@/lib/menu-translation-errors";
import {
  TIME_SALE_BADGE_TEXT_MAX_LENGTH,
  TIME_SALE_DISPLAY_TEXT_MAX_LENGTH,
  TIME_SALE_TYPE,
  isBasicTimeSaleTemplate,
} from "@/lib/menu-time-sales";
import { MAX_MENU_WIDGET_DESCRIPTION_LENGTH, MAX_MENU_WIDGET_TITLE_LENGTH } from "@/lib/menu-widgets";
import type { Database, Json } from "@/lib/supabase/types";
import { getTemplateCapabilities } from "@/lib/template-capabilities";

export const TARGET_TRANSLATION_LOCALES = ["en", "zh", "ja"] as const;

export type TargetTranslationLocale = (typeof TARGET_TRANSLATION_LOCALES)[number];
type Supabase = SupabaseClient<Database>;
export type TranslationTable =
  | "menu_site_translations"
  | "menu_page_translations"
  | "menu_category_translations"
  | "menu_item_translations"
  | "menu_item_price_option_translations"
  | "menu_item_trait_translations"
  | "menu_event_translations"
  | "menu_chef_translations"
  | "menu_social_link_translations"
  | "menu_promotion_translations"
  | "menu_widget_translations";

type TranslationEntity = {
  table: TranslationTable;
  sourceIdField:
    | "menu_site_id"
    | "menu_page_id"
    | "category_id"
    | "item_id"
    | "price_option_id"
    | "trait_id"
    | "event_id"
    | "chef_id"
    | "social_link_id"
    | "menu_promotion_id"
    | "menu_widget_id";
  id: string;
  fields: Record<string, string>;
  sourceTextHash: string;
};

type TranslationTextUnit = {
  key: string;
  text: string;
};

type ExistingTranslatedFields = Map<string, Set<string>>;

type OpenAITranslationResponse = {
  translations: {
    key: string;
    text: string;
  }[];
};

type OpenAIDescriptionResponse = {
  description: string;
};

type OpenAIMenuCleanupResponse = {
  categories: {
    name: string;
    description: string;
    items: {
      name: string;
      price: number | null;
      price_label: string;
      description: string;
      badge_label: string;
    }[];
  }[];
};

export type MenuTranslationUpdateResult = {
  translatedEntities: number;
  skippedEntities: number;
  translatedTextUnits: number;
};

export type MenuTranslationDraftRow = {
  table: TranslationTable;
  entityId: string;
  locale: TargetTranslationLocale;
  sourceTextHash: string;
  fields: Record<string, string | null>;
};

export type MenuTranslationLocaleResult = {
  locale: TargetTranslationLocale;
  ok: boolean;
  draftRowCount: number;
  translatedEntities: number;
  translatedTextUnits: number;
  untranslatedWarningCount: number;
  error?: string;
};

export type MenuTranslationDraftResult = MenuTranslationUpdateResult & {
  rows: MenuTranslationDraftRow[];
  localeResults: MenuTranslationLocaleResult[];
};

export type PartialMenuItemTranslationInput = {
  name: string | null;
  set_name?: string | null;
  description?: string | null;
  price_label?: string | null;
  portion_label?: string | null;
  badge_label?: string | null;
  categoryName?: string | null;
  restaurantName?: string | null;
};

export type PartialMenuCategoryTranslationInput = {
  name: string | null;
  description?: string | null;
  course_price_label?: string | null;
  course_price_description?: string | null;
  restaurantName?: string | null;
};

export type PartialMenuHeroTranslationInput = {
  restaurant_name?: string | null;
  brand_description?: string | null;
  menu_cover_label?: string | null;
  menu_cover_title?: string | null;
  menu_cover_description?: string | null;
  opening_hours?: string | null;
  restaurant_address?: string | null;
  restaurant_phone?: string | null;
  restaurantCategory?: string | null;
};

export type MenuItemDescriptionDraftInput = {
  name: string;
  categoryName?: string | null;
  price?: string | null;
  priceLabel?: string | null;
  badgeLabel?: string | null;
  currentDescription?: string | null;
  templateKey?: string | null;
  serviceType?: string | null;
};

export type MenuCleanupStructuredCategory = OpenAIMenuCleanupResponse["categories"][number];

export type MenuCleanupStructuredResult = {
  categories: MenuCleanupStructuredCategory[];
};

export type MenuCleanupStructureInput = {
  rawText: string;
  templateKey?: string | null;
  serviceType?: string | null;
};

const CHUNK_SIZE = 10;
const OPENAI_RESPONSES_ENDPOINT = "https://api.openai.com/v1/responses";
const DEFAULT_TRANSLATION_MODEL = "gpt-5-nano";
const DEFAULT_TRANSLATION_TIMEOUT_MS = 60_000;
const DEFAULT_TRANSLATION_CONCURRENCY = 2;

const targetLanguageLabels: Record<TargetTranslationLocale, string> = {
  en: "English",
  zh: "Simplified Chinese",
  ja: "Japanese",
};

function cleanText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getTranslationTimeoutMs() {
  const rawValue = Number(process.env.OPENAI_TRANSLATION_TIMEOUT_MS);
  if (Number.isFinite(rawValue) && rawValue >= 5_000) {
    return Math.min(rawValue, 180_000);
  }

  return DEFAULT_TRANSLATION_TIMEOUT_MS;
}

function getTranslationConcurrency() {
  const rawValue = Number(process.env.OPENAI_TRANSLATION_CONCURRENCY);
  if (Number.isFinite(rawValue) && rawValue >= 1) {
    return Math.min(Math.floor(rawValue), 3);
  }

  return DEFAULT_TRANSLATION_CONCURRENCY;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "unknown";
}

function getErrorStack(error: unknown) {
  return error instanceof Error ? error.stack : undefined;
}

function formatLogContext(context: Record<string, unknown>) {
  return JSON.stringify(context, (_key, value) => {
    if (value instanceof Error) {
      return {
        name: value.name,
        message: value.message,
        stack: value.stack,
      };
    }

    return value;
  });
}

function isAbortLikeError(error: unknown) {
  if (!(error instanceof Error)) return false;
  const normalizedMessage = error.message.toLowerCase();
  return error.name === "AbortError" || normalizedMessage.includes("abort") || normalizedMessage.includes("timeout");
}

function hasHangul(value: string) {
  return /[가-힣]/.test(value);
}

function isLikelyUntranslatedMenuItemValue(sourceText: string, translatedText: string) {
  if (!hasHangul(sourceText)) return false;

  const normalizedSource = sourceText.trim();
  const normalizedTranslation = translatedText.trim();

  if (normalizedTranslation === normalizedSource) return true;
  if (hasHangul(normalizedTranslation)) return true;

  return false;
}

function isMenuItemNameKey(key: string) {
  return key.startsWith("menu_item_translations:") && key.endsWith(":name");
}

function isAllCapsEnglishMenuItemName(fieldName: string, translatedText: string, locale: TargetTranslationLocale) {
  if (locale !== "en" || fieldName !== "name") return false;

  const letters = translatedText.match(/[A-Za-z]/g) ?? [];
  if (letters.length < 2) return false;

  return /[A-Z]/.test(translatedText) && !/[a-z]/.test(translatedText);
}

function getWidgetTranslationMaxLength(fieldName: string) {
  if (fieldName === "title") return MAX_MENU_WIDGET_TITLE_LENGTH;
  if (fieldName === "description") return MAX_MENU_WIDGET_DESCRIPTION_LENGTH;
  return null;
}

function getPromotionTranslationMaxLength(fieldName: string) {
  if (fieldName === "badge_text") return TIME_SALE_BADGE_TEXT_MAX_LENGTH;
  if (fieldName === "time_display_text") return TIME_SALE_DISPLAY_TEXT_MAX_LENGTH;
  return null;
}

function getFieldLevelTranslationMaxLength(table: TranslationTable, fieldName: string) {
  if (table === "menu_widget_translations") return getWidgetTranslationMaxLength(fieldName);
  if (table === "menu_promotion_translations") return getPromotionTranslationMaxLength(fieldName);
  return null;
}

function isTranslationFieldWithinLimit(table: TranslationTable, fieldName: string, value: string) {
  const maxLength = getFieldLevelTranslationMaxLength(table, fieldName);
  return maxLength == null || value.length <= maxLength;
}

function toEnglishMenuItemTitleCase(value: string) {
  const lowerCaseWords = new Set(["a", "an", "and", "as", "at", "but", "by", "for", "in", "of", "on", "or", "the", "to", "with"]);
  let wordIndex = 0;

  return value.replace(/[A-Za-z]+(?:'[A-Za-z]+)?/g, (word) => {
    const lower = word.toLowerCase();
    const shouldKeepLowerCase = wordIndex > 0 && lowerCaseWords.has(lower);
    wordIndex += 1;

    if (shouldKeepLowerCase) {
      return lower;
    }

    return lower.charAt(0).toUpperCase() + lower.slice(1);
  });
}

function normalizeTranslatedTextValue(locale: TargetTranslationLocale, key: string, value: string) {
  if (locale === "en" && isMenuItemNameKey(key)) {
    return toEnglishMenuItemTitleCase(value);
  }

  return value;
}

export function isPriceLikeText(value: string) {
  const normalized = value.trim();
  if (!normalized) return false;
  if (!/\d/.test(normalized)) return false;

  return /^[\d\s,.₩¥€£$~–—\-+()/:%원円엔KRWkrwUSDusdJPYjpyHOTICEhotice]+$/.test(normalized);
}

function isUnitLikeText(value: string) {
  const normalized = value.trim();
  if (!normalized || !/\d/.test(normalized)) return false;

  return /^[\d\s,.~–—\-+()/]*(ml|milliliter|millilitre|l|liter|litre|g|gram|kg|mg|oz|lb|cm|mm|m)\b[\d\s,.~–—\-+()/]*$/i.test(
    normalized
  );
}

function isPriceLabelField(fieldName: string) {
  return fieldName === "price_label" || fieldName.endsWith("_price_label");
}

function isBasicFooterNoticeTranslationField(fieldName: string) {
  // Basic/CafeA footer notice translation compatibility mapping:
  // footer_notice_1/2/3 reuse opening_hours/address/phone translation columns to avoid a schema change.
  return fieldName === "opening_hours" || fieldName === "restaurant_address" || fieldName === "restaurant_phone";
}

function isDisplayLabelField(fieldName: string) {
  return fieldName === "restaurant_name" || fieldName === "name" || fieldName === "set_name" || fieldName === "badge_label";
}

function isShortLatinDisplayText(value: string) {
  const normalized = value.trim();
  if (!normalized || hasHangul(normalized) || normalized.length > 48) return false;
  return /[A-Za-z]/.test(normalized) && /^[A-Za-z0-9\s&.'’:/@#·~–—\-+()]+$/.test(normalized);
}

function isIdentifierLikeFooterNotice(value: string) {
  const normalized = value.trim();
  if (!normalized || /[가-힣]/.test(normalized)) return false;

  return (
    /https?:\/\//i.test(normalized) ||
    /(^|\s)@[\w.]+/.test(normalized) ||
    /\b(wi-?fi|ssid|pw|password|passcode|instagram|insta|facebook|youtube|kakao|naver)\b/i.test(normalized) ||
    /^[\w\s.,:/@#·~–—\-+()]+$/.test(normalized)
  );
}

function isProtectedLiteralField(fieldName: string, value: string) {
  if (isPriceLabelField(fieldName)) return isPriceLikeText(value);
  if (isBasicFooterNoticeTranslationField(fieldName)) return isIdentifierLikeFooterNotice(value);
  if (isDisplayLabelField(fieldName)) return isShortLatinDisplayText(value);
  return fieldName === "portion_label" && isUnitLikeText(value);
}

function getJsonRecord(value: unknown): Record<string, Json> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, Json>) : {};
}

function getJsonString(settings: Record<string, Json>, key: string) {
  const value = settings[key];
  return typeof value === "string" ? value : "";
}

function buildSourceHash(fields: Record<string, string>) {
  return createHash("sha256").update(JSON.stringify(fields)).digest("hex");
}

function buildEntity(
  table: TranslationTable,
  sourceIdField: TranslationEntity["sourceIdField"],
  id: string,
  sourceFields: Record<string, unknown>
) {
  const fields = Object.entries(sourceFields).reduce<Record<string, string>>((result, [fieldName, value]) => {
    const text = cleanText(value);
    if (text) {
      result[fieldName] = text;
    }
    return result;
  }, {});

  if (Object.keys(fields).length === 0) {
    return null;
  }

  return {
    table,
    sourceIdField,
    id,
    fields,
    sourceTextHash: buildSourceHash(fields),
  } satisfies TranslationEntity;
}

function chunkItems<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function getTextFromOpenAIResponse(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return "";
  }

  const response = payload as {
    output_text?: unknown;
    output?: {
      content?: {
        text?: unknown;
      }[];
    }[];
  };

  if (typeof response.output_text === "string") {
    return response.output_text;
  }

  return (
    response.output
      ?.flatMap((item) => item.content ?? [])
      .map((content) => (typeof content.text === "string" ? content.text : ""))
      .join("") ?? ""
  );
}

function parseTranslationResponse(text: string) {
  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("번역 API 응답을 JSON으로 해석하지 못했습니다.");
  }

  if (!parsed || typeof parsed !== "object" || !Array.isArray((parsed as OpenAITranslationResponse).translations)) {
    throw new Error("번역 API 응답 형식이 올바르지 않습니다.");
  }

  return (parsed as OpenAITranslationResponse).translations.reduce<Record<string, string>>((result, item) => {
    const key = cleanText(item.key);
    const translatedText = cleanText(item.text);
    if (key && translatedText) {
      result[key] = translatedText;
    }
    return result;
  }, {});
}

function parseDescriptionResponse(text: string) {
  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("AI 설명 작성 응답을 JSON으로 해석하지 못했습니다.");
  }

  const description = cleanText((parsed as Partial<OpenAIDescriptionResponse> | null)?.description);
  if (!description) {
    throw new Error("AI 설명 작성 결과가 비어 있습니다.");
  }

  return description;
}

function parseMenuCleanupResponse(text: string): MenuCleanupStructuredResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("AI 메뉴 정리 응답을 JSON으로 해석하지 못했습니다.");
  }

  if (!parsed || typeof parsed !== "object" || !Array.isArray((parsed as Partial<OpenAIMenuCleanupResponse>).categories)) {
    throw new Error("AI 메뉴 정리 응답 형식이 올바르지 않습니다.");
  }

  const categories = (parsed as OpenAIMenuCleanupResponse).categories
    .map((category) => ({
      name: cleanText(category.name) ?? "",
      description: cleanText(category.description) ?? "",
      items: Array.isArray(category.items)
        ? category.items.map((item) => ({
            name: cleanText(item.name) ?? "",
            price: typeof item.price === "number" && Number.isFinite(item.price) ? Math.max(0, Math.floor(item.price)) : null,
            price_label: cleanText(item.price_label) ?? "",
            description: cleanText(item.description) ?? "",
            badge_label: cleanText(item.badge_label) ?? "",
          }))
        : [],
    }))
    .filter((category) => category.name && category.items.some((item) => item.name));

  return {
    categories: categories.map((category) => ({
      ...category,
      items: category.items.filter((item) => item.name),
    })),
  };
}

type TranslationChunkLogContext = {
  chunkIndex?: number;
  chunkCount?: number;
};

async function translateChunk(
  locale: TargetTranslationLocale,
  items: TranslationTextUnit[],
  chunkContext: TranslationChunkLogContext = {}
) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY 환경변수가 설정되어 있지 않습니다.");
  }

  const model = process.env.OPENAI_TRANSLATION_MODEL || process.env.OPENAI_MODEL || DEFAULT_TRANSLATION_MODEL;
  const timeoutMs = getTranslationTimeoutMs();
  const controller = new AbortController();
  const startedAt = Date.now();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const requestPayload = JSON.stringify({
    model,
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text:
              "You translate Korean restaurant menu content. Preserve meaning, menu style, line breaks, numbers, symbols, and brand names. Preserve Wi-Fi SSIDs, passwords, URLs, @handles, account IDs, phone numbers, and address-like identifiers unless they contain ordinary Korean prose. Never translate or reformat numeric prices or price-like labels: keep values such as 6.5, 6,500원, HOT 4.5 / ICE 5.0, 4,500 ~ 6,000 exactly as provided. Translate price labels only when they are meaningful text such as 문의, 시가, 무료, or 변동. Do not invent prices, currencies, or units. For English menu item name fields, use natural Title Case like Basil Cream Latte, not ALL CAPS. Category names, badges, and price labels may preserve uppercase when appropriate. Return only valid JSON that matches the schema.",
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: JSON.stringify({
              targetLocale: locale,
              targetLanguage: targetLanguageLabels[locale],
              items,
            }),
          },
        ],
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "menu_translation_chunk",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["translations"],
          properties: {
            translations: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["key", "text"],
                properties: {
                  key: { type: "string" },
                  text: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
  });

  console.info(`[localization:auto-translate] ai request start ${formatLogContext({
    locale,
    ...chunkContext,
    textUnitCount: items.length,
    payloadBytes: Buffer.byteLength(requestPayload, "utf8"),
    timeoutMs,
  })}`);

  let response: Response;

  try {
    response = await fetch(OPENAI_RESPONSES_ENDPOINT, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: requestPayload,
    });
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    console.error(`[localization:auto-translate] ai request failed ${formatLogContext({
      locale,
      ...chunkContext,
      textUnitCount: items.length,
      durationMs,
      timeoutMs,
      message: getErrorMessage(error),
      stack: getErrorStack(error),
    })}`);

    if (isAbortLikeError(error)) {
      throw new Error("AI 번역 요청 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.", { cause: error });
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  console.info(`[localization:auto-translate] ai request success ${formatLogContext({
    locale,
    ...chunkContext,
    textUnitCount: items.length,
    durationMs: Date.now() - startedAt,
  })}`);

  const payload = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    const errorMessage =
      payload && typeof payload === "object" && "error" in payload
        ? ((payload as { error?: { message?: string } }).error?.message ?? "번역 API 호출에 실패했습니다.")
        : "번역 API 호출에 실패했습니다.";
    throw new Error(errorMessage);
  }

  return parseTranslationResponse(getTextFromOpenAIResponse(payload));
}

export async function generateMenuItemDescriptionDraft(input: MenuItemDescriptionDraftInput) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY 환경변수가 설정되어 있지 않습니다.");
  }

  const name = cleanText(input.name);
  if (!name) {
    throw new Error("메뉴명을 먼저 입력해주세요.");
  }

  const model = process.env.OPENAI_DESCRIPTION_MODEL || process.env.OPENAI_MODEL || DEFAULT_TRANSLATION_MODEL;
  const response = await fetch(OPENAI_RESPONSES_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text:
                "You write concise Korean menu or service item descriptions for a digital menu board. Write 1-2 natural Korean sentences. Do not invent ingredients, discounts, medical effects, origin claims, or premium claims. Use the given name, category, price label, badge, and existing description only as context. Return only valid JSON that matches the schema.",
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: JSON.stringify({
                language: "ko",
                name,
                categoryName: cleanText(input.categoryName),
                price: cleanText(input.price),
                priceLabel: cleanText(input.priceLabel),
                badgeLabel: cleanText(input.badgeLabel),
                currentDescription: cleanText(input.currentDescription),
                templateKey: cleanText(input.templateKey),
                serviceType: cleanText(input.serviceType),
                instruction:
                  "메뉴판에 바로 넣을 수 있는 짧고 자연스러운 한국어 설명을 작성하세요. 음식 메뉴가 아닌 서비스/가격표 항목이면 음식처럼 표현하지 말고 안내 문구처럼 작성하세요.",
              }),
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "menu_item_description_draft",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["description"],
            properties: {
              description: { type: "string" },
            },
          },
        },
      },
    }),
  });

  const payload = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    const errorMessage =
      payload && typeof payload === "object" && "error" in payload
        ? ((payload as { error?: { message?: string } }).error?.message ?? "AI 설명 작성 API 호출에 실패했습니다.")
        : "AI 설명 작성 API 호출에 실패했습니다.";
    throw new Error(errorMessage);
  }

  return parseDescriptionResponse(getTextFromOpenAIResponse(payload));
}

export async function generateMenuCleanupStructure(input: MenuCleanupStructureInput): Promise<MenuCleanupStructuredResult> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY 환경변수가 설정되어 있지 않습니다.");
  }

  const rawText = cleanText(input.rawText);
  if (!rawText) {
    throw new Error("정리할 메뉴 내용을 입력해주세요.");
  }

  const model = process.env.OPENAI_MENU_CLEANUP_MODEL || process.env.OPENAI_MODEL || DEFAULT_TRANSLATION_MODEL;
  const response = await fetch(OPENAI_RESPONSES_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text:
                "You convert pasted Korean menu text into a clean digital menu structure. Do not invent menu items, prices, ingredients, images, origins, traits, or nutrition/medical claims. Extract only what is present or clearly implied. Infer natural menu categories from item names even when the user did not explicitly write category headers. Use blank-line groups as a useful hint, but split a group if it clearly mixes coffee, tea/drinks, desserts, soups, brunch, or meals. Do not put everything into '기본 메뉴' when cafe, dessert, drink, or food categories are reasonably inferable. Use '기본 메뉴' only when category inference is genuinely unclear. When flavor or characteristic phrases are provided, fold them naturally into the item description instead of creating separate trait indicators. Return only valid JSON that matches the schema.",
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: JSON.stringify({
                rawText,
                templateKey: cleanText(input.templateKey),
                serviceType: cleanText(input.serviceType),
                rules: [
                  "카테고리 name은 짧게 정리합니다.",
                  "카테고리명이 명시되지 않아도 메뉴명 의미를 보고 자연스럽게 카테고리를 추론합니다.",
                  "빈 줄로 나뉜 그룹은 사용자가 의도한 묶음일 수 있으므로 카테고리 추론의 힌트로 사용합니다.",
                  "카페/디저트/음료 메뉴는 커피, 티 & 음료, 디저트, 브런치, 스프처럼 메뉴판에 자연스러운 카테고리로 나눕니다.",
                  "모든 항목을 기본 메뉴 하나로 묶지 마세요. 단, 정말 판단하기 어려운 항목은 기본 메뉴로 묶을 수 있습니다.",
                  "카테고리는 가능하면 2-6개로 정리하고, 최대 8개를 넘지 않게 합니다.",
                  "아이템 name은 원문 메뉴명을 유지합니다.",
                  "price는 숫자로 명확히 추출할 수 있을 때만 number로 반환하고, 모르면 null로 둡니다.",
                  "price_label은 원문 가격 표시가 있으면 보존합니다. 가격이 없으면 빈 문자열로 둡니다.",
                  "description은 원문에 설명이 있을 때만 짧게 정리합니다.",
                  "산미, 고소함, 단맛, 바디감 같은 맛/특징 표현은 별도 지표로 만들지 말고 description에 자연스럽게 반영합니다.",
                  "badge_label은 BEST, 추천, NEW처럼 명확히 표시된 경우만 사용합니다.",
                  "현재 템플릿은 traits를 생성하지 않습니다. 향후 itemTraits=true 템플릿에서는 traits 배열 생성을 확장할 수 있습니다.",
                ],
              }),
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "menu_cleanup_structure",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["categories"],
            properties: {
              categories: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["name", "description", "items"],
                  properties: {
                    name: { type: "string" },
                    description: { type: "string" },
                    items: {
                      type: "array",
                      items: {
                        type: "object",
                        additionalProperties: false,
                        required: ["name", "price", "price_label", "description", "badge_label"],
                        properties: {
                          name: { type: "string" },
                          price: { type: ["number", "null"] },
                          price_label: { type: "string" },
                          description: { type: "string" },
                          badge_label: { type: "string" },
                          // TODO: itemTraits=true 템플릿에서는 traits 배열 생성을 별도 schema로 확장한다.
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    }),
  });

  const payload = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    const errorMessage =
      payload && typeof payload === "object" && "error" in payload
        ? ((payload as { error?: { message?: string } }).error?.message ?? "AI 메뉴 정리 API 호출에 실패했습니다.")
        : "AI 메뉴 정리 API 호출에 실패했습니다.";
    throw new Error(errorMessage);
  }

  return parseMenuCleanupResponse(getTextFromOpenAIResponse(payload));
}

async function mapWithConcurrency<T, R>(items: T[], concurrency: number, mapper: (item: T, index: number) => Promise<R>) {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

async function translateTextUnits(locale: TargetTranslationLocale, textUnits: TranslationTextUnit[]) {
  const translations: Record<string, string> = {};
  const chunks = chunkItems(textUnits, CHUNK_SIZE);
  const concurrency = getTranslationConcurrency();

  logTranslationStage("chunks start", {
    locale,
    textUnitCount: textUnits.length,
    chunkSize: CHUNK_SIZE,
    chunkCount: chunks.length,
    concurrency,
  });

  const chunkTranslationGroups = await mapWithConcurrency(chunks, concurrency, (chunk, index) =>
    translateChunk(locale, chunk, {
      chunkIndex: index + 1,
      chunkCount: chunks.length,
    })
  );

  for (const chunkTranslations of chunkTranslationGroups) {
    Object.entries(chunkTranslations).forEach(([key, value]) => {
      translations[key] = normalizeTranslatedTextValue(locale, key, value);
    });
  }

  return translations;
}

function splitProtectedPriceTextUnits(textUnits: TranslationTextUnit[]) {
  const protectedText: Record<string, string> = {};
  const translatableTextUnits = textUnits.filter((unit) => {
    const fieldName = unit.key.split(":").at(-1) ?? "";
    if (isProtectedLiteralField(fieldName, unit.text)) {
      protectedText[unit.key] = unit.text;
      return false;
    }

    return true;
  });

  return { protectedText, translatableTextUnits };
}

function getTextUnitMeta(key: string) {
  const [table = "unknown", entityId = "unknown", fieldName = "unknown"] = key.split(":");
  return { table, entityId, fieldName };
}

function getResidualHangulTextUnits(textUnits: TranslationTextUnit[], translatedText: Record<string, string>) {
  return textUnits.filter((unit) => {
    const translatedValue = cleanText(translatedText[unit.key]);
    return Boolean(translatedValue && hasHangul(translatedValue));
  });
}

function getMissingTextUnits(textUnits: TranslationTextUnit[], translatedText: Record<string, string>) {
  return textUnits.filter((unit) => !cleanText(translatedText[unit.key]));
}

function logMissingTextUnits(stage: string, locale: TargetTranslationLocale, units: TranslationTextUnit[]) {
  logTranslationStage(stage, {
    locale,
    count: units.length,
    samples: units.slice(0, 5).map((unit) => {
      const meta = getTextUnitMeta(unit.key);
      return {
        key: unit.key,
        table: meta.table,
        entityId: meta.entityId,
        field: meta.fieldName,
        source: unit.text,
      };
    }),
  });
}

function logResidualHangulTextUnits(stage: string, locale: TargetTranslationLocale, units: TranslationTextUnit[], translatedText: Record<string, string>) {
  logTranslationStage(stage, {
    locale,
    count: units.length,
    samples: units.slice(0, 5).map((unit) => {
      const meta = getTextUnitMeta(unit.key);
      return {
        key: unit.key,
        table: meta.table,
        entityId: meta.entityId,
        field: meta.fieldName,
        source: unit.text,
        draft: translatedText[unit.key],
      };
    }),
  });
}

async function retryMissingTextUnits(locale: TargetTranslationLocale, textUnits: TranslationTextUnit[], translatedText: Record<string, string>) {
  const missingTextUnits = getMissingTextUnits(textUnits, translatedText);

  if (missingTextUnits.length === 0) {
    return 0;
  }

  logMissingTextUnits("missing warning", locale, missingTextUnits);
  logTranslationStage("retry missing start", { locale, count: missingTextUnits.length });

  try {
    const retriedText = await translateTextUnits(locale, missingTextUnits);
    Object.entries(retriedText).forEach(([key, value]) => {
      translatedText[key] = value;
    });
    logTranslationStage("retry missing success", { locale, count: Object.keys(retriedText).length });
  } catch (error) {
    logTranslationStage("retry missing failed", {
      locale,
      count: missingTextUnits.length,
      message: getErrorMessage(error),
      stack: getErrorStack(error),
    });
  }

  const remainingMissingTextUnits = getMissingTextUnits(textUnits, translatedText);

  if (remainingMissingTextUnits.length > 0) {
    logMissingTextUnits("missing remaining", locale, remainingMissingTextUnits);
  }

  return remainingMissingTextUnits.length;
}

async function retryResidualHangulTextUnits(locale: TargetTranslationLocale, textUnits: TranslationTextUnit[], translatedText: Record<string, string>) {
  const residualTextUnits = getResidualHangulTextUnits(textUnits, translatedText);

  if (residualTextUnits.length === 0) {
    return 0;
  }

  logResidualHangulTextUnits("untranslated warning", locale, residualTextUnits, translatedText);
  logTranslationStage("retry untranslated start", { locale, count: residualTextUnits.length });

  try {
    const retriedText = await translateTextUnits(locale, residualTextUnits);
    Object.entries(retriedText).forEach(([key, value]) => {
      translatedText[key] = value;
    });
    logTranslationStage("retry untranslated success", { locale, count: Object.keys(retriedText).length });
  } catch (error) {
    logTranslationStage("retry untranslated failed", {
      locale,
      count: residualTextUnits.length,
      message: getErrorMessage(error),
      stack: getErrorStack(error),
    });
  }

  const remainingResidualTextUnits = getResidualHangulTextUnits(textUnits, translatedText);

  if (remainingResidualTextUnits.length > 0) {
    logResidualHangulTextUnits("untranslated remaining", locale, remainingResidualTextUnits, translatedText);
  }

  return remainingResidualTextUnits.length;
}

function logTranslationFailure(context: {
  mode: "update" | "draft";
  menuSiteId: string;
  locale: TargetTranslationLocale;
  entityCount: number;
  textUnitCount: number;
  translatableTextUnitCount: number;
  protectedTextUnitCount: number;
  error: unknown;
}) {
  console.error(`[localization:auto-translate] failed ${formatLogContext({
    mode: context.mode,
    menuSiteId: context.menuSiteId,
    locale: context.locale,
    entityCount: context.entityCount,
    textUnitCount: context.textUnitCount,
    translatableTextUnitCount: context.translatableTextUnitCount,
    protectedTextUnitCount: context.protectedTextUnitCount,
    message: getErrorMessage(context.error),
    stack: getErrorStack(context.error),
  })}`);
}

function logTranslationStage(stage: string, context: Record<string, unknown>) {
  console.info(`[localization:auto-translate] ${stage} ${formatLogContext(context)}`);
}

export async function translatePartialMenuItemFields(
  locale: TargetTranslationLocale,
  source: PartialMenuItemTranslationInput
) {
  const sourceFields = {
    name: source.name,
    set_name: source.set_name,
    description: source.description,
    price_label: source.price_label,
    portion_label: source.portion_label,
    badge_label: source.badge_label,
  };
  const textUnits = Object.entries(sourceFields).flatMap(([fieldName, rawValue]) => {
    const text = cleanText(rawValue);
    if (!text) return [];

    return [
      {
        key: `menu_item_translations:partial:${fieldName}`,
        text,
      },
    ];
  });
  const { protectedText, translatableTextUnits } = splitProtectedPriceTextUnits(textUnits);

  if (textUnits.length === 0) {
    throw new Error("번역할 내용이 없습니다.");
  }

  const translations =
    translatableTextUnits.length > 0
      ? await translateChunk(locale, [
          ...translatableTextUnits,
          ...(source.categoryName
            ? [{ key: "context:category", text: `Category context: ${source.categoryName}` }]
            : []),
          ...(source.restaurantName
            ? [{ key: "context:restaurant", text: `Restaurant context: ${source.restaurantName}` }]
            : []),
        ])
      : {};
  const translatedText = { ...protectedText, ...translations };

  return textUnits.reduce<Record<string, string>>((result, unit) => {
    const fieldName = unit.key.split(":").at(-1);
    const value = cleanText(translatedText[unit.key]);
    if (fieldName && value) {
      result[fieldName] = normalizeTranslatedTextValue(locale, unit.key, value);
    }
    return result;
  }, {});
}

export async function translatePartialMenuCategoryFields(
  locale: TargetTranslationLocale,
  source: PartialMenuCategoryTranslationInput
) {
  const sourceFields = {
    name: source.name,
    description: source.description,
    course_price_label: source.course_price_label,
    course_price_description: source.course_price_description,
  };
  const textUnits = Object.entries(sourceFields).flatMap(([fieldName, rawValue]) => {
    const text = cleanText(rawValue);
    if (!text) return [];

    return [
      {
        key: `menu_category_translations:partial:${fieldName}`,
        text,
      },
    ];
  });

  if (textUnits.length === 0) {
    throw new Error("번역할 내용이 없습니다.");
  }

  const translations = await translateChunk(locale, [
    ...textUnits,
    ...(source.restaurantName
      ? [{ key: "context:restaurant", text: `Restaurant context: ${source.restaurantName}` }]
      : []),
  ]);

  return textUnits.reduce<Record<string, string>>((result, unit) => {
    const fieldName = unit.key.split(":").at(-1);
    const value = cleanText(translations[unit.key]);
    if (fieldName && value) {
      result[fieldName] = normalizeTranslatedTextValue(locale, unit.key, value);
    }
    return result;
  }, {});
}

export async function translatePartialMenuHeroFields(
  locale: TargetTranslationLocale,
  source: PartialMenuHeroTranslationInput
) {
  const sourceFields = {
    restaurant_name: source.restaurant_name,
    brand_description: source.brand_description,
    menu_cover_label: source.menu_cover_label,
    menu_cover_title: source.menu_cover_title,
    menu_cover_description: source.menu_cover_description,
    opening_hours: source.opening_hours,
    restaurant_address: source.restaurant_address,
    restaurant_phone: source.restaurant_phone,
  };
  const textUnits = Object.entries(sourceFields).flatMap(([fieldName, rawValue]) => {
    const text = cleanText(rawValue);
    if (!text) return [];

    return [
      {
        key: `menu_site_translations:partial:${fieldName}`,
        text,
      },
    ];
  });

  if (textUnits.length === 0) {
    throw new Error("번역할 내용이 없습니다.");
  }

  const translations = await translateChunk(locale, [
    ...textUnits,
    ...(source.restaurantCategory
      ? [{ key: "context:restaurant_category", text: `Restaurant category context: ${source.restaurantCategory}` }]
      : []),
  ]);

  return textUnits.reduce<Record<string, string>>((result, unit) => {
    const fieldName = unit.key.split(":").at(-1);
    const value = cleanText(translations[unit.key]);
    if (fieldName && value) {
      result[fieldName] = normalizeTranslatedTextValue(locale, unit.key, value);
    }
    return result;
  }, {});
}

async function loadTranslationEntities(supabase: Supabase, menuSiteId: string) {
  const [
    siteResult,
    pagesResult,
    categoriesResult,
    itemsResult,
    priceOptionsResult,
    traitsResult,
    eventsResult,
    chefsResult,
    socialLinksResult,
    promotionsResult,
    widgetsResult,
  ] = await Promise.all([
    supabase
      .from("menu_sites")
      .select(
        "id, template_key, template_category, restaurant_name, restaurant_category, restaurant_address, restaurant_phone, brand_description, intro_title, intro_description, menu_cover_title, menu_cover_description, menu_cover_label, about_description, opening_hours, description, settings"
      )
      .eq("id", menuSiteId)
      .maybeSingle(),
    supabase.from("menu_pages").select("id, title, description").eq("menu_site_id", menuSiteId),
    supabase
      .from("menu_categories")
      .select("id, name, description, course_price_label, course_price_description" as never)
      .eq("menu_site_id", menuSiteId),
    supabase.from("menu_items").select("id, name, set_name, description, price_label, portion_label, badge_label, origin_info").eq("menu_site_id", menuSiteId),
    supabase.from("menu_item_price_options").select("id, label, price_label").eq("menu_site_id", menuSiteId),
    supabase.from("menu_item_traits").select("id, label").eq("menu_site_id", menuSiteId),
    supabase
      .from("menu_events")
      .select("id, event_title, event_subtitle, event_description, event_period, event_benefit, event_detail, event_regular_price_label, event_sale_price_label")
      .eq("menu_site_id", menuSiteId),
    supabase.from("menu_chefs").select("id, chef_name, chef_role, chef_description").eq("menu_site_id", menuSiteId),
    supabase.from("menu_social_links").select("id, label").eq("menu_site_id", menuSiteId),
    supabase
      .from("menu_promotions")
      .select("id, settings")
      .eq("menu_site_id", menuSiteId)
      .eq("type", TIME_SALE_TYPE),
    supabase
      .from("menu_widgets")
      .select("id, widget_type, title, description, visible")
      .eq("menu_site_id", menuSiteId)
      .eq("visible", true)
      .in("widget_type", ["text", "image_text"]),
  ]);

  const readErrors = [
    siteResult.error,
    pagesResult.error,
    categoriesResult.error,
    itemsResult.error,
    priceOptionsResult.error,
    traitsResult.error,
    eventsResult.error,
    chefsResult.error,
    socialLinksResult.error,
    promotionsResult.error,
    widgetsResult.error,
  ].filter(Boolean);

  if (readErrors[0]) {
    throw new Error(`번역 대상 데이터 조회에 실패했습니다: ${readErrors[0].message}`);
  }

  const templateCapabilities = getTemplateCapabilities(siteResult.data?.template_key);
  const usesBasicVisibleLocalization = templateCapabilities.footerStoreInfo;
  const usesDisplayLocalization = siteResult.data?.template_key === "display_menu_a";
  const usesBasicTimeSaleLocalization = isBasicTimeSaleTemplate(siteResult.data?.template_key, siteResult.data?.template_category);
  const menuCoverCapabilities = templateCapabilities.menuCover;
  const siteSettings = getJsonRecord(siteResult.data?.settings);
  const hasFooterNotice1 = Object.prototype.hasOwnProperty.call(siteSettings, "footer_notice_1");
  const hasFooterNotice2 = Object.prototype.hasOwnProperty.call(siteSettings, "footer_notice_2");
  const hasFooterNotice3 = Object.prototype.hasOwnProperty.call(siteSettings, "footer_notice_3");
  // Basic/CafeA footer notice translation compatibility mapping:
  // footer_notice_1/2/3 reuse opening_hours/address/phone translation columns to avoid a schema change.
  const footerNotice1 = hasFooterNotice1 ? getJsonString(siteSettings, "footer_notice_1") : siteResult.data?.opening_hours ?? "";
  const footerNotice2 = hasFooterNotice2 ? getJsonString(siteSettings, "footer_notice_2") : siteResult.data?.restaurant_address ?? "";
  const footerNotice3 = hasFooterNotice3
    ? getJsonString(siteSettings, "footer_notice_3")
    : getJsonString(siteSettings, "footer_sns_text") || getJsonString(siteSettings, "footer_note");
  const siteTranslationFields = siteResult.data
    ? usesBasicVisibleLocalization
      ? {
          restaurant_name: menuCoverCapabilities.usesStoreName ? siteResult.data.restaurant_name : null,
          brand_description: menuCoverCapabilities.usesStoreDescription ? siteResult.data.brand_description : null,
          opening_hours: footerNotice1,
          restaurant_address: footerNotice2,
          restaurant_phone: footerNotice3,
        }
      : usesDisplayLocalization
        ? {
            restaurant_name: siteResult.data.restaurant_name,
          }
      : {
          restaurant_name: menuCoverCapabilities.usesStoreName ? siteResult.data.restaurant_name : null,
          restaurant_category: siteResult.data.restaurant_category,
          brand_description: menuCoverCapabilities.usesStoreDescription ? siteResult.data.brand_description : null,
          intro_title: siteResult.data.intro_title,
          intro_description: siteResult.data.intro_description,
          menu_cover_title: menuCoverCapabilities.usesCoverTitle ? siteResult.data.menu_cover_title : null,
          menu_cover_description: menuCoverCapabilities.usesCoverDescription ? siteResult.data.menu_cover_description : null,
          menu_cover_label: menuCoverCapabilities.usesCoverLabel ? siteResult.data.menu_cover_label : null,
          about_description: siteResult.data.about_description,
          opening_hours: siteResult.data.opening_hours,
          restaurant_address: siteResult.data.restaurant_address,
          restaurant_phone: siteResult.data.restaurant_phone,
          description: siteResult.data.description,
        }
    : null;
  const entities = [
    siteResult.data && siteTranslationFields ? buildEntity("menu_site_translations", "menu_site_id", siteResult.data.id, siteTranslationFields) : null,
    ...(usesBasicVisibleLocalization || usesDisplayLocalization
      ? []
      : (pagesResult.data ?? []).map((row) =>
          buildEntity("menu_page_translations", "menu_page_id", row.id, {
            title: row.title,
            description: templateCapabilities.pageDescription ? row.description : null,
          })
        )),
    ...((categoriesResult.data ?? []) as unknown as Array<{
      id: string;
      name: string;
      description: string | null;
      course_price_label: string | null;
      course_price_description: string | null;
    }>).map((row) =>
      buildEntity("menu_category_translations", "category_id", row.id, {
        name: row.name,
        description: templateCapabilities.categoryDescription ? row.description : null,
        course_price_label: row.course_price_label,
        course_price_description: row.course_price_description,
      })
    ),
    ...(itemsResult.data ?? []).map((row) =>
      buildEntity(
        "menu_item_translations",
        "item_id",
        row.id,
        usesBasicVisibleLocalization
          ? {
              name: row.name,
              description: templateCapabilities.itemDescription ? row.description : null,
            }
          : usesDisplayLocalization
            ? {
                name: row.name,
                set_name: row.set_name,
                price_label: row.price_label,
                badge_label: row.badge_label,
              }
          : {
              name: row.name,
              set_name: row.set_name,
              description: templateCapabilities.itemDescription ? row.description : null,
              price_label: row.price_label,
              portion_label: templateCapabilities.itemPortionLabel ? row.portion_label : null,
              badge_label: row.badge_label,
              origin_info: templateCapabilities.originInfo ? row.origin_info : null,
            }
      )
    ),
    ...(usesBasicVisibleLocalization || usesDisplayLocalization || !templateCapabilities.priceOptions
      ? []
      : (priceOptionsResult.data ?? []).map((row) =>
          buildEntity("menu_item_price_option_translations", "price_option_id", row.id, { label: row.label, price_label: row.price_label })
        )),
    ...(usesBasicVisibleLocalization || usesDisplayLocalization || !templateCapabilities.itemTraits
      ? []
      : (traitsResult.data ?? []).map((row) => buildEntity("menu_item_trait_translations", "trait_id", row.id, { label: row.label }))),
    ...(usesBasicVisibleLocalization || usesDisplayLocalization || !templateCapabilities.events
      ? []
      : (eventsResult.data ?? []).map((row) =>
          buildEntity("menu_event_translations", "event_id", row.id, {
            event_title: row.event_title,
            event_subtitle: row.event_subtitle,
            event_description: row.event_description,
            event_period: row.event_period,
            event_benefit: row.event_benefit,
            event_detail: row.event_detail,
            event_regular_price_label: row.event_regular_price_label,
            event_sale_price_label: row.event_sale_price_label,
          })
        )),
    ...(usesBasicVisibleLocalization || usesDisplayLocalization || !templateCapabilities.chefs
      ? []
      : (chefsResult.data ?? []).map((row) =>
          buildEntity("menu_chef_translations", "chef_id", row.id, {
            chef_name: row.chef_name,
            chef_role: row.chef_role,
            chef_description: row.chef_description,
          })
        )),
    ...(usesBasicVisibleLocalization || usesDisplayLocalization || !templateCapabilities.socialLinks
      ? []
      : (socialLinksResult.data ?? []).map((row) => buildEntity("menu_social_link_translations", "social_link_id", row.id, { label: row.label }))),
    ...(usesBasicTimeSaleLocalization
      ? (promotionsResult.data ?? []).map((row) => {
          const settings = getJsonRecord(row.settings);
          return buildEntity("menu_promotion_translations", "menu_promotion_id", row.id, {
            badge_text: getJsonString(settings, "badge_text"),
            time_display_text: getJsonString(settings, "time_display_text"),
          });
        })
      : []),
    ...(templateCapabilities.menuWidgets.enabled
      ? (widgetsResult.data ?? []).map((row) =>
          buildEntity("menu_widget_translations", "menu_widget_id", row.id, {
            title: row.title,
            description: row.description,
          })
        )
      : []),
  ].filter((entity): entity is TranslationEntity => Boolean(entity));

  if (entities.length === 0) {
    throw new Error("번역 대상 데이터가 없습니다. 한국어 메뉴 정보를 먼저 저장해주세요.");
  }

  return entities;
}

function getEntityKey(entity: TranslationEntity, locale: TargetTranslationLocale) {
  return `${entity.table}:${locale}:${entity.id}`;
}

function getTextUnitKey(entity: TranslationEntity, fieldName: string) {
  return `${entity.table}:${entity.id}:${fieldName}`;
}

function getExistingTranslatedFieldKey(entity: TranslationEntity, locale: TargetTranslationLocale) {
  return `${entity.table}:${locale}:${entity.id}`;
}

function summarizeTextUnits(textUnits: TranslationTextUnit[]) {
  return textUnits.reduce(
    (summary, unit) => {
      const [tableName] = unit.key.split(":");
      const fieldName = unit.key.split(":").at(-1) ?? "unknown";
      summary.tableCounts[tableName] = (summary.tableCounts[tableName] ?? 0) + 1;
      summary.fieldCounts[fieldName] = (summary.fieldCounts[fieldName] ?? 0) + 1;
      return summary;
    },
    { tableCounts: {} as Record<string, number>, fieldCounts: {} as Record<string, number> }
  );
}

const translationTableSourceIdFields = {
  menu_site_translations: "menu_site_id",
  menu_page_translations: "menu_page_id",
  menu_category_translations: "category_id",
  menu_item_translations: "item_id",
  menu_item_price_option_translations: "price_option_id",
  menu_item_trait_translations: "trait_id",
  menu_event_translations: "event_id",
  menu_chef_translations: "chef_id",
  menu_social_link_translations: "social_link_id",
  menu_promotion_translations: "menu_promotion_id",
  menu_widget_translations: "menu_widget_id",
} as const satisfies Record<TranslationTable, TranslationEntity["sourceIdField"]>;

function hasCompleteTranslatedFields(row: Record<string, unknown>, entity: TranslationEntity, locale: TargetTranslationLocale) {
  return Object.entries(entity.fields).every(([fieldName, sourceText]) => {
    const translatedText = cleanText(row[fieldName]);
    if (!translatedText) return false;

    if (isPriceLabelField(fieldName) && isPriceLikeText(sourceText)) {
      return translatedText === sourceText;
    }

    if (entity.table === "menu_item_translations" && isLikelyUntranslatedMenuItemValue(sourceText, translatedText)) {
      return false;
    }

    if (entity.table === "menu_item_translations" && isAllCapsEnglishMenuItemName(fieldName, translatedText, locale)) {
      return false;
    }

    if (
      (entity.table === "menu_widget_translations" || entity.table === "menu_promotion_translations") &&
      !isTranslationFieldWithinLimit(entity.table, fieldName, translatedText)
    ) {
      return false;
    }

    return true;
  });
}

function rememberCompletedTranslationHash(
  existingHashes: Map<string, string>,
  entityByTableAndId: Map<string, TranslationEntity>,
  table: TranslationTable,
  row: Record<string, unknown>
) {
  const sourceId = cleanText(row[translationTableSourceIdFields[table]]);
  const locale = cleanText(row.locale) as TargetTranslationLocale | null;
  const sourceTextHash = cleanText(row.source_text_hash);

  if (!sourceId || !locale || !sourceTextHash || row.status !== "completed") {
    return;
  }

  const entity = entityByTableAndId.get(`${table}:${sourceId}`);
  if (!entity || sourceTextHash !== entity.sourceTextHash || !hasCompleteTranslatedFields(row, entity, locale)) {
    return;
  }

  existingHashes.set(`${table}:${locale}:${sourceId}`, sourceTextHash);
}

async function loadExistingTranslationHashes(supabase: Supabase, entities: TranslationEntity[], targetLocales: readonly TargetTranslationLocale[]) {
  const existingHashes = new Map<string, string>();
  const entityByTableAndId = new Map(entities.map((entity) => [`${entity.table}:${entity.id}`, entity]));
  const groups = entities.reduce<Record<TranslationTable, string[]>>((result, entity) => {
    result[entity.table] = [...(result[entity.table] ?? []), entity.id];
    return result;
  }, {} as Record<TranslationTable, string[]>);

  await Promise.all(
    Object.entries(groups).map(async ([table, ids]) => {
      const uniqueIds = [...new Set(ids)];
      if (uniqueIds.length === 0) return;

      switch (table as TranslationTable) {
        case "menu_site_translations": {
          const { data, error } = await supabase
            .from("menu_site_translations")
            .select("*")
            .in("menu_site_id", uniqueIds)
            .in("locale", targetLocales);
          if (error) throw new Error(`기존 번역 상태 조회에 실패했습니다: ${error.message}`);
          data?.forEach((row) => {
            rememberCompletedTranslationHash(existingHashes, entityByTableAndId, "menu_site_translations", row as Record<string, unknown>);
          });
          break;
        }
        case "menu_page_translations": {
          const { data, error } = await supabase
            .from("menu_page_translations")
            .select("*")
            .in("menu_page_id", uniqueIds)
            .in("locale", targetLocales);
          if (error) throw new Error(`기존 번역 상태 조회에 실패했습니다: ${error.message}`);
          data?.forEach((row) => {
            rememberCompletedTranslationHash(existingHashes, entityByTableAndId, "menu_page_translations", row as Record<string, unknown>);
          });
          break;
        }
        case "menu_category_translations": {
          const { data, error } = await supabase
            .from("menu_category_translations")
            .select("*")
            .in("category_id", uniqueIds)
            .in("locale", targetLocales);
          if (error) throw new Error(`기존 번역 상태 조회에 실패했습니다: ${error.message}`);
          data?.forEach((row) => {
            rememberCompletedTranslationHash(existingHashes, entityByTableAndId, "menu_category_translations", row as Record<string, unknown>);
          });
          break;
        }
        case "menu_item_translations": {
          const { data, error } = await supabase
            .from("menu_item_translations")
            .select("*")
            .in("item_id", uniqueIds)
            .in("locale", targetLocales);
          if (error) throw new Error(`기존 번역 상태 조회에 실패했습니다: ${error.message}`);
          data?.forEach((row) => {
            rememberCompletedTranslationHash(existingHashes, entityByTableAndId, "menu_item_translations", row as Record<string, unknown>);
          });
          break;
        }
        case "menu_item_price_option_translations": {
          const { data, error } = await supabase
            .from("menu_item_price_option_translations")
            .select("*")
            .in("price_option_id", uniqueIds)
            .in("locale", targetLocales);
          if (error) throw new Error(`기존 번역 상태 조회에 실패했습니다: ${error.message}`);
          data?.forEach((row) => {
            rememberCompletedTranslationHash(existingHashes, entityByTableAndId, "menu_item_price_option_translations", row as Record<string, unknown>);
          });
          break;
        }
        case "menu_item_trait_translations": {
          const { data, error } = await supabase
            .from("menu_item_trait_translations")
            .select("*")
            .in("trait_id", uniqueIds)
            .in("locale", targetLocales);
          if (error) throw new Error(`기존 번역 상태 조회에 실패했습니다: ${error.message}`);
          data?.forEach((row) => {
            rememberCompletedTranslationHash(existingHashes, entityByTableAndId, "menu_item_trait_translations", row as Record<string, unknown>);
          });
          break;
        }
        case "menu_event_translations": {
          const { data, error } = await supabase
            .from("menu_event_translations")
            .select("*")
            .in("event_id", uniqueIds)
            .in("locale", targetLocales);
          if (error) throw new Error(`기존 번역 상태 조회에 실패했습니다: ${error.message}`);
          data?.forEach((row) => {
            rememberCompletedTranslationHash(existingHashes, entityByTableAndId, "menu_event_translations", row as Record<string, unknown>);
          });
          break;
        }
        case "menu_chef_translations": {
          const { data, error } = await supabase
            .from("menu_chef_translations")
            .select("*")
            .in("chef_id", uniqueIds)
            .in("locale", targetLocales);
          if (error) throw new Error(`기존 번역 상태 조회에 실패했습니다: ${error.message}`);
          data?.forEach((row) => {
            rememberCompletedTranslationHash(existingHashes, entityByTableAndId, "menu_chef_translations", row as Record<string, unknown>);
          });
          break;
        }
        case "menu_social_link_translations": {
          const { data, error } = await supabase
            .from("menu_social_link_translations")
            .select("*")
            .in("social_link_id", uniqueIds)
            .in("locale", targetLocales);
          if (error) throw new Error(`기존 번역 상태 조회에 실패했습니다: ${error.message}`);
          data?.forEach((row) => {
            rememberCompletedTranslationHash(existingHashes, entityByTableAndId, "menu_social_link_translations", row as Record<string, unknown>);
          });
          break;
        }
        case "menu_widget_translations": {
          const { data, error } = await supabase
            .from("menu_widget_translations")
            .select("*")
            .in("menu_widget_id", uniqueIds)
            .in("locale", targetLocales);
          if (error) throw new Error(`기존 번역 상태 조회에 실패했습니다: ${error.message}`);
          data?.forEach((row) => {
            rememberCompletedTranslationHash(existingHashes, entityByTableAndId, "menu_widget_translations", row as Record<string, unknown>);
          });
          break;
        }
        case "menu_promotion_translations": {
          const { data, error } = await supabase
            .from("menu_promotion_translations")
            .select("*")
            .in("menu_promotion_id", uniqueIds)
            .in("locale", targetLocales);
          if (error) throw new Error(`기존 특가세일 번역 상태 조회에 실패했습니다: ${error.message}`);
          data?.forEach((row) => {
            rememberCompletedTranslationHash(existingHashes, entityByTableAndId, "menu_promotion_translations", row as Record<string, unknown>);
          });
          break;
        }
      }
    })
  );

  return existingHashes;
}

async function loadExistingFieldLevelTranslatedFields(
  supabase: Supabase,
  entities: TranslationEntity[],
  targetLocales: readonly TargetTranslationLocale[]
) {
  const existingTranslatedFields: ExistingTranslatedFields = new Map();

  if (targetLocales.length === 0) {
    return existingTranslatedFields;
  }

  const collectExistingFields = (rows: Record<string, unknown>[], entityById: Map<string, TranslationEntity>, sourceIdField: TranslationEntity["sourceIdField"]) => {
    rows.forEach((row) => {
      const entityId = cleanText(row[sourceIdField]);
      const locale = cleanText(row.locale) as TargetTranslationLocale | null;
      const sourceTextHash = cleanText(row.source_text_hash);

      if (!entityId || !locale || !sourceTextHash || row.status !== "completed") return;

      const entity = entityById.get(entityId);
      if (!entity || sourceTextHash !== entity.sourceTextHash) return;

      const translatedFields = Object.keys(entity.fields).reduce<Set<string>>((fields, fieldName) => {
        const translatedText = cleanText(row[fieldName]);
        if (translatedText && isTranslationFieldWithinLimit(entity.table, fieldName, translatedText)) {
          fields.add(fieldName);
        }
        return fields;
      }, new Set());

      if (translatedFields.size > 0) {
        existingTranslatedFields.set(getExistingTranslatedFieldKey(entity, locale), translatedFields);
      }
    });
  };

  const widgetEntities = entities.filter((entity) => entity.table === "menu_widget_translations");
  const widgetIds = [...new Set(widgetEntities.map((entity) => entity.id))];
  if (widgetIds.length > 0) {
    const { data, error } = await supabase
      .from("menu_widget_translations")
      .select("menu_widget_id, locale, source_text_hash, status, title, description")
      .in("menu_widget_id", widgetIds)
      .in("locale", targetLocales);

    if (error) throw new Error(`기존 위젯 번역 상태 조회에 실패했습니다: ${error.message}`);
    collectExistingFields((data ?? []) as Record<string, unknown>[], new Map(widgetEntities.map((entity) => [entity.id, entity])), "menu_widget_id");
  }

  const promotionEntities = entities.filter((entity) => entity.table === "menu_promotion_translations");
  const promotionIds = [...new Set(promotionEntities.map((entity) => entity.id))];
  if (promotionIds.length > 0) {
    const { data, error } = await supabase
      .from("menu_promotion_translations")
      .select("menu_promotion_id, locale, source_text_hash, status, badge_text, time_display_text")
      .in("menu_promotion_id", promotionIds)
      .in("locale", targetLocales);

    if (error) throw new Error(`기존 특가세일 번역 상태 조회에 실패했습니다: ${error.message}`);
    collectExistingFields((data ?? []) as Record<string, unknown>[], new Map(promotionEntities.map((entity) => [entity.id, entity])), "menu_promotion_id");
  }

  return existingTranslatedFields;
}

function getEntitiesToTranslateForLocale(
  entities: TranslationEntity[],
  locale: TargetTranslationLocale,
  existingHashes: Map<string, string>,
  existingFieldLevelTranslatedFields: ExistingTranslatedFields
) {
  let skippedEntities = 0;
  const entitiesToTranslate = entities.flatMap((entity) => {
    const existingHash = existingHashes.get(getEntityKey(entity, locale));
    if (existingHash === entity.sourceTextHash) {
      skippedEntities += 1;
      return [];
    }

    if (entity.table !== "menu_widget_translations" && entity.table !== "menu_promotion_translations") {
      return [entity];
    }

    const existingFields = existingFieldLevelTranslatedFields.get(getExistingTranslatedFieldKey(entity, locale));
    if (!existingFields || existingFields.size === 0) {
      return [entity];
    }

    const fields = Object.entries(entity.fields).reduce<Record<string, string>>((result, [fieldName, sourceText]) => {
      if (!existingFields.has(fieldName)) {
        result[fieldName] = sourceText;
      }
      return result;
    }, {});

    if (Object.keys(fields).length === 0) {
      skippedEntities += 1;
      return [];
    }

    return [
      {
        ...entity,
        fields,
      },
    ];
  });

  return { entitiesToTranslate, skippedEntities };
}

function validateTranslatedTextUnits(
  locale: TargetTranslationLocale,
  textUnits: TranslationTextUnit[],
  translatedText: Record<string, string>,
  options: { allowLikelyUntranslatedMenuItems?: boolean; allowMissingTextUnits?: boolean } = {}
) {
  const missingCount = textUnits.filter((unit) => !cleanText(translatedText[unit.key])).length;

  if (missingCount > 0) {
    if (options.allowMissingTextUnits) {
      logTranslationStage("validation warning", {
        locale,
        missingCount,
        message: "Some translated fields were missing from the AI response; leaving those draft fields empty instead of failing the full draft.",
      });
      return;
    }

    throw new Error(`번역 API 응답에서 ${missingCount}개 필드가 누락되었습니다. 다시 시도해주세요.`);
  }

  const untranslatedMenuItemCount = textUnits.filter((unit) => {
    if (!unit.key.startsWith("menu_item_translations:")) return false;

    const translatedValue = cleanText(translatedText[unit.key]);
    return translatedValue ? isLikelyUntranslatedMenuItemValue(unit.text, translatedValue) : false;
  }).length;

  if (untranslatedMenuItemCount > 0) {
    if (options.allowLikelyUntranslatedMenuItems) {
      logTranslationStage("validation warning", {
        locale,
        untranslatedMenuItemCount,
        message: "Some menu item fields still look untranslated; keeping them in the editable draft instead of failing the full draft.",
      });
      return;
    }

    throw new Error(`메뉴 아이템 ${untranslatedMenuItemCount}개가 번역되지 않은 상태로 응답되었습니다. 다시 시도해주세요.`);
  }

  const oversizedWidgetTextUnit = textUnits.find((unit) => {
    if (!unit.key.startsWith("menu_widget_translations:") && !unit.key.startsWith("menu_promotion_translations:")) return false;

    const [tableName] = unit.key.split(":");
    const fieldName = unit.key.split(":").at(-1) ?? "";
    const translatedValue = cleanText(translatedText[unit.key]);
    return Boolean(translatedValue && !isTranslationFieldWithinLimit(tableName as TranslationTable, fieldName, translatedValue));
  });

  if (oversizedWidgetTextUnit) {
    const [tableName] = oversizedWidgetTextUnit.key.split(":");
    const fieldName = oversizedWidgetTextUnit.key.split(":").at(-1) ?? "";
    const maxLength = getFieldLevelTranslationMaxLength(tableName as TranslationTable, fieldName);
    if (tableName === "menu_promotion_translations") {
      throw new Error(
        fieldName === "badge_text"
          ? `특가세일 배지 문구 번역은 ${maxLength ?? TIME_SALE_BADGE_TEXT_MAX_LENGTH}자 이하로 생성되어야 합니다.`
          : `특가세일 시간 표시 문구 번역은 ${maxLength ?? TIME_SALE_DISPLAY_TEXT_MAX_LENGTH}자 이하로 생성되어야 합니다.`
      );
    }
    throw new Error(
      fieldName === "title"
        ? `위젯 제목 번역은 ${maxLength ?? MAX_MENU_WIDGET_TITLE_LENGTH}자 이하로 생성되어야 합니다.`
        : `위젯 내용 번역은 ${maxLength ?? MAX_MENU_WIDGET_DESCRIPTION_LENGTH}자 이하로 생성되어야 합니다.`
    );
  }
}

function buildRowsForLocale(locale: TargetTranslationLocale, entities: TranslationEntity[], translatedText: Record<string, string>) {
  return entities.reduce<Record<TranslationTable, Record<string, unknown>[]>>((rowsByTable, entity) => {
    const row: Record<string, unknown> = {
      [entity.sourceIdField]: entity.id,
      locale,
      source_text_hash: entity.sourceTextHash,
      status: "completed",
      updated_at: new Date().toISOString(),
    };

    Object.keys(entity.fields).forEach((fieldName) => {
      const value = cleanText(translatedText[getTextUnitKey(entity, fieldName)]);
      row[fieldName] = value ?? null;
    });

    rowsByTable[entity.table] = [...(rowsByTable[entity.table] ?? []), row];
    return rowsByTable;
  }, {} as Record<TranslationTable, Record<string, unknown>[]>);
}

function buildDraftRows(rowsByTable: Record<TranslationTable, Record<string, unknown>[]>) {
  return Object.entries(rowsByTable).flatMap(([table, rows]) => {
    const translationTable = table as TranslationTable;
    const sourceIdField = translationTableSourceIdFields[translationTable];

    return rows.flatMap((row) => {
      const entityId = cleanText(row[sourceIdField]);
      const locale = cleanText(row.locale) as TargetTranslationLocale | null;
      const sourceTextHash = cleanText(row.source_text_hash);

      if (!entityId || !locale || !sourceTextHash) return [];

      const fields = Object.entries(row).reduce<Record<string, string | null>>((result, [key, value]) => {
        if (key === sourceIdField || key === "locale" || key === "source_text_hash" || key === "status" || key === "updated_at") {
          return result;
        }

        result[key] = cleanText(value);
        return result;
      }, {});

      return [
        {
          table: translationTable,
          entityId,
          locale,
          sourceTextHash,
          fields,
        } satisfies MenuTranslationDraftRow,
      ];
    });
  });
}

async function upsertRows(supabase: Supabase, table: TranslationTable, rows: Record<string, unknown>[]) {
  if (rows.length === 0) {
    return;
  }

  switch (table) {
    case "menu_site_translations": {
      const { error } = await supabase
        .from("menu_site_translations")
        .upsert(rows as Database["public"]["Tables"]["menu_site_translations"]["Insert"][], { onConflict: "menu_site_id,locale" });
      if (error) throw new Error(`메뉴판 번역 저장에 실패했습니다: ${error.message}`);
      return;
    }
    case "menu_page_translations": {
      const { error } = await supabase
        .from("menu_page_translations")
        .upsert(rows as Database["public"]["Tables"]["menu_page_translations"]["Insert"][], { onConflict: "menu_page_id,locale" });
      if (error) throw new Error(`메뉴 페이지 번역 저장에 실패했습니다: ${error.message}`);
      return;
    }
    case "menu_category_translations": {
      const { error } = await supabase
        .from("menu_category_translations")
        .upsert(rows as never, { onConflict: "category_id,locale" });
      if (error) throw new Error(`메뉴 카테고리 번역 저장에 실패했습니다: ${error.message}`);
      return;
    }
    case "menu_item_translations": {
      const { error } = await supabase
        .from("menu_item_translations")
        .upsert(rows as Database["public"]["Tables"]["menu_item_translations"]["Insert"][], { onConflict: "item_id,locale" });
      if (error) throw new Error(`메뉴 아이템 번역 저장에 실패했습니다: ${error.message}`);
      return;
    }
    case "menu_item_price_option_translations": {
      const { error } = await supabase
        .from("menu_item_price_option_translations")
        .upsert(rows as Database["public"]["Tables"]["menu_item_price_option_translations"]["Insert"][], { onConflict: "price_option_id,locale" });
      if (error) throw new Error(`메뉴 가격 옵션 번역 저장에 실패했습니다: ${error.message}`);
      return;
    }
    case "menu_item_trait_translations": {
      const { error } = await supabase
        .from("menu_item_trait_translations")
        .upsert(rows as Database["public"]["Tables"]["menu_item_trait_translations"]["Insert"][], { onConflict: "trait_id,locale" });
      if (error) throw new Error(`메뉴 특징 번역 저장에 실패했습니다: ${error.message}`);
      return;
    }
    case "menu_event_translations": {
      const { error } = await supabase
        .from("menu_event_translations")
        .upsert(rows as Database["public"]["Tables"]["menu_event_translations"]["Insert"][], { onConflict: "event_id,locale" });
      if (error) throw new Error(`이벤트 번역 저장에 실패했습니다: ${error.message}`);
      return;
    }
    case "menu_chef_translations": {
      const { error } = await supabase
        .from("menu_chef_translations")
        .upsert(rows as Database["public"]["Tables"]["menu_chef_translations"]["Insert"][], { onConflict: "chef_id,locale" });
      if (error) throw new Error(`셰프/인물 번역 저장에 실패했습니다: ${error.message}`);
      return;
    }
    case "menu_social_link_translations": {
      const { error } = await supabase
        .from("menu_social_link_translations")
        .upsert(rows as Database["public"]["Tables"]["menu_social_link_translations"]["Insert"][], { onConflict: "social_link_id,locale" });
      if (error) throw new Error(`SNS 링크 번역 저장에 실패했습니다: ${error.message}`);
      return;
    }
    case "menu_promotion_translations": {
      const { error } = await supabase
        .from("menu_promotion_translations")
        .upsert(rows as Database["public"]["Tables"]["menu_promotion_translations"]["Insert"][], { onConflict: "menu_promotion_id,locale" });
      if (error) throw new Error(`특가세일 번역 저장에 실패했습니다: ${error.message}`);
      return;
    }
    case "menu_widget_translations": {
      const { error } = await supabase
        .from("menu_widget_translations")
        .upsert(rows as Database["public"]["Tables"]["menu_widget_translations"]["Insert"][], { onConflict: "menu_widget_id,locale" });
      if (error) throw new Error(`위젯 번역 저장에 실패했습니다: ${error.message}`);
    }
  }
}

export async function runMenuTranslationUpdate(
  supabase: Supabase,
  menuSiteId: string,
  targetLocales: readonly TargetTranslationLocale[] = TARGET_TRANSLATION_LOCALES
): Promise<MenuTranslationUpdateResult> {
  if (targetLocales.length === 0) {
    throw new Error("자동 번역을 실행할 외국어를 먼저 선택해주세요.");
  }

  const startedAt = Date.now();
  logTranslationStage("start", { mode: "update", menuSiteId, targetLocales });
  const entities = await loadTranslationEntities(supabase, menuSiteId);
  const existingHashes = await loadExistingTranslationHashes(supabase, entities, targetLocales);
  const existingFieldLevelTranslatedFields = await loadExistingFieldLevelTranslatedFields(supabase, entities, targetLocales);
  let translatedEntities = 0;
  let skippedEntities = 0;
  let translatedTextUnits = 0;
  let savedRows = false;

  try {
    for (const locale of targetLocales) {
      const languageStartedAt = Date.now();
      const localeTranslationPlan = getEntitiesToTranslateForLocale(entities, locale, existingHashes, existingFieldLevelTranslatedFields);
      const entitiesToTranslate = localeTranslationPlan.entitiesToTranslate;
      skippedEntities += localeTranslationPlan.skippedEntities;

      const allTextUnits = entitiesToTranslate.flatMap((entity) =>
        Object.entries(entity.fields).map(([fieldName, text]) => ({
          key: getTextUnitKey(entity, fieldName),
          text,
        }))
      );
      const { protectedText, translatableTextUnits } = splitProtectedPriceTextUnits(allTextUnits);
      const allTextUnitSummary = summarizeTextUnits(allTextUnits);
      const translatableTextUnitSummary = summarizeTextUnits(translatableTextUnits);

      logTranslationStage("language start", {
        mode: "update",
        menuSiteId,
        locale,
        entityCount: entitiesToTranslate.length,
        textUnitCount: allTextUnits.length,
        translatableTextUnitCount: translatableTextUnits.length,
        protectedTextUnitCount: Object.keys(protectedText).length,
        tableCounts: allTextUnitSummary.tableCounts,
        fieldCounts: allTextUnitSummary.fieldCounts,
        translatableFieldCounts: translatableTextUnitSummary.fieldCounts,
      });

      if (allTextUnits.length === 0) {
        logTranslationStage("language done", {
          mode: "update",
          menuSiteId,
          locale,
          durationMs: Date.now() - languageStartedAt,
          skipped: true,
        });
        continue;
      }

      try {
        const translatedText =
          translatableTextUnits.length > 0
            ? { ...protectedText, ...(await translateTextUnits(locale, translatableTextUnits)) }
            : protectedText;
        if (Object.keys(translatedText).length === 0) {
          throw new Error("번역 API 결과가 비어 있습니다.");
        }
        logTranslationStage("validation start", { mode: "update", menuSiteId, locale });
        validateTranslatedTextUnits(locale, translatableTextUnits, translatedText);

        const rowsByTable = buildRowsForLocale(locale, entitiesToTranslate, translatedText);

        for (const [table, rows] of Object.entries(rowsByTable)) {
          logTranslationStage("save start", { mode: "update", menuSiteId, locale, table, rowCount: rows.length });
          await upsertRows(supabase, table as TranslationTable, rows);
          savedRows = true;
        }

        translatedEntities += entitiesToTranslate.length;
        translatedTextUnits += translatableTextUnits.length;
        logTranslationStage("language done", {
          mode: "update",
          menuSiteId,
          locale,
          durationMs: Date.now() - languageStartedAt,
        });
      } catch (error) {
        logTranslationFailure({
          mode: "update",
          menuSiteId,
          locale,
          entityCount: entitiesToTranslate.length,
          textUnitCount: allTextUnits.length,
          translatableTextUnitCount: translatableTextUnits.length,
          protectedTextUnitCount: Object.keys(protectedText).length,
          error,
        });
        throw error;
      }
    }
  } catch (error) {
    if (savedRows) {
      throw new Error(PARTIAL_TRANSLATION_FAILURE_MESSAGE, { cause: error });
    }

    throw error;
  }

  logTranslationStage("all done", {
    mode: "update",
    menuSiteId,
    durationMs: Date.now() - startedAt,
    translatedEntities,
    skippedEntities,
    translatedTextUnits,
  });

  return {
    translatedEntities,
    skippedEntities,
    translatedTextUnits,
  };
}

export async function runMenuTranslationDraft(
  supabase: Supabase,
  menuSiteId: string,
  targetLocales: readonly TargetTranslationLocale[] = TARGET_TRANSLATION_LOCALES
): Promise<MenuTranslationDraftResult> {
  if (targetLocales.length === 0) {
    throw new Error("자동 번역을 실행할 외국어를 먼저 선택해주세요.");
  }

  const startedAt = Date.now();
  logTranslationStage("start", { mode: "draft", menuSiteId, targetLocales });
  const entities = await loadTranslationEntities(supabase, menuSiteId);
  const existingHashes = await loadExistingTranslationHashes(supabase, entities, targetLocales);
  const existingFieldLevelTranslatedFields = await loadExistingFieldLevelTranslatedFields(supabase, entities, targetLocales);
  const rows: MenuTranslationDraftRow[] = [];
  const localeResults: MenuTranslationLocaleResult[] = [];
  let translatedEntities = 0;
  let skippedEntities = 0;
  let translatedTextUnits = 0;

  for (const locale of targetLocales) {
    const languageStartedAt = Date.now();
    const localeTranslationPlan = getEntitiesToTranslateForLocale(entities, locale, existingHashes, existingFieldLevelTranslatedFields);
    const entitiesToTranslate = localeTranslationPlan.entitiesToTranslate;
    skippedEntities += localeTranslationPlan.skippedEntities;

    const allTextUnits = entitiesToTranslate.flatMap((entity) =>
      Object.entries(entity.fields).map(([fieldName, text]) => ({
        key: getTextUnitKey(entity, fieldName),
        text,
      }))
    );
    const { protectedText, translatableTextUnits } = splitProtectedPriceTextUnits(allTextUnits);
    const allTextUnitSummary = summarizeTextUnits(allTextUnits);
    const translatableTextUnitSummary = summarizeTextUnits(translatableTextUnits);

    logTranslationStage("language start", {
      mode: "draft",
      menuSiteId,
      locale,
      entityCount: entitiesToTranslate.length,
      textUnitCount: allTextUnits.length,
      translatableTextUnitCount: translatableTextUnits.length,
      protectedTextUnitCount: Object.keys(protectedText).length,
      tableCounts: allTextUnitSummary.tableCounts,
      fieldCounts: allTextUnitSummary.fieldCounts,
      translatableFieldCounts: translatableTextUnitSummary.fieldCounts,
    });

    if (allTextUnits.length === 0) {
      logTranslationStage("language done", {
        mode: "draft",
        menuSiteId,
        locale,
        durationMs: Date.now() - languageStartedAt,
        skipped: true,
      });
      localeResults.push({
        locale,
        ok: true,
        draftRowCount: 0,
        translatedEntities: 0,
        translatedTextUnits: 0,
        untranslatedWarningCount: 0,
      });
      continue;
    }

    try {
      const translatedText =
        translatableTextUnits.length > 0
          ? { ...protectedText, ...(await translateTextUnits(locale, translatableTextUnits)) }
          : protectedText;

      if (Object.keys(translatedText).length === 0) {
        throw new Error("번역 API 결과가 비어 있습니다.");
      }

      const missingWarningCount = await retryMissingTextUnits(locale, translatableTextUnits, translatedText);
      const untranslatedWarningCount = await retryResidualHangulTextUnits(locale, translatableTextUnits, translatedText);

      logTranslationStage("validation start", { mode: "draft", menuSiteId, locale });
      validateTranslatedTextUnits(locale, translatableTextUnits, translatedText, {
        allowLikelyUntranslatedMenuItems: true,
        allowMissingTextUnits: true,
      });

      const rowsByTable = buildRowsForLocale(locale, entitiesToTranslate, translatedText);
      const draftRows = buildDraftRows(rowsByTable);
      rows.push(...draftRows);
      translatedEntities += entitiesToTranslate.length;
      translatedTextUnits += translatableTextUnits.length;
      localeResults.push({
        locale,
        ok: true,
        draftRowCount: draftRows.length,
        translatedEntities: entitiesToTranslate.length,
        translatedTextUnits: translatableTextUnits.length,
        untranslatedWarningCount: missingWarningCount + untranslatedWarningCount,
      });
      logTranslationStage("language done", {
        mode: "draft",
        menuSiteId,
        locale,
        durationMs: Date.now() - languageStartedAt,
        draftRowCount: draftRows.length,
        untranslatedWarningCount: missingWarningCount + untranslatedWarningCount,
      });
    } catch (error) {
      logTranslationFailure({
        mode: "draft",
        menuSiteId,
        locale,
        entityCount: entitiesToTranslate.length,
        textUnitCount: allTextUnits.length,
        translatableTextUnitCount: translatableTextUnits.length,
        protectedTextUnitCount: Object.keys(protectedText).length,
        error,
      });
      localeResults.push({
        locale,
        ok: false,
        draftRowCount: 0,
        translatedEntities: 0,
        translatedTextUnits: 0,
        untranslatedWarningCount: 0,
        error: getErrorMessage(error),
      });
    }
  }

  const untranslatedWarningCount = localeResults.reduce((total, result) => total + result.untranslatedWarningCount, 0);
  const failedLocaleResults = localeResults.filter((result) => !result.ok);

  logTranslationStage("all done", {
    mode: "draft",
    menuSiteId,
    durationMs: Date.now() - startedAt,
    translatedEntities,
    skippedEntities,
    translatedTextUnits,
    draftRowCount: rows.length,
    failedLocaleCount: failedLocaleResults.length,
    untranslatedWarningCount,
    localeResults,
  });

  return {
    translatedEntities,
    skippedEntities,
    translatedTextUnits,
    rows,
    localeResults,
  };
}
