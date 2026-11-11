"use client";

import SiteSystemRules from "./SiteSystemRules";
import SitePageHeader from "@/components/layout/SitePageHeader";
import FormAndCardExamples from "./FormAndCardExamples";
import ComposedFieldExamples from "./ComposedFieldExamples";
import ListExamples from "./ListExamples";
import ShapedTabExamples from "./ShapedTabExamples";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, ChevronDown, ChevronUp, Monitor, PanelsTopLeft, Plus, Tablet } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { RefreshButton } from "@/app/components/ui/refresh-button";
import { NewWindowIndicator } from "@/app/components/ui/new-window-indicator";
import { EmptyState } from "@/app/components/ui/empty-state";
import { ChoiceGroup, ChoiceTile } from "@/app/components/ui/choice-tile";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/app/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/app/components/ui/tooltip";
import HelpTooltip from "@/components/ui/HelpTooltip";
import InfoTooltip from "@/components/ui/InfoTooltip";
import { LoadingState, ProgressBar } from "@/app/components/ui/loading-state";
import MobileNavigationExamples from "./MobileNavigationExamples";
import CatalogDesignCard from "@/components/templates/CatalogDesignCard";
import CatalogIndustryIcon from "@/components/templates/CatalogIndustryIcon";
import { catalogDesigns } from "@/lib/catalog-designs";
import DesignFoundations from "./DesignFoundations";
import WideScreenRules from "./WideScreenRules";
import SelectionControlExamples from "./SelectionControlExamples";
import ControlStateExamples from "./ControlStateExamples";
import SwitchExamples from "./SwitchExamples";
import IndicatorSurfaceExamples from "./IndicatorSurfaceExamples";
import ReferenceComponentExamples from "./ReferenceComponentExamples";
import SiteCopyRules from "./SiteCopyRules";
import ManagementTableExamples from "./ManagementTableExamples";
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
    <SitePageHeader title="디자인 시스템" descriptionPurpose="content" description="디자인 기준과 실제 사이트에 사용하는 공통 컴포넌트를 한곳에서 확인합니다."><p className="type-body-sm">스타일 확인용 예시입니다. 선택과 좋아요는 이 화면에서만 유지됩니다.</p></SitePageHeader>
    <Tabs purpose="page" defaultValue="components" className="gap-0"><TabsList size="lg" aria-label="디자인 시스템 메뉴"><TabsTrigger value="foundations">기준·토큰</TabsTrigger><TabsTrigger value="components">컴포넌트 라이브러리</TabsTrigger></TabsList><TabsContent value="foundations"><DesignFoundations /></TabsContent><TabsContent value="components"><nav className="site-filter-group mt-6" aria-label="주요 컴포넌트 바로가기"><a href="#wide-screen-components" className="site-filter">와이드 기준</a><a href="#wide-screen-components-mockups" className="site-filter">목업 크기</a><a href="#mobile-spacing" className="site-filter">모바일 간격</a><a href="#selection-hierarchy-title" className="site-filter">탭 위계</a><a href="#shaped-tabs" className="site-filter">영역형 탭</a><a href="#indicator-surface-title" className="site-filter">표시 아이콘</a><a href="#button-shape-groups" className="site-filter">버튼 묶음</a><a href="#switch-contract-title" className="site-filter">ON/OFF 스위치</a><a href="#form-controls" className="site-filter">입력 요소</a><a href="#composed-fields" className="site-filter">검색·비밀번호·날짜</a><a href="#card-patterns" className="site-filter">카드</a><a href="#list-patterns" className="site-filter">게시글 목록</a><a href="#management-tables" className="site-filter">표</a><a href="#image-carousel-examples" className="site-filter">이미지 캐러셀</a><a href="#loading-feedback" className="site-filter">로딩·진행</a><a href="#mobile-navigation" className="site-filter">모바일 메뉴</a><a href="#site-copy-rules" className="site-filter">설명·도움말</a><a href="#small-copy" className="site-filter">작은 안내·팝업</a><a href="#site-footer" className="site-filter">공통 푸터</a></nav><WideScreenRules id="wide-screen-components" /><SiteSystemRules /><SiteCopyRules /><SelectionControlExamples /><SwitchExamples /><IndicatorSurfaceExamples /><FormAndCardExamples /><ComposedFieldExamples /><ListExamples /><ManagementTableExamples /><ShapedTabExamples /><ControlStateExamples /><ReferenceComponentExamples />
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
    <Examples title="새로고침" description="목록·대시보드·기기 상태 갱신에는 공통 새로고침 아이콘 버튼을 사용합니다. 접근성 이름과 툴팁을 제공하고 진행 중에는 같은 자리에서 회전하며 중복 실행을 막습니다.">
      <div className={styles.buttonRow}><RefreshButton /><RefreshButton loading /><RefreshButton disabled /><RefreshButton label="연결 상태 새로고침" /></div>
    </Examples>
    <Examples title="새 창 링크" description="별도 작업 화면을 여는 링크는 문구 뒤에 대각선 화살표를 표시하고, 보조기기에도 새 창으로 열린다는 안내를 전달합니다.">
      <div className={styles.buttonRow}><Button variant="outline" asChild><Link href="/mypage/operations" target="_blank" rel="noopener noreferrer">매장 운영 <NewWindowIndicator /></Link></Button></div>
    </Examples>
    <Examples title="주요 화면 전환" description="베이직·다이닝·디스플레이처럼 페이지 전체 목록을 바꾸는 선택은 텍스트와 짧은 밑줄로 선택을 표시하는 주요 화면 탭을 사용합니다.">
      <Tabs purpose="page" defaultValue="basic"><TabsList size="lg" aria-label="서비스 탐색 예시">
        {choices.map(({key,label}) => <TabsTrigger key={key} value={key}>{label}</TabsTrigger>)}
      </TabsList>{choices.map(({key,description}) => <TabsContent key={key} value={key} className="type-body text-zinc-600">{description}</TabsContent>)}</Tabs>
    </Examples>
    <Examples title="업종 선택 버튼" description="업종 필터는 완전히 둥근 캡슐형으로 구분합니다. 단색 아이콘·짧은 이름과 기존 선택·포커스·비활성 상태를 유지합니다.">
      <ChoiceGroup><ChoiceTile purpose="filter" size="compact" icon={<CatalogIndustryIcon industry="cafe_bakery" />} label="카페·베이커리" selected={industry} onClick={()=>setIndustry(current=>!current)} /><ChoiceTile purpose="filter" size="compact" icon={<CatalogIndustryIcon industry="restaurant_dining" />} label="준비 중인 업종" disabled /></ChoiceGroup>
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
    <div id="loading-feedback"><Examples title="로딩·진행 표시" description="기다리는 동안 상태 문구와 시각적 표시를 함께 제공합니다. 진행률을 알 수 없는 조회에는 불확정 표시를, 실제 진행률을 아는 작업에만 퍼센트를 사용합니다.">
      <div className="site-collection site-stack-block"><LoadingState label="공지사항을 불러오는 중입니다." /><LoadingState label="계정 정보를 확인 중입니다." inline /><LoadingState label="목록을 불러오는 중입니다." indicator="bar" /><ProgressBar label="파일 업로드 진행률 예시" value={65} /><p className="type-caption">65%는 컴포넌트 확인용 예시입니다. 모션 감소 설정에서는 반복 애니메이션이 멈추고 상태 문구가 남습니다.</p></div>
    </Examples></div>
    <div id="mobile-navigation"><Examples title="모바일 전체 메뉴" description="서비스는 같은 크기의 메뉴명으로 나열하고, 고객센터의 하위 링크만 펼쳐 봅니다. 계정·역할·매장 운영·알림·만들기·로그아웃은 계정 상태에 맞춰 표시합니다."><MobileNavigationExamples /></Examples></div>
    <Examples title="말풍선 툴팁" description="기본은 왼쪽 아래에 꼬리가 있는 말풍선입니다. 실제 대상과 화면 여유에 따라 왼쪽·가운데·오른쪽과 위·아래 방향을 조절하며, 항상 보이는 안내도 같은 형태를 공유합니다.">
      <div className={styles.buttonRow}>
        <Tooltip><TooltipTrigger asChild><Button variant="outline">밝은 툴팁</Button></TooltipTrigger><TooltipContent tone="light" heading="디자인 미리보기">보기 옵션과 디자인 옵션을 바꾸며 우리 매장에 어울리는 구성을 찾아보세요.</TooltipContent></Tooltip>
        <Tooltip><TooltipTrigger asChild><Button variant="outline">어두운 툴팁</Button></TooltipTrigger><TooltipContent tone="dark" heading="디자인 미리보기">보기 옵션과 디자인 옵션을 바꾸며 우리 매장에 어울리는 구성을 찾아보세요.</TooltipContent></Tooltip>
      </div>
      <div className={styles.buttonRow}><span className="type-label">권장 브라우저</span><InfoTooltip label="권장 브라우저 안내">아티메뉴 메뉴판은 Chrome(크롬) 사용을 권장합니다. 브라우저 설정은 컴퓨터용 Chrome 기준입니다.</InfoTooltip></div>
      <p className="type-body-sm text-zinc-600">짧은 힌트는 마우스를 올리거나 키보드로 포커스하면 표시합니다. 중요한 정보나 실행 버튼은 툴팁 안에 숨기지 않습니다.</p>
      <div className={styles.buttonRow}>
        <HelpTooltip label="밝은 도움말 예시" heading="디자인 미리보기" side="top" trigger={<Button variant="outline">밝은 도움말 열기</Button>}>보기 옵션과 디자인 옵션을 바꾸며 우리 매장에 어울리는 구성을 찾아보세요.</HelpTooltip>
        <HelpTooltip label="어두운 도움말 예시" tone="dark" heading="디자인 미리보기" side="top" trigger={<Button variant="outline">어두운 도움말 열기</Button>}>보기 옵션과 디자인 옵션을 바꾸며 우리 매장에 어울리는 구성을 찾아보세요.</HelpTooltip>
        <HelpTooltip label="브랜드 도움말 예시" tone="brand" heading="먼저 체험해 보세요" side="top" trigger={<Button variant="outline">브랜드 도움말 열기</Button>}>강조가 필요한 안내에만 노란색을 사용하고, 말풍선의 형태는 동일하게 유지합니다.</HelpTooltip>
      </div>
      <p className="type-body-sm text-zinc-600">버튼으로 여는 도움말도 같은 스타일을 사용합니다. Escape·바깥 클릭으로 닫고 다시 열 수 있으며, 어두운형·브랜드형에는 닫기 버튼을 제공합니다.</p>
      <div className={styles.buttonRow}>
        {(["start", "center", "end"] as const).map((align, index) => <HelpTooltip key={align} label={`${["왼쪽", "가운데", "오른쪽"][index]} 꼬리 예시`} heading="상황에 맞는 꼬리 위치" align={align} trigger={<Button variant="outline">{["왼쪽", "가운데", "오른쪽"][index]} 꼬리</Button>}>꼬리는 안내 대상을 가리키고, 화면 가장자리에서는 위치가 자동 조정됩니다.</HelpTooltip>)}
      </div>
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
