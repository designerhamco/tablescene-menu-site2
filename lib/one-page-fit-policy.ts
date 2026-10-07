import type { OnePageLayoutShell } from "@/lib/one-page-layout-shells";

export const ONE_PAGE_PREFERRED_MAX_MENU_COLUMNS = 3;
export const ONE_PAGE_MAX_MENU_COLUMNS = 4;

export function orderOnePageMenuColumnCandidates(candidates: readonly number[]) {
  const normalizedCandidates = Array.from(
    new Set(
      candidates.filter(
        (columns) =>
          Number.isInteger(columns) &&
          columns > 0 &&
          columns <= ONE_PAGE_MAX_MENU_COLUMNS,
      ),
    ),
  );
  const preferredCandidates = normalizedCandidates
    .filter((columns) => columns <= ONE_PAGE_PREFERRED_MAX_MENU_COLUMNS)
    .sort((left, right) => right - left);
  const rescueCandidates = normalizedCandidates
    .filter((columns) => columns > ONE_PAGE_PREFERRED_MAX_MENU_COLUMNS)
    .sort((left, right) => left - right);

  return [...preferredCandidates, ...rescueCandidates];
}

export function selectOnePageFitTierState<TState>({
  preferredSelectedState,
  preferredReadableFallbackState,
  rescueSelectedState,
  preferredFallbackState,
  rescueFallbackState,
  emergencyState,
}: {
  preferredSelectedState: TState | null;
  preferredReadableFallbackState: TState | null;
  rescueSelectedState: TState | null;
  preferredFallbackState: TState | null;
  rescueFallbackState: TState | null;
  emergencyState: TState | null;
}) {
  return (
    preferredSelectedState ??
    preferredReadableFallbackState ??
    rescueSelectedState ??
    preferredFallbackState ??
    rescueFallbackState ??
    emergencyState
  );
}

export function getOnePageTotalColumnCount(shell: OnePageLayoutShell, menuColumns: number) {
  return shell === "brand_top_band" ? menuColumns : menuColumns + 1;
}
