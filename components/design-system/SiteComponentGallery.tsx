"use client";

import SiteSystemRules from "./SiteSystemRules";
import SitePageHeader from "@/components/layout/SitePageHeader";
import FormAndCardExamples from "./FormAndCardExamples";
import ListExamples from "./ListExamples";
import ShapedTabExamples from "./ShapedTabExamples";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, ChevronDown, ChevronUp, Monitor, PanelsTopLeft, Plus, Tablet } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { EmptyState } from "@/app/components/ui/empty-state";
import { ChoiceGroup, ChoiceTile } from "@/app/components/ui/choice-tile";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/app/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/app/components/ui/tooltip";
import HelpTooltip from "@/components/ui/HelpTooltip";
import CatalogDesignCard from "@/components/templates/CatalogDesignCard";
import CatalogIndustryIcon from "@/components/templates/CatalogIndustryIcon";
import { catalogDesigns } from "@/lib/catalog-designs";
import DesignFoundations from "./DesignFoundations";
import WideScreenRules from "./WideScreenRules";
import SelectionControlExamples from "./SelectionControlExamples";
import ControlStateExamples from "./ControlStateExamples";
import ReferenceComponentExamples from "./ReferenceComponentExamples";
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
    <SitePageHeader title="디자인 시스템" description="디자인 기준과 실제 사이트에 사용하는 공통 컴포넌트를 한곳에서 확인합니다."><p className="type-body-sm">스타일 확인용 예시입니다. 선택과 좋아요는 이 화면에서만 유지됩니다.</p></SitePageHeader>
    <Tabs purpose="page" defaultValue="components" className="gap-0"><TabsList size="lg" aria-label="디자인 시스템 메뉴"><TabsTrigger value="foundations">기준·토큰</TabsTrigger><TabsTrigger value="components">컴포넌트 라이브러리</TabsTrigger></TabsList><TabsContent value="foundations"><DesignFoundations /></TabsContent><TabsContent value="components"><nav className="site-filter-group mt-6" aria-label="주요 컴포넌트 바로가기"><a href="#wide-screen-components" className="site-filter">와이드 기준</a><a href="#wide-screen-components-mockups" className="site-filter">목업 크기</a><a href="#mobile-spacing" className="site-filter">모바일 간격</a><a href="#selection-hierarchy-title" className="site-filter">탭 위계</a><a href="#shaped-tabs" className="site-filter">영역형 탭</a><a href="#form-controls" className="site-filter">입력 요소</a><a href="#card-patterns" className="site-filter">카드</a><a href="#list-patterns" className="site-filter">게시글 목록</a><a href="#small-copy" className="site-filter">작은 안내·팝업</a><a href="#site-footer" className="site-filter">공통 푸터</a></nav><WideScreenRules id="wide-screen-components" /><SiteSystemRules /><SelectionControlExamples /><FormAndCardExamples /><ListExamples /><ShapedTabExamples /><ControlStateExamples /><ReferenceComponentExamples />
    <Examples title="역할로 구분하는 버튼" description="본문 실행은 40px·모서리 8px, 로그인·결제 같은 주요 완료 행동은 48px입니다. 헤더와 떠 있는 진입점만 pill을 사용합니다.">
      <div className={styles.buttonRow}>
        <Button asChild><Link href="/apply">시작하기</Link></Button>
        <Button size="lg" variant="outline" asChild><Link href="/templates">디자인 살펴보기 <ArrowRight /></Link></Button>
        <Button size="lg" variant="outline" asChild><Link href="/guides">사용 방법 보기 <ArrowRight /></Link></Button>
        <Button size="lg" asChild><Link href="/apply">우리 매장 메뉴판 만들기 <ArrowRight /></Link></Button>
      </div>
      <div className={styles.buttonRow}>
        <Button variant="outline" onClick={()=>setIndustry(false)}>취소</Button>
        <Button variant="secondary" onClick={()=>{setIndustry(false);setFavorites([]);}}>초기화</Button>
        <Button variant="outline" disabled>준비 중</Button>
      </div>
      <Button variant="outline" size="lg" asChild><Link href="/templates">전체 디자인 보기 <ArrowRight /></Link></Button>
    </Examples>
    <Examples title="주요 화면 전환" description="베이직·다이닝·디스플레이처럼 페이지 전체 목록을 바꾸는 선택은 텍스트와 짧은 밑줄로 선택을 표시하는 주요 화면 탭을 사용합니다.">
      <Tabs purpose="page" defaultValue="basic"><TabsList size="lg" aria-label="서비스 탐색 예시">
        {choices.map(({key,label}) => <TabsTrigger key={key} value={key}>{label}</TabsTrigger>)}
      </TabsList>{choices.map(({key,description}) => <TabsContent key={key} value={key} className="type-body text-zinc-600">{description}</TabsContent>)}</Tabs>
    </Examples>
    <Examples title="업종 선택 버튼" description="업종에는 카테고리를 바로 이해할 수 있는 단색 아이콘과 짧은 이름을 사용합니다.">
      <ChoiceGroup><ChoiceTile size="compact" icon={<CatalogIndustryIcon industry="cafe_bakery" />} label="카페·베이커리" selected={industry} onClick={()=>setIndustry(current=>!current)} /><ChoiceTile size="compact" icon={<CatalogIndustryIcon industry="restaurant_dining" />} label="준비 중인 업종" disabled /></ChoiceGroup>
    </Examples>
    <Examples title="영역 안의 목록 전환" description="디자인·기본 템플릿처럼 하나의 목록 영역 안에서 하위 종류를 바꿉니다. 연결형 사각 탭의 검정 선택 면으로 현재 영역을 표시합니다.">
      <Tabs purpose="section" defaultValue="designer"><TabsList size="sm" aria-label="영역 내부 템플릿 탭 예시">
        <TabsTrigger value="designer">디자인 템플릿</TabsTrigger><TabsTrigger value="standard">기본 템플릿</TabsTrigger>
      </TabsList><TabsContent value="designer"><p className="type-item-title">완성된 디자인으로 시작</p><p className="type-body-sm mt-2 text-zinc-600">매장에 어울리는 스타일을 고르고 메뉴를 넣어 보세요.</p></TabsContent>
      <TabsContent value="standard"><p className="type-item-title">직접 꾸미는 기본 레이아웃</p><p className="type-body-sm mt-2 text-zinc-600">색상과 서체를 매장에 맞게 직접 설정해 보세요.</p></TabsContent></Tabs>
    </Examples>
    <Examples title="보기 방식 세그먼트" description="서로 대비되는 두 가지 보기 방식에는 밝은 바탕과 또렷한 선택 테두리를 사용합니다.">
      <Tabs purpose="state" defaultValue="designer" className={styles.segmentExample}><TabsList size="md" distribution="equal" aria-label="콘텐츠 보기 방식 예시">
        <TabsTrigger value="designer">이미지로 보기</TabsTrigger><TabsTrigger value="standard">목록으로 보기</TabsTrigger>
      </TabsList><TabsContent value="designer" className="type-body text-zinc-600">썸네일을 중심으로 디자인을 살펴봅니다.</TabsContent><TabsContent value="standard" className="type-body text-zinc-600">이름과 설명을 중심으로 디자인을 살펴봅니다.</TabsContent></Tabs>
    </Examples>
    <Examples title="최상위 보기와 이미지 카드" description="서비스 단위로 전체 목록이 바뀌면 텍스트와 짧은 밑줄로 선택을 표시하는 주요 화면 탭을 사용하고, 썸네일과 제목·설명·이동 액션의 크기를 구분합니다.">
      <div className="site-collection"><Tabs purpose="page" defaultValue="all"><TabsList size="md" aria-label="템플릿 라이브러리 서비스">
        <TabsTrigger value="all">전체 디자인</TabsTrigger><TabsTrigger value="basic">베이직</TabsTrigger><TabsTrigger value="dining">다이닝</TabsTrigger>
      </TabsList>{["all","basic","dining"].map(key=><TabsContent key={key} value={key} className={styles.galleryPanel}>
        <div className={styles.mediaGrid}>{catalogDesigns.filter(d=>d.kind==="designer"&&(key==="all"||d.service===key)).slice(0,3).map(design=><CatalogDesignCard key={design.id} design={design} liked={favorites.includes(design.id)} busy={false} onToggle={id=>setFavorites(current=>current.includes(id)?current.filter(value=>value!==id):[...current,id])} />)}</div>
      </TabsContent>)}</Tabs></div>
    </Examples>
    <Examples title="상태별 건수와 빈 목록" description="상태는 회색 레일 안의 둥근 세그먼트와 건수로 구분하고, 빈 목록에서는 다음 행동을 안내합니다.">
      <Tabs purpose="state" defaultValue="전체"><TabsList size="md" aria-label="메뉴판 상태 예시">
        {["전체","작성중","공개중","비공개"].map(label=><TabsTrigger key={label} value={label} count={0}>{label}</TabsTrigger>)}
      </TabsList>{["전체","작성중","공개중","비공개"].map(label=><TabsContent key={label} value={label}>
        <EmptyState icon={<PanelsTopLeft />} title={label === "전체" ? "등록된 메뉴판이 없습니다" : `${label} 메뉴판이 없습니다`} description="매장에 어울리는 디자인을 선택하고 첫 메뉴판을 만들어 보세요."
          action={<Button variant="outline" asChild><Link href="/apply"><Plus />메뉴판 만들기</Link></Button>} />
      </TabsContent>)}</Tabs>
    </Examples>
    <Examples title="말풍선 툴팁" description="넉넉한 둥근 모서리와 부드러운 꼬리를 공유합니다. 제목은 진하게, 본문은 차분하게 구분하며 밝은형과 어두운형을 제공합니다.">
      <div className={styles.buttonRow}>
        <Tooltip><TooltipTrigger asChild><Button variant="outline">밝은 툴팁</Button></TooltipTrigger><TooltipContent tone="light" heading="디자인 미리보기">보기 옵션과 디자인 옵션을 바꾸며 우리 매장에 어울리는 구성을 찾아보세요.</TooltipContent></Tooltip>
        <Tooltip><TooltipTrigger asChild><Button variant="outline">어두운 툴팁</Button></TooltipTrigger><TooltipContent tone="dark" heading="디자인 미리보기">보기 옵션과 디자인 옵션을 바꾸며 우리 매장에 어울리는 구성을 찾아보세요.</TooltipContent></Tooltip>
      </div>
      <p className="type-body-sm text-zinc-600">짧은 힌트는 마우스를 올리거나 키보드로 포커스하면 표시합니다. 중요한 정보나 실행 버튼은 툴팁 안에 숨기지 않습니다.</p>
      <div className={styles.buttonRow}>
        <HelpTooltip label="밝은 도움말 예시" heading="디자인 미리보기" side="top" trigger={<Button variant="outline">밝은 도움말 열기</Button>}>보기 옵션과 디자인 옵션을 바꾸며 우리 매장에 어울리는 구성을 찾아보세요.</HelpTooltip>
        <HelpTooltip label="어두운 도움말 예시" tone="dark" heading="디자인 미리보기" side="top" trigger={<Button variant="outline">어두운 도움말 열기</Button>}>보기 옵션과 디자인 옵션을 바꾸며 우리 매장에 어울리는 구성을 찾아보세요.</HelpTooltip>
        <HelpTooltip label="브랜드 도움말 예시" tone="brand" heading="먼저 체험해 보세요" side="top" trigger={<Button variant="outline">브랜드 도움말 열기</Button>}>강조가 필요한 안내에만 노란색을 사용하고, 말풍선의 형태는 동일하게 유지합니다.</HelpTooltip>
      </div>
      <p className="type-body-sm text-zinc-600">버튼으로 여는 도움말도 같은 스타일을 사용합니다. Escape·바깥 클릭으로 닫고 다시 열 수 있으며, 어두운형·브랜드형에는 닫기 버튼을 제공합니다.</p>
    </Examples>
    <Examples title="차분한 콘텐츠와 도움말" description="콘텐츠 묶음은 옅은 바탕으로, 추가 설명은 필요한 순간에 열리는 도움말로 구분합니다.">
      <div className="site-collection">
        <div className={styles.buttonRow}><h3 className="type-content-title">우리 매장에 맞는 디자인 선택</h3><HelpTooltip label="디자인 선택 도움말" tone="dark" heading="디자인을 먼저 살펴보세요">미리보기에서 우리 매장에 맞는 구성을 선택할 수 있습니다.</HelpTooltip></div>
        <p className="type-body mt-3 text-zinc-600">사진과 설명을 확인한 뒤 미리보기에서 실제 메뉴판 구성을 볼 수 있습니다.</p>
      </div>
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <CollapsibleContent><p className="type-body mb-4 text-zinc-600">베이직은 한 화면 메뉴, 다이닝은 여러 페이지 메뉴, 디스플레이는 매장 화면을 위한 구성입니다.</p></CollapsibleContent>
        <CollapsibleTrigger asChild><Button variant="outline" className="w-full">{expanded ? "접기" : "더보기"}{expanded ? <ChevronUp /> : <ChevronDown />}</Button></CollapsibleTrigger>
      </Collapsible>
    </Examples>
    <Examples title="카테고리 이동 버튼" description="목록의 진입점은 문구에 맞는 사각 버튼과 이동 아이콘으로 표시합니다.">
      <div className={styles.actionGrid}>{choices.map(({key,label})=><Button key={key} className={styles.action} variant="outline" asChild><Link href={`/templates?plan=${key}`}>{label} 디자인 <Plus aria-hidden="true" /></Link></Button>)}</div>
    </Examples>
    </TabsContent></Tabs>
  </div>;
}
