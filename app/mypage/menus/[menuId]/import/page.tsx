import Link from "next/link";
import { redirect } from "next/navigation";

import Footer from "@/app/components/layout/Footer";
import OfficialSiteNavbar from "@/components/layout/OfficialSiteNavbar";
import PendingSubmitButton from "@/components/mypage/menu-editor/PendingSubmitButton";
import {
  canImportIntoMenuCatalogTarget,
  getMenuCatalogImportModeDescription,
  getMenuCatalogImportModeLabel,
  MENU_CATALOG_CONFIRMATION,
  MENU_CATALOG_DISCONNECT_CONFIRMATION,
  MENU_CATALOG_IMPORT_MODES,
  MENU_CATALOG_LINKED_SHARED_FIELDS,
  MENU_CATALOG_MENU_SPECIFIC_FIELDS,
} from "@/lib/menu-catalog";
import { createClient } from "@/lib/supabase/server";
import { getTemplateDisplayName } from "@/lib/templates";

import { disconnectMenuSiteContentAction, importMenuSiteContentAction } from "./actions";

type PageProps = {
  params: Promise<{ menuId: string }>;
  searchParams: Promise<{ error?: string | string[]; message?: string | string[] }>;
};

type ContentLinkRow = {
  source_menu_site_id: string;
  target_menu_site_id: string;
  mode: "linked" | "independent";
  status: "active" | "copied" | "disconnected";
  created_at: string;
};

type ContentLinkFilter = {
  eq: (column: string, value: string) => ContentLinkFilter;
  maybeSingle: () => Promise<{ data: ContentLinkRow | null; error: { message: string } | null }>;
};

type UntypedContentLinkClient = {
  from: (table: string) => {
    select: (columns: string) => ContentLinkFilter;
  };
};

function getFirstSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    draft: "작성중",
    published: "공개중",
    archived: "보관중",
  };
  return labels[status] ?? status;
}

