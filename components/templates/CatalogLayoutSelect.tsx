"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { CATALOG_LAYOUT_FILTERS, normalizeCatalogLayoutFilter, type CatalogLayoutFilter } from "@/lib/catalog-designs";
import CatalogLayoutIcon from "./CatalogLayoutIcon";

export default function CatalogLayoutSelect({ id, label, value, onValueChange, allLabel = "전체 구성" }: {
  id?: string;
  label: string;
  value: CatalogLayoutFilter;
  onValueChange: (value: CatalogLayoutFilter) => void;
  allLabel?: string;
}) {
  const optionLabel = (key: CatalogLayoutFilter, text: string) => key === "all" ? allLabel : text;
  const selected = CATALOG_LAYOUT_FILTERS.find(option => option.key === value)!;
  return (
    <Select value={value} onValueChange={next => onValueChange(normalizeCatalogLayoutFilter(next))}>
      <SelectTrigger id={id} aria-label={label} className="site-catalog-layout-select">
        <SelectValue>
          <CatalogLayoutIcon layout={value} className="size-5" />
          <span>{optionLabel(value, selected.label)}</span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent align="end" className="site-catalog-layout-options">
        {CATALOG_LAYOUT_FILTERS.map(option => (
          <SelectItem key={option.key} value={option.key}>
            <CatalogLayoutIcon layout={option.key} className="size-5" />
            <span>{optionLabel(option.key, option.label)}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
