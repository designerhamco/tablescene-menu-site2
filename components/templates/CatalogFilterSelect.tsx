"use client";

import type { ReactNode } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";

export type CatalogFilterOption<T extends string> = { key: T; label: string; icon?: ReactNode };

export default function CatalogFilterSelect<T extends string>({ label, icon, options, value, onValueChange }: {
  label: string;
  icon: ReactNode;
  options: readonly CatalogFilterOption<T>[];
  value: T;
  onValueChange: (value: T) => void;
}) {
  const selected = options.find(option => option.key === value);
  return <Select value={value} onValueChange={next => {
    const option = options.find(item => item.key === next);
    if (option) onValueChange(option.key);
  }}>
    <SelectTrigger aria-label={label} className="site-catalog-filter-select">
      <SelectValue>{value === "all" ? icon : selected?.icon ?? icon}<span className="truncate">{value === "all" ? label : selected?.label}</span></SelectValue>
    </SelectTrigger>
    <SelectContent align="start">
      {options.map(option => <SelectItem key={option.key} value={option.key}>{option.icon ?? icon}<span>{option.label}</span></SelectItem>)}
    </SelectContent>
  </Select>;
}
