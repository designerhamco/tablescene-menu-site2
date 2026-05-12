"use client";

import { useFormStatus } from "react-dom";

import {
  translateMenuSiteAction,
  updateLocalizationSettingsAction,
} from "@/app/mypage/menus/actions";
import { LOCALE_LABELS, TRANSLATABLE_LOCALES, type SupportedLocale } from "@/lib/locales";
import { getSafeTranslationErrorMessage } from "@/lib/menu-translation-errors";
import { isTranslationUsageExceeded, type TranslationUsage } from "@/lib/menu-translation-usage";

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
  translationUsage: TranslationUsage;
  latestTranslationJob: TranslationJob;
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

function SubmitButton({ children, disabled = false }: { children: string; disabled?: boolean }) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-zinc-950 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
    >
      {children}
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
      {pending ? "번역 중..." : "자동 번역 업데이트"}
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

export default function LocalizationSection({ menuId, enabledLocales, translationUsage, latestTranslationJob }: LocalizationSectionProps) {
  const translationStatus = getTranslationStatus(latestTranslationJob);
  const isUsageExceeded = isTranslationUsageExceeded(translationUsage);
  const hasTargetLocales = enabledLocales.some((locale) => locale !== "ko");
  const isTranslationDisabled = translationStatus.isRunning || isUsageExceeded || !hasTargetLocales;

  return (
    <div className="space-y-6">
      <form id="localization-settings-form" action={updateLocalizationSettingsAction} className="space-y-6">
        <HiddenMenuId menuId={menuId} />
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
                  defaultChecked={enabledLocales.includes(locale)}
                  className="h-4 w-4 accent-zinc-950"
                />
              </label>
            ))}
          </div>
          <p className="mt-4 break-keep text-xs font-bold leading-relaxed text-zinc-400">
            언어를 꺼도 기존 번역 데이터는 삭제되지 않습니다. 다시 켜면 저장된 번역을 재사용할 수 있습니다.
          </p>
        </section>
        <SubmitButton>다국어 설정 저장</SubmitButton>
      </form>

      <section className="rounded-lg border border-zinc-100 bg-white p-5">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div>
            <h3 className="text-lg font-bold tracking-tight text-zinc-950">자동 번역</h3>
            <p className="mt-2 break-keep text-sm font-semibold leading-relaxed text-zinc-500">
              한국어로 입력한 메뉴 정보를 영어, 중국어, 일본어로 자동 번역합니다. 번역값이 없는 필드는 공개 메뉴판에서 한국어 원문으로 표시됩니다.
            </p>
            <div className="mt-4 rounded-lg border border-zinc-100 bg-zinc-50 p-4">
              <p className="text-sm font-black text-zinc-950">자동번역 사용량</p>
              <p className="mt-1 text-sm font-bold text-zinc-600">
                이번 달 {translationUsage.monthly_used} / {translationUsage.monthly_limit}회 사용
              </p>
              <p className="mt-2 break-keep text-xs font-bold leading-relaxed text-zinc-400">번역 성공 시 1회 차감됩니다.</p>
              {isUsageExceeded && (
                <p className="mt-3 break-keep text-sm font-bold leading-relaxed text-red-700">이번 달 자동번역 제공량을 모두 사용했습니다.</p>
              )}
              {!hasTargetLocales && (
                <p className="mt-3 break-keep text-sm font-bold leading-relaxed text-amber-700">자동 번역을 실행하려면 영어, 중국어, 일본어 중 하나 이상을 사용 설정해주세요.</p>
              )}
            </div>
            <p className={`mt-4 inline-flex rounded-full border px-3 py-1 text-xs font-bold ${translationStatus.tone}`}>
              {translationStatus.label}
            </p>
            <p className="mt-3 break-keep text-sm font-bold text-zinc-500">{translationStatus.message}</p>
          </div>
          <form action={translateMenuSiteAction}>
            <HiddenMenuId menuId={menuId} />
            <TranslationSubmitButton disabled={isTranslationDisabled} />
            <TranslationPendingMessage />
          </form>
        </div>
      </section>

      <section className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-5">
        <h3 className="text-lg font-bold tracking-tight text-zinc-950">직접 번역 수정</h3>
        <p className="mt-2 break-keep text-sm font-semibold leading-relaxed text-zinc-500">
          직접 번역 수정 기능은 준비 중입니다. 현재는 자동 번역 결과를 기준으로 공개 메뉴판에 표시됩니다.
        </p>
      </section>
    </div>
  );
}
