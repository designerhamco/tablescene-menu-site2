/** Brand-only mobile width policy. Independent of menu density/canvas fitting. */
export const MOBILE_BRAND_WIDTH_RATIO = 0.65;
export const MOBILE_BRAND_MINIMUM_PX = 48;
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

export function getMobileBrandMeasurementTexts(title: string): string[] {
  const texts = new Set([normalizeMobileBrandTitle(title)]);
  for (const plan of plansFor(title)) {
    if (plan.units.length > MAX_MEASURED_UNITS) continue;
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
function balancedLines(plan: TextPlan, widths: ReadonlyMap<string, number>) {
  const count = plan.units.length;
  if (count > MAX_MEASURED_UNITS) return [];
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

export function selectMobileBrandTitleFit(title: string, widths: ReadonlyMap<string, number>, availableWidth: number, minimumPx = MOBILE_BRAND_MINIMUM_PX): MobileBrandTitleFit {
  const text = normalizeMobileBrandTitle(title);
  const minimum = Math.max(MOBILE_BRAND_MINIMUM_PX, minimumPx);
  if (!text || !Number.isFinite(availableWidth) || availableWidth <= 0) return { lines: text ? [text] : [], fontSize: minimum, naturalWrap: true };
  const target = availableWidth * MOBILE_BRAND_WIDTH_RATIO;
  const plans = plansFor(title);
  for (let planIndex = 0; planIndex < plans.length; planIndex++) {
    const candidates = balancedLines(plans[planIndex], widths);
    // Use the fewest lines that can reach 65% without dropping below 48px.
    const targetCandidate = candidates.find((candidate) => target * 100 / candidate.widest >= minimum);
    if (targetCandidate) return { lines: targetCandidate.lines, fontSize: target * 100 / targetCandidate.widest, naturalWrap: false };
    // Preserve whole words when the minimum forces a line wider than 65%.
    const minimumCandidate = candidates.filter((candidate) => candidate.widest * minimum / 100 <= availableWidth)
      .sort((first, next) => first.widest - next.widest || first.lines.length - next.lines.length)[0];
    if (minimumCandidate) return { lines: minimumCandidate.lines, fontSize: minimum, naturalWrap: false };
  }
  // Very long names/unavailable metrics: natural wrapping, never truncate text.
  return { lines: [text], fontSize: minimum, naturalWrap: true };
}
