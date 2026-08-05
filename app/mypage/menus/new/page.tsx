import Link from "next/link";
import { redirect } from "next/navigation";

import Footer from "@/app/components/layout/Footer";
import OfficialSiteNavbar from "@/components/layout/OfficialSiteNavbar";
import { createClient } from "@/lib/supabase/server";

type SearchParams = Promise<{
  code?: string | string[];
  error?: string | string[];
}>;

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function NewMenuSitePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const errorCode = getSearchParam(params.code);
  const errorMessage = getSearchParam(params.error);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in?next=/mypage/menus/new");
  }

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950">
      <OfficialSiteNavbar />

      <section className="mx-auto flex w-full max-w-3xl flex-col px-5 py-12 md:py-16">
        <Link href="/mypage?tab=menus" className="w-fit text-sm font-black text-zinc-500 transition-colors hover:text-zinc-950">
          ← 마이페이지로 돌아가기
        </Link>

        <div className="mt-6 border-y border-zinc-200 bg-white px-6 py-10 sm:px-10">
          <p className="text-xs font-black uppercase text-zinc-400">MenuLink Basic</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">새 메뉴판이 필요하신가요?</h1>
          <p className="mt-4 max-w-xl break-keep text-sm font-bold leading-relaxed text-zinc-600">
            새 메뉴판은 추가 구매 후 생성할 수 있습니다. 기존 메뉴판과 구독은 그대로 유지되며, 새 구매가 완료되면 별도의 메뉴판 한 개가 생성됩니다.
          </p>

          {errorMessage ? (
            <div className="mt-6 border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800" role="status">
              {errorMessage}
              {errorCode === "ADDITIONAL_MENU_SITE_PURCHASE_REQUIRED" ? (
                <span className="sr-only"> 추가 구매 필요</span>
              ) : null}
            </div>
          ) : null}

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/apply/basic"
              className="inline-flex items-center justify-center rounded-full bg-zinc-950 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-zinc-800"
            >
              메뉴판 추가 구매
            </Link>
            <Link
              href="/mypage?tab=menus"
              className="inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-bold text-zinc-700 transition-colors hover:bg-zinc-100"
            >
              기존 메뉴판 관리
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
