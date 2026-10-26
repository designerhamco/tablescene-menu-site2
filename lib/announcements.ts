import type { Database } from "@/lib/supabase/types";
import { validateAnnouncementBody } from "@/lib/announcement-content";

export const ANNOUNCEMENT_CATEGORIES = [
  { value: "service", label: "서비스 안내" },
  { value: "update", label: "업데이트" },
  { value: "maintenance", label: "점검 안내" },
] as const;

export type AnnouncementCategory =
  (typeof ANNOUNCEMENT_CATEGORIES)[number]["value"];
export type Announcement =
  Database["public"]["Tables"]["support_announcements"]["Row"];
export type AnnouncementInput = Pick<
  Announcement,
  "title" | "body" | "pinned"
> & {
  category: AnnouncementCategory;
  status: "draft" | "published";
};
export type AnnouncementSummary = Pick<
  Announcement,
  "id" | "title" | "category" | "pinned" | "published_at"
>;
export const ANNOUNCEMENT_PAGE_SIZE = 10;

export function getAnnouncementCategory(value: string) {
  return (
    ANNOUNCEMENT_CATEGORIES.find((category) => category.value === value)
      ?.label ?? "서비스 안내"
  );
}

export function validateAnnouncement(
  input: Record<string, unknown>,
): { ok: true; data: AnnouncementInput } | { ok: false; error: string } {
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const body = typeof input.body === "string" ? input.body.trim() : "";
  if (!title || title.length > 160)
    return { ok: false, error: "제목은 1~160자로 입력해 주세요." };
  const bodyResult = validateAnnouncementBody(body);
  if (!bodyResult.ok) return bodyResult;
  const category = ANNOUNCEMENT_CATEGORIES.find(
    (category) => category.value === input.category,
  )?.value;
  if (!category) return { ok: false, error: "공지 유형을 선택해 주세요." };
  if (input.status !== "draft" && input.status !== "published")
    return { ok: false, error: "공개 상태를 선택해 주세요." };
  if (typeof input.pinned !== "boolean")
    return { ok: false, error: "상단 고정 값을 확인해 주세요." };
  return {
    ok: true,
    data: {
      title,
      body: bodyResult.body,
      category,
      status: input.status,
      pinned: input.pinned,
    },
  };
}

export function normalizeAnnouncementPage(value?: string | null) {
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 && page <= 100000 ? page : 1;
}

export function formatAnnouncementDate(value: string | null) {
  if (!value) return "미게시";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Seoul",
  }).format(new Date(value));
}

export function escapeAnnouncementSearch(value: string) {
  // Literal substring search: PostgREST filter separators cannot enter the OR expression.
  return value
    .replace(/[\\%_(),.\"]/g, " ")
    .trim()
    .slice(0, 100);
}

/** Raw PostgREST filters accept only a UUID and a validated database timestamp. */
export function getAnnouncementNeighborFilter(id: string, publishedAt: string | null, direction: "previous" | "next") {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    || !publishedAt || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(publishedAt)
    || !Number.isFinite(Date.parse(publishedAt))) return null;
  const comparison = direction === "previous" ? "lt" : "gt";
  return `published_at.${comparison}.${publishedAt},and(published_at.eq.${publishedAt},id.${comparison}.${id})`;
}
