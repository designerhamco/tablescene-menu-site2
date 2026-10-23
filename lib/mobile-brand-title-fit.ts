/** Brand-only mobile width policy. Independent of menu density/canvas fitting. */
export const MOBILE_BRAND_WIDTH_RATIO = 0.75;
export const MOBILE_BRAND_MINIMUM_PX = 44;
// 390px phone minus shared 24px side insets: width-relative visual ceilings.
export const MOBILE_BRAND_SINGLE_LINE_CAP_RATIO = 56 / 342;
export const MOBILE_BRAND_MULTILINE_CAP_RATIO = 44 / 342;
export const MOBILE_BRAND_SHORT_SINGLE_LINE_CAP_RATIO = 64 / 342;
export const MOBILE_BRAND_SHORT_SINGLE_LINE_COVERAGE = 0.45;
export const MOBILE_BRAND_SHORT_NAME_MIN_GRAPHEMES = 3;
export const MOBILE_BRAND_SHORT_NAME_MAX_GRAPHEMES = 4;
const MAX_MEASURED_UNITS = 32;

type TextPlan = { units: string[]; separator: string };
export type MobileBrandTitleFit = { lines: string[]; fontSize: number; naturalWrap: boolean };

export function normalizeMobileBrandTitle(title: string) {
  return title.trim().replace(/\s+/gu, " ");
}

function graphemes(text: string) {
  return typeof Intl.Segmenter === "function"
    ? Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text), (entry) => entry.segment)
    : Array.from(text);
}

function plansFor(title: string): TextPlan[] {
  const text = normalizeMobileBrandTitle(title);
  const words = text.split(" ");
  if (words.length === 1 && /[가-힣\u3040-\u30ff\u3400-\u9fff]/u.test(text)) return [{ units: graphemes(text), separator: "" }];
  return [{ units: words, separator: " " }, { units: graphemes(text), separator: "" }];
}

function lineText(plan: TextPlan, start: number, end: number) {
  return plan.units.slice(start, end).join(plan.separator).trim();
}

export function getMobileBrandMeasurementTexts(title: string, maxMeasuredUnits = MAX_MEASURED_UNITS): string[] {
  const texts = new Set([normalizeMobileBrandTitle(title)]);
  for (const plan of plansFor(title)) {
    if (plan.units.length > maxMeasuredUnits) continue;
    for (let start = 0; start < plan.units.length; start++) {
      for (let end = start + 1; end <= plan.units.length; end++) {
        const text = lineText(plan, start, end);
        if (text) texts.add(text);
      }
    }
  }
  return [...texts].filter(Boolean);
}

/** Minimax partitioning balances rendered widths, not character counts. */
function balancedLines(plan: TextPlan, widths: ReadonlyMap<string, number>, maxMeasuredUnits = MAX_MEASURED_UNITS) {
  const count = plan.units.length;
  if (count > maxMeasuredUnits) return [];
  type Candidate = { lines: string[]; widest: number; sumSquares: number };
  const dp: (Candidate | undefined)[][] = Array.from({ length: count + 1 }, () => Array(count + 1));
  dp[0][0] = { lines: [], widest: 0, sumSquares: 0 };
  for (let lineCount = 1; lineCount <= count; lineCount++) {
    for (let end = lineCount; end <= count; end++) {
      for (let start = lineCount - 1; start < end; start++) {
        const previous = dp[lineCount - 1][start];
        const text = lineText(plan, start, end);
        const width = widths.get(text);
        if (!previous || !text || !width || !Number.isFinite(width)) continue;
        const next = { lines: [...previous.lines, text], widest: Math.max(previous.widest, width), sumSquares: previous.sumSquares + width * width };
        const current = dp[lineCount][end];
        if (!current || next.widest < current.widest - 0.01 || (Math.abs(next.widest - current.widest) <= 0.01 && next.sumSquares < current.sumSquares)) dp[lineCount][end] = next;
      }
    }
  }
  return dp.slice(1).map((row) => row[count]).filter((value): value is Candidate => Boolean(value));
}

