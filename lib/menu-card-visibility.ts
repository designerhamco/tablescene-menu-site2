export const MENU_CARD_VISIBILITY_LABELS = {
  "before-publish": "공개 전",
  private: "비공개",
  published: "공개중",
} as const;

export type MenuCardVisibility = keyof typeof MENU_CARD_VISIBILITY_LABELS;

export function getMenuCardVisibility(status: string | null, publishedAt: string | null, canViewPublic: boolean): MenuCardVisibility | null {
  if (status === "published") return canViewPublic ? "published" : null;
  if (status === "draft") return publishedAt ? "private" : "before-publish";
  if (status === "private" || status === "unpublished") return "private";
  return null;
}
