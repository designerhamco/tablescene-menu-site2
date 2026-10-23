import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import OfficialSiteNavbar from "@/components/layout/OfficialSiteNavbar";
import { createAnnouncementClient } from "@/lib/server/announcement-service";
import {
  formatAnnouncementDate,
  getAnnouncementCategory,
  normalizeAnnouncementPage,
} from "@/lib/announcements";
import AnnouncementForm from "./AnnouncementForm";
import styles from "@/components/support/support.module.css";

export const metadata: Metadata = {
  title: "공지사항 관리 | 아티메뉴",
  robots: { index: false, follow: false },
};

export default async function AnnouncementAdmin({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; saved?: string; page?: string }>;
}) {
  const supabase = await createAnnouncementClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/admin/announcements");
  const { data: admin, error: adminError } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (adminError || !admin) redirect("/admin");
  const params = await searchParams;
  const page = normalizeAnnouncementPage(params.page);
  const [list, selected] = await Promise.all([
    supabase
      .from("support_announcements")
      .select("id,title,status,category,updated_at", { count: "exact" })
      .order("updated_at", { ascending: false })
      .order("id", { ascending: false })
      .range((page - 1) * 15, page * 15 - 1),
    params.id
      ? supabase
          .from("support_announcements")
          .select("*")
          .eq("id", params.id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  const unavailable = Boolean(list.error || selected.error);
  return (
    <>
      <OfficialSiteNavbar />
      <main className="site-container">
        <div className={styles.admin}>
          <header className={styles.adminHeader}>
            <div>

              <h1 className="type-page-title mt-3">공지사항 관리</h1>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link className="site-button site-button-secondary" href="/admin">
                관리자 홈
              </Link>
              <Link
                className="site-button site-button-primary"
                href="/admin/announcements"
              >
                새 공지 작성
              </Link>
            </div>
          </header>
          {params.saved === "1" ? (
            <p role="status" className={`${styles.feedback} mb-6`}>
              공지사항을 저장했습니다.
            </p>
          ) : null}
          {params.id && !selected.data && !unavailable ? (
            <p className={`${styles.feedback} mb-6`}>
              해당 공지사항을 찾을 수 없습니다. 새 글을 작성하거나 목록에서 다시
              선택해 주세요.
            </p>
          ) : null}
          <div className={styles.adminGrid}>
            <aside className={styles.adminList} aria-label="공지사항 목록">
              <h2 className="type-content-title">작성한 공지</h2>
              {(list.data ?? []).map((notice) => (
                <Link
                  href={`/admin/announcements?id=${notice.id}&page=${page}`}
                  key={notice.id}
                  aria-current={params.id === notice.id ? "page" : undefined}
                >
                  <span>
                    {notice.status === "published" ? "게시" : "비공개"} ·{" "}
                    {getAnnouncementCategory(notice.category)}
                  </span>
                  <strong className="type-item-title">{notice.title}</strong>
                  <span>{formatAnnouncementDate(notice.updated_at)}</span>
                </Link>
              ))}
              {!list.data?.length ? (
                <p className="site-body-sm text-zinc-500">
                  {unavailable
                    ? "공지사항 연결을 확인해 주세요."
                    : "작성된 공지사항이 없습니다."}
                </p>
              ) : null}
              <nav className="flex gap-2" aria-label="관리 목록 페이지">
                {page > 1 ? (
                  <Link
                    href={`/admin/announcements?page=${page - 1}`}
                    className="site-button site-button-secondary"
                  >
                    이전
                  </Link>
                ) : null}
                {page * 15 < (list.count ?? 0) ? (
                  <Link
                    href={`/admin/announcements?page=${page + 1}`}
                    className="site-button site-button-secondary"
                  >
                    다음
                  </Link>
                ) : null}
              </nav>
            </aside>
            <AnnouncementForm
              key={`${selected.data?.id ?? "new"}-${selected.data?.updated_at ?? ""}`}
              announcement={selected.data}
              unavailable={unavailable}
            />
          </div>
        </div>
      </main>
    </>
  );
}
