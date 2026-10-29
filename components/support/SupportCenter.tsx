"use client";

import { useId, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { DETAILED_FAQ_DATA, FAQItem } from "@/app/components/common/FAQ";
import styles from "./support.module.css";
import SitePageHeader from "@/components/layout/SitePageHeader";
import { SitePagination } from "@/app/components/ui/site-pagination";
import { ContentList } from "@/app/components/ui/content-list";
import { CategoryFilter } from "@/app/components/ui/category-filter";
import { Button } from "@/app/components/ui/button";

const FAQ_PAGE_SIZE = 5;

export default function SupportCenter({ supportActions }: { supportActions?: React.ReactNode }) {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(1);
  const [openQuestion, setOpenQuestion] = useState<string | null>(null);
  const uid = useId();
  const questions = useMemo(
    () =>
      DETAILED_FAQ_DATA.flatMap((group) =>
        group.items.map((item) => ({ ...item, category: group.category })),
      ),
    [],
  );
  const normalized = submittedQuery.toLocaleLowerCase("ko-KR");
  const filtered = questions.filter(
    (item) =>
      (category === "all" || category === item.category) &&
      `${item.category} ${item.question}`
        .toLocaleLowerCase("ko-KR")
        .includes(normalized),
  );
  const faqPages = Math.max(
    1,
    Math.ceil(filtered.length / FAQ_PAGE_SIZE),
  );
  const shownQuestions = filtered.slice(
    (page - 1) * FAQ_PAGE_SIZE,
    page * FAQ_PAGE_SIZE,
  );

  function submitSearch(value: string) {
    setSubmittedQuery(value.trim());
    setCategory("all");
    setPage(1);
    setOpenQuestion(null);
  }

  function clearSearch() {
    setQuery("");
    submitSearch("");
    document.getElementById(`${uid}-search`)?.focus();
  }

  const categories = DETAILED_FAQ_DATA.map(group => ({ value: group.category, label: group.category }));
  const content = (
    <section aria-label="자주 묻는 질문">
      <h2 className="type-section-title sr-only">
        질문 목록
      </h2>
      <CategoryFilter
        label="주제 선택"
        value={category}
        options={[{ value: "all", label: "전체" }, ...categories]}
        onValueChange={value => {
          setCategory(value);
          setPage(1);
          setOpenQuestion(null);
        }}
      />
      <>
          <p className={styles.resultCount} role="status">
            {submittedQuery ? "검색 결과" : "전체"} {filtered.length}개
          </p>
          {shownQuestions.length ? (
            <ContentList label="자주 묻는 질문 목록">
              {shownQuestions.map((item) => (
                <li key={item.question} className={styles.faqRow}>
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
                </li>
              ))}
            </ContentList>
          ) : (
            <div className={styles.empty}>
              <h3 className="type-content-title">검색 결과가 없습니다</h3>
              <p className="site-body-sm">
                다른 검색어를 입력하거나 1:1 문의를 이용해 주세요.
              </p>
            </div>
          )}
          <SitePagination
            currentPage={page}
            totalPages={faqPages}
            onSelect={(value) => {
              setPage(value);
              setOpenQuestion(null);
            }}
          />
        </>

    </section>
  );

  return (
    <>
      <section className={`site-page-spacing-compact ${styles.hero}`} aria-labelledby={`${uid}-title`}>
        <div className="site-container">
          <SitePageHeader id={`${uid}-title`} title="자주 묻는 질문" description="메뉴판 만들기부터 매장 운영까지, 궁금한 내용을 찾아보세요." />
          <form
            role="search"
            aria-label="고객센터 검색"
            className={styles.search}
            onSubmit={(event) => {
              event.preventDefault();
              submitSearch(query);
            }}
          >
            <label className="sr-only" htmlFor={`${uid}-search`}>고객센터 검색</label>
            <input
              data-field-size="search"
              className="site-field site-field-search"
              id={`${uid}-search`}
              type="search"
              enterKeyHint="search"
              placeholder="예: 메뉴판 만들기, QR, 결제"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && event.nativeEvent.isComposing) event.preventDefault();
              }}
            />
            <Button type="submit" variant="link" size="icon" className={styles.searchButton} aria-label="검색">
              <Search className="size-5" strokeWidth={2.5} aria-hidden="true" />
            </Button>
          </form>
          <p className="site-body-sm text-zinc-500">
            더 자세한 도움이 필요하신가요?
          </p>
          {supportActions}
        </div>
      </section>
      <section className={styles.content} aria-label="고객지원 안내">
        <div className="site-container">
          {submittedQuery && (
            <div className={styles.searchResultsHeader}>
              <h2 className="type-subsection-title">“{submittedQuery}” 검색 결과</h2>
              <Button type="button" variant="outline" onClick={clearSearch}>검색 해제</Button>
            </div>
          )}
          {content}
        </div>
      </section>
    </>
  );
}
