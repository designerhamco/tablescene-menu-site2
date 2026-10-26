"use client";

import { useEffect, useId, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { DETAILED_FAQ_DATA, FAQItem } from "@/app/components/common/FAQ";
import {
  ANNOUNCEMENT_CATEGORIES,
  ANNOUNCEMENT_PAGE_SIZE,
  formatAnnouncementDate,
  getAnnouncementCategory,
  type AnnouncementSummary,
} from "@/lib/announcements";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import styles from "./support.module.css";

type AnnouncementList = {
  items: AnnouncementSummary[];
  count: number;
  unavailable: boolean;
};

function Pagination({
  page,
  total,
  onChange,
}: {
  page: number;
  total: number;
  onChange: (page: number) => void;
}) {
  if (total <= 1) return null;
  const start = Math.max(1, Math.min(page - 2, total - 4));
  return (
    <nav className={styles.pagination} aria-label="목록 페이지">
      <button
        type="button"
        className="site-button site-button-ghost site-button-icon"
        aria-label="이전 페이지"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        <ChevronLeft size={18} />
      </button>
      {Array.from({ length: Math.min(5, total) }, (_, i) => start + i).map(
        (value) => (
          <button
            type="button"
            key={value}
            className="site-button site-button-ghost site-button-icon"
            aria-label={`${value}페이지`}
            aria-current={page === value ? "page" : undefined}
            onClick={() => onChange(value)}
          >
            {value}
          </button>
        ),
      )}
      <button
        type="button"
        className="site-button site-button-ghost site-button-icon"
        aria-label="다음 페이지"
        disabled={page >= total}
        onClick={() => onChange(page + 1)}
      >
        <ChevronRight size={18} />
      </button>
    </nav>
  );
}

export default function SupportCenter({
  supportActions,
  initialTab = "faq",
}: {
  supportActions: React.ReactNode;
  initialTab?: "faq" | "notices";
}) {
  const [tab, setTab] = useState<"faq" | "notices">(initialTab);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(1);
  const [openQuestion, setOpenQuestion] = useState<string | null>(null);
  const [notices, setNotices] = useState<AnnouncementList>({
    items: [],
    count: 0,
    unavailable: false,
  });
  const [loading, setLoading] = useState(false);
  const [retry, setRetry] = useState(0);
  const uid = useId();
  const questions = useMemo(
    () =>
      DETAILED_FAQ_DATA.flatMap((group) =>
        group.items.map((item) => ({ ...item, category: group.category })),
      ),
    [],
  );
  const normalized = query.trim().toLocaleLowerCase("ko-KR");
  const filtered = questions.filter(
    (item) =>
      (category === "all" || category === item.category) &&
      `${item.category} ${item.question}`
        .toLocaleLowerCase("ko-KR")
        .includes(normalized),
  );
  const faqPages = Math.max(
    1,
    Math.ceil(filtered.length / ANNOUNCEMENT_PAGE_SIZE),
  );
  const shownQuestions = filtered.slice(
    (page - 1) * ANNOUNCEMENT_PAGE_SIZE,
    page * ANNOUNCEMENT_PAGE_SIZE,
  );

  useEffect(() => {
    if (tab !== "notices") return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          q: query,
          category,
          page: String(page),
        });
        const response = await fetch(`/api/support/announcements?${params}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("unavailable");
        const result: AnnouncementList = await response.json();
        if (!controller.signal.aborted) setNotices(result);
      } catch {
        if (!controller.signal.aborted)
          setNotices({ items: [], count: 0, unavailable: true });
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 220);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [tab, query, category, page, retry]);

  function changeTab(value: "faq" | "notices") {
    setTab(value);
    setCategory("all");
    setPage(1);
    setOpenQuestion(null);
  }

  const categories =
    tab === "faq"
      ? DETAILED_FAQ_DATA.map((group) => ({
          value: group.category,
          label: group.category,
        }))
      : ANNOUNCEMENT_CATEGORIES;
  return (
    <>
      <section className={styles.hero}>
        <div className="site-container">

          <h1 className="type-page-title">필요한 도움을 찾아보세요</h1>
          <p className="site-body text-zinc-500">
            처음 시작하는 방법부터 매장 운영까지, 궁금한 내용을 안내합니다.
          </p>
          <div className={styles.search}>
            <label className="sr-only" htmlFor={`${uid}-search`}>
              고객센터 검색
            </label>
            <Search size={20} aria-hidden="true" />
            <input
              className="site-field"
              id={`${uid}-search`}
              type="search"
              placeholder="예: 메뉴판 만들기, QR, 결제"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
                setOpenQuestion(null);
              }}
            />
          </div>
          <p className="site-body-sm text-zinc-500">
            더 자세한 도움이 필요하신가요?{" "}
            <Link href="/mypage/inquiries">1:1 문의하기</Link>
          </p>
          {supportActions}
        </div>
      </section>
      <section
        className={`site-page-spacing ${styles.content}`}
        aria-label="고객지원 안내"
      >
        <div className="site-container">
          <Tabs variant="contained" value={tab} onValueChange={value => changeTab(value as "faq" | "notices")}>
            <TabsList distribution="equal" aria-label="고객센터 메뉴">
              <TabsTrigger value="notices">공지사항</TabsTrigger>
              <TabsTrigger value="faq">FAQ</TabsTrigger>
            </TabsList>
            <TabsContent value={tab}>
            <h2 className="type-section-title sr-only">
              {tab === "faq" ? "자주 묻는 질문" : "공지사항"}
            </h2>
            <div className="site-filter-group" role="group" aria-label="주제 선택">
              {[{ value: "all", label: "전체" }, ...categories].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className="site-filter"
                  aria-pressed={category === item.value}
                  onClick={() => {
                    setCategory(item.value);
                    setPage(1);
                    setOpenQuestion(null);
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
            {tab === "faq" ? (
              <>
                <p className={styles.resultCount} role="status">
                  {query ? "검색 결과" : "전체"} {filtered.length}개
                </p>
                {shownQuestions.length ? (
                  <div className={styles.rows}>
                    {shownQuestions.map((item) => (
                      <div key={item.question} className={styles.faqRow}>
                        <span className={styles.category}>{item.category}</span>
                        <FAQItem
                          item={item}
                          isOpen={openQuestion === item.question}
                          onToggle={() =>
                            setOpenQuestion(
                              openQuestion === item.question
                                ? null
                                : item.question,
                            )
                          }
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.empty}>
                    <h3 className="type-content-title">검색 결과가 없습니다</h3>
                    <p className="site-body-sm">
                      다른 검색어를 입력하거나 1:1 문의를 이용해 주세요.
                    </p>
                  </div>
                )}
                <Pagination
                  page={page}
                  total={faqPages}
                  onChange={(value) => {
                    setPage(value);
                    setOpenQuestion(null);
                  }}
                />
              </>
            ) : (
              <div aria-busy={loading}>
                {loading ? (
                  <p className={styles.empty} role="status">
                    공지사항을 불러오는 중입니다.
                  </p>
                ) : notices.unavailable ? (
                  <div className={styles.empty} role="status">
                    <h3 className="type-content-title">
                      공지사항을 불러오지 못했습니다
                    </h3>
                    <p className="site-body-sm">잠시 후 다시 시도해 주세요.</p>
                    <button
                      className="site-button site-button-secondary"
                      type="button"
                      onClick={() => setRetry((value) => value + 1)}
                    >
                      다시 시도
                    </button>
                  </div>
                ) : notices.items.length ? (
                  <>
                    <p className={styles.resultCount} role="status">
                      전체 {notices.count}개
                    </p>
                    <div className={styles.rows}>
                      {notices.items.map((notice) => (
                        <Link
                          key={notice.id}
                          href={`/faq/notices/${notice.id}`}
                          className={styles.noticeRow}
                        >
                          <span className={styles.category}>
                            {notice.pinned
                              ? "중요 안내"
                              : getAnnouncementCategory(notice.category)}
                          </span>
                          <strong className="type-item-title">
                            {notice.title}
                          </strong>
                          <time dateTime={notice.published_at ?? undefined}>
                            {formatAnnouncementDate(notice.published_at)}
                          </time>
                        </Link>
                      ))}
                    </div>
                    <Pagination
                      page={page}
                      total={Math.ceil(notices.count / ANNOUNCEMENT_PAGE_SIZE)}
                      onChange={setPage}
                    />
                  </>
                ) : (
                  <div className={styles.empty}>
                    <h3 className="type-content-title">
                      {query || category !== "all"
                        ? "조건에 맞는 공지사항이 없습니다"
                        : "등록된 공지사항이 없습니다"}
                    </h3>
                    <p className="site-body-sm">
                      새로운 소식이 있으면 이곳에서 안내하겠습니다.
                    </p>
                  </div>
                )}
              </div>
            )}
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </>
  );
}
