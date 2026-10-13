/** Conservative, language-independent families. Unknown names retain source order. */
export function getOnePageCategoryAffinity(name: string): string | undefined {
  const text = name.normalize("NFKC").toLowerCase();
  if (/sandwich|샌드위치|サンド|三明治/.test(text)) return "sandwich";
  if (/cream\s*cheese|크림\s*치즈|クリームチーズ|奶油奶酪|spread|스프레드/.test(text)) return "bread-and-spread";
  if (/bagel|베이글|ベーグル|贝果|bread|브레드|빵/.test(text)) return "bread-and-spread";
  if (/bakery|dessert|베이커리|디저트|cake|케이크|cookie|쿠키|madeleine|마들렌|tiramisu|티라미수|焼き菓子|甜点/.test(text)) return "dessert";
  if (/non[ -]?coffee|논\s*커피|non[ -]?alcohol|무알콜/.test(text)) return "other-drinks";
  if (/coffee|커피|コーヒー|咖啡|latte|라떼|espresso|에스프레소|cold\s*brew|콜드브루|pour\s*over/.test(text)) return "coffee";
  if (/\b(?:teas?|ades?|drinks?|matcha|chocolate|cocktails?|highballs?|wine|beers?|zero[ -]?proof)\b|티|차|에이드|茶|드링크|음료|말차|초콜릿|카카오|칵테일|하이볼|와인|맥주|무알콜/.test(text)) return "other-drinks";
  return undefined;
}

export function inferOnePageCategoryAffinity(name: string, itemNames: readonly string[]): string | undefined {
  const named = getOnePageCategoryAffinity(name);
  if (named) return named;
  const counts = new Map<string, number>();
  for (const item of itemNames) {
    const affinity = getOnePageCategoryAffinity(item);
    if (affinity) counts.set(affinity, (counts.get(affinity) ?? 0) + 1);
  }
  const best = [...counts].sort((a, b) => b[1] - a[1])[0];
  return best && best[1] >= Math.max(2, itemNames.length * 2 / 3) ? best[0] : undefined;
}

function areRelated(a: string | undefined, b: string | undefined) {
  if (!a || !b) return false;
  return a === b || (["coffee", "other-drinks"].includes(a) && ["coffee", "other-drinks"].includes(b));
}

/** Reordering must actually place a newly related pair in the same column. */
export function hasRelatedCategoryRegrouping<T extends RelatedCategoryBlock>(columns: readonly { blocks: readonly T[] }[]) {
  return columns.some(({ blocks }) => blocks.some((block, index) => {
    const previous = blocks[index - 1];
    return previous && Math.abs(previous.order - block.order) > 1 && areRelated(previous.affinity, block.affinity);
  }));
}

export type RelatedCategoryBlock = {
  categoryRank?: number; height?: number;
  order: number; blockType?: "category" | "widget"; affinity?: string; orderBoundary?: string;
};

/** A stable family move, within one page and without crossing any widget. Never all permutations. */
export function getRelatedCategoryOrders<T extends RelatedCategoryBlock>(blocks: readonly T[]): T[][] {
  const orders: T[][] = [];
  const seen = new Set<string>();
  for (let anchor = 0; anchor < blocks.length; anchor++) {
    const first = blocks[anchor];
    if (!first.affinity || first.blockType !== "category") continue;
    let end = anchor + 1;
    while (end < blocks.length && blocks[end].blockType === "category" && blocks[end].affinity && blocks[end].orderBoundary === first.orderBoundary) end++;
    const segment = blocks.slice(anchor + 1, end);
    const related = segment.filter((block) => block.affinity === first.affinity);
    const add = (next: T[]) => {
      const key = next.map((block) => block.order).join(",");
      if (!seen.has(key)) { seen.add(key); orders.push(next); }
    };
    if (related.length && !segment.slice(0, related.length).every((block) => block.affinity === first.affinity))
      add([...blocks.slice(0, anchor + 1), ...related, ...segment.filter((block) => block.affinity !== first.affinity), ...blocks.slice(end)]);
    for (let index = anchor + 2; index < end && orders.length < 8; index++) {
      if (!areRelated(first.affinity, blocks[index].affinity)) continue;
      add([...blocks.slice(0, anchor + 1), blocks[index], ...blocks.slice(anchor + 1, index), ...blocks.slice(index + 1)]);
    }
    if (orders.length >= 8) break;
  }
  return orders;
}

