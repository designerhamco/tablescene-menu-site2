import type { MenuPageGroup, CafeDesignAWidgetContentBlock } from "@/components/menu-templates/shared/cafe-template-types";

import { menuColorContrast } from "./menu-interaction-theme";

export const CORNER_PANEL_BACKGROUND = "#3D3531";
export const PANEL_INTRO_KEY = "__one-page-panel-intro";
export const PANEL_FEATURED_IMAGE = { ratio: "4:3", cssRatio: "4 / 3", width: 1600, height: 1200 } as const;
export const PANEL_MOBILE_FEATURED_IMAGE = { ratio: "1:1", cssRatio: "1 / 1", width: 1600, height: 1600 } as const;

/** Render-only structural block: measured by the shared packer, never saved as a customer widget. */
export function withPanelIntro(groups: MenuPageGroup[]): MenuPageGroup[] {
  if (!groups.length) return groups;
  const first = groups[0];
  const intro: CafeDesignAWidgetContentBlock = {
    blockType: "widget", key: PANEL_INTRO_KEY, page: first.page, sortOrder: -1,
    previousVisibleBlockType: null, nextVisibleBlockType: first.blocks[0]?.blockType ?? null,
    widget: { id: PANEL_INTRO_KEY, type: "text", title: "", body: "", textAlign: "center", placement: "flow", visible: true },
  };
  return [{ ...first, blocks: [intro, ...first.blocks] }, ...groups.slice(1)];
}

/** Keep readable configured ink on the actual surface before using neutral ink. */
export function resolvePanelTextInk(brand: string | null | undefined, category: string | null | undefined, surface = "#FFFFFF"): string {
  return [brand, category, "#33221E", "#FFFFFF", "#000000"].find(
    color => color && /^#[0-9a-f]{6}$/i.test(color) && menuColorContrast(color, surface) >= 4.5,
  ) ?? "#33221E";
}
