export type CafeAMenuWrapLineSample = {
  titleLines: number;
  descriptionLines?: number | null;
};

export type CafeAMenuWrapDensityDecision = {
  affectedCount: number;
  affectedRatio: number;
  excessLineCount: number;
  maxDescriptionLines: number;
  maxTitleLines: number;
  penalty: number;
  recommendedScale: number;
  sampleCount: number;
};

export const CAFE_A_MAX_COMFORTABLE_TITLE_LINES = 2;
export const CAFE_A_MAX_COMFORTABLE_DESCRIPTION_LINES = 3;
export const CAFE_A_MILD_WRAP_SCALE = 0.97;
export const CAFE_A_DENSE_WRAP_SCALE = 0.94;
export const CAFE_A_WRAP_SCALE_CANDIDATES = [0.97, 0.94, 0.91, 0.88, 0.85, 0.82] as const;

function normalizeLineCount(value: number | null | undefined) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value ?? 0));
}

export function getCafeAMenuWrapDensityDecision(
  samples: readonly CafeAMenuWrapLineSample[],
): CafeAMenuWrapDensityDecision {
  const normalizedSamples = samples
    .map((sample) => ({
      titleLines: normalizeLineCount(sample.titleLines),
      descriptionLines: normalizeLineCount(sample.descriptionLines),
    }))
    .filter((sample) => sample.titleLines > 0 || sample.descriptionLines > 0);

  const sampleCount = normalizedSamples.length;
  const maxTitleLines = normalizedSamples.reduce(
    (maximum, sample) => Math.max(maximum, sample.titleLines),
    0,
  );
  const maxDescriptionLines = normalizedSamples.reduce(
    (maximum, sample) => Math.max(maximum, sample.descriptionLines),
    0,
  );
  const affectedCount = normalizedSamples.filter(
    (sample) =>
      sample.titleLines > CAFE_A_MAX_COMFORTABLE_TITLE_LINES ||
      sample.descriptionLines > CAFE_A_MAX_COMFORTABLE_DESCRIPTION_LINES ||
      (sample.titleLines >= CAFE_A_MAX_COMFORTABLE_TITLE_LINES &&
        sample.descriptionLines >= CAFE_A_MAX_COMFORTABLE_DESCRIPTION_LINES),
  ).length;
  const affectedRatio = sampleCount > 0 ? affectedCount / sampleCount : 0;
  const excessLineCount = normalizedSamples.reduce(
    (total, sample) =>
      total +
      Math.max(0, sample.titleLines - CAFE_A_MAX_COMFORTABLE_TITLE_LINES) +
      Math.max(0, sample.descriptionLines - CAFE_A_MAX_COMFORTABLE_DESCRIPTION_LINES) +
      (sample.titleLines === CAFE_A_MAX_COMFORTABLE_TITLE_LINES &&
        sample.descriptionLines === CAFE_A_MAX_COMFORTABLE_DESCRIPTION_LINES
        ? 1
        : 0),
    0,
  );

  const hasRepeatedWrapPressure = affectedCount >= 2 && affectedRatio >= 0.2;
  const hasDenseWrapPressure =
    hasRepeatedWrapPressure &&
    (affectedRatio >= 1 / 3 ||
      excessLineCount / Math.max(1, sampleCount) >= 0.45 ||
      maxTitleLines >= 4 ||
      maxDescriptionLines >= 5);
  const recommendedScale = hasDenseWrapPressure
    ? CAFE_A_DENSE_WRAP_SCALE
    : hasRepeatedWrapPressure
      ? CAFE_A_MILD_WRAP_SCALE
      : 1;
  const penalty = hasRepeatedWrapPressure
    ? affectedRatio * 720 + excessLineCount * 88 + Math.max(0, maxTitleLines - 3) * 120 + Math.max(0, maxDescriptionLines - 4) * 80
    : 0;

  return {
    affectedCount,
    affectedRatio,
    excessLineCount,
    maxDescriptionLines,
    maxTitleLines,
    penalty,
    recommendedScale,
    sampleCount,
  };
}

export function getCafeAMenuWrapDensityDecisionForColumns(
  columns: readonly (readonly CafeAMenuWrapLineSample[])[],
): CafeAMenuWrapDensityDecision {
  const populatedColumns = columns.filter((column) => column.length > 0);
  const boardDecision = getCafeAMenuWrapDensityDecision(populatedColumns.flat());
  const columnDecisions = populatedColumns.map((column) =>
    getCafeAMenuWrapDensityDecision(column),
  );

  return [boardDecision, ...columnDecisions].reduce((densestDecision, decision) => {
    if (decision.recommendedScale < densestDecision.recommendedScale) return decision;
    if (
      decision.recommendedScale === densestDecision.recommendedScale &&
      decision.penalty > densestDecision.penalty
    ) {
      return decision;
    }
    return densestDecision;
  }, boardDecision);
}

export function getCafeAMenuWrapScaleCandidates(
  decision: CafeAMenuWrapDensityDecision,
) {
  if (decision.recommendedScale >= 1) return [1] as const;
  const startIndex = CAFE_A_WRAP_SCALE_CANDIDATES.findIndex(
    (scale) => scale <= decision.recommendedScale,
  );
  return CAFE_A_WRAP_SCALE_CANDIDATES.slice(Math.max(0, startIndex));
}

export function hasCafeAMenuWrapDensityImproved(
  baseline: CafeAMenuWrapDensityDecision,
  candidate: CafeAMenuWrapDensityDecision,
) {
  return candidate.recommendedScale > baseline.recommendedScale;
}
