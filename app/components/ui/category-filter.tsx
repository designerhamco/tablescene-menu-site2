"use client";

import type { TabsSize } from "./tabs";
import { cn } from "./utils";

export type CategoryOption = { value: string; label: string; disabled?: boolean };

/** Topic classification filters one existing result list; it does not create tab panels. */
export function CategoryFilter({ label, value, options, onValueChange, size = "md", className }: {
  label: string;
  value: string;
  options: readonly CategoryOption[];
  onValueChange: (value: string) => void;
  size?: TabsSize;
  className?: string;
}) {
  return <div role="group" aria-label={label} data-purpose="category" data-size={size}
    className={cn("site-topic-tabs", `site-tab-size-${size}`, className)}>
    {options.map(option => <button key={option.value} type="button" className="site-topic-tab"
      aria-pressed={value === option.value} disabled={option.disabled}
      onClick={() => onValueChange(option.value)}>{option.label}</button>)}
  </div>;
}
