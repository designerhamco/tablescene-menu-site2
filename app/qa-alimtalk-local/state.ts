import "server-only";

import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import type { OrderDashboardOrder } from "@/lib/server/order-management-service";
import type { OrderAlimtalkAttempt } from "@/lib/order-ready-alimtalk";

type DemoEntry = { attempt?: OrderAlimtalkAttempt; served?: boolean };
type DemoState = Record<string, DemoEntry>;
const cookieName = "qa-alimtalk-local";
const samples = [
  { number: 201, name: "바질 크림 파스타", phone: "010-****-**24", status: "ready", price: 14500 },
  { number: 202, name: "토마토 파스타", phone: "010-****-**81", status: "ready", price: 13900 },
  { number: 203, name: "레몬 에이드", phone: null, status: "ready", price: 5500 },
  { number: 204, name: "그릴 치킨 샐러드", phone: "010-****-**35", status: "cooking", price: 12500 },
] as const;

export async function readDemo() {
  const jar = await cookies();
  let state: DemoState = {};
  try { state = JSON.parse(jar.get(cookieName)?.value ?? "{}"); } catch { /* Start the preview again. */ }
  return {
    state,
    save(next: DemoState) { jar.set(cookieName, JSON.stringify(next), { httpOnly: true, sameSite: "strict", path: "/qa-alimtalk-local" }); },
    reset() { jar.set(cookieName, "", { maxAge: 0, path: "/qa-alimtalk-local" }); },
  };
}

export const points = samples.map((sample, index) => ({
  id: String(sample.number), label: `테이블 ${index + 1}`, status: "active" as const,
}));

export function getOrders(state: DemoState): OrderDashboardOrder[] {
  return samples.map((sample, i) => {
    const point = points[i];
    const data = state[point.id];
    const status = data?.served ? "served" : sample.status;
    const time = new Date(Date.now() - (i + 1) * 60_000).toISOString();
    return {
      id: point.id, orderNumber: sample.number, tableId: point.id, tableLabel: point.label,
      status, nextStatus: status === "ready" ? "served" : null,
      paymentStatus: "unpaid", paymentMethod: null, requestText: null, totalAmount: sample.price, currency: "KRW",
      createdAt: time, updatedAt: time, statusUpdatedBy: null, paymentCompletedBy: null, paymentCompletedAt: null,
      cancellationReason: null, canCancelUnpaid: false, canMarkManualPayment: status === "served",
      alimtalk: { maskedPhone: sample.phone, attempt: data?.attempt ?? null },
      items: [{
        id: `item-${sample.number}`, name: sample.name, basePrice: sample.price, optionPrice: 0,
        unitPrice: sample.price, quantity: 1, lineTotal: sample.price, cookingDone: status !== "cooking", options: [],
      }],
    };
  });
}

export async function demoAlimtalk({ orderId, expectedAttemptId, intent }: import("@/lib/order-ready-alimtalk").OrderAlimtalkRequest) {
  const { state, save } = await readDemo();
  const order = getOrders(state).find(row => row.id === orderId);
  if (!order) return { error: "샘플 주문이 없습니다." };
  const current = order.alimtalk?.attempt;
  if (current && current.id !== expectedAttemptId) return { attempt: current };
  const number = (current?.number ?? 0) + 1;
  let attempt: OrderAlimtalkAttempt;
  if (intent === "check") {
    if (!current) return { error: "확인할 발송 결과가 없습니다." };
    if (current.status !== "pending") return { attempt: current };
    attempt = { ...current, status: orderId === "202" && current.number === 1 ? "failed" : "sent" };
  } else {
    if (order.status !== "ready" || !order.alimtalk?.maskedPhone) return { error: "연락처가 있는 조리완료 주문만 발송할 수 있습니다." };
    if (current?.status === "pending") return { attempt: current };
    attempt = { id: randomUUID(), number, status: "pending" };
  }
  save({ ...state, [orderId]: { ...state[orderId], attempt } });
  return { attempt };
}
