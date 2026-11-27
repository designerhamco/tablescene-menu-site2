"use client";

import { ToggleGroup, ToggleGroupItem } from "@/app/components/ui/toggle-group";
import { normalizeCatalogServiceFilter, type CatalogServiceFilter } from "@/lib/catalog-designs";
import { SERVICE_CATEGORY_LABELS } from "@/lib/service-categories";

const serviceOptions = [
  { value: "all", label: "전체" },
  { value: "basic", label: SERVICE_CATEGORY_LABELS.basic },
  { value: "dining", label: SERVICE_CATEGORY_LABELS.dining },
  { value: "display", label: SERVICE_CATEGORY_LABELS.display },
] as const;

export default function CatalogServiceButtons({ value, onValueChange }: {
  value: CatalogServiceFilter;
  onValueChange: (value: CatalogServiceFilter) => void;
}) {
  return (
    <ToggleGroup type="single" appearance="segmented" size="sm" aria-label="메뉴판 유형"
      className="max-w-full overflow-x-auto" value={value}
      onValueChange={next => { if (next) onValueChange(normalizeCatalogServiceFilter(next)); }}>
      {serviceOptions.map(option => (
        <ToggleGroupItem key={option.value} value={option.value} className="flex-initial shrink">{option.label}</ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
