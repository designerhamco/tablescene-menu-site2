"use client";
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import OperationsHistoryViews from "@/components/mypage/OperationsHistoryViews";
import { ContentPanel } from "@/app/components/ui/content-panel";
import { TableCell } from "@/app/components/ui/table";
import OperationsHistoryTable from "@/components/mypage/OperationsHistoryTable";
import { Badge } from "@/app/components/ui/badge";
import type {
  OperationsFloorPlan,
  OperationHistoryRecord,
} from "@/lib/operations-history";
const room = "11111111-1111-4111-8111-111111111111";
const records: OperationHistoryRecord[] = [
  {
    id: "sample-order",
    pointId: "22222222-2222-4222-8222-222222222222",
    pointLabel: "테이블 1",
    summary: "바닐라 라떼 × 2",
    options: "우유: 오트 · 온도: ICE",
    time: "12:23",
    status: "조리 중 · 미결제",
    attention: true,
  },
  {
    id: "sample-kiosk",
    pointId: "33333333-3333-4333-8333-333333333333",
    pointLabel: "키오스크 1",
    summary: "아메리카노 × 1",
    options: "온도: HOT",
    time: "12:20",
    status: "서빙 완료 · 결제 완료",
    attention: false,
  },
];
const floorPlan: OperationsFloorPlan = {
  available: true,
  revision: 1,
  document: {
    rooms: [{ id: room, name: "홀 예시", aspectRatio: 1.33 }],
    placements: records.map((record, index) => ({
      pointId: record.pointId,
      roomId: room,
      x: index ? 55 : 8,
      y: 12,
      width: 34,
      height: 42,
    })),
  },
  points: records.map((record, index) => ({
    id: record.pointId,
    label: record.pointLabel,
    kind: index ? "kiosk" : "table",
    status: "active",
  })),
};
export default function OperationsHistoryExample() {
  const [result, setResult] = useState("orders");
  const shown = result === "empty" ? [] : records;
  return <div className="site-stack-group">
    <Tabs purpose="state" value={result} onValueChange={setResult}><TabsList size="sm" aria-label="운영 내역 예시 데이터"><TabsTrigger value="orders">주문 있음</TabsTrigger><TabsTrigger value="empty">주문 없음</TabsTrigger></TabsList></Tabs>

    <OperationsHistoryViews
      noun="주문"
      records={shown}
      floorPlan={floorPlan}
      renderList={(open) => <OperationsHistoryTable noun="주문" label="운영 주문 내역 예시" floorPlan={floorPlan} records={shown.map(record => ({ ...record, tableId: record.pointId, tableLabel: record.pointLabel }))} renderRecord={record => <>
        <TableCell>예시</TableCell><TableCell><div className="site-stack-copy"><p>{record.summary}</p><p className="site-copy-muted">{record.options}</p></div></TableCell><TableCell>{record.time}</TableCell><TableCell><Badge>{record.status}</Badge></TableCell><TableCell><button type="button" className="site-button site-button-outline site-button-compact" onClick={() => open(record.id)}>상세 보기</button></TableCell>
      </>} />}
      renderDetail={(ids) => (
        <div className="site-stack-group">
          {records
            .filter((record) => ids.includes(record.id))
            .map((record) => (
              <ContentPanel key={record.id}>
                <h3 className="type-content-title">{record.summary}</h3>
                <p className="type-body-sm">{record.options}</p>
                <p className="type-caption site-copy-muted">{record.time}</p>
                <Badge>{record.status}</Badge>
              </ContentPanel>
            ))}
        </div>
      )}
    />
  </div>;
}
