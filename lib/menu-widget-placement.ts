import type { MenuWidgetDraft, MenuWidgetPlacement } from "./menu-widgets";
import type { MenuWidgetFinalSavePayload } from "./menu-widget-save-contract";

/** Keep legacy call sites compatible; neither service nor old hints change flow. */
export function getEffectiveWidgetPlacement(
  templateKey?: string | null,
  placement?: MenuWidgetPlacement,
): MenuWidgetPlacement {
  void templateKey;
  void placement;
  return "flow";
}

export function orderWidgetContentBlocks<T extends { blockType: "category" | "widget"; id: string; sortOrder: number }>(
  blocks: readonly T[],
  widgets: Readonly<Record<string, Pick<MenuWidgetDraft, "settings">>>,
  templateKey: string | null | undefined,
): T[] {
  void widgets;
  void templateKey;
  return [...blocks]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((block, sortOrder) => ({ ...block, sortOrder }));
}

/** The editor and authorized server save share an idempotent, non-mutating policy. */
export function normalizeWidgetPlacementPayload(
  payload: MenuWidgetFinalSavePayload,
  templateKey: string | null | undefined,
): MenuWidgetFinalSavePayload {
  const widgetDrafts = payload.widgetDrafts.map(draft => ({
    ...draft,
    settings: { ...draft.settings, placement: getEffectiveWidgetPlacement(templateKey, draft.settings.placement) },
  }));
  const widgets = Object.fromEntries(widgetDrafts.map(draft => [draft.id, draft]));
  const contentBlocksByPage = payload.contentBlocksByPage.map(page => ({
    ...page,
    blocks: orderWidgetContentBlocks(page.blocks, widgets, templateKey),
  }));
  for (const page of contentBlocksByPage) {
    for (const block of page.blocks) {
      if (block.blockType === "widget" && widgets[block.id]) widgets[block.id].sortOrder = block.sortOrder;
    }
  }
  return { ...payload, widgetDrafts, contentBlocksByPage };
}
