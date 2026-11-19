import SitePage from "@/components/layout/SitePage";
import Link from "next/link";
import OperationSiteSelector from "@/components/mypage/OperationSiteSelector";
import StoreOperationsNavigation from "@/components/mypage/StoreOperationsNavigation";
import OperationTableSetupNotice from "@/components/mypage/OperationTableSetupNotice";
import { isStoreOperationsTemplate } from "@/lib/operations-dashboard";
import { ALL_MENU_SITE_ID, allMenuOperationsHref, allMenuOperationSites } from "@/lib/all-menu-operations";
import { operationMenuTargets } from "@/lib/operation-menu-targets";
import OperationMenuTarget from "./OperationMenuTarget";

import { MypageAccountCard } from "@/components/mypage/MypageSidebar";
import type { MenuSitePermission } from "@/lib/menu-site-permissions";
import type { StoreOperationKey } from "@/lib/operations-dashboard";
import type { StoreOperationsSite } from "@/lib/server/store-operations-context";
import { createClient } from "@/lib/supabase/server";

export type StoreOperationsSection = "dashboard" | StoreOperationKey | "order-settings" | "call-settings" | "call-items" | "qr" | "kiosks";

const operationNavigation: Array<{
  key: StoreOperationKey | "qr" | "kiosks";
  label: string;
  permission: MenuSitePermission;
}> = [
  { key: "tables", label: "테이블·키오스크 관리", permission: "table.manage" },
  { key: "calls", label: "호출 관리", permission: "call.manage" },
  { key: "orders", label: "주문 관리", permission: "order.read" },
  { key: "sales", label: "매출 관리", permission: "sales.read" },
  { key: "qr", label: "QR 관리", permission: "qr.manage" },
  { key: "pickup", label: "대기번호", permission: "pickup.manage" },
];

function getSectionHref(site: StoreOperationsSite, section: StoreOperationsSection) {
  if (section === "call-items") {
    return site.permissions.includes("call.manage") ? `/mypage/menus/${site.menuSiteId}/calls/settings?tab=items` : `/mypage/menus/${site.menuSiteId}/calls/settings`;
  }
  if (section === "order-settings" || section === "call-settings") {
    const feature = section === "order-settings" ? "orders" : "calls";
    if (site.canConfigure || (site.tableSetupAvailable && site.permissions.includes("table.manage")) || site.operationAccess[feature]) {
      return `/mypage/menus/${site.menuSiteId}/${feature}/settings`;
    }
    return `/mypage/operations?site=${encodeURIComponent(site.menuSiteId)}`;
  }
  if ((section === "orders" || section === "calls") && !site.operationAccess[section] && (site.canConfigure || (site.tableSetupAvailable && site.permissions.includes("table.manage")))) {
    return `/mypage/menus/${site.menuSiteId}/${section}/settings`;
  }
  if (section === "qr") return site.canManageQr ? `/mypage/menus/${site.menuSiteId}/qr` : `/mypage/operations?site=${encodeURIComponent(site.menuSiteId)}`;
  if ((section === "tables" || section === "kiosks") && site.tableSetupAvailable && site.permissions.includes("table.manage")) {
    return `/mypage/menus/${site.menuSiteId}/tables`;
  }
  if (section === "dashboard" || section === "kiosks" || !site.operationAccess[section]) {
    return `/mypage/operations?site=${encodeURIComponent(site.menuSiteId)}`;
  }

  return `/mypage/menus/${site.menuSiteId}/${section}`;
}

function getNavigationClassName(active: boolean) {
  return active
    ? "site-nav-item site-nav-item-active"
    : "site-nav-item";
}

