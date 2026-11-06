"use client";

import { useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { Bell, Check, CreditCard, Globe, LayoutGrid, Search, Share2, ShoppingBag } from "lucide-react";
import { FloorPlanDesktopNoticeDialog } from "@/components/mypage/floor-plan/FloorPlanDesktopNotice";
import { Button } from "@/app/components/ui/button";
import { Switch } from "@/app/components/ui/switch";
import { OverviewCard, OverviewCardResponsiveLabel, OverviewCardGroup } from "@/app/components/ui/overview-card";
import { MetricCard, FilterPanel, RecordCard, KeyValueList, AnnouncementBar } from "@/app/components/ui/data-display";
import { NOTIFICATION_COMPACT_NOTICE } from "@/lib/notification-display-policy";
import { NotificationPanel } from "@/app/components/ui/notification-panel";
import { ShareDialog } from "@/app/components/ui/share-dialog";
import { ActivityOverview } from "@/app/components/ui/activity-overview";
import SupportHome from "@/app/support/chat/SupportHome";
import { AI_SUPPORT_CHAT_OPEN_EVENT } from "@/lib/ai-support-chat-launcher";
import ProductOfferCard from "@/components/marketing/ProductOfferCard";
import { publicBasicProducts } from "@/lib/public-product-details";
import { Badge } from "@/app/components/ui/badge";
import OperationsHistoryExample from "./OperationsHistoryExample";
import { OrderPointSelectionDetails, type ManagedOrderPoint } from "@/components/mypage/OrderPointControls";
import { DEFAULT_ORDER_POINT_POLICY } from "@/lib/order-point-policy";
import FloorPlanEditor from "@/components/mypage/floor-plan/FloorPlanEditor";
import styles from "./SiteComponentGallery.module.css";

function Example({title,description,children}:{title:string;description:string;children:ReactNode}) {
  return <section className={styles.section}><div className={styles.heading}><h2 className="type-section-title">{title}</h2><p className="type-body text-zinc-600">{description}</p></div>{children}</section>;
}
const notices=[{id:"sample-1",title:"메뉴판 공개 설정을 확인해 주세요",message:"디자인과 메뉴를 확인한 뒤 공개할 수 있습니다.",createdAt:"2026-10-26T02:00:00Z",unread:true,href:"/design-system"},{id:"sample-2",title:"이용 내역을 한곳에서 확인하세요",message:"마이페이지에서 구독과 메뉴판 이용 내역을 확인할 수 있습니다.",createdAt:"2026-10-25T02:00:00Z",unread:false,href:"/design-system"}];
export default function ReferenceComponentExamples() {
  const [examplePoints, setExamplePoints] = useState<ManagedOrderPoint[]>([{id: "33333333-3333-4333-8333-333333333333", label: "테이블 1", kind: "table", status: "active", policy: DEFAULT_ORDER_POINT_POLICY, policyAvailable: true}, {id: "44444444-4444-4444-8444-444444444444", label: "키오스크 1", kind: "kiosk", status: "active", policy: {...DEFAULT_ORDER_POINT_POLICY, terminalCallEnabled: false}, policyAvailable: true}, {id: "55555555-5555-4555-8555-555555555555", label: "테이블 2", kind: "table", status: "disabled", policy: DEFAULT_ORDER_POINT_POLICY, policyAvailable: true}]);
  const [desktopNoticeOpen, setDesktopNoticeOpen] = useState(false);
  const desktopNoticeRef = useRef<HTMLButtonElement>(null);
  const [exampleOrdersEnabled, setExampleOrdersEnabled] = useState(false);
  const [read,setRead]=useState<string[]>([]);
  const [query,setQuery]=useState("");
  const [status,setStatus]=useState("all");
  const [applied,setApplied]=useState({query:"",status:"all"});
  const [details,setDetails]=useState(false);
  const [sort,setSort]=useState("recent");
  const [onlyUnread,setOnlyUnread]=useState(false);
  const visible=(applied.status==="all"||applied.status==="draft") && "아티메뉴 카페".includes(applied.query.trim());
  return <>
    <Example title="룸 배치도 편집" description="룸 선택·룸 추가는 위에 유지하고, 배치 도구·캔버스·하단 룸 이동과 변경 취소/저장을 하나의 공통 작업 영역으로 묶습니다. 사각형 안 X는 배치만 해제하고 등록 정보는 유지합니다. 탭 문구 옆 연필·추가 아이콘은 공통16px이며 연필의40px 클릭 영역은 유지합니다. 룸 삭제는 룸 탭 아래의 보조 행동이며 공통 확인 팝업을 거칩니다. 선택 박스와 바로 배치 버튼은 높이 중심을 맞춥니다. 배치 현황은 공통 콘텐츠 제목으로 표시하고 옆의 느낌표 안내 아이콘을 클릭하거나 마우스를 올리면 공통 말풍선이 열립니다. 드래그와 모서리 크기 조절, 방향키 이동을 제공합니다. 선택한 항목의 주문·호출 허용과 기기 연결 정보는 리스트형과 같은 공통 컨트롤을 씁니다. 중복된 테이블 사용 스위치 없이 주문·호출 설정과 보관으로 역할을 나눕니다. 아래 예시의 보관·운영 재개·저장은 현재 화면에만 적용되며 실제 매장 데이터는 변경하지 않습니다.">
      <FloorPlanEditor initial={{available: true, revision: 0, document: {rooms: [{id: "11111111-1111-4111-8111-111111111111", name: "홀 예시", aspectRatio: 1.78}, {id: "22222222-2222-4222-8222-222222222222", name: "테라스 예시", aspectRatio: 1.33}], placements: [{pointId: "33333333-3333-4333-8333-333333333333", roomId: "11111111-1111-4111-8111-111111111111", x: 8, y: 20, width: 22, height: 30}, {pointId: "44444444-4444-4444-8444-444444444444", roomId: "11111111-1111-4111-8111-111111111111", x: 40, y: 20, width: 22, height: 30}]}}} points={examplePoints} renderSelectedPoint={(point, pending) => <OrderPointSelectionDetails key={point.id} menuSiteId="example" point={examplePoints.find(item => item.id === point.id)!} disabled={pending} connectionState={{available: true, connections: []}} action={async data => { const id = data.get("tableId"); if (data.get("intent") === "archive") setExamplePoints(current => current.filter(item => item.id !== id)); else if (data.get("intent") === "resume") setExamplePoints(current => current.map(item => item.id === id ? {...item, status: "active", policy: {terminalOrderEnabled: false, terminalCallEnabled: false, customerOrderEnabled: false, customerCallEnabled: false}} : item)); }} />} onSave={async (revision, document) => ({status: "success", revision: revision + 1, document})} />
    </Example>
    <Example title="모바일 첫 진입 안내" description="테이블·키오스크 관리에 모바일로 처음 들어오면 탭 세션당 한 번 PC 편집 권장 안내를 표시합니다. 모바일 이용은 제한하지 않습니다. 아래는 같은 안내 Dialog의 동작 예시입니다."><Button ref={desktopNoticeRef} variant="outline" onClick={() => setDesktopNoticeOpen(true)}>모바일 진입 안내 보기</Button><FloorPlanDesktopNoticeDialog open={desktopNoticeOpen} onOpenChange={setDesktopNoticeOpen} returnFocusRef={desktopNoticeRef} /></Example>
    <Example title="운영 내역의 리스트·배치도" description="배치도형을 왼쪽에 두고 같은 룸 배치·관리 표를 사용합니다. 룸 탭과 캔버스 사이의 중첩 박스를 없애고 사각형 선택으로 상품·옵션·수량·시간·상태를 확인합니다. 아래는 읽기 전용 예시입니다."><OperationsHistoryExample /></Example>
    <Example title="고객지원 홈" description="도움이 필요할 때 문의 방법부터 고릅니다. AI 실시간 문의·1:1 문의·FAQ 아래에 서비스 가이드와 기존 FAQ를 표시합니다."><div className={styles.supportExample}><h3 className="type-content-title px-5 pt-5">도움이 필요하신가요?</h3><SupportHome enabled={false} onChat={() => window.dispatchEvent(new Event(AI_SUPPORT_CHAT_OPEN_EVENT))} /></div></Example>
    <Example title="알림 패널" description="분류 탭·목록 하단 중앙에 떠 있는 모두 읽기·날짜별 목록·읽지 않은 표시·하단 전체보기를 한 구조로 묶습니다. 표시는 최근 90일 기준이며, 완료된 알림 본문은 별도 1년 보관 정책을 따릅니다. 아래 알림은 동작 확인용 예시입니다."><div className={styles.notificationExample}><NotificationPanel compact items={notices.map(item=>({...item,unread:item.unread&&!read.includes(item.id)}))} onActivate={item=>setRead(current=>[...current,item.id])} onReadAll={()=>setRead(notices.map(item=>item.id))} footer={<><p className="site-notification-limit">{NOTIFICATION_COMPACT_NOTICE}</p><Link href="/mypage?tab=notifications">전체 알림 보기</Link></>} /></div></Example>
    <Example title="운영 대시보드 요약 카드" description="소제목 옆에 의미를 나타내는 작은 아이콘을 표시하고 흰색 ContentPanel의 시작선에 값과 설명을 정렬합니다. 공개 설정은 편집 링크로, 주문·호출 및 테이블·키오스크 안내는 클릭·호버 도움말로 제공합니다. 매출 요약은 매출관리 상단에서 같은 카드를 사용합니다. 상태 변경은 우측 상단, 이동은 하단 구분선 아래에 둡니다. 모바일·태블릿 2열·넓은 PC 4열로 표시합니다.">
      <OverviewCardGroup label="운영 요약 카드 예시">
        <OverviewCard label="메뉴판 공개 상태" icon={<Globe />} value="공개 중" detail="손님이 메뉴판을 볼 수 있습니다." footer={<Button variant="outline" asChild><Link href="/design-system" aria-label="메뉴판 공개 설정"><OverviewCardResponsiveLabel compact="공개 설정">메뉴판 공개 설정</OverviewCardResponsiveLabel></Link></Button>} />
        <OverviewCard label="테이블·키오스크 등록" icon={<LayoutGrid />} value="등록 2개" detail={<><span className="block">테이블 1개</span><span className="block">키오스크 1개</span></>} help="주문·호출 기능을 사용할 때만 등록해 주세요. 메뉴판만 보여주는 경우에는 등록하지 않아도 됩니다." footer={<Button variant="outline" asChild><Link href="/design-system" aria-label="테이블·키오스크 관리"><OverviewCardResponsiveLabel compact="등록 관리">테이블·키오스크 관리</OverviewCardResponsiveLabel></Link></Button>} />
        <OverviewCard label="전체 주문 상태" icon={<ShoppingBag />} value={<OverviewCardResponsiveLabel compact={exampleOrdersEnabled ? "접수 중" : "미사용"}>{exampleOrdersEnabled ? "주문 접수 중" : "주문 미사용"}</OverviewCardResponsiveLabel>} help="전체 스위치를 켜면 주문 접수를 시작합니다. 동작 확인용 예시이며 실제 설정은 저장하지 않습니다." control={<Switch checked={exampleOrdersEnabled} onCheckedChange={setExampleOrdersEnabled} aria-label="예시 전체 주문 기능 사용" />} footer={<Button variant="outline" asChild><Link href="/design-system">주문 설정</Link></Button>} />
        <OverviewCard label="전체 호출 상태" icon={<Bell />} value="호출 미사용" help="사용 중인 테이블 또는 키오스크를 준비한 뒤 호출을 켤 수 있습니다." footer={<Button variant="outline" asChild><Link href="/design-system">호출 설정</Link></Button>} />
      </OverviewCardGroup>
    </Example>
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
