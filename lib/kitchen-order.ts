export const KITCHEN_ORDER_STATUSES = ["received", "accepted", "cooking", "ready"] as const;
type KitchenStatus = (typeof KITCHEN_ORDER_STATUSES)[number];

export type KitchenAction = "start" | "check" | "finish";
export type KitchenOrderItem = {
  id: string;
  name: string;
  quantity: number;
  options: { groupName: string; valueName: string }[];
  done: boolean;
};
export type KitchenOrder = {
  id: string;
  orderNumber: number;
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
