"use client";

import { useState } from "react";
import { Heart, Share2 } from "@/app/components/ui/site-icon";
import { ArrowUp } from "@/app/components/ui/site-arrow";
import { Button } from "@/app/components/ui/button";
import { ContentPanel } from "@/app/components/ui/content-panel";
import { SitePagination } from "@/app/components/ui/site-pagination";

export default function IconControlExamples() {
  const [liked, setLiked] = useState(false);
  const [page, setPage] = useState(2);
  return <div id="icon-control-rules" className="site-stack-block">
    <div className="site-stack-title"><h3 className="type-content-title">아이콘 버튼 공통 원칙</h3>
      <ol className="type-body-sm site-copy-muted"><li>불필요한 장식은 생략합니다.</li><li>흰색 채움의 경계가 불분명할 때만 테두리를 사용합니다.</li><li>표현과 클릭 영역·중앙 정렬은 분리합니다.</li></ol>
    </div>
    <div className="site-detail-grid">
      <ContentPanel aria-label="무배경 아이콘 예시"><h4 className="type-label">bare · 콘텐츠 옆 보조 행동</h4><div className="site-action-row">
        <Button variant="ghost" size="icon" aria-label="좋아요 예시" aria-pressed={liked} onClick={() => setLiked(value => !value)}><Heart aria-hidden="true" fill={liked ? "currentColor" : "none"} /></Button>
        <Button variant="ghost" size="icon" aria-label="공유 예시"><Share2 aria-hidden="true" /></Button>
        <Button variant="ghost" size="icon" disabled aria-label="공유 비활성 예시"><Share2 aria-hidden="true" /></Button>
      </div><p className="type-caption site-copy-muted">배경 없이도 일반40px·밀집32px 클릭 영역과 키보드 포커스를 유지합니다.</p></ContentPanel>
      <ContentPanel surface="muted" aria-label="형태가 필요한 아이콘 예시"><h4 className="type-label">framed · 독립된 조작</h4><div className="site-action-row">
        <Button variant="secondary" size="icon" iconAppearance="framed" className="site-scroll-top-control" aria-label="맨 위로 이동 예시"><ArrowUp aria-hidden="true" /></Button>
        <Button variant="secondary" size="icon" iconAppearance="framed" className="site-scroll-top-control" data-ui-state="hover" aria-label="맨 위로 hover 예시"><ArrowUp aria-hidden="true" /></Button>
        <Button variant="secondary" size="icon" iconAppearance="framed" className="site-scroll-top-control" disabled aria-label="맨 위로 비활성 예시"><ArrowUp aria-hidden="true" /></Button>
      </div><p className="type-caption site-copy-muted">회색·유색 채움은 테두리 없이 구분합니다. 흰색 채움은 주변과 구분이 어려울 때만 테두리를 사용합니다.</p></ContentPanel>
    </div>
    <ContentPanel aria-label="페이지네이션 아이콘 예시"><h4 className="type-label">같은 행의 크기·정렬 유지</h4><SitePagination currentPage={page} totalPages={8} onSelect={setPage} label="아이콘 규칙 페이지 예시" /></ContentPanel>
  </div>;
}
