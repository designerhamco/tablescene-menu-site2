import type { StoreOperationsSite } from "./server/store-operations-context";

export type OperationMenuTargetSection = "tables" | "qr" | "sales" | "pickup" | "publication" | "order-settings" | "call-settings" | "call-items" | "kitchen";
export type OperationMenuTargetItem = { id: string; label: string; href: string };

/** A picker offers existing destinations only; it never grants feature or staff access. */
export function operationMenuTargets(sites: readonly StoreOperationsSite[], section: OperationMenuTargetSection): OperationMenuTargetItem[] {
  return sites.flatMap(site => {
    const root = `/mypage/menus/${site.menuSiteId}`;
    let href: string | null = null;
    if (section === "tables" && site.tableSetupAvailable && site.permissions.includes("table.manage")) href = `${root}/tables`;
    if (section === "qr" && site.canManageQr) href = `${root}/qr`;
    if (section === "kitchen" && site.operationAccess.orders && site.permissions.includes("order.read")) href = `${root}/kitchen`;
    if (section === "sales" && site.operationAccess.sales && site.permissions.includes("sales.read")) href = `${root}/sales`;
    if (section === "pickup" && site.operationAccess.pickup && site.permissions.includes("pickup.manage")) href = `${root}/pickup`;
    if (section === "publication" && (site.permissions.includes("menu.edit") || site.permissions.includes("menu.publish"))) href = `${root}/edit?tab=publish`;
    if (section === "call-items" && site.permissions.includes("call.manage") && (site.canConfigure || site.operationAccess.calls)) href = `${root}/calls/settings?tab=items`;
    if (section === "order-settings" || section === "call-settings") {
      const feature = section === "order-settings" ? "orders" : "calls";
      if (site.canConfigure || (site.tableSetupAvailable && site.permissions.includes("table.manage")) || site.operationAccess[feature]) href = `${root}/${feature}/settings`;
    }
    return href ? [{ id: site.menuSiteId, label: site.name || "이름 없는 메뉴판", href }] : [];
  });
}
