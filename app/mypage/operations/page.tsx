import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import Footer from "@/app/components/layout/Footer";
import OfficialSiteNavbar from "@/components/layout/OfficialSiteNavbar";
import { MypageAccountCard, MypageNavigation } from "@/components/mypage/MypageSidebar";
import { NOTIFICATION_VISIBLE_CHANNELS } from "@/lib/notification-display-policy";
import {
  getStoreOperationAccess,
  hasAvailableStoreOperation,
  isStoreOperationsTemplate,
  type StoreOperationKey,
} from "@/lib/operations-dashboard";
import { isCallRuntimeEnabledForSite } from "@/lib/call-runtime";
import { hasMenuSitePermission } from "@/lib/menu-site-permissions";
import { isOrderDashboardRuntimeEnabledForSite } from "@/lib/order-dashboard-runtime";
import { getAiCreditBalanceForUser } from "@/lib/server/ai-credits-service";
import { getAccessibleMenuSiteList } from "@/lib/server/menu-site-access-service";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isTableManagementRuntimeEnabled } from "@/lib/table-management-runtime";

export const metadata: Metadata = {
  title: "매장 운영 | 아티메뉴",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchParams = Promise<{ site?: string | string[] }>;

const operationCards: Array<{
  key: StoreOperationKey;
  eyebrow: string;
  title: string;
  description: string;
}> = [
  {
    key: "orders",
    eyebrow: "ORDER",
    title: "주문 관리",
    description: "접수된 주문과 조리·제공 상태, 외부 결제 완료를 한곳에서 관리합니다.",
  },
  {
    key: "calls",
    eyebrow: "CALL",
    title: "호출 관리",
    description: "테이블에서 접수된 직원 호출을 확인하고 처리 상태를 관리합니다.",
  },
  {
    key: "tables",
    eyebrow: "TABLE",
    title: "테이블 관리",
    description: "매장 테이블과 QR 진입 경로를 생성하고 운영 상태를 확인합니다.",
  },
  {
    key: "sales",
    eyebrow: "SALES",
    title: "매출 요약",
    description: "완료된 주문을 기준으로 오늘과 월간 매출 흐름을 확인합니다.",
  },
];

function getSingleSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function StoreOperationsPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/sign-in?next=${encodeURIComponent("/mypage/operations")}`);
  }

  const accessibleMenuSites = await getAccessibleMenuSiteList();
  const operationalMenuSites = accessibleMenuSites.filter((site) => isStoreOperationsTemplate(site.templateKey));
  const ownedMenuSiteCount = accessibleMenuSites.filter((site) => site.isOwner).length;
  const isStaffOnlyAccount = ownedMenuSiteCount === 0 && accessibleMenuSites.length > 0;
  const canShowOwnerCommerce = !isStaffOnlyAccount;

  const requestedSiteId = getSingleSearchParam((await searchParams).site);
  const selectedMenuSite = operationalMenuSites.find((site) => site.menuSiteId === requestedSiteId)
    ?? operationalMenuSites[0]
    ?? null;

  let accountAiCreditRemaining: number | undefined;
  if (canShowOwnerCommerce) {
    try {
      const balance = await getAiCreditBalanceForUser(user.id);
      accountAiCreditRemaining = Math.max(0, Math.floor(balance.totalRemainingCredits));
    } catch (error) {
      console.error("[mypage-operations] AI credit balance query failed", {
        userId: user.id,
        message: error instanceof Error ? error.message : "unknown",
      });
    }
  }

  let unreadNotificationCount = 0;
  try {
    const adminSupabase = createAdminClient();
    const { count, error } = await adminSupabase
      .from("notification_events" as never)
      .select("id", { count: "exact", head: true })
      .eq("user_id" as never, user.id as never)
      .in("channel" as never, NOTIFICATION_VISIBLE_CHANNELS as unknown as string[])
      .neq("status" as never, "skipped" as never)
      .is("read_at" as never, null);

    if (!error) unreadNotificationCount = count ?? 0;
  } catch (error) {
    console.error("[mypage-operations] notification count query failed", {
      userId: user.id,
      message: error instanceof Error ? error.message : "unknown",
    });
  }

  const operationAccess = selectedMenuSite
    ? getStoreOperationAccess({
        accessRole: selectedMenuSite.accessRole,
        templateKey: selectedMenuSite.templateKey,
        tableManagementEnabled: isTableManagementRuntimeEnabled(),
        orderDashboardEnabled: isOrderDashboardRuntimeEnabledForSite(selectedMenuSite.menuSiteId),
        callManagementEnabled: isCallRuntimeEnabledForSite(selectedMenuSite.menuSiteId),
      })
    : null;
  const canEditSelectedMenuSite = selectedMenuSite
    ? hasMenuSitePermission(selectedMenuSite.accessRole, "menu.edit")
    : false;

  return (
    <>
      <OfficialSiteNavbar />
      <main className="min-h-screen bg-zinc-50 px-5 py-10 text-zinc-950">
        <div className="mx-auto w-full max-w-7xl">
          <header className="mb-6 flex flex-col justify-between gap-6 border-b border-zinc-200 pb-8 md:flex-row md:items-end">
            <div>
              <h1 className="text-4xl font-bold tracking-tight md:text-5xl">마이페이지</h1>
              <p className="mt-4 break-keep text-base font-medium leading-relaxed text-zinc-500">
                주문과 호출, 테이블, 매출을 매장별로 확인하고 관리합니다.
              </p>
            </div>
          </header>

          <div className="grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start">
            <aside className="space-y-4 lg:sticky lg:top-28">
              <MypageAccountCard
                email={user.email ?? "이메일 정보 없음"}
                userId={user.id}
                canShowOwnerCommerce={canShowOwnerCommerce}
                accountAiCreditRemaining={accountAiCreditRemaining}
              />
              <MypageNavigation
                active="operations"
                totalMenuCount={accessibleMenuSites.length}
                operationalMenuCount={operationalMenuSites.length}
                canShowOwnerCommerce={canShowOwnerCommerce}
                hasOwnedMenuSites={ownedMenuSiteCount > 0}
                unreadNotificationCount={unreadNotificationCount}
              />
            </aside>

            <section className="min-w-0" aria-labelledby="store-operations-title">
              <div className="mb-5">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">STORE OPERATIONS</p>
                <h2 id="store-operations-title" className="mt-2 text-3xl font-bold tracking-tight">매장 운영</h2>
                <p className="mt-3 max-w-3xl break-keep text-sm font-medium leading-relaxed text-zinc-500">
                  다이닝 메뉴판의 주문·호출·테이블·매출 업무를 운영 화면에서 이어서 관리합니다.
                </p>
              </div>

              {operationalMenuSites.length > 0 ? (
                <nav className="mb-6 flex gap-2 overflow-x-auto rounded-full bg-white p-1 shadow-sm ring-1 ring-zinc-200" aria-label="운영할 매장 선택">
                  {operationalMenuSites.map((site) => {
                    const isSelected = site.menuSiteId === selectedMenuSite?.menuSiteId;
                    return (
                      <Link
                        key={site.menuSiteId}
                        href={`/mypage/operations?site=${encodeURIComponent(site.menuSiteId)}`}
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

              {selectedMenuSite && operationAccess ? (
                <div className="space-y-6">
                  <article className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm md:p-8">
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-black text-zinc-600">
                            {selectedMenuSite.isOwner ? "사장" : "직원 참여"}
                          </span>
                          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">다이닝</span>
                        </div>
                        <h3 className="mt-4 text-2xl font-black tracking-tight md:text-3xl">{selectedMenuSite.name || "이름 없는 메뉴판"}</h3>
                        <p className="mt-2 break-all text-sm font-bold text-zinc-500">/{selectedMenuSite.slug}</p>
                      </div>
                      {canEditSelectedMenuSite ? (
                        <Link
                          href={`/mypage/menus/${selectedMenuSite.menuSiteId}/edit`}
                          className="inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-sm font-black text-zinc-700 transition-colors hover:bg-zinc-100"
                        >
                          메뉴판 설정
                        </Link>
                      ) : null}
                    </div>
                  </article>

                  {!hasAvailableStoreOperation(operationAccess) ? (
                    <div className="rounded-3xl border border-amber-100 bg-amber-50 p-5 text-sm font-bold leading-relaxed text-amber-800">
                      이 메뉴판은 현재 운영 기능이 활성화되지 않았습니다. 상품과 매장별 운영 설정이 활성화되면 권한에 맞는 메뉴가 열립니다.
                    </div>
                  ) : null}

                  <div className="grid gap-4 md:grid-cols-2">
                    {operationCards.map((operation) => {
                      const enabled = operationAccess[operation.key];
                      const href = `/mypage/menus/${selectedMenuSite.menuSiteId}/${operation.key}`;
                      return (
                        <article key={operation.key} className="flex min-h-64 flex-col rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm md:p-7">
                          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">{operation.eyebrow}</p>
                          <h3 className="mt-3 text-2xl font-black tracking-tight">{operation.title}</h3>
                          <p className="mt-3 break-keep text-sm font-medium leading-relaxed text-zinc-500">{operation.description}</p>
                          <div className="mt-auto pt-8">
                            {enabled ? (
                              <Link
                                href={href}
                                className="inline-flex items-center justify-center rounded-full bg-zinc-950 px-5 py-3 text-sm font-black text-white transition-colors hover:bg-zinc-800"
                              >
                                {operation.title} 열기
                              </Link>
                            ) : (
                              <span className="inline-flex rounded-full bg-zinc-100 px-5 py-3 text-sm font-black text-zinc-400">
                                현재 이용 불가
                              </span>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <article className="rounded-3xl border border-zinc-200 bg-white p-8 text-center shadow-sm md:p-12">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">NO DINING MENU</p>
                  <h3 className="mt-3 text-2xl font-black tracking-tight">운영할 다이닝 메뉴판이 없습니다</h3>
                  <p className="mx-auto mt-3 max-w-xl break-keep text-sm font-medium leading-relaxed text-zinc-500">
                    매장 운영은 주문과 호출을 사용하는 다이닝 메뉴판에서 제공됩니다. 디스플레이 메뉴판은 이 목록에서 제외됩니다.
                  </p>
                  <Link
                    href="/mypage?tab=menus"
                    className="mt-6 inline-flex items-center justify-center rounded-full bg-zinc-950 px-5 py-3 text-sm font-black text-white transition-colors hover:bg-zinc-800"
                  >
                    내 메뉴판 확인
                  </Link>
                </article>
              )}
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
