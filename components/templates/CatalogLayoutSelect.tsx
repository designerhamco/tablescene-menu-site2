"use client";

import { CATALOG_LAYOUT_FILTERS, type CatalogLayoutFilter } from "@/lib/catalog-designs";
import CatalogFilterSelect from "./CatalogFilterSelect";
import CatalogLayoutIcon from "./CatalogLayoutIcon";

export default function CatalogLayoutSelect({ value, onValueChange, presentation }: {
  presentation?: "popover" | "accordion";
  value: readonly Exclude<CatalogLayoutFilter, "all">[];
  onValueChange: (value: Exclude<CatalogLayoutFilter, "all">[]) => void;
}) {
  return <CatalogFilterSelect label="레이아웃" icon={<CatalogLayoutIcon layout="all" />}
    value={value} onValueChange={onValueChange} presentation={presentation}
    options={CATALOG_LAYOUT_FILTERS.map(option => ({ ...option, label: option.key === "all" ? "전체 레이아웃" : option.label, icon: <CatalogLayoutIcon layout={option.key} /> }))} />;
}