/** Word/grapheme partitions only; does not change the independent mobile policy. */
export function getBalancedBrandLinePlans(title: string, widths: ReadonlyMap<string, number>, maxMeasuredUnits = MAX_MEASURED_UNITS) {
  return plansFor(title).map((plan) => balancedLines(plan, widths, maxMeasuredUnits));
}

export function selectMobileBrandTitleFit(
  title: string,
  widths: ReadonlyMap<string, number>,
  availableWidth: number,
  minimumPx = MOBILE_BRAND_MINIMUM_PX,
  opticalScale = 1,
): MobileBrandTitleFit {
  const minimum = Math.max(MOBILE_BRAND_MINIMUM_PX, minimumPx);
  const text = normalizeMobileBrandTitle(title);
  const fullWidth = widths.get(text);
  const compactLength = graphemes(text.replace(/\s+/gu, "")).length;
  const safeOpticalScale = Number.isFinite(opticalScale) ? Math.max(1, opticalScale) : 1;
  const regularSingleCap = Math.max(minimum, availableWidth * MOBILE_BRAND_SINGLE_LINE_CAP_RATIO) * safeOpticalScale;
  const regularCoverage = fullWidth && Number.isFinite(fullWidth) && availableWidth > 0
    ? fullWidth * regularSingleCap / 100 / availableWidth
    : Infinity;
  const useShortNameBoost = compactLength >= MOBILE_BRAND_SHORT_NAME_MIN_GRAPHEMES
    && compactLength <= MOBILE_BRAND_SHORT_NAME_MAX_GRAPHEMES
    && regularCoverage < MOBILE_BRAND_SHORT_SINGLE_LINE_COVERAGE;
  return selectBrandTitleFit(title, widths, availableWidth, {
    minimum,
    singleCap: useShortNameBoost
      ? Math.max(regularSingleCap, availableWidth * MOBILE_BRAND_SHORT_SINGLE_LINE_CAP_RATIO * safeOpticalScale)
      : regularSingleCap,
    multiCap: Math.max(minimum, availableWidth * MOBILE_BRAND_MULTILINE_CAP_RATIO) * safeOpticalScale,
    singleTarget: 1,
    multiTarget: MOBILE_BRAND_WIDTH_RATIO,
  });
}

/** Shared word balancing only; each device retains its independent limits. */
export function selectBrandTitleFit(title: string, widths: ReadonlyMap<string, number>, availableWidth: number, limits: {
  minimum: number; singleCap: number; multiCap: number; singleTarget: number; multiTarget: number;
}): MobileBrandTitleFit {
  const text = normalizeMobileBrandTitle(title);
  const { minimum, singleCap, multiCap } = limits;
  if (!text || !Number.isFinite(availableWidth) || availableWidth <= 0) return { lines: text ? [text] : [], fontSize: minimum, naturalWrap: true };
  const target = availableWidth * limits.multiTarget;
  const fullWidth = widths.get(text);
  // Prefer one intact line. Short names stop at the visual ceiling rather than
  // growing without bound to fill 100%; 60% coverage is a preference, not a
  // reason to break the ceiling for a one/two-letter customer name.
  if (fullWidth && Number.isFinite(fullWidth) && fullWidth * minimum / 100 <= availableWidth) {
    return { lines: [text], fontSize: Math.max(minimum, Math.min(singleCap, availableWidth * limits.singleTarget * 100 / fullWidth)), naturalWrap: false };
  }
  const plans = plansFor(title);
  for (let planIndex = 0; planIndex < plans.length; planIndex++) {
    const candidates = balancedLines(plans[planIndex], widths);
    // Fewest balanced lines fitting the page at the minimum. Do not add rows
    // solely to chase a target percentage, or scale each row independently.
    const candidate = candidates.find((entry) => entry.widest * minimum / 100 <= availableWidth);
    if (candidate) return { lines: candidate.lines, fontSize: Math.max(minimum, Math.min(multiCap, target * 100 / candidate.widest)), naturalWrap: false };
  }
  // Very long names/unavailable metrics: natural wrapping, never truncate text.
  return { lines: [text], fontSize: minimum, naturalWrap: true };
}