export default async function StoreOperationsShell({
  sites,
  selectedSite,
  activeSection,
  allMenus = false,
  children,
}: {
  sites: StoreOperationsSite[];
  selectedSite: StoreOperationsSite | null;
  activeSection: StoreOperationsSection;
  allMenus?: boolean;
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const allOrders = allMenuOperationSites(sites, "orders");
  const allCalls = allMenuOperationSites(sites, "calls");

  return (
    <SitePage title="매장 운영" align="start" typography="management">
      <div className="site-account-page">
          <div className="site-account-layout">
            <StoreOperationsNavigation
              activeKey={`${allMenus ? ALL_MENU_SITE_ID : selectedSite?.menuSiteId ?? "none"}:${activeSection}`}
              selector={selectedSite || allMenus ? <OperationSiteSelector selectedId={allMenus ? ALL_MENU_SITE_ID : selectedSite!.menuSiteId} items={[
                ...(allOrders.length || allCalls.length || allMenus ? [{ id: ALL_MENU_SITE_ID, label: "전체 메뉴판", href: allMenuOperationsHref(activeSection) }] : []),
                ...sites.map(site => ({
                id: site.menuSiteId, label: site.name || "이름 없는 메뉴판", href: getSectionHref(site, activeSection),
              }))]} /> : null}
              account={user ? (
                <MypageAccountCard
                  email={user.email ?? "이메일 정보 없음"}
                  roleLabel={sites.some((site) => site.isOwner) ? "사장" : sites.length > 0 ? "직원" : null}
                  canShowOwnerCommerce={false}
                />
              ) : null}
            >
              {selectedSite || allMenus ? (
                <Link
                  href={allMenus ? allMenuOperationsHref("dashboard") : `/mypage/operations?site=${encodeURIComponent(selectedSite!.menuSiteId)}`}
                  aria-current={activeSection === "dashboard" ? "page" : undefined}
                  className={getNavigationClassName(activeSection === "dashboard")}
                >
                  <span className="block truncate">운영 대시보드</span>
                </Link>
              ) : (
                <div className="site-nav-item site-nav-item-disabled">
                  <span className="block">운영 대시보드</span>
                </div>
              )}


              <div className="site-operations-feature-navigation">
                {operationNavigation.map((item) => {
                  const active = activeSection === item.key || (item.key === "tables" && activeSection === "kiosks") || (item.key === "orders" && activeSection === "order-settings") || (item.key === "calls" && (activeSection === "call-settings" || activeSection === "call-items"));
                  if (allMenus && item.key !== "orders" && item.key !== "calls") {
                    const targets = operationMenuTargets(sites, item.key === "kiosks" ? "tables" : item.key);
                    if (targets.length) return <OperationMenuTarget key={item.key} label={item.label} items={targets} navigation active={active}/>;
                  }
                  const enabled = allMenus ? (item.key === "orders" ? allOrders.length > 0 : item.key === "calls" ? allCalls.length > 0 : false) : Boolean(selectedSite && (item.key === "qr" ? selectedSite.canManageQr : (item.key === "tables" || item.key === "kiosks") ? selectedSite.tableSetupAvailable && selectedSite.permissions.includes("table.manage") : selectedSite.operationAccess[item.key]));
                  const configurationAvailable = Boolean((selectedSite?.canConfigure || (selectedSite?.tableSetupAvailable && selectedSite.permissions.includes("table.manage"))) && (item.key === "orders" || item.key === "calls"));
                  if ((!selectedSite && !allMenus) || (!enabled && !configurationAvailable)) {
                    const hasRolePermission = Boolean(selectedSite?.permissions.includes(item.permission));
                    const unavailableLabel = allMenus ? "이용 불가" : selectedSite && !hasRolePermission ? "권한 없음" : "이용 불가";
                    const unavailableReason = allMenus
                      ? "이 기능을 이용할 수 있는 메뉴판이 없습니다."
                      : !selectedSite
                      ? "먼저 운영할 메뉴판을 선택해 주세요."
                      : !hasRolePermission
                        ? `현재 직원 역할에는 ${item.label} 접근 권한이 없습니다.`
                        : `${item.label} 기능이 현재 메뉴판에서 활성화되지 않았습니다.`;
                    return (
                      <span
                        key={item.key}
                        aria-disabled="true"
                        aria-label={`${item.label} ${unavailableLabel}: ${unavailableReason}`}
                        title={unavailableReason}
                        className="site-nav-item site-nav-item-disabled"
                      >
                        <span>{item.label}</span>
                        <span className="text-support font-medium">{unavailableLabel}</span>
                      </span>
                    );
                  }

                  return (
                    <Link
                      key={item.key}
                      href={allMenus ? allMenuOperationsHref(item.key) : `/mypage/menus/${selectedSite!.menuSiteId}/${item.key}${enabled ? "" : "/settings"}`}
                      aria-current={active ? "page" : undefined}
                      className={getNavigationClassName(active)}
                    >
                      <span>{item.label}</span>
                      {!enabled ? <span className="text-support font-medium">설정</span> : null}
                    </Link>
                  );
                })}
              </div>
            </StoreOperationsNavigation>

            <section className="min-w-0">
              {selectedSite && selectedSite.activeTablesReady !== true && activeSection !== "tables" && activeSection !== "kiosks" && activeSection !== "dashboard" && isStoreOperationsTemplate(selectedSite.templateKey) ? (
                <div className="mb-6"><OperationTableSetupNotice menuId={selectedSite.menuSiteId} tableSetupAvailable={selectedSite.tableSetupAvailable}
                  activeTablesReady={selectedSite.activeTablesReady} canManageTables={selectedSite.permissions.includes("table.manage")} /></div>
              ) : null}
              {children}
            </section>
          </div>
      </div>
    </SitePage>
  );
}
