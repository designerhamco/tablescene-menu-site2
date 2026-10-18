import type { PostpayOrderCatalogOptionGroup } from "@/components/public-menu/order-call/types";

export function toggleOrderOption(
  group: PostpayOrderCatalogOptionGroup,
  current: ReadonlySet<string>,
  optionId: string,
): Set<string> {
  const next = new Set(current);
  if (!group.values.some((value) => value.id === optionId)) return next;
  if (next.has(optionId)) {
    next.delete(optionId);
    return next;
  }
  const selected = group.values.filter((value) => next.has(value.id));
  if (group.maxSelections === 1)
    selected.forEach((value) => next.delete(value.id));
  else if (selected.length >= group.maxSelections) return next;
  next.add(optionId);
  return next;
}
export function isOrderOptionSelectionValid(
  group: PostpayOrderCatalogOptionGroup,
  selectedIds: ReadonlySet<string>,
) {
  const count = group.values.filter((value) =>
    selectedIds.has(value.id),
  ).length;
  if (group.isRequired && count < group.minSelections) return false;
  if (count > 0 && count < group.minSelections) return false;
  return count <= group.maxSelections;
}
