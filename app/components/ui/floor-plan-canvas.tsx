"use client";
import { useId } from "react";
import { ContentPanel } from "./content-panel";
import type { CSSProperties, ComponentPropsWithRef, ComponentPropsWithoutRef, ReactNode } from "react";

type Rect = { x: number; y: number; width: number; height: number };
export function FloorPlanCanvas({ name, aspectRatio, editing = false, drawing = false, children, ...props }: Omit<ComponentPropsWithRef<"div">, "className" | "style"> & { name: string; aspectRatio: number; editing?: boolean; drawing?: boolean }) {
  return <div {...props} className="site-floor-canvas" style={{ aspectRatio, "--floor-plan-aspect": aspectRatio } as CSSProperties} data-editing={editing} data-drawing={drawing} role="group" aria-label={`${name} 배치도`}>{children}</div>;
}
/** One connected editing surface; standalone/read-only canvases keep their own edge. */
export function FloorPlanWorkspace({ tools, selection, footer, children }: { tools: ReactNode; selection?: ReactNode; footer: ReactNode; children?: ReactNode }) {
  return <ContentPanel layout="canvas" aria-label="매장 배치 편집"><div className="site-floor-workspace-tools">{tools}</div>{selection ? <div className="site-floor-workspace-selection">{selection}</div> : null}{children}<div className="site-floor-workspace-footer">{footer}</div></ContentPanel>;
}

export function FloorPlanObject({ rect, label, icon, typeLabel, disabled = false, selected = false, editing = false, summary, actions, ...props }: Omit<ComponentPropsWithoutRef<"div">, "className" | "style" | "children"> & { rect: Rect; label: string; icon?: ReactNode; typeLabel?: string; disabled?: boolean; selected?: boolean; editing?: boolean; summary?: ReactNode; actions?: ReactNode }) {
  const summaryId = useId();
  const geometry = { left: `${rect.x}%`, top: `${rect.y}%`, width: `${rect.width}%`, height: `${rect.height}%` };
  const content = <>
    <span className="type-caption site-floor-object-label">{icon ? <span className="site-label-icon" aria-hidden="true">{icon}</span> : null}{label}{disabled ? " · 비활성" : null}</span>
    {summary ? <div id={summaryId} className="site-floor-object-summary type-caption">{summary}</div> : null}
    {editing ? <span data-resize-handle className="site-floor-object-resize" aria-hidden="true"><svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11 3 3 11M11 7 7 11" /></svg></span> : null}
  </>;
  const interaction = <div {...props} aria-describedby={summary ? summaryId : props["aria-describedby"]} role="button" tabIndex={0} aria-label={`${typeLabel ? `${typeLabel} · ` : ""}${label}${disabled ? " · 비활성" : ""}`} aria-pressed={selected} className={actions ? "site-floor-object-interaction" : "site-floor-object"} data-selected={selected} data-disabled={disabled} data-summary={Boolean(summary)} style={actions ? undefined : geometry} title={`${typeLabel ? `${typeLabel} · ` : ""}${label}${disabled ? " · 비활성" : ""}`}>{content}</div>;
  return actions ? <div className="site-floor-object" data-selected={selected} data-disabled={disabled} style={geometry}>{interaction}<div className="site-floor-object-actions" onPointerDown={event => event.stopPropagation()} onClick={event => event.stopPropagation()}>{actions}</div></div> : interaction;
}
