import Link from "next/link";
import { redirect } from "next/navigation";

import { deleteInquiryReplyAction, replyInquiryAction } from "@/app/admin/actions";
import { signOutAction } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type SearchParams = Promise<{
  error?: string;
  message?: string;
  inquiryPage?: string;
  inquiryStatus?: string;
  inquiryId?: string;
}>;

type MenuSite = Pick<
  Database["public"]["Tables"]["menu_sites"]["Row"],
  "id" | "name" | "slug" | "user_id" | "template_key" | "status" | "created_at"
>;

type Inquiry = Pick<
  Database["public"]["Tables"]["inquiries"]["Row"],
  "id" | "title" | "message" | "status" | "user_id" | "admin_reply" | "replied_at" | "created_at" | "updated_at"
>;

type CountResult = {
  count: number;
  error: string | null;
};

const inquiryPageSize = 10;
const inquiryStatusFilters = [
  { value: "all", label: "전체" },
  { value: "open", label: "답변 전" },
  { value: "answered", label: "답변 후" },
] as const;

type InquiryStatusFilter = (typeof inquiryStatusFilters)[number]["value"];

function normalizeInquiryStatusFilter(value?: string): InquiryStatusFilter {
  if (value === "open" || value === "answered") {
    return value;
  }

  return "all";
}

