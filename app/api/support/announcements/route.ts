import { normalizeAnnouncementPage } from "@/lib/announcements";
import { getPublishedAnnouncements } from "@/lib/server/announcement-service";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const result = await getPublishedAnnouncements({
    page: normalizeAnnouncementPage(params.get("page")),
    query: (params.get("q") ?? "").slice(0, 100),
    category: params.get("category") ?? "all",
  });
  return Response.json(result, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
