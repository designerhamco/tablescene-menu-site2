/** The three semantic fields remain the default; hidden copy may relax its space estimate. */
export function shouldRelaxOnePageCopyReference(input: {
  hasHiddenSupport: boolean;
  overflow: boolean;
  height: number;
  bottomGap: number;
  averageFill: number;
  referenceScale: number;
  actualScale: number;
}) {
  const { hasHiddenSupport, overflow, height, bottomGap, averageFill, referenceScale, actualScale } = input;
  if (!hasHiddenSupport || overflow || height <= 0 || referenceScale <= 0) return false;
  if (![height, bottomGap, averageFill, referenceScale, actualScale].every(Number.isFinite)) return false;
  // A short column alone is a packing issue. Require room in the longest column too.
  const spare = bottomGap / height;
  const sparse = spare >= 0.18 || (spare >= 0.08 && averageFill < 0.72);
  return sparse && actualScale >= referenceScale * 1.08;
}
