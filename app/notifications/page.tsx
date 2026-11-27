import SitePageHeader from "@/components/layout/SitePageHeader";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import OfficialSiteNavbar from "@/components/layout/OfficialSiteNavbar";
import NotificationHistorySection from "@/components/mypage/NotificationHistorySection";
import NotificationBackButton from "@/components/notifications/NotificationBackButton";
import { getNotificationDisplaySince, NOTIFICATION_INBOX_HREF, NOTIFICATION_VISIBLE_CHANNELS } from "@/lib/notification-display-policy";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "알림 | 아티메뉴",
  robots: { index: false, follow: false },
};

export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) redirect(`/sign-in?next=${encodeURIComponent(NOTIFICATION_INBOX_HREF)}`);

  const displaySince = getNotificationDisplaySince();
  const [eventsResult, countResult] = await Promise.all([supabase
    .from("notification_events")
    .select("id, title, message, status, channel, sent_at, read_at, created_at, metadata")
    .eq("user_id", user.id)
    .in("channel", [...NOTIFICATION_VISIBLE_CHANNELS])
    .neq("status", "skipped")
    .gte("created_at", displaySince)
    .order("created_at", { ascending: false })
    .limit(50),
    supabase.from("notification_events").select("id", { count: "exact", head: true })
      .eq("user_id", user.id).in("channel", [...NOTIFICATION_VISIBLE_CHANNELS])
      .neq("status", "skipped").gte("created_at", displaySince).is("read_at", null),
  ]);
  const { data, error } = eventsResult;

  return <>
    <OfficialSiteNavbar showSupportLauncher={false} />
    <main className="site-management-scope site-gutter site-page-spacing-compact flex-1 bg-white text-zinc-950" data-notification-inbox>
      <div className="mx-auto w-full max-w-2xl">
        <SitePageHeader title="알림" align="start" breadcrumbs={[{ label: "마이페이지", href: "/mypage" }, { label: "알림" }]}><NotificationBackButton /></SitePageHeader>
        {error ? <p className="site-notice site-notice-error p-5" role="alert">알림을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.</p>
          : <NotificationHistorySection events={data ?? []} userId={user.id} unreadCount={countResult.error ? undefined : countResult.count ?? 0} showIntro={false} fallbackHref={NOTIFICATION_INBOX_HREF} />}
      </div>
    </main>
  </>;
}
