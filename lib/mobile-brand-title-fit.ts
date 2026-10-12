/** Mobile brand-only pilot. Never participates in the menu canvas fit loop. */
export function getMobileBrandTitleCandidates(title: string): string[][] {
  const text = title.trim().replace(/\s+/g, " ");
  if (!text) return [[]];
  const candidates = [[text]];
  const words = text.split(" ");
  if (words.length > 1) {
    for (let i = 1; i < Math.min(words.length, 65); i++) candidates.push([words.slice(0, i).join(" "), words.slice(i).join(" ")]);
  } else if (/[가-힣\u3040-\u30ff\u3400-\u9fff]/u.test(text) && Array.from(text).length > 8) {
    const glyphs = typeof Intl.Segmenter === "function" ? Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text), (entry) => entry.segment) : Array.from(text);
    for (let i = 1; i < Math.min(glyphs.length, 65); i++) candidates.push([glyphs.slice(0, i).join(""), glyphs.slice(i).join("")]);
  }
  return candidates;
}

export function selectMobileBrandTitleFit(candidates: string[][], widths: ReadonlyMap<string, number>, availableWidth: number, rem = 16) {
  const minimum = rem * 2;
  const reference = 100;
  const options = candidates.filter((lines) => lines.length > 0).map((lines) => {
    const measured = lines.map((line) => widths.get(line) ?? Number.NaN);
    const longest = Math.max(...measured);
    const valid = measured.every((width) => Number.isFinite(width) && width > 0);
    const cap = rem * (lines.length === 1 ? 8 : 4.5);
    const fontSize = valid ? Math.max(minimum, Math.min(cap, availableWidth * 0.8 * reference / longest)) : rem * 2.75;
    const balance = valid ? Math.min(...measured) / longest : 0;
    return { lines, fontSize, balance, valid, fits: valid && longest * fontSize / reference <= availableWidth };
  });
  const single = options[0];
  const paired = options.filter((option) => option.lines.length === 2 && option.valid && option.fits)
    .sort((a, b) => (b.fontSize * (0.7 + 0.3 * b.balance)) - (a.fontSize * (0.7 + 0.3 * a.balance)))[0];
  const chosen = single?.fits && single.fontSize >= rem * 2.75 ? single : paired ?? single;
  return { lines: chosen?.lines ?? [], fontSize: chosen?.fontSize ?? rem * 2.75, fallbackWrap: !chosen?.fits };
}
