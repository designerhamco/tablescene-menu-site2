"use client";

import { useState } from "react";
import { toast } from "sonner";

export type CoverSampleDraft = {
  menuCoverEnabled: boolean;
  menuCoverTitle?: string | null;
  menuCoverDescription?: string | null;
  coverImageUrl?: string | null;
  coverImagePath?: string | null;
  featuredItemEnabled: boolean;
  featuredItemId?: string | null;
  featuredSlides?: Array<{
    id: string;
    imageUrl: string | null;
    imagePath: string | null;
    featuredItemId: string | null;
    sortOrder: number;
  }>;
};

type CoverSampleResetButtonProps = {
  formId: string;
  sampleDraft: CoverSampleDraft | null;
};

export default function CoverSampleResetButton({ formId, sampleDraft }: CoverSampleResetButtonProps) {
  const [open, setOpen] = useState(false);
  const disabled = !sampleDraft;

  function applySampleDraft() {
    if (!sampleDraft) return;

    window.dispatchEvent(
      new CustomEvent("tablescene:cover-draft-reset", {
        detail: { formId, draft: sampleDraft, menuCoverEnabled: sampleDraft.menuCoverEnabled },
      })
    );

    window.dispatchEvent(
      new CustomEvent("tablescene:image-upload-draft-reset", {
        detail: {
          draftImageUrlInputName: "draft_cover_image_url",
          imageUrl: sampleDraft.coverImageUrl ?? null,
          imagePath: sampleDraft.coverImagePath ?? null,
          deleteImage: !sampleDraft.coverImageUrl,
        },
      })
    );

    window.dispatchEvent(
      new CustomEvent("tablescene:featured-slides-reset", {
        detail: {
          formId,
          slides: sampleDraft.featuredSlides ?? [],
        },
      })
    );

    toast.success("커버 이미지 설정이 샘플 데이터로 임시 변경되었습니다. 저장 후 공개 메뉴판에 반영됩니다.");
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (!disabled) setOpen(true);
        }}
        disabled={disabled}
        title={disabled ? "이 템플릿의 커버 이미지 샘플 데이터를 찾을 수 없습니다." : undefined}
        className="inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 px-5 py-3 text-sm font-bold text-zinc-700 transition-colors hover:border-zinc-400 hover:bg-white hover:text-zinc-950 disabled:cursor-not-allowed disabled:border-zinc-200 disabled:bg-zinc-100 disabled:text-zinc-400"
      >
        커버 샘플로 되돌리기
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/45 px-5 py-8" role="presentation">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cover-sample-reset-title"
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl"
          >
            <h2 id="cover-sample-reset-title" className="break-keep text-xl font-black tracking-tight text-zinc-950">
              커버 이미지 설정을 샘플 상태로 되돌릴까요?
            </h2>
            <p className="mt-3 break-keep text-sm font-semibold leading-relaxed text-zinc-500">
              커버 이미지 설정이 현재 템플릿의 샘플 데이터로 임시 변경됩니다. 저장 전까지 미리보기와 공개 메뉴판에는 반영되지 않습니다.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-bold text-zinc-600 transition-colors hover:bg-zinc-100"
              >
                취소
              </button>
              <button
                type="button"
                onClick={applySampleDraft}
                className="inline-flex w-full items-center justify-center rounded-full bg-red-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-red-700 sm:w-auto"
              >
                커버 샘플로 되돌리기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
