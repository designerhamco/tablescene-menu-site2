import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ContentList, ContentListItem } from "@/app/components/ui/content-list";
import { ANNOUNCEMENT_PREVIEW_SIZE, formatAnnouncementDate, getAnnouncementCategory, type AnnouncementSummary } from "@/lib/announcements";
import styles from "./support.module.css";

export default function LatestAnnouncements({ items = [], unavailable = false, loading = false }: {
  items?: AnnouncementSummary[];
  unavailable?: boolean;
  loading?: boolean;
}) {
  return <section aria-labelledby="latest-notices-title" aria-busy={loading}>
    <div className={styles.sectionHeader}>
      <h2 id="latest-notices-title" className="type-section-title">공지사항</h2>
      <Link href="/faq/notices" className="site-button site-button-link" aria-label="공지사항 전체보기">전체보기<ArrowRight size={18} aria-hidden="true" /></Link>
    </div>
    {loading || unavailable || items.length === 0 ? (
      <p className={styles.noticeState} role="status">
        {loading ? "공지사항을 불러오는 중입니다." : unavailable ? "공지사항을 불러오지 못했습니다. 전체보기에서 다시 확인해 주세요." : "등록된 공지사항이 없습니다. 새로운 소식이 있으면 이곳에서 안내하겠습니다."}
      </p>
    ) : <ContentList label="최신 공지사항">
      {items.slice(0, ANNOUNCEMENT_PREVIEW_SIZE).map(notice => <ContentListItem key={notice.id} href={`/faq/notices/${notice.id}`} title={notice.title} label={notice.pinned ? "중요 안내" : getAnnouncementCategory(notice.category)} date={formatAnnouncementDate(notice.published_at)} dateTime={notice.published_at ?? undefined} />)}
    </ContentList>}
  </section>;
}
