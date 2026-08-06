export type OrderCallEntryMode = "locked" | "preview" | "active";

export type PostpayOrderCatalogOptionValue = {
  id: string;
  name: string;
  priceDelta: number;
};

export type PostpayOrderCatalogOptionGroup = {
  id: string;
  name: string;
  isRequired: boolean;
  minSelections: number;
  maxSelections: number;
  values: PostpayOrderCatalogOptionValue[];
};

export type PostpayOrderCatalogItem = {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  optionGroups: PostpayOrderCatalogOptionGroup[];
};

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
  menuSiteId?: string;
  cartScope?: string;
  orderCatalog?: PostpayOrderCatalogItem[];
};

export type OrderCallEntryVisibility = {
  showHeader: boolean;
  showLanguage: boolean;
  showTableLabel: boolean;
  showCall: boolean;
  showCart: boolean;
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

export function getOrderCallEntryVisibility(config: OrderCallEntryConfig): OrderCallEntryVisibility {
  const showHeader = config.mode !== "locked";
  const hasValidTableSession = showHeader && config.hasValidTableSession;

  return {
    showHeader,
    showLanguage: showHeader && config.languageSlotEnabled,
    showTableLabel: hasValidTableSession && Boolean(config.tableLabel?.trim()),
    showCall: hasValidTableSession && config.callEnabled,
    showCart: hasValidTableSession && config.orderEnabled && config.orderingOpen,
  };
}