function normalizePage(value?: string) {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function formatDate(date: string | null) {
  if (!date) {
    return "-";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

function getStatusClassName(status: string) {
  const classes: Record<string, string> = {
    draft: "bg-amber-50 text-amber-700",
    published: "bg-emerald-50 text-emerald-700",
    archived: "bg-zinc-100 text-zinc-600",
    open: "bg-amber-50 text-amber-700",
    answered: "bg-emerald-50 text-emerald-700",
    closed: "bg-zinc-100 text-zinc-600",
  };

  return classes[status] ?? "bg-zinc-100 text-zinc-600";
}

function getInquiryStatusLabel(status: string) {
  const labels: Record<string, string> = {
    open: "답변 전",
    answered: "답변 후",
    closed: "종료",
  };

  return labels[status] ?? status;
}

function getNoticeMessage(message?: string) {
  if (message === "inquiry-answered") {
    return "문의 답변이 저장되었습니다.";
  }

  if (message === "inquiry-reply-deleted") {
    return "문의 답변이 삭제되었습니다.";
  }

  return null;
}

function getErrorMessage(error?: string) {
  return error ? decodeURIComponent(error) : null;
}

function getAdminActionButtonClassName(tone: "primary" | "secondary" | "danger") {
  const base =
    "inline-flex min-h-11 items-center justify-center rounded-full px-5 py-3 text-sm font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white";

  if (tone === "primary") {
    return `${base} bg-zinc-950 text-white hover:bg-zinc-800 focus:ring-zinc-950`;
  }

  if (tone === "danger") {
    return `${base} border border-red-100 bg-red-50 text-red-700 hover:bg-red-100 focus:ring-red-200`;
  }

  return `${base} border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 focus:ring-zinc-200`;
}

async function getTableCount(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: "menu_sites" | "inquiries" | "orders" | "payments",
  filters?: (query: ReturnType<typeof supabase.from>) => unknown
): Promise<CountResult> {
  let query = supabase.from(table).select("*", { count: "exact", head: true });

  if (filters) {
    query = filters(query) as typeof query;
  }

  const { count, error } = await query;

  return {
    count: count ?? 0,
    error: error?.message ?? null,
  };
}

export default async function AdminPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in?next=/admin");
  }

  const { data: adminUser, error: adminError } = await supabase
    .from("admin_users")
    .select("user_id, memo, created_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (adminError || !adminUser) {
    return (
      <main className="min-h-screen bg-zinc-950 px-6 py-24 text-white">
        <div className="mx-auto flex min-h-[calc(100vh-12rem)] w-full max-w-2xl flex-col justify-center">
          <Link href="/" className="mb-10 text-sm font-bold text-white/50 hover:text-white">
            TABLE SCENE
          </Link>

          <section className="rounded-3xl border border-white/10 bg-white p-8 text-zinc-950 shadow-2xl">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.3em] text-zinc-400">Admin Access</p>
            <h1 className="text-3xl font-bold tracking-tight">관리자 권한이 필요합니다</h1>
            <p className="mt-4 break-keep text-base font-medium leading-relaxed text-zinc-500">
              로그인은 되어 있지만 현재 계정이 `admin_users` 테이블에 등록되어 있지 않아 관리자 페이지를 열 수 없습니다.
            </p>

            <div className="mt-8 rounded-2xl bg-zinc-50 p-5 text-sm font-medium text-zinc-600">
              <p className="mb-2 font-bold text-zinc-950">현재 로그인 계정</p>
              <p>Email: {user.email}</p>
              <p className="break-all">User ID: {user.id}</p>
              {adminError && <p className="mt-4 break-keep text-red-600">admin_users 조회 오류: {adminError.message}</p>}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/mypage"
                className="flex items-center justify-center rounded-full bg-zinc-950 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-zinc-800"
              >
                마이페이지로 이동
              </Link>
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="w-full rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-bold text-zinc-700 transition-colors hover:bg-zinc-100"
                >
                  로그아웃
                </button>
              </form>
            </div>
          </section>
        </div>
      </main>
    );
  }

  const { error, message, inquiryPage, inquiryStatus, inquiryId } = await searchParams;
  const errorMessage = getErrorMessage(error);
  const noticeMessage = getNoticeMessage(message);
  const activeInquiryStatus = normalizeInquiryStatusFilter(inquiryStatus);
  const activeInquiryPage = normalizePage(inquiryPage);
  const inquiryFrom = (activeInquiryPage - 1) * inquiryPageSize;
  const inquiryTo = inquiryFrom + inquiryPageSize - 1;

  let inquiriesQuery = supabase
    .from("inquiries")
    .select("id, title, message, status, user_id, admin_reply, replied_at, created_at, updated_at", { count: "exact" });

  if (activeInquiryStatus !== "all") {
    inquiriesQuery = inquiriesQuery.eq("status", activeInquiryStatus);
  }

  const [
    totalMenus,
    publishedMenus,
    draftMenus,
    totalInquiries,
    openInquiries,
    totalOrders,
    totalPayments,
    recentMenusResult,
    inquiriesResult,
    recentOrdersResult,
    recentPaymentsResult,
  ] = await Promise.all([
    getTableCount(supabase, "menu_sites"),
    getTableCount(supabase, "menu_sites", (query) => query.eq("status", "published")),
    getTableCount(supabase, "menu_sites", (query) => query.eq("status", "draft")),
    getTableCount(supabase, "inquiries"),
    getTableCount(supabase, "inquiries", (query) => query.eq("status", "open")),
    getTableCount(supabase, "orders"),
    getTableCount(supabase, "payments"),
    supabase
      .from("menu_sites")
      .select("id, name, slug, user_id, template_key, status, created_at")
      .order("created_at", { ascending: false })
      .limit(8),
    inquiriesQuery.order("created_at", { ascending: false }).range(inquiryFrom, inquiryTo),
    supabase.from("orders").select("id, menu_site_id, customer_name, status, total_amount, created_at").order("created_at", { ascending: false }).limit(5),
    supabase.from("payments").select("id, user_id, order_id, status, amount, created_at").order("created_at", { ascending: false }).limit(5),
  ]);

  const recentMenus = (recentMenusResult.data ?? []) as MenuSite[];
  const inquiries = (inquiriesResult.data ?? []) as Inquiry[];
  const recentOrders = recentOrdersResult.data ?? [];
  const recentPayments = recentPaymentsResult.data ?? [];
  const inquiryTotalCount = inquiriesResult.count ?? 0;
  const inquiryTotalPages = Math.max(1, Math.ceil(inquiryTotalCount / inquiryPageSize));
  const selectedInquiryId = inquiryId ?? null;
  const selectedInquiry = inquiries.find((inquiry) => inquiry.id === selectedInquiryId) ?? null;

  const metricCards = [
    { label: "전체 메뉴판 수", value: totalMenus.count, error: totalMenus.error },
    { label: "published 메뉴판 수", value: publishedMenus.count, error: publishedMenus.error },
    { label: "draft 메뉴판 수", value: draftMenus.count, error: draftMenus.error },
    { label: "전체 문의 수", value: totalInquiries.count, error: totalInquiries.error },
    { label: "답변 대기 문의 수", value: openInquiries.count, error: openInquiries.error },
    { label: "전체 주문 수", value: totalOrders.count, error: totalOrders.error },
    { label: "전체 결제 수", value: totalPayments.count, error: totalPayments.error },
  ];

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-24 text-white">
      <div className="mx-auto w-full max-w-7xl">
        <header className="mb-12 flex flex-col justify-between gap-6 border-b border-white/10 pb-8 md:flex-row md:items-end">
          <div>
            <Link href="/" className="mb-6 inline-block text-sm font-bold text-white/50 hover:text-white">
              TABLE SCENE
            </Link>
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.3em] text-[#F8E731]">Admin Dashboard</p>
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">운영자 관리자 페이지</h1>
            <p className="mt-4 break-keep text-base font-medium leading-relaxed text-white/60">
              전체 메뉴판, 문의, 주문, 결제 현황을 Supabase 데이터로 확인합니다.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/mypage"
              className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-white/80 transition-colors hover:bg-white hover:text-zinc-950"
            >
              마이페이지
            </Link>
            <form action={signOutAction}>
              <button
                type="submit"
                className="rounded-full border border-white/10 bg-white px-5 py-3 text-sm font-bold text-zinc-950 transition-colors hover:bg-[#F8E731]"
              >
                로그아웃
              </button>
            </form>
          </div>
        </header>

        {noticeMessage && (
          <div className="mb-6 rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-5 text-sm font-bold text-emerald-100">
            {noticeMessage}
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 rounded-3xl border border-red-400/20 bg-red-400/10 p-5 text-sm font-bold text-red-100">
            {errorMessage}
          </div>
        )}

        <section className="mb-8 rounded-3xl border border-white/10 bg-white/5 p-8">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-white/40">Signed In Admin</p>
          <h2 className="text-2xl font-bold">{user.email}</h2>
          <div className="mt-4 grid gap-2 text-sm font-medium text-white/50 md:grid-cols-2">
            <p className="break-all">User ID: {user.id}</p>
            <p>Admin memo: {adminUser.memo ?? "none"}</p>
          </div>
        </section>

        <section className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {metricCards.map((metric) => (
            <article key={metric.label} className="rounded-3xl border border-white/10 bg-white p-6 text-zinc-950 shadow-2xl shadow-black/10">
              <p className="mb-3 break-keep text-sm font-bold text-zinc-500">{metric.label}</p>
              <p className="text-4xl font-black tracking-tight">{metric.value.toLocaleString("ko-KR")}</p>
              {metric.error && <p className="mt-3 break-keep text-xs font-bold leading-relaxed text-red-600">{metric.error}</p>}
            </article>
          ))}
        </section>

        <section className="mb-8 grid gap-6 xl:grid-cols-[1.1fr_1fr]">
          <article className="rounded-3xl border border-white/10 bg-white p-7 text-zinc-950 shadow-2xl shadow-black/10">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-zinc-400">Recent Menu Sites</p>
                <h2 className="text-2xl font-bold">최근 메뉴판</h2>
              </div>
            </div>

            {recentMenusResult.error && <AdminError message={recentMenusResult.error.message} />}

            {recentMenus.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="border-b border-zinc-100 text-xs uppercase tracking-[0.16em] text-zinc-400">
                    <tr>
                      <th className="py-3 pr-4">name</th>
                      <th className="py-3 pr-4">slug</th>
                      <th className="py-3 pr-4">owner user_id</th>
                      <th className="py-3 pr-4">template</th>
                      <th className="py-3 pr-4">status</th>
                      <th className="py-3">created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {recentMenus.map((site) => (
                      <tr key={site.id}>
                        <td className="py-4 pr-4 font-bold">{site.name}</td>
                        <td className="py-4 pr-4">
                          <Link href={`/m/${site.slug}`} className="font-bold text-zinc-500 hover:text-zinc-950 hover:underline">
                            /m/{site.slug}
                          </Link>
                        </td>
                        <td className="max-w-[180px] truncate py-4 pr-4 font-mono text-xs text-zinc-400">{site.user_id}</td>
                        <td className="py-4 pr-4 font-mono text-xs font-bold text-zinc-500">{site.template_key}</td>
                        <td className="py-4 pr-4">
                          <span className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusClassName(site.status)}`}>{site.status}</span>
                        </td>
                        <td className="py-4 text-zinc-500">{formatDate(site.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState title="아직 메뉴판이 없습니다" description="고객이 메뉴판을 생성하면 이곳에 표시됩니다." />
            )}
          </article>

          <article className="rounded-3xl border border-white/10 bg-white p-7 text-zinc-950 shadow-2xl shadow-black/10">
            <div className="mb-6">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-zinc-400">Inquiry Board</p>
              <h2 className="text-2xl font-bold">문의 게시판</h2>
              <p className="mt-2 text-sm font-medium text-zinc-500">
                {activeInquiryPage}/{inquiryTotalPages} 페이지 · 총 {inquiryTotalCount.toLocaleString("ko-KR")}개
              </p>
            </div>

            <div className="mb-5 flex flex-wrap gap-2">
              {inquiryStatusFilters.map((filter) => {
                const isActive = activeInquiryStatus === filter.value;
                const href =
                  filter.value === "all"
                    ? "/admin?inquiryPage=1"
                    : `/admin?inquiryStatus=${filter.value}&inquiryPage=1`;

                return (
                  <Link
                    key={filter.value}
                    href={href}
                    className={`rounded-full border px-4 py-2 text-sm font-bold transition-colors ${
                      isActive ? "border-zinc-950 bg-zinc-950 text-white" : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-950"
                    }`}
                  >
                    {filter.label}
                  </Link>
                );
              })}
            </div>

            {inquiriesResult.error && <AdminError message={inquiriesResult.error.message} />}

            {inquiries.length > 0 ? (
              <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="overflow-hidden rounded-3xl border border-zinc-100">
                  <div className="divide-y divide-zinc-100">
                    {inquiries.map((inquiry, index) => {
                      const isSelected = inquiry.id === selectedInquiryId;
                      const pageHref = `/admin?inquiryStatus=${activeInquiryStatus}&inquiryPage=${activeInquiryPage}&inquiryId=${inquiry.id}`;

                      return (
                        <Link
                          key={inquiry.id}
                          href={pageHref}
                          className={`block p-4 transition-colors ${isSelected ? "bg-zinc-950 text-white" : "bg-white hover:bg-zinc-50"}`}
                        >
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <p className={`text-xs font-black ${isSelected ? "text-white/60" : "text-zinc-400"}`}>#{inquiryFrom + index + 1}</p>
                            <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${isSelected ? "bg-white/15 text-white" : getStatusClassName(inquiry.status)}`}>
                              {getInquiryStatusLabel(inquiry.status)}
                            </span>
                          </div>
                          <h3 className="line-clamp-1 break-keep text-sm font-black">{inquiry.title}</h3>
                          <p className={`mt-2 line-clamp-1 break-all text-xs font-medium ${isSelected ? "text-white/55" : "text-zinc-400"}`}>
                            {inquiry.user_id}
                          </p>
                          <p className={`mt-1 text-xs font-medium ${isSelected ? "text-white/55" : "text-zinc-400"}`}>{formatDate(inquiry.created_at)}</p>
                        </Link>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between gap-3 border-t border-zinc-100 bg-zinc-50 p-4">
                    {activeInquiryPage > 1 ? (
                      <Link
                        href={`/admin?inquiryStatus=${activeInquiryStatus}&inquiryPage=${activeInquiryPage - 1}`}
                        className={getAdminActionButtonClassName("secondary")}
                      >
                        이전
                      </Link>
                    ) : (
                      <span className="inline-flex min-h-11 items-center justify-center rounded-full border border-zinc-200 bg-zinc-100 px-5 py-3 text-sm font-bold text-zinc-400">
                        이전
                      </span>
                    )}
                    <span className="text-sm font-bold text-zinc-500">
                      {activeInquiryPage}/{inquiryTotalPages}
                    </span>
                    {activeInquiryPage < inquiryTotalPages ? (
                      <Link
                        href={`/admin?inquiryStatus=${activeInquiryStatus}&inquiryPage=${activeInquiryPage + 1}`}
                        className={getAdminActionButtonClassName("secondary")}
                      >
                        다음
                      </Link>
                    ) : (
                      <span className="inline-flex min-h-11 items-center justify-center rounded-full border border-zinc-200 bg-zinc-100 px-5 py-3 text-sm font-bold text-zinc-400">
                        다음
                      </span>
                    )}
                  </div>
                </div>

                {selectedInquiry ? (
                  <div className="rounded-3xl border border-zinc-100 bg-zinc-50 p-5">
                    <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-start">
                      <div>
                        <h3 className="break-keep text-xl font-black">{selectedInquiry.title}</h3>
                        <p className="mt-2 break-all text-xs font-medium text-zinc-400">user_id: {selectedInquiry.user_id}</p>
                        <p className="mt-1 text-xs font-medium text-zinc-400">작성일 {formatDate(selectedInquiry.created_at)}</p>
                        <p className="mt-1 text-xs font-medium text-zinc-400">수정일 {formatDate(selectedInquiry.updated_at)}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${getStatusClassName(selectedInquiry.status)}`}>
                        {getInquiryStatusLabel(selectedInquiry.status)}
                      </span>
                    </div>

                    <div className="mb-4 rounded-2xl bg-white p-5">
                      <p className="whitespace-pre-wrap break-keep text-sm font-medium leading-relaxed text-zinc-600">{selectedInquiry.message}</p>
                    </div>

                    <form action={replyInquiryAction} className="space-y-3">
                      <input type="hidden" name="inquiryId" value={selectedInquiry.id} />
                      <label htmlFor={`admin-reply-${selectedInquiry.id}`} className="block text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">
                        admin reply
                      </label>
                      <textarea
                        id={`admin-reply-${selectedInquiry.id}`}
                        name="admin_reply"
                        defaultValue={selectedInquiry.admin_reply ?? ""}
                        rows={6}
                        className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 outline-none transition focus:border-zinc-950"
                        placeholder="관리자 답변을 입력하세요."
                      />
                      {selectedInquiry.replied_at && <p className="text-xs font-medium text-zinc-400">마지막 답변일 {formatDate(selectedInquiry.replied_at)}</p>}
                      <button
                        type="submit"
                        className={getAdminActionButtonClassName("primary")}
                      >
                        답변 저장/수정
                      </button>
                    </form>

                    {selectedInquiry.admin_reply && (
                      <form action={deleteInquiryReplyAction} className="mt-3">
                        <input type="hidden" name="inquiryId" value={selectedInquiry.id} />
                        <button
                          type="submit"
                          className={getAdminActionButtonClassName("danger")}
                        >
                          답변 삭제
                        </button>
                      </form>
                    )}
                  </div>
                ) : (
                  <EmptyState title="문의를 선택하세요" description="왼쪽 리스트에서 문의를 선택하면 제목, 내용, 답변 입력 영역이 표시됩니다." />
                )}
              </div>
            ) : (
              <EmptyState title="아직 문의가 없습니다" description="고객 문의가 등록되면 이곳에 표시됩니다." />
            )}
          </article>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-3xl border border-white/10 bg-white p-7 text-zinc-950 shadow-2xl shadow-black/10">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-zinc-400">Orders</p>
            <h2 className="mb-5 text-2xl font-bold">최근 주문</h2>
            {recentOrdersResult.error ? (
              <AdminError message={recentOrdersResult.error.message} />
            ) : recentOrders.length > 0 ? (
              <pre className="overflow-x-auto rounded-2xl bg-zinc-50 p-4 text-xs text-zinc-600">{JSON.stringify(recentOrders, null, 2)}</pre>
            ) : (
              <EmptyState title="주문 데이터가 없습니다" description="orders 테이블에 데이터가 생기면 이곳에 표시됩니다." />
            )}
          </article>

          <article className="rounded-3xl border border-white/10 bg-white p-7 text-zinc-950 shadow-2xl shadow-black/10">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-zinc-400">Payments</p>
            <h2 className="mb-5 text-2xl font-bold">최근 결제</h2>
            {recentPaymentsResult.error ? (
              <AdminError message={recentPaymentsResult.error.message} />
            ) : recentPayments.length > 0 ? (
              <pre className="overflow-x-auto rounded-2xl bg-zinc-50 p-4 text-xs text-zinc-600">{JSON.stringify(recentPayments, null, 2)}</pre>
            ) : (
              <EmptyState title="결제 데이터가 없습니다" description="payments 테이블에 데이터가 생기면 이곳에 표시됩니다." />
            )}
          </article>
        </section>
      </div>
    </main>
  );
}

function AdminError({ message }: { message: string }) {
  return <div className="mb-5 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-700">{message}</div>;
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-zinc-200 bg-zinc-50 p-8 text-center">
      <h3 className="text-xl font-bold">{title}</h3>
      <p className="mx-auto mt-3 max-w-md break-keep text-sm font-medium leading-relaxed text-zinc-500">{description}</p>
    </div>
  );
}
