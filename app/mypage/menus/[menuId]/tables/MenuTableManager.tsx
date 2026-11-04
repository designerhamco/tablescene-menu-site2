"use client";

import { useActionState, useId, useState } from "react";
import { LayoutGrid, List, Map } from "lucide-react";
import ActionFeedbackToast from "@/components/ui/ActionFeedbackToast";
import type { ArchivedMenuTableListItem, MenuTableListItem } from "@/lib/menu-table-management";
import OrderPointConnectionSummary, { type OrderPointConnectionState } from "@/components/mypage/OrderPointConnectionSummary";
import DeleteOrderPoint from "@/components/mypage/DeleteOrderPoint";
import { LoadingState } from "@/app/components/ui/loading-state";
import { ContentPanel } from "@/app/components/ui/content-panel";
import { formatKoreanDateTime } from "@/lib/korean-date-time";
import { initialMenuTableActionState } from "./action-state";
import { createMenuTableAction, mutateMenuTableAction } from "./actions";
import { Badge } from "@/app/components/ui/badge";
import { EmptyState } from "@/app/components/ui/empty-state";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/app/components/ui/tabs";
import type { OrderPointKind } from "@/lib/order-point-policy";

import FloorPlanEditor from "@/components/mypage/floor-plan/FloorPlanEditor";
import { emptyFloorDocument, type FloorPlanSnapshot, type FloorDocument, type FloorSaveResult } from "@/lib/menu-floor-plan";

