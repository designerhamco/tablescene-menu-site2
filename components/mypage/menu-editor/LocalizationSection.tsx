"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

import {
  translateMenuCategoryPartialAction,
  translateMenuHeroPartialAction,
  translateMenuItemPartialAction,
  translateMenuSiteAction,
  updateLocalizationSettingsAction,
} from "@/app/mypage/menus/actions";
import { isAiUsageExceeded, type AiUsageSnapshot } from "@/lib/menu-ai-usage";
import { LOCALE_LABELS, TRANSLATABLE_LOCALES, type SupportedLocale } from "@/lib/locales";
import type { EditableTranslationField, EditableTranslationLocale, PartialTranslationResult } from "@/lib/menu-localization-draft";
import { getSafeTranslationErrorMessage } from "@/lib/menu-translation-errors";

type TranslationJob = {
  status: string;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
} | null;

type LocalizationSectionProps = {
  menuId: string;
  enabledLocales: SupportedLocale[];
  aiUsage: AiUsageSnapshot;
  latestTranslationJob: TranslationJob;
  editableTranslationFields: EditableTranslationField[];
};

function formatTranslationDateTime(value: string | null) {
  if (!value) return "";

  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Asia/Seoul",
  }).formatToParts(new Date(value));
  const getPart = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  const month = Number(getPart("month"));
  const day = Number(getPart("day"));

  return `${getPart("year")}. ${month}. ${day}. ${getPart("hour")}:${getPart("minute")}`;
}

const STALE_TRANSLATION_JOB_MS = 5 * 60 * 1000;

function isStaleRunningJob(job: TranslationJob) {
  if (!job || (job.status !== "pending" && job.status !== "running")) return false;

  const startedAt = new Date(job.started_at ?? job.created_at).getTime();
  return Number.isFinite(startedAt) && Date.now() - startedAt > STALE_TRANSLATION_JOB_MS;
}

function getTranslationStatus(job: TranslationJob) {
  if (!job) {
    return {
      label: "번역 전",
      message: "아직 번역 전입니다.",
      tone: "text-zinc-500 bg-zinc-50 border-zinc-100",
      isRunning: false,
      isStale: false,
    };
  }

  if (job.status === "pending" || job.status === "running") {
    const isStale = isStaleRunningJob(job);

    return {
      label: isStale ? "처리 지연" : "번역 중",
      message: isStale
        ? "자동 번역 처리가 지연되고 있습니다. 잠시 후 새로고침하거나 다시 시도해주세요."
        : "자동 번역 중입니다. 메뉴 수에 따라 30초~2분 정도 걸릴 수 있어요. 완료될 때까지 창을 닫지 말아주세요.",
      tone: "text-amber-700 bg-amber-50 border-amber-100",
      isRunning: !isStale,
      isStale,
    };
  }

  if (job.status === "completed") {
    return {
      label: "번역 완료",
      message: `자동 번역이 완료되었습니다. 마지막 번역: ${formatTranslationDateTime(job.completed_at ?? job.created_at)}`,
      tone: "text-emerald-700 bg-emerald-50 border-emerald-100",
      isRunning: false,
      isStale: false,
    };
  }

  return {
    label: "번역 실패",
    message: getSafeTranslationErrorMessage(job.error_message),
    tone: "text-red-700 bg-red-50 border-red-100",
    isRunning: false,
    isStale: false,
  };
}

function HiddenMenuId({ menuId }: { menuId: string }) {
  return <input type="hidden" name="menuId" value={menuId} />;
}

function LocalizationSaveButton({ disabled = false }: { disabled?: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-zinc-950 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
    >
      {pending ? "저장 중..." : "저장"}
    </button>
  );
}

function TranslationSubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-zinc-950 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
    >
      {pending ? "번역 중..." : "전체 자동 번역 업데이트"}
    </button>
  );
}

function TranslationPendingMessage() {
  const { pending } = useFormStatus();

  if (!pending) return null;

  return (
    <p className="mt-3 break-keep rounded-lg bg-amber-50 p-3 text-xs font-bold leading-relaxed text-amber-700">
      자동 번역 중입니다. 메뉴 수에 따라 30초~2분 정도 걸릴 수 있어요. 완료될 때까지 창을 닫지 말아주세요.
    </p>
  );
}

