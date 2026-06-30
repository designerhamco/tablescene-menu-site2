import Link from "next/link";
import { redirect } from "next/navigation";

import Footer from "@/app/components/layout/Footer";
import OfficialSiteNavbar from "@/components/layout/OfficialSiteNavbar";
import { createMenuSiteAction } from "@/app/mypage/menus/actions";
import { BASIC_MENU_SITE_LIMIT, getBasicMenuSiteLimitState } from "@/lib/server/basic-menu-site-limit-service";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import TemplateCatalogPicker from "./TemplateCatalogPicker";

type SearchParams = Promise<{
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
  const errorMessage = getSearchParam(params.error);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in?next=/mypage/menus/new");
  }

  const limitState = await getBasicMenuSiteLimitState({
    adminSupabase: createAdminClient(),
    userId: user.id,
  });

  const hasActiveBasicSubscription = Boolean(limitState.activeBasicSubscription);
  const canCreate = hasActiveBasicSubscription && limitState.canCreate;
  const displayLimit = limitState.limit || BASIC_MENU_SITE_LIMIT;
  const nextSlot = Math.min(limitState.usedCount + 1, displayLimit);
  const isPersonalTrialMenuLimited = limitState.isPersonalTrialLimited;

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950">
      <OfficialSiteNavbar />

      <section className="mx-auto w-full max-w-6xl px-5 py-12 md:py-16">
        <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <Link href="/mypage" className="text-sm font-black text-zinc-500 transition-colors hover:text-zinc-950">
              ← 마이페이지로 돌아가기
            </Link>
            <h1 className="mt-5 text-4xl font-black tracking-tight">Basic 메뉴판 추가</h1>
            <p className="mt-3 max-w-2xl break-keep text-sm font-bold leading-relaxed text-zinc-500">
              이용 중인 Basic 구독 하나로 메뉴판을 최대 {BASIC_MENU_SITE_LIMIT}개까지 만들 수 있습니다.
              Basic 구독이 여러 개라면 전체 생성 가능 수도 구독 수만큼 늘어납니다.
              추가 메뉴판은 새 결제 없이 남은 슬롯이 있는 기존 Basic 구독 권한에 연결됩니다.
            </p>
          </div>

          <span className="inline-flex w-fit items-center rounded-full bg-white px-4 py-2 text-sm font-black text-zinc-700 shadow-sm ring-1 ring-zinc-200">
            {limitState.usedCount}/{displayLimit}개 사용 중
          </span>
        </div>

        {errorMessage ? (
          <div className="mb-6 rounded-3xl border border-red-100 bg-red-50 p-5 text-sm font-bold text-red-700">
            {errorMessage}
          </div>
        ) : null}

        {!hasActiveBasicSubscription ? (
          <div className="rounded-3xl border border-dashed border-zinc-200 bg-white p-10 text-center shadow-sm">
            <h2 className="text-2xl font-black">
              {isPersonalTrialMenuLimited ? "체험 메뉴판 1/1개 사용 중" : "이용 중인 Basic 구독이 필요합니다"}
            </h2>
            <p className="mx-auto mt-3 max-w-lg break-keep text-sm font-bold leading-relaxed text-zinc-500">
              {isPersonalTrialMenuLimited
                ? "개인 체험은 메뉴판 1개만 만들 수 있습니다. 사업자 Basic 월결제 또는 연결제로 전환하면 구독 1개당 Basic 메뉴판을 최대 3개까지 만들 수 있습니다."
                : "Basic 메뉴판 추가 생성은 활성화된 Basic 월결제 또는 연결제 구독이 있는 계정에서 사용할 수 있습니다."}
            </p>
            <Link
              href="/apply/basic"
              className="mt-7 inline-flex items-center justify-center rounded-full bg-zinc-950 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-zinc-800"
            >
              Basic 신청하기
            </Link>
          </div>
        ) : !canCreate ? (
          <div className="rounded-3xl border border-dashed border-zinc-200 bg-white p-10 text-center shadow-sm">
            <h2 className="text-2xl font-black">메뉴판 {limitState.usedCount}/{displayLimit}개 사용 중</h2>
            <p className="mx-auto mt-3 max-w-lg break-keep text-sm font-bold leading-relaxed text-zinc-500">
              Basic 구독으로 만들 수 있는 메뉴판 수를 모두 사용했습니다. 기존 메뉴판을 정리하거나 추가 정책이 필요하면 고객지원으로 문의해주세요.
            </p>
            <Link
              href="/mypage"
              className="mt-7 inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-bold text-zinc-800 transition-colors hover:bg-zinc-100"
            >
              내 메뉴판으로 돌아가기
            </Link>
          </div>
        ) : (
          <form action={createMenuSiteAction} className="space-y-7">
            <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="grid gap-5 md:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-black">메뉴판 이름</span>
                  <input
                    name="name"
                    type="text"
                    required
                    maxLength={80}
                    placeholder="예: 성수점 메뉴판"
                    className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold outline-none transition-colors focus:border-zinc-950"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-black">공개 주소</span>
                  <input
                    name="slug"
                    type="text"
                    required
                    minLength={3}
                    maxLength={60}
                    placeholder="예: seongsu-menu"
                    className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold outline-none transition-colors focus:border-zinc-950"
                  />
                  <span className="mt-2 block break-keep text-xs font-bold text-zinc-400">
                    영문 소문자, 숫자, 하이픈만 사용할 수 있습니다.
                  </span>
                </label>
              </div>
            </div>

            <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
              <TemplateCatalogPicker />
            </div>

            <div className="flex flex-col justify-between gap-3 rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm md:flex-row md:items-center">
              <p className="break-keep text-sm font-bold leading-relaxed text-zinc-500">
                생성 후 현재 Basic 구독 권한에 연결됩니다. 새 주문, 결제, 구독, AI 기본 제공량 지급은 발생하지 않습니다.
              </p>
              <button
                type="submit"
                className="inline-flex shrink-0 items-center justify-center rounded-full bg-zinc-950 px-5 py-3 text-sm font-black text-white transition-colors hover:bg-zinc-800"
              >
                선택한 템플릿으로 만들기 {nextSlot}/{displayLimit}
              </button>
            </div>
          </form>
        )}
      </section>

      <Footer />
    </main>
  );
}
