import type { StaffCallItem } from "./call-items";

/** Sample choices only. Saved store call settings are never replaced. */
export function getPreviewStaffCallItems(service: "basic" | "dining"): StaffCallItem[] {
  const choices = service === "dining"
    ? [["order", "주문 요청"], ["payment", "계산 요청"], ["wine", "와인 문의"], ["water", "물 요청"], ["staff", "직원 호출"]]
    : [["water", "물 요청"], ["tableware", "식기 요청"], ["table_cleanup", "테이블 정리"], ["payment", "계산 요청"], ["staff", "직원 호출"]];
  return choices.map(([key, label], sortOrder) => ({ key, label, sortOrder, active: true }));
}
