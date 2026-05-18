import Link from "next/link";
import { redirect } from "next/navigation";

import Footer from "@/app/components/layout/Footer";
import { signOutAction } from "@/app/auth/actions";
import OfficialSiteNavbar from "@/components/layout/OfficialSiteNavbar";
import { getPublicMenuUrl } from "@/lib/menu-url";
import { createClient } from "@/lib/supabase/server";
import { getTemplateDisplayName } from "@/lib/templates";
import type { Json } from "@/lib/supabase/types";

type MenuSite = {
  id: string | null;
  name: string | null;
  slug: string | null;
  template_key: string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
  settings: Json | null;
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

function getRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function getMetadataString(metadata: unknown, keys: string[]) {
  const record = getRecord(metadata);

  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function getProviderLabel(provider: string | null | undefined) {
  const normalizedProvider = getSafeString(provider).toLowerCase();
  const labels: Record<string, string> = {
    email: "이메일",
    kakao: "카카오",
    google: "구글",
  };

  return normalizedProvider ? labels[normalizedProvider] ?? normalizedProvider : "확인 필요";
}

function getPrimaryProvider(appMetadata: unknown, identityProviders: string[]) {
  const metadata = getRecord(appMetadata);
  const provider = typeof metadata.provider === "string" ? metadata.provider : "";

  if (provider) {
    return provider;
  }

  return identityProviders[0] ?? "email";
}

function getIdentityProviders(identities: Array<{ provider?: string | null }> | null | undefined) {
  const providers = (identities ?? [])
    .map((identity) => getSafeString(identity.provider))
    .filter(Boolean);

  return Array.from(new Set(providers));
}

function getMenuSiteSettings(settings: Json | null | undefined) {
  return getRecord(settings);
}

function getSettingsString(settings: Record<string, unknown>, key: string) {
  const value = settings[key];
  return typeof value === "string" ? value : "";
}

function getDaysUntil(date: string) {
  const time = new Date(date).getTime();

  if (!Number.isFinite(time)) {
    return null;
  }

  return Math.ceil((time - Date.now()) / (1000 * 60 * 60 * 24));
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
    .select("id, name, slug, template_key, status, created_at, updated_at, settings")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  const sites = (menuSites ?? []) as MenuSite[];
  const identityProviders = getIdentityProviders(user.identities);
  const primaryProvider = getPrimaryProvider(user.app_metadata, identityProviders);
  const displayName = getMetadataString(user.user_metadata, ["display_name", "full_name", "name", "nickname"]);
  const connectedAccounts = identityProviders.length > 0 ? identityProviders : [primaryProvider];

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
                <a href="#account-info" className="flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-bold text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-950">
                  <span>계정 정보</span>
                </a>
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
                const settings = getMenuSiteSettings(site.settings);
                const planType = getSettingsString(settings, "plan_type");
                const billingCycle = getSettingsString(settings, "billing_cycle");
                const isPersonalTrial = planType === "personal_trial";
                const isBusinessBasic = planType === "business_basic";
                const accessExpiresAt = getSettingsString(settings, "access_expires_at");
                const dataRetentionUntil = getSettingsString(settings, "data_retention_until");
                const daysUntilExpiry = accessExpiresAt ? getDaysUntil(accessExpiresAt) : null;
                const daysUntilRetentionEnds = dataRetentionUntil ? getDaysUntil(dataRetentionUntil) : null;
                const isTrialExpired = typeof daysUntilExpiry === "number" && daysUntilExpiry <= 0;

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

                    {isPersonalTrial && (
                      <div className="mb-6 rounded-2xl border border-amber-100 bg-amber-50 p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-amber-800 ring-1 ring-amber-100">
                            {isTrialExpired ? "체험 기간 종료" : "개인 체험 이용 중"}
                          </span>
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-amber-800 ring-1 ring-amber-100">
                            1개월 단건 이용
                          </span>
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-amber-800 ring-1 ring-amber-100">
                            자동결제 없음
                          </span>
                        </div>
                        <p className="mt-3 break-keep text-xs font-bold leading-relaxed text-amber-800">
                          {isTrialExpired
                            ? `체험 기간이 종료되었습니다. ${
                                typeof daysUntilRetentionEnds === "number" && daysUntilRetentionEnds > 0
                                  ? `데이터 보관 만료까지 ${daysUntilRetentionEnds}일 남았습니다.`
                                  : "데이터 보관 기간이 종료되었거나 확인이 필요합니다."
                              }`
                            : `만료일 ${formatDate(accessExpiresAt)}${
                                typeof daysUntilExpiry === "number" ? `, 남은 기간 ${daysUntilExpiry}일` : ""
                              }`}
                        </p>
                        <p className="mt-2 break-keep text-xs font-bold leading-relaxed text-amber-700">
                          계속 이용하려면 사업자 인증 후 정식 플랜으로 전환해야 합니다. 정식 전환 기능은 준비 중입니다.
                        </p>
                      </div>
                    )}

                    {isBusinessBasic && (
                      <div className="mb-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-emerald-800 ring-1 ring-emerald-100">
                            사업자 정식
                          </span>
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-emerald-800 ring-1 ring-emerald-100">
                            {billingCycle === "yearly" ? "연 자동결제" : "월 자동결제"}
                          </span>
                        </div>
                        <p className="mt-3 break-keep text-xs font-bold leading-relaxed text-emerald-800">
                          다음 결제일과 인증 사업자 정보는 자동결제/사업자 인증 연동 후 표시됩니다.
                        </p>
                      </div>
                    )}

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

            <section id="account-info" className="scroll-mt-28">
              <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-end">
                <div>
                  <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-zinc-400">계정 정보</p>
                  <h2 className="text-2xl font-bold tracking-tight">로그인 및 가입 정보</h2>
                  <p className="mt-3 break-keep text-sm font-medium leading-relaxed text-zinc-500">
                    현재 계정의 로그인 방식과 연결된 인증 정보를 확인합니다.
                  </p>
                </div>
                <Link
                  href="/forgot-password"
                  className="inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-bold text-zinc-700 transition-colors hover:bg-zinc-100"
                >
                  비밀번호 재설정
                </Link>
              </div>

              <article className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                <dl className="grid gap-5 md:grid-cols-2">
                  <div className="rounded-2xl bg-zinc-50 p-4">
                    <dt className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">로그인 이메일</dt>
                    <dd className="mt-2 break-all text-sm font-bold text-zinc-900">{user.email ?? "이메일 정보 없음"}</dd>
                  </div>
                  <div className="rounded-2xl bg-zinc-50 p-4">
                    <dt className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">가입 방식</dt>
                    <dd className="mt-2 text-sm font-bold text-zinc-900">{getProviderLabel(primaryProvider)}</dd>
                  </div>
                  <div className="rounded-2xl bg-zinc-50 p-4">
                    <dt className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">연결된 소셜 계정</dt>
                    <dd className="mt-2 flex flex-wrap gap-2">
                      {connectedAccounts.map((provider) => (
                        <span key={provider} className="rounded-full bg-white px-3 py-1 text-xs font-black text-zinc-700 ring-1 ring-zinc-200">
                          {getProviderLabel(provider)}
                        </span>
                      ))}
                    </dd>
                  </div>
                  <div className="rounded-2xl bg-zinc-50 p-4">
                    <dt className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">가입일</dt>
                    <dd className="mt-2 text-sm font-bold text-zinc-900">{formatDate(user.created_at ?? null)}</dd>
                  </div>
                  <div className="rounded-2xl bg-zinc-50 p-4">
                    <dt className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">최근 로그인일</dt>
                    <dd className="mt-2 text-sm font-bold text-zinc-900">{formatDate(user.last_sign_in_at ?? null)}</dd>
                  </div>
                  <div className="rounded-2xl bg-zinc-50 p-4">
                    <dt className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">이름 또는 매장명</dt>
                    <dd className="mt-2 break-keep text-sm font-bold text-zinc-900">
                      {displayName || "아직 등록된 업체 정보가 없습니다."}
                    </dd>
                  </div>
                  <div className="rounded-2xl bg-zinc-50 p-4 md:col-span-2">
                    <dt className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">사용자 ID</dt>
                    <dd className="mt-2 break-all font-mono text-xs font-bold text-zinc-600">{user.id}</dd>
                  </div>
                </dl>
                <p className="mt-5 break-keep text-xs font-semibold leading-relaxed text-zinc-400">
                  업체명, 담당자명, 연락처를 별도로 관리하려면 사용자 프로필 테이블과 계정 정보 수정 화면이 필요합니다.
                </p>
              </article>
            </section>
          </div>
        </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
