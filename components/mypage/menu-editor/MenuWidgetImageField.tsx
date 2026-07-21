"use client";

import { useRef, useState } from "react";

import type { MenuWidgetType } from "@/lib/menu-widgets";

type WidgetImageUploadResponse = {
  ok?: boolean;
  imageUrl?: string;
  imagePath?: string;
  message?: string;
  error?: string;
};

type MenuWidgetImageFieldProps = {
  menuSiteId: string;
  menuPageId: string;
  widgetId: string;
  widgetType: Extract<MenuWidgetType, "image" | "image_text">;
  imageUrl: string | null;
  imagePath: string | null;
  persistedImagePath: string | null;
  onChange: (value: { imageUrl: string | null; imagePath: string | null }) => void;
  onError?: (message: string) => void;
};

export default function MenuWidgetImageField({
  menuSiteId,
  menuPageId,
  widgetId,
  widgetType,
  imageUrl,
  imagePath,
  persistedImagePath,
  onChange,
  onError,
}: MenuWidgetImageFieldProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [localError, setLocalError] = useState("");
  const hasImage = Boolean(imageUrl || imagePath);
  const currentImageIsUnsaved = Boolean(imagePath && imagePath !== persistedImagePath);

  function setError(message: string) {
    setLocalError(message);
    onError?.(message);
  }

  async function uploadImage(file: File) {
    setLocalError("");
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.set("menuSiteId", menuSiteId);
      formData.set("menuPageId", menuPageId);
      formData.set("widgetId", widgetId);
      formData.set("widgetType", widgetType);
      formData.set("file", file);
      if (currentImageIsUnsaved && imagePath) {
        formData.set("previousUnsavedImagePath", imagePath);
      }

      const response = await fetch("/api/menu-widget-images", {
        method: "POST",
        body: formData,
      });
      const result = await response.json().catch(() => ({} as WidgetImageUploadResponse));

      if (!response.ok || !result.imageUrl || !result.imagePath) {
        setError(result.message || result.error || "위젯 이미지를 업로드하지 못했습니다.");
        return;
      }

      onChange({ imageUrl: result.imageUrl, imagePath: result.imagePath });
    } catch {
      setError("위젯 이미지를 업로드하지 못했습니다.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function removeImage() {
    setLocalError("");

    if (currentImageIsUnsaved && imagePath) {
      setIsRemoving(true);
      try {
        const response = await fetch("/api/menu-widget-images", {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ menuSiteId, menuPageId, widgetId, imagePath }),
        });
        const result = await response.json().catch(() => ({} as WidgetImageUploadResponse));

        if (!response.ok) {
          setError(result.message || result.error || "임시 이미지를 삭제하지 못했습니다.");
          return;
        }
      } catch {
        setError("임시 이미지를 삭제하지 못했습니다.");
        return;
      } finally {
        setIsRemoving(false);
      }
    }

    onChange({ imageUrl: null, imagePath: null });
  }

  return (
    <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-lg border border-zinc-200 bg-white sm:w-40">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="px-4 text-center text-xs font-bold text-zinc-400">이미지 없음</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <label className="block text-xs font-black text-zinc-500">위젯 이미지</label>
          <p className="mt-1 break-keep text-xs font-bold leading-relaxed text-zinc-400">
            JPG, PNG, WebP 이미지를 업로드할 수 있습니다. 실제 공개 반영은 하단의 최종 저장 후 진행됩니다.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={isUploading || isRemoving}
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                if (file) void uploadImage(file);
              }}
              className="block max-w-full text-xs font-bold text-zinc-500 file:mr-3 file:rounded-full file:border-0 file:bg-zinc-950 file:px-4 file:py-2 file:text-xs file:font-bold file:text-white disabled:cursor-not-allowed disabled:opacity-60"
            />
            {hasImage && (
              <button
                type="button"
                onClick={() => void removeImage()}
                disabled={isUploading || isRemoving}
                className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-bold text-zinc-600 transition hover:border-zinc-400 hover:text-zinc-950 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
              >
                이미지 제거
              </button>
            )}
          </div>
          {currentImageIsUnsaved && (
            <p className="mt-2 text-[11px] font-bold text-amber-600">새 이미지가 임시 업로드되었습니다. 최종 저장 전까지는 공개 메뉴판에 반영되지 않습니다.</p>
          )}
          {localError && (
            <p className="mt-2 break-keep rounded-md bg-red-50 px-3 py-2 text-xs font-bold leading-relaxed text-red-700">{localError}</p>
          )}
        </div>
      </div>
    </div>
  );
}
