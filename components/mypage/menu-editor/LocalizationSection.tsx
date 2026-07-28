"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

import {
  generateMenuSiteTranslationDraftAction,
  translateMenuCategoryPartialAction,
  translateMenuHeroPartialAction,
  translateMenuItemPartialAction,
  updateLocalizationSettingsAction,
} from "@/app/mypage/menus/actions";
import AiUsageMeter from "@/components/mypage/menu-editor/AiUsageMeter";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import type { AiUsageSnapshot } from "@/lib/menu-ai-usage";
import { LOCALE_LABELS, TRANSLATABLE_LOCALES, type SupportedLocale } from "@/lib/locales";
import type {
  AutoTranslationDraftPatch,
  EditableTranslationField,
  EditableTranslationLocale,
  PartialTranslationResult,
  RecoverableAutoTranslationJob,
} from "@/lib/menu-localization-draft";
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
  recoverableAutoTranslationJob?: RecoverableAutoTranslationJob | null;
  editableTranslationFields: EditableTranslationField[];
  localizationStructure?: "basic" | "display" | "default";
};

type TranslationTargetGroup = EditableTranslationField["group"];

const STALE_TRANSLATION_JOB_MS = 5 * 60 * 1000;
const AI_CREDIT_BALANCE_UPDATED_EVENT = "tablescene:ai-credit-balance-updated";

function notifyAiCreditBalanceUpdated(usage?: { used: number; limit: number } | null) {
  if (!usage || typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent(AI_CREDIT_BALANCE_UPDATED_EVENT, {
      detail: {
        usedCredits: usage.used,
        totalCredits: usage.limit,
      },
    })
  );
}

function isStaleRunningJob(job: TranslationJob) {
  if (!job || (job.status !== "pending" && job.status !== "running")) return false;

  const startedAt = new Date(job.started_at ?? job.created_at).getTime();
  return Number.isFinite(startedAt) && Date.now() - startedAt > STALE_TRANSLATION_JOB_MS;
}

function getTranslationJobStatus(job: NonNullable<TranslationJob>) {
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

  return {
    label: "번역 실패",
    message: getSafeTranslationErrorMessage(job.error_message),
    tone: "text-red-700 bg-red-50 border-red-100",
    isRunning: false,
    isStale: false,
  };
}

function getDraftTranslationStatus({ hasDraftChanges, hasSavedTranslations }: { hasDraftChanges: boolean; hasSavedTranslations: boolean }) {
  if (hasDraftChanges) {
    return {
      label: "번역 초안 생성됨",
      message: "번역 초안이 생성되었습니다. 아래 직접 번역 수정 영역에서 확인한 뒤 저장하면 공개 메뉴판에 반영됩니다.",
      tone: "text-emerald-700 bg-emerald-50 border-emerald-100",
    };
  }

  if (hasSavedTranslations) {
    return {
      label: "저장된 번역 있음",
      message: "저장된 번역을 기준으로 공개 메뉴판에 표시됩니다. 필요한 경우 아래에서 수정할 수 있습니다.",
      tone: "text-emerald-700 bg-emerald-50 border-emerald-100",
    };
  }

  return {
    label: "번역 초안 없음",
    message: "아직 생성된 자동 번역 초안이 없습니다.",
    tone: "text-zinc-500 bg-zinc-50 border-zinc-100",
  };
}

function hasSavedTranslationValues(fields: EditableTranslationField[]) {
  return fields.some((field) => Object.values(field.translations).some((value) => value.trim().length > 0));
}

function HiddenMenuId({ menuId }: { menuId: string }) {
  return <input type="hidden" name="menuId" value={menuId} />;
}

function LocalizationSaveButton({ disabled = false, children = "저장" }: { disabled?: boolean; children?: ReactNode }) {
  const { pending, action } = useFormStatus();
  const isPending = pending && action === updateLocalizationSettingsAction;

  return (
    <button
      type="submit"
      disabled={disabled || isPending}
      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-zinc-950 px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
    >
      {isPending ? (
        <>
          <LoadingSpinner className="h-4 w-4" />
          저장 중...
        </>
      ) : (
        children
      )}
    </button>
  );
}

function TranslationSubmitButton({
  disabled,
  pending,
  pendingLabel,
  onClick,
}: {
  disabled?: boolean;
  pending?: boolean;
  pendingLabel?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || pending}
      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-zinc-950 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
    >
      {pending ? (
        <>
          <LoadingSpinner className="h-4 w-4" />
          {pendingLabel ?? "번역 중..."}
        </>
      ) : (
        "전체 자동 번역 초안 만들기 · 5크레딧"
      )}
    </button>
  );
}

