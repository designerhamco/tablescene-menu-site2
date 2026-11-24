export type OrderSettlementGroup = {
  id: string;
  tableIds: string[];
};

export type OrderSettlementIntent = {
  action: "combine" | "release" | "pay";
  groupId?: string;
  tableLabels: string[];
  tableIds: string[];
  orderIds: string[];
  total: number;
};
