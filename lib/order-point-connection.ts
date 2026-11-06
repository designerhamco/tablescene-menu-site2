import { ORDER_POINT_CONNECTION_REQUIRED, ORDER_POINT_CONNECTION_UNKNOWN, type OrderPointKind, type OrderPointPolicy, type OrderPointFeature } from "./order-point-policy";
import type { TerminalDeviceInfo } from "./terminal-device-info";

export type OrderPointConnectionState = { available: boolean; connections: { tableId: string; device: TerminalDeviceInfo | null }[] };
export function orderPointTerminalConnectionReason(id: string, state?: OrderPointConnectionState): string | null {
  if (!state?.available) return ORDER_POINT_CONNECTION_UNKNOWN;
  return state.connections.some(connection => connection.tableId === id) ? null : ORDER_POINT_CONNECTION_REQUIRED;
}
export type OrderPointConnectionPoint = { id: string; kind?: OrderPointKind; status: string; policyAvailable?: boolean; policy?: OrderPointPolicy };
export type OrderPointConnectRequest = { feature: OrderPointFeature; expectedEnabled: boolean; expectedStatus: "active" | "disabled" };
export type OrderPointConnectHandler = (id: string, request?: OrderPointConnectRequest) => void;
/** Match effective switches: a disconnected shop channel cannot receive requests. */
export function orderPointUsesMobileOnly(point: OrderPointConnectionPoint, state?: OrderPointConnectionState): boolean {
  if (!state?.available || point.kind === "kiosk" || point.status !== "active" || !point.policyAvailable || !point.policy) return false;
  const mobile = point.policy.customerOrderEnabled || point.policy.customerCallEnabled;
  const terminal = state.connections.some(connection => connection.tableId === point.id) && (point.policy.terminalOrderEnabled || point.policy.terminalCallEnabled);
  return mobile && !terminal;
}
export function orderPointConnectionLabel(point: OrderPointConnectionPoint, state?: OrderPointConnectionState): string {
  if (!state?.available) return "확인 불가";
  if (orderPointUsesMobileOnly(point, state)) return "해당 없음";
  return state.connections.some(connection => connection.tableId === point.id) ? "연결됨" : "미연결";
}
