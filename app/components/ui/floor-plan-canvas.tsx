"use client";
import { useId, useLayoutEffect, useRef, useState } from "react";
import { Popover, PopoverAnchor, PopoverArrow, PopoverContent } from "./popover";
import { Button } from "./button";
import { X } from "./site-icon";
import { ContentPanel } from "./content-panel";
import type { CSSProperties, ComponentPropsWithRef, ComponentPropsWithoutRef, ReactNode } from "react";

type Rect = { x: number; y: number; width: number; height: number };
export function FloorPlanCanvas({ name, aspectRatio, gridSize, editing = false, drawing = false, children, ...props }: Omit<ComponentPropsWithRef<"div">, "className" | "style"> & { name: string; aspectRatio: number; gridSize?: number; editing?: boolean; drawing?: boolean }) {
  return <div {...props} className="site-floor-canvas" style={{ aspectRatio, "--floor-plan-aspect": aspectRatio, ...(gridSize ? {
    "--floor-grid-size": gridSize, "--floor-grid-cell": `${100 / gridSize}%`,
  } : {}) } as CSSProperties} data-floor-grid={gridSize || undefined} data-editing={editing} data-drawing={drawing} role="group" aria-label={`${name} 배치도`}>{children}</div>;
}
/** One connected editing surface; standalone/read-only canvases keep their own edge. */
export function FloorPlanWorkspace({ tools, selection, footer, canvasActions, children, roomManagement }: { tools: ReactNode; selection?: ReactNode; canvasActions?: ReactNode; footer: ReactNode; children?: ReactNode; roomManagement?: boolean }) {
  return <ContentPanel layout="canvas" aria-label="매장 배치 편집" data-floor-room-management={roomManagement || undefined}><div className="site-floor-workspace-tools">{tools}</div>{selection ? <div className="site-floor-workspace-selection">{selection}</div> : null}<div className="site-floor-workspace-canvas">{children}{canvasActions ? <div className="site-floor-canvas-actions">{canvasActions}</div> : null}</div><div className="site-floor-workspace-footer">{footer}</div></ContentPanel>;
}

