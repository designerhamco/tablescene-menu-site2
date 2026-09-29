"use client";

import { toDataURL } from "qrcode";
import { useState } from "react";
import { toast } from "sonner";

function resolvePublicUrl(path: string, publicBaseUrl: string | null) {
  return new URL(path, publicBaseUrl ?? window.location.origin).toString();
}

export default function QrDownloadButton({
  feedbackLabel,
  fileName,
  path,
  publicBaseUrl = null,
  disabled = false,
  disabledReason,
  className = "site-button site-button-secondary site-button-sm",
}: {
  feedbackLabel: string;
  fileName: string;
  path: string;
  publicBaseUrl?: string | null;
  disabled?: boolean;
  disabledReason?: string | null;
  className?: string;
}) {
  const [status, setStatus] = useState<"idle" | "working">("idle");

  async function downloadQr() {
    if (disabled || status === "working") return;

    setStatus("working");
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
      toast.success(`${feedbackLabel} QR 이미지를 다운로드했습니다.`);
    } catch {
      toast.error("QR 이미지를 만들지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setStatus("idle");
    }
  }

  return (
    <button
      type="button"
      onClick={downloadQr}
      disabled={disabled || status === "working"}
      title={disabled ? disabledReason ?? undefined : undefined}
      aria-label={disabled && disabledReason ? `QR 다운로드 비활성화: ${disabledReason}` : undefined}
      className={className}
      data-qr-download=""
    >
      {status === "working" ? "QR 만드는 중" : "QR 다운로드"}
    </button>
  );
}
