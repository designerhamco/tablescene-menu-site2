"use client";
import type { ReactNode } from "react";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/app/components/ui/table";
import { getOperationHistoryRows, type OperationsFloorPlan } from "@/lib/operations-history";
import type { OperationRecordSources } from "@/lib/all-menu-operations";

/** The same flat management table as table/QR management, including empty results. */
export default function OperationsHistoryTable<T extends { id: string; tableId: string; tableLabel: string }>({ noun, label, floorPlan, records, renderRecord, includeEmptyPoints = true, recordSources }: {
  noun: "주문" | "호출"; label?: string; includeEmptyPoints?: boolean; floorPlan: OperationsFloorPlan; records: readonly T[];
  recordSources?: OperationRecordSources;
  renderRecord: (record: T) => ReactNode;
}) {
  const rows = getOperationHistoryRows(floorPlan, records).filter(row => includeEmptyPoints || row.record !== null);
  return <Table variant="management" label={label ?? `${noun} 내역`} columns={[...(recordSources ? ["text" as const] : []), "text", "text", "compact", "detail", "text", "text", "actions"]}>
    <TableHeader><TableRow>{[...(recordSources ? ["메뉴판 이름"] : []), "룸 이름", "테이블·키오스크", `${noun} 번호`, `${noun} 내역`, `${noun} 시간`, "처리 상태", "관리"].map(title => <TableHead key={title}>{title}</TableHead>)}</TableRow></TableHeader>
    <TableBody>{rows.length ? rows.map(row => <TableRow key={row.key}>
      {recordSources ? <TableCell>{row.record ? recordSources[row.record.id]?.menuSiteName ?? "확인 불가" : "—"}</TableCell> : null}
      <TableCell>{row.record && recordSources ? recordSources[row.record.id]?.roomName ?? "확인 불가" : row.roomName}</TableCell><TableCell primary>{row.pointLabel}</TableCell>
      {row.record ? renderRecord(row.record) : <><TableCell>—</TableCell><TableCell><span className="site-copy-muted">{noun} 내역 없음</span></TableCell><TableCell>—</TableCell><TableCell>—</TableCell><TableCell>—</TableCell></>}
    </TableRow>) : <TableRow><TableCell colSpan={recordSources ? 8 : 7}><p className="type-body-sm site-copy-muted" role="status">표시할 {noun} 내역이 없습니다.</p></TableCell></TableRow>}</TableBody>
  </Table>;
}
