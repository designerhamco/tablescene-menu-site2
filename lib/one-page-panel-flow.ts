import type { MenuPageGroup, CafeDesignAWidgetContentBlock } from "@/components/menu-templates/shared/cafe-template-types";

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

/** Keep saved brand ink when readable on the plain white panel, then try category ink. */
export function resolvePanelTextInk(brand: string | null | undefined, category: string | null | undefined): string {
  for (const color of [brand, category]) {
    const hex = color?.match(/^#([0-9a-f]{6})$/i)?.[1];
    if (!hex) continue;
    const channels = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    const luminance = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
    if (1.05 / (luminance + 0.05) >= 4.5) return color!;
  }
  return "#33221E";
}
