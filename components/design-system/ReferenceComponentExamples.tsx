"use client";

import {emptyFloorDocument,resolveFloorRoomRemoval,type FloorDocument} from "@/lib/menu-floor-plan";
import OrderManagementExample from "./OrderManagementExample";
import OrderPointSaveExample from "./OrderPointSaveExample";
import type { OrderPointConnectRequest, OrderPointConnectionState } from "@/lib/order-point-connection";
import { useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { Bell, Check, CreditCard, Globe, LayoutGrid, Share2, ShoppingBag } from "lucide-react";
import { FloorPlanDesktopNoticeDialog } from "@/components/mypage/floor-plan/FloorPlanDesktopNotice";
import { Button } from "@/app/components/ui/button";
import { SearchField } from "@/app/components/ui/search-field";
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
import { OrderPointSelectionDetails, OrderPointArchiveControl, type ManagedOrderPoint } from "@/components/mypage/OrderPointControls";
import OrderPointConnectionDialog from "@/components/mypage/OrderPointConnectionDialog";
import { readTerminalDeviceInfo } from "@/lib/terminal-device-info";
import { DEFAULT_ORDER_POINT_POLICY, orderPointPolicyKey, type OrderPointFeatureUpdate } from "@/lib/order-point-policy";
import OrderPointRestoreForm from "@/components/mypage/OrderPointRestoreForm";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/app/components/ui/tabs";
import { InlineNameEditor } from "@/app/components/ui/inline-name-editor";
import OrderPointRegistrationForm from "@/components/mypage/OrderPointRegistrationForm";
import FloorPlanEditor from "@/components/mypage/floor-plan/FloorPlanEditor";
import { ImageCarousel } from "@/app/components/ui/image-carousel";
import { getCatalogDesign } from "@/lib/catalog-designs";
import styles from "./SiteComponentGallery.module.css";

function Example({title,description,children}:{title:string;description:string;children:ReactNode}) {
  return <section className={styles.section}><div className={styles.heading}><h2 className="type-section-title">{title}</h2><p className="type-body text-zinc-600">{description}</p></div>{children}</section>;
}
const notices=[{id:"sample-1",title:"메뉴판 공개 설정을 확인해 주세요",message:"디자인과 메뉴를 확인한 뒤 공개할 수 있습니다.",createdAt:"2026-10-26T02:00:00Z",unread:true,href:"/design-system"},{id:"sample-2",title:"이용 내역을 한곳에서 확인하세요",message:"마이페이지에서 구독과 메뉴판 이용 내역을 확인할 수 있습니다.",createdAt:"2026-10-25T02:00:00Z",unread:false,href:"/design-system"}];
export default function ReferenceComponentExamples() {
  const [examplePoints, setExamplePoints] = useState<ManagedOrderPoint[]>([{id: "33333333-3333-4333-8333-333333333333", label: "테이블 1", kind: "table", status: "active", policy: DEFAULT_ORDER_POINT_POLICY, policyAvailable: true}, {id: "44444444-4444-4444-8444-444444444444", label: "키오스크 1", kind: "kiosk", status: "active", policy: {...DEFAULT_ORDER_POINT_POLICY, terminalCallEnabled: false}, policyAvailable: true}, {id: "55555555-5555-4555-8555-555555555555", label: "테이블 2", kind: "table", status: "disabled", policy: DEFAULT_ORDER_POINT_POLICY, policyAvailable: true}]);
  const [exampleRoomName, setExampleRoomName] = useState("룸 이름 예시");
  const [exampleKind, setExampleKind] = useState<"table" | "kiosk">("table");
  const [exampleName, setExampleName] = useState("");
  const [exampleConnectionState, setExampleConnectionState] = useState<OrderPointConnectionState>({available: true, connections: []});
  const [exampleCurrentTableId, setExampleCurrentTableId] = useState<string | null>(null);
  const [exampleEnableRequest, setExampleEnableRequest] = useState<OrderPointConnectRequest | undefined>();
  const openExampleConnection = (id: string, request?: OrderPointConnectRequest) => { setConnectionPointId(id); setExampleEnableRequest(request); };
  const [connectionPointId, setConnectionPointId] = useState<string | null>(null);
  const updateExampleFeature: OrderPointFeatureUpdate = async input => {
    setExamplePoints(current => current.map(point => point.id === input.tableId ? { ...point, status: "active", policy: { ...(point.status === "disabled" ? { terminalOrderEnabled: false, terminalCallEnabled: false, customerOrderEnabled: false, customerCallEnabled: false } : point.policy!), [orderPointPolicyKey(input.channel, input.feature)]: input.enabled } } : point));
    return { status: "success", message: "예시 화면에만 적용했습니다." };
  };
  const [desktopNoticeOpen, setDesktopNoticeOpen] = useState(false);
  const desktopNoticeRef = useRef<HTMLButtonElement>(null);
  const [exampleOrdersEnabled, setExampleOrdersEnabled] = useState(false);
  const [read,setRead]=useState<string[]>([]);
  const [query,setQuery]=useState("");
  const [status,setStatus]=useState("all");
  const [applied,setApplied]=useState({query:"",status:"all"});
  const [details,setDetails]=useState(false);
  const [sort,setSort]=useState("recent");
  const [exampleFloor,setExampleFloor]=useState<FloorDocument>(emptyFloorDocument);
  const [exampleCreatedPoint, setExampleCreatedPoint] = useState<{pointId:string;roomId:string}>();
  const [onlyUnread,setOnlyUnread]=useState(false);
  const visible=(applied.status==="all"||applied.status==="draft") && "아티메뉴 카페".includes(applied.query.trim());
  return <>
    <Example title="복원 이름 중복 오류" description="보관 항목과 같은 종류의 운영 이름이 겹치면 공통 입력 오류 테두리와 하단 메시지를 계속 표시합니다. 다른 이름을 입력하면 해제됩니다. 실제 등록이나 복원은 실행하지 않습니다."><OrderPointRestoreForm rooms={[{id:"example-room",name:"룸 1"}]} menuSiteId="example" point={{id:"archived",label:"1번 테이블",kind:"table"}} operatingPoints={[{id:"operating",label:"1번 테이블",kind:"table"}]} action={()=>{}} /></Example>
    <Example title="짧은 이름 저장 중 표시" description="목록의 짧은 이름 수정은 공통 편집기를 사용합니다. 저장 중 입력 옆에 공통 회전 스피너를 표시하고 중복 저장을 막습니다. 아래는 1초 지연 저장 예시입니다."><Tabs purpose="section" appearance="document" defaultValue="room"><TabsList aria-label="이름 저장 상태 예시"><TabsTrigger value="room" accessory={<InlineNameEditor iconOnly value={exampleRoomName} label="룸 이름 예시 수정" onSave={async name=>{await new Promise(resolve=>setTimeout(resolve,1000));setExampleRoomName(name);return{status:"success",value:name};}} />}>{exampleRoomName}</TabsTrigger></TabsList><TabsContent value="room" /></Tabs></Example>
    <Example title="현재 주문과 주문 이력" description="실제 주문 화면의 읽기 전용 예시입니다. 대표 주문 카드·전체 상세 팝업과 기간·상태·테이블·주문번호 필터를 확인합니다. 예시 데이터만 조회하며 실제 주문이나 결제를 변경하지 않습니다."><OrderManagementExample/></Example>
    <Example title="테이블·키오스크 저장 확인" description="실제 관리 컴포넌트의 저장 전 초안과 보기 전환 확인 예시입니다. 테이블·키오스크 추가·이름·배치는 하단 저장으로 확정하고, 룸 생성과 토글은 즉시 반영하고 룸 이름과 이모지는 수정 후 저장 버튼으로 별도 확정합니다. 저장 횟수와 등록 수는 이 예시 안에서만 변경됩니다. 실제 매장 데이터는 변경하지 않습니다."><OrderPointSaveExample /></Example>
    <Example title="룸 배치도 편집" description="왼쪽 고정 사각형 룸 추가 버튼과 룸 선택 버튼을 두 보기가 공유합니다. 선택한 룸 이모지·이름·수정/저장·삭제와 상시 등록 폼은 회색 작업 박스 안에서 구분합니다. 룸 삭제는 항목을 확인하고 모두 이동 또는 보관한 뒤 바로 저장하며 마지막 룸은 보관만 제공합니다. 배치를 해제해도 룸 소속은 유지하고 새 룸에 기존 항목을 자동 배치하지 않습니다. 룸이 있어야 종류·이름을 입력하고 만들기를 누를 수 있습니다. 룸 생성은 즉시 저장하고 룸 이름과 이모지는 수정 후 저장 버튼으로 별도 확정하며 새 항목의 배치는 하단 저장 전까지 초안으로 유지합니다. 등록 폼에는 취소 버튼을 두지 않습니다. 첫 배치 항목은 기본 선택하며, 모바일에서도 이름·만들기와 배치 선택·바로 배치, 룸 선택·이동, 복원 이름·복원은 공통 FieldActionRow로 같은 줄에 둡니다. 모바일 작업 표면은 controls 밀도의16px 여백을 사용하며 입력16px와 공통 버튼 크기를 유지합니다. 선택 정보는 공통 ControlCategoryRow로 한 줄에 표시합니다. 주문·호출·매장 기기 연결의 범주 제목은 type-content-title, 기기 라벨은 type-label이며 범주 사이에 공통 회색 세로 구분선을 둡니다. 선택 행은 위아래8px로 줄이고44px 조작 영역을 유지합니다. ON/OFF 문구를 붙이지 않습니다. 캔버스 오른쪽 위 아이콘은 마지막 저장 배치로 되돌리고 선택한 사각형 안 보관은 X 배치 해제와 구분합니다. 테이블·키오스크 사각형은 정보량과 종류에 관계없이 동일한 고정 크기입니다. 아래 예시는 실제 매장 데이터를 변경하지 않습니다.">
      <FloorPlanEditor onDocumentChange={setExampleFloor} onRemoveRoom={async(revision,request)=>{const document=resolveFloorRoomRemoval(exampleFloor,request,examplePoints.map(point=>point.id));if(request.mode==="archive")setExamplePoints(current=>current.filter(point=>!request.pointIds.includes(point.id)));return{status:"success",revision:revision+1,document};}} createdPoint={exampleCreatedPoint} registration={({ canRegister, roomId, pending, blockedReason }) => <OrderPointRegistrationForm embedded menuSiteId="example" kind={exampleKind} onKindChange={setExampleKind} name={exampleName} onNameChange={setExampleName} roomReady={canRegister} roomId={roomId} disabled={pending} blockedReason={blockedReason} kioskAvailable action={async data => { const id = crypto.randomUUID(); setExamplePoints(current => [...current, { id, label: String(data.get("label")), kind: data.get("kind") === "kiosk" ? "kiosk" : "table", status: "active", policy: DEFAULT_ORDER_POINT_POLICY, policyAvailable: true }]); setExampleCreatedPoint({pointId:id,roomId:String(data.get("roomId"))}); setExampleName(""); }} />} initial={{available: true, revision: 0, document: {rooms: [{id: "11111111-1111-4111-8111-111111111111", name: "홀 예시", aspectRatio: 1.78}, {id: "22222222-2222-4222-8222-222222222222", name: "테라스 예시", aspectRatio: 1.33}], placements: [{pointId: "33333333-3333-4333-8333-333333333333", roomId: "11111111-1111-4111-8111-111111111111", x: 8, y: 20, width: 22, height: 30}, {pointId: "44444444-4444-4444-8444-444444444444", roomId: "11111111-1111-4111-8111-111111111111", x: 40, y: 20, width: 22, height: 30}]}}} points={examplePoints} renderSelectedPoint={(point, pending) => <OrderPointSelectionDetails key={point.id} menuSiteId="example" point={examplePoints.find(item => item.id === point.id)!} disabled={pending} connectionState={exampleConnectionState} onUpdate={updateExampleFeature} onConnect={openExampleConnection} />} renderSelectedActions={(point, pending) => <OrderPointArchiveControl menuSiteId="example" point={examplePoints.find(item => item.id === point.id)!} disabled={pending} action={async data => { setExamplePoints(current => current.filter(item => item.id !== data.get("tableId"))); }} />} onSave={async (revision, document) => ({status: "success", revision: revision + 1, document})} />
    </Example>
    <OrderPointConnectionDialog enableRequest={exampleEnableRequest} menuSiteId="example" point={examplePoints.find(point => point.id === connectionPointId) ?? null} published setup={{currentDevice: {kind: "PC", os: "OS 확인 중", model: "모델 확인 불가", browser: "브라우저 확인 중"}, currentTableId: exampleCurrentTableId, connectionStatusAvailable: true, connectionsAvailable: true, connections: exampleConnectionState.connections.map(item => ({...item, id: `example-${item.tableId}`, current: item.tableId === exampleCurrentTableId, createdAt: "2026-11-06T00:00:00Z"}))}} onClose={() => { setConnectionPointId(null); setExampleEnableRequest(undefined); }} mutateAction={async (_previous, data) => {
      // A short sample-only delay makes the shared pending indicator observable.
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (data.get("intent") === "register-terminal") {
        const id = String(data.get("tableId")), feature = data.get("enableFeature");
        const device = readTerminalDeviceInfo(JSON.parse(String(data.get("deviceInfo"))));
        setExampleConnectionState(current => ({available: true, connections: [...current.connections.filter(item => item.tableId !== id && item.tableId !== exampleCurrentTableId), {tableId: id, device}]}));
        setExampleCurrentTableId(id);
        if (feature === "orders" || feature === "calls") setExamplePoints(current => current.map(point => point.id === id ? {...point, status: "active", policy: {...point.policy!, [orderPointPolicyKey("terminal", feature)]: true}} : point));
      } else if (data.get("intent") === "revoke-terminal-connection") {
        const id = String(data.get("tableId"));
        setExampleConnectionState(current => ({...current, connections: current.connections.filter(item => item.tableId !== id)}));
        if (id === exampleCurrentTableId) setExampleCurrentTableId(null);
      }
      return {status: "success", message: "예시 화면에만 적용했습니다. 실제 기기 연결과 관리자 로그인은 변경하지 않습니다.", tableId: String(data.get("tableId")), qrPath: null};
    }} />
    <Example title="모바일 첫 진입 안내" description="모바일에서는 같은 크기 카드로 확인·등록·바로 배치하며 위치 편집은 PC에서 합니다. 탭 세션당 한 번 안내합니다. 아래는 같은 안내 Dialog의 동작 예시입니다."><Button ref={desktopNoticeRef} variant="outline" onClick={() => setDesktopNoticeOpen(true)}>모바일 진입 안내 보기</Button><FloorPlanDesktopNoticeDialog open={desktopNoticeOpen} onOpenChange={setDesktopNoticeOpen} returnFocusRef={desktopNoticeRef} /></Example>
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
      <form onSubmit={event=>{event.preventDefault();setApplied({query,status});}}><FilterPanel footer={<><fieldset className={styles.buttonRow}><legend className="sr-only">정렬</legend>{[{value:"recent",label:"최신순"},{value:"name",label:"이름순"}].map(item=><label key={item.value} className="type-body-sm inline-flex items-center gap-2"><input type="radio" name="sample-sort" value={item.value} checked={sort===item.value} onChange={()=>setSort(item.value)} />{item.label}</label>)}</fieldset><label className="type-body-sm inline-flex items-center gap-2"><input type="checkbox" checked={onlyUnread} onChange={event=>setOnlyUnread(event.target.checked)} />미확인 항목만</label></>}><div className={styles.filterExample}><label><span className="type-label mb-2 block">상태</span><select value={status} onChange={event=>setStatus(event.target.value)} className="site-field w-full"><option value="all">전체 상태</option><option value="draft">작성 중</option><option value="published">공개 중</option></select></label><div className="site-field-stack"><label htmlFor="example-menu-search" className="type-label">메뉴판명</label><SearchField id="example-menu-search" label="예시 메뉴판명 검색" value={query} onValueChange={setQuery} placeholder="아티메뉴 카페" /></div><Button type="submit">조회</Button></div></FilterPanel></form>
      {visible ? <RecordCard aside={<><span className={styles.sampleAvatar} aria-hidden="true">☕</span><p className="type-label">아티메뉴 카페</p><p className="type-caption text-zinc-600">매장 정보 예시</p></>} actions={<><span className="type-body-sm mr-auto text-zinc-600">메뉴판을 확인한 뒤 공개해 주세요.</span><Button variant="outline" onClick={()=>setDetails(value=>!value)} aria-expanded={details}>{details?"상세 접기":"상세 보기"}</Button><Button asChild><Link href="/templates">디자인 살펴보기</Link></Button></>}><div className={styles.recordHeading}><div><Badge tone="draft">작성중</Badge><h3 className="type-content-title mt-3">아티메뉴 카페 메뉴판</h3><p className="type-body-sm mt-2 text-zinc-600">베이직 · 기본 디자인 · {onlyUnread?"미확인 항목":"전체 항목"} · {sort==="recent"?"최신순":"이름순"}</p></div><CreditCard aria-hidden="true" className="text-zinc-400" /></div>{details?<KeyValueList items={[{label:"메뉴판 상태",value:"작성 중"},{label:"디자인",value:"기본 디자인"},{label:"공개 전 확인",value:<Check size={18} aria-label="확인" />}]} />:null}</RecordCard> : <p role="status" className="site-collection type-body-sm">조건에 맞는 예시가 없습니다. 상태를 전체로 바꾸거나 검색어를 지워 주세요.</p>}
    </Example>
    <Example title="날짜 선택·그래프·진행률" description="날짜와 막대를 누르면 선택한 날짜의 수치를 확인합니다. 운영 매출 화면에서는 실제 데이터로 연결되며, 아래는 7일간의 예시입니다."><div className="site-dashboard"><ActivityOverview label="2026년 10월" days={[0,1,2,3,4,5,6].map((i)=>({date:`2026-10-${20+i}`,orderCount:10+i,paidOrderCount:8+i,collectedAmount:[52000,45000,82000,64000,72000,120000,98000][i]}))} /></div></Example>
    <Example title="공유 모달" description="배경 도형 없는 아이콘과 짧은 이름으로 공유 방법을 선택합니다. 링크 복사는 항상 제공하며, 기기 공유는 해당 브라우저에서 지원할 때 표시합니다."><ShareDialog title="아티메뉴 디자인 템플릿" url="https://tablescene-menu-site2.vercel.app/templates" trigger={<Button variant="outline"><Share2 />공유하기</Button>} /></Example>
    <Example title="이미지 캐러셀" description="여러 장일 때만 우측 하단의 반투명 검정 장수 표시와 PC·태블릿의 흰색 화살표를 표시합니다. 화살표는 마우스를 올리면 배경 없이 은은한 회색으로 부드럽게 바뀝니다. 스와이프와 좌우 방향키로 이동하며, 한 장에는 이동 도구를 표시하지 않습니다.">
      <div className="site-card-grid" id="image-carousel-examples">
        <div className="site-template-media"><ImageCarousel name="MELLOW 캐러셀 예시" sizes="100vw" images={getCatalogDesign("cafe_mocha_forest_a")!.images} /></div>
        <div className="site-template-media"><ImageCarousel name="단일 이미지 예시" sizes="100vw" images={getCatalogDesign("cafe_real_matcha_a")!.images} /></div>
      </div>
    </Example>
    <Example title="탭형 요금 선택 카드" description="테두리 안에서 선택 옵션과 가격·제공 범위·보조 행동·주요 행동을 연결합니다. 가격과 링크는 실제 요금제와 같은 데이터를 사용합니다."><div className={styles.offerExample}><ProductOfferCard product={publicBasicProducts[0]} /></div></Example>
  </>;
}
