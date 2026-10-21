"use client";
import { useLayoutEffect, useRef } from "react";

/** Measure intrinsic labels/prices, not their allocated tracks. One category
 * chooses one layout, so a long label never squeezes only one product's name. */
export function useMobileCategoryPriceLayout({ enabled, signature }: { enabled: boolean; signature: string }) {
  const ref = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const category = ref.current;
    if (!category || !enabled) return;
    let frame = 0;
    const textWidth = (element: Element | null) => {
      if (!element) return 0;
      const html = element as HTMLElement;
      const original = html.style.whiteSpace;
      html.style.whiteSpace = "nowrap";
      const range = document.createRange();
      range.selectNodeContents(element);
      const width = range.getBoundingClientRect().width;
      html.style.whiteSpace = original;
      return width;
    };
    const measure = () => {
      frame = 0;
      const grids = [...category.querySelectorAll<HTMLElement>("[data-cafe-a-price-columns]")];
      if (!grids.length) { delete category.dataset.mobilePriceLayout; return; }
      const widths: number[] = [];
      for (const grid of grids) [...grid.children].forEach((cell, index) => {
        const label = textWidth(cell.querySelector(".cafe-a-mobile-option-label"));
        const prices = [...cell.querySelectorAll(".cafe-a-price-column-sizer > *")].map(textWidth);
        widths[index] = Math.max(widths[index] ?? 0, label, ...prices);
      });
      const purchase = grids[0].parentElement!;
      const add = purchase.querySelector<HTMLElement>("[data-menu-order-add]");
      const gap = Number.parseFloat(getComputedStyle(grids[0]).columnGap) || 0;
      const purchaseGap = Number.parseFloat(getComputedStyle(purchase).columnGap) || 0;
      const available = purchase.clientWidth - (add ? add.getBoundingClientRect().width + purchaseGap : 0);
      const required = widths.reduce((sum, width) => sum + width, 0) + gap * (widths.length - 1);
      const layout = required > available + .5 ? "vertical" : "horizontal";
      if (category.dataset.mobilePriceLayout !== layout) category.dataset.mobilePriceLayout = layout;
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(measure); };
    const resize = new ResizeObserver(schedule);
    resize.observe(category);
    const mutation = new MutationObserver(schedule);
    mutation.observe(category, { childList: true, characterData: true, subtree: true });
    document.fonts.ready.then(schedule);
    document.fonts.addEventListener("loadingdone", schedule);
    window.addEventListener("resize", schedule);
    schedule();
    return () => { resize.disconnect(); mutation.disconnect(); cancelAnimationFrame(frame); document.fonts.removeEventListener("loadingdone", schedule); window.removeEventListener("resize", schedule); delete category.dataset.mobilePriceLayout; };
  }, [enabled, signature]);
  return ref;
}
