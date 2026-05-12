import { createHash } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

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
const DEFAULT_TRANSLATION_MODEL = "gpt-4o-mini";

const targetLanguageLabels: Record<TargetTranslationLocale, string> = {
  en: "English",
  zh: "Simplified Chinese",
  ja: "Japanese",
};

function cleanText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
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
                "You translate Korean restaurant menu content. Preserve meaning, menu style, line breaks, numbers, symbols, and brand names. Return only valid JSON that matches the schema.",
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
    Object.assign(translations, await translateChunk(locale, chunk));
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

async function loadExistingTranslationHashes(supabase: Supabase, entities: TranslationEntity[]) {
  const existingHashes = new Map<string, string>();
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
            .select("menu_site_id, locale, source_text_hash, status")
            .in("menu_site_id", uniqueIds)
            .in("locale", TARGET_TRANSLATION_LOCALES);
          if (error) throw new Error(`기존 번역 상태 조회에 실패했습니다: ${error.message}`);
          data?.forEach((row) => {
            if (row.source_text_hash && row.status === "completed") existingHashes.set(`menu_site_translations:${row.locale}:${row.menu_site_id}`, row.source_text_hash);
          });
          break;
        }
        case "menu_page_translations": {
          const { data, error } = await supabase
            .from("menu_page_translations")
            .select("menu_page_id, locale, source_text_hash, status")
            .in("menu_page_id", uniqueIds)
            .in("locale", TARGET_TRANSLATION_LOCALES);
          if (error) throw new Error(`기존 번역 상태 조회에 실패했습니다: ${error.message}`);
          data?.forEach((row) => {
            if (row.source_text_hash && row.status === "completed") existingHashes.set(`menu_page_translations:${row.locale}:${row.menu_page_id}`, row.source_text_hash);
          });
          break;
        }
        case "menu_category_translations": {
          const { data, error } = await supabase
            .from("menu_category_translations")
            .select("category_id, locale, source_text_hash, status")
            .in("category_id", uniqueIds)
            .in("locale", TARGET_TRANSLATION_LOCALES);
          if (error) throw new Error(`기존 번역 상태 조회에 실패했습니다: ${error.message}`);
          data?.forEach((row) => {
            if (row.source_text_hash && row.status === "completed") existingHashes.set(`menu_category_translations:${row.locale}:${row.category_id}`, row.source_text_hash);
          });
          break;
        }
        case "menu_item_translations": {
          const { data, error } = await supabase
            .from("menu_item_translations")
            .select("item_id, locale, source_text_hash, status")
            .in("item_id", uniqueIds)
            .in("locale", TARGET_TRANSLATION_LOCALES);
          if (error) throw new Error(`기존 번역 상태 조회에 실패했습니다: ${error.message}`);
          data?.forEach((row) => {
            if (row.source_text_hash && row.status === "completed") existingHashes.set(`menu_item_translations:${row.locale}:${row.item_id}`, row.source_text_hash);
          });
          break;
        }
        case "menu_item_price_option_translations": {
          const { data, error } = await supabase
            .from("menu_item_price_option_translations")
            .select("price_option_id, locale, source_text_hash, status")
            .in("price_option_id", uniqueIds)
            .in("locale", TARGET_TRANSLATION_LOCALES);
          if (error) throw new Error(`기존 번역 상태 조회에 실패했습니다: ${error.message}`);
          data?.forEach((row) => {
            if (row.source_text_hash && row.status === "completed")
              existingHashes.set(`menu_item_price_option_translations:${row.locale}:${row.price_option_id}`, row.source_text_hash);
          });
          break;
        }
        case "menu_item_trait_translations": {
          const { data, error } = await supabase
            .from("menu_item_trait_translations")
            .select("trait_id, locale, source_text_hash, status")
            .in("trait_id", uniqueIds)
            .in("locale", TARGET_TRANSLATION_LOCALES);
          if (error) throw new Error(`기존 번역 상태 조회에 실패했습니다: ${error.message}`);
          data?.forEach((row) => {
            if (row.source_text_hash && row.status === "completed") existingHashes.set(`menu_item_trait_translations:${row.locale}:${row.trait_id}`, row.source_text_hash);
          });
          break;
        }
        case "menu_event_translations": {
          const { data, error } = await supabase
            .from("menu_event_translations")
            .select("event_id, locale, source_text_hash, status")
            .in("event_id", uniqueIds)
            .in("locale", TARGET_TRANSLATION_LOCALES);
          if (error) throw new Error(`기존 번역 상태 조회에 실패했습니다: ${error.message}`);
          data?.forEach((row) => {
            if (row.source_text_hash && row.status === "completed") existingHashes.set(`menu_event_translations:${row.locale}:${row.event_id}`, row.source_text_hash);
          });
          break;
        }
        case "menu_chef_translations": {
          const { data, error } = await supabase
            .from("menu_chef_translations")
            .select("chef_id, locale, source_text_hash, status")
            .in("chef_id", uniqueIds)
            .in("locale", TARGET_TRANSLATION_LOCALES);
          if (error) throw new Error(`기존 번역 상태 조회에 실패했습니다: ${error.message}`);
          data?.forEach((row) => {
            if (row.source_text_hash && row.status === "completed") existingHashes.set(`menu_chef_translations:${row.locale}:${row.chef_id}`, row.source_text_hash);
          });
          break;
        }
        case "menu_social_link_translations": {
          const { data, error } = await supabase
            .from("menu_social_link_translations")
            .select("social_link_id, locale, source_text_hash, status")
            .in("social_link_id", uniqueIds)
            .in("locale", TARGET_TRANSLATION_LOCALES);
          if (error) throw new Error(`기존 번역 상태 조회에 실패했습니다: ${error.message}`);
          data?.forEach((row) => {
            if (row.source_text_hash && row.status === "completed")
              existingHashes.set(`menu_social_link_translations:${row.locale}:${row.social_link_id}`, row.source_text_hash);
          });
          break;
        }
      }
    })
  );

  return existingHashes;
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
      const value = translatedText[getTextUnitKey(entity, fieldName)];
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

export async function runMenuTranslationUpdate(supabase: Supabase, menuSiteId: string): Promise<MenuTranslationUpdateResult> {
  const entities = await loadTranslationEntities(supabase, menuSiteId);
  const existingHashes = await loadExistingTranslationHashes(supabase, entities);
  let translatedEntities = 0;
  let skippedEntities = 0;
  let translatedTextUnits = 0;

  for (const locale of TARGET_TRANSLATION_LOCALES) {
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
    const rowsByTable = buildRowsForLocale(locale, entitiesToTranslate, translatedText);

    for (const [table, rows] of Object.entries(rowsByTable)) {
      await upsertRows(supabase, table as TranslationTable, rows);
    }

    translatedEntities += entitiesToTranslate.length;
    translatedTextUnits += textUnits.length;
  }

  return {
    translatedEntities,
    skippedEntities,
    translatedTextUnits,
  };
}
