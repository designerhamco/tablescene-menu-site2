import Link from "next/link";
import { redirect } from "next/navigation";

import Footer from "@/app/components/layout/Footer";
import { signOutAction } from "@/app/auth/actions";
import OfficialSiteNavbar from "@/components/layout/OfficialSiteNavbar";
import { getPublicMenuUrl } from "@/lib/menu-url";
import { createClient } from "@/lib/supabase/server";
import { getTemplateDisplayName } from "@/lib/templates";

type MenuSite = {
  id: string | null;
  name: string | null;
  slug: string | null;
  template_key: string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
};

function getStatusLabel(status: MenuSite["status"]) {
  const labels: Record<string, string> = {
    draft: "작성중",
    published: "공개중",
    private: "비공개",
    unpublished: "비공개",
    archived: "보관됨",
    expired: "만료됨",
  };

  return status ? labels[status] ?? status : "상태 미확인";
}

function getStatusClassName(status: MenuSite["status"]) {
  const classes: Record<string, string> = {
    draft: "bg-zinc-100 text-zinc-600",
    published: "bg-emerald-50 text-emerald-700",
    archived: "bg-amber-50 text-amber-700",
  };

  return status ? classes[status] ?? "bg-zinc-100 text-zinc-600" : "bg-zinc-100 text-zinc-600";
}

function formatDate(date: string | null) {
  if (!date) {
    return "-";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date));
}

function getSafeString(value: string | null | undefined) {
  return typeof value === "string" ? value.trim() : "";
}

