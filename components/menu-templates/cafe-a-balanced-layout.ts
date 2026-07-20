export type CafeABalancedBlockType = "category" | "widget";

export type CafeABalancedAtomicBlock<TPayload> = {
  id: string;
  blockType: CafeABalancedBlockType;
  sourceIndex: number;
  sortOrder: number;
  estimatedHeight: number;
  payload: TPayload;
};

export type CafeAOrderedBalancedMeasuredBlock = {
  key: string;
  order: number;
  height: number;
  visibleContentHeight: number;
  marginBottom: number;
  estimatedHeight: number;
};

export type CafeAOrderedBalancedColumn<TBlock extends CafeAOrderedBalancedMeasuredBlock> = {
  blocks: TBlock[];
  height: number;
};

export type CafeAOrderedBalancedFillMetrics = {
  visibleHeights: number[];
  maxHeight: number;
  minHeight: number;
  averageHeight: number;
  fillHeight: number;
  firstHeight: number;
  secondHeight: number;
  lastHeight: number;
  firstFillRatio: number;
  secondFillRatio: number;
  lastFillRatio: number;
  minFillRatio: number;
  firstGap: number;
  secondGap: number;
  lastGap: number;
  fillVariance: number;
  secondBlockCount: number;
};

type CafeAOrderedBalancedScoreOptions = {
  targetMaxVisibleGap: number;
};

type CafeAOrderedBalancedContiguousOptions = CafeAOrderedBalancedScoreOptions & {
  maxExhaustiveBlocks: number;
  maxExhaustiveColumns: number;
  targetHeight?: number;
};

export function getCafeAOrderedBalancedColumnHeight<TBlock extends CafeAOrderedBalancedMeasuredBlock>(
  blocks: readonly TBlock[],
) {
  return blocks.reduce(
    (height, block, index) => height + block.height + (index < blocks.length - 1 ? block.marginBottom : 0),
    0,
  );
}

export function createCafeAOrderedBalancedColumnFromBlocks<TBlock extends CafeAOrderedBalancedMeasuredBlock>(
  blocks: TBlock[],
): CafeAOrderedBalancedColumn<TBlock> {
  return {
    blocks,
    height: getCafeAOrderedBalancedColumnHeight(blocks),
  };
}

export function createCafeAOrderedBalancedColumnsFromBreakIndices<TBlock extends CafeAOrderedBalancedMeasuredBlock>(
  blocks: readonly TBlock[],
  safeColumns: number,
  breakIndices: readonly number[],
): CafeAOrderedBalancedColumn<TBlock>[] {
  const columns: CafeAOrderedBalancedColumn<TBlock>[] = [];
  let startIndex = 0;

  [...breakIndices, blocks.length].forEach((endIndex) => {
    columns.push(createCafeAOrderedBalancedColumnFromBlocks(blocks.slice(startIndex, endIndex)));
    startIndex = endIndex;
  });

  while (columns.length < safeColumns) columns.push(createCafeAOrderedBalancedColumnFromBlocks([]));
  return columns.slice(0, safeColumns);
}

export function getCafeAOrderedBalancedBreaksFromColumns<TBlock extends CafeAOrderedBalancedMeasuredBlock>(
  columns: readonly CafeAOrderedBalancedColumn<TBlock>[],
) {
  let cursor = 0;
  const breaks: number[] = [];

  columns.slice(0, -1).forEach((column) => {
    cursor += column.blocks.length;
    if (cursor > 0) breaks.push(cursor);
  });

  return breaks.join(",");
}

