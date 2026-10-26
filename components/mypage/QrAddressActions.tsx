"use client";

import { useState } from "react";
import { toast } from "sonner";

import QrDownloadButton from "@/components/mypage/QrDownloadButton";

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

  return (
    <div className="mt-4">
      <label className="block text-support font-medium text-zinc-600" htmlFor={`qr-address-${copyKey}`}>
        연결 주소
      </label>
      <div className="mt-2 flex flex-col gap-2 lg:flex-row">
        <input
          id={`qr-address-${copyKey}`}
          readOnly
          value={publicUrl}
          className="site-field min-w-0 flex-1 border-zinc-200 px-4 py-3 font-mono text-zinc-700 sm:text-copy"
        />
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={copyUrl}
            disabled={disabled}
            title={disabled ? disabledReason ?? undefined : undefined}
            className="site-button site-button-outline"
          >
            {copyStatus === "copied" ? "복사 완료" : copyStatus === "error" ? "다시 복사" : "주소 복사"}
          </button>
          <QrDownloadButton
            feedbackLabel={feedbackLabel}
            fileName={fileName}
            path={path}
            publicBaseUrl={publicBaseUrl}
            disabled={disabled}
            disabledReason={disabledReason}
            className="site-button site-button-primary"
          />
        </div>
      </div>
      {disabled && disabledReason ? (
        <p className="mt-2 text-support font-medium text-amber-700">{disabledReason}</p>
      ) : null}
    </div>
  );
}