function UsageCard({
  title,
  description,
  used,
  limit,
  children,
}: {
  title: string;
  description: string;
  used: number;
  limit: number;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-4">
      <p className="text-sm font-black text-zinc-950">{title}</p>
      <p className="mt-2 break-keep text-xs font-bold leading-relaxed text-zinc-500">{description}</p>
      <p className="mt-3 text-sm font-bold text-zinc-600">
        이번 달 {used} / {limit}회 사용
      </p>
      {children}
    </div>
  );
}

function getFieldKey(field: EditableTranslationField) {
  return `${field.entityType}:${field.entityId}:${field.field}`;
}

function buildInitialDraft(fields: EditableTranslationField[]) {
  return fields.reduce<Record<string, Record<EditableTranslationLocale, string>>>((result, field) => {
    result[getFieldKey(field)] = { ...field.translations };
    return result;
  }, {});
}

function getNormalizedLocales(locales: SupportedLocale[]) {
  return [...locales].sort().join(",");
}

type PartialTranslationPatch = {
  field: EditableTranslationField;
  value: string;
};

const partialTranslationFieldAliases: Record<string, string[]> = {
  restaurant_name: ["restaurant_name", "site_name", "name"],
  brand_description: ["brand_description", "hero_description", "cover_description", "description"],
  menu_cover_label: ["menu_cover_label", "hero_label", "cover_label", "label"],
  menu_cover_title: ["menu_cover_title", "hero_title", "cover_title", "title"],
  menu_cover_description: ["menu_cover_description", "hero_description", "cover_description", "description"],
  name: ["name", "title"],
  description: ["description"],
  price_label: ["price_label"],
  badge_label: ["badge_label"],
};

function getPartialTranslationValue(data: PartialTranslationResult, fieldName: string) {
  const record = data as Record<string, unknown>;
  const keys = partialTranslationFieldAliases[fieldName] ?? [fieldName];

  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  return null;
}

function getPartialTranslationPatches(fields: EditableTranslationField[], data: PartialTranslationResult) {
  return fields.reduce<PartialTranslationPatch[]>((patches, field) => {
    const value = getPartialTranslationValue(data, field.field);
    if (value) patches.push({ field, value });
    return patches;
  }, []);
}

