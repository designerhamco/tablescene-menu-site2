"use client";

import { useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { ChevronDown } from "@/app/components/ui/site-arrow";
import { Popover, PopoverContent, PopoverTrigger, PopoverAnchor } from "./popover";
import { Button } from "./button";
import { Badge } from "./badge";
import { AccordionItem, AccordionTrigger, AccordionContent } from "./accordion";

export type MultiSelectOption<T extends string> = { key: T; label: string; icon?: ReactNode; swatch?: string | null };

type MultiSelectProps<T extends string> = {
  label: string;
  icon: ReactNode;
  options: readonly MultiSelectOption<T>[];
  value: readonly T[];
  onValueChange: (value: T[]) => void;
  appearance?: "list" | "swatches";
  presentation?: "popover" | "accordion";
};

/** Shared choices keep desktop and compact mobile filters behaviorally identical. */
export function MultiSelectChoices<T extends string>({ label, icon, options, value, onValueChange, appearance = "list" }: MultiSelectProps<T>) {
  const selected = options.filter(option => value.includes(option.key));
  const allSelected = options.length > 0 && selected.length === options.length;
  const partiallySelected = selected.length > 0 && !allSelected;
  function toggle(key: T) {
    onValueChange(options.filter(option => option.key === key ? !value.includes(key) : value.includes(option.key)).map(option => option.key));
  }
  return <div role="group" aria-label={`${label} 선택`} className="site-multiselect-body">
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
  </div>;
}

/** Checkbox popover: each choice updates immediately without closing the panel. */
export function MultiSelect<T extends string>({ label, icon, options, value, onValueChange, appearance = "list", presentation = "popover" }: MultiSelectProps<T>) {
  const summaryId = useId();
  const selected = options.filter(option => value.includes(option.key));
  const triggerRef = useRef<HTMLButtonElement>(null);
  function clearSelection() {
    onValueChange([]);
    triggerRef.current?.focus();
  }
  const title = <span className="site-multiselect-label" aria-hidden="true">{icon}<span>{label}</span></span>;
  const count = selected.length > 0 && <Badge tone="neutral" className="site-multiselect-count">
    <span aria-hidden="true">{selected.length}</span>
    <Button type="button" variant="ghost" size="icon" iconSize="compact" className="site-multiselect-clear" aria-label={`${label} 선택 해제`} title={`${label} 선택 해제`} onPointerDown={event => event.preventDefault()} onClick={clearSelection}><X aria-hidden="true" /></Button>
  </Badge>;
  const summary = <span id={summaryId} className="sr-only">{selected.length ? `${selected.length}개 선택: ${selected.map(option => option.label).join(", ")}` : "선택 없음, 전체 결과"}</span>;
  const choices = <MultiSelectChoices label={label} icon={icon} options={options} value={value} onValueChange={onValueChange} appearance={appearance} />;
  if (presentation === "accordion") return <AccordionItem value={label} className="site-multiselect-section">
    <div className="site-select-trigger site-multiselect-section-heading">
      <AccordionTrigger ref={triggerRef} className="site-multiselect-trigger site-multiselect-section-trigger" aria-label={label} aria-describedby={summaryId} />
      {title}{count}<ChevronDown className="site-select-chevron" size={20} aria-hidden="true" />
    </div>
    {summary}
    <AccordionContent className="site-multiselect-section-content">{choices}</AccordionContent>
  </AccordionItem>;
  return <Popover>
    <PopoverAnchor asChild>
      <div className="site-field site-select-trigger site-multiselect-control" data-field-size="md">
        <PopoverTrigger asChild>
          <button ref={triggerRef} type="button" className="site-multiselect-trigger" aria-label={label} aria-describedby={summaryId} />
        </PopoverTrigger>
        {title}{count}
        <ChevronDown className="site-select-chevron" size={20} aria-hidden="true" />
      </div>
    </PopoverAnchor>
    {summary}
    <PopoverContent side="bottom" avoidCollisions={false} align="start" collisionPadding={16} className="site-multiselect-content" aria-label={`${label} 필터`}>
      {choices}
    </PopoverContent>
  </Popover>;
}
