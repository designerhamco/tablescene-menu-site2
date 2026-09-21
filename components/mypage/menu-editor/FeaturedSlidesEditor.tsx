"use client";

import { useEffect, useRef, useState } from "react";

import { CafeAStarterFeaturedEnabledSwitch } from "@/components/mypage/menu-editor/CafeAStarterCoverDraftFields";
import { useCafeAStarterResetCoordinator } from "@/components/mypage/menu-editor/CafeAStarterResetCoordinator";
import ImageUploadField from "@/components/mypage/menu-editor/ImageUploadField";

export type FeaturedSlideDraft = {
  id: string;
  imageUrl: string | null;
  imagePath: string | null;
  featuredItemId: string | null;
  sortOrder: number;
};

export type FeaturedSlideItemOption = {
  id: string;
  label: string;
  categoryName: string;
  price: string;
  imageStatus: string;
};

type FeaturedSlidesEditorProps = {
  menuId: string;
  formId: string;
  initialSlides: FeaturedSlideDraft[];
  itemOptions: FeaturedSlideItemOption[];
  maxSlides: number;
  defaultFeaturedItemEnabled: boolean;
};

function createSlideId() {
  return globalThis.crypto?.randomUUID?.() ?? `featured-slide-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeSlides(slides: FeaturedSlideDraft[]) {
  return slides.slice(0, 5).map((slide, index) => ({
    ...slide,
    sortOrder: index,
  }));
}

function getCompletionLabel(slide: FeaturedSlideDraft) {
  if (slide.imageUrl) return "";
  return "이미지를 등록해야 공개 메뉴판에 표시됩니다.";
}

export default function FeaturedSlidesEditor({
  menuId,
  formId,
  initialSlides,
  itemOptions,
  maxSlides,
  defaultFeaturedItemEnabled,
}: FeaturedSlidesEditorProps) {
  const coordinator = useCafeAStarterResetCoordinator();
  const resetSnapshot = coordinator?.snapshot ?? null;
  const [slides, setSlides] = useState(() => normalizeSlides(initialSlides));
  const hiddenInputRef = useRef<HTMLInputElement | null>(null);
  const effectiveItemOptions = resetSnapshot
    ? (() => {
        const categoryNameById = new Map(resetSnapshot.categories.map((category) => [category.id, category.name]));
        return resetSnapshot.items
          .filter((item) => item.visible)
          .map((item) => ({
            id: item.id,
            label: item.name,
            categoryName: categoryNameById.get(item.categoryId) ?? "미분류",
            price: item.price || item.priceColumnValues.find((value) => value.visible)?.price || "문의",
            imageStatus: item.imageUrl ? "이미지 있음" : "이미지 없음",
          }));
      })()
    : itemOptions;
  const itemOptionIds = new Set(effectiveItemOptions.map((item) => item.id));

  useEffect(() => {
    if (!resetSnapshot) return;
    const frameId = window.requestAnimationFrame(() => {
      setSlides(normalizeSlides(resetSnapshot.featuredSlides));
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [coordinator?.resetKey, resetSnapshot]);

  useEffect(() => {
    const input = hiddenInputRef.current;
    if (!input) return;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, [slides]);

  useEffect(() => {
    function handleReset(event: Event) {
      const detail = (event as CustomEvent<{ formId?: string; slides?: FeaturedSlideDraft[] }>).detail;
      if (detail?.formId !== formId || !Array.isArray(detail.slides)) return;
      setSlides(normalizeSlides(detail.slides));
    }

    window.addEventListener("tablescene:featured-slides-reset", handleReset);
    return () => window.removeEventListener("tablescene:featured-slides-reset", handleReset);
  }, [formId]);

  const effectiveMaxSlides = Math.max(1, Math.min(5, Math.trunc(maxSlides)));
  const selectedItemIds = slides.map((slide) => slide.featuredItemId).filter((id): id is string => Boolean(id));
  const duplicateItemIds = new Set(selectedItemIds.filter((id, index) => selectedItemIds.indexOf(id) !== index));

  function updateSlide(slideId: string, updater: (slide: FeaturedSlideDraft) => FeaturedSlideDraft) {
    setSlides((current) => normalizeSlides(current.map((slide) => (slide.id === slideId ? updater(slide) : slide))));
  }

  function moveSlide(index: number, direction: -1 | 1) {
    setSlides((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return normalizeSlides(next);
    });
  }

  return (
    <div className="grid gap-4">
      <input ref={hiddenInputRef} type="hidden" name="featured_slides" value={JSON.stringify(slides)} readOnly />
      <section className="rounded-lg border border-zinc-100 bg-zinc-50 p-5" data-featured-image-editor="">
        <div>
          <h3 className="type-content-title text-zinc-950">대표 이미지</h3>
          <p className="mt-2 break-keep text-sm font-semibold leading-relaxed text-zinc-500">
            메뉴판 대표 영역에 보여줄 이미지를 최대 {effectiveMaxSlides}개까지 등록하고 순서를 정할 수 있습니다.
          </p>
        </div>

        <div className="mt-5 grid gap-4">
          {slides.length === 0 && (
            <div className="rounded-lg border border-dashed border-zinc-200 bg-white p-5 text-sm font-bold text-zinc-400">
              아직 등록된 대표 이미지가 없습니다.
            </div>
          )}

          {slides.map((slide, index) => {
            const completionLabel = getCompletionLabel(slide);

            return (
              <section key={slide.id} className="rounded-lg border border-zinc-100 bg-white p-4">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h4 className="type-label text-zinc-950">대표 이미지 {index + 1}</h4>
                    {completionLabel && <p className="mt-1 break-keep text-xs font-bold text-amber-700">{completionLabel}</p>}
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => moveSlide(index, -1)}
                      disabled={index === 0}
                      className="rounded-full border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-600 disabled:cursor-not-allowed disabled:text-zinc-300"
                    >
                      위로
                    </button>
                    <button
                      type="button"
                      onClick={() => moveSlide(index, 1)}
                      disabled={index === slides.length - 1}
                      className="rounded-full border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-600 disabled:cursor-not-allowed disabled:text-zinc-300"
                    >
                      아래로
                    </button>
                    <button
                      type="button"
                      onClick={() => setSlides((current) => normalizeSlides(current.filter((item) => item.id !== slide.id)))}
                      className="rounded-full border border-red-100 bg-white px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50"
                    >
                      삭제
                    </button>
                  </div>
                </div>

                <ImageUploadField
                  key={`${slide.id}:${slide.imageUrl ?? ""}`}
                  label={`대표 이미지 ${index + 1}`}
                  menuId={menuId}
                  target="site-cover-draft"
                  currentUrl={slide.imageUrl}
                  description="이 순서에 표시할 대표 이미지를 등록해주세요. 상품 선택과 관계없이 이미지 단독으로 사용할 수 있습니다."
                  uploadSuccessMessage="새 대표 이미지는 저장 후 공개 메뉴판에 반영됩니다."
                  deleteConfirmTitle="이 대표 이미지를 삭제할까요?"
                  deleteConfirmDescription="삭제해도 저장 전까지 공개 메뉴판에는 반영되지 않습니다."
                  onDraftImageChange={(draft) =>
                    updateSlide(slide.id, (current) => ({
                      ...current,
                      imageUrl: draft.imageUrl,
                      imagePath: draft.imagePath,
                    }))
                  }
                />
              </section>
            );
          })}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="break-keep text-xs font-bold text-zinc-400">
            {slides.length}/{effectiveMaxSlides}개 사용 중
          </p>
          <button
            type="button"
            onClick={() =>
              setSlides((current) =>
                current.length >= effectiveMaxSlides
                  ? current
                  : normalizeSlides([
                      ...current,
                      { id: createSlideId(), imageUrl: null, imagePath: null, featuredItemId: null, sortOrder: current.length },
                    ])
              )
            }
            disabled={slides.length >= effectiveMaxSlides}
            className="rounded-full bg-zinc-950 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
          >
            대표 이미지 추가
          </button>
          {slides.length >= effectiveMaxSlides && (
            <p className="basis-full break-keep text-right text-xs font-bold text-amber-700">
              대표 이미지는 최대 {effectiveMaxSlides}개까지 등록할 수 있습니다.
            </p>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-zinc-100 bg-zinc-50 p-5" data-featured-product-editor="">
        <div>
          <h3 className="type-content-title text-zinc-950">대표 상품</h3>
          <p className="mt-2 break-keep text-sm font-semibold leading-relaxed text-zinc-500">
            등록한 각 대표 이미지 위에 상품명·설명·배지·가격을 함께 보여줄지 선택합니다.
          </p>
        </div>

        <div className="mt-5 rounded-lg border border-zinc-100 bg-white p-4">
          <CafeAStarterFeaturedEnabledSwitch
            defaultChecked={defaultFeaturedItemEnabled}
            formId={formId}
            label="대표 상품 정보 표시"
          />
          <p className="mt-2 break-keep text-xs font-bold leading-relaxed text-zinc-400">
            끄면 대표 이미지만 표시됩니다. 등록한 이미지와 상품 연결 정보는 삭제되지 않습니다.
          </p>
        </div>

        <div className="mt-4 grid gap-4">
          {slides.length === 0 ? (
            <div className="rounded-lg border border-dashed border-zinc-200 bg-white p-5 text-sm font-bold text-zinc-400">
              먼저 위의 대표 이미지 영역에서 이미지를 추가해주세요.
            </div>
          ) : slides.map((slide, index) => {
            const completionLabel = getCompletionLabel(slide);
            const selectedItemIsInvalid = Boolean(slide.featuredItemId && !itemOptionIds.has(slide.featuredItemId));
            const selectedItemIsDuplicate = Boolean(slide.featuredItemId && duplicateItemIds.has(slide.featuredItemId));
            const takenItemIds = new Set(slides.filter((_, slideIndex) => slideIndex !== index).map((item) => item.featuredItemId).filter(Boolean));

            return (
              <section key={slide.id} className="rounded-lg border border-zinc-100 bg-white p-4">
              <div className="mb-3">
                <div>
                  <h4 className="type-label text-zinc-950">대표 이미지 {index + 1}의 상품</h4>
                  {completionLabel && <p className="mt-1 break-keep text-xs font-bold text-amber-700">이미지를 등록한 뒤 공개 메뉴판에 표시됩니다.</p>}
                  {selectedItemIsInvalid && (
                    <p className="mt-1 break-keep text-xs font-bold text-red-600">
                      선택된 대표 상품이 삭제되었거나 숨김 처리되었습니다. 다른 상품을 선택해주세요.
                    </p>
                  )}
                  {selectedItemIsDuplicate && (
                    <p className="mt-1 break-keep text-xs font-bold text-red-600">같은 대표 상품은 한 번만 선택할 수 있습니다.</p>
                  )}
                </div>
              </div>

              <label className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-400" htmlFor={`featured-slide-item-${slide.id}`}>
                연결할 대표 상품
              </label>
              <select
                id={`featured-slide-item-${slide.id}`}
                value={slide.featuredItemId ?? ""}
                onChange={(event) => updateSlide(slide.id, (current) => ({ ...current, featuredItemId: event.target.value || null }))}
                className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 outline-none transition focus:border-zinc-950"
              >
                <option value="">상품 정보 없이 이미지로만 표시</option>
                {selectedItemIsInvalid && slide.featuredItemId && (
                  <option value={slide.featuredItemId} disabled>
                    선택된 상품 · 숨김 또는 삭제됨
                  </option>
                )}
                {effectiveItemOptions.map((item) => (
                  <option key={item.id} value={item.id} disabled={takenItemIds.has(item.id)}>
                    {item.label} · {item.categoryName} · {item.price} · {item.imageStatus}
                  </option>
                ))}
              </select>
              <p className="mt-2 break-keep text-xs font-bold leading-relaxed text-zinc-400">
                선택하지 않으면 해당 순서에는 이미지만 표시됩니다. 같은 상품은 한 번만 연결할 수 있습니다.
              </p>
              </section>
            );
          })}
        </div>
      </section>
    </div>
  );
}