function TranslationEditorGroup({
  title,
  fields,
  activeLocale,
  draftValues,
  onDraftChange,
  partialUsage,
  pendingPartialEntityKey,
  onPartialTranslate,
}: {
  title: string;
  fields: EditableTranslationField[];
  activeLocale: EditableTranslationLocale;
  draftValues: Record<string, Record<EditableTranslationLocale, string>>;
  onDraftChange: (field: EditableTranslationField, value: string) => void;
  partialUsage?: { used: number; limit: number };
  pendingPartialEntityKey?: string | null;
  onPartialTranslate?: (fields: EditableTranslationField[]) => void;
}) {
  if (fields.length === 0) return null;
  const groupedFields = fields.reduce<{ entityId: string; groupLabel: string; fields: EditableTranslationField[] }[]>((result, field) => {
    const existingGroup = result.find((group) => group.entityId === field.entityId);
    if (existingGroup) {
      existingGroup.fields.push(field);
    } else {
      result.push({ entityId: field.entityId, groupLabel: field.groupLabel, fields: [field] });
    }
    return result;
  }, []);
  const isPartialUsageExceeded = partialUsage ? partialUsage.used >= partialUsage.limit : false;

  return (
    <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-4">
      <h4 className="text-sm font-black text-zinc-950">{title}</h4>
      <div className="mt-4 space-y-4">
        {groupedFields.map((group) => {
          return (
            <div key={group.entityId} className="rounded-lg border border-zinc-100 bg-white p-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-black text-zinc-950">{group.groupLabel}</p>
                {onPartialTranslate ? (
                  <button
                    type="button"
                    disabled={Boolean(pendingPartialEntityKey) || isPartialUsageExceeded}
                    onClick={() => onPartialTranslate(group.fields)}
                    className="inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-black text-zinc-700 transition-colors hover:border-zinc-400 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
                  >
                    {pendingPartialEntityKey === `${group.fields[0]?.entityType}:${group.entityId}` ? "번역 중..." : "AI 번역"}
                  </button>
                ) : null}
              </div>
              <div className="space-y-4">
                {group.fields.map((field) => {
                  const key = getFieldKey(field);
                  const value = draftValues[key]?.[activeLocale] ?? "";
                  const Input = field.multiline ? "textarea" : "input";

                  return (
                    <div key={key} className="grid gap-3 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-zinc-400">{field.label}</p>
                        <p className="mt-2 whitespace-pre-wrap break-keep text-sm font-bold leading-relaxed text-zinc-800">{field.sourceText}</p>
                      </div>
                      <label>
                        <span className="text-xs font-black uppercase tracking-[0.16em] text-zinc-400">{LOCALE_LABELS[activeLocale]}</span>
                        <Input
                          value={value}
                          onChange={(event) => onDraftChange(field, event.target.value)}
                          rows={field.multiline ? 3 : undefined}
                          className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold leading-relaxed text-zinc-900 outline-none transition focus:border-zinc-950"
                        />
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LocalizationSectionContent({ menuId, enabledLocales, aiUsage, latestTranslationJob, editableTranslationFields }: LocalizationSectionProps) {
  const translationStatus = getTranslationStatus(latestTranslationJob);
  const fullTranslationUsage = aiUsage.ai_translate_full;
  const partialTranslationUsage = aiUsage.ai_translate_partial;
  const isUsageExceeded = isAiUsageExceeded(fullTranslationUsage);
  const [localPartialUsage, setLocalPartialUsage] = useState({
    used: partialTranslationUsage.used,
    limit: partialTranslationUsage.limit,
  });
  const [selectedLocales, setSelectedLocales] = useState<SupportedLocale[]>(enabledLocales);
  const [activeLocale, setActiveLocale] = useState<SupportedLocale>("ko");
  const [draftValues, setDraftValues] = useState(() => buildInitialDraft(editableTranslationFields));
  const [pendingPartialEntityKey, setPendingPartialEntityKey] = useState<string | null>(null);
  const [overwriteRequest, setOverwriteRequest] = useState<EditableTranslationField[] | null>(null);
  const initialDraftValues = useMemo(() => buildInitialDraft(editableTranslationFields), [editableTranslationFields]);
  const translationDraftPayload = useMemo(
    () =>
      editableTranslationFields.map((field) => ({
        entityType: field.entityType,
        entityId: field.entityId,
        field: field.field,
        sourceHash: field.sourceHash,
        translations: draftValues[getFieldKey(field)] ?? field.translations,
      })),
    [draftValues, editableTranslationFields]
  );
  const hasTargetLocales = selectedLocales.some((locale) => locale !== "ko");
  const isTranslationDisabled = translationStatus.isRunning || isUsageExceeded || !hasTargetLocales;
  const hasLocaleChanges = getNormalizedLocales(selectedLocales) !== getNormalizedLocales(enabledLocales);
  const hasTranslationChanges = JSON.stringify(draftValues) !== JSON.stringify(initialDraftValues);
  const hasSaveChanges = hasLocaleChanges || hasTranslationChanges;
  const fieldsByGroup = useMemo(
    () =>
      editableTranslationFields.reduce<Record<EditableTranslationField["group"], EditableTranslationField[]>>(
        (result, field) => {
          result[field.group].push(field);
          return result;
        },
        { site: [], pages: [], categories: [], items: [] }
      ),
    [editableTranslationFields]
  );

  function toggleLocale(locale: EditableTranslationLocale) {
    setSelectedLocales((current) => {
      if (current.includes(locale)) {
        return current.filter((item) => item !== locale);
      }

      return ["ko", ...TRANSLATABLE_LOCALES.filter((item) => item === locale || current.includes(item))];
    });
  }

  function updateDraft(field: EditableTranslationField, value: string) {
    setDraftValues((current) => ({
      ...current,
      [getFieldKey(field)]: {
        ...(current[getFieldKey(field)] ?? field.translations),
        [activeLocale as EditableTranslationLocale]: value,
      },
    }));
  }

  function applyPartialTranslation(patches: PartialTranslationPatch[], locale: EditableTranslationLocale) {
    setDraftValues((current) => {
      const nextValues = { ...current };

      patches.forEach(({ field, value }) => {
        nextValues[getFieldKey(field)] = {
          ...(nextValues[getFieldKey(field)] ?? field.translations),
          [locale]: value,
        };
      });

      return nextValues;
    });
  }

  async function runPartialTranslation(fields: EditableTranslationField[]) {
    const locale = activeLocale;
    const firstField = fields[0];

    if (!firstField || locale === "ko") return;
    if (firstField.entityType !== "item" && firstField.entityType !== "category" && firstField.entityType !== "site") return;
    if (localPartialUsage.used >= localPartialUsage.limit) {
      toast.error("부분 자동 번역 제공량을 모두 사용했습니다.");
      return;
    }

    setPendingPartialEntityKey(`${firstField.entityType}:${firstField.entityId}`);

    try {
      const result =
        firstField.entityType === "site"
          ? await translateMenuHeroPartialAction({
              menuId,
              targetLocale: locale,
            })
          : firstField.entityType === "category"
          ? await translateMenuCategoryPartialAction({
              menuId,
              categoryId: firstField.entityId,
              targetLocale: locale,
            })
          : await translateMenuItemPartialAction({
              menuId,
              itemId: firstField.entityId,
              targetLocale: locale,
            });

      if (!result.ok) {
        toast.error(result.message);
        if (result.usage) setLocalPartialUsage(result.usage);
        return;
      }

      const patches = getPartialTranslationPatches(fields, result.data);
      if (patches.length === 0) {
        toast.error("번역 결과가 비어 있어 기존 번역을 변경하지 않았습니다.");
        return;
      }

      applyPartialTranslation(patches, locale);
      setLocalPartialUsage(result.usage);
      toast.success(result.message);
    } catch {
      toast.error("부분 자동 번역 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setPendingPartialEntityKey(null);
      setOverwriteRequest(null);
    }
  }

  function requestPartialTranslation(fields: EditableTranslationField[]) {
    if (activeLocale === "ko") return;
    const hasExistingDraft = fields.some((field) => {
      const value = draftValues[getFieldKey(field)]?.[activeLocale] ?? "";
      return value.trim().length > 0;
    });

    if (hasExistingDraft) {
      setOverwriteRequest(fields);
      return;
    }

    void runPartialTranslation(fields);
  }

  return (
    <div className="space-y-6">
      <form id="localization-settings-form" action={updateLocalizationSettingsAction} className="space-y-6">
        <HiddenMenuId menuId={menuId} />
        <input type="hidden" name="translation_draft" value={JSON.stringify(translationDraftPayload)} />
        <section className="rounded-lg border border-zinc-100 bg-white p-5">
          <h3 className="text-lg font-bold tracking-tight text-zinc-950">사용할 언어</h3>
          <p className="mt-2 break-keep text-sm font-semibold leading-relaxed text-zinc-500">
            한국어는 기본 언어로 항상 사용됩니다. 필요한 외국어만 선택해 공개 메뉴판 언어 선택에 표시할 수 있습니다.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="flex items-center justify-between gap-4 rounded-lg border border-zinc-100 bg-zinc-50 p-4 text-sm font-bold text-zinc-500">
              <span>{LOCALE_LABELS.ko}</span>
              <span className="text-xs text-emerald-700">항상 사용</span>
              <input type="checkbox" checked disabled className="h-4 w-4 accent-zinc-950" />
            </label>
            {TRANSLATABLE_LOCALES.map((locale) => (
              <label key={locale} className="flex items-center justify-between gap-4 rounded-lg border border-zinc-100 bg-zinc-50 p-4 text-sm font-bold text-zinc-700">
                <span>{LOCALE_LABELS[locale]}</span>
                <input
                  type="checkbox"
                  name="enabled_locales"
                  value={locale}
                  checked={selectedLocales.includes(locale)}
                  onChange={() => toggleLocale(locale)}
                  className="h-4 w-4 accent-zinc-950"
                />
              </label>
            ))}
          </div>
          <p className="mt-4 break-keep text-xs font-bold leading-relaxed text-zinc-400">
            언어를 꺼도 기존 번역 데이터는 삭제되지 않습니다. 다시 켜면 저장된 번역을 재사용할 수 있습니다.
          </p>
        </section>

        <section className="rounded-lg border border-zinc-100 bg-white p-5">
          <h3 className="text-lg font-bold tracking-tight text-zinc-950">직접 번역 수정</h3>
          <p className="mt-2 break-keep text-sm font-semibold leading-relaxed text-zinc-500">
            자동 번역 결과를 확인하고 필요한 문구만 직접 수정할 수 있습니다. 저장 후 공개 메뉴판에 반영됩니다.
          </p>
          <p className="mt-2 break-keep text-xs font-bold leading-relaxed text-amber-700">
            다시 자동 번역을 실행하면 직접 수정한 번역이 새 번역 결과로 덮어써질 수 있습니다.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {(["ko", ...TRANSLATABLE_LOCALES] as SupportedLocale[]).map((locale) => (
              <button
                key={locale}
                type="button"
                onClick={() => setActiveLocale(locale)}
                className={`rounded-full border px-4 py-2 text-sm font-bold transition-colors ${
                  activeLocale === locale
                    ? "border-zinc-950 bg-zinc-950 text-white"
                    : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400"
                }`}
              >
                {locale === "ko" ? "한국어 원문" : LOCALE_LABELS[locale]}
              </button>
            ))}
          </div>

          {activeLocale === "ko" ? (
            <div className="mt-5 space-y-4">
              <p className="break-keep rounded-lg bg-zinc-50 p-4 text-sm font-bold leading-relaxed text-zinc-500">
                한국어 원문은 기본 정보, 대표 영역, 메뉴 관리 탭에서 수정해주세요. 이 탭에서는 번역 기준 원문만 확인할 수 있습니다.
              </p>
              {editableTranslationFields.map((field) => (
                <div key={getFieldKey(field)} className="rounded-lg border border-zinc-100 bg-zinc-50 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-zinc-400">{field.groupLabel} · {field.label}</p>
                  <p className="mt-2 whitespace-pre-wrap break-keep text-sm font-bold leading-relaxed text-zinc-800">{field.sourceText}</p>
                </div>
              ))}
            </div>
          ) : editableTranslationFields.length === 0 ? (
            <p className="mt-5 break-keep rounded-lg bg-zinc-50 p-4 text-sm font-bold leading-relaxed text-zinc-500">
              번역할 수 있는 문구가 없습니다. 한국어 메뉴 정보를 먼저 저장해주세요.
            </p>
          ) : (
            <div className="mt-5 space-y-5">
              <TranslationEditorGroup
                title="대표 영역"
                fields={fieldsByGroup.site}
                activeLocale={activeLocale}
                draftValues={draftValues}
                onDraftChange={updateDraft}
                partialUsage={localPartialUsage}
                pendingPartialEntityKey={pendingPartialEntityKey}
                onPartialTranslate={requestPartialTranslation}
              />
              <TranslationEditorGroup title="메뉴 페이지" fields={fieldsByGroup.pages} activeLocale={activeLocale} draftValues={draftValues} onDraftChange={updateDraft} />
              <TranslationEditorGroup
                title="메뉴 카테고리"
                fields={fieldsByGroup.categories}
                activeLocale={activeLocale}
                draftValues={draftValues}
                onDraftChange={updateDraft}
                partialUsage={localPartialUsage}
                pendingPartialEntityKey={pendingPartialEntityKey}
                onPartialTranslate={requestPartialTranslation}
              />
              <TranslationEditorGroup
                title="메뉴 아이템"
                fields={fieldsByGroup.items}
                activeLocale={activeLocale}
                draftValues={draftValues}
                onDraftChange={updateDraft}
                partialUsage={localPartialUsage}
                pendingPartialEntityKey={pendingPartialEntityKey}
                onPartialTranslate={requestPartialTranslation}
              />
            </div>
          )}
        </section>

        <div className="flex flex-wrap items-center justify-center gap-3 rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-4">
          <LocalizationSaveButton disabled={!hasSaveChanges} />
        </div>
      </form>

      <section className="rounded-lg border border-zinc-100 bg-white p-5">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div>
            <h3 className="text-lg font-bold tracking-tight text-zinc-950">전체 자동 번역</h3>
            <p className="mt-2 break-keep text-sm font-semibold leading-relaxed text-zinc-500">
              메뉴판 전체 번역을 영어, 중국어, 일본어로 업데이트합니다. 번역값이 없는 필드는 공개 메뉴판에서 한국어 원문으로 표시됩니다.
            </p>
            <UsageCard
              title="전체 자동 번역 사용량"
              description="전체 자동 번역이 실제로 새 번역을 저장한 경우 1회 차감됩니다."
              used={fullTranslationUsage.used}
              limit={fullTranslationUsage.limit}
            >
              {isUsageExceeded && (
                <p className="mt-3 break-keep text-sm font-bold leading-relaxed text-red-700">이번 달 전체 자동 번역 제공량을 모두 사용했습니다.</p>
              )}
              {!hasTargetLocales && (
                <p className="mt-3 break-keep text-sm font-bold leading-relaxed text-amber-700">자동 번역을 실행하려면 영어, 중국어, 일본어 중 하나 이상을 사용 설정해주세요.</p>
              )}
            </UsageCard>
            <p className={`mt-4 inline-flex rounded-full border px-3 py-1 text-xs font-bold ${translationStatus.tone}`}>
              {translationStatus.label}
            </p>
            <p className="mt-3 break-keep text-sm font-bold text-zinc-500">{translationStatus.message}</p>
          </div>
          <form action={translateMenuSiteAction} className="flex shrink-0 flex-wrap items-center justify-end gap-3">
            <HiddenMenuId menuId={menuId} />
            <TranslationSubmitButton disabled={isTranslationDisabled} />
            <TranslationPendingMessage />
          </form>
        </div>
      </section>

      <section className="rounded-lg border border-zinc-100 bg-white p-5">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div>
            <h3 className="text-lg font-bold tracking-tight text-zinc-950">부분 자동 번역</h3>
            <p className="mt-2 break-keep text-sm font-semibold leading-relaxed text-zinc-500">
              선택한 메뉴, 카테고리, 대표 영역만 번역하는 기능입니다. 다음 단계에서 사용할 수 있도록 준비 중입니다.
            </p>
            <UsageCard
              title="부분 자동 번역 사용량"
              description="직접 번역 수정 영역에서 대표 영역, 카테고리, 메뉴 아이템을 선택해 AI 번역 초안을 만들 수 있습니다."
              used={localPartialUsage.used}
              limit={localPartialUsage.limit}
            />
          </div>
          <button
            type="button"
            disabled
            className="inline-flex shrink-0 cursor-not-allowed items-center justify-center rounded-full bg-zinc-100 px-5 py-3 text-sm font-bold text-zinc-400"
          >
            부분 자동 번역 준비 중
          </button>
        </div>
      </section>

      {overwriteRequest ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 px-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl">
            <h3 className="text-lg font-bold tracking-tight text-zinc-950">기존 번역 내용을 AI 번역 결과로 바꿀까요?</h3>
            <p className="mt-3 break-keep text-sm font-bold leading-relaxed text-zinc-500">
              저장 전까지 공개 메뉴판에는 반영되지 않습니다.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOverwriteRequest(null)}
                className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-bold text-zinc-600 transition-colors hover:border-zinc-400"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => void runPartialTranslation(overwriteRequest)}
                className="rounded-full bg-zinc-950 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-zinc-800"
              >
                AI 번역으로 바꾸기
              </button>
            </div>
          </div>
        </div>
      ) : null}

    </div>
  );
}

export default function LocalizationSection(props: LocalizationSectionProps) {
  const resetKey = `${getNormalizedLocales(props.enabledLocales)}:${props.latestTranslationJob?.completed_at ?? ""}:${props.editableTranslationFields
    .map((field) => `${getFieldKey(field)}:${field.sourceHash}:${field.translations.en}:${field.translations.zh}:${field.translations.ja}`)
    .join("|")}`;

  return <LocalizationSectionContent key={resetKey} {...props} />;
}
