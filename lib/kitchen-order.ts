export const KITCHEN_ACTIVE_STATUSES = ["received", "accepted", "cooking", "ready"] as const;
export const KITCHEN_ORDER_STATUSES = [...KITCHEN_ACTIVE_STATUSES, "served"] as const;
type KitchenStatus = (typeof KITCHEN_ORDER_STATUSES)[number];

export type KitchenAction = "start" | "check" | "finish" | "return";
export type KitchenMenuSource = {
  id: string;
  sortOrder: number;
  category: { id: string; name: string; sortOrder: number } | null;
};

export type KitchenOrderOption = { groupName: string; valueName: string; kind?: "price" | "product" | "request" };

export type KitchenOrderItem = {
  id: string;
  name: string;
  quantity: number;
  options: KitchenOrderOption[];
  priceNote?: string | null;
  done: boolean;
  lineTotal: number;
  menuSource?: KitchenMenuSource;
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

export function getKitchenStage(status: KitchenStatus): KitchenStage {
  if (status === "received" || status === "accepted") return "before";
  return status === "served" ? "ready" : status;
}

export function getKitchenOptionLabels(options: KitchenOrderOption[]) {
  const product = options.filter(option => option.kind === "product").map(option => option.valueName).join(", ");
  const request = options.filter(option => option.kind === "request").map(option => option.valueName).join(", ");
  return {
    product: request ? `${product}(${request})` : product,
    price: options.filter(option => !option.kind || option.kind === "price").map(option => option.valueName).join(", "),
  };
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

export type KitchenMenuGroup = {
  id: string;
  name: string;
  items: { key: string; name: string }[];
};

export function kitchenMenuKey(item: Pick<KitchenOrderItem, "name" | "menuSource">) {
  return item.menuSource ? `menu:${item.menuSource.id}` : `name:${item.name}`;
}

export function getKitchenMenuGroups(orders: readonly KitchenOrder[]): KitchenMenuGroup[] {
  const groups = new Map<string, {
    id: string;
    name: string;
    sortOrder: number;
    items: Map<string, { key: string; name: string; sortOrder: number }>;
  }>();
  for (const order of orders) {
    for (const item of order.items) {
      const category = item.menuSource?.category;
      const id = category?.id ?? "uncategorized";
      let group = groups.get(id);
      if (!group) {
        group = { id, name: category?.name ?? "분류 없음", sortOrder: category?.sortOrder ?? Infinity, items: new Map() };
        groups.set(id, group);
      }
      const key = kitchenMenuKey(item);
      if (!group.items.has(key)) group.items.set(key, { key, name: item.name, sortOrder: item.menuSource?.sortOrder ?? Infinity });
    }
  }
  const compare = (a: {sortOrder: number; name: string}, b: {sortOrder: number; name: string}) =>
    (a.sortOrder - b.sortOrder) || a.name.localeCompare(b.name, "ko");
  return [...groups.values()].sort(compare).map(group => ({
    id: group.id,
    name: group.name,
    items: [...group.items.values()].sort(compare).map(({ key, name }) => ({ key, name })),
  }));
}
