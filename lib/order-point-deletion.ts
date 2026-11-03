export type OrderPointDeletionSummary = {
  id: string; label: string; kind: "table" | "kiosk"; status: "active" | "disabled" | "archived"; fingerprint: string;
  orderCount: number; callCount: number; visitCount: number; connectionCount: number; itemCount: number; optionCount: number;
  pendingOrderCount: number; pendingCallCount: number; collectedAmount: number; monthCollectedAmount: number; todayCollectedAmount: number;
};
const countFields = ["orderCount", "callCount", "visitCount", "connectionCount", "itemCount", "optionCount", "pendingOrderCount", "pendingCallCount", "collectedAmount", "monthCollectedAmount", "todayCollectedAmount"] as const;
export function parseOrderPointDeletionSummary(value: unknown): OrderPointDeletionSummary {
  if (!value || typeof value !== "object") throw new Error("삭제 범위를 확인하지 못했습니다.");
  const row = value as Record<string, unknown>;
  if (typeof row.id !== "string" || typeof row.label !== "string" || !["table", "kiosk"].includes(String(row.kind))
    || !["active", "disabled", "archived"].includes(String(row.status)) || typeof row.fingerprint !== "string" || !/^[a-f0-9]{32}$/.test(row.fingerprint)
    || countFields.some(key => !Number.isSafeInteger(row[key]) || Number(row[key]) < 0)) throw new Error("삭제 범위를 확인하지 못했습니다.");
  // Copy only the allowed aggregate DTO; never send guest/order contents or session credentials.
  return Object.fromEntries(["id", "label", "kind", "status", "fingerprint", ...countFields].map(key => [key, row[key]])) as OrderPointDeletionSummary;
}
export function orderPointDeletionBlock(summary: OrderPointDeletionSummary, withHistory: boolean): string | null {
  if (!withHistory) return summary.orderCount || summary.callCount || summary.visitCount ? "사용 이력이 있어 일반 삭제할 수 없습니다. 운영 목록에서 빼려면 보관해 주세요." : null;
  if (summary.status !== "archived") return "먼저 보관한 뒤 관련 데이터를 영구 삭제할 수 있습니다.";
  if (summary.pendingOrderCount || summary.pendingCallCount) return "처리 중인 주문·호출 또는 미결제 주문이 남아 있습니다. 해당 내역을 먼저 정리해 주세요.";
  return null;
}
