import { getTemplateCapabilities } from "./template-capabilities";
import type { MenuWidgetDraft, MenuWidgetPlacement } from "./menu-widgets";
import type { MenuWidgetFinalSavePayload } from "./menu-widget-save-contract";

/** Basic docks below menu content, immediately above notices. Dining is always ordered flow. */
export function supportsBottomWidgetPlacement(templateKey: string | null | undefined) {
  return getTemplateCapabilities(templateKey).menuCover.coverMode === "section";
}
export function getEffectiveWidgetPlacement(templateKey: string | null | undefined, placement?: MenuWidgetPlacement): MenuWidgetPlacement {
  return supportsBottomWidgetPlacement(templateKey) ? placement ?? "bottom" : "flow";
}
export function isBottomWidgetLocked(templateKey: string | null | undefined, widget?: Pick<MenuWidgetDraft, "settings"> | null) {
  return Boolean(widget && getEffectiveWidgetPlacement(templateKey, widget.settings.placement) === "bottom");
}
export function orderWidgetContentBlocks<T extends { blockType: "category" | "widget"; id: string; sortOrder: number }>(
  blocks: readonly T[], widgets: Readonly<Record<string, Pick<MenuWidgetDraft, "settings">>>, templateKey: string | null | undefined,
): T[] {
  const ordered = [...blocks].sort((a, b) => a.sortOrder - b.sortOrder);
  const locked = (block: T) => block.blockType === "widget" && isBottomWidgetLocked(templateKey, widgets[block.id]);
  return [...ordered.filter(block => !locked(block)), ...ordered.filter(locked)].map((block, sortOrder) => ({ ...block, sortOrder }));
}
/** Canonicalize the same JSON payload on client and authorized server save; no data migration. */
export function normalizeWidgetPlacementPayload(payload: MenuWidgetFinalSavePayload, templateKey: string | null | undefined): MenuWidgetFinalSavePayload {
  const widgetDrafts = payload.widgetDrafts.map(draft => ({ ...draft, settings: { ...draft.settings,
    placement: getEffectiveWidgetPlacement(templateKey, draft.settings.placement) } }));
  const widgets = Object.fromEntries(widgetDrafts.map(draft => [draft.id, draft]));
  const contentBlocksByPage = payload.contentBlocksByPage.map(page => ({ ...page, blocks: orderWidgetContentBlocks(page.blocks, widgets, templateKey) }));
  for (const page of contentBlocksByPage) for (const block of page.blocks) {
    if (block.blockType === "widget" && widgets[block.id]) widgets[block.id].sortOrder = block.sortOrder;
  }
  return { ...payload, widgetDrafts, contentBlocksByPage };
}
