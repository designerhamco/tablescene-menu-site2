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
  representativeArea?: boolean;
};

export default function CoverSampleResetButton({ formId, sampleDraft, representativeArea = false }: CoverSampleResetButtonProps) {
  const [open, setOpen] = useState(false);
  const disabled = !sampleDraft;
  const settingLabel = representativeArea ? "대표 영역" : "커버 이미지";

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

    toast.success(`${settingLabel} 샘플을 임시 반영했어요.`, {
      description: `${settingLabel} 저장을 누르면 적용돼요.`,
    });
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
        title={disabled ? `이 템플릿의 ${settingLabel} 샘플을 찾을 수 없습니다.` : undefined}
        className="site-button site-button-outline inline-flex items-center justify-center"
      >
        {settingLabel} 샘플로 되돌리기
      </button>

      {open && (
        <div className="site-management-scope site-dialog-overlay fixed inset-0 z-50 flex items-center justify-center px-5 py-8" role="presentation">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cover-sample-reset-title"
            className="site-dialog site-dialog-panel w-full max-w-md p-6"
          >
            <h2 id="cover-sample-reset-title" className="type-content-title break-keep text-zinc-950">
              {settingLabel} 설정을 샘플로 되돌릴까요?
            </h2>
            <p className="site-dialog-description mt-3 break-keep font-semibold leading-relaxed">
              {representativeArea
                ? "대표 영역 설정과 등록된 이미지·상품이 템플릿 샘플로 바뀝니다. 대표 영역 저장을 눌러야 적용돼요."
                : "커버 이미지 설정이 템플릿 샘플로 바뀝니다. 커버 이미지 저장을 눌러야 적용돼요."}
            </p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="site-button site-button-outline inline-flex items-center justify-center"
              >
                취소
              </button>
              <button
                type="button"
                onClick={applySampleDraft}
                className="site-button site-button-outline"
              >
                {settingLabel} 샘플로 되돌리기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
