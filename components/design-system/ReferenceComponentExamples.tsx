"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Bell, Check, CreditCard, LayoutGrid, Search, Share2, ShoppingBag } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { MetricCard, FilterPanel, RecordCard, KeyValueList, AnnouncementBar } from "@/app/components/ui/data-display";
import { NotificationPanel } from "@/app/components/ui/notification-panel";
import { ShareDialog } from "@/app/components/ui/share-dialog";
import { ActivityOverview } from "@/app/components/ui/activity-overview";
import SupportHome from "@/app/support/chat/SupportHome";
import { AI_SUPPORT_CHAT_OPEN_EVENT } from "@/lib/ai-support-chat-launcher";
import ProductOfferCard from "@/components/marketing/ProductOfferCard";
import { publicBasicProducts } from "@/lib/public-product-details";
import { Badge } from "@/app/components/ui/badge";
import styles from "./SiteComponentGallery.module.css";

function Example({title,description,children}:{title:string;description:string;children:ReactNode}) {
  return <section className={styles.section}><div className={styles.heading}><h2 className="type-section-title">{title}</h2><p className="type-body text-zinc-600">{description}</p></div>{children}</section>;
}
const notices=[{id:"sample-1",title:"메뉴판 공개 설정을 확인해 주세요",message:"디자인과 메뉴를 확인한 뒤 공개할 수 있습니다.",createdAt:"2026-10-26T02:00:00Z",unread:true,href:"/design-system"},{id:"sample-2",title:"이용 내역을 한곳에서 확인하세요",message:"마이페이지에서 구독과 메뉴판 이용 내역을 확인할 수 있습니다.",createdAt:"2026-10-25T02:00:00Z",unread:false,href:"/design-system"}];
export default function ReferenceComponentExamples() {
  const [read,setRead]=useState<string[]>([]);
  const [query,setQuery]=useState("");
  const [status,setStatus]=useState("all");
  const [applied,setApplied]=useState({query:"",status:"all"});
  const [details,setDetails]=useState(false);
  const [sort,setSort]=useState("recent");
  const [onlyUnread,setOnlyUnread]=useState(false);
  const visible=(applied.status==="all"||applied.status==="draft") && "아티메뉴 카페".includes(applied.query.trim());
  return <>
    <Example title="고객지원 홈" description="도움이 필요할 때 문의 방법부터 고릅니다. AI 실시간 문의·1:1 문의·FAQ 아래에 서비스 가이드와 기존 FAQ를 표시합니다."><div className={styles.supportExample}><h3 className="type-content-title px-5 pt-5">도움이 필요하신가요?</h3><SupportHome enabled={false} onChat={() => window.dispatchEvent(new Event(AI_SUPPORT_CHAT_OPEN_EVENT))} /></div></Example>
    <Example title="알림 패널" description="분류 탭·날짜별 목록·읽지 않은 표시·하단 전체보기를 한 구조로 묶습니다. 아래 알림은 동작 확인용 예시입니다."><div className={styles.notificationExample}><NotificationPanel compact items={notices.map(item=>({...item,unread:item.unread&&!read.includes(item.id)}))} onActivate={item=>setRead(current=>[...current,item.id])} footer={<Link href="/mypage?tab=notifications">전체 알림 보기</Link>} /></div></Example>
    <Example title="현황 카드와 요약 목록" description="회색 작업 영역 안에서 흰 카드를 사용합니다. 라벨보다 숫자를 강조하고, 아이콘에만 작은 색상 포인트를 줍니다. 아래 수치는 예시입니다."><div className="site-dashboard"><AnnouncementBar label="안내">현황 카드에서 필요한 운영 화면으로 이동할 수 있습니다.</AnnouncementBar><div className="site-metric-grid mt-4"><MetricCard label="진행 중 주문" value="2건" detail="예시 데이터" icon={<ShoppingBag />} tone="blue" /><MetricCard label="대기 중 호출" value="0건" icon={<Bell />} tone="brand" /><MetricCard label="운영 테이블" value="12개" icon={<LayoutGrid />} tone="green" /><div className="site-card-surface p-5"><h3 className="type-label">이용 현황</h3><KeyValueList items={[{label:"공개 메뉴판",value:"1개"},{label:"작성 중",value:"1개"},{label:"결제 내역",value:"3건"}]} /></div></div></div></Example>
    <Example title="검색 필터와 상세 카드" description="조건 입력과 내역을 분리하고, 상세 정보·보조 안내·행동 버튼을 순서대로 배치합니다. 조회와 상세보기는 이 화면의 예시에만 적용됩니다.">
      <form onSubmit={event=>{event.preventDefault();setApplied({query,status});}}><FilterPanel footer={<><fieldset className={styles.buttonRow}><legend className="sr-only">정렬</legend>{[{value:"recent",label:"최신순"},{value:"name",label:"이름순"}].map(item=><label key={item.value} className="type-body-sm inline-flex items-center gap-2"><input type="radio" name="sample-sort" value={item.value} checked={sort===item.value} onChange={()=>setSort(item.value)} />{item.label}</label>)}</fieldset><label className="type-body-sm inline-flex items-center gap-2"><input type="checkbox" checked={onlyUnread} onChange={event=>setOnlyUnread(event.target.checked)} />미확인 항목만</label></>}><div className={styles.filterExample}><label><span className="type-label mb-2 block">상태</span><select value={status} onChange={event=>setStatus(event.target.value)} className="site-field w-full"><option value="all">전체 상태</option><option value="draft">작성 중</option><option value="published">공개 중</option></select></label><label><span className="type-label mb-2 block">메뉴판명</span><span className="relative block"><Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" aria-hidden="true" /><input value={query} onChange={event=>setQuery(event.target.value)} type="search" className="site-field site-field-leading w-full" placeholder="아티메뉴 카페" /></span></label><Button type="submit">조회</Button></div></FilterPanel></form>
      {visible ? <RecordCard aside={<><span className={styles.sampleAvatar} aria-hidden="true">☕</span><p className="type-label">아티메뉴 카페</p><p className="type-caption text-zinc-600">매장 정보 예시</p></>} actions={<><span className="type-body-sm mr-auto text-zinc-600">메뉴판을 확인한 뒤 공개해 주세요.</span><Button variant="outline" onClick={()=>setDetails(value=>!value)} aria-expanded={details}>{details?"상세 접기":"상세 보기"}</Button><Button asChild><Link href="/templates">디자인 살펴보기</Link></Button></>}><div className={styles.recordHeading}><div><Badge tone="draft">작성중</Badge><h3 className="type-content-title mt-3">아티메뉴 카페 메뉴판</h3><p className="type-body-sm mt-2 text-zinc-600">베이직 · 기본 디자인 · {onlyUnread?"미확인 항목":"전체 항목"} · {sort==="recent"?"최신순":"이름순"}</p></div><CreditCard aria-hidden="true" className="text-zinc-400" /></div>{details?<KeyValueList items={[{label:"메뉴판 상태",value:"작성 중"},{label:"디자인",value:"기본 디자인"},{label:"공개 전 확인",value:<Check size={18} aria-label="확인" />}]} />:null}</RecordCard> : <p role="status" className="site-collection type-body-sm">조건에 맞는 예시가 없습니다. 상태를 전체로 바꾸거나 검색어를 지워 주세요.</p>}
    </Example>
    <Example title="날짜 선택·그래프·진행률" description="날짜와 막대를 누르면 선택한 날짜의 수치를 확인합니다. 운영 매출 화면에서는 실제 데이터로 연결되며, 아래는 7일간의 예시입니다."><div className="site-dashboard"><ActivityOverview label="2026년 10월" days={[0,1,2,3,4,5,6].map((i)=>({date:`2026-10-${20+i}`,orderCount:10+i,paidOrderCount:8+i,collectedAmount:[52000,45000,82000,64000,72000,120000,98000][i]}))} /></div></Example>
    <Example title="공유 모달" description="큰 원형 아이콘과 짧은 이름으로 공유 방법을 선택합니다. 링크 복사는 항상 제공하며, 기기 공유는 해당 브라우저에서 지원할 때 표시합니다."><ShareDialog title="아티메뉴 디자인 템플릿" url="https://tablescene-menu-site2.vercel.app/templates" trigger={<Button variant="outline"><Share2 />공유하기</Button>} /></Example>
    <Example title="탭형 요금 선택 카드" description="테두리 안에서 선택 옵션과 가격·제공 범위·보조 행동·주요 행동을 연결합니다. 가격과 링크는 실제 요금제와 같은 데이터를 사용합니다."><div className={styles.offerExample}><ProductOfferCard product={publicBasicProducts[0]} /></div></Example>
  </>;
}
