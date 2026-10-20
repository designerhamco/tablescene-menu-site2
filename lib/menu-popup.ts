/** Stored in menu_sites.settings; absent configuration is always OFF. */
export const MAX_MENU_POPUP_IMAGES = 3;
export type MenuPopupImage = { imageUrl: string; imagePath: string | null };
export type MenuPopupSettings = { enabled: boolean; images: MenuPopupImage[] };
const record = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
export function readMenuPopupSettings(settings: unknown): MenuPopupSettings {
  const popup = record(record(settings).advertisementPopup);
  const images = Array.isArray(popup.images) ? popup.images.slice(0, MAX_MENU_POPUP_IMAGES).flatMap(value => {
    const image = record(value);
    if (typeof image.imageUrl !== "string" || !/^(https?:\/\/|\/(?!\/))/.test(image.imageUrl)) return [];
    return [{ imageUrl: image.imageUrl, imagePath: typeof image.imagePath === "string" ? image.imagePath : null }];
  }) : [];
  return { enabled: popup.enabled === true, images };
}
export function validateMenuPopupImage(image: MenuPopupImage, menuId: string, publicStorageOrigin: string) {
  const prefix = `menu-sites/${menuId}/draft/popup/`;
  if (!image.imagePath?.startsWith(prefix) || image.imagePath.includes("..") || !/^[-\w/]+\.(png|jpg|webp)$/.test(image.imagePath)) return false;
  try {
    const url = new URL(image.imageUrl);
    return url.origin === new URL(publicStorageOrigin).origin && url.pathname === `/storage/v1/object/public/menu-images/${image.imagePath}`;
  } catch { return false; }
}
