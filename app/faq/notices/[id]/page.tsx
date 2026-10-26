import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MarketingShell } from "@/components/marketing/MarketingPages";
import { createAnnouncementClient, getPublishedAnnouncementNeighbors } from "@/lib/server/announcement-service";
import {
  formatAnnouncementDate,
} from "@/lib/announcements";
import styles from "@/components/support/support.module.css";
import { ArticleNavigation } from "@/app/components/ui/content-list";
import AnnouncementContent from "@/components/support/AnnouncementContent";

export const metadata: Metadata = { title: "공지사항 | 아티메뉴 고객센터" };

export default async function AnnouncementDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  )
    notFound();
  const supabase = await createAnnouncementClient();
  const { data, error } = await supabase
    .from("support_announcements")
    .select("id,title,body,category,published_at")
    .eq("id", id)
    .eq("status", "published")
    .lte("published_at", new Date().toISOString())
    .maybeSingle();
  if (error || !data) notFound();
  const neighbors = await getPublishedAnnouncementNeighbors(data.id, data.published_at);
  const toNeighbor = (item: typeof neighbors.previous) => item ? {
    href: `/faq/notices/${item.id}`, title: item.title,
    date: formatAnnouncementDate(item.published_at), dateTime: item.published_at ?? undefined,
  } : null;
  return (
    <MarketingShell>
      <div className="site-container">
        <article className={styles.detail}>
          <header>

            <h1 className="type-page-title">{data.title}</h1>
            <time dateTime={data.published_at ?? undefined}>
              {formatAnnouncementDate(data.published_at)}
            </time>
          </header>
          <div className={styles.detailBody}>
            <AnnouncementContent body={data.body} />
          </div>
          {!neighbors.unavailable ? <ArticleNavigation previous={toNeighbor(neighbors.previous)} next={toNeighbor(neighbors.next)} /> : null}
          <div className="site-list-return"><Link href="/faq?tab=notices" className="site-button site-button-primary site-button-lg">공지사항 목록으로</Link></div>
        </article>
      </div>
    </MarketingShell>
  );
}
