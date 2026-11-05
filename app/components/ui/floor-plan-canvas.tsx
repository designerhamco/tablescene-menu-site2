"use client";
import { useId } from "react";
import type { CSSProperties, ComponentPropsWithRef, ComponentPropsWithoutRef, ReactNode } from "react";

type Rect = { x: number; y: number; width: number; height: number };
export function FloorPlanCanvas({ name, aspectRatio, editing = false, drawing = false, children, ...props }: Omit<ComponentPropsWithRef<"div">, "className" | "style"> & { name: string; aspectRatio: number; editing?: boolean; drawing?: boolean }) {
  return <div {...props} className="site-floor-canvas" style={{ aspectRatio, "--floor-plan-aspect": aspectRatio } as CSSProperties} data-editing={editing} data-drawing={drawing} role="group" aria-label={`${name} 배치도`}>{children}</div>;
}
export function FloorPlanObject({ rect, label, icon, typeLabel, disabled = false, selected = false, editing = false, summary, ...props }: Omit<ComponentPropsWithoutRef<"div">, "className" | "style" | "children"> & { rect: Rect; label: string; icon?: ReactNode; typeLabel?: string; disabled?: boolean; selected?: boolean; editing?: boolean; summary?: ReactNode }) {
  const summaryId = useId();
  return <div {...props} aria-describedby={summary ? summaryId : undefined} role="button" tabIndex={0} aria-label={`${typeLabel ? `${typeLabel} · ` : ""}${label}${disabled ? " · 비활성" : ""}`} aria-pressed={selected} className="site-floor-object" data-selected={selected} data-disabled={disabled} data-summary={Boolean(summary)} style={{ left: `${rect.x}%`, top: `${rect.y}%`, width: `${rect.width}%`, height: `${rect.height}%` }} title={`${typeLabel ? `${typeLabel} · ` : ""}${label}${disabled ? " · 비활성" : ""}`}>
    <span className="type-caption site-floor-object-label">{icon ? <span className="site-label-icon" aria-hidden="true">{icon}</span> : null}{label}{disabled ? " · 비활성" : null}</span>
    {summary ? <div id={summaryId} className="site-floor-object-summary type-caption">{summary}</div> : null}
    {editing ? <span data-resize-handle className="site-floor-object-resize" aria-hidden="true"><svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11 3 3 11M11 7 7 11" /></svg></span> : null}
  </div>;
}
