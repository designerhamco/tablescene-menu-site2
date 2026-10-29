export type MenuOrderSettings = {
  orderEnabled: boolean;
  callEnabled: boolean;
  mobilePrepayVisible: boolean;
  postpayEnabled: boolean;
  orderableCourseIds: string[];
  customerCheckout?: "off" | "postpay" | "prepay" | "both";
  terminalOrderEnabled?: boolean;
  customerPhone?: "required" | "optional" | "hidden";
};
export const DEFAULT_MENU_ORDER_SETTINGS: MenuOrderSettings = {
  orderEnabled: false,
  callEnabled: false,
  mobilePrepayVisible: false,
  postpayEnabled: true,
  orderableCourseIds: [],
};
export const MENU_PREPAY_READY = false;
export type MenuOrderSettingsSection = "orders" | "calls";

export function mergeMenuOrderSettingsSection(
  current: MenuOrderSettings,
  next: MenuOrderSettings,
  section: MenuOrderSettingsSection,
): MenuOrderSettings {
  return section === "calls"
    ? { ...current, callEnabled: next.callEnabled }
    : { ...current, orderEnabled: next.orderEnabled, postpayEnabled: true,
        mobilePrepayVisible: next.mobilePrepayVisible,
        ...(next.customerCheckout !== undefined ? { customerCheckout: next.customerCheckout } : {}),
        ...(next.terminalOrderEnabled !== undefined ? { terminalOrderEnabled: next.terminalOrderEnabled } : {}),
        ...(next.customerPhone !== undefined ? { customerPhone: next.customerPhone } : {}),
      };
}
export function readMenuOrderSettings(settings: unknown): MenuOrderSettings {
  const root =
    settings && typeof settings === "object" && !Array.isArray(settings)
      ? (settings as Record<string, unknown>)
      : {};
  const value =
    root.table_order &&
    typeof root.table_order === "object" &&
    !Array.isArray(root.table_order)
      ? (root.table_order as Record<string, unknown>)
      : {};
  const ids = Array.isArray(value.orderableCourseIds)
    ? value.orderableCourseIds.filter(
        (id): id is string =>
          typeof id === "string" &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            id,
          ),
      )
    : [];
  return {
    orderEnabled: value.orderEnabled === true,
    callEnabled: value.callEnabled === true,
    mobilePrepayVisible: value.mobilePrepayVisible === true,
    postpayEnabled: value.postpayEnabled !== false,
    orderableCourseIds: [...new Set(ids)],
    customerCheckout: ["off", "postpay", "prepay", "both"].includes(String(value.customerCheckout))
      ? value.customerCheckout as MenuOrderSettings["customerCheckout"]
      : value.mobilePrepayVisible === true ? "both" : "postpay",
    terminalOrderEnabled: value.terminalOrderEnabled !== false,
    customerPhone: ["required", "optional", "hidden"].includes(String(value.customerPhone))
      ? value.customerPhone as MenuOrderSettings["customerPhone"] : "required",
  };
}
export function getAllowedCheckoutModes(
  settings: MenuOrderSettings,
  channel: "customer" | "terminal",
) {
  return {
    postpay: settings.orderEnabled && settings.postpayEnabled && (channel === "terminal"
      ? settings.terminalOrderEnabled !== false
      : !["off", "prepay"].includes(settings.customerCheckout ?? "postpay")),
    prepayVisible:
      channel === "customer" &&
      settings.orderEnabled &&
      (settings.customerCheckout === "prepay" || settings.customerCheckout === "both"
        || (!settings.customerCheckout && settings.mobilePrepayVisible)),
    prepayAvailable: false as const,
  };
}
