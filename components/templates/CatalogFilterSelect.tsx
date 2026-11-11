"use client";

import type { ReactNode } from "react";
import { MultiSelect, type MultiSelectOption } from "@/app/components/ui/multi-select";

export default function CatalogFilterSelect<T extends string>({ options, ...props }: {
  label: string;
  icon: ReactNode;
  options: readonly MultiSelectOption<T>[];
  value: readonly Exclude<T, "all">[];
  onValueChange: (value: Exclude<T, "all">[]) => void;
  appearance?: "list" | "swatches";
  presentation?: "popover" | "accordion";
}) {
  const choices = options.filter((option): option is MultiSelectOption<Exclude<T, "all">> => option.key !== "all");
  return <MultiSelect {...props} options={choices} />;
}
