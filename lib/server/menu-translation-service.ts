import { createHash } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import { PARTIAL_TRANSLATION_FAILURE_MESSAGE } from "@/lib/menu-translation-errors";
import type { Database } from "@/lib/supabase/types";

export const TARGET_TRANSLATION_LOCALES = ["en", "zh", "ja"] as const;

type TargetTranslationLocale = (typeof TARGET_TRANSLATION_LOCALES)[number];
type Supabase = SupabaseClient<Database>;
type TranslationTable =
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

export type MenuTranslationUpdateResult = {
  translatedEntities: number;
  skippedEntities: number;
  translatedTextUnits: number;
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
                "You translate Korean restaurant menu content. Preserve meaning, menu style, line breaks, numbers, symbols, and brand names. For English menu item name fields, use natural Title Case like Basil Cream Latte, not ALL CAPS. Category names, badges, and price labels may preserve uppercase when appropriate. Return only valid JSON that matches the schema.",
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
        "id, restaurant_name, restaurant_category, brand_description, intro_title, intro_description, menu_cover_title, menu_cover_description, menu_cover_label, about_description, opening_hours, description"
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

  const entities = [
    siteResult.data
      ? buildEntity("menu_site_translations", "menu_site_id", siteResult.data.id, {
          restaurant_name: siteResult.data.restaurant_name,
          restaurant_category: siteResult.data.restaurant_category,
          brand_description: siteResult.data.brand_description,
          intro_title: siteResult.data.intro_title,
          intro_description: siteResult.data.intro_description,
          menu_cover_title: siteResult.data.menu_cover_title,
          menu_cover_description: siteResult.data.menu_cover_description,
          menu_cover_label: siteResult.data.menu_cover_label,
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

      const textUnits = entitiesToTranslate.flatMap((entity) =>
        Object.entries(entity.fields).map(([fieldName, text]) => ({
          key: getTextUnitKey(entity, fieldName),
          text,
        }))
      );

      if (textUnits.length === 0) {
        continue;
      }

      const translatedText = await translateTextUnits(locale, textUnits);
      if (Object.keys(translatedText).length === 0) {
        throw new Error("번역 API 결과가 비어 있습니다.");
      }
      validateTranslatedTextUnits(locale, textUnits, translatedText);

      const rowsByTable = buildRowsForLocale(locale, entitiesToTranslate, translatedText);

      for (const [table, rows] of Object.entries(rowsByTable)) {
        await upsertRows(supabase, table as TranslationTable, rows);
        savedRows = true;
      }

      translatedEntities += entitiesToTranslate.length;
      translatedTextUnits += textUnits.length;
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