export function getCafeAOrderedBalancedColumnFillMetrics<TBlock extends CafeAOrderedBalancedMeasuredBlock>(
  columns: readonly CafeAOrderedBalancedColumn<TBlock>[],
  targetHeight?: number,
): CafeAOrderedBalancedFillMetrics {
  const visibleHeights = columns.map((column) => {
    if (column.blocks.length === 0) return column.height;
    return (
      column.blocks.slice(0, -1).reduce((height, block) => height + block.height + block.marginBottom, 0) +
      (column.blocks[column.blocks.length - 1]?.visibleContentHeight ?? column.height)
    );
  });
  const maxHeight = Math.max(...visibleHeights, 0);
  const averageHeight = visibleHeights.length > 0 ? visibleHeights.reduce((total, height) => total + height, 0) / visibleHeights.length : 0;
  const fillHeight = Number.isFinite(targetHeight) && (targetHeight ?? 0) > 0 ? targetHeight ?? maxHeight : maxHeight;
  const fillRatios = visibleHeights.map((height) => (fillHeight > 0 ? height / fillHeight : 0));
  const bottomGaps = visibleHeights.map((height) => Math.max(0, fillHeight - height));
  const firstIndex = 0;
  const middleIndex = columns.length >= 3 ? 1 : Math.max(0, columns.length - 1);
  const lastIndex = Math.max(0, columns.length - 1);
  const averageFillRatio = fillRatios.length > 0 ? fillRatios.reduce((total, fillRatio) => total + fillRatio, 0) / fillRatios.length : 0;
  const fillVariance =
    fillRatios.length > 0
      ? fillRatios.reduce((total, fillRatio) => total + Math.pow(fillRatio - averageFillRatio, 2), 0) / fillRatios.length
      : 0;

  return {
    visibleHeights,
    maxHeight,
    minHeight: visibleHeights.length > 0 ? Math.min(...visibleHeights) : 0,
    averageHeight,
    fillHeight,
    firstHeight: visibleHeights[firstIndex] ?? 0,
    secondHeight: visibleHeights[middleIndex] ?? visibleHeights[firstIndex] ?? 0,
    lastHeight: visibleHeights[lastIndex] ?? 0,
    firstFillRatio: fillRatios[firstIndex] ?? 0,
    secondFillRatio: fillRatios[middleIndex] ?? fillRatios[firstIndex] ?? 0,
    lastFillRatio: fillRatios[lastIndex] ?? 0,
    minFillRatio: fillRatios.length > 0 ? Math.min(...fillRatios) : 0,
    firstGap: bottomGaps[firstIndex] ?? 0,
    secondGap: bottomGaps[middleIndex] ?? bottomGaps[firstIndex] ?? 0,
    lastGap: bottomGaps[lastIndex] ?? 0,
    fillVariance,
    secondBlockCount: columns[middleIndex]?.blocks.length ?? 0,
  };
}

export function getCafeAOrderedBalancedSimulatedSpreadScore<TBlock extends CafeAOrderedBalancedMeasuredBlock>(
  columns: readonly CafeAOrderedBalancedColumn<TBlock>[],
  options: CafeAOrderedBalancedScoreOptions & { targetHeight?: number },
) {
  const {
    maxHeight,
    minHeight,
    averageHeight,
    firstHeight,
    secondHeight,
    lastHeight,
    firstFillRatio,
    secondFillRatio,
    lastFillRatio,
    minFillRatio,
    firstGap,
    secondGap,
    lastGap,
    fillVariance,
    secondBlockCount,
  } = getCafeAOrderedBalancedColumnFillMetrics(columns, options.targetHeight);
  const targetGap = Number.isFinite(options.targetHeight) ? Math.max(0, (options.targetHeight ?? 0) - maxHeight) : 0;
  const targetGapPenalty = Number.isFinite(options.targetHeight)
    ? Math.max(0, maxHeight - (options.targetHeight ?? 0)) * 1000 +
      Math.max(0, targetGap - options.targetMaxVisibleGap) * 420 +
      Math.max(0, targetGap - 14) * 720 +
      Math.max(0, targetGap - 24) * 1100
    : 0;
  const firstColumnIsShortestPenalty =
    firstHeight <= minHeight + 1 && maxHeight - firstHeight > 40 ? 12000 + (maxHeight - firstHeight) * 42 : 0;
  const firstFillPenalty =
    Math.max(0, 0.8 - firstFillRatio) * 3600 +
    Math.max(0, 0.88 - firstFillRatio) * 1200 +
    Math.max(0, firstGap - 40) * 18 +
    Math.max(0, maxHeight - firstHeight - 80) * 7.2;
  const secondFillPenalty =
    Math.max(0, 0.72 - secondFillRatio) * 3600 +
    Math.max(0, 0.78 - secondFillRatio) * 1400 +
    Math.max(0, secondGap - 40) * 11 +
    Math.max(0, secondGap - 60) * 22;
  const singletonMiddlePenalty =
    columns.length >= 3 && secondBlockCount <= 1 && secondFillRatio < 0.84
      ? 1800 + Math.max(0, 0.84 - secondFillRatio) * 2600 + Math.max(0, secondGap - 40) * 16
      : 0;
  const lastFillPenalty =
    Math.max(0, 0.58 - lastFillRatio) * 520 +
    Math.max(0, 0.66 - lastFillRatio) * 260 +
    Math.max(0, lastGap - 160) * 1.2;
  const minFillPenalty = Math.max(0, 0.58 - minFillRatio) * 720 + Math.max(0, 0.68 - minFillRatio) * 360;
  const fillVariancePenalty = fillVariance * 1200;
  const leftRhythmPenalty = Math.max(0, secondHeight - firstHeight - 40) * 26 + Math.max(0, lastHeight - firstHeight - 70) * 14;

  return (
    targetGapPenalty +
    firstColumnIsShortestPenalty +
    firstFillPenalty +
    secondFillPenalty +
    singletonMiddlePenalty +
    lastFillPenalty +
    minFillPenalty +
    fillVariancePenalty +
    leftRhythmPenalty +
    (maxHeight - minHeight) * 2.6 +
    Math.max(0, averageHeight - lastHeight) * 3.2 +
    Math.max(0, maxHeight * 0.74 - lastHeight) * 2.4 +
    Math.max(0, maxHeight * 0.68 - minHeight) * 2.8 +
    columns.filter((column) => column.blocks.length === 0).length * 800
  );
}

