import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import {
  ANNOUNCEMENT_CATEGORIES,
  ANNOUNCEMENT_PAGE_SIZE,
  escapeAnnouncementSearch,
  type Announcement,
  type AnnouncementSummary,
} from "@/lib/announcements";

// Additive migration contract, isolated from the generated Production database types
// until the migration is approved and those types are refreshed.
type AnnouncementDatabase = Omit<Database, "public"> & {
  public: Omit<Database["public"], "Tables"> & {
    Tables: Database["public"]["Tables"] & {
      support_announcements: {
        Row: Announcement;
        Insert: Pick<Announcement, "title" | "body" | "category"> &
          Partial<Announcement>;
        Update: Partial<Announcement>;
        Relationships: [];
      };
    };
  };
};

export async function createAnnouncementClient() {
  return (await createClient()) as unknown as SupabaseClient<AnnouncementDatabase>;
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