export function FloorPlanObject({ rect, label, icon, typeLabel, labelRole, disabled = false, selected = false, children, summary, actions, managementActions, selectionControl, checked, pointKind, selectedSettings, onDismissSettings, ...props }: Omit<ComponentPropsWithoutRef<"div">, "className" | "style" | "children"> & { rect: Rect; label: string; icon?: ReactNode; typeLabel?: string; labelRole?: "item-title"; disabled?: boolean; selected?: boolean; children?: ReactNode; summary?: ReactNode; actions?: ReactNode; managementActions?: ReactNode; selectionControl?: ReactNode; checked?: boolean; pointKind?: "table" | "kiosk"; selectedSettings?: ReactNode; onDismissSettings?: () => void }) {
  const summaryId = useId();
  const settingsId = useId();
  const cardRef = useRef<HTMLDivElement>(null);
  const inlineRef = useRef<HTMLDivElement>(null);
  const settingsScrollRef = useRef<HTMLDivElement>(null);
  const [settingsElement, setSettingsElement] = useState<HTMLDivElement | null>(null);
  const interactionRef = useRef<HTMLDivElement>(null);
  const virtualAnchor = useRef({ getBoundingClientRect: () => cardRef.current?.getBoundingClientRect() ?? new DOMRect() });
  const [placement, setPlacement] = useState<"card" | "popover">();
  const hasSettings = selected && Boolean(selectedSettings);
  const popoverOpen = hasSettings && placement === "popover";
  const overlay = Boolean(actions || managementActions || selectionControl || hasSettings);
  useLayoutEffect(() => {
    const card = cardRef.current;
    const slot = inlineRef.current;
    const content = settingsElement;
    if (!hasSettings || !card || !slot || !content) return;
    function measure() {
      if (!card || !slot || !content) return;
      const inset = (card.clientWidth - slot.clientWidth) / 2;
      const fits = content.offsetWidth <= slot.clientWidth && content.offsetHeight + inset <= card.clientHeight / 2;
      setPlacement(fits ? "card" : "popover");
    }
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(card);
    observer.observe(content);
    return () => observer.disconnect();
  }, [hasSettings, settingsElement]);
  const geometry = { left: `${rect.x}%`, top: `${rect.y}%`, width: `${rect.width}%`, height: `${rect.height}%` };
  if (children != null) return <div {...props} className="site-floor-object" style={geometry}
    role="group" aria-label={label} data-selected={selected} data-disabled={disabled}>{children}</div>;
  const content = <>
    <span className={`${labelRole === "item-title" ? "type-item-title" : summary ? "type-label" : "type-caption"} site-floor-object-label`}>{icon ? <span className="site-label-icon" aria-hidden="true">{icon}</span> : null}{label}{disabled ? " · 비활성" : null}</span>
    {summary ? <div id={summaryId} className="site-floor-object-summary type-caption">{summary}</div> : null}
  </>;
  const interaction = <div {...props} ref={interactionRef} aria-controls={hasSettings ? settingsId : undefined} aria-haspopup={popoverOpen ? "dialog" : undefined} aria-describedby={summary ? summaryId : props["aria-describedby"]} role="button" tabIndex={0} aria-label={`${typeLabel ? `${typeLabel} · ` : ""}${label}${disabled ? " · 비활성" : ""}`} aria-pressed={selected} className={overlay ? "site-floor-object-interaction" : "site-floor-object"} data-selected={selected} data-disabled={disabled} data-summary={Boolean(summary)} style={overlay ? undefined : geometry} title={`${typeLabel ? `${typeLabel} · ` : ""}${label}${disabled ? " · 비활성" : ""}`}>{content}</div>;
  if (!overlay) return interaction;

  const settings = hasSettings ? <div ref={setSettingsElement} className="site-floor-settings-content">{selectedSettings}</div> : null;
  function dismissSettings() {
    onDismissSettings?.();
    interactionRef.current?.focus({ preventScroll: true });
  }

  return <>
    <div ref={cardRef} className="site-floor-object" data-selected={selected} data-disabled={disabled} data-checked={checked || undefined} data-point-kind={pointKind} data-settings-placement={hasSettings ? placement ?? "measuring" : undefined} style={geometry}>
      {interaction}
      {selectionControl && <div className="site-floor-object-choice" onPointerDown={event => event.stopPropagation()} onClick={event => event.stopPropagation()}>{selectionControl}</div>}
      {actions && <div className="site-floor-object-actions" onPointerDown={event => event.stopPropagation()} onClick={event => event.stopPropagation()}>{actions}</div>}
      {managementActions && <div className="site-floor-object-management" onPointerDown={event => event.stopPropagation()} onClick={event => event.stopPropagation()}>{managementActions}</div>}
      {hasSettings && <div ref={inlineRef} id={popoverOpen ? undefined : settingsId} className="site-floor-settings-inline">
        {!popoverOpen && settings}
      </div>}
    </div>
    {popoverOpen && <Popover open>
      <PopoverAnchor virtualRef={virtualAnchor} />
      <PopoverContent id={settingsId} className="site-floor-settings-popover" align="start" sideOffset={8} collisionPadding={16} aria-label={`${label} 주문·호출 설정`}
        onInteractOutside={event => event.preventDefault()}
        onEscapeKeyDown={event => { event.preventDefault(); dismissSettings(); }}
        onOpenAutoFocus={event => {
          event.preventDefault();
          settingsScrollRef.current?.focus({ preventScroll: true });
        }}
        onCloseAutoFocus={event => event.preventDefault()}>
        <div className="site-action-row" data-distribution="between">
          <span className="type-item-title min-w-0 break-words">{label}</span>
          <Button type="button" size="icon" iconSize="compact" variant="ghost" aria-label="설정 닫기" onClick={dismissSettings}><X aria-hidden="true" /></Button>
        </div>
        <div ref={settingsScrollRef} className="site-floor-settings-scroll" role="region" aria-label="주문·호출과 기기 연결" tabIndex={0}>{settings}</div>
        <PopoverArrow className="site-floor-settings-arrow" />
      </PopoverContent>
    </Popover>}
  </>;
}