function TranslationPendingMessage({ pending }: { pending?: boolean }) {
  if (!pending) return null;

  return (
    <p className="mt-3 break-keep rounded-lg bg-amber-50 p-3 text-xs font-bold leading-relaxed text-amber-700">
      AI가 메뉴판 전체를 번역하고 있습니다. 메뉴 수에 따라 1~3분 정도 걸릴 수 있으니 페이지를 닫거나 새로고침하지 말아주세요.
    </p>
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

type FullTranslationDraftPatch = Pick<AutoTranslationDraftPatch, "entityType" | "entityId" | "field" | "locale" | "value">;

type TranslationRunMode = "all" | "single" | "retry_failed";

type LocaleTranslationState = {
  status: "idle" | "running" | "success" | "failed" | "skipped";
  message?: string;
  jobId?: string | null;
};

function createInitialLocaleTranslationStates(): Record<EditableTranslationLocale, LocaleTranslationState> {
  return TRANSLATABLE_LOCALES.reduce(
    (result, locale) => {
      result[locale] = { status: "idle" };
      return result;
    },
    {} as Record<EditableTranslationLocale, LocaleTranslationState>
  );
}

function getLocaleTranslationStateLabel(state: LocaleTranslationState) {
  if (state.status === "running") return "번역 중";
  if (state.status === "success") return "완료";
  if (state.status === "failed") return "실패";
  if (state.status === "skipped") return "최신 상태";
  return "번역 전";
}

function getLocaleTranslationStateTone(state: LocaleTranslationState) {
  if (state.status === "running") return "border-amber-100 bg-amber-50 text-amber-700";
  if (state.status === "success") return "border-emerald-100 bg-emerald-50 text-emerald-700";
  if (state.status === "failed") return "border-red-100 bg-red-50 text-red-700";
  if (state.status === "skipped") return "border-zinc-100 bg-zinc-50 text-zinc-500";
  return "border-zinc-100 bg-white text-zinc-400";
}

const defaultTranslationTargetLabels: Record<TranslationTargetGroup, string> = {
  site: "커버 이미지",
  pages: "페이지",
  categories: "카테고리",
  items: "메뉴 아이템",
  widgets: "위젯",
};

const basicTranslationTargetLabels = {
  site: "기본 정보",
  categories: "메뉴 그룹",
  items: "메뉴 목록",
  widgets: "위젯",
} satisfies Partial<Record<TranslationTargetGroup, string>>;

const displayTranslationTargetLabels = {
  site: "기본 정보",
  categories: "메뉴 그룹",
  items: "메뉴 목록",
  widgets: "위젯",
} satisfies Partial<Record<TranslationTargetGroup, string>>;

const partialTranslationFieldAliases: Record<string, string[]> = {
  restaurant_name: ["restaurant_name", "site_name", "name"],
  brand_description: ["brand_description", "hero_description", "cover_description", "description"],
  menu_cover_label: ["menu_cover_label", "hero_label", "cover_label", "label"],
  menu_cover_title: ["menu_cover_title", "hero_title", "cover_title", "title"],
  menu_cover_description: ["menu_cover_description", "hero_description", "cover_description", "description"],
  opening_hours: ["opening_hours", "footer_notice_1", "notice_1"],
  restaurant_address: ["restaurant_address", "footer_notice_2", "notice_2"],
  restaurant_phone: ["restaurant_phone", "footer_notice_3", "notice_3"],
  name: ["name", "title"],
  set_name: ["set_name", "secondary_name", "secondaryName", "subtitle"],
  description: ["description"],
  price_label: ["price_label"],
  portion_label: ["portion_label", "serving_label", "servingLabel", "portionLabel"],
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

function groupFieldsByEntity(fields: EditableTranslationField[]) {
  return fields.reduce<{ entityId: string; groupLabel: string; fields: EditableTranslationField[] }[]>((result, field) => {
    const existingGroup = result.find((group) => group.entityId === field.entityId);
    if (existingGroup) {
      existingGroup.fields.push(field);
    } else {
      result.push({ entityId: field.entityId, groupLabel: field.groupLabel, fields: [field] });
    }
    return result;
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
  const groupedFields = groupFieldsByEntity(fields);
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
                    className="inline-flex items-center justify-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-black text-zinc-700 transition-colors hover:border-zinc-400 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
                  >
                    {pendingPartialEntityKey === `${group.fields[0]?.entityType}:${group.entityId}` ? (
                      <>
                        <LoadingSpinner className="h-3 w-3" />
                        번역 중...
                      </>
                    ) : (
                      "AI 번역 · 1크레딧"
                    )}
                  </button>
                ) : null}
              </div>
              <div className="space-y-4">
                {group.fields.map((field) => {
                  const key = getFieldKey(field);
                  const value = draftValues[key]?.[activeLocale] ?? "";
                  const Input = field.multiline ? "textarea" : "input";
                  const maxLength = field.maxLength;

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
                          maxLength={maxLength}
                          rows={field.multiline ? 3 : undefined}
                          className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold leading-relaxed text-zinc-900 outline-none transition focus:border-zinc-950"
                        />
                        {maxLength ? (
                          <span className="mt-1 block text-right text-[11px] font-bold text-zinc-400">
                            {value.length} / {maxLength}
                          </span>
                        ) : null}
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

function TranslationEditorItemGroups({
  fields,
  activeLocale,
  draftValues,
  onDraftChange,
  partialUsage,
  pendingPartialEntityKey,
  onPartialTranslate,
  title = "메뉴 아이템",
}: {
  fields: EditableTranslationField[];
  activeLocale: EditableTranslationLocale;
  draftValues: Record<string, Record<EditableTranslationLocale, string>>;
  onDraftChange: (field: EditableTranslationField, value: string) => void;
  partialUsage?: { used: number; limit: number };
  pendingPartialEntityKey?: string | null;
  onPartialTranslate?: (fields: EditableTranslationField[]) => void;
  title?: string;
}) {
  const categoryGroups = useMemo(() => {
    const groups = new Map<string, EditableTranslationField[]>();
    fields.forEach((field) => {
      const label = field.parentGroupLabel ?? "기타";
      groups.set(label, [...(groups.get(label) ?? []), field]);
    });
    return [...groups.entries()].map(([categoryLabel, categoryFields]) => ({
      categoryLabel,
      itemGroups: groupFieldsByEntity(categoryFields),
    }));
  }, [fields]);
  const firstCategoryLabel = categoryGroups[0]?.categoryLabel ?? "";
  const [openCategoryLabels, setOpenCategoryLabels] = useState(() => new Set(firstCategoryLabel ? [firstCategoryLabel] : []));

  if (fields.length === 0) return null;

  return (
    <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-4">
      <h4 className="text-sm font-black text-zinc-950">{title}</h4>
      <div className="mt-4 space-y-3">
        {categoryGroups.map((category) => {
          const isOpen = openCategoryLabels.has(category.categoryLabel);
          const itemCount = category.itemGroups.length;

          return (
            <div key={category.categoryLabel} className="rounded-lg border border-zinc-100 bg-white">
              <button
                type="button"
                onClick={() =>
                  setOpenCategoryLabels((current) => {
                    const next = new Set(current);
                    if (next.has(category.categoryLabel)) {
                      next.delete(category.categoryLabel);
                    } else {
                      next.add(category.categoryLabel);
                    }
                    return next;
                  })
                }
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
              >
                <span className="break-words text-sm font-black text-zinc-950">{category.categoryLabel} ({itemCount})</span>
                <span className="text-sm font-black text-zinc-400">{isOpen ? "▾" : "▸"}</span>
              </button>
              {isOpen ? (
                <div className="space-y-4 border-t border-zinc-100 p-4">
                  {category.itemGroups.map((group) => (
                    <TranslationEditorGroup
                      key={group.entityId}
                      title={group.groupLabel}
                      fields={group.fields}
                      activeLocale={activeLocale}
                      draftValues={draftValues}
                      onDraftChange={onDraftChange}
                      partialUsage={partialUsage}
                      pendingPartialEntityKey={pendingPartialEntityKey}
                      onPartialTranslate={onPartialTranslate}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReadOnlyTranslationFields({ fields }: { fields: EditableTranslationField[] }) {
  if (fields.length === 0) {
    return (
      <p className="break-keep rounded-lg bg-zinc-50 p-4 text-sm font-bold leading-relaxed text-zinc-500">
        이 영역에 표시할 원문이 없습니다.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {fields.map((field) => {
        const Input = field.multiline ? "textarea" : "input";

        return (
          <label key={getFieldKey(field)} className="block rounded-lg border border-zinc-100 bg-white p-4">
            <span className="text-xs font-black uppercase tracking-[0.16em] text-zinc-400">{field.groupLabel} · {field.label}</span>
            <Input
              value={field.sourceText}
              readOnly
              rows={field.multiline ? 3 : undefined}
              className="mt-2 w-full cursor-default resize-none rounded-lg border border-zinc-200 bg-zinc-100 px-3 py-2 text-sm font-semibold leading-relaxed text-zinc-700 outline-none"
            />
          </label>
        );
      })}
    </div>
  );
}

function ReadOnlyItemGroups({ fields }: { fields: EditableTranslationField[] }) {
  const categoryGroups = useMemo(() => {
    const groups = new Map<string, EditableTranslationField[]>();
    fields.forEach((field) => {
      const label = field.parentGroupLabel ?? "기타";
      groups.set(label, [...(groups.get(label) ?? []), field]);
    });
    return [...groups.entries()];
  }, [fields]);
  const firstCategoryLabel = categoryGroups[0]?.[0] ?? "";
  const [openCategoryLabels, setOpenCategoryLabels] = useState(() => new Set(firstCategoryLabel ? [firstCategoryLabel] : []));

  if (fields.length === 0) return <ReadOnlyTranslationFields fields={fields} />;

  return (
    <div className="space-y-3">
      {categoryGroups.map(([categoryLabel, categoryFields]) => {
        const isOpen = openCategoryLabels.has(categoryLabel);
        const itemCount = groupFieldsByEntity(categoryFields).length;
        return (
          <div key={categoryLabel} className="rounded-lg border border-zinc-100 bg-white">
            <button
              type="button"
              onClick={() =>
                setOpenCategoryLabels((current) => {
                  const next = new Set(current);
                  if (next.has(categoryLabel)) next.delete(categoryLabel);
                  else next.add(categoryLabel);
                  return next;
                })
              }
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
            >
              <span className="break-words text-sm font-black text-zinc-950">{categoryLabel} ({itemCount})</span>
              <span className="text-sm font-black text-zinc-400">{isOpen ? "▾" : "▸"}</span>
            </button>
            {isOpen ? <div className="border-t border-zinc-100 p-4"><ReadOnlyTranslationFields fields={categoryFields} /></div> : null}
          </div>
        );
      })}
    </div>
  );
}

function LocalizationSectionContent({
  menuId,
  enabledLocales,
  aiUsage,
  latestTranslationJob,
  recoverableAutoTranslationJob,
  editableTranslationFields,
  localizationStructure = "default",
}: LocalizationSectionProps) {
  const partialTranslationUsage = aiUsage.ai_translate_partial;
  const initialAiCreditUsage = {
    used: Math.max(aiUsage.ai_translate_full.used, partialTranslationUsage.used),
    limit: Math.max(aiUsage.ai_translate_full.limit, partialTranslationUsage.limit),
  };
  const [localFullUsage, setLocalFullUsage] = useState({
    used: initialAiCreditUsage.used,
    limit: initialAiCreditUsage.limit,
  });
  const isUsageExceeded = localFullUsage.used >= localFullUsage.limit;
  const [localPartialUsage, setLocalPartialUsage] = useState({
    used: initialAiCreditUsage.used,
    limit: initialAiCreditUsage.limit,
  });
  const [selectedLocales, setSelectedLocales] = useState<SupportedLocale[]>(enabledLocales);
  const [activeLocale, setActiveLocale] = useState<SupportedLocale>("ko");
  const [activeTargetGroup, setActiveTargetGroup] = useState<TranslationTargetGroup>("site");
  const [draftValues, setDraftValues] = useState(() => buildInitialDraft(editableTranslationFields));
  const [pendingTranslationRun, setPendingTranslationRun] = useState<"all" | EditableTranslationLocale | null>(null);
  const [localeTranslationStates, setLocaleTranslationStates] = useState(createInitialLocaleTranslationStates);
  const [pendingPartialEntityKey, setPendingPartialEntityKey] = useState<string | null>(null);
  const [overwriteRequest, setOverwriteRequest] = useState<EditableTranslationField[] | null>(null);
  const [appliedRecoveryJobId, setAppliedRecoveryJobId] = useState<string | null>(null);
  const translationTargetLabels = useMemo<Partial<Record<TranslationTargetGroup, string>>>(
    () => {
      if (localizationStructure === "basic") return basicTranslationTargetLabels;
      if (localizationStructure === "display") return displayTranslationTargetLabels;
      return defaultTranslationTargetLabels;
    },
    [localizationStructure]
  );
  const translationTargetGroups = useMemo(
    () =>
      (Object.keys(translationTargetLabels) as TranslationTargetGroup[]).filter((group) => {
        if (group !== "widgets") return true;
        return editableTranslationFields.some((field) => field.group === "widgets");
      }),
    [editableTranslationFields, translationTargetLabels]
  );
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
  const isGeneratingFullDraft = pendingTranslationRun !== null;
  const isTranslationDisabled = isGeneratingFullDraft || isUsageExceeded || !hasTargetLocales;
  const hasLocaleChanges = getNormalizedLocales(selectedLocales) !== getNormalizedLocales(enabledLocales);
  const hasTranslationChanges = JSON.stringify(draftValues) !== JSON.stringify(initialDraftValues);
  const savedTranslationsExist = hasSavedTranslationValues(editableTranslationFields);
  const translationStatus =
    latestTranslationJob && (latestTranslationJob.status === "pending" || latestTranslationJob.status === "running" || latestTranslationJob.status === "failed")
      ? getTranslationJobStatus(latestTranslationJob)
      : getDraftTranslationStatus({
          hasDraftChanges: hasTranslationChanges,
          hasSavedTranslations: savedTranslationsExist,
        });
  const fieldsByGroup = useMemo(
    () =>
      editableTranslationFields.reduce<Record<EditableTranslationField["group"], EditableTranslationField[]>>(
        (result, field) => {
          result[field.group].push(field);
          return result;
        },
        { site: [], pages: [], categories: [], items: [], widgets: [] }
      ),
    [editableTranslationFields]
  );
  const activeTargetFields = fieldsByGroup[activeTargetGroup];
  const selectedTargetLocaleLabels = selectedLocales
    .filter((locale) => locale !== "ko")
    .map((locale) => LOCALE_LABELS[locale])
    .join(" / ");
  const recoveryLocaleLabels = recoverableAutoTranslationJob?.targetLocales
    .map((locale) => LOCALE_LABELS[locale])
    .join(" / ");

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

  function applyFullTranslationDraft(patches: FullTranslationDraftPatch[]) {
    const fieldByKey = new Map(editableTranslationFields.map((field) => [`${field.entityType}:${field.entityId}:${field.field}`, field]));

    setDraftValues((current) => {
      const nextValues = { ...current };

      patches.forEach((patch) => {
        const field = fieldByKey.get(`${patch.entityType}:${patch.entityId}:${patch.field}`);
        if (!field) return;

        const currentValue = nextValues[getFieldKey(field)]?.[patch.locale] ?? field.translations[patch.locale] ?? "";
        if (currentValue.trim().length > 0) return;

        nextValues[getFieldKey(field)] = {
          ...(nextValues[getFieldKey(field)] ?? field.translations),
          [patch.locale]: patch.value,
        };
      });

      return nextValues;
    });
  }

  function applyRecoverableTranslationDraft(job: RecoverableAutoTranslationJob) {
    applyFullTranslationDraft(job.patches);
    setAppliedRecoveryJobId(job.jobId);
    toast.success("최근 자동 번역 결과를 불러왔습니다. 최종 저장을 눌러 반영해주세요.");
  }

  function applyAiCreditUsage(usage?: { used: number; limit: number } | null) {
    if (!usage) return;
    setLocalFullUsage(usage);
    setLocalPartialUsage(usage);
    notifyAiCreditBalanceUpdated(usage);
  }

  async function runTranslationDraft({
    mode,
    locale,
    retryOfJobId,
  }: {
    mode: TranslationRunMode;
    locale?: EditableTranslationLocale;
    retryOfJobId?: string | null;
  }) {
    const isAllRun = mode === "all";
    if (isGeneratingFullDraft) return;

    const targetLocales = isAllRun
      ? selectedLocales.filter((item): item is EditableTranslationLocale => item !== "ko")
      : locale
      ? [locale]
      : [];
    if (targetLocales.length === 0) {
      toast.error("자동 번역을 실행할 외국어를 먼저 선택해주세요.");
      return;
    }

    const usage = isAllRun ? localFullUsage : localPartialUsage;
    const cost = isAllRun ? 5 : 1;
    if (usage.used >= usage.limit) {
      toast.error(`AI 크레딧이 부족합니다. ${isAllRun ? "전체 자동 번역" : "언어별 자동 번역"}은 ${cost}크레딧이 필요합니다. 현재 보유 AI 크레딧: ${Math.max(0, usage.limit - usage.used)}개`);
      return;
    }

    setPendingTranslationRun(isAllRun ? "all" : targetLocales[0]);
    setLocaleTranslationStates((current) => {
      const nextStates = { ...current };
      targetLocales.forEach((targetLocale) => {
        nextStates[targetLocale] = { status: "running", jobId: retryOfJobId ?? current[targetLocale]?.jobId ?? null };
      });
      return nextStates;
    });

    try {
      const result = await generateMenuSiteTranslationDraftAction({
        menuId,
        targetLocales,
        mode,
        retryOfJobId: retryOfJobId ?? undefined,
      });

      setLocaleTranslationStates((current) => {
        const nextStates = { ...current };
        const returnedLocales = new Set<EditableTranslationLocale>();
        result.localeResults?.forEach((localeResult) => {
          returnedLocales.add(localeResult.locale);
          nextStates[localeResult.locale] = {
            status: localeResult.status,
            message: localeResult.userMessage ?? undefined,
            jobId: result.jobId ?? nextStates[localeResult.locale]?.jobId ?? null,
          };
        });
        targetLocales.forEach((targetLocale) => {
          if (!returnedLocales.has(targetLocale) && !result.ok) {
            nextStates[targetLocale] = {
              status: "failed",
              message: result.message,
              jobId: result.jobId ?? nextStates[targetLocale]?.jobId ?? null,
            };
          }
        });
        return nextStates;
      });

      if (!result.ok) {
        toast.error(result.message);
        applyAiCreditUsage(result.usage);
        return;
      }

      applyFullTranslationDraft(result.data);
      if (result.jobId && result.data.length > 0) {
        setAppliedRecoveryJobId(result.jobId);
      }
      applyAiCreditUsage(result.usage);
      if (result.overallStatus === "partial_success") {
        toast.warning(result.message);
      } else {
        toast.success(result.message);
      }
    } catch {
      toast.error("전체 자동 번역 초안 생성 중 오류가 발생했습니다. 다시 시도해주세요.");
      setLocaleTranslationStates((current) => {
        const nextStates = { ...current };
        targetLocales.forEach((targetLocale) => {
          nextStates[targetLocale] = { status: "failed", message: "자동 번역 초안 생성 중 오류가 발생했습니다." };
        });
        return nextStates;
      });
    } finally {
      setPendingTranslationRun(null);
    }
  }

  async function runPartialTranslation(fields: EditableTranslationField[]) {
    const locale = activeLocale;
    const firstField = fields[0];

    if (!firstField || locale === "ko") return;
    if (firstField.entityType !== "item" && firstField.entityType !== "category" && firstField.entityType !== "site") return;
    if (localPartialUsage.used >= localPartialUsage.limit) {
      toast.error(`AI 크레딧이 부족합니다. 부분 자동 번역은 1크레딧이 필요합니다. 현재 보유 AI 크레딧: ${Math.max(0, localPartialUsage.limit - localPartialUsage.used)}개`);
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
        applyAiCreditUsage(result.usage);
        return;
      }

      const patches = getPartialTranslationPatches(fields, result.data);
      if (patches.length === 0) {
        toast.error("번역 결과가 비어 있어 기존 번역을 변경하지 않았습니다.");
        return;
      }

      applyPartialTranslation(patches, locale);
      applyAiCreditUsage(result.usage);
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
    if (pendingPartialEntityKey) return;
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
        {appliedRecoveryJobId ? <input type="hidden" name="translation_recovery_job_id" value={appliedRecoveryJobId} /> : null}
        <section className="rounded-lg border border-zinc-100 bg-white p-5">
          <h3 className="text-lg font-bold tracking-tight text-zinc-950">다국어 설정</h3>
          <p className="mt-2 break-keep text-sm font-semibold leading-relaxed text-zinc-500">
            공개 메뉴판에서 사용할 언어를 선택하고, AI로 번역 초안을 만들 수 있습니다.
          </p>
          <div className="mt-5">
            <h4 className="text-sm font-black text-zinc-950">사용할 언어</h4>
            <p className="mt-2 break-keep text-sm font-semibold leading-relaxed text-zinc-500">
              한국어는 기본 언어로 항상 사용됩니다. 선택한 언어는 하단 저장 후 공개 메뉴판의 언어 선택에 반영됩니다.
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
          </div>

          <div className="mt-6 border-t border-zinc-100 pt-5">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <h3 className="text-lg font-bold tracking-tight text-zinc-950">AI 번역 크레딧</h3>
              <p className="mt-2 break-keep text-sm font-semibold leading-relaxed text-zinc-500">
                선택한 외국어의 번역 초안을 생성합니다. 메뉴 수에 따라 보통 1~3분 정도 걸릴 수 있습니다.
                생성된 번역은 아래 “번역 확인 및 수정” 영역에서 확인하고 저장 후 공개 메뉴판에 반영됩니다.
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <AiUsageMeter label="전체 자동 번역" used={localFullUsage.used} limit={localFullUsage.limit} />
                <AiUsageMeter label="부분 자동 번역" used={localPartialUsage.used} limit={localPartialUsage.limit} />
              </div>
              <p className="mt-3 break-keep text-xs font-bold leading-relaxed text-zinc-500">
                전체 자동 번역 초안이 실제로 생성되거나 항목별 AI 번역이 성공했을 때 계정 AI 크레딧이 차감됩니다.
              </p>
              <p className="mt-2 break-keep text-xs font-bold leading-relaxed text-zinc-400">
                AI가 생성한 번역은 참고용 초안입니다. 공개 전 실제 메뉴 정보와 일치하는지 직접 확인해주세요.
              </p>
              <p className="mt-2 break-keep text-xs font-bold leading-relaxed text-zinc-400">
                주민등록번호, 카드번호, 계좌번호, 민감정보, 제3자의 개인정보는 AI 입력창에 입력하지 마세요.
              </p>
              {!hasTargetLocales && (
                <p className="mt-3 break-keep text-sm font-bold leading-relaxed text-amber-700">자동 번역을 실행하려면 영어, 중국어, 일본어 중 하나 이상을 사용 설정해주세요.</p>
              )}
              {localFullUsage.used >= localFullUsage.limit ? (
                <p className="mt-3 break-keep text-sm font-bold leading-relaxed text-red-700">
                  AI 크레딧이 부족합니다. 전체 자동 번역은 5크레딧이 필요합니다. 현재 보유 AI 크레딧: {Math.max(0, localFullUsage.limit - localFullUsage.used)}개
                </p>
              ) : null}
              <p className={`mt-4 inline-flex rounded-full border px-3 py-1 text-xs font-bold ${translationStatus.tone}`}>
                {translationStatus.label}
              </p>
              <p className="mt-3 break-keep text-sm font-bold text-zinc-500">{translationStatus.message}</p>
            </div>
            <div className="flex shrink-0 flex-col items-stretch gap-3 md:min-w-[18rem] md:items-end">
              <div className="flex flex-wrap items-center justify-end gap-2">
                <TranslationSubmitButton
                  disabled={isTranslationDisabled}
                  pending={pendingTranslationRun === "all"}
                  pendingLabel={selectedTargetLocaleLabels ? `${selectedTargetLocaleLabels} 번역 중...` : undefined}
                  onClick={() => void runTranslationDraft({ mode: "all" })}
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-3 md:w-full">
                {TRANSLATABLE_LOCALES.map((locale) => {
                  const state = localeTranslationStates[locale];
                  const isEnabled = selectedLocales.includes(locale);
                  const isPending = pendingTranslationRun === locale;
                  const isSingleDisabled = isGeneratingFullDraft || !isEnabled || localPartialUsage.used >= localPartialUsage.limit;

                  return (
                    <div key={locale} className="rounded-lg border border-zinc-100 bg-white p-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-black text-zinc-700">{LOCALE_LABELS[locale]}</span>
                        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-black ${getLocaleTranslationStateTone(state)}`}>
                          {getLocaleTranslationStateLabel(state)}
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={isSingleDisabled}
                        onClick={() =>
                          void runTranslationDraft({
                            mode: state.status === "failed" ? "retry_failed" : "single",
                            locale,
                            retryOfJobId: state.status === "failed" ? state.jobId ?? null : null,
                          })
                        }
                        className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-black text-zinc-700 transition-colors hover:border-zinc-400 hover:bg-white disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
                      >
                        {isPending ? (
                          <>
                            <LoadingSpinner className="h-3 w-3" />
                            번역 중...
                          </>
                        ) : state.status === "failed" ? (
                          "다시 시도 · 1크레딧"
                        ) : (
                          "자동 번역 · 1크레딧"
                        )}
                      </button>
                      {state.status === "failed" && state.message ? (
                        <p className="mt-2 break-keep text-[11px] font-bold leading-relaxed text-red-600">{state.message}</p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
              <TranslationPendingMessage pending={isGeneratingFullDraft} />
            </div>
            </div>
          </div>
        </section>

        {recoverableAutoTranslationJob && appliedRecoveryJobId !== recoverableAutoTranslationJob.jobId ? (
          <section className="rounded-lg border border-emerald-100 bg-emerald-50 p-5">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h3 className="text-base font-black tracking-tight text-emerald-900">최근 자동 번역 결과가 있습니다.</h3>
                <p className="mt-2 break-keep text-sm font-bold leading-relaxed text-emerald-800">
                  {recoveryLocaleLabels ? `${recoveryLocaleLabels} 자동 번역 결과` : "최근 자동 번역 결과"}를 다시 불러올 수 있습니다.
                  기존에 입력한 번역은 덮어쓰지 않고 비어 있는 칸만 채웁니다.
                </p>
                <p className="mt-2 break-keep text-xs font-bold leading-relaxed text-emerald-700">
                  적용 가능 {recoverableAutoTranslationJob.applicableRowCount}개
                  {recoverableAutoTranslationJob.staleRowCount > 0
                    ? ` · 원문이 변경되어 제외될 결과 ${recoverableAutoTranslationJob.staleRowCount}개`
                    : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => applyRecoverableTranslationDraft(recoverableAutoTranslationJob)}
                className="inline-flex shrink-0 items-center justify-center rounded-full bg-emerald-900 px-5 py-3 text-sm font-black text-white transition-colors hover:bg-emerald-800"
              >
                최근 자동 번역 결과 불러오기
              </button>
            </div>
          </section>
        ) : null}

        <section className="rounded-lg border border-zinc-100 bg-white p-5">
          <h3 className="text-lg font-bold tracking-tight text-zinc-950">번역 확인 및 수정</h3>
          <p className="mt-2 break-keep text-sm font-semibold leading-relaxed text-zinc-500">
            {localizationStructure === "basic"
              ? "기본 정보, 메뉴 그룹, 메뉴 목록의 번역을 확인하고 필요한 문구만 직접 수정할 수 있습니다. 저장 후 공개 메뉴판의 언어 선택에 반영됩니다."
              : localizationStructure === "display"
              ? "기본 정보, 메뉴 그룹, 메뉴 목록의 번역을 확인하고 필요한 문구만 직접 수정할 수 있습니다. 저장 후 디스플레이 미리보기와 공개 화면에 반영됩니다."
              : "자동 번역 초안을 확인하고 필요한 문구만 직접 수정할 수 있습니다. 저장 후 공개 메뉴판에 반영됩니다."}
          </p>
          <p className="mt-2 break-keep text-xs font-bold leading-relaxed text-zinc-500">
            항목별 AI 번역은 각 항목 옆의 AI 번역 버튼으로 사용할 수 있으며, 부분 자동 번역은 1크레딧이 차감됩니다.
          </p>
          <p className="mt-2 break-keep text-xs font-bold leading-relaxed text-zinc-500">
            전체 자동 번역은 5크레딧, 부분 자동 번역은 1크레딧이 필요합니다. AI 크레딧이 부족하면 번역을 실행할 수 없습니다.
          </p>
          <p className="mt-2 break-keep text-xs font-bold leading-relaxed text-amber-700">
            자동 번역 초안은 비어 있는 번역 칸에만 채워지며, 이미 입력한 번역은 유지됩니다.
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
          <div className="mt-5 overflow-hidden rounded-lg border border-zinc-200 bg-white">
            <div className="flex flex-wrap border-b border-zinc-200 bg-zinc-50 p-1">
              {translationTargetGroups.map((group) => (
                <button
                  key={group}
                  type="button"
                  onClick={() => setActiveTargetGroup(group)}
                  className={`rounded-md px-4 py-2 text-sm font-black transition-colors ${
                    activeTargetGroup === group
                      ? "bg-white text-zinc-950 shadow-sm"
                      : "text-zinc-500 hover:bg-white/70 hover:text-zinc-800"
                  }`}
                >
                  {translationTargetLabels[group]}
                </button>
              ))}
            </div>

            <div className="p-4">
              {activeLocale === "ko" ? (
                <div className="space-y-4">
                  <p className="break-keep rounded-lg bg-zinc-50 p-4 text-sm font-bold leading-relaxed text-zinc-500">
                    {localizationStructure === "basic"
                      ? "한국어 원문은 기본 정보와 메뉴 관리 탭에서 수정해주세요. 이 탭에서는 자동 번역 결과를 확인하고 필요한 문구만 직접 수정할 수 있습니다."
                      : localizationStructure === "display"
                      ? "한국어 원문은 기본 정보와 메뉴 관리 탭의 메뉴 그룹, 메뉴 목록에서 수정해주세요. 이 탭에서는 번역 기준 원문만 확인할 수 있습니다."
                      : "한국어 원문은 기본 정보, 커버 이미지, 메뉴 관리 탭에서 수정해주세요. 이 탭에서는 번역 기준 원문만 확인할 수 있습니다."}
                  </p>
                  {activeTargetGroup === "items" ? <ReadOnlyItemGroups fields={activeTargetFields} /> : <ReadOnlyTranslationFields fields={activeTargetFields} />}
                </div>
              ) : editableTranslationFields.length === 0 ? (
                <p className="break-keep rounded-lg bg-zinc-50 p-4 text-sm font-bold leading-relaxed text-zinc-500">
                  번역할 수 있는 문구가 없습니다. 한국어 메뉴 정보를 먼저 저장해주세요.
                </p>
              ) : (
                <div className="space-y-5">
                  {activeTargetGroup === "items" ? (
                    <TranslationEditorItemGroups
                      fields={activeTargetFields}
                      activeLocale={activeLocale}
                      draftValues={draftValues}
                      onDraftChange={updateDraft}
                      partialUsage={localPartialUsage}
                      pendingPartialEntityKey={pendingPartialEntityKey}
                      onPartialTranslate={requestPartialTranslation}
                      title={translationTargetLabels.items ?? "메뉴 아이템"}
                    />
                  ) : (
                    <TranslationEditorGroup
                      title={translationTargetLabels[activeTargetGroup] ?? activeTargetGroup}
                      fields={activeTargetFields}
                      activeLocale={activeLocale}
                      draftValues={draftValues}
                      onDraftChange={updateDraft}
                      partialUsage={activeTargetGroup === "site" || activeTargetGroup === "categories" ? localPartialUsage : undefined}
                      pendingPartialEntityKey={pendingPartialEntityKey}
                      onPartialTranslate={activeTargetGroup === "site" || activeTargetGroup === "categories" ? requestPartialTranslation : undefined}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-center gap-3 rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-4">
          <LocalizationSaveButton disabled={!hasLocaleChanges && !hasTranslationChanges}>저장</LocalizationSaveButton>
          <p className="basis-full break-keep text-center text-xs font-bold leading-relaxed text-zinc-400">
            언어 설정과 번역 내용을 저장합니다. 저장 후 미리보기와 공개 메뉴판에 반영됩니다.
          </p>
        </div>
      </form>

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
                disabled={Boolean(pendingPartialEntityKey)}
                className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-bold text-zinc-600 transition-colors hover:border-zinc-400 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => void runPartialTranslation(overwriteRequest)}
                disabled={Boolean(pendingPartialEntityKey)}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-zinc-950 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
              >
                {pendingPartialEntityKey ? (
                  <>
                    <LoadingSpinner className="h-4 w-4" />
                    번역 중...
                  </>
                ) : (
                  "AI 번역으로 바꾸기 · 1크레딧"
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}

    </div>
  );
}

export default function LocalizationSection(props: LocalizationSectionProps) {
  const resetKey = `${getNormalizedLocales(props.enabledLocales)}:${props.latestTranslationJob?.completed_at ?? ""}:${props.recoverableAutoTranslationJob?.jobId ?? ""}:${props.editableTranslationFields
    .map((field) => `${getFieldKey(field)}:${field.sourceHash}:${field.translations.en}:${field.translations.zh}:${field.translations.ja}`)
    .join("|")}`;

  return <LocalizationSectionContent key={resetKey} {...props} />;
}
