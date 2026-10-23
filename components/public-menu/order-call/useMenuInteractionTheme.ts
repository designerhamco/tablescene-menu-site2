"use client";
import { useEffect, useState, type CSSProperties, type RefObject } from "react";
import { getRenderedMenuBrandElement } from "@/components/menu-templates/shared/rendered-menu-colors";
import { resolveMenuInteractionTheme } from "@/lib/menu-interaction-theme";

export default function useMenuInteractionTheme(content: RefObject<HTMLDivElement | null>) {
  const [theme, setTheme] = useState(() => resolveMenuInteractionTheme({ category: "#191c1b", surfaces: ["#ffffff"] }));
  useEffect(() => {
    const container = content.current;
    if (!container) return;
    let frame = 0;
    // Retain the category ink while a multi-page cover has no category heading.
    let categoryColor = "#191c1b";
    const visible = (e: HTMLElement) => e.getBoundingClientRect().width > 0 && !e.closest('[aria-hidden="true"]');
    const update = () => {
      frame = 0;
      const root = container.querySelector<HTMLElement>(".cafe-a-typography,.aube-table-root");
      if (!root) return;
      const brand = getRenderedMenuBrandElement(root);
      const style = getComputedStyle(root);
      const dining = root.matches(".aube-table-root");
      const category = [...root.querySelectorAll<HTMLElement>(".cafe-a-category-title,.aube-table-course-header h2")]
        .find(element => visible(element) && !element.closest("[inert]") && getComputedStyle(element).visibility !== "hidden");
      // A catalog Design override is inherited from MenuAppearanceScope. Read it
      // before the saved role so action colors update with the visible preview.
      // The saved role remains the stable fallback on cover/logo pages where no
      // category heading is currently visible.
      categoryColor = style.getPropertyValue("--menu-design-category-ink").trim()
        || (category && getComputedStyle(category).color)
        || style.getPropertyValue("--menu-role-category-color").trim()
        || style.getPropertyValue("--aube-accent").trim() || categoryColor;
      const surfaces = [style.backgroundColor];
      // Representative columns may have their own paper color. Walk only the brand's
      // ancestors, excluding photos, image overlays and interactive control fills.
      for (let panel = dining ? null : brand?.parentElement; panel && root.contains(panel); panel = panel.parentElement) {
        surfaces.push(getComputedStyle(panel).backgroundColor);
        if (panel === root) break;
      }
      const declaredInks = ["--menu-role-category-color", "--aube-accent", "--aube-ink", "--cafe-a-ink", "--menu-role-item-name-color", "--menu-role-price-color"].map(key => style.getPropertyValue(key).trim()).filter(Boolean);
      const inks = [...declaredInks, ...[...root.querySelectorAll<HTMLElement>(".cafe-a-category-title,[data-cafe-a-menu-name],.cafe-a-menu-price,.aube-table-course-title,.aube-table-item-heading h3,.aube-table-item-price")].filter(visible).slice(0, 12).map(e => getComputedStyle(e).color)];
      // Include the actual reading panels, not photo pixels or site chrome.
      for (const panel of root.querySelectorAll<HTMLElement>("[data-native-column],.aube-table-page,.cafe-a-fixed-rail")) {
        if (visible(panel)) surfaces.push(getComputedStyle(panel).backgroundColor);
      }
      const next = resolveMenuInteractionTheme({ category: categoryColor, surfaces, inks });
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
