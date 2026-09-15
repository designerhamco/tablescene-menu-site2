"use client";

import { toDataURL } from "qrcode";
import { useState } from "react";
import { toast } from "sonner";

function resolvePublicUrl(path: string, publicBaseUrl: string | null) {
  return new URL(path, publicBaseUrl ?? window.location.origin).toString();
}

export default function QrAddressActions({
  copyKey,
  feedbackLabel,
  fileName,
  path,
  publicBaseUrl,
  disabled = false,
  disabledReason,
}: {
  copyKey: string;
  feedbackLabel: string;
  fileName: string;
  path: string;
  publicBaseUrl: string | null;
  disabled?: boolean;
  disabledReason?: string | null;
}) {
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");
  const [downloadStatus, setDownloadStatus] = useState<"idle" | "working" | "error">("idle");
  const publicUrl = publicBaseUrl ? new URL(path, publicBaseUrl).toString() : path;

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(resolvePublicUrl(path, publicBaseUrl));
      setCopyStatus("copied");
      toast.success(`${feedbackLabel} 주소를 복사했습니다.`);
      window.setTimeout(() => setCopyStatus("idle"), 1800);
    } catch {
      setCopyStatus("error");
      toast.error("주소를 복사하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }
  }

  async function downloadQr() {
    setDownloadStatus("working");
    try {
      const dataUrl = await toDataURL(resolvePublicUrl(path, publicBaseUrl), {
        type: "image/png",
        width: 1024,
        margin: 2,
        errorCorrectionLevel: "M",
        color: { dark: "#18181b", light: "#ffffff" },
      });
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setDownloadStatus("idle");
      toast.success(`${feedbackLabel} QR 이미지를 다운로드했습니다.`);
    } catch {
      setDownloadStatus("error");
      toast.error("QR 이미지를 만들지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }
  }

  return (
    <div className="mt-4">
      <label className="block text-xs font-bold text-zinc-500" htmlFor={`qr-address-${copyKey}`}>
        연결 주소
      </label>
      <div className="mt-2 flex flex-col gap-2 lg:flex-row">
        <input
          id={`qr-address-${copyKey}`}
          readOnly
          value={publicUrl}
          className="min-w-0 flex-1 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 font-mono text-xs font-bold text-zinc-700 outline-none sm:text-sm"
        />
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={copyUrl}
            disabled={disabled}
            title={disabled ? disabledReason ?? undefined : undefined}
            className="rounded-full border border-zinc-300 bg-white px-4 py-3 text-xs font-bold text-zinc-800 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-400"
          >
            {copyStatus === "copied" ? "복사 완료" : copyStatus === "error" ? "다시 복사" : "주소 복사"}
          </button>
          <button
            type="button"
            onClick={downloadQr}
            disabled={disabled || downloadStatus === "working"}
            title={disabled ? disabledReason ?? undefined : undefined}
            className="rounded-full bg-zinc-950 px-4 py-3 text-xs font-bold text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-500"
            data-table-qr-download=""
          >
            {downloadStatus === "working" ? "QR 만드는 중" : "QR 다운로드"}
          </button>
        </div>
      </div>
      {disabled && disabledReason ? (
        <p className="mt-2 text-xs font-bold text-amber-700">{disabledReason}</p>
      ) : null}
      {downloadStatus === "error" ? (
        <p className="mt-2 text-xs font-bold text-rose-700">QR 이미지를 만들지 못했습니다. 잠시 후 다시 시도해 주세요.</p>
      ) : null}
    </div>
  );
}
