"use client";
import { useEffect, useState, type CSSProperties, type RefObject } from "react";
import { readDiningToolSurface } from "./dining-tool-surface";
import { getRenderedMenuBrandElement } from "@/components/menu-templates/shared/rendered-menu-colors";
import { resolveMenuInteractionTheme, resolveMenuToolsInk } from "@/lib/menu-interaction-theme";

export default function useMenuInteractionTheme(content: RefObject<HTMLDivElement | null>) {
  const [theme, setTheme] = useState(() => resolveMenuInteractionTheme({ category: "#191c1b", surfaces: ["#ffffff"] }));
  useEffect(() => {
    const container = content.current;
    if (!container) return;
    let frame = 0, disposed = false;
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
      const category = [...root.querySelectorAll<HTMLElement>(".cafe-a-category-title,.aube-table-course-title h2,.aube-table-course-header h2")]
        .find(element => visible(element) && !element.closest("[inert]") && getComputedStyle(element).visibility !== "hidden");
      // A catalog Design override is inherited from MenuAppearanceScope. Read it
      // before the saved role so action colors update with the visible preview.
      // The saved role remains the stable fallback on cover/logo pages where no
      // category heading is currently visible.
      const savedCategory = style.getPropertyValue("--menu-role-category-color").trim();
      // Dining course headings fall back to --aube-ink, not --aube-accent.
      // Resolve that same category palette even on a cover with no heading.
      categoryColor = style.getPropertyValue("--menu-text-category").trim() || style.getPropertyValue("--menu-design-category-ink").trim()
        || (dining
          ? savedCategory || style.getPropertyValue("--aube-ink").trim()
          : (category && getComputedStyle(category).color) || savedCategory)
        || style.getPropertyValue("--aube-accent").trim() || categoryColor;
      const surfaces = [style.backgroundColor];
      // Representative columns may have their own paper color. Walk only the brand's
      // ancestors, excluding photos, image overlays and interactive control fills.
      for (let panel = dining ? null : brand?.parentElement; panel && root.contains(panel); panel = panel.parentElement) {
        surfaces.push(getComputedStyle(panel).backgroundColor);
        if (panel === root) break;
      }
      const declaredInks = [...(dining ? ["--menu-text-brand", "--menu-text-representative", "--menu-text-product", "--menu-text-price", "--menu-text-supporting", "--aube-cover-copy-ink"] : []), "--menu-role-brand-color", "--menu-role-category-color", "--menu-role-supporting-color", "--aube-accent", "--aube-ink", "--cafe-a-ink", "--menu-role-item-name-color", "--menu-role-price-color"].map(key => style.getPropertyValue(key).trim()).filter(Boolean);
      const inks = [...(brand ? [getComputedStyle(brand).color] : []), ...declaredInks, ...[...root.querySelectorAll<HTMLElement>(dining ? ".aube-table-page-header h1,.aube-table-course-header h2,.aube-table-page-description,.aube-table-course-description,.aube-table-item-heading h3,.aube-table-item-price,.aube-table-item-description" : ".cafe-a-category-title,[data-cafe-a-menu-name],.cafe-a-menu-price")].filter(visible).slice(0, 12).map(e => getComputedStyle(e).color)];
      // Include the actual reading panels, not photo pixels or site chrome.
      for (const panel of root.querySelectorAll<HTMLElement>("[data-native-column],[data-paged-column],.aube-table-page,.cafe-a-fixed-rail")) {
        if (visible(panel)) surfaces.push(getComputedStyle(panel).backgroundColor);
      }
      const pageTitle = dining ? style.getPropertyValue("--aube-page-title-ink").trim() : undefined;
      const palette = resolveMenuInteractionTheme({ category: categoryColor, pageTitle, surfaces, inks });
      const coverActive = dining && root.dataset.coverActive === "true";
      const cover = coverActive ? root.querySelector<HTMLElement>("[data-aube-table-cover]") : null;
      const coverDescription = root.querySelector<HTMLElement>(".aube-table-cover-description");
      const preferredToolsInk = coverDescription ? getComputedStyle(coverDescription).color : style.getPropertyValue("--aube-cover-copy-ink").trim();
      const control = container.parentElement?.querySelector<HTMLElement>("[data-table-menu-header]") ?? root.querySelector<HTMLElement>("[data-dining-menu-toolbar],[data-aube-table-language-control]");
      // A language-only cover samples the visible trigger, not the empty full-width toolbar.
      const surfaceControl = coverActive ? control?.querySelector<HTMLElement>("[data-language-menu-trigger]") ?? control : control;
      const toolSurface = dining ? readDiningToolSurface(root, surfaceControl, schedule) : style.backgroundColor;
      const toolPalette = cover ? [pageTitle ?? "", preferredToolsInk, ...(brand ? [getComputedStyle(brand).color] : []), ...[...cover.querySelectorAll<HTMLElement>("h1,.aube-table-cover-notices")].map(e=>getComputedStyle(e).color), getComputedStyle(cover).backgroundColor] : [...inks, ...surfaces];
      const next = { ...palette, ...(dining ? {
        "--menu-dining-language-ink": resolveMenuToolsInk({ preferred: categoryColor, surface: "#ffffff" }),
        "--menu-dining-tools-surface": coverActive ? "transparent" : style.backgroundColor,
        "--menu-dining-tools-ink": resolveMenuToolsInk({
          preferred: preferredToolsInk,
          surface: toolSurface,
          palette: toolPalette,
        }),
      } : {}) };
      setTheme(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
    };
    const schedule = () => { if (!disposed && !frame) frame = requestAnimationFrame(update); };
    const observer = new MutationObserver(schedule);
    observer.observe(container, { subtree: true, childList: true, attributes: true, attributeFilter: ["style", "class", "data-theme", "data-fit-presentation-state", "data-cover-active", "data-cover-image-active"] });
    container.addEventListener("load", schedule, true);
    window.addEventListener("resize", schedule);
    schedule();
    return () => { disposed = true; container.removeEventListener("load", schedule, true); observer.disconnect(); cancelAnimationFrame(frame); window.removeEventListener("resize", schedule); };
  }, [content]);
  return theme as CSSProperties;
}