export function getCafeAOrderedBalancedSequentialColumns<TBlock extends CafeAOrderedBalancedMeasuredBlock>(
  blocks: readonly TBlock[],
  safeColumns: number,
) {
  const columns: CafeAOrderedBalancedColumn<TBlock>[] = Array.from({ length: safeColumns }, () => ({ blocks: [], height: 0 }));
  const totalHeight = blocks.reduce((total, block) => total + block.height, 0);
  const targetHeight = safeColumns > 0 ? totalHeight / safeColumns : totalHeight;
  let columnIndex = 0;

  blocks.forEach((block, blockIndex) => {
    const currentColumn = columns[columnIndex] ?? columns[columns.length - 1];
    const remainingBlocks = blocks.length - blockIndex;
    const remainingColumns = safeColumns - columnIndex;
    const projectedHeight =
      currentColumn.height +
      (currentColumn.blocks.length > 0 ? currentColumn.blocks[currentColumn.blocks.length - 1]?.marginBottom ?? 0 : 0) +
      block.height;
    const shouldAdvance =
      currentColumn.blocks.length > 0 &&
      columnIndex < safeColumns - 1 &&
      projectedHeight > targetHeight &&
      remainingBlocks >= remainingColumns;

    if (shouldAdvance) columnIndex += 1;
    const targetColumn = columns[columnIndex] ?? columns[columns.length - 1];
    targetColumn.blocks.push(block);
    targetColumn.height = getCafeAOrderedBalancedColumnHeight(targetColumn.blocks);
  });

  return columns;
}

export function getCafeAOrderedBalancedContiguousColumns<TBlock extends CafeAOrderedBalancedMeasuredBlock>(
  blocks: readonly TBlock[],
  columns: number,
  options: CafeAOrderedBalancedContiguousOptions,
) {
  const safeColumns = Math.max(1, Math.min(options.maxExhaustiveColumns, Math.floor(columns), blocks.length || 1));
  if (blocks.length === 0) return Array.from({ length: safeColumns }, () => createCafeAOrderedBalancedColumnFromBlocks<TBlock>([]));
  if (blocks.length < safeColumns) return getCafeAOrderedBalancedSequentialColumns(blocks, blocks.length);

  if (blocks.length > options.maxExhaustiveBlocks || safeColumns > options.maxExhaustiveColumns) {
    return getCafeAOrderedBalancedSequentialColumns(blocks, safeColumns);
  }

  let bestColumns = getCafeAOrderedBalancedSequentialColumns(blocks, safeColumns);
  let bestScore = getCafeAOrderedBalancedSimulatedSpreadScore(bestColumns, options);
  const selectedBreaks: number[] = [];

  function visit(nextBreakStart: number, remainingBreaks: number) {
    if (remainingBreaks === 0) {
      const candidateColumns = createCafeAOrderedBalancedColumnsFromBreakIndices(blocks, safeColumns, selectedBreaks);
      if (candidateColumns.some((column) => column.blocks.length === 0)) return;

      const score = getCafeAOrderedBalancedSimulatedSpreadScore(candidateColumns, options);
      if (score < bestScore) {
        bestScore = score;
        bestColumns = candidateColumns;
      }
      return;
    }

    const maxBreak = blocks.length - remainingBreaks;
    for (let breakIndex = nextBreakStart; breakIndex <= maxBreak; breakIndex += 1) {
      selectedBreaks.push(breakIndex);
      visit(breakIndex + 1, remainingBreaks - 1);
      selectedBreaks.pop();
    }
  }

  visit(1, safeColumns - 1);
  return bestColumns;
}
