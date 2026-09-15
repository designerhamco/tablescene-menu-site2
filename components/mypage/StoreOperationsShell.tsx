import Link from "next/link";

import Footer from "@/app/components/layout/Footer";
import OfficialSiteNavbar from "@/components/layout/OfficialSiteNavbar";
import { MypageAccountCard } from "@/components/mypage/MypageSidebar";
import type { MenuSitePermission } from "@/lib/menu-site-permissions";
import type { StoreOperationKey } from "@/lib/operations-dashboard";
import type { StoreOperationsSite } from "@/lib/server/store-operations-context";
import { createClient } from "@/lib/supabase/server";

export type StoreOperationsSection = "dashboard" | StoreOperationKey;

const operationNavigation: Array<{
  key: StoreOperationKey;
  label: string;
  permission: MenuSitePermission;
}> = [
  { key: "calls", label: "호출관리", permission: "call.manage" },
  { key: "tables", label: "테이블·QR관리", permission: "table.manage" },
  { key: "pickup", label: "대기번호", permission: "pickup.manage" },
];

function getSectionHref(site: StoreOperationsSite, section: StoreOperationsSection) {
  if (section === "dashboard" || !site.operationAccess[section]) {
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
    <>
      <OfficialSiteNavbar />
      <main className="site-gutter min-h-screen bg-zinc-50 py-10 text-zinc-950">
        <div className="mx-auto w-full max-w-[1280px]">
          <header className="mb-6 border-b border-zinc-200 pb-8">
            <h1 className="type-page-title">매장 운영</h1>
            <p className="mt-4 break-keep text-base font-medium leading-relaxed text-zinc-500">
              운영 중인 메뉴판의 호출과 테이블, 수동 대기번호를 한곳에서 관리합니다.
            </p>
          </header>

          {sites.length > 0 ? (
            <nav
              className="mb-6 flex gap-2 overflow-x-auto rounded-full bg-white p-1 shadow-sm ring-1 ring-zinc-200"
              aria-label="운영할 메뉴판 선택"
            >
              {sites.map((site) => {
                const isSelected = site.menuSiteId === selectedSite?.menuSiteId;
                return (
                  <Link
                    key={site.menuSiteId}
                    href={getSectionHref(site, activeSection)}
                    aria-current={isSelected ? "page" : undefined}
                    className={isSelected
                      ? "inline-flex shrink-0 items-center justify-center rounded-full bg-zinc-950 px-5 py-2.5 text-sm font-bold text-white"
                      : "inline-flex shrink-0 items-center justify-center rounded-full bg-zinc-100 px-5 py-2.5 text-sm font-bold text-zinc-500 transition-colors hover:bg-zinc-200 hover:text-zinc-950"}
                  >
                    {site.name || "이름 없는 메뉴판"}
                  </Link>
                );
              })}
            </nav>
          ) : null}

          <div className="grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start">
            <aside className="space-y-4 lg:sticky lg:top-28">
              {user ? (
                <MypageAccountCard
                  email={user.email ?? "이메일 정보 없음"}
                  userId={user.id}
                  roleLabel={sites.some((site) => site.isOwner) ? "사장" : sites.length > 0 ? "직원" : null}
                  canShowOwnerCommerce={false}
                />
              ) : null}
              <div className="site-card p-3">
                {selectedSite ? (
                  <Link
                    href={`/mypage/operations?site=${encodeURIComponent(selectedSite.menuSiteId)}`}
                    className="mb-2 block rounded-2xl px-4 py-3"
                  >
                    <span className="block truncate text-base font-bold text-zinc-950">운영 대시보드</span>
                  </Link>
                ) : (
                  <div className="mb-2 rounded-2xl px-4 py-3">
                    <span className="block text-base font-bold text-zinc-400">운영 대시보드</span>
                  </div>
                )}

                <nav className="space-y-1 border-t border-zinc-100 pt-2" aria-label="매장 운영 메뉴">
                  {operationNavigation.map((item) => {
                    const enabled = Boolean(selectedSite?.operationAccess[item.key]);
                    if (!selectedSite || !enabled) {
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
                          <span className="text-xs font-bold">{unavailableLabel}</span>
                        </span>
                      );
                    }

                    return (
                      <Link
                        key={item.key}
                        href={`/mypage/menus/${selectedSite.menuSiteId}/${item.key}`}
                        aria-current={activeSection === item.key ? "page" : undefined}
                        className={getNavigationClassName(activeSection === item.key)}
                      >
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </nav>
              </div>
            </aside>

            <section className="min-w-0">{children}</section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
