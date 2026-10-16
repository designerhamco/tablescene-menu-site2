import { getOrderedFlowCapacities, getOrderedFlowColumnWidth, ORDERED_CANVAS_EDGE_SAFETY, packOrderedFlow } from "@/lib/ordered-flow-packing";
import { applyOnePageChipLayouts } from "@/components/menu-templates/one-page-chip-layout";

type Part = { element: HTMLElement; offset: number; height: number };
type Unit = { height: number; gapBefore: number; leadingTrim?: number; category?: HTMLElement; parts: Part[] };
const styles = new WeakMap<HTMLElement, Map<HTMLElement, string | null>>();
const queuedLayouts = new WeakSet<HTMLElement>();
const suppressedRules = new WeakMap<HTMLElement, Map<HTMLElement, string | null>>();
const px = (value: string) => parseFloat(value) || 0;
const visible = (element: HTMLElement) => getComputedStyle(element).display !== "none";

/** Candidate probes restore their CSS before the next paint. Recompose the
 * restored actual copy once, rather than leaving the last probe's positions. */
export function queueOrderedCanvasLayout(board: HTMLElement, menu: HTMLElement) {
  if (queuedLayouts.has(menu) || board.dataset.layoutMode !== "orderedFit") return;
  queuedLayouts.add(menu);
  requestAnimationFrame(() => {
    queuedLayouts.delete(menu);
    if (board.isConnected && menu.isConnected) applyOrderedCanvasLayout(board, menu);
  });
}

export function clearOrderedCanvasLayout(menu: HTMLElement) {
  const saved = styles.get(menu);
  if (saved) for (const [element, style] of saved) {
    if (style === null) element.removeAttribute("style"); else element.setAttribute("style", style);
  }
  styles.delete(menu);
  for (const [element, value] of suppressedRules.get(menu) ?? []) {
    if (value === null) element.removeAttribute("data-cafe-a-category-divider-desktop-suppressed");
    else element.setAttribute("data-cafe-a-category-divider-desktop-suppressed", value);
  }
  suppressedRules.delete(menu);
  delete menu.dataset.orderedCanvas;
}

/** One ordered row packer for every adaptive shell, including the central brand.
 * DOM ownership stays with React; only measured positions are assigned here.
 * Headings travel with their first product and products remain indivisible.
 */
