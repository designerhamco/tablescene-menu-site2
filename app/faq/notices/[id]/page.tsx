import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MarketingShell } from "@/components/marketing/MarketingPages";
import { createAnnouncementClient } from "@/lib/server/announcement-service";
import {
  formatAnnouncementDate,
  getAnnouncementCategory,
} from "@/lib/announcements";
import styles from "@/components/support/support.module.css";

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
  return (
    <MarketingShell>
      <div className="site-container">
        <article className={styles.detail}>
          <header>
            <p className="site-eyebrow">
              {getAnnouncementCategory(data.category)}
            </p>
            <h1 className="type-page-title">{data.title}</h1>
            <time dateTime={data.published_at ?? undefined}>
              {formatAnnouncementDate(data.published_at)}
            </time>
          </header>
          <div className={`site-body ${styles.detailBody}`}>{data.body}</div>
          <Link
            href="/faq?tab=notices"
            className="site-button site-button-secondary"
          >
            공지사항 목록으로
          </Link>
        </article>
      </div>
    </MarketingShell>
  );
}
