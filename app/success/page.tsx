import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getPublicMenuUrl } from "@/lib/menu-url";
import { getTemplateDisplayName } from "@/lib/templates";
import type { Database } from "@/lib/supabase/types";

type PageProps = {
  searchParams: Promise<{
    menuSiteId?: string;
    slug?: string;
  }>;
};

type MenuSite = Pick<
  Database["public"]["Tables"]["menu_sites"]["Row"],
  "id" | "name" | "slug" | "template_key" | "status" | "created_at"
>;

function formatDate(date: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date));
}

export default async function SuccessPage({ searchParams }: PageProps) {
  const { menuSiteId, slug } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in?next=/success");
  }

  let menuSite: MenuSite | null = null;
  let errorMessage: string | null = null;

  if (menuSiteId || slug) {
    let query = supabase
      .from("menu_sites")
      .select("id, name, slug, template_key, status, created_at")
      .eq("user_id", user.id);

    query = menuSiteId ? query.eq("id", menuSiteId) : query.eq("slug", slug ?? "");

    const { data, error } = await query.maybeSingle();

    if (error) {
      errorMessage = error.message;
    } else {
      menuSite = (data ?? null) as MenuSite | null;
    }
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-24 text-zinc-950">
      <div className="mx-auto w-full max-w-3xl">
        <Link href="/" className="mb-6 inline-block text-sm font-bold text-zinc-400 hover:text-zinc-950">
          TABLE SCENE
        </Link>

        <section className="rounded-3xl bg-white p-8 shadow-sm">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-emerald-600">Success</p>
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">메뉴판이 생성되었습니다.</h1>
          <p className="mt-4 break-keep text-base font-medium leading-relaxed text-zinc-500">
            결제 검증이 완료되면 메뉴판은 작성중 상태로 생성됩니다. 마이페이지에서 내용을 수정한 뒤 공개 상태로 변경하세요.
          </p>

          {errorMessage && (
            <div className="mt-6 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-700">
              메뉴판 정보를 불러오지 못했습니다: {errorMessage}
            </div>
          )}

          {menuSite ? (
            <div className="mt-8 rounded-2xl border border-zinc-100 bg-zinc-50 p-5">
              <h2 className="text-2xl font-bold">{menuSite.name}</h2>
              <dl className="mt-5 space-y-3 text-sm font-medium">
                <div className="flex justify-between gap-4 border-t border-zinc-200 pt-3">
                  <dt className="text-zinc-400">공개 메뉴판 주소</dt>
                  <dd className="font-bold text-zinc-800">{getPublicMenuUrl(menuSite.slug)}</dd>
                </div>
                <div className="flex justify-between gap-4 border-t border-zinc-200 pt-3">
                  <dt className="text-zinc-400">템플릿</dt>
                  <dd className="font-bold text-zinc-800">{getTemplateDisplayName(menuSite.template_key)}</dd>
                </div>
                <div className="flex justify-between gap-4 border-t border-zinc-200 pt-3">
                  <dt className="text-zinc-400">status</dt>
                  <dd className="font-bold text-zinc-800">{menuSite.status}</dd>
                </div>
                <div className="flex justify-between gap-4 border-t border-zinc-200 pt-3">
                  <dt className="text-zinc-400">생성일</dt>
                  <dd className="font-bold text-zinc-800">{formatDate(menuSite.created_at)}</dd>
                </div>
              </dl>
            </div>
          ) : (
            <div className="mt-8 rounded-2xl border border-amber-100 bg-amber-50 p-5 text-sm font-bold leading-relaxed text-amber-700">
              아직 연결된 메뉴판 정보를 찾지 못했습니다. 실제 결제 연동 전이라면 `/apply`의 payload 확인 모드에서 여기로 자동 이동하지 않습니다.
            </div>
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={menuSite ? `/mypage/menus/${menuSite.id}/edit` : "/mypage"}
              className="inline-flex items-center justify-center rounded-full bg-zinc-950 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-zinc-800"
            >
              마이페이지에서 편집하기
            </Link>
            <Link
              href="/mypage"
              className="inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-bold text-zinc-700 transition-colors hover:bg-zinc-100"
            >
              마이페이지로 이동
            </Link>
            <button
              type="button"
              disabled
              className="inline-flex cursor-not-allowed items-center justify-center rounded-full border border-zinc-200 bg-zinc-100 px-5 py-3 text-sm font-bold text-zinc-400"
            >
              공개 페이지 준비중
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
