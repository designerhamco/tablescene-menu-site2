"use client";

import { CATALOG_LAYOUT_FILTERS, type CatalogLayoutFilter } from "@/lib/catalog-designs";
import CatalogFilterSelect from "./CatalogFilterSelect";
import CatalogLayoutIcon from "./CatalogLayoutIcon";

export default function CatalogLayoutSelect({ value, onValueChange }: {
  value: CatalogLayoutFilter;
  onValueChange: (value: CatalogLayoutFilter) => void;
}) {
  return <CatalogFilterSelect label="레이아웃" icon={<CatalogLayoutIcon layout="all" />}
    value={value} onValueChange={onValueChange}
    options={CATALOG_LAYOUT_FILTERS.map(option => ({ ...option, label: option.key === "all" ? "전체 레이아웃" : option.label, icon: <CatalogLayoutIcon layout={option.key} /> }))} />;
}