export default async function ImportMenuContentPage({ params, searchParams }: PageProps) {
  const [{ menuId }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/sign-in?next=${encodeURIComponent(`/mypage/menus/${menuId}/import`)}`);
  }

  const [{ data: targetMenuSite }, { data: ownedMenuSites }] = await Promise.all([
    supabase
      .from("menu_sites")
      .select("id, user_id, name, template_key, status")
      .eq("id", menuId)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("menu_sites")
      .select("id, name, template_key, status, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false }),
  ]);

  if (!targetMenuSite) {
    redirect("/mypage?error=menu-import-not-allowed");
  }

  const sourceMenuSites = (ownedMenuSites ?? []).filter((menuSite) => menuSite.id !== menuId && menuSite.status !== "archived");
  const canImport = canImportIntoMenuCatalogTarget(targetMenuSite.status);
  const error = getFirstSearchParam(resolvedSearchParams.error);
  const message = getFirstSearchParam(resolvedSearchParams.message);
  const action = importMenuSiteContentAction.bind(null, menuId);
  const disconnectAction = disconnectMenuSiteContentAction.bind(null, menuId);
  const { data: activeLink } = await (supabase as unknown as UntypedContentLinkClient)
    .from("menu_site_content_links")
    .select("source_menu_site_id, target_menu_site_id, mode, status, created_at")
    .eq("target_menu_site_id", menuId)
    .eq("status", "active")
    .maybeSingle();
  const linkedSource = activeLink
    ? (ownedMenuSites ?? []).find((menuSite) => menuSite.id === activeLink.source_menu_site_id) ?? null
    : null;

  return (
    <>
      <OfficialSiteNavbar />
      <main className="min-h-screen bg-zinc-50 px-5 py-10 text-zinc-950">
        <div className="mx-auto w-full max-w-5xl">
          <div className="mb-8 flex flex-col justify-between gap-5 border-b border-zinc-200 pb-8 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-bold text-zinc-500">공통 메뉴</p>
              <h1 className="mt-2 text-4xl font-bold tracking-tight">기존 메뉴판에서 가져오기</h1>
              <p className="mt-4 max-w-2xl break-keep text-base leading-7 text-zinc-600">
                다른 메뉴판의 페이지·카테고리·메뉴를 가져옵니다. 연결 모드를 선택하면 메뉴 내용은 함께 관리하고 화면 배치는 각각 구성할 수 있습니다.
              </p>
            </div>
            <Link
              href={`/mypage/menus/${menuId}/edit`}
              className="inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-bold text-zinc-700 transition hover:bg-zinc-100"
            >
              편집 화면으로 돌아가기
            </Link>
          </div>

          {error ? (
            <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 p-5 text-sm font-bold leading-6 text-red-700">
              {error}
            </div>
          ) : null}
          {message ? (
            <div className="mb-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-5 text-sm font-bold leading-6 text-emerald-700">
              {message}
            </div>
          ) : null}

          <section className="mb-6 rounded-3xl border border-zinc-200 bg-white p-7 shadow-sm">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
              <div>
                <p className="text-xs font-bold text-zinc-400">가져올 대상</p>
                <h2 className="mt-2 text-2xl font-bold">{targetMenuSite.name}</h2>
                <p className="mt-2 text-sm font-semibold text-zinc-500">
                  {getTemplateDisplayName(targetMenuSite.template_key)} · {getStatusLabel(targetMenuSite.status)}
                </p>
              </div>
              <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${canImport ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                {canImport ? "가져오기 가능" : "작성중 메뉴판만 가능"}
              </span>
            </div>
            {!canImport ? (
              <p className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-800">
                공개 중인 메뉴판을 자동으로 덮어쓰지 않습니다. 새 작성중 메뉴판을 만든 뒤 이 기능을 이용해 주세요.
              </p>
            ) : null}
          </section>

          <div className="mb-6 grid gap-5 md:grid-cols-2">
            <section className="rounded-3xl border border-zinc-200 bg-white p-7">
              <h2 className="text-xl font-bold">연결 시 함께 변경</h2>
              <ul className="mt-5 space-y-3 text-sm font-semibold text-zinc-600">
                {MENU_CATALOG_LINKED_SHARED_FIELDS.map((field) => <li key={field}>✓ {field}</li>)}
              </ul>
            </section>
            <section className="rounded-3xl border border-zinc-200 bg-white p-7">
              <h2 className="text-xl font-bold">메뉴판별로 개별 관리</h2>
              <ul className="mt-5 space-y-3 text-sm font-semibold text-zinc-600">
                {MENU_CATALOG_MENU_SPECIFIC_FIELDS.map((field) => <li key={field}>• {field}</li>)}
              </ul>
            </section>
          </div>

          {activeLink ? (
            <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-7 shadow-sm">
              <p className="text-sm font-bold text-emerald-700">연결된 공통 메뉴</p>
              <h2 className="mt-2 text-2xl font-bold text-emerald-950">{linkedSource?.name ?? "원본 메뉴판"}</h2>
              <p className="mt-3 break-keep text-sm font-semibold leading-6 text-emerald-900">
                카테고리명과 메뉴명·설명·가격·이미지·배지·품절·번역이 연결되어 있습니다. 페이지 배치와 디자인은 현재 메뉴판에서 별도로 관리합니다.
              </p>
              <p className="mt-2 break-keep text-xs font-semibold leading-5 text-emerald-800">
                연결된 메뉴판에서 공통 정보를 편집할 수 있는 직원은 다른 연결 메뉴판의 같은 정보에도 영향을 줄 수 있습니다. 메뉴 추가·삭제는 메뉴판마다 별도입니다.
              </p>
              <form action={disconnectAction} className="mt-6 rounded-2xl bg-white p-5">
                <label className="block text-sm font-bold text-zinc-800">
                  연결을 끊으려면 <span className="rounded bg-zinc-100 px-2 py-1">{MENU_CATALOG_DISCONNECT_CONFIRMATION}</span> 입력
                  <input
                    type="text"
                    name="confirmation"
                    required
                    autoComplete="off"
                    className="mt-3 block w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-base font-semibold outline-none focus:border-zinc-600"
                  />
                </label>
                <PendingSubmitButton
                  pendingLabel="연결을 해제하는 중..."
                  className="mt-4 rounded-full border border-zinc-300 bg-white px-5 py-3 text-sm font-bold text-zinc-700"
                >
                  연결 해제
                </PendingSubmitButton>
              </form>
            </section>
          ) : sourceMenuSites.length === 0 ? (
            <section className="rounded-3xl border border-zinc-200 bg-white p-8 text-center">
              <h2 className="text-2xl font-bold">가져올 다른 메뉴판이 없습니다</h2>
              <p className="mt-3 text-sm font-semibold text-zinc-500">같은 계정에 메뉴판이 두 개 이상 있을 때 사용할 수 있습니다.</p>
              <Link href="/templates" className="mt-6 inline-flex rounded-full bg-zinc-950 px-6 py-3 text-sm font-bold text-white">
                새 메뉴판 만들기
              </Link>
            </section>
          ) : (
            <form action={action} className={`space-y-6 ${canImport ? "" : "pointer-events-none opacity-50"}`}>
              <section className="rounded-3xl border border-zinc-200 bg-white p-7 shadow-sm">
                <fieldset>
                  <legend className="text-2xl font-bold">1. 원본 메뉴판 선택</legend>
                  <div className="mt-5 grid gap-3 md:grid-cols-2">
                    {sourceMenuSites.map((menuSite, index) => (
                      <label key={menuSite.id} className="flex cursor-pointer items-start gap-3 rounded-2xl border border-zinc-200 p-5 transition hover:border-zinc-400">
                        <input type="radio" name="sourceMenuSiteId" value={menuSite.id} required defaultChecked={index === 0} className="mt-1 size-4 accent-zinc-950" />
                        <span>
                          <span className="block text-base font-bold">{menuSite.name}</span>
                          <span className="mt-1 block text-xs font-semibold text-zinc-500">
                            {getTemplateDisplayName(menuSite.template_key)} · {getStatusLabel(menuSite.status)}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              </section>

              <section className="rounded-3xl border border-zinc-200 bg-white p-7 shadow-sm">
                <fieldset>
                  <legend className="text-2xl font-bold">2. 연결 방식 선택</legend>
                  <div className="mt-5 grid gap-3 md:grid-cols-2">
                    {MENU_CATALOG_IMPORT_MODES.map((mode, index) => (
                      <label key={mode} className="flex cursor-pointer items-start gap-3 rounded-2xl border border-zinc-200 p-5 transition hover:border-zinc-400">
                        <input type="radio" name="mode" value={mode} required defaultChecked={index === 0} className="mt-1 size-4 accent-zinc-950" />
                        <span>
                          <span className="block text-base font-bold">{getMenuCatalogImportModeLabel(mode)}</span>
                          <span className="mt-2 block break-keep text-sm leading-6 text-zinc-500">{getMenuCatalogImportModeDescription(mode)}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              </section>

              <section className="rounded-3xl border border-amber-200 bg-amber-50 p-7">
                <h2 className="text-xl font-bold text-amber-950">3. 대상 내용 교체 확인</h2>
                <p className="mt-3 break-keep text-sm font-semibold leading-6 text-amber-900">
                  대상 메뉴판의 현재 페이지·카테고리·메뉴·타임세일·위젯은 제거되고 원본 메뉴 내용으로 교체됩니다. 원본 메뉴판은 삭제하거나 변경하지 않습니다.
                </p>
                <label className="mt-5 block text-sm font-bold text-amber-950">
                  계속하려면 <span className="rounded bg-white px-2 py-1">{MENU_CATALOG_CONFIRMATION}</span> 입력
                  <input
                    type="text"
                    name="confirmation"
                    required
                    autoComplete="off"
                    className="mt-3 block w-full rounded-2xl border border-amber-300 bg-white px-4 py-3 text-base font-semibold outline-none focus:border-amber-600"
                  />
                </label>
              </section>

              <div className="flex justify-end">
                <PendingSubmitButton
                  pendingLabel="메뉴를 가져오는 중..."
                  disabled={!canImport}
                  className="rounded-full bg-zinc-950 px-7 py-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-zinc-300"
                >
                  메뉴 가져오기
                </PendingSubmitButton>
              </div>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
