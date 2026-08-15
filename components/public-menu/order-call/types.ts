export type OrderCallEntryMode = "locked" | "preview" | "active";
export type OrderCheckoutMode = "postpay" | "prepay";

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
  checkoutMode?: OrderCheckoutMode;
  checkoutModes?: OrderCheckoutMode[];
  previewOnly?: boolean;
};

export type OrderCallEntryVisibility = {
  showHeader: boolean;
  showLanguage: boolean;
  showTableLabel: boolean;
  showCall: boolean;
  showCart: boolean;
};

export type PublicOrderCallCapabilityState = {
  supportsExperience: boolean;
  orderEnabled: boolean;
  callEnabled: boolean;
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

export function supportsOrderCallExperienceShell(templateKey: string | null | undefined) {
  return templateKey !== "display_menu_a";
}

export function getPublicOrderCallCapabilityState({
  templateKey,
  planType,
  hasValidTableSession,
  postpayOrderRuntimeEnabled,
  callRuntimeEnabled,
}: {
  templateKey: string | null | undefined;
  planType: string | null | undefined;
  hasValidTableSession: boolean;
  postpayOrderRuntimeEnabled: boolean;
  callRuntimeEnabled: boolean;
}): PublicOrderCallCapabilityState {
  const supportsExperience = supportsOrderCallExperienceShell(templateKey);
  const canUseBusinessTableFeatures = supportsExperience
    && hasValidTableSession
    && planType === "business_basic";

  return {
    supportsExperience,
    orderEnabled: canUseBusinessTableFeatures && postpayOrderRuntimeEnabled,
    callEnabled: canUseBusinessTableFeatures && callRuntimeEnabled,
  };
}

export function buildPublicOrderCallEntryConfig({
  capabilityState,
  menuSiteId,
  storeName,
  tableSession,
  cartScope,
  orderCatalog,
}: {
  capabilityState: PublicOrderCallCapabilityState;
  menuSiteId: string;
  storeName: string;
  tableSession: { id: string; tableLabel: string } | null;
  cartScope: string | undefined;
  orderCatalog: PostpayOrderCatalogItem[];
}): OrderCallEntryConfig | undefined {
  if (!capabilityState.supportsExperience || !tableSession) return undefined;

  return {
    mode: "active",
    orderEnabled: capabilityState.orderEnabled,
    callEnabled: capabilityState.callEnabled,
    hasValidTableSession: true,
    orderingOpen: capabilityState.orderEnabled,
    languageSlotEnabled: true,
    storeName,
    tableLabel: tableSession.tableLabel,
    menuSiteId,
    cartScope,
    orderCatalog,
  };
}
