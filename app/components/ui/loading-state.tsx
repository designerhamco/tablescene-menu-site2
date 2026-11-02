import type { CSSProperties } from "react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

/** Only supply value when the operation reports real progress. */
export function ProgressBar({ label, value }: { label: string; value?: number }) {
  const progress = typeof value === "number" && Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : undefined;
  return <div className="site-progress-bar" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} data-indeterminate={progress === undefined || undefined}>
    <span style={progress === undefined ? undefined : { "--site-progress-value": `${progress}%` } as CSSProperties} />
  </div>;
}

/** Loading is distinct from an empty result or an error; keep the status copy. */
export function LoadingState({ label = "내용을 불러오는 중입니다.", inline = false, indicator = "spinner" }: {
  label?: string;
  inline?: boolean;
  indicator?: "spinner" | "bar";
}) {
  return <div className="site-loading-state" role="status" aria-live="polite" data-inline={inline || undefined}>
    {indicator === "spinner" ? <LoadingSpinner className="site-loading-state-spinner" /> : <span className="site-loading-bar" aria-hidden="true"><span /></span>}
    <span>{label}</span>
  </div>;
}
