"use client";

import { getOrderPointNameError } from "@/lib/order-point-name";
import { normalizeMenuTableLabel } from "@/lib/menu-table-validation";
import { DEFAULT_ORDER_POINT_POLICY } from "@/lib/order-point-policy";
import { saveOrderPointDrafts, type DraftOrderPoint } from "@/lib/order-point-drafts";
import type { InlineNameResult } from "@/app/components/ui/inline-name-editor";
import type { OrderPointConnectRequest } from "@/lib/order-point-connection";
import { confirmUnsavedChanges } from "@/lib/unsaved-changes";
import { useUnsavedChanges } from "@/components/ui/useUnsavedChanges";
import { useActionState, useId, useRef, useState } from "react";
import { Armchair, Monitor, LayoutGrid, List, Map } from "lucide-react";
import ActionFeedbackToast from "@/components/ui/ActionFeedbackToast";
import type { ArchivedMenuTableListItem } from "@/lib/menu-table-management";
import type { OrderPointConnectionState } from "@/components/mypage/OrderPointConnectionSummary";
import { OrderPointSelectionDetails, OrderPointArchiveControl, type ManagedOrderPoint } from "@/components/mypage/OrderPointControls";
import OrderPointConnectionDialog from "@/components/mypage/OrderPointConnectionDialog";
import type { OrderPointDeviceSettings } from "@/lib/terminal-device-info";
import OrderPointTableRow from "@/components/mypage/OrderPointTableRow";
import InfoTooltip from "@/components/ui/InfoTooltip";
import DeleteOrderPoint from "@/components/mypage/DeleteOrderPoint";
import { LoadingState } from "@/app/components/ui/loading-state";
import OrderPointRegistrationForm from "@/components/mypage/OrderPointRegistrationForm";
import { EditableList, EditableListItem } from "@/app/components/ui/editable-list";
import { Table, TableBody, TableCaption, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";
import { formatKoreanDateTime } from "@/lib/korean-date-time";
import { initialMenuTableActionState } from "./action-state";
import { createMenuTableAction, mutateMenuTableAction, updateOrderPointFeature } from "./actions";
import { Badge } from "@/app/components/ui/badge";
import { EmptyState } from "@/app/components/ui/empty-state";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/app/components/ui/tabs";
import type { OrderPointKind } from "@/lib/order-point-policy";
import OrderPointRestoreForm from "@/components/mypage/OrderPointRestoreForm";
import FloorPlanDesktopNotice from "@/components/mypage/floor-plan/FloorPlanDesktopNotice";
import FloorPlanEditor from "@/components/mypage/floor-plan/FloorPlanEditor";
import { emptyFloorDocument, type FloorPlanSnapshot, type FloorDocument, type FloorSaveResult } from "@/lib/menu-floor-plan";

type ManagedPoint = ManagedOrderPoint;

function PointTitle({ point }: { point: { label: string; kind?: OrderPointKind } }) {
  return <span className="site-action-row">
    <span className="site-label-icon" aria-hidden="true">{point.kind === "kiosk" ? <Monitor /> : <Armchair />}</span>
    <span className="sr-only">{point.kind === "kiosk" ? "키오스크 · " : "테이블 · "}</span>
    <span className="min-w-0 flex-1 break-words">{point.label}</span>
  </span>;
}

export default function MenuTableManager({ menuSiteId, tables, archivedTables = [], pointSettingsAvailable = false, canDelete = false, canConfigure = false, published = false, deviceSetup = null, connectionState, saveFloorPlanAction, createPointAction = createMenuTableAction, mutatePointAction = mutateMenuTableAction, updateFeatureAction = updateOrderPointFeature, floorPlan = { available: false, revision: 0, document: emptyFloorDocument() } }: {
  createPointAction?: typeof createMenuTableAction; mutatePointAction?: typeof mutateMenuTableAction; updateFeatureAction?: typeof updateOrderPointFeature;
  saveFloorPlanAction?: (revision: number, document: FloorDocument) => Promise<FloorSaveResult>;
  floorPlan?: FloorPlanSnapshot; menuSiteId: string; tables: ManagedPoint[]; archivedTables?: ArchivedMenuTableListItem[];
  canConfigure?: boolean; published?: boolean; deviceSetup?: OrderPointDeviceSettings | null;
  pointSettingsAvailable?: boolean; canDelete?: boolean; connectionState?: OrderPointConnectionState;
}) {
  const [registrationKind, setRegistrationKind] = useState<OrderPointKind>("table");
  const [nameDrafts, setNameDrafts] = useState({ table: "", kiosk: "" });
  const [createState, setCreateState] = useState(initialMenuTableActionState);
  const [added, setAdded] = useState<DraftOrderPoint[]>([]);
  const [renamed, setRenamed] = useState<Record<string, string>>({});
  const [committedIds, setCommittedIds] = useState<Record<string, string>>({});
  const committedIdsRef = useRef<Record<string, string>>({});
  const remoteIds = new Set(Object.values(committedIds));
  const draftTables: ManagedPoint[] = [...tables.filter(point => !remoteIds.has(point.id)).map(point => ({...point, label: renamed[point.id] ?? point.label})), ...added.map(point => ({...point, label: renamed[point.id] ?? point.label, status: "active" as const, policy: DEFAULT_ORDER_POINT_POLICY, policyAvailable: true, draft: true}))];
  const editsDirty = added.length > 0 || Object.keys(renamed).length > 0;
  function discardEdits() { setAdded([]); setRenamed({}); setCommittedIds({}); committedIdsRef.current = {}; setCreateState(initialMenuTableActionState); }
  async function createAction(formData: FormData) {
    try {
      const kind = formData.get("kind") === "kiosk" ? "kiosk" : "table";
      const label = normalizeMenuTableLabel(String(formData.get("label")));
      const id = crypto.randomUUID(), roomId = String(formData.get("roomId"));
      const error = getOrderPointNameError({id,label,kind},draftTables);
      if (error) throw new Error(error);
      setAdded(current => [...current,{id,label,kind,roomId}]);
      setNameDrafts(current => ({...current,[kind]:""}));
      setCreateState({...initialMenuTableActionState,status:"success",tableId:id,registrationRoomId:roomId,message:"추가했습니다. 하단 저장 버튼을 눌러 등록을 완료해 주세요."});
    } catch (error) { setCreateState({...initialMenuTableActionState,status:"error",message:error instanceof Error ? error.message : "이름을 확인해 주세요."}); }
  }
  async function renameDraft(id: string, name: string): Promise<InlineNameResult> {
    try {
      const label = normalizeMenuTableLabel(name), point = draftTables.find(item => item.id === id);
      if (!point) throw new Error("항목을 확인해 주세요.");
      const error = getOrderPointNameError({...point,label},draftTables);
      if (error) throw new Error(error);
      setRenamed(current => { const next={...current,[id]:label}; if(tables.find(item=>item.id===id)?.label===label) delete next[id]; return next; });
      return {status:"success",value:label};
    } catch(error) { return {status:"error",message:error instanceof Error ? error.message : "이름을 확인해 주세요."}; }
  }
  async function saveEdits(revision: number, document: FloorDocument): Promise<FloorSaveResult> {
    const result = await saveOrderPointDrafts({revision,document,added:added.map(point=>({...point,label:renamed[point.id]??point.label})),names:renamed,committedIds:committedIdsRef.current,
      create: point => { const data=new FormData();data.set("menuSiteId",menuSiteId);data.set("kind",point.kind);data.set("label",point.label);data.set("roomId",point.roomId);return createPointAction(initialMenuTableActionState,data); },
      rename: (id,label) => { const data=new FormData();data.set("menuSiteId",menuSiteId);data.set("tableId",id);data.set("label",label);data.set("intent","rename");return mutatePointAction(initialMenuTableActionState,data); },
      saveLayout:saveFloorPlanAction??(async()=>({status:"error",message:"배치도를 저장할 수 없습니다."})),
      onCreated:(id,remoteId)=>{committedIdsRef.current={...committedIdsRef.current,[id]:remoteId};setCommittedIds(committedIdsRef.current);}});
    if(result.status==="success") discardEdits();
    return result;
  }
  function archiveAction(data: FormData) { const id=String(data.get("tableId")); if(added.some(point=>point.id===id)&&!committedIdsRef.current[id]) {setAdded(current=>current.filter(point=>point.id!==id));setRenamed(current=>{const next={...current};delete next[id];return next;});return;} if(added.some(point=>point.id===id)) {setCreateState({...initialMenuTableActionState,status:"error",message:"먼저 하단 저장 버튼으로 저장을 완료해 주세요."});return;} mutationAction(data); }
  const [mutationState, mutationAction, mutationPending] = useActionState(mutatePointAction, initialMenuTableActionState);
  const [enableRequest, setEnableRequest] = useState<OrderPointConnectRequest | undefined>();
  const [connectionPointId, setConnectionPointId] = useState<string | null>(null);
  const [displayMode, setDisplayMode] = useState("map");
  const [expandedPointId, setExpandedPointId] = useState<string | null>(null);
  const usageId = useId();
  const connectionTriggerRef = useRef<HTMLButtonElement | null>(null);
  const openConnection = (id: string, request?: OrderPointConnectRequest) => { setEnableRequest(request); connectionTriggerRef.current = document.activeElement instanceof HTMLButtonElement ? document.activeElement : null; setConnectionPointId(id); };
  const mapTabRef = useRef<HTMLButtonElement>(null);
  const setExpanded = (pointId: string, open: boolean) => setExpandedPointId(open ? pointId : null);

  useUnsavedChanges({ dirty: editsDirty || Object.values(nameDrafts).some(name => Boolean(name.trim())), pending: false, discard: () => { discardEdits(); setNameDrafts({ table: "", kiosk: "" }); setRegistrationKind("table"); } });

  // Keep the editor mounted, but require confirmation before discarding a draft.
  async function changeDisplayMode(value: string) {
    if (value === displayMode) return;
    if (await confirmUnsavedChanges()) setDisplayMode(value);
  }

  const registration = ({ canRegister, roomId, pending, blockedReason }: { canRegister: boolean; roomId: string; pending: boolean; blockedReason?: string }) => <OrderPointRegistrationForm menuSiteId={menuSiteId} kind={registrationKind} onKindChange={setRegistrationKind} name={nameDrafts[registrationKind]} onNameChange={name => setNameDrafts(current => ({ ...current, [registrationKind]: name }))} roomReady={canRegister} roomId={roomId} blockedReason={blockedReason} pending={false} disabled={pending} kioskAvailable={pointSettingsAvailable} action={createAction} />;

  return <div className="site-stack-content">
    <OrderPointConnectionDialog menuSiteId={menuSiteId} mutateAction={mutatePointAction} point={tables.find(point => point.id === connectionPointId) ?? null} published={published} setup={deviceSetup} returnFocusRef={connectionTriggerRef} enableRequest={enableRequest} onClose={() => { setConnectionPointId(null); setEnableRequest(undefined); }} />
    <FloorPlanDesktopNotice returnFocusRef={mapTabRef} />
    <ActionFeedbackToast message={createState.message} tone={createState.status === "success" ? "success" : "error"} eventKey={createState} />
    <ActionFeedbackToast message={mutationState.message} tone={mutationState.status === "success" ? "success" : "error"} eventKey={mutationState} />

    <section className="site-stack-group" aria-labelledby={`${usageId}-title`}>
      <h2 className="type-subsection-title sr-only" id={`${usageId}-title`}>테이블·키오스크 등록과 운영 관리</h2>
      <Tabs purpose="state" value={displayMode} onValueChange={changeDisplayMode}>
        <div className="site-stack-group">
        <div className="site-field-stack"><span className="type-label">보기 유형</span><TabsList aria-label="보기 유형"><TabsTrigger ref={mapTabRef} value="map"><Map aria-hidden="true" />배치도형</TabsTrigger><TabsTrigger value="list"><List aria-hidden="true" />리스트형</TabsTrigger></TabsList></div>
        <TabsContent value={displayMode} forceMount>
          <FloorPlanEditor externalDirty={editsDirty} onSaveEdits={saveEdits} onDiscardEdits={discardEdits} createdPoint={createState.status === "success" && createState.tableId && createState.registrationRoomId ? { pointId: createState.tableId, roomId: createState.registrationRoomId } : undefined} view={displayMode === "list" ? "list" : "map"} registration={registration} initial={floorPlan} points={draftTables}
            renderList={() => <div className="site-stack-block">
              <h3 className="type-subsection-title">운영 테이블·키오스크 · {draftTables.length.toLocaleString("ko-KR")}개</h3>
              {!draftTables.length ? <EmptyState headingLevel={3} icon={<LayoutGrid />} title="아직 등록된 테이블·키오스크가 없습니다." description="위에서 종류와 이름을 입력하고 ‘만들기’를 눌러 주세요." /> : <Table variant="management" label="운영 테이블·키오스크 목록" columns={["compact", "text", "toggles", "toggles", "detail", "actions"]}>
                <TableCaption className="sr-only">종류, 이름, 주문·호출 개별 허용과 매장 기기 연결을 확인할 수 있습니다. 이름을 누르면 수정할 수 있습니다.</TableCaption>
                <TableHeader><TableRow>
                  <TableHead>종류</TableHead><TableHead>이름</TableHead><TableHead>주문</TableHead><TableHead>호출</TableHead><TableHead>매장 기기 연결</TableHead>
                  <TableHead><div className="site-action-row" data-wrap="nowrap">관리<InfoTooltip label="보관·삭제 안내"><p>보관하면 운영 목록에서 빠지고 기기 연결은 종료됩니다. 기존 주문·호출 기록은 유지됩니다. 삭제는 사용 이력이 없는 등록만 가능합니다.</p></InfoTooltip></div></TableHead>
                </TableRow></TableHeader>
                <TableBody>{draftTables.map(point => <OrderPointTableRow key={`${point.id}:${point.label}`} menuSiteId={menuSiteId} point={point} connectionState={connectionState} canDelete={canDelete} disabled={mutationPending} archiveAction={archiveAction} onRename={renameDraft} readOnly={!canConfigure || Boolean(draftTables.find(item => item.id === point.id)?.draft)} onUpdate={updateFeatureAction} onConnect={openConnection} />)}</TableBody>
              </Table>}
            </div>}
            renderSelectedPoint={(point, pending) => <OrderPointSelectionDetails key={point.id} menuSiteId={menuSiteId} point={draftTables.find(item => item.id === point.id)!} connectionState={connectionState} disabled={pending || mutationPending} readOnly={!canConfigure || Boolean(draftTables.find(item => item.id === point.id)?.draft)} onUpdate={updateFeatureAction} onConnect={openConnection} />}
            renderSelectedActions={(point, pending) => <OrderPointArchiveControl menuSiteId={menuSiteId} point={draftTables.find(item => item.id === point.id)!} action={archiveAction} disabled={pending || mutationPending} />}
            onSave={saveFloorPlanAction ?? (async () => ({ status: "error", message: "배치도 저장 기능을 사용할 수 없습니다." }))} />
        </TabsContent>
        </div>
      </Tabs>
      {mutationPending ? <LoadingState inline label="테이블·키오스크 작업을 처리하고 있습니다." /> : null}
    </section>

    <section className="site-stack-block" aria-labelledby={`${usageId}-archived-title`}>
      <h2 className="type-subsection-title" id={`${usageId}-archived-title`}>보관된 테이블·키오스크 · {archivedTables.length.toLocaleString("ko-KR")}개</h2>
      {!archivedTables.length ? <p className="type-body-sm site-copy-muted">보관된 테이블·키오스크가 없습니다.</p> : <EditableList label="보관된 테이블·키오스크 목록">
        {archivedTables.map((point, index) => <EditableListItem key={point.id} label={point.label} title={<PointTitle point={point} />}
          meta={`보관일 ${formatKoreanDateTime(point.archivedAt)}`} status={<Badge tone="neutral">미사용(보관)</Badge>}
          divided={index > 0} open={expandedPointId === point.id} onOpenChange={open => { if (open) setExpanded(point.id, true); else void confirmUnsavedChanges().then(allowed => { if (allowed) setExpanded(point.id, false); }); }} disabled={mutationPending}>
          <p className="type-body-sm site-copy-muted">복원하면 운영 목록으로 돌아오며 주문·호출은 모두 꺼진 상태로 시작합니다. 필요한 기기의 주문·호출 스위치만 켜 주세요.</p>
          <OrderPointRestoreForm point={point} menuSiteId={menuSiteId} operatingPoints={tables} action={mutationAction} pending={mutationPending} serverError={mutationState.tableId === point.id ? mutationState.labelError : undefined} />
          {canDelete ? <div className="site-action-row"><DeleteOrderPoint menuSiteId={menuSiteId} point={point} disabled={mutationPending} /><DeleteOrderPoint menuSiteId={menuSiteId} point={point} withHistory disabled={mutationPending} /></div> : null}
        </EditableListItem>)}
      </EditableList>}
    </section>
  </div>;
}
