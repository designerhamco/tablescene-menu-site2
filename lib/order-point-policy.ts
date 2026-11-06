/** A physical table and a numbered kiosk share reception infrastructure, not identity. */
export type OrderPointKind = "table" | "kiosk";
export type OrderPointChannel = "terminal" | "customer";
export type OrderPointFeature = "orders" | "calls";
export type OrderPointPolicy = {
  terminalOrderEnabled: boolean;
  terminalCallEnabled: boolean;
  customerOrderEnabled: boolean;
  customerCallEnabled: boolean;
};
export const DEFAULT_ORDER_POINT_POLICY: OrderPointPolicy = {
  terminalOrderEnabled: true, terminalCallEnabled: true,
  customerOrderEnabled: true, customerCallEnabled: true,
};
export const ORDER_POINT_POLICY_COLUMNS = {
  terminalOrderEnabled: "terminal_order_enabled", terminalCallEnabled: "terminal_call_enabled",
  customerOrderEnabled: "customer_order_enabled", customerCallEnabled: "customer_call_enabled",
} as const;
export function orderPointKind(value: unknown): OrderPointKind {
  return value === "kiosk" ? "kiosk" : "table";
}
export function readOrderPointPolicy(row: Record<string, unknown>): OrderPointPolicy {
  return Object.fromEntries(Object.entries(ORDER_POINT_POLICY_COLUMNS).map(([key, column]) => [key, typeof row[column] === "boolean" ? row[column] : true])) as OrderPointPolicy;
}
export function orderPointPolicyKey(channel: OrderPointChannel, feature: OrderPointFeature): keyof OrderPointPolicy {
  return `${channel}${feature === "orders" ? "Order" : "Call"}Enabled`;
}
export function isOrderPointChannelAllowed(kind: OrderPointKind, policy: OrderPointPolicy, channel: OrderPointChannel, feature: OrderPointFeature) {
  return !(kind === "kiosk" && channel !== "terminal") && policy[orderPointPolicyKey(channel, feature)];
}

export type OrderPointFeatureUpdateInput = { menuSiteId: string; tableId: string; channel: OrderPointChannel; feature: OrderPointFeature; enabled: boolean; expectedEnabled: boolean; expectedStatus?: "active" | "disabled" };
export type OrderPointFeatureUpdate = (input: OrderPointFeatureUpdateInput) => Promise<{ status: "success" | "error"; message: string }>;

export const ORDER_POINT_CONNECTION_REQUIRED = "먼저 ‘연결하기’에서 사용할 기기를 연결해 주세요. 연결 후 태블릿·키오스크 주문과 호출을 켤 수 있습니다.";
export const ORDER_POINT_CONNECTION_UNKNOWN = "기기 연결 상태를 확인하지 못했습니다. 새로고침 후 다시 확인해 주세요.";
