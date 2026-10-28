import type { Metadata } from "next";
import { redirect } from "next/navigation";
import OfficialSiteNavbar from "@/components/layout/OfficialSiteNavbar";
import NotificationHistorySection from "@/components/mypage/NotificationHistorySection";
import NotificationBackButton from "@/components/notifications/NotificationBackButton";
import { NOTIFICATION_INBOX_HREF, NOTIFICATION_VISIBLE_CHANNELS } from "@/lib/notification-display-policy";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "알림 | 아티메뉴",
  robots: { index: false, follow: false },
};

export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) redirect(`/sign-in?next=${encodeURIComponent(NOTIFICATION_INBOX_HREF)}`);

  const { data, error } = await supabase
    .from("notification_events")
    .select("id, title, message, status, channel, sent_at, read_at, created_at, metadata")
    .eq("user_id", user.id)
    .in("channel", [...NOTIFICATION_VISIBLE_CHANNELS])
    .neq("status", "skipped")
    .order("created_at", { ascending: false })
    .limit(50);

  return <>
    <OfficialSiteNavbar showQuickMenu={false} />
    <main className="site-management-scope site-gutter flex-1 bg-white pb-8 pt-6 text-zinc-950 md:py-10" data-notification-inbox>
      <div className="mx-auto w-full max-w-2xl">
        <header className="mb-5 flex items-center gap-3">
          <NotificationBackButton />
          <h1 className="type-page-title">알림</h1>
        </header>
        {error ? <p className="site-notice site-notice-error p-5" role="alert">알림을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.</p>
          : <NotificationHistorySection events={data ?? []} showIntro={false} fallbackHref={NOTIFICATION_INBOX_HREF} />}
      </div>
    </main>
  </>;
}
