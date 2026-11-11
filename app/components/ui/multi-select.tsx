"use client";

import { useId, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Button } from "./button";

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
  const single = selected.length === 1 ? selected[0] : null;
  function toggle(key: T) {
    onValueChange(options.filter(option => option.key === key ? !value.includes(key) : value.includes(option.key)).map(option => option.key));
  }
  return <Popover>
    <PopoverTrigger asChild>
      <button type="button" className="site-field site-select-trigger site-multiselect-trigger" data-field-size="md" aria-label={label} aria-describedby={summaryId}>
        {single?.icon ?? icon}<span className="truncate">{single?.label ?? label}{selected.length > 1 ? ` ${selected.length}` : ""}</span>
        <ChevronDown className="site-select-chevron" size={20} strokeWidth={2.25} aria-hidden="true" />
      </button>
    </PopoverTrigger>
    <span id={summaryId} className="sr-only">{selected.length ? selected.map(option => option.label).join(", ") : "전체"}</span>
    <PopoverContent align="start" collisionPadding={16} className="site-multiselect-content" aria-label={`${label} 필터`}>
      <div role="group" aria-label={`${label} 선택`} className={appearance === "swatches" ? "site-multiselect-swatches" : "site-multiselect-options"}>
        {options.map(option => <label key={option.key} className={appearance === "swatches" ? "site-multiselect-swatch" : "site-multiselect-option"} title={appearance === "swatches" ? option.label : undefined}>
          <input type="checkbox" checked={value.includes(option.key)} onChange={() => toggle(option.key)} className={appearance === "swatches" ? "sr-only" : undefined} />
          {appearance === "swatches" ? <><span className="site-color-swatch" data-shape="circle"><span style={{ backgroundColor: option.swatch ?? undefined }} /></span><span className="sr-only">{option.label}</span></> : <>{option.icon ?? icon}<span>{option.label}</span></>}
        </label>)}
      </div>
      <div className="site-multiselect-reset"><Button variant="ghost" size="compact" disabled={!selected.length} onClick={() => onValueChange([])}>선택 해제</Button></div>
    </PopoverContent>
  </Popover>;
}
