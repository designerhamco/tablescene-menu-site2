"use client";

import { useState, useTransition } from "react";

import {
  resetDesignSettingsToTemplateDefaultAction,
  resetMenuCoverToPresetAction,
  resetMenuManagementToPresetAction,
} from "@/app/mypage/menus/actions";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

type ResetKind = "cover" | "menu" | "design";

type ResetTabActionButtonProps = {
  menuId: string;
  kind: ResetKind;
};

const resetCopy: Record<
  ResetKind,
  {
    buttonLabel: string;
    title: string;
    description: string;
    submitLabel: string;
  }
> = {
  cover: {
    buttonLabel: "샘플로 되돌리기",
    title: "커버 이미지 설정을 샘플 상태로 되돌릴까요?",
    description:
      "커버 이미지와 대표 추천 메뉴 설정이 이 템플릿의 기본 샘플 상태로 되돌아갑니다. 메뉴 목록과 기본 정보는 변경되지 않습니다.",
    submitLabel: "샘플로 되돌리기",
  },
  menu: {
    buttonLabel: "샘플로 되돌리기 준비 중",
    title: "메뉴 목록을 샘플 메뉴로 초기화할까요?",
    description:
      "샘플 복원 기능은 안전한 draft 저장 구조 적용 후 사용할 수 있습니다. 현재는 실제 데이터를 보호하기 위해 비활성화되어 있습니다.",
    submitLabel: "초기화하기",
  },
  design: {
    buttonLabel: "기본 디자인으로 되돌리기",
    title: "디자인 설정을 기본값으로 되돌릴까요?",
    description:
      "배지 색상, 한글 폰트, 배경색 등 디자인 설정이 현재 템플릿의 기본값으로 돌아갑니다. 메뉴 내용과 기본 정보는 변경되지 않습니다.",
    submitLabel: "기본 디자인으로 되돌리기",
  },
};

const resetActions = {
  cover: resetMenuCoverToPresetAction,
  menu: resetMenuManagementToPresetAction,
  design: resetDesignSettingsToTemplateDefaultAction,
} satisfies Record<ResetKind, (formData: FormData) => void | Promise<void>>;

export default function ResetTabActionButton({ menuId, kind }: ResetTabActionButtonProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const copy = resetCopy[kind];
  const action = resetActions[kind];
  const disabled = kind === "menu";

  function closeDialog() {
    if (isPending) return;
    setOpen(false);
  }

  function handleReset() {
    if (isPending) return;
    setOpen(false);
    const formData = new FormData();
    formData.set("menuId", menuId);
    startTransition(() => {
      void action(formData);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (!disabled) setOpen(true);
        }}
        disabled={disabled}
        title={disabled ? "샘플 복원 기능은 안전한 draft 저장 구조 적용 후 사용할 수 있습니다." : undefined}
        className="inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 px-5 py-3 text-sm font-bold text-zinc-700 transition-colors hover:border-zinc-400 hover:bg-white hover:text-zinc-950 disabled:cursor-not-allowed disabled:border-zinc-200 disabled:bg-zinc-100 disabled:text-zinc-400"
      >
        {copy.buttonLabel}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/45 px-5 py-8" role="presentation">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`reset-${kind}-title`}
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl"
          >
            <h2 id={`reset-${kind}-title`} className="break-keep text-xl font-black tracking-tight text-zinc-950">
              {copy.title}
            </h2>
            <p className="mt-3 break-keep text-sm font-semibold leading-relaxed text-zinc-500">{copy.description}</p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeDialog}
                disabled={isPending}
                className="inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-bold text-zinc-600 transition-colors hover:bg-zinc-100"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleReset}
                disabled={isPending}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-red-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-200 sm:w-auto"
              >
                {isPending ? (
                  <>
                    <LoadingSpinner className="h-4 w-4" />
                    적용 중...
                  </>
                ) : (
                  copy.submitLabel
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
