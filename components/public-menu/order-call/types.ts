export type OrderCallEntryMode = "locked" | "preview" | "active";

export type OrderCallEntryConfig = {
  mode: OrderCallEntryMode;
  orderEnabled: boolean;
  callEnabled: boolean;
  hasValidTableSession: boolean;
  orderingOpen: boolean;
  languageSlotEnabled: boolean;
  storeName?: string;
  tableLabel?: string;
  cartCount?: number;
};

export const LOCKED_ORDER_CALL_ENTRY_CONFIG: OrderCallEntryConfig = {
  mode: "locked",
  orderEnabled: false,
  callEnabled: false,
  hasValidTableSession: false,
  orderingOpen: false,
  languageSlotEnabled: false,
};

export function getLockedOrderCallEntryConfig(
  config: Pick<OrderCallEntryConfig, "storeName"> = {}
): OrderCallEntryConfig {
  return {
    ...LOCKED_ORDER_CALL_ENTRY_CONFIG,
    ...config,
  };
}

