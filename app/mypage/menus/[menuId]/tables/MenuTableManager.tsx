"use client";

import { useActionState, useId, useState } from "react";
import { Armchair, Monitor, LayoutGrid, List, Map, Plus } from "lucide-react";
import ActionFeedbackToast from "@/components/ui/ActionFeedbackToast";
import type { ArchivedMenuTableListItem, MenuTableListItem } from "@/lib/menu-table-management";
import type { OrderPointConnectionState } from "@/components/mypage/OrderPointConnectionSummary";
import OrderPointTableRow from "@/components/mypage/OrderPointTableRow";
import InfoTooltip from "@/components/ui/InfoTooltip";
import DeleteOrderPoint from "@/components/mypage/DeleteOrderPoint";
import { LoadingState } from "@/app/components/ui/loading-state";
import { ContentPanel } from "@/app/components/ui/content-panel";
import { EditableList, EditableListItem } from "@/app/components/ui/editable-list";
import { Table, TableBody, TableCaption, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";
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

function PointTitle({ point }: { point: { label: string; kind?: OrderPointKind } }) {
  return <span className="site-action-row">
    <span className="site-label-icon" aria-hidden="true">{point.kind === "kiosk" ? <Monitor /> : <Armchair />}</span>
    <span className="sr-only">{point.kind === "kiosk" ? "키오스크 · " : "테이블 · "}</span>
    <span className="min-w-0 flex-1 break-words">{point.label}</span>
  </span>;
}

export default function MenuTableManager({ menuSiteId, tables, archivedTables = [], pointSettingsAvailable = false, canDelete = false, connectionState, saveFloorPlanAction, floorPlan = { available: false, revision: 0, document: emptyFloorDocument() } }: {
  saveFloorPlanAction?: (revision: number, document: FloorDocument) => Promise<FloorSaveResult>;
  floorPlan?: FloorPlanSnapshot; menuSiteId: string; tables: ManagedPoint[]; archivedTables?: ArchivedMenuTableListItem[];
  pointSettingsAvailable?: boolean; canDelete?: boolean; connectionState?: OrderPointConnectionState;
}) {
  const [registrationKind, setRegistrationKind] = useState<OrderPointKind | null>(null);
  const [nameDrafts, setNameDrafts] = useState({ table: "", kiosk: "" });
  const [createState, createAction, createPending] = useActionState(async (previous: typeof initialMenuTableActionState, formData: FormData) => {
    const result = await createMenuTableAction(previous, formData);
    if (result.status === "success") {
      const kind = formData.get("kind") === "kiosk" ? "kiosk" : "table";
      setNameDrafts(current => ({ ...current, [kind]: "" }));
      setRegistrationKind(null);
    }
    return result;
  }, initialMenuTableActionState);
  const [mutationState, mutationAction, mutationPending] = useActionState(mutateMenuTableAction, initialMenuTableActionState);
  const [displayMode, setDisplayMode] = useState("list");
  const [expandedPointId, setExpandedPointId] = useState<string | null>(null);
  const usageId = useId();
  const kiosk = registrationKind === "kiosk", registrationNoun = kiosk ? "키오스크" : "테이블";
  const setExpanded = (pointId: string, open: boolean) => setExpandedPointId(open ? pointId : null);

  return <div className="site-stack-content">
    <ActionFeedbackToast message={createState.message} tone={createState.status === "success" ? "success" : "error"} eventKey={createState} />
    <ActionFeedbackToast message={mutationState.message} tone={mutationState.status === "success" ? "success" : "error"} eventKey={mutationState} />

    <section className="site-stack-group" aria-labelledby={`${usageId}-title`}>
      <Tabs purpose="state" value={displayMode} onValueChange={setDisplayMode}>
        <div className="site-stack-group">
        <TabsList aria-label="보기 유형"><TabsTrigger value="list"><List aria-hidden="true" />리스트형</TabsTrigger><TabsTrigger value="map"><Map aria-hidden="true" />배치도형</TabsTrigger></TabsList>
        <div className="site-stack-block">
          <div className="site-action-row" aria-label="테이블·키오스크 추가">
            <button type="button" className="site-button site-button-outline" disabled={createPending} aria-expanded={registrationKind === "table"} aria-controls={registrationKind ? `${usageId}-registration` : undefined} onClick={() => setRegistrationKind("table")}><Plus aria-hidden="true" />테이블 추가</button>
            <button type="button" className="site-button site-button-outline" disabled={createPending || !pointSettingsAvailable} aria-expanded={registrationKind === "kiosk"} aria-controls={registrationKind ? `${usageId}-registration` : undefined} onClick={() => setRegistrationKind("kiosk")}><Plus aria-hidden="true" />키오스크 추가</button>
          </div>
          {!pointSettingsAvailable ? <p className="type-footnote site-copy-muted">키오스크 등록 기능을 현재 사용할 수 없습니다. 기존 등록 정보는 계속 확인할 수 있습니다.</p> : null}
          {registrationKind ? <div id={`${usageId}-registration`}><ContentPanel surface="muted">
            <div className="site-stack-title">
              <h3 className="type-content-title">{registrationNoun} 추가</h3>
              <p className="type-body-sm site-copy-muted">{kiosk ? "키오스크마다 번호 또는 이름을 등록해 주세요." : "매장에서 사용할 테이블 번호 또는 이름을 등록해 주세요."}</p>
            </div>
            <form action={createAction} aria-busy={createPending} className="site-form-row">
              <input type="hidden" name="menuSiteId" value={menuSiteId} /><input type="hidden" name="kind" value={registrationKind} />
              <label className="site-field-stack type-label">{registrationNoun} 이름
                <input name="label" required maxLength={80} disabled={createPending} value={nameDrafts[registrationKind]} onChange={event => setNameDrafts(current => ({ ...current, [registrationKind]: event.target.value }))} placeholder={kiosk ? "예: 키오스크 1" : "예: 1번 테이블"} className="site-field w-full" />
              </label>
              <button type="submit" disabled={createPending || (kiosk && !pointSettingsAvailable)} className="site-button site-button-primary">{createPending ? "생성 중" : `${registrationNoun} 만들기`}</button>
              <button type="button" className="site-button site-button-outline" disabled={createPending} onClick={() => setRegistrationKind(null)}>취소</button>
            </form>
            <p className="type-footnote site-copy-muted">만들기를 누르면 바로 등록됩니다. 배치도의 룸·위치 변경은 ‘배치도 저장’으로 따로 저장해 주세요.</p>
            {createPending ? <LoadingState inline label={`${registrationNoun}${kiosk ? "를" : "을"} 만들고 있습니다. 잠시만 기다려 주세요.`} /> : null}
          </ContentPanel></div> : null}
        </div>

        <div className="site-stack-block">
        <h2 className="type-subsection-title" id={`${usageId}-title`}>운영 테이블·키오스크 · {tables.length.toLocaleString("ko-KR")}개</h2>

        <TabsContent value="list" forceMount hidden={displayMode !== "list"}>
          {!tables.length ? <EmptyState headingLevel={3} icon={<LayoutGrid />} title="아직 등록된 테이블·키오스크가 없습니다." description="위의 ‘테이블 추가’ 또는 ‘키오스크 추가’로 등록해 주세요." /> : <Table variant="management" label="운영 테이블·키오스크 목록" columns={["compact", "text", "detail", "control", "actions"]}>
            <TableCaption className="sr-only">종류, 이름, 공용 태블릿 연결 여부와 운영 상태를 확인할 수 있습니다. 이름을 누르면 수정할 수 있습니다.</TableCaption>
            <TableHeader><TableRow>
              <TableHead>종류</TableHead>
              <TableHead>이름</TableHead>
              <TableHead>공용 태블릿 연결 여부</TableHead>
              <TableHead>상태</TableHead>
              <TableHead><div className="site-action-row" data-wrap="nowrap">관리<InfoTooltip label="보관·삭제 안내"><p>보관하면 운영 목록에서 빠지고 기기 연결은 종료됩니다. 기존 주문·호출 기록은 유지됩니다. 삭제는 사용 이력이 없는 등록만 가능합니다.</p></InfoTooltip></div></TableHead>
            </TableRow></TableHeader>
            <TableBody>{tables.map(point => <OrderPointTableRow key={`${point.id}:${point.label}`} menuSiteId={menuSiteId} point={point} connectionState={connectionState} canDelete={canDelete} disabled={mutationPending} archiveAction={mutationAction} />)}</TableBody>
          </Table>}
        </TabsContent>
        <TabsContent value="map" forceMount hidden={displayMode !== "map"}>
          <FloorPlanEditor initial={floorPlan} points={tables} onSave={saveFloorPlanAction ?? (async () => ({ status: "error", message: "배치도 저장 기능을 사용할 수 없습니다." }))} />
        </TabsContent>
        </div>
        </div>
      </Tabs>
      {mutationPending ? <LoadingState inline label="테이블·키오스크 작업을 처리하고 있습니다." /> : null}
    </section>

    <section className="site-stack-block" aria-labelledby={`${usageId}-archived-title`}>
      <h2 className="type-subsection-title" id={`${usageId}-archived-title`}>보관된 테이블·키오스크 · {archivedTables.length.toLocaleString("ko-KR")}개</h2>
      {!archivedTables.length ? <p className="type-body-sm site-copy-muted">보관된 테이블·키오스크가 없습니다.</p> : <EditableList label="보관된 테이블·키오스크 목록">
        {archivedTables.map((point, index) => <EditableListItem key={point.id} label={point.label} title={<PointTitle point={point} />}
          meta={`보관일 ${formatKoreanDateTime(point.archivedAt)}`} status={<Badge tone="neutral">미사용(보관)</Badge>}
          divided={index > 0} open={expandedPointId === point.id} onOpenChange={open => setExpanded(point.id, open)} disabled={mutationPending}>
          <p className="type-body-sm site-copy-muted">다시 사용하려면 복원한 뒤 상태를 ‘사용 중’으로 바꿔 주세요. 잠깐 사용을 쉬는 항목은 보관 대신 ‘일시정지’로 두면 됩니다.</p>
          <form action={mutationAction} className="site-form-row" aria-busy={mutationPending}>
            <input type="hidden" name="menuSiteId" value={menuSiteId} /><input type="hidden" name="tableId" value={point.id} />
            <label className="type-label site-field-stack">복원할 이름<input name="label" required maxLength={80} defaultValue={point.label} className="site-field w-full" /></label>
            <button name="intent" value="restore" disabled={mutationPending} className="site-button site-button-outline">{point.kind === "kiosk" ? "키오스크" : "테이블"} 복원</button>
          </form>
          {canDelete ? <div className="site-action-row"><DeleteOrderPoint menuSiteId={menuSiteId} point={point} disabled={mutationPending} /><DeleteOrderPoint menuSiteId={menuSiteId} point={point} withHistory disabled={mutationPending} /></div> : null}
        </EditableListItem>)}
      </EditableList>}
    </section>
  </div>;
}
