"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, ChevronDown, ChevronUp, Coffee, Monitor, PanelsTopLeft, Plus, Tablet } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { EmptyState } from "@/app/components/ui/empty-state";
import { ChoiceGroup, ChoiceTile } from "@/app/components/ui/choice-tile";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/app/components/ui/collapsible";
import HelpTooltip from "@/components/ui/HelpTooltip";
import CatalogDesignCard from "@/components/templates/CatalogDesignCard";
import { catalogDesigns } from "@/lib/catalog-designs";
import styles from "./SiteComponentGallery.module.css";

function Examples({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <section className={styles.section}><div className={styles.heading}>
    <h2 className="type-section-title">{title}</h2><p className="type-body text-zinc-600">{description}</p>
  </div>{children}</section>;
}

export default function SiteComponentGallery() {
  const [industry, setIndustry] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const choices = [
    { key: "basic", label: "베이직", description: "한 화면에 담는 매장 메뉴", Icon: Tablet },
    { key: "dining", label: "다이닝", description: "커버와 여러 페이지로 전하는 메뉴", Icon: BookOpen },
    { key: "display", label: "디스플레이", description: "매장의 큰 화면을 위한 메뉴보드", Icon: Monitor },
  ];
  return <div className={`site-container ${styles.page}`}>
    <header className={styles.header}><h1 className="type-page-title">컴포넌트 라이브러리</h1>
      <p className="site-body">용도에 맞춰 형태와 크기를 선택하는 아티메뉴의 공통 요소입니다.</p>
      <p className="type-body-sm text-zinc-600">스타일 확인용 예시입니다. 선택과 좋아요는 이 화면에서만 유지됩니다.</p>
    </header>
    <Examples title="크기와 굵기로 구분하는 글자" description="페이지 제목부터 보조 정보까지, 같은 서체 안에서 역할과 크기를 명확하게 구분합니다.">
      <div className={styles.typeSamples}>
        <p className="type-page-title">매장의 첫인상을 만드는 메뉴판</p>
        <p className="type-section-title">매장에 어울리는 디자인을 찾아보세요</p>
        <p className="type-content-title">디자인 이름과 주요 콘텐츠 제목</p>
        <p className="site-body">소개 문장은 여유 있는 크기로, 상세 정보는 차분하게 읽힙니다.</p>
        <p className="type-body-sm text-zinc-600">보조 설명과 상태 안내는 14px를 사용합니다.</p>
      </div>
    </Examples>
    <Examples title="크기와 형태가 다른 버튼" description="일반 실행은 40px, 강조 실행은 48·56px로 나누고, 둥근형·라운드 사각형·작은 모서리를 선택합니다.">
      <div className={styles.buttonRow}>
        <Button asChild><Link href="/apply">시작하기</Link></Button>
        <Button size="lg" shape="rounded" variant="outline" asChild><Link href="/apply">디자인 살펴보기 <ArrowRight /></Link></Button>
        <Button size="xl" shape="square" variant="outline" asChild><Link href="/guides">사용 방법 보기 <ArrowRight /></Link></Button>
        <Button size="xl" shape="rounded" asChild><Link href="/apply">우리 매장 메뉴판 만들기 <ArrowRight /></Link></Button>
      </div>
      <div className={styles.buttonRow}>
        <Button variant="outline" shape="rounded" onClick={()=>setIndustry(false)}>취소</Button>
        <Button variant="secondary" shape="rounded" onClick={()=>{setIndustry(false);setFavorites([]);}}>초기화</Button>
        <Button variant="outline" shape="rounded" disabled>준비 중</Button>
      </div>
      <Button variant="outline" size="xl" shape="square" asChild><Link href="/apply">전체 디자인 보기 <ArrowRight /></Link></Button>
    </Examples>
    <Examples title="서비스 탐색 탭" description="상위 서비스는 열린 밑줄 탭으로 이동합니다. 아이콘 필터나 보기 방식 세그먼트와 구분합니다.">
      <Tabs defaultValue="basic"><TabsList variant="underline" size="lg" aria-label="서비스 탐색 예시">
        {choices.map(({key,label}) => <TabsTrigger key={key} value={key}>{label}</TabsTrigger>)}
      </TabsList>{choices.map(({key,description}) => <TabsContent key={key} value={key} className="type-body text-zinc-600">{description}</TabsContent>)}</Tabs>
    </Examples>
    <Examples title="아이콘 선택 버튼" description="업종 같은 하위 필터는 짧은 아이콘 버튼으로 선택합니다. PC·태블릿·모바일에서 같은 규격을 사용합니다.">
      <ChoiceGroup><ChoiceTile icon={<Coffee />} label="카페·베이커리" selected={industry} onClick={()=>setIndustry(current=>!current)} /><ChoiceTile icon={<BookOpen />} label="준비 중인 업종" disabled /></ChoiceGroup>
    </Examples>
    <Examples title="보기 방식 세그먼트" description="서로 대비되는 두 가지 보기 방식에는 밝은 바탕과 또렷한 선택 테두리를 사용합니다.">
      <Tabs defaultValue="designer" className={styles.segmentExample}><TabsList variant="outline" size="lg" distribution="equal" aria-label="디자인 탐색 방식">
        <TabsTrigger value="designer">디자인 템플릿</TabsTrigger><TabsTrigger value="standard">기본 템플릿</TabsTrigger>
      </TabsList><TabsContent value="designer" className="type-body text-zinc-600">완성된 스타일에 우리 매장 메뉴를 넣어 시작합니다.</TabsContent><TabsContent value="standard" className="type-body text-zinc-600">기본 레이아웃에서 색상과 서체를 직접 설정합니다.</TabsContent></Tabs>
    </Examples>
    <Examples title="밑줄 탭과 이미지 카드" description="여러 콘텐츠를 탐색할 때는 굵은 밑줄로 선택을 표시하고, 썸네일과 제목·설명·이동 액션의 크기를 구분합니다.">
      <div className="site-collection"><Tabs defaultValue="all"><TabsList variant="underline" size="lg" aria-label="템플릿 라이브러리 서비스">
        <TabsTrigger value="all">전체 디자인</TabsTrigger><TabsTrigger value="basic">베이직</TabsTrigger><TabsTrigger value="dining">다이닝</TabsTrigger>
      </TabsList>{["all","basic","dining"].map(key=><TabsContent key={key} value={key} className={styles.galleryPanel}>
        <div className={styles.mediaGrid}>{catalogDesigns.filter(d=>d.kind==="designer"&&(key==="all"||d.service===key)).slice(0,3).map(design=><CatalogDesignCard key={design.id} design={design} liked={favorites.includes(design.id)} busy={false} onToggle={id=>setFavorites(current=>current.includes(id)?current.filter(value=>value!==id):[...current,id])} />)}</div>
      </TabsContent>)}</Tabs></div>
    </Examples>
    <Examples title="상태별 건수와 빈 목록" description="상태는 밑줄과 건수로 구분하고, 빈 목록에서는 다음 행동을 안내합니다.">
      <Tabs defaultValue="전체"><TabsList variant="underline" size="lg" aria-label="메뉴판 상태 예시">
        {["전체","작성중","공개중","비공개"].map(label=><TabsTrigger key={label} value={label} count={0}>{label}</TabsTrigger>)}
      </TabsList>{["전체","작성중","공개중","비공개"].map(label=><TabsContent key={label} value={label}>
        <EmptyState icon={<PanelsTopLeft />} title={label === "전체" ? "등록된 메뉴판이 없습니다" : `${label} 메뉴판이 없습니다`} description="매장에 어울리는 디자인을 선택하고 첫 메뉴판을 만들어 보세요."
          action={<Button variant="outline" shape="rounded" asChild><Link href="/apply"><Plus />메뉴판 만들기</Link></Button>} />
      </TabsContent>)}</Tabs>
    </Examples>
    <Examples title="차분한 콘텐츠와 도움말" description="콘텐츠 묶음은 옅은 바탕으로, 추가 설명은 필요한 순간에 열리는 도움말로 구분합니다.">
      <div className="site-collection">
        <div className={styles.buttonRow}><h3 className="type-content-title">우리 매장에 맞는 디자인 선택</h3><HelpTooltip label="디자인 선택 도움말" tone="dark"><strong>디자인을 먼저 살펴보고</strong><br />우리 매장에 맞는 구성을 선택하세요.</HelpTooltip></div>
        <p className="type-body mt-3 text-zinc-600">사진과 설명을 확인한 뒤 미리보기에서 실제 메뉴판 구성을 볼 수 있습니다.</p>
      </div>
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <CollapsibleContent><p className="type-body mb-4 text-zinc-600">베이직은 한 화면 메뉴, 다이닝은 여러 페이지 메뉴, 디스플레이는 매장 화면을 위한 구성입니다.</p></CollapsibleContent>
        <CollapsibleTrigger asChild><Button variant="outline" shape="rounded" className="w-full">{expanded ? "접기" : "더보기"}{expanded ? <ChevronUp /> : <ChevronDown />}</Button></CollapsibleTrigger>
      </Collapsible>
    </Examples>
    <Examples title="카테고리 이동 버튼" description="목록의 진입점은 문구에 맞는 사각 버튼과 이동 아이콘으로 표시합니다.">
      <div className={styles.actionGrid}>{choices.map(({key,label})=><Button key={key} className={styles.action} variant="outline" shape="square" asChild><Link href={`/apply?plan=${key}`}>{label} 디자인 <Plus aria-hidden="true" /></Link></Button>)}</div>
    </Examples>
  </div>;
}
