export const KITCHEN_ORDER_STATUSES = ["received", "accepted", "cooking", "ready"] as const;
type KitchenStatus = (typeof KITCHEN_ORDER_STATUSES)[number];

export type KitchenAction = "start" | "check" | "finish" | "return";
export type KitchenOrderItem = {
  id: string;
  name: string;
  quantity: number;
  options: { groupName: string; valueName: string }[];
  done: boolean;
  lineTotal: number;
};
export type KitchenOrder = {
  id: string;
  orderNumber: number;
  tableId: string;
  totalAmount: number;
  paymentStatus: string;
  tableLabel: string;
  status: KitchenStatus;
  createdAt: string;
  requestText: string | null;
  items: KitchenOrderItem[];
};

export const KITCHEN_STAGES = ["before", "cooking", "ready"] as const;
export const KITCHEN_STAGE_LABELS = { before: "조리전", cooking: "조리중", ready: "조리완료" } as const;

export function getKitchenStage(status: KitchenStatus) {
  return status === "received" || status === "accepted" ? "before" : status;
}

export function canFinishKitchenOrder(order: Pick<KitchenOrder, "status" | "items">) {
  return order.status === "cooking" && order.items.length > 0 && order.items.every(item => item.done);
}

export const KITCHEN_SELECTION_LIMIT = 50;
export const KITCHEN_STAGE_ACTIONS = { before: "return", cooking: "start", ready: "finish" } as const;
export const KITCHEN_ACTION_LABELS = { start: "조리중 처리", finish: "조리완료 처리", return: "조리전 처리" } as const;
export type KitchenStage = (typeof KITCHEN_STAGES)[number];
export type KitchenStageAction = Exclude<KitchenAction, "check">;
export type KitchenMutation = { menuSiteId: string } & (
  | { orderIds: string[]; action: KitchenStageAction }
  | { orderIds: [string]; action: "check"; itemId: string; checked: boolean }
);

export function canChangeKitchenStage(order: KitchenOrder, action: KitchenStageAction) {
  if (action === "finish") return canFinishKitchenOrder(order);
  if (action === "return") return order.status === "cooking" && order.items.every(item => !item.done);
  return getKitchenStage(order.status) === "before";
}