export default async function MyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in?next=/mypage");
  }

  const { data: menuSites, error: menuSitesError } = await supabase
    .from("menu_sites")
    .select("id, name, slug, template_key, status, created_at, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  const sites = (menuSites ?? []) as MenuSite[];

  return (
    <>
      <OfficialSiteNavbar />
      <main className="min-h-screen bg-zinc-50 px-5 py-10 text-zinc-950">
        <div className="mx-auto w-full max-w-7xl">
          <header className="mb-6 flex flex-col justify-between gap-6 border-b border-zinc-200 pb-8 md:flex-row md:items-end">
            <div>
              <h1 className="text-4xl font-bold tracking-tight md:text-5xl">마이페이지</h1>
              <p className="mt-4 break-keep text-base font-medium leading-relaxed text-zinc-500">
                메뉴판 운영 현황과 고객지원, 결제 관련 정보를 한곳에서 확인합니다.
              </p>
            </div>
          </header>

        <div className="grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start">
          <aside className="space-y-4 lg:sticky lg:top-28">
            <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
              <p className="mb-3 text-xs font-black uppercase tracking-[0.24em] text-zinc-400">계정 요약</p>
              <h2 className="break-all text-lg font-black tracking-tight">{user.email}</h2>
              <p className="mt-3 break-all text-xs font-semibold leading-relaxed text-zinc-500">사용자 ID: {user.id}</p>
              <form action={signOutAction} className="mt-5">
                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-950"
                >
                  로그아웃
                </button>
              </form>
            </section>

            <nav className="rounded-3xl border border-zinc-200 bg-white p-3 shadow-sm" aria-label="마이페이지 메뉴">
              <a href="#my-menus" className="flex items-center justify-between rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-black text-white">
                <span>내 메뉴판</span>
                <span className="text-xs text-white/60">{sites.length.toLocaleString("ko-KR")}</span>
              </a>
              <div className="mt-2 space-y-1">
                <span className="flex cursor-not-allowed items-center justify-between rounded-2xl px-4 py-3 text-sm font-bold text-zinc-400">
                  <span>결제 내역</span>
                  <span className="rounded-full bg-zinc-100 px-2 py-1 text-[10px] font-black">준비 중</span>
                </span>
                <Link href="/mypage/inquiries" className="flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-bold text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-950">
                  <span>문의 내역</span>
                </Link>
                <Link href="/forgot-password" className="flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-bold text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-950">
                  <span>계정 정보</span>
                </Link>
              </div>
            </nav>
          </aside>

          <div className="min-w-0 space-y-10">
            <section id="my-menus" className="scroll-mt-28">
              <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-end">
                <div>
                  <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-zinc-400">
                    내 메뉴판
                  </p>
                  <h2 className="text-3xl font-bold tracking-tight">메뉴판 관리</h2>
                  <p className="mt-3 break-keep text-sm font-medium leading-relaxed text-zinc-500">
                    생성한 메뉴판을 편집하고 공개 상태를 확인할 수 있습니다.
                  </p>
                </div>

                <Link
                  href="/apply"
                  className="inline-flex items-center justify-center rounded-full bg-zinc-950 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-zinc-800"
                >
                  새 메뉴판 만들기
                </Link>
              </div>

          {menuSitesError && (
            <div className="mb-5 rounded-3xl border border-red-100 bg-red-50 p-6 text-sm font-medium text-red-700">
              메뉴판 목록을 불러오지 못했습니다: {menuSitesError.message}
            </div>
          )}

          {sites.length > 0 ? (
            <div className="grid gap-5 md:grid-cols-2">
              {sites.map((site) => {
                const siteId = getSafeString(site.id);
                const slug = getSafeString(site.slug);
                const publicUrl = slug ? getPublicMenuUrl(slug) : "공개 주소 미설정";
                const qrDownloadUrl = slug ? `/api/qr?slug=${encodeURIComponent(slug)}` : null;
                const isPublished = site.status === "published";
                const canOpenPublicPage = isPublished && Boolean(slug);
                const canManageSite = Boolean(siteId);

                return (
                  <article key={siteId || `${slug || "menu-site"}-${site.created_at ?? "unknown"}`} className="rounded-3xl bg-white p-7 shadow-sm">
                    <div className="mb-6 flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-2xl font-bold tracking-tight">{getSafeString(site.name) || "이름 없는 메뉴판"}</h3>
                        <p className="mt-2 break-all text-sm font-medium text-zinc-500">{publicUrl}</p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${getStatusClassName(
                          site.status
                        )}`}
                      >
                        {getStatusLabel(site.status)}
                      </span>
                    </div>

                    <dl className="space-y-3 text-sm font-medium">
                      <div className="flex justify-between gap-4 border-t border-zinc-100 pt-4">
                        <dt className="text-zinc-400">템플릿</dt>
                        <dd className="text-right text-xs font-bold text-zinc-800">{site.template_key ? getTemplateDisplayName(site.template_key) : "-"}</dd>
                      </div>
                      <div className="flex justify-between gap-4 border-t border-zinc-100 pt-4">
                        <dt className="text-zinc-400">상태</dt>
                        <dd className="font-bold text-zinc-800">{getStatusLabel(site.status)}</dd>
                      </div>
                      <div className="flex justify-between gap-4 border-t border-zinc-100 pt-4">
                        <dt className="text-zinc-400">생성일</dt>
                        <dd className="font-bold text-zinc-800">{formatDate(site.created_at)}</dd>
                      </div>
                      <div className="flex justify-between gap-4 border-t border-zinc-100 pt-4">
                        <dt className="text-zinc-400">공개 주소</dt>
                        <dd>
                          {isPublished ? (
                            canOpenPublicPage ? (
                            <Link href={publicUrl} target="_blank" rel="noopener noreferrer" className="font-bold text-zinc-950 hover:underline">
                              {publicUrl}
                            </Link>
                            ) : (
                              <span className="break-all font-bold text-zinc-500">{publicUrl}</span>
                            )
                          ) : (
                            <span className="break-all font-bold text-zinc-500">{publicUrl}</span>
                          )}
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-6 flex flex-wrap gap-3">
                      {canManageSite ? (
                        <>
                          <Link
                            href={`/mypage/menus/${siteId}/edit`}
                            className="inline-flex items-center justify-center rounded-full bg-zinc-950 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-zinc-800"
                          >
                            편집하기
                          </Link>
                          <Link
                            href={`/mypage/menus/${siteId}/preview`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-bold text-zinc-700 transition-colors hover:bg-zinc-100"
                          >
                            미리보기
                          </Link>
                        </>
                      ) : (
                        <span className="inline-flex cursor-not-allowed items-center justify-center rounded-full border border-zinc-200 bg-zinc-100 px-5 py-3 text-sm font-bold text-zinc-400">
                          관리 링크 확인 필요
                        </span>
                      )}
                      {canOpenPublicPage ? (
                        <>
                          <Link
                            href={publicUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-bold text-zinc-700 transition-colors hover:bg-zinc-100"
                          >
                            공개 페이지 보기
                          </Link>
                          {qrDownloadUrl ? (
                            <a
                              href={qrDownloadUrl}
                              download
                              className="inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-bold text-zinc-700 transition-colors hover:bg-zinc-100"
                            >
                              QR 다운로드
                            </a>
                          ) : null}
                        </>
                      ) : null}
                    </div>
                    {!canOpenPublicPage && <p className="mt-3 break-keep text-xs font-bold text-amber-700">메뉴판을 공개하고 공개 주소가 준비된 뒤 QR을 다운로드할 수 있습니다.</p>}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-zinc-200 bg-white p-10 text-center shadow-sm">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-zinc-400">
                내 메뉴판
              </p>
              <h3 className="text-2xl font-bold">아직 만든 메뉴판이 없습니다</h3>
              <p className="mx-auto mt-3 max-w-md break-keep text-sm font-medium leading-relaxed text-zinc-500">
                상품을 선택하고 신청을 완료하면 이곳에서 메뉴판을 편집하고 관리할 수 있습니다.
              </p>
              <Link
                href="/apply"
                className="mt-7 inline-flex items-center justify-center rounded-full bg-zinc-950 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-zinc-800"
              >
                새 메뉴판 만들기
              </Link>
            </div>
          )}
            </section>

            <section>
              <div className="mb-5">
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-zinc-400">계정 및 이용 관리</p>
                <h2 className="text-2xl font-bold tracking-tight">관리 바로가기</h2>
                <p className="mt-3 break-keep text-sm font-medium leading-relaxed text-zinc-500">
                  문의, FAQ, 계정 관련 메뉴를 확인합니다.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                  <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-zinc-400">결제 관리</p>
                  <h3 className="text-lg font-black tracking-tight">결제 내역</h3>
                  <p className="mt-3 break-keep text-sm font-semibold leading-relaxed text-zinc-500">
                    자동결제 구조 확정 후 제공됩니다.
                  </p>
                  <span className="mt-5 inline-flex items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 text-xs font-black text-zinc-400">
                    준비 중
                  </span>
                </article>

                <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                  <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-zinc-400">고객지원</p>
                  <h3 className="text-lg font-black tracking-tight">문의 및 답변</h3>
                  <p className="mt-3 break-keep text-sm font-semibold leading-relaxed text-zinc-500">
                    문의를 남기고 답변 상태를 확인합니다.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Link
                      href="/mypage/inquiries"
                      className="inline-flex items-center justify-center rounded-full bg-zinc-950 px-4 py-2 text-xs font-black text-white transition-colors hover:bg-zinc-800"
                    >
                      문의 내역
                    </Link>
                    <Link
                      href="/faq"
                      className="inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-black text-zinc-700 transition-colors hover:bg-zinc-100"
                    >
                      FAQ
                    </Link>
                  </div>
                </article>

                <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                  <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-zinc-400">계정</p>
                  <h3 className="text-lg font-black tracking-tight">계정 정보</h3>
                  <p className="mt-3 break-keep text-sm font-semibold leading-relaxed text-zinc-500">
                    비밀번호 재설정 등 계정 정보를 관리합니다.
                  </p>
                  <Link
                    href="/forgot-password"
                    className="mt-5 inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-black text-zinc-700 transition-colors hover:bg-zinc-100"
                  >
                    비밀번호 재설정
                  </Link>
                </article>
              </div>
            </section>
          </div>
        </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
