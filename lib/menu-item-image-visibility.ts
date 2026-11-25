/** Display preference only: original image references remain on the item. */
export function getMenuItemImageVisibility(settings: unknown): Record<string, boolean> {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) return {};
  const value = (settings as Record<string, unknown>).item_image_visibility;
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, boolean] => typeof entry[1] === "boolean"));
}

export function mergeMenuItemImageVisibility(settings: unknown, items: { id: string; imageEnabled?: boolean }[], idMap: ReadonlyMap<string, string>) {
  const visibility = getMenuItemImageVisibility(settings);
  for (const item of items) {
    const id = idMap.get(item.id);
    if (!id || item.imageEnabled === undefined) continue;
    if (item.imageEnabled) delete visibility[id];
    else visibility[id] = false;
  }
  return visibility;
}
