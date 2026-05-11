"use client";

import { useState } from "react";

import {
  resetDesignSettingsToTemplateDefaultAction,
  resetMenuCoverToPresetAction,
  resetMenuManagementToPresetAction,
} from "@/app/mypage/menus/actions";

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
    title: "메뉴 커버를 샘플 상태로 되돌릴까요?",
    description:
      "대표 추천 메뉴와 메뉴 커버 영역 설정이 이 템플릿의 기본 샘플 상태로 되돌아갑니다. 메뉴 목록과 기본 정보는 변경되지 않습니다.",
    submitLabel: "샘플로 되돌리기",
  },
  menu: {
    buttonLabel: "샘플 메뉴로 초기화",
    title: "메뉴 목록을 샘플 메뉴로 초기화할까요?",
    description:
      "현재 메뉴 페이지, 메뉴 그룹, 메뉴 아이템이 이 템플릿의 기본 샘플 메뉴로 교체됩니다. 매장명, 공개 주소, 공개 상태, 결제 정보는 유지됩니다. 이 작업은 되돌릴 수 없습니다.",
    submitLabel: "초기화하기",
  },
  design: {
    buttonLabel: "템플릿 기본값으로 되돌리기",
    title: "디자인 설정을 템플릿 기본값으로 되돌릴까요?",
    description:
      "배지 색상, 글꼴, 글자 크기 등 디자인 설정이 현재 템플릿의 기본값으로 돌아갑니다. 메뉴 내용과 기본 정보는 변경되지 않습니다.",
    submitLabel: "기본값으로 되돌리기",
  },
};

const resetActions = {
  cover: resetMenuCoverToPresetAction,
  menu: resetMenuManagementToPresetAction,
  design: resetDesignSettingsToTemplateDefaultAction,
} satisfies Record<ResetKind, (formData: FormData) => void | Promise<void>>;

export default function ResetTabActionButton({ menuId, kind }: ResetTabActionButtonProps) {
  const [open, setOpen] = useState(false);
  const copy = resetCopy[kind];
  const action = resetActions[kind];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center rounded-full border border-red-100 bg-white px-4 py-2 text-xs font-bold text-red-700 transition-colors hover:bg-red-50"
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
                onClick={() => setOpen(false)}
                className="inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-bold text-zinc-600 transition-colors hover:bg-zinc-100"
              >
                취소
              </button>
              <form action={action}>
                <input type="hidden" name="menuId" value={menuId} />
                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center rounded-full bg-red-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-red-700 sm:w-auto"
                >
                  {copy.submitLabel}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
