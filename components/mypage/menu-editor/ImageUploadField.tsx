"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export type ImageUploadTarget = "site-logo" | "site-cover" | "menu-item" | "menu-event" | "menu-chef";

type ImageUploadFieldProps = {
  label: string;
  menuId: string;
  target: ImageUploadTarget;
  recordId?: string;
  currentUrl?: string | null;
  description?: string;
};

type UploadState =
  | { type: "idle"; message: string | null }
  | { type: "loading"; message: string }
  | { type: "success"; message: string }
  | { type: "error"; message: string };

function getStateClassName(type: UploadState["type"]) {
  if (type === "success") {
    return "border-emerald-100 bg-emerald-50 text-emerald-700";
  }

  if (type === "error") {
    return "border-red-100 bg-red-50 text-red-700";
  }

  return "border-zinc-100 bg-zinc-50 text-zinc-500";
}

function validateFile(file: File) {
  if (!ALLOWED_TYPES.has(file.type)) {
    return "JPG, PNG, WebP 이미지만 업로드할 수 있습니다.";
  }

  if (file.size > MAX_FILE_SIZE) {
    return "이미지는 5MB 이하만 업로드할 수 있습니다.";
  }

  return null;
}

export default function ImageUploadField({
  label,
  menuId,
  target,
  recordId,
  currentUrl,
  description,
}: ImageUploadFieldProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState(currentUrl ?? "");
  const [state, setState] = useState<UploadState>({ type: "idle", message: null });
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const isLoading = state.type === "loading";

  async function uploadFile(file: File) {
    const validationMessage = validateFile(file);

    if (validationMessage) {
      setState({ type: "error", message: validationMessage });
      return;
    }

    const formData = new FormData();
    formData.set("target", target);
    formData.set("menuId", menuId);
    formData.set("recordId", recordId ?? "");
    formData.set("file", file);

    setState({ type: "loading", message: "이미지를 업로드하고 있습니다." });

    try {
      const response = await fetch("/api/menu-images", {
        method: "POST",
        body: formData,
      });
      const result = (await response.json()) as { ok?: boolean; message?: string; imageUrl?: string | null };

      if (!response.ok || !result.ok) {
        throw new Error(result.message ?? "이미지 업로드에 실패했습니다.");
      }

      setPreviewUrl(result.imageUrl ?? "");
      setIsConfirmingDelete(false);
      setState({ type: "success", message: "이미지가 저장되었습니다." });
      router.refresh();
    } catch (error) {
      setState({ type: "error", message: error instanceof Error ? error.message : "이미지 업로드 중 오류가 발생했습니다." });
    } finally {
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  async function deleteImage() {
    setState({ type: "loading", message: "이미지를 삭제하고 있습니다." });

    try {
      const response = await fetch("/api/menu-images", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          target,
          menuId,
          recordId: recordId ?? "",
        }),
      });
      const result = (await response.json()) as { ok?: boolean; message?: string };

      if (!response.ok || !result.ok) {
        throw new Error(result.message ?? "이미지 삭제에 실패했습니다.");
      }

      setPreviewUrl("");
      setIsConfirmingDelete(false);
      setState({ type: "success", message: "이미지가 삭제되었습니다." });
      router.refresh();
    } catch (error) {
      setState({ type: "error", message: error instanceof Error ? error.message : "이미지 삭제 중 오류가 발생했습니다." });
    }
  }

  return (
    <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex h-32 w-full items-center justify-center overflow-hidden rounded-lg border border-zinc-200 bg-white sm:w-40">
          {previewUrl ? (
            // TODO: 이미지 업로드 시 WebP 변환/압축을 서버 또는 브라우저에서 추가할 수 있습니다.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs font-bold text-zinc-400">이미지 없음</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">{label}</p>
          {description && <p className="mt-2 break-keep text-xs font-semibold leading-relaxed text-zinc-500">{description}</p>}
          <p className="mt-2 text-xs font-semibold text-zinc-400">JPG, PNG, WebP / 최대 5MB</p>

          <div className="mt-4 flex flex-wrap gap-2">
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void uploadFile(file);
              }}
            />
            <button
              type="button"
              disabled={isLoading}
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center justify-center rounded-full bg-zinc-950 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
            >
              이미지 등록
            </button>
            {previewUrl && !isConfirmingDelete && (
              <button
                type="button"
                disabled={isLoading}
                onClick={() => setIsConfirmingDelete(true)}
                className="inline-flex items-center justify-center rounded-full border border-red-100 bg-white px-4 py-2 text-xs font-bold text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:text-zinc-300"
              >
                이미지 삭제
              </button>
            )}
            {previewUrl && isConfirmingDelete && (
              <>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={deleteImage}
                  className="inline-flex items-center justify-center rounded-full bg-red-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
                >
                  삭제 확인
                </button>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => setIsConfirmingDelete(false)}
                  className="inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-bold text-zinc-600 transition-colors hover:bg-zinc-100"
                >
                  취소
                </button>
              </>
            )}
          </div>

          {state.message && (
            <div className={`mt-4 rounded-lg border p-3 text-xs font-bold leading-relaxed ${getStateClassName(state.type)}`}>
              {state.message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