type ManagedPoint = Pick<MenuTableListItem, "id" | "label" | "status" | "kind">;
export default function MenuTableManager({ menuSiteId, tables, archivedTables = [], pointSettingsAvailable = false, canDelete = false, connectionState, kind = "table", saveFloorPlanAction, floorPlan = { available: false, revision: 0, document: emptyFloorDocument() } }: {
  kind?: OrderPointKind;
  saveFloorPlanAction?: (revision: number, document: FloorDocument) => Promise<FloorSaveResult>;
  floorPlan?: FloorPlanSnapshot; menuSiteId: string; tables: ManagedPoint[]; archivedTables?: ArchivedMenuTableListItem[];
  pointSettingsAvailable?: boolean; canDelete?: boolean; connectionState?: OrderPointConnectionState;
}) {
  const [createState, createAction, createPending] = useActionState(createMenuTableAction, initialMenuTableActionState);
  const [mutationState, mutationAction, mutationPending] = useActionState(mutateMenuTableAction, initialMenuTableActionState);
  const [displayMode, setDisplayMode] = useState("list");
  const usageId = useId();
  const kiosk = kind === "kiosk", noun = kiosk ? "키오스크" : "테이블";
  const points = tables.filter(table => (table.kind ?? "table") === kind);
  const archived = archivedTables.filter(table => (table.kind ?? "table") === kind);
  return <div className="site-stack-group">
    <ActionFeedbackToast message={createState.message} tone={createState.status === "success" ? "success" : "error"} eventKey={createState} />
    <ActionFeedbackToast message={mutationState.message} tone={mutationState.status === "success" ? "success" : "error"} eventKey={mutationState} />
        <div className="site-stack-group">
          <ContentPanel>
            <div className="site-stack-title">
              <h2 className="type-subsection-title">새 {noun} 추가</h2>
              <p className="type-body-sm site-copy-muted">{kiosk ? "키오스크마다 번호 또는 이름을 등록해 주세요. 기기 연결은 주문·호출 설정에서 관리합니다." : "매장에서 사용할 테이블 번호 또는 이름을 등록해 주세요. 등록한 테이블은 주문·호출 설정과 QR 관리에서 함께 사용합니다."}</p>
            </div>
            <form action={createAction} aria-busy={createPending} className="site-form-row" key={kind}>
              <input type="hidden" name="menuSiteId" value={menuSiteId} /><input type="hidden" name="kind" value={kind} />
              <label className="site-field-stack type-label">{noun} {kiosk ? "번호·이름" : "이름"}
                <input name="label" required maxLength={80} placeholder={kiosk ? "예: 키오스크 1" : "예: 1번 테이블"} className="site-field w-full" />
              </label>
              <button type="submit" disabled={createPending || (kiosk && !pointSettingsAvailable)} className="site-button site-button-primary">{createPending ? "생성 중" : `${noun} 만들기`}</button>
            </form>
            {createPending ? <LoadingState inline label={`${noun}${kiosk ? "를" : "을"} 만들고 있습니다. 잠시만 기다려 주세요.`} /> : null}
            {kiosk && !pointSettingsAvailable ? <p className="type-body-sm site-copy-muted">키오스크 설정 업데이트를 준비 중입니다. 기존 테이블은 계속 사용할 수 있습니다.</p> : null}
          </ContentPanel>
          <section className="site-stack-group" aria-labelledby={`${usageId}-${kind}-title`}>
            <div className="site-stack-title">
              <h2 className="type-subsection-title" id={`${usageId}-${kind}-title`}>운영 {noun} · {points.length.toLocaleString("ko-KR")}개</h2>
              <p className="type-body-sm site-copy-muted">{noun}의 이름·상태를 수정하거나 보관할 수 있습니다. 주문·호출 설정과 기기 연결은 각 관리 메뉴에서, 메뉴판 주소·QR은 QR 관리에서 변경해 주세요.</p>
            </div>
            <Tabs purpose="state" value={displayMode} onValueChange={setDisplayMode}>
              <TabsList aria-label={`운영 ${noun} 표시 방식`}><TabsTrigger value="list"><List aria-hidden="true" />리스트형</TabsTrigger><TabsTrigger value="map"><Map aria-hidden="true" />지도형</TabsTrigger></TabsList>
              <TabsContent value="map" forceMount hidden={displayMode !== "map"}>
                <FloorPlanEditor initial={floorPlan} points={tables} kind={kind} onSave={saveFloorPlanAction ?? (async () => ({ status: "error", message: "배치도 저장 기능을 사용할 수 없습니다." }))} />
              </TabsContent>
              <TabsContent value="list">
                <div className="site-stack-group">
            {!points.length ? <EmptyState headingLevel={3} icon={<LayoutGrid />} title={`아직 등록된 ${noun}${kiosk ? "가" : "이"} 없습니다.`} description={`${noun}${kiosk ? "를" : "을"} 추가하면 이곳에서 관리할 수 있습니다.`} /> : points.map(point => <ContentPanel as="article" key={point.id} aria-label={point.label}>
              <div className="site-content-heading-row"><h3 className="type-content-title break-words">{point.label}</h3><Badge tone={point.status === "active" ? "active" : "neutral"}>{point.status === "active" ? "사용 중" : "비활성"}</Badge></div>
              <form action={mutationAction} className="site-form-row site-content-divider">
                <input type="hidden" name="menuSiteId" value={menuSiteId} /><input type="hidden" name="tableId" value={point.id} />
                <label className="site-field-stack type-label">이름<input name="label" required maxLength={80} defaultValue={point.label} className="site-field w-full" /></label>
                <label className="site-field-stack type-label" data-field-width="short">상태<select name="status" defaultValue={point.status} className="site-field w-full"><option value="active">사용 중</option><option value="disabled">비활성</option></select></label>
                <button name="intent" value="update" disabled={mutationPending} className="site-button site-button-outline">저장</button>
              </form>
              <OrderPointConnectionSummary menuSiteId={menuSiteId} point={point} state={connectionState} />
              <form action={mutationAction} className="site-action-row" aria-busy={mutationPending}>
                <input type="hidden" name="menuSiteId" value={menuSiteId} /><input type="hidden" name="tableId" value={point.id} />
                <button name="intent" value="archive" disabled={mutationPending} className="site-button site-button-outline">{noun} 보관</button>
              </form>
              {canDelete ? <div className="site-action-row"><DeleteOrderPoint menuSiteId={menuSiteId} point={point} disabled={mutationPending} /></div> : null}
              <p className="type-footnote site-copy-muted">보관하면 운영 목록에서 빠지고 연결은 종료됩니다. 기존 주문·호출 기록은 유지됩니다.</p>
            </ContentPanel>)}
                </div>
              </TabsContent>
            </Tabs>
            {mutationPending ? <LoadingState inline label={`${noun} 작업을 처리하고 있습니다.`} /> : null}
          </section>
          <section className="site-stack-block" aria-label={`보관된 ${noun}`}>
            <div className="site-stack-title"><h2 className="type-subsection-title">보관된 {noun} · {archived.length.toLocaleString("ko-KR")}개</h2><p className="type-body-sm site-copy-muted">더 이상 쓰지 않는 {noun}{kiosk ? "를" : "을"} 보관해 두세요. 잠깐 사용을 쉬는 경우에는 비활성으로 두면 됩니다. 복원 후 사용 중으로 바꾸면 다시 사용할 수 있습니다.</p></div>
            {!archived.length ? <p className="type-body-sm site-copy-muted">보관된 {noun}{kiosk ? "가" : "이"} 없습니다.</p> : archived.map(point => <ContentPanel as="article" key={point.id}>
              <div className="site-content-heading-row"><div className="site-stack-copy min-w-0"><h3 className="type-content-title break-words">{point.label}</h3><p className="type-caption site-copy-subtle">보관일 {formatKoreanDateTime(point.archivedAt)}</p></div><Badge>보관됨</Badge></div>
              <form action={mutationAction} className="site-form-row" aria-busy={mutationPending}><input type="hidden" name="menuSiteId" value={menuSiteId} /><input type="hidden" name="tableId" value={point.id} /><label className="type-label site-field-stack">복원할 이름<input name="label" required maxLength={80} defaultValue={point.label} className="site-field w-full" /></label><button name="intent" value="restore" disabled={mutationPending} className="site-button site-button-outline">{noun} 복원</button></form>
              <div className="site-action-row">{canDelete ? <><DeleteOrderPoint menuSiteId={menuSiteId} point={point} disabled={mutationPending} /><DeleteOrderPoint menuSiteId={menuSiteId} point={point} withHistory disabled={mutationPending} /></> : null}</div>
            </ContentPanel>)}
          </section>
        </div>
  </div>;
}
