import "server-only";
import { createClient } from "@/lib/supabase/server";
import {
  ANNOUNCEMENT_CATEGORIES,
  ANNOUNCEMENT_PAGE_SIZE,
  escapeAnnouncementSearch,
  getAnnouncementNeighborFilter,
  type AnnouncementSummary,
} from "@/lib/announcements";

export async function createAnnouncementClient() {
  return createClient();
}

export async function getPublishedAnnouncements({
  page = 1,
  query = "",
  category = "all",
}: { page?: number; query?: string; category?: string } = {}) {
  const supabase = await createAnnouncementClient();
  let request = supabase
    .from("support_announcements")
    .select("id,title,category,pinned,published_at", { count: "exact" })
    .eq("status", "published")
    .lte("published_at", new Date().toISOString());
  const selectedCategory = ANNOUNCEMENT_CATEGORIES.find(
    (item) => item.value === category,
  );
  if (selectedCategory)
    request = request.eq("category", selectedCategory.value);
  const search = escapeAnnouncementSearch(query);
  if (search)
    request = request.or(`title.ilike.%${search}%,body.ilike.%${search}%`);
  const { data, error, count } = await request
    .order("pinned", { ascending: false })
    .order("published_at", { ascending: false })
    .order("id", { ascending: false })
    .range(
      (page - 1) * ANNOUNCEMENT_PAGE_SIZE,
      page * ANNOUNCEMENT_PAGE_SIZE - 1,
    );
  if (error) {
    console.error("[announcements] public list unavailable", error.code);
    return { items: [] as AnnouncementSummary[], count: 0, unavailable: true };
  }
  return { items: data ?? [], count: count ?? 0, unavailable: false };
}


/** Adjacent public posts follow chronological (timestamp, UUID) order, independent of pinning. */
export async function getPublishedAnnouncementNeighbors(id: string, publishedAt: string | null) {
  const previousFilter = getAnnouncementNeighborFilter(id, publishedAt, "previous");
  const nextFilter = getAnnouncementNeighborFilter(id, publishedAt, "next");
  if (!previousFilter || !nextFilter) return { previous: null, next: null, unavailable: true };
  const supabase = await createAnnouncementClient();
  const now = new Date().toISOString();
  const query = (filter: string, ascending: boolean) => supabase
    .from("support_announcements")
    .select("id,title,published_at")
    .eq("status", "published")
    .lte("published_at", now)
    .or(filter)
    .order("published_at", { ascending })
    .order("id", { ascending })
    .limit(1)
    .maybeSingle();
  const [previous, next] = await Promise.all([query(previousFilter, false), query(nextFilter, true)]);
  return { previous: previous.error ? null : previous.data, next: next.error ? null : next.data, unavailable: Boolean(previous.error || next.error) };
}