/** Conventional reading order, kept separate from broad packing families. */
export function getConventionalCategoryRank(name: string): number | undefined {
  const text = name.normalize("NFKC").toLowerCase();
  if (/signature|시그니처|대표|おすすめ|招牌|masterpiece/.test(text)) return 0;
  if (/latte|라떼|ラテ|拿铁/.test(text)) return 2;
  if (/non[ -]?coffee|논\s*커피/.test(text)) return 3;
  if (/coffee|espresso|커피|에스프레소|コーヒー|咖啡/.test(text)) return 1;
  const affinity = getOnePageCategoryAffinity(text);
  return affinity === "other-drinks" ? 3 : affinity === "bread-and-spread" ? 4 : affinity === "sandwich" ? 5 : affinity === "dessert" ? 6 : undefined;
}

/** Bounded alternatives. Unknown categories, widgets and page changes are barriers. */
export function getFallbackCategoryOrders<T extends RelatedCategoryBlock>(blocks: readonly T[], mode: "conventional" | "free"): T[][] {
  const orders: T[][] = [];
  for (let start = 0; start < blocks.length && orders.length < 8; start++) {
    const first = blocks[start];
    if (first.blockType !== "category" || !first.affinity) continue;
    let end = start + 1;
    while (end < blocks.length && blocks[end].blockType === "category" && blocks[end].affinity && blocks[end].orderBoundary === first.orderBoundary) end++;
    const segment = blocks.slice(start, end);
    const add = (next: T[]) => {
      if (next.some((block, index) => block !== segment[index])) orders.push([...blocks.slice(0, start), ...next, ...blocks.slice(end)]);
    };
    if (mode === "conventional") {
      add([...segment].sort((a, b) => (a.categoryRank ?? 7) - (b.categoryRank ?? 7) || a.order - b.order));
    } else {
      // Stable height packing, not randomness: reproducible for customer edits.
      const byHeight = [...segment].sort((a, b) => (b.height ?? 0) - (a.height ?? 0) || a.order - b.order);
      add(byHeight);
      const alternating = byHeight.filter((_, index) => index % 2 === 0).concat(byHeight.filter((_, index) => index % 2 === 1).reverse());
      add(alternating);
    }
    start = end - 1;
  }
  return orders;
}

export function hasPoorCategoryPacking(heights: readonly number[], targetHeight: number): boolean {
  return !heights.length || Math.min(...heights) / targetHeight < 0.6 || (Math.max(...heights) - Math.min(...heights)) / targetHeight > 0.25;
}

/** Relax order only for a materially better packing of an already poor original. */
export function canRelaxCategoryOrder(original: readonly number[], related: readonly number[], targetHeight: number): boolean {
  if (!related.length || related.some((height) => height <= 0 || height > targetHeight)) return false;
  if (!original.length) return true; // No source-order partition fits at this size.
  const min = Math.min(...original), max = Math.max(...original);
  const poor = hasPoorCategoryPacking(original, targetHeight);
  return poor && (Math.min(...related) >= min + targetHeight * 0.12 || Math.max(...related) <= max - targetHeight * 0.08);
}

/** Encode a complete permutation with the breaks, so measurement and rendering agree. */
export function parseCategoryOrder(value: string, count: number): number[] | null {
  const encoded = value.split("|order=")[1];
  if (!encoded) return null;
  const order = encoded.split(",").map(Number);
  return order.length === count && new Set(order).size === count && order.every((index) => Number.isInteger(index) && index >= 0 && index < count) ? order : null;
}
