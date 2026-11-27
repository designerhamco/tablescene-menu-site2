"use client";

import { normalizeCatalogServiceFilter, type CatalogServiceFilter } from "@/lib/catalog-designs";
import { SERVICE_CATEGORY_LABELS } from "@/lib/service-categories";

const serviceOptions = [
  { value: "all", label: "전체 유형" },
  { value: "basic", label: SERVICE_CATEGORY_LABELS.basic },
  { value: "dining", label: SERVICE_CATEGORY_LABELS.dining },
  { value: "display", label: SERVICE_CATEGORY_LABELS.display },
] as const;

export default function CatalogServiceSelect({ value, onValueChange }: {
  value: CatalogServiceFilter;
  onValueChange: (value: CatalogServiceFilter) => void;
}) {
  return <select className="site-field" aria-label="메뉴판 유형" value={value}
    onChange={event => onValueChange(normalizeCatalogServiceFilter(event.target.value))}>
    {serviceOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
  </select>;
}
