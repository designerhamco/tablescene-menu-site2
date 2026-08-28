import Link from "next/link";

import Footer from "@/app/components/layout/Footer";
import OfficialSiteNavbar from "@/components/layout/OfficialSiteNavbar";
import type { StoreOperationKey } from "@/lib/operations-dashboard";
import type { StoreOperationsSite } from "@/lib/server/store-operations-context";

export type StoreOperationsSection = "dashboard" | StoreOperationKey;

const operationNavigation: Array<{
  key: StoreOperationKey;
  label: string;
}> = [
  { key: "orders", label: "주문관리" },
  { key: "calls", label: "호출관리" },
  { key: "tables", label: "테이블관리" },
  { key: "sales", label: "매출요약" },
];

function getSectionHref(site: StoreOperationsSite, section: StoreOperationsSection) {
  if (section === "dashboard" || !site.operationAccess[section]) {
    return `/mypage/operations?site=${encodeURIComponent(site.menuSiteId)}`;
  }

  return `/mypage/menus/${site.menuSiteId}/${section}`;
}

function getNavigationClassName(active: boolean) {
  return active
    ? "flex items-center justify-between rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-black text-white"
    : "flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-bold text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-950";
}

export default function StoreOperationsShell({
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
  return (
    <>
      <OfficialSiteNavbar />
      <main className="min-h-screen bg-zinc-50 px-5 py-10 text-zinc-950">
        <div className="mx-auto w-full max-w-7xl">
          <header className="mb-6 border-b border-zinc-200 pb-8">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">STORE OPERATIONS</p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight md:text-5xl">매장 운영</h1>
            <p className="mt-4 break-keep text-base font-medium leading-relaxed text-zinc-500">
              운영 중인 다이닝 메뉴판의 주문과 호출, 테이블, 매출을 관리합니다.
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
                      ? "inline-flex shrink-0 items-center justify-center rounded-full bg-zinc-950 px-5 py-2.5 text-sm font-black text-white"
                      : "inline-flex shrink-0 items-center justify-center rounded-full bg-zinc-100 px-5 py-2.5 text-sm font-black text-zinc-500 transition-colors hover:bg-zinc-200 hover:text-zinc-950"}
                  >
                    {site.name || "이름 없는 메뉴판"}
                  </Link>
                );
              })}
            </nav>
          ) : null}

          <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start">
            <aside className="lg:sticky lg:top-28">
              <div className="rounded-3xl border border-zinc-200 bg-white p-3 shadow-sm">
                {selectedSite ? (
                  <Link
                    href={`/mypage/operations?site=${encodeURIComponent(selectedSite.menuSiteId)}`}
                    className="mb-2 block rounded-2xl px-4 py-3"
                  >
                    <span className="block text-xs font-black uppercase tracking-[0.14em] text-emerald-700">OPERATIONS</span>
                    <span className="mt-1 block truncate text-base font-black text-zinc-950">운영 대시보드</span>
                  </Link>
                ) : (
                  <div className="mb-2 rounded-2xl px-4 py-3">
                    <span className="block text-xs font-black uppercase tracking-[0.14em] text-zinc-400">OPERATIONS</span>
                    <span className="mt-1 block text-base font-black text-zinc-400">운영 대시보드</span>
                  </div>
                )}

                <nav className="space-y-1 border-t border-zinc-100 pt-2" aria-label="매장 운영 메뉴">
                  {operationNavigation.map((item) => {
                    const enabled = Boolean(selectedSite?.operationAccess[item.key]);
                    if (!selectedSite || !enabled) {
                      return (
                        <span
                          key={item.key}
                          aria-disabled="true"
                          className="flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-bold text-zinc-300"
                        >
                          <span>{item.label}</span>
                          <span className="text-[10px] font-black">이용 불가</span>
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
