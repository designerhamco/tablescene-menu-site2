"use client";
import type { CSSProperties, ComponentPropsWithRef, ComponentPropsWithoutRef } from "react";

type Rect = { x: number; y: number; width: number; height: number };
export function FloorPlanCanvas({ name, aspectRatio, editing = false, drawing = false, children, ...props }: Omit<ComponentPropsWithRef<"div">, "className" | "style"> & { name: string; aspectRatio: number; editing?: boolean; drawing?: boolean }) {
  return <div {...props} className="site-floor-canvas" style={{ aspectRatio, "--floor-plan-aspect": aspectRatio } as CSSProperties} data-editing={editing} data-drawing={drawing} role="group" aria-label={`${name} 배치도`}>{children}</div>;
}
export function FloorPlanObject({ rect, label, disabled = false, selected = false, editing = false, ...props }: Omit<ComponentPropsWithoutRef<"div">, "className" | "style" | "children"> & { rect: Rect; label: string; disabled?: boolean; selected?: boolean; editing?: boolean }) {
  return <div {...props} role="button" tabIndex={0} aria-label={`${label}${disabled ? " · 비활성" : ""}`} aria-pressed={selected} className="site-floor-object" data-selected={selected} data-disabled={disabled} style={{ left: `${rect.x}%`, top: `${rect.y}%`, width: `${rect.width}%`, height: `${rect.height}%` }} title={`${label}${disabled ? " · 비활성" : ""}`}>
    <span className="type-caption site-floor-object-label">{label}{disabled ? " · 비활성" : null}</span>
    {editing ? <span data-resize-handle className="site-floor-object-resize" aria-hidden="true"><svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11 3 3 11M11 7 7 11" /></svg></span> : null}
  </div>;
}
