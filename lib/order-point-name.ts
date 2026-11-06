import type { OrderPointKind } from "./order-point-policy";
export const ORDER_POINT_DUPLICATE_NAME_MESSAGE = "이미 사용 중인 이름입니다. 다른 이름으로 변경해 주세요.";
export type OrderPointLabelError = { value: string; message: string };
type NamedPoint = { id: string; label: string; kind?: OrderPointKind };
export const orderPointNameKey = (name: string) => name.trim().toLowerCase();
/** Match the operating-name unique index: menu scope is supplied by the caller, and kind stays separate. */
export function getOrderPointNameError(point: NamedPoint, operatingPoints: readonly NamedPoint[]): string | undefined {
  const key = orderPointNameKey(point.label);
  return key && operatingPoints.some(other => other.id !== point.id && (other.kind ?? "table") === (point.kind ?? "table") && orderPointNameKey(other.label) === key) ? ORDER_POINT_DUPLICATE_NAME_MESSAGE : undefined;
}
