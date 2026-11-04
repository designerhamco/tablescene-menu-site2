import SitePage from "@/components/layout/SitePage";
import Link from "next/link";
import OperationSiteSelector from "@/components/mypage/OperationSiteSelector";
import StoreOperationsNavigation from "@/components/mypage/StoreOperationsNavigation";
import OperationTableSetupNotice from "@/components/mypage/OperationTableSetupNotice";
import { isStoreOperationsTemplate } from "@/lib/operations-dashboard";

import { MypageAccountCard } from "@/components/mypage/MypageSidebar";
import type { MenuSitePermission } from "@/lib/menu-site-permissions";
import type { StoreOperationKey } from "@/lib/operations-dashboard";
import type { StoreOperationsSite } from "@/lib/server/store-operations-context";
import { createClient } from "@/lib/supabase/server";

export type StoreOperationsSection = "dashboard" | StoreOperationKey | "order-settings" | "order-devices" | "call-settings" | "call-items" | "qr" | "kiosks";

const operationNavigation: Array<{
  key: StoreOperationKey | "qr" | "kiosks";
  label: string;
  permission: MenuSitePermission;
}> = [
  { key: "tables", label: "테이블 관리", permission: "table.manage" },
  { key: "kiosks", label: "키오스크 관리", permission: "table.manage" },
  { key: "calls", label: "호출 관리", permission: "call.manage" },
  { key: "orders", label: "주문 관리", permission: "order.read" },
  { key: "sales", label: "매출 관리", permission: "sales.read" },
  { key: "qr", label: "QR 관리", permission: "qr.manage" },
  { key: "pickup", label: "대기번호", permission: "pickup.manage" },
];

function getSectionHref(site: StoreOperationsSite, section: StoreOperationsSection) {
  if (section === "order-devices") {
    return site.canConfigure || (site.tableSetupAvailable && site.permissions.includes("table.manage")) ? `/mypage/menus/${site.menuSiteId}/orders/settings?tab=devices` : `/mypage/operations?site=${encodeURIComponent(site.menuSiteId)}`;
  }
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
    return `/mypage/menus/${site.menuSiteId}/${section}`;
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
  children,
}: {
  sites: StoreOperationsSite[];
  selectedSite: StoreOperationsSite | null;
  activeSection: StoreOperationsSection;
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <SitePage title="매장 운영" align="start" description="운영 중인 메뉴판의 주문, 호출과 테이블을 한곳에서 관리합니다.">
      <div className="site-management-scope site-account-page">
          <div className="site-account-layout">
            <StoreOperationsNavigation
              activeKey={`${selectedSite?.menuSiteId ?? "none"}:${activeSection}`}
              selector={selectedSite ? <OperationSiteSelector selectedId={selectedSite.menuSiteId} items={sites.map(site => ({
                id: site.menuSiteId, label: site.name || "이름 없는 메뉴판", href: getSectionHref(site, activeSection),
              }))} /> : null}
              account={user ? (
                <MypageAccountCard
                  email={user.email ?? "이메일 정보 없음"}
                  roleLabel={sites.some((site) => site.isOwner) ? "사장" : sites.length > 0 ? "직원" : null}
                  canShowOwnerCommerce={false}
                />
              ) : null}
            >
              {selectedSite ? (
                <Link
                  href={`/mypage/operations?site=${encodeURIComponent(selectedSite.menuSiteId)}`}
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
                  const enabled = Boolean(selectedSite && (item.key === "qr" ? selectedSite.canManageQr : (item.key === "tables" || item.key === "kiosks") ? selectedSite.tableSetupAvailable && selectedSite.permissions.includes("table.manage") : selectedSite.operationAccess[item.key]));
                  const configurationAvailable = Boolean((selectedSite?.canConfigure || (selectedSite?.tableSetupAvailable && selectedSite.permissions.includes("table.manage"))) && (item.key === "orders" || item.key === "calls"));
                  const active = activeSection === item.key || (item.key === "orders" && (activeSection === "order-settings" || activeSection === "order-devices")) || (item.key === "calls" && (activeSection === "call-settings" || activeSection === "call-items"));
                  if (!selectedSite || (!enabled && !configurationAvailable)) {
                    const hasRolePermission = Boolean(selectedSite?.permissions.includes(item.permission));
                    const unavailableLabel = selectedSite && !hasRolePermission ? "권한 없음" : "이용 불가";
                    const unavailableReason = !selectedSite
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
                      href={`/mypage/menus/${selectedSite.menuSiteId}/${item.key}${enabled ? "" : "/settings"}`}
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
