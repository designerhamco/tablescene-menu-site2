"use client";
import { useEffect, useState, type CSSProperties, type RefObject } from "react";
import { getRenderedMenuBrandColor, getRenderedMenuBrandElement } from "@/components/menu-templates/shared/rendered-menu-colors";
import { resolveMenuInteractionTheme } from "@/lib/menu-interaction-theme";

export default function useMenuInteractionTheme(content: RefObject<HTMLDivElement | null>) {
  const [theme, setTheme] = useState(() => resolveMenuInteractionTheme({ brand: "#191c1b", surfaces: ["#ffffff"] }));
  useEffect(() => {
    const container = content.current;
    if (!container) return;
    let frame = 0;
    // Retain the brand when a multi-page menu navigates away from its cover.
    let brandColor = "#191c1b";
    const visible = (e: HTMLElement) => e.getBoundingClientRect().width > 0 && !e.closest('[aria-hidden="true"]');
    const update = () => {
      frame = 0;
      const root = container.querySelector<HTMLElement>(".cafe-a-typography,.aube-table-root");
      if (!root) return;
      const brand = getRenderedMenuBrandElement(root);
      const style = getComputedStyle(root);
      const savedBrand = style.getPropertyValue("--menu-role-brand-color").trim();
      const dining = root.matches(".aube-table-root");
      // Cover text may invert over photography. Operational buttons retain the
      // saved brand palette instead of sampling that temporary white title.
      brandColor = dining
        ? savedBrand || style.getPropertyValue("--aube-accent").trim() || brandColor
        : getRenderedMenuBrandColor(root);
      const surfaces = [style.backgroundColor];
      // Representative columns may have their own paper color. Walk only the brand's
      // ancestors, excluding photos, image overlays and interactive control fills.
      for (let panel = dining ? null : brand?.parentElement; panel && root.contains(panel); panel = panel.parentElement) {
        surfaces.push(getComputedStyle(panel).backgroundColor);
        if (panel === root) break;
      }
      const inks = [...root.querySelectorAll<HTMLElement>(".cafe-a-category-title,[data-cafe-a-menu-name]")].filter(visible).slice(0, 12).map(e => getComputedStyle(e).color);
      const next = resolveMenuInteractionTheme({ brand: brandColor, surfaces, inks });
      setTheme(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const observer = new MutationObserver(schedule);
    observer.observe(container, { subtree: true, childList: true, attributes: true, attributeFilter: ["style", "class", "data-theme", "data-fit-presentation-state"] });
    window.addEventListener("resize", schedule);
    schedule();
    return () => { observer.disconnect(); cancelAnimationFrame(frame); window.removeEventListener("resize", schedule); };
  }, [content]);
  return theme as CSSProperties;
}
