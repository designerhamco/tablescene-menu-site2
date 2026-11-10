type NoticeSource = {
  settings?: unknown;
  opening_hours?: string | null;
  restaurant_address?: string | null;
};

/** Explicit empty fields stay empty; legacy contact fallbacks apply only when absent. */
export function getMenuNoticeRows(site: NoticeSource): string[] {
  const settings = site.settings && typeof site.settings === "object" && !Array.isArray(site.settings)
    ? site.settings as Record<string, unknown> : {};
  const text = (key: string) => typeof settings[key] === "string" ? settings[key].trim() : "";
  const own = (key: string) => Object.prototype.hasOwnProperty.call(settings, key);
  return [
    own("footer_notice_1") ? text("footer_notice_1") : site.opening_hours?.trim() ?? "",
    own("footer_notice_2") ? text("footer_notice_2") : site.restaurant_address?.trim() ?? "",
    own("footer_notice_3") ? text("footer_notice_3") : text("footer_sns_text") || text("footer_note"),
  ].filter(Boolean);
}
