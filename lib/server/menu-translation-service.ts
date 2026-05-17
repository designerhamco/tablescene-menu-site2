import { createHash } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import { PARTIAL_TRANSLATION_FAILURE_MESSAGE } from "@/lib/menu-translation-errors";
import type { Database } from "@/lib/supabase/types";
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
  | "menu_social_link_translations";

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
    | "social_link_id";
  id: string;
  fields: Record<string, string>;
  sourceTextHash: string;
};

type TranslationTextUnit = {
  key: string;
  text: string;
};

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

export type MenuTranslationDraftResult = MenuTranslationUpdateResult & {
  rows: MenuTranslationDraftRow[];
};

export type PartialMenuItemTranslationInput = {
  name: string | null;
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
  restaurantName?: string | null;
};

export type PartialMenuHeroTranslationInput = {
  restaurant_name?: string | null;
  brand_description?: string | null;
  menu_cover_label?: string | null;
  menu_cover_title?: string | null;
  menu_cover_description?: string | null;
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

const CHUNK_SIZE = 40;
const OPENAI_RESPONSES_ENDPOINT = "https://api.openai.com/v1/responses";
const DEFAULT_TRANSLATION_MODEL = "gpt-5-nano";

const targetLanguageLabels: Record<TargetTranslationLocale, string> = {
  en: "English",
  zh: "Simplified Chinese",
  ja: "Japanese",
};

function cleanText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function hasHangul(value: string) {
  return /[가-힣]/.test(value);
}

function isLikelyUntranslatedMenuItemValue(sourceText: string, translatedText: string, locale: TargetTranslationLocale) {
  if (!hasHangul(sourceText)) return false;

  const normalizedSource = sourceText.trim();
  const normalizedTranslation = translatedText.trim();

  if (normalizedTranslation === normalizedSource) return true;
  if (locale !== "ko" && hasHangul(normalizedTranslation)) return true;

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

function isProtectedLiteralField(fieldName: string, value: string) {
  if (isPriceLabelField(fieldName)) return isPriceLikeText(value);
  return fieldName === "portion_label" && isUnitLikeText(value);
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

async function translateChunk(locale: TargetTranslationLocale, items: TranslationTextUnit[]) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY 환경변수가 설정되어 있지 않습니다.");
  }

  const model = process.env.OPENAI_TRANSLATION_MODEL || process.env.OPENAI_MODEL || DEFAULT_TRANSLATION_MODEL;
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
                "You translate Korean restaurant menu content. Preserve meaning, menu style, line breaks, numbers, symbols, and brand names. Never translate or reformat numeric prices or price-like labels: keep values such as 6.5, 6,500원, HOT 4.5 / ICE 5.0, 4,500 ~ 6,000 exactly as provided. Translate price labels only when they are meaningful text such as 문의, 시가, 무료, or 변동. Do not invent prices, currencies, or units. For English menu item name fields, use natural Title Case like Basil Cream Latte, not ALL CAPS. Category names, badges, and price labels may preserve uppercase when appropriate. Return only valid JSON that matches the schema.",
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
    }),
  });

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

