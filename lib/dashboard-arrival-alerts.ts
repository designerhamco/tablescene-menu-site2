export const DASHBOARD_ARRIVAL_SEEN_LIMIT = 200;

function uniqueIds(ids: readonly string[]) {
  return [...new Set(ids.filter((id) => typeof id === "string" && id.length > 0))];
}

export function getNewDashboardArrivalIds({
  currentIds,
  seenIds,
}: {
  currentIds: readonly string[];
  seenIds: readonly string[];
}) {
  const seen = new Set(uniqueIds(seenIds));
  return uniqueIds(currentIds).filter((id) => !seen.has(id));
}

export function mergeDashboardArrivalSeenIds({
  currentIds,
  seenIds,
  limit = DASHBOARD_ARRIVAL_SEEN_LIMIT,
}: {
  currentIds: readonly string[];
  seenIds: readonly string[];
  limit?: number;
}) {
  if (!Number.isSafeInteger(limit) || limit < 1) return [];
  return uniqueIds([...currentIds, ...seenIds]).slice(0, limit);
}
