import Link from "next/link";
import { redirect } from "next/navigation";

import { signOutAction } from "@/app/auth/actions";
import SiteHeader from "@/components/layout/SiteHeader";
import { getPublicMenuUrl } from "@/lib/menu-url";
import { createClient } from "@/lib/supabase/server";
import { getTemplateDisplayName } from "@/lib/templates";
import type { Database } from "@/lib/supabase/types";

type MenuSite = Pick<
  Database["public"]["Tables"]["menu_sites"]["Row"],
  "id" | "name" | "slug" | "template_key" | "status" | "created_at" | "updated_at"
>;

function getStatusLabel(status: MenuSite["status"]) {
  const labels: Record<MenuSite["status"], string> = {
    draft: "작성중",
    published: "공개중",
    archived: "보관됨",
  };

  return labels[status];
}

function getStatusClassName(status: MenuSite["status"]) {
  const classes: Record<MenuSite["status"], string> = {
    draft: "bg-zinc-100 text-zinc-600",
    published: "bg-emerald-50 text-emerald-700",
    archived: "bg-amber-50 text-amber-700",
  };

  return classes[status];
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date));
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
      <SiteHeader />
      <main className="min-h-screen bg-zinc-50 px-6 py-16 text-zinc-950">
        <div className="mx-auto w-full max-w-6xl">
          <header className="mb-12 flex flex-col justify-between gap-6 border-b border-zinc-200 pb-8 md:flex-row md:items-end">
            <div>
              <h1 className="text-4xl font-bold tracking-tight md:text-5xl">마이페이지</h1>
              <p className="mt-4 break-keep text-base font-medium leading-relaxed text-zinc-500">
                메뉴판 SaaS 관리 기능을 연결하기 위한 기본 대시보드입니다.
              </p>
            </div>

            <form action={signOutAction}>
              <button
                type="submit"
                className="rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-bold text-zinc-700 transition-colors hover:bg-zinc-950 hover:text-white"
              >
                로그아웃
              </button>
            </form>
          </header>

        <section className="mb-8 rounded-3xl bg-white p-8 shadow-sm">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-zinc-400">
            Signed In
          </p>
          <h2 className="text-2xl font-bold">{user.email}</h2>
          <p className="mt-3 text-sm font-medium text-zinc-500">
            User ID: {user.id}
          </p>
        </section>

        <section className="mb-8">
          <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-zinc-400">
                Menu Sites
              </p>
              <h2 className="text-3xl font-bold tracking-tight">메뉴판 관리</h2>
              <p className="mt-3 break-keep text-sm font-medium leading-relaxed text-zinc-500">
                로그인한 계정이 소유한 메뉴판만 표시됩니다.
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
                const publicUrl = getPublicMenuUrl(site.slug);
                const qrDownloadUrl = `/api/qr?slug=${encodeURIComponent(site.slug)}`;
                const isPublished = site.status === "published";

                return (
                  <article key={site.id} className="rounded-3xl bg-white p-7 shadow-sm">
                    <div className="mb-6 flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-2xl font-bold tracking-tight">{site.name}</h3>
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
                        <dd className="text-right text-xs font-bold text-zinc-800">{getTemplateDisplayName(site.template_key)}</dd>
                      </div>
                      <div className="flex justify-between gap-4 border-t border-zinc-100 pt-4">
                        <dt className="text-zinc-400">status</dt>
                        <dd className="font-bold text-zinc-800">{site.status}</dd>
                      </div>
                      <div className="flex justify-between gap-4 border-t border-zinc-100 pt-4">
                        <dt className="text-zinc-400">생성일</dt>
                        <dd className="font-bold text-zinc-800">{formatDate(site.created_at)}</dd>
                      </div>
                      <div className="flex justify-between gap-4 border-t border-zinc-100 pt-4">
                        <dt className="text-zinc-400">공개 URL</dt>
                        <dd>
                          <Link href={publicUrl} target="_blank" rel="noopener noreferrer" className="font-bold text-zinc-950 hover:underline">
                            {publicUrl}
                          </Link>
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-6 flex flex-wrap gap-3">
                      <Link
                        href={`/mypage/menus/${site.id}/edit`}
                        className="inline-flex items-center justify-center rounded-full bg-zinc-950 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-zinc-800"
                      >
                        편집하기
                      </Link>
                      <Link
                        href={publicUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-bold text-zinc-700 transition-colors hover:bg-zinc-100"
                      >
                        미리보기
                      </Link>
                      {isPublished ? (
                        <a
                          href={qrDownloadUrl}
                          download
                          className="inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-bold text-zinc-700 transition-colors hover:bg-zinc-100"
                        >
                          QR 다운로드
                        </a>
                      ) : (
                        <button
                          type="button"
                          disabled
                          className="inline-flex cursor-not-allowed items-center justify-center rounded-full border border-zinc-200 bg-zinc-100 px-5 py-3 text-sm font-bold text-zinc-400"
                        >
                          QR 다운로드
                        </button>
                      )}
                    </div>
                    {!isPublished && <p className="mt-3 break-keep text-xs font-bold text-amber-700">메뉴판을 공개한 뒤 QR을 다운로드할 수 있습니다.</p>}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-zinc-200 bg-white p-10 text-center shadow-sm">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-zinc-400">
                Empty
              </p>
              <h3 className="text-2xl font-bold">아직 만든 메뉴판이 없습니다</h3>
              <p className="mx-auto mt-3 max-w-md break-keep text-sm font-medium leading-relaxed text-zinc-500">
                아직 생성된 메뉴판이 없습니다. 템플릿을 선택하고 결제하면 메뉴판이 자동으로 생성됩니다.
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

        <section className="grid gap-5 md:grid-cols-2">
          <article className="rounded-3xl bg-white p-7 shadow-sm">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.24em] text-zinc-400">
              Support
            </p>
            <h3 className="mb-3 text-2xl font-bold">문의 관리</h3>
            <p className="break-keep text-sm font-medium leading-relaxed text-zinc-500">
              메뉴판 운영 중 궁금한 점이나 요청사항을 남기고 답변 상태를 확인할 수 있습니다.
            </p>
            <Link
              href="/mypage/inquiries"
              className="mt-6 inline-flex items-center justify-center rounded-full bg-zinc-950 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-zinc-800"
            >
              문의하기
            </Link>
          </article>

          <article className="rounded-3xl bg-white p-7 shadow-sm">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.24em] text-zinc-400">
              Payments
            </p>
            <h3 className="mb-3 text-2xl font-bold">결제 연동</h3>
            <p className="break-keep text-sm font-medium leading-relaxed text-zinc-500">
              PortOne 결제 성공 웹훅 이후 `payments` 기록과 메뉴판 자동 생성을 연결합니다.
            </p>
            <Link
              href="/pricing"
              className="mt-6 inline-flex items-center justify-center rounded-full bg-zinc-950 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-zinc-800"
            >
              메뉴판 생성권 구매
            </Link>
          </article>
        </section>
        </div>
      </main>
    </>
  );
}