async function translateTextUnits(locale: TargetTranslationLocale, textUnits: TranslationTextUnit[]) {
  const translations: Record<string, string> = {};

  for (const chunk of chunkItems(textUnits, CHUNK_SIZE)) {
    const chunkTranslations = await translateChunk(locale, chunk);
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

export async function translatePartialMenuItemFields(
  locale: TargetTranslationLocale,
  source: PartialMenuItemTranslationInput
) {
  const sourceFields = {
    name: source.name,
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
  ] = await Promise.all([
    supabase
      .from("menu_sites")
      .select(
        "id, template_key, restaurant_name, restaurant_category, brand_description, intro_title, intro_description, menu_cover_title, menu_cover_description, menu_cover_label, about_description, opening_hours, description"
      )
      .eq("id", menuSiteId)
      .maybeSingle(),
    supabase.from("menu_pages").select("id, title, description").eq("menu_site_id", menuSiteId),
    supabase.from("menu_categories").select("id, name, description").eq("menu_site_id", menuSiteId),
    supabase.from("menu_items").select("id, name, set_name, description, price_label, portion_label, badge_label, origin_info").eq("menu_site_id", menuSiteId),
    supabase.from("menu_item_price_options").select("id, label, price_label").eq("menu_site_id", menuSiteId),
    supabase.from("menu_item_traits").select("id, label").eq("menu_site_id", menuSiteId),
    supabase
      .from("menu_events")
      .select("id, event_title, event_subtitle, event_description, event_period, event_benefit, event_detail, event_regular_price_label, event_sale_price_label")
      .eq("menu_site_id", menuSiteId),
    supabase.from("menu_chefs").select("id, chef_name, chef_role, chef_description").eq("menu_site_id", menuSiteId),
    supabase.from("menu_social_links").select("id, label").eq("menu_site_id", menuSiteId),
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
  ].filter(Boolean);

  if (readErrors[0]) {
    throw new Error(`번역 대상 데이터 조회에 실패했습니다: ${readErrors[0].message}`);
  }

  const menuCoverCapabilities = getTemplateCapabilities(siteResult.data?.template_key).menuCover;
  const entities = [
    siteResult.data
      ? buildEntity("menu_site_translations", "menu_site_id", siteResult.data.id, {
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
          description: siteResult.data.description,
        })
      : null,
    ...(pagesResult.data ?? []).map((row) => buildEntity("menu_page_translations", "menu_page_id", row.id, { title: row.title, description: row.description })),
    ...(categoriesResult.data ?? []).map((row) => buildEntity("menu_category_translations", "category_id", row.id, { name: row.name, description: row.description })),
    ...(itemsResult.data ?? []).map((row) =>
      buildEntity("menu_item_translations", "item_id", row.id, {
        name: row.name,
        set_name: row.set_name,
        description: row.description,
        price_label: row.price_label,
        portion_label: row.portion_label,
        badge_label: row.badge_label,
        origin_info: row.origin_info,
      })
    ),
    ...(priceOptionsResult.data ?? []).map((row) =>
      buildEntity("menu_item_price_option_translations", "price_option_id", row.id, { label: row.label, price_label: row.price_label })
    ),
    ...(traitsResult.data ?? []).map((row) => buildEntity("menu_item_trait_translations", "trait_id", row.id, { label: row.label })),
    ...(eventsResult.data ?? []).map((row) =>
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
    ),
    ...(chefsResult.data ?? []).map((row) =>
      buildEntity("menu_chef_translations", "chef_id", row.id, {
        chef_name: row.chef_name,
        chef_role: row.chef_role,
        chef_description: row.chef_description,
      })
    ),
    ...(socialLinksResult.data ?? []).map((row) => buildEntity("menu_social_link_translations", "social_link_id", row.id, { label: row.label })),
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
} as const satisfies Record<TranslationTable, TranslationEntity["sourceIdField"]>;

function hasCompleteTranslatedFields(row: Record<string, unknown>, entity: TranslationEntity, locale: TargetTranslationLocale) {
  return Object.entries(entity.fields).every(([fieldName, sourceText]) => {
    const translatedText = cleanText(row[fieldName]);
    if (!translatedText) return false;

    if (isPriceLabelField(fieldName) && isPriceLikeText(sourceText)) {
      return translatedText === sourceText;
    }

    if (entity.table === "menu_item_translations" && isLikelyUntranslatedMenuItemValue(sourceText, translatedText, locale)) {
      return false;
    }

    if (entity.table === "menu_item_translations" && isAllCapsEnglishMenuItemName(fieldName, translatedText, locale)) {
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
      }
    })
  );

  return existingHashes;
}

function validateTranslatedTextUnits(locale: TargetTranslationLocale, textUnits: TranslationTextUnit[], translatedText: Record<string, string>) {
  const missingCount = textUnits.filter((unit) => !cleanText(translatedText[unit.key])).length;

  if (missingCount > 0) {
    throw new Error(`번역 API 응답에서 ${missingCount}개 필드가 누락되었습니다. 다시 시도해주세요.`);
  }

  const untranslatedMenuItemCount = textUnits.filter((unit) => {
    if (!unit.key.startsWith("menu_item_translations:")) return false;

    const translatedValue = cleanText(translatedText[unit.key]);
    return translatedValue ? isLikelyUntranslatedMenuItemValue(unit.text, translatedValue, locale) : false;
  }).length;

  if (untranslatedMenuItemCount > 0) {
    throw new Error(`메뉴 아이템 ${untranslatedMenuItemCount}개가 번역되지 않은 상태로 응답되었습니다. 다시 시도해주세요.`);
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
        .upsert(rows as Database["public"]["Tables"]["menu_category_translations"]["Insert"][], { onConflict: "category_id,locale" });
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

  const entities = await loadTranslationEntities(supabase, menuSiteId);
  const existingHashes = await loadExistingTranslationHashes(supabase, entities, targetLocales);
  let translatedEntities = 0;
  let skippedEntities = 0;
  let translatedTextUnits = 0;
  let savedRows = false;

  try {
    for (const locale of targetLocales) {
      const entitiesToTranslate = entities.filter((entity) => {
        const existingHash = existingHashes.get(getEntityKey(entity, locale));
        if (existingHash === entity.sourceTextHash) {
          skippedEntities += 1;
          return false;
        }

        return true;
      });

      const allTextUnits = entitiesToTranslate.flatMap((entity) =>
        Object.entries(entity.fields).map(([fieldName, text]) => ({
          key: getTextUnitKey(entity, fieldName),
          text,
        }))
      );
      const { protectedText, translatableTextUnits } = splitProtectedPriceTextUnits(allTextUnits);

      if (allTextUnits.length === 0) {
        continue;
      }

      const translatedText =
        translatableTextUnits.length > 0
          ? { ...protectedText, ...(await translateTextUnits(locale, translatableTextUnits)) }
          : protectedText;
      if (Object.keys(translatedText).length === 0) {
        throw new Error("번역 API 결과가 비어 있습니다.");
      }
      validateTranslatedTextUnits(locale, translatableTextUnits, translatedText);

      const rowsByTable = buildRowsForLocale(locale, entitiesToTranslate, translatedText);

      for (const [table, rows] of Object.entries(rowsByTable)) {
        await upsertRows(supabase, table as TranslationTable, rows);
        savedRows = true;
      }

      translatedEntities += entitiesToTranslate.length;
      translatedTextUnits += translatableTextUnits.length;
    }
  } catch (error) {
    if (savedRows) {
      throw new Error(PARTIAL_TRANSLATION_FAILURE_MESSAGE, { cause: error });
    }

    throw error;
  }

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

  const entities = await loadTranslationEntities(supabase, menuSiteId);
  const existingHashes = await loadExistingTranslationHashes(supabase, entities, targetLocales);
  const rows: MenuTranslationDraftRow[] = [];
  let translatedEntities = 0;
  let skippedEntities = 0;
  let translatedTextUnits = 0;

  for (const locale of targetLocales) {
    const entitiesToTranslate = entities.filter((entity) => {
      const existingHash = existingHashes.get(getEntityKey(entity, locale));
      if (existingHash === entity.sourceTextHash) {
        skippedEntities += 1;
        return false;
      }

      return true;
    });

    const allTextUnits = entitiesToTranslate.flatMap((entity) =>
      Object.entries(entity.fields).map(([fieldName, text]) => ({
        key: getTextUnitKey(entity, fieldName),
        text,
      }))
    );
    const { protectedText, translatableTextUnits } = splitProtectedPriceTextUnits(allTextUnits);

    if (allTextUnits.length === 0) {
      continue;
    }

    const translatedText =
      translatableTextUnits.length > 0
        ? { ...protectedText, ...(await translateTextUnits(locale, translatableTextUnits)) }
        : protectedText;

    if (Object.keys(translatedText).length === 0) {
      throw new Error("번역 API 결과가 비어 있습니다.");
    }

    validateTranslatedTextUnits(locale, translatableTextUnits, translatedText);

    const rowsByTable = buildRowsForLocale(locale, entitiesToTranslate, translatedText);
    rows.push(...buildDraftRows(rowsByTable));
    translatedEntities += entitiesToTranslate.length;
    translatedTextUnits += translatableTextUnits.length;
  }

  return {
    translatedEntities,
    skippedEntities,
    translatedTextUnits,
    rows,
  };
}
