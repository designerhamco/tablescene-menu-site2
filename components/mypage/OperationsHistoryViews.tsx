"use client";
import { useState, type ReactNode } from "react";
import { Armchair, List, Map, Monitor } from "lucide-react";
import { ContentPanel } from "@/app/components/ui/content-panel";
import {
  FloorPlanCanvas,
  FloorPlanObject,
} from "@/app/components/ui/floor-plan-canvas";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/app/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/app/components/ui/dialog";
import { FLOOR_PLAN_DISPLAY_ASPECT_RATIO } from "@/lib/menu-floor-plan";
import {
  groupOperationHistory,
  getHistoryPlacements,
  type OperationHistoryRecord,
  type OperationsFloorPlan,
} from "@/lib/operations-history";

export default function OperationsHistoryViews({
  noun,
  records,
  floorPlan,
  renderList,
  renderDetail,
}: {
  noun: "주문" | "호출";
  records: OperationHistoryRecord[];
  floorPlan: OperationsFloorPlan;
  renderList: (open: (recordId: string) => void) => ReactNode;
  renderDetail: (recordIds: string[]) => ReactNode;
}) {
  const [view, setView] = useState("map"),
    [roomId, setRoomId] = useState("");
  const [selection, setSelection] = useState<
    { pointId: string } | { recordId: string } | null
  >(null);
  const groups = groupOperationHistory(records),
    placements = getHistoryPlacements(floorPlan);
  const room =
    floorPlan.document.rooms.find((item) => item.id === roomId) ??
    floorPlan.document.rooms[0];
  const placedIds = new Set(placements.map((item) => item.pointId));
  const unplaced = [...groups].filter(([id]) => !placedIds.has(id));
  const selected = selection
    ? "pointId" in selection
      ? (groups.get(selection.pointId) ?? [])
      : records.filter((item) => item.id === selection.recordId)
    : [];
  const openPoint = (pointId: string) => setSelection({ pointId });
  return (
    <div className="site-stack-group">
      <Tabs purpose="state" value={view} onValueChange={setView}>
        <div className="site-field-stack">
          <span className="type-label">보기 유형</span>
          <TabsList aria-label={`${noun} 내역 보기 유형`}>
            <TabsTrigger value="map">
              <Map aria-hidden="true" />
              배치도형
            </TabsTrigger>
            <TabsTrigger value="list">
              <List aria-hidden="true" />
              리스트형
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="list">
          {renderList((recordId) => setSelection({ recordId }))}
        </TabsContent>
        <TabsContent value="map">
          <div className="site-stack-group">
            <p className="type-body-sm site-copy-muted">
              최근 100건 중 현재 조건에 맞는 내역입니다. 테이블·키오스크를
              선택하면 상품·요청과 처리 내역 전체를 확인할 수 있습니다.
            </p>
            {!floorPlan.available ? (
              <ContentPanel surface="notice" density="compact">
                <p role="status" className="type-body-sm">
                  {floorPlan.unavailableMessage}
                </p>
              </ContentPanel>
            ) : !room ? (
              <ContentPanel surface="muted">
                <div className="site-stack-title">
                  <h3 className="type-content-title">
                    저장된 룸 배치도가 없습니다.
                  </h3>
                  <p className="type-body-sm site-copy-muted">
                    테이블·키오스크 관리에서 룸과 배치를 저장하면 같은 배치도가
                    표시됩니다. 현재 내역은 아래에서 바로 확인할 수 있습니다.
                  </p>
                </div>
              </ContentPanel>
            ) : (
              <Tabs
                purpose="section"
                appearance="document"
                value={room.id}
                onValueChange={setRoomId}
              >
                <TabsList size="sm" aria-label={`${noun} 내역 룸`}>
                  {floorPlan.document.rooms.map((item) => (
                    <TabsTrigger key={item.id} value={item.id}>
                      {item.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
                <TabsContent value={room.id}>
                  <section className="site-stack-group" aria-label={`${room.name} ${noun} 배치도`}>
                    <p className="type-body-sm site-copy-muted">
                      각 사각형에는 처리할 {noun}을 우선 요약하고 건수를
                      표시합니다. 표시 내역이 없는 경우에도 실제 이용 중 여부를
                      뜻하지 않습니다.
                    </p>
                    <FloorPlanCanvas
                      name={room.name}
                      aspectRatio={FLOOR_PLAN_DISPLAY_ASPECT_RATIO}
                    >
                      {placements
                        .filter((item) => item.roomId === room.id)
                        .map((placement) => {
                          const point = floorPlan.points.find(
                            (item) => item.id === placement.pointId,
                          )!;
                          const history = groups.get(point.id) ?? [],
                            latest =
                              history.find((item) => item.attention) ??
                              history[0];
                          const count = history.filter(
                            (item) => item.attention,
                          ).length;
                          const summary = latest ? (
                            <>
                              <span>
                                {count
                                  ? `처리할 ${noun} ${count}건`
                                  : `${noun} ${history.length}건`}
                              </span>
                              <span>{latest.status}</span>
                              <span>{latest.summary}</span>
                              {latest.options ? (
                                <span>{latest.options}</span>
                              ) : null}
                              <span>{latest.time}</span>
                              {history.length > 1 ? (
                                <span>
                                  외 {history.length - 1}건 · 눌러서 전체 보기
                                </span>
                              ) : null}
                            </>
                          ) : (
                            <span>표시 내역 없음</span>
                          );
                          return (
                            <FloorPlanObject
                              key={point.id}
                              rect={placement}
                              label={point.label}
                              typeLabel={
                                point.kind === "kiosk" ? "키오스크" : "테이블"
                              }
                              icon={
                                point.kind === "kiosk" ? (
                                  <Monitor />
                                ) : (
                                  <Armchair />
                                )
                              }
                              disabled={point.status !== "active"}
                              selected={Boolean(
                                selection &&
                                  "pointId" in selection &&
                                  selection.pointId === point.id,
                              )}
                              summary={summary}
                              onClick={() => openPoint(point.id)}
                              onKeyDown={(event) => {
                                if (
                                  event.key === "Enter" ||
                                  event.key === " "
                                ) {
                                  event.preventDefault();
                                  openPoint(point.id);
                                }
                              }}
                            />
                          );
                        })}
                    </FloorPlanCanvas>
                  </section>
                </TabsContent>
              </Tabs>
            )}
            {unplaced.length ? (
              <ContentPanel aria-label={`배치되지 않은 ${noun} 내역`}>
                <div className="site-stack-title">
                  <h3 className="type-content-title">
                    {floorPlan.available
                      ? "배치도에 없는 테이블·키오스크 내역"
                      : "테이블·키오스크별 내역"}
                  </h3>
                  <p className="type-body-sm site-copy-muted">
                    룸에 배치하지 않았거나 보관된 항목의 내역도 확인할 수
                    있습니다.
                  </p>
                </div>
                <div className="site-action-row">
                  {unplaced.map(([pointId, history]) => (
                    <button
                      type="button"
                      key={pointId}
                      className="site-button site-button-outline"
                      onClick={() => openPoint(pointId)}
                    >
                      {history[0].pointLabel} · {history.length}건
                    </button>
                  ))}
                </div>
              </ContentPanel>
            ) : null}
            {!records.length ? (
              <p className="type-body-sm site-copy-muted" role="status">
                표시할 {noun} 내역이 없습니다.
              </p>
            ) : null}
          </div>
        </TabsContent>
      </Tabs>
      <Dialog
        open={selection !== null}
        onOpenChange={(open) => {
          if (!open) setSelection(null);
        }}
      >
        <DialogContent scrollable className="print:hidden">
          <DialogHeader reserveCloseButton>
            <DialogTitle>
              {selected[0]?.pointLabel ?? "테이블·키오스크"} {noun} 내역
            </DialogTitle>
            <DialogDescription>
              현재 조회 조건에 맞는 내역입니다. 상태는 15초마다 갱신됩니다.
            </DialogDescription>
          </DialogHeader>
          {selected.length ? (
            renderDetail(selected.map((item) => item.id))
          ) : (
            <p className="type-body-sm site-copy-muted">
              현재 조건에 맞는 내역이 없습니다.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
