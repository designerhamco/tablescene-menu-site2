"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { saveMenuEditorScrollPosition } from "@/components/mypage/menu-editor/MenuEditorScrollRestoration";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { getImageUploadPolicy, validateImageUploadFile, type ImageUploadTarget } from "@/lib/image-upload-policy";

type ImageUploadFieldProps = {
  label: string;
  menuId: string;
  target: ImageUploadTarget;
  recordId?: string;
  currentUrl?: string | null;
  description?: string;
  deferredDeleteName?: string;
  draftImageUrlInputName?: string;
  draftImagePathInputName?: string;
  uploadSuccessMessage?: string;
  deleteSuccessMessage?: string;
  deleteConfirmTitle?: string;
  deleteConfirmDescription?: string;
  fileGuidance?: ReactNode;
  optimizationGuidance?: ReactNode;
  onDraftImageChange?: (draft: { imageUrl: string | null; imagePath: string | null; imageAction: "replace" | "delete" }) => void;
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

export default function ImageUploadField({
  label,
  menuId,
  target,
  recordId,
  currentUrl,
  description,
  deferredDeleteName,
  draftImageUrlInputName,
  draftImagePathInputName,
  uploadSuccessMessage = "이미지가 업로드되었습니다.",
  deleteSuccessMessage = "이미지 삭제가 임시 반영되었습니다. 저장을 눌러야 공개 메뉴판에 반영됩니다.",
  deleteConfirmTitle = "이 이미지를 삭제할까요?",
  deleteConfirmDescription = "삭제하면 저장 후 공개 메뉴판에 반영됩니다.",
  fileGuidance,
  optimizationGuidance = "업로드된 이미지는 화면에 맞게 자동 최적화될 수 있습니다.",
  onDraftImageChange,
}: ImageUploadFieldProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState(currentUrl ?? "");
  const [state, setState] = useState<UploadState>({ type: "idle", message: null });
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isMarkedForDeferredDelete, setIsMarkedForDeferredDelete] = useState(false);
  const [draftImageUrl, setDraftImageUrl] = useState("");
  const [draftImagePath, setDraftImagePath] = useState("");
  const isLoading = state.type === "loading";
  const usesDraftUpload =
    target === "site-logo-draft" ||
    target === "site-cover-draft" ||
    target === "site-intro-image-draft" ||
    target === "display-page-image-draft" ||
    target === "menu-item-draft";
  const isLogoUpload = target === "site-logo" || target === "site-logo-draft";
  const uploadPolicy = getImageUploadPolicy(target);

  useEffect(() => {
    function handleDraftReset(event: Event) {
      const detail = (event as CustomEvent<{
        draftImageUrlInputName?: string;
        imageUrl?: string | null;
        imagePath?: string | null;
        deleteImage?: boolean;
      }>).detail;

      if (!draftImageUrlInputName || detail?.draftImageUrlInputName !== draftImageUrlInputName) {
        return;
      }

      setPreviewUrl(detail.imageUrl ?? "");
      setDraftImageUrl(detail.imageUrl ?? "");
      setDraftImagePath(detail.imagePath ?? "");
      setIsMarkedForDeferredDelete(Boolean(detail.deleteImage));
      setIsConfirmingDelete(false);
      setState({ type: "success", message: "샘플 이미지가 임시 반영되었습니다. 저장을 눌러야 공개 메뉴판에 반영됩니다." });
    }

    window.addEventListener("tablescene:image-upload-draft-reset", handleDraftReset);
    return () => window.removeEventListener("tablescene:image-upload-draft-reset", handleDraftReset);
  }, [draftImageUrlInputName]);

  async function uploadFile(file: File) {
    const validationMessage = validateImageUploadFile(file, target);

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
      const result = (await response.json()) as { ok?: boolean; message?: string; imageUrl?: string | null; imagePath?: string | null };

      if (!response.ok || !result.ok) {
        throw new Error(result.message ?? "이미지 업로드에 실패했습니다.");
      }

      setPreviewUrl(result.imageUrl ?? "");
      setDraftImageUrl(result.imageUrl ?? "");
      setDraftImagePath(result.imagePath ?? "");
      onDraftImageChange?.({ imageUrl: result.imageUrl ?? null, imagePath: result.imagePath ?? null, imageAction: "replace" });
      setIsConfirmingDelete(false);
      setIsMarkedForDeferredDelete(false);
      setState({ type: "success", message: uploadSuccessMessage });
      if (!usesDraftUpload) {
        saveMenuEditorScrollPosition(menuId);
        router.refresh();
      }
    } catch (error) {
      setState({ type: "error", message: error instanceof Error ? error.message : "이미지 업로드 중 오류가 발생했습니다." });
    } finally {
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  async function deleteImage() {
    if (deferredDeleteName || onDraftImageChange) {
      setPreviewUrl("");
      setDraftImageUrl("");
      setDraftImagePath("");
      onDraftImageChange?.({ imageUrl: null, imagePath: null, imageAction: "delete" });
      setIsConfirmingDelete(false);
      setIsMarkedForDeferredDelete(true);
      const message = deleteSuccessMessage;
      setState({ type: "success", message });
      toast.success(message);
      return;
    }

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
      toast.success("이미지가 삭제되었습니다.");
      saveMenuEditorScrollPosition(menuId);
      router.refresh();
    } catch (error) {
      setState({ type: "error", message: error instanceof Error ? error.message : "이미지 삭제 중 오류가 발생했습니다." });
    }
  }

  return (
    <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-4">
      {deferredDeleteName && isMarkedForDeferredDelete && <input type="hidden" name={deferredDeleteName} value="on" />}
      {draftImageUrlInputName && draftImageUrl && <input type="hidden" name={draftImageUrlInputName} value={draftImageUrl} />}
      {draftImagePathInputName && draftImagePath && <input type="hidden" name={draftImagePathInputName} value={draftImagePath} />}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex h-32 w-full items-center justify-center overflow-hidden rounded-lg border border-zinc-200 bg-white sm:w-40">
          {previewUrl ? (
            // TODO: 이미지 업로드 시 WebP 변환/압축을 서버 또는 브라우저에서 추가할 수 있습니다.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="" className={`h-full w-full ${isLogoUpload ? "object-contain p-3" : "object-cover"}`} />
          ) : (
            <span className="text-xs font-bold text-zinc-400">이미지 없음</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">{label}</p>
          {description && <p className="mt-2 break-keep text-xs font-semibold leading-relaxed text-zinc-500">{description}</p>}
          <div className="mt-2 break-keep text-xs font-semibold leading-relaxed text-zinc-400">{fileGuidance ?? uploadPolicy.label}</div>
          {optimizationGuidance ? (
            <p className="mt-1 break-keep text-xs font-semibold leading-relaxed text-zinc-400">{optimizationGuidance}</p>
          ) : null}
          <p className="mt-2 break-keep text-xs font-semibold leading-relaxed text-zinc-400">
            본인이 촬영했거나 사용 권한이 있는 이미지만 업로드해주세요. 타인의 사진, 로고, 캐릭터, 상표를 무단으로 사용할 경우 서비스 이용이 제한될 수 있습니다.
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
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
              className="inline-flex items-center justify-center gap-1.5 rounded-full bg-zinc-950 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
            >
              {isLoading ? (
                <>
                  <LoadingSpinner className="h-3 w-3" />
                  업로드 중...
                </>
              ) : (
                "이미지 등록"
              )}
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
          </div>

          {state.message && (
            <div className={`mt-4 rounded-lg border p-3 text-xs font-bold leading-relaxed ${getStateClassName(state.type)}`}>
              {state.message}
            </div>
          )}
        </div>
      </div>
      {previewUrl && isConfirmingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 px-5">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <h4 className="text-lg font-bold tracking-tight text-zinc-950">{deleteConfirmTitle}</h4>
            <p className="mt-3 break-keep text-sm font-semibold leading-relaxed text-zinc-500">{deleteConfirmDescription}</p>
            <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                disabled={isLoading}
                onClick={() => setIsConfirmingDelete(false)}
                className="rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-bold text-zinc-700"
              >
                취소
              </button>
              <button
                type="button"
                disabled={isLoading}
                onClick={deleteImage}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-red-600 px-5 py-3 text-sm font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
              >
                {isLoading ? (
                  <>
                    <LoadingSpinner className="h-4 w-4" />
                    이미지 처리 중...
                  </>
                ) : (
                  "삭제 확정"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
