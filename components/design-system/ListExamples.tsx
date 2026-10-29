"use client";

import Link from "next/link";
import { useState } from "react";
import { ArticleNavigation, ContentList, ContentListItem } from "@/app/components/ui/content-list";
import { SitePagination } from "@/app/components/ui/site-pagination";
import { Button } from "@/app/components/ui/button";
import styles from "./SiteComponentGallery.module.css";

export default function ListExamples() {
  const [page, setPage] = useState(1);
  return <>
    <section className={styles.section}>
      <div className={styles.heading}><h2 className="type-section-title">위치와 용도로 구분하는 버튼 모서리</h2><p className="type-body text-zinc-600">헤더의 주요 진입 버튼은 pill, 본문과 폼의 실행은 8px 사각형입니다. 원형은 페이지 번호·작은 아이콘에 사용하며 고객지원은 20px 모서리의 전용 형태를 유지합니다.</p></div>
      <div className={styles.buttonRow}><Button className="site-button-header" shape="pill" asChild><Link href="/apply">헤더 · 만들기</Link></Button><Button asChild><Link href="/guides">본문 · 가이드 보기</Link></Button><Button variant="outline">폼 · 취소</Button></div>
    </section>
    <section className={styles.section}>
      <div className={styles.heading}><h2 id="list-patterns" className="type-section-title">게시글 목록과 페이지 번호</h2><p className="type-body text-zinc-600">상하 구분선과 일정한 정렬로 제목·유형·날짜를 구분합니다. 좁은 화면에서는 제목을 다음 줄로 옮기며, 선택한 페이지는 옅은 원형 배경으로 표시합니다.</p></div>
      <ContentList label="게시글 목록 예시"><ContentListItem href="/faq/notices" label="서비스 안내" title="아티메뉴를 처음 사용하는 사장님을 위한 안내" date="2026. 10. 26." dateTime="2026-10-26" /><ContentListItem href="/faq/notices" label="업데이트" title="매장에 맞는 메뉴판 디자인을 더 쉽게 찾는 방법" date="2026. 10. 23." dateTime="2026-10-23" /></ContentList>
      <SitePagination currentPage={page} totalPages={10} onSelect={setPage} label="게시글 페이지 예시" />
      <p className="type-body-sm text-zinc-600" role="status">현재 {page}페이지 · 예시에서는 페이지 선택만 변경됩니다.</p>
    </section>
    <section className={styles.section}>
      <div className={styles.heading}><h2 className="type-section-title">이전글·다음글과 목록으로 돌아가기</h2><p className="type-body text-zinc-600">상세 본문 아래에서 인접 글로 이동합니다. 없는 글은 클릭할 수 없는 안내로 표시하며, 목록 복귀는 본문용 사각 버튼을 사용합니다.</p></div>
      <ArticleNavigation previous={{href:"/faq/notices",title:"처음 시작하는 메뉴판 만들기 안내",date:"2026. 10. 23.",dateTime:"2026-10-23"}} next={{href:"/faq/notices",title:"새로운 디자인과 기능을 확인해 보세요",date:"2026. 10. 26.",dateTime:"2026-10-26"}} />
      <div className="site-list-return"><Button size="lg" asChild><Link href="/faq/notices">공지사항 목록으로</Link></Button></div>
    </section>
  </>;
}
