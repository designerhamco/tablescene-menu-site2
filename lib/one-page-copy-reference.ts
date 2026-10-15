/** The three semantic fields remain the default; hidden copy may relax its space estimate. */
export function shouldRelaxOnePageCopyReference(input: {
  hasHiddenSupport: boolean;
  overflow: boolean;
  height: number;
  bottomGap: number;
  averageFill: number;
  referenceScale: number;
  actualScale: number;
  referenceFitScale?: number;
  actualFitScale?: number;
}) {
  const { hasHiddenSupport, overflow, height, bottomGap, averageFill, referenceScale, actualScale, referenceFitScale, actualFitScale } = input;
  if (!hasHiddenSupport || overflow || height <= 0 || referenceScale <= 0) return false;
  if (![height, bottomGap, averageFill, referenceScale, actualScale].every(Number.isFinite)) return false;
  // A short column alone is a packing issue. Require room in the longest column too.
  const spare = bottomGap / height;
  const sparse = spare >= 0.12 || (spare >= 0.08 && averageFill < 0.72);
  const nameSizeGain = actualScale >= referenceScale * 1.08;
  // A shared item-name ceiling can intentionally keep the primary atom fixed
  // while the linked support sizes and rhythm still have safe room to grow.
  // Count that verified fit-scale gain so the three-field reference cannot make
  // sparse one/two-field menus look full forever.
  const fitScaleGain =
    Number.isFinite(referenceFitScale) &&
    Number.isFinite(actualFitScale) &&
    (referenceFitScale ?? 0) > 0 &&
    (actualFitScale ?? 0) >= (referenceFitScale ?? 0) * 1.08;
  return sparse && (nameSizeGain || fitScaleGain);
}
