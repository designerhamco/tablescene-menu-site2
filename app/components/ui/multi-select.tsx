"use client";

import { useId, useRef, type ReactNode } from "react";
import { ChevronDown, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger, PopoverAnchor } from "./popover";
import { Button } from "./button";
import { Badge } from "./badge";

export type MultiSelectOption<T extends string> = { key: T; label: string; icon?: ReactNode; swatch?: string | null };

/** Checkbox popover: each choice updates immediately without closing the panel. */
export function MultiSelect<T extends string>({ label, icon, options, value, onValueChange, appearance = "list" }: {
  label: string;
  icon: ReactNode;
  options: readonly MultiSelectOption<T>[];
  value: readonly T[];
  onValueChange: (value: T[]) => void;
  appearance?: "list" | "swatches";
}) {
  const summaryId = useId();
  const selected = options.filter(option => value.includes(option.key));
  const triggerRef = useRef<HTMLButtonElement>(null);
  const allSelected = options.length > 0 && selected.length === options.length;
  const partiallySelected = selected.length > 0 && !allSelected;
  function clearSelection() {
    onValueChange([]);
    triggerRef.current?.focus();
  }
  function toggle(key: T) {
    onValueChange(options.filter(option => option.key === key ? !value.includes(key) : value.includes(option.key)).map(option => option.key));
  }
  return <Popover>
    <PopoverAnchor asChild>
      <div className="site-field site-select-trigger site-multiselect-control" data-field-size="md">
        <PopoverTrigger asChild>
          <button ref={triggerRef} type="button" className="site-multiselect-trigger" aria-label={label} aria-describedby={summaryId} />
        </PopoverTrigger>
        <span className="site-multiselect-label" aria-hidden="true">{icon}<span>{label}</span></span>
        {selected.length > 0 && <Badge tone="neutral" className="site-multiselect-count">
          <span aria-hidden="true">{selected.length}</span>
          <Button type="button" variant="ghost" size="icon" iconSize="compact" className="site-multiselect-clear" aria-label={`${label} 선택 해제`} title={`${label} 선택 해제`} onPointerDown={event => event.preventDefault()} onClick={clearSelection}><X aria-hidden="true" /></Button>
        </Badge>}
        <ChevronDown className="site-select-chevron" size={20} strokeWidth={2.25} aria-hidden="true" />
      </div>
    </PopoverAnchor>
    <span id={summaryId} className="sr-only">{selected.length ? `${selected.length}개 선택: ${selected.map(option => option.label).join(", ")}` : "선택 없음, 전체 결과"}</span>
    <PopoverContent align="start" collisionPadding={16} className="site-multiselect-content" aria-label={`${label} 필터`}>
      <div role="group" aria-label={`${label} 선택`} className="site-multiselect-body">
        <label className="site-multiselect-option">
          <input type="checkbox" checked={allSelected} aria-checked={partiallySelected ? "mixed" : allSelected} ref={node => { if (node) node.indeterminate = partiallySelected; }} disabled={!options.length} onChange={event => onValueChange(event.currentTarget.checked ? options.map(option => option.key) : [])} />
          <span>전체</span>
        </label>
        <hr className="site-content-divider" />
        <div className={appearance === "swatches" ? "site-multiselect-swatches" : "site-multiselect-options"}>
        {options.map(option => <label key={option.key} className={appearance === "swatches" ? "site-multiselect-swatch" : "site-multiselect-option"} title={appearance === "swatches" ? option.label : undefined}>
          <input type="checkbox" checked={value.includes(option.key)} onChange={() => toggle(option.key)} className={appearance === "swatches" ? "sr-only" : undefined} />
          {appearance === "swatches" ? <><span className="site-color-swatch" data-shape="circle"><span style={{ backgroundColor: option.swatch ?? undefined }} /></span><span className="sr-only">{option.label}</span></> : <>{option.icon ?? icon}<span>{option.label}</span></>}
        </label>)}
        </div>
      </div>
      <div className="site-multiselect-reset"><Button variant="ghost" size="compact" disabled={!selected.length} onClick={() => onValueChange([])}>선택 해제</Button></div>
    </PopoverContent>
  </Popover>;
}