export function applyOrderedCanvasLayout(board: HTMLElement, menu: HTMLElement, expectedColumns?: number) {
  if (!board.closest('[data-cafe-a-adaptive-fit="true"]') || board.dataset.layoutMode !== "orderedFit") {
    clearOrderedCanvasLayout(menu);
    return null;
  }
  clearOrderedCanvasLayout(menu);
  const saved = new Map<HTMLElement, string | null>();
  styles.set(menu, saved);
  const ruleFlags = new Map<HTMLElement, string | null>();
  suppressedRules.set(menu, ruleFlags);
  const own = (element: HTMLElement) => {
    if (!saved.has(element)) saved.set(element, element.getAttribute("style"));
    return element.style;
  };
  const columns = Math.max(1, expectedColumns ?? (Math.round(px(getComputedStyle(board).getPropertyValue("--fit-columns"))) || 1));
  const center = board.dataset.onePageLayoutShell === "brand_center_column" || board.dataset.onePageLayoutShell === "brand_center_rail";
  const panel = board.dataset.onePageLayoutShell === "brand_panel_flow";
  const menuStyle = getComputedStyle(menu);
  const firstColumn = menu.querySelector<HTMLElement>(":scope > [data-cafe-a-balanced-column]");
  const columnStyle = firstColumn ? getComputedStyle(firstColumn) : null;
  const insetTop = Math.max(px(menuStyle.paddingTop), px(columnStyle?.paddingTop ?? "0"));
  const insetBottom = Math.max(px(menuStyle.paddingBottom), px(columnStyle?.paddingBottom ?? "0"));
  const insetLeft = px(menuStyle.paddingLeft);
  const insetRight = px(menuStyle.paddingRight);
  const gap = px(menuStyle.columnGap);
  const tracks = columns + (center ? 1 : 0);
  const width = getOrderedFlowColumnWidth(menu.clientWidth, insetLeft, insetRight, gap, tracks);
  const height = menu.clientHeight - insetTop - insetBottom;
  const leftOf = (column: number) => insetLeft + (column + (center && column >= Math.floor(columns / 2) ? 1 : 0)) * (width + gap);
  if (width <= 0 || height <= 0) return null;

  const menuOwned = own(menu);
  menuOwned.display = "block";
  menuOwned.position = "relative";
  menuOwned.columnCount = "auto";
  menu.dataset.orderedCanvas = "true";
  for (const column of menu.querySelectorAll<HTMLElement>(":scope > [data-cafe-a-balanced-column]")) own(column).display = "contents";
  const blocks = [...menu.querySelectorAll<HTMLElement>("[data-cafe-a-block-type]")].sort((a, b) =>
    Number(a.dataset.cafeABalancedSourceOrder ?? 0) - Number(b.dataset.cafeABalancedSourceOrder ?? 0));
  const categoryGap = new Map<HTMLElement, number>();
  const headingGap = new Map<HTMLElement, number>();
  const itemGap = new Map<HTMLElement, number>();
  const topRules = new Map<HTMLElement, HTMLElement>();
  const widgetGaps = new Map<HTMLElement, number>();
  const prepare = (element: HTMLElement, itemWidth = width) => {
    const style = own(element);
    style.position = "absolute";
    style.gridArea = "auto";
    style.left = `${insetLeft}px`;
    style.top = `${insetTop}px`;
    style.width = `${itemWidth}px`;
    style.height = "auto";
    style.right = "auto";
    style.bottom = "auto";
    style.margin = "0";
  };
  for (const block of blocks) {
    const next = block.dataset.cafeANextBlockType;
    if (next) block.dataset.cafeAVisualNextBlockType = next;
    else delete block.dataset.cafeAVisualNextBlockType;
    if (block.dataset.cafeABlockType !== "category") {
      widgetGaps.set(block, px(getComputedStyle(block).marginBottom));
      prepare(block, panel && block.hasAttribute("data-cafe-a-panel-intro-block") ? width + 2 * insetLeft : width);
      continue;
    }
    ruleFlags.set(block, block.getAttribute("data-cafe-a-category-divider-desktop-suppressed"));
    block.removeAttribute("data-cafe-a-category-divider-desktop-suppressed");
    categoryGap.set(block, px(getComputedStyle(block).marginBottom));
    own(block).display = "contents";
    const items = block.querySelector<HTMLElement>(".cafe-a-category-items");
    const heading = block.querySelector<HTMLElement>("[data-cafe-a-category-heading]");
    const rule = block.querySelector<HTMLElement>(":scope > [data-cafe-a-category-divider]");
    if (items) own(items).display = "contents";
    if (heading) {
      headingGap.set(block, px(getComputedStyle(heading).marginBottom) + px(items ? getComputedStyle(items).paddingTop : "0"));
      prepare(heading);
    }
    if (rule) { prepare(rule); topRules.set(block, rule); }
    for (const stack of block.querySelectorAll<HTMLElement>("[data-cafe-a-item-stack]")) {
      itemGap.set(stack, px(getComputedStyle(stack).marginBottom));
      prepare(stack);
    }
  }
  applyOnePageChipLayouts(menu);
  const units: Unit[] = [];
  const bottomWidgets: HTMLElement[] = [];
  let pendingGap = 0;
  for (const block of blocks) {
    if (block.dataset.cafeABlockType !== "category") {
      if (block.dataset.cafeAWidgetPlacement === "bottom") { bottomWidgets.push(block); continue; }
      const intro = block.hasAttribute("data-cafe-a-panel-intro-block");
      const measuredHeight = block.getBoundingClientRect().height;
      units.push({ height: measuredHeight - (intro ? insetTop : 0), gapBefore: pendingGap, parts: [{ element: block, offset: intro ? -insetTop : 0, height: measuredHeight }] });
      pendingGap = intro ? insetTop : widgetGaps.get(block) ?? 0;
      continue;
    }
    const heading = block.querySelector<HTMLElement>("[data-cafe-a-category-heading]");
    const rule = topRules.get(block);
    const stacks = [...block.querySelectorAll<HTMLElement>("[data-cafe-a-item-stack]")];
    stacks.forEach((stack, index) => {
      const parts: Part[] = [];
      let offset = 0;
      let leadingTrim = 0;
      if (index === 0) {
        if (rule && visible(rule)) {
          // The separator's own balanced clearances remain design-owned.
          const original = saved.get(rule);
          if (original === null) rule.removeAttribute("style"); else if (original !== undefined) rule.setAttribute("style", original);
          const style = getComputedStyle(rule);
          const before = px(style.marginTop), after = px(style.marginBottom);
          prepare(rule);
          const size = rule.getBoundingClientRect().height;
          parts.push({ element: rule, offset: before, height: size });
          offset = before + size + after;
          leadingTrim = offset;
        }
        if (heading) {
          const size = heading.getBoundingClientRect().height;
          parts.push({ element: heading, offset, height: size });
          offset += size + (headingGap.get(block) ?? 0);
        }
      }
      const size = stack.getBoundingClientRect().height;
      parts.push({ element: stack, offset, height: size });
      units.push({ height: offset + size, gapBefore: index === 0 ? pendingGap : itemGap.get(stacks[index - 1]) ?? 0, leadingTrim, category: index === 0 ? block : undefined, parts });
    });
    pendingGap = categoryGap.get(block) ?? 0;
  }
  // Measure the common item rhythm without inheriting a last-item zero margin.
  const probe = document.createElement("span");
  probe.style.cssText = "position:absolute;visibility:hidden;height:var(--cafe-a-item-rhythm-gap);width:0";
  menu.append(probe);
  const footerGap = probe.getBoundingClientRect().height;
  probe.remove();
  const footers = [...board.querySelectorAll<HTMLElement>('[data-cafe-a-footer-info][data-cafe-a-footer-placement="desktop"]')].filter(visible);
  for (const footer of footers) { prepare(footer); own(footer).maxWidth = "none"; }
  const footerHeight = footers.reduce((sum, element) => sum + element.getBoundingClientRect().height, 0) + Math.max(0, footers.length - 1) * footerGap;
  const widgetHeight = bottomWidgets.reduce((sum, element, index) => sum + element.getBoundingClientRect().height + (index > 0 ? widgetGaps.get(bottomWidgets[index - 1]) ?? 0 : 0), 0);
  const widgetBottomSafety = widgetHeight && !footerHeight ? ORDERED_CANVAS_EDGE_SAFETY : 0;
  const reserve = footerHeight + widgetHeight + widgetBottomSafety + (footerHeight && widgetHeight ? footerGap : 0) + (widgetHeight ? pendingGap : footerHeight ? footerGap : 0);
  // A reserved footer already owns the common clearance above it. The 8px
  // canvas-edge safety applies to open bottoms, not a second time above it.
  const capacities = getOrderedFlowCapacities(height, columns, reserve);
  const packed = packOrderedFlow(units, capacities);
  const menuRect = menu.getBoundingClientRect();
  const position = (element: HTMLElement, left: number, top: number) => {
    const parent = element.offsetParent as HTMLElement | null;
    const parentRect = parent?.getBoundingClientRect() ?? menuRect;
    const style = own(element);
    style.left = `${menuRect.left + left - parentRect.left + (parent?.scrollLeft ?? 0)}px`;
    style.top = `${menuRect.top + top - parentRect.top + (parent?.scrollTop ?? 0)}px`;
  };
  packed.placements.forEach((placement, index) => {
    const trim = placement.top === 0 ? units[index].leadingTrim ?? 0 : 0;
    if (placement.top === 0 && units[index].category) units[index].category!.dataset.cafeACategoryDividerDesktopSuppressed = "true";
    for (const part of units[index].parts) {
      const intro = part.element.hasAttribute("data-cafe-a-panel-intro-block");
      position(part.element, leftOf(placement.column) - (intro ? insetLeft : 0), insetTop + placement.top + (intro ? part.offset : Math.max(0, part.offset - trim)));
      part.element.dataset.orderedColumn = String(placement.column);
      const category = part.element.closest<HTMLElement>("[data-cafe-a-category-block]");
      if (category) category.dataset.orderedColumn = String(placement.column);
    }
  });
  let footerTop = insetTop + height - footerHeight;
  for (const footer of footers) {
    position(footer, leftOf(columns - 1), footerTop);
    footerTop += footer.getBoundingClientRect().height + footerGap;
  }
  let widgetTop = insetTop + height - widgetBottomSafety - footerHeight - (footerHeight && widgetHeight ? footerGap : 0) - widgetHeight;
  for (const widget of bottomWidgets) {
    position(widget, leftOf(columns - 1), widgetTop);
    widgetTop += widget.getBoundingClientRect().height + (widgetGaps.get(widget) ?? 0);
  }
  menu.dataset.orderedFooterGap = String(footerGap);
  menu.dataset.orderedColumnWidth = String(width);
  menu.dataset.orderedInsetBottom = String(insetBottom);
  menu.dataset.orderedColumnHeights = JSON.stringify(packed.heights);
  menu.dataset.orderedColumnCapacities = JSON.stringify(capacities);
  menu.dataset.orderedFlowOverflow = String(packed.overflow);
  return { ...packed, capacities, columns, height, width, insetTop, insetBottom, footerGap, reserve };
}
