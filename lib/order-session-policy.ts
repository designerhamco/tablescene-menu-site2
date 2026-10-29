// These durations govern ordering and unsubmitted drafts, never settlement or menu viewing.
export const CUSTOMER_ORDER_SECONDS = 60 * 60;
export const CUSTOMER_ORDER_WARNING_SECONDS = 5 * 60;
export const TERMINAL_CART_IDLE_MS = 10 * 60 * 1000;
export const TERMINAL_CART_WARNING_MS = 60 * 1000;
export type OrderChannel = "customer" | "terminal";

export function normalizeOrderPhone(value: unknown) {
  if (value == null || value === "") return null;
  if (typeof value !== "string" || value.length > 30) throw new Error("휴대폰 번호를 확인해 주세요.");
  const phone = value.replace(/[\s()-]/g, "");
  if (!/^01[016789]\d{7,8}$/.test(phone)) throw new Error("휴대폰 번호를 확인해 주세요.");
  return phone;
}

export function orderCartSignature(lines: {menuItemId?: string; menuCategoryId?: string; quantity: number; optionValueIds: string[]}[]) {
  const totals = new Map<string, number>();
  for (const line of lines) {
    const key = JSON.stringify([line.menuItemId ?? `course:${line.menuCategoryId}`, [...line.optionValueIds].sort()]);
    totals.set(key, (totals.get(key) ?? 0) + line.quantity);
  }
  return JSON.stringify([...totals].sort(([a], [b]) => a.localeCompare(b)));
}
