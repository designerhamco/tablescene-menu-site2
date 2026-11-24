"use client";
import { useId } from "react";
import { ContentPanel } from "./content-panel";
import type { CSSProperties, ComponentPropsWithRef, ComponentPropsWithoutRef, ReactNode } from "react";

type Rect = { x: number; y: number; width: number; height: number };
export function FloorPlanCanvas({ name, aspectRatio, gridSize, editing = false, drawing = false, children, ...props }: Omit<ComponentPropsWithRef<"div">, "className" | "style"> & { name: string; aspectRatio: number; gridSize?: number; editing?: boolean; drawing?: boolean }) {
  return <div {...props} className="site-floor-canvas" style={{ aspectRatio, "--floor-plan-aspect": aspectRatio, ...(gridSize ? {
    "--floor-grid-size": gridSize, "--floor-grid-cell": `${100 / gridSize}%`,
  } : {}) } as CSSProperties} data-floor-grid={gridSize || undefined} data-editing={editing} data-drawing={drawing} role="group" aria-label={`${name} 배치도`}>{children}</div>;
}
/** One connected editing surface; standalone/read-only canvases keep their own edge. */
export function FloorPlanWorkspace({ tools, selection, footer, canvasActions, children }: { tools: ReactNode; selection?: ReactNode; canvasActions?: ReactNode; footer: ReactNode; children?: ReactNode }) {
  return <ContentPanel layout="canvas" aria-label="매장 배치 편집"><div className="site-floor-workspace-tools">{tools}</div>{selection ? <div className="site-floor-workspace-selection">{selection}</div> : null}<div className="site-floor-workspace-canvas">{children}{canvasActions ? <div className="site-floor-canvas-actions">{canvasActions}</div> : null}</div><div className="site-floor-workspace-footer">{footer}</div></ContentPanel>;
}

export function FloorPlanObject({ rect, label, icon, typeLabel, disabled = false, selected = false, children, summary, actions, managementActions, selectionControl, checked, pointKind, ...props }: Omit<ComponentPropsWithoutRef<"div">, "className" | "style" | "children"> & { rect: Rect; label: string; icon?: ReactNode; typeLabel?: string; disabled?: boolean; selected?: boolean; children?: ReactNode; summary?: ReactNode; actions?: ReactNode; managementActions?: ReactNode; selectionControl?: ReactNode; checked?: boolean; pointKind?: "table" | "kiosk" }) {
  const summaryId = useId();
  const overlay=Boolean(actions || managementActions || selectionControl);
  const geometry = { left: `${rect.x}%`, top: `${rect.y}%`, width: `${rect.width}%`, height: `${rect.height}%` };
  if (children != null) return <div {...props} className="site-floor-object" style={geometry}
    role="group" aria-label={label} data-selected={selected} data-disabled={disabled}>{children}</div>;
  const content = <>
    <span className={`${summary ? "type-label" : "type-caption"} site-floor-object-label`}>{icon ? <span className="site-label-icon" aria-hidden="true">{icon}</span> : null}{label}{disabled ? " · 비활성" : null}</span>
    {summary ? <div id={summaryId} className="site-floor-object-summary type-caption">{summary}</div> : null}
  </>;
  const interaction = <div {...props} aria-describedby={summary ? summaryId : props["aria-describedby"]} role="button" tabIndex={0} aria-label={`${typeLabel ? `${typeLabel} · ` : ""}${label}${disabled ? " · 비활성" : ""}`} aria-pressed={selected} className={overlay ? "site-floor-object-interaction" : "site-floor-object"} data-selected={selected} data-disabled={disabled} data-summary={Boolean(summary)} style={overlay ? undefined : geometry} title={`${typeLabel ? `${typeLabel} · ` : ""}${label}${disabled ? " · 비활성" : ""}`}>{content}</div>;
  return overlay ? <div className="site-floor-object" data-selected={selected} data-disabled={disabled} data-checked={checked || undefined} data-point-kind={pointKind} style={geometry}>
    {interaction}{selectionControl ? <div className="site-floor-object-choice" onPointerDown={event => event.stopPropagation()} onClick={event => event.stopPropagation()}>{selectionControl}</div> : null}<div className="site-floor-object-actions" onPointerDown={event => event.stopPropagation()} onClick={event => event.stopPropagation()}>{actions}</div>{managementActions ? <div className="site-floor-object-management" onPointerDown={event => event.stopPropagation()} onClick={event => event.stopPropagation()}>{managementActions}</div> : null}</div> : interaction;
}
