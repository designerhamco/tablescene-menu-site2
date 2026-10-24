"use client";
import { useLayoutEffect, type RefObject } from "react";
import { getMutedMenuPriceColor } from "@/lib/menu-text-colors";

/** Price color is local: a native panel or photo overlay may have different ink/background. */
export function useRegularPriceColors(scope: RefObject<HTMLDivElement | null>, signature: string, enabled: boolean) {
  useLayoutEffect(() => {
    if (!enabled || !scope.current) return;
    const root = scope.current;
    let frame = 0;
    const update = () => {
      frame = 0;
      for (const regular of root.querySelectorAll<HTMLElement>(".cafe-a-time-sale-regular-price")) {
        const price = regular.parentElement?.querySelector<HTMLElement>(".cafe-a-time-sale-price");
        if (!price) continue;
        let background = "#ffffff";
        const photo = regular.closest('.cafe-a-cover-hero[data-cafe-a-cover-has-image="true"]');
        if (photo) background = "#191c1b"; // Existing dark readability fade behind featured prices.
        else for (let parent = regular.parentElement; parent; parent = parent.parentElement) {
          const color = getComputedStyle(parent).backgroundColor;
          if (color !== "transparent" && color !== "rgba(0, 0, 0, 0)" && !color.endsWith(", 0)")) { background = color; break; }
        }
        const color = getMutedMenuPriceColor(getComputedStyle(price).color, background);
        if (regular.style.getPropertyValue("--menu-regular-price-color") !== color) regular.style.setProperty("--menu-regular-price-color", color);
      }
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const observer = new MutationObserver(schedule);
    // Countdown character changes do not change price colors.
    observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "data-mocha-panel"] });
    window.addEventListener("resize", schedule);
    schedule();
    return () => { cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener("resize", schedule); };
  }, [scope, signature, enabled]);
}
