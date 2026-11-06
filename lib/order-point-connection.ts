import { ORDER_POINT_CONNECTION_REQUIRED, ORDER_POINT_CONNECTION_UNKNOWN } from "./order-point-policy";
import type { TerminalDeviceInfo } from "./terminal-device-info";

export type OrderPointConnectionState = { available: boolean; connections: { tableId: string; device: TerminalDeviceInfo | null }[] };
export function orderPointTerminalConnectionReason(id: string, state?: OrderPointConnectionState): string | null {
  if (!state?.available) return ORDER_POINT_CONNECTION_UNKNOWN;
  return state.connections.some(connection => connection.tableId === id) ? null : ORDER_POINT_CONNECTION_REQUIRED;
}
export function orderPointConnectionLabel(id: string, state?: OrderPointConnectionState): string {
  if (!state?.available) return "확인 불가";
  return state.connections.some(connection => connection.tableId === id) ? "연결됨" : "미연결";
}
