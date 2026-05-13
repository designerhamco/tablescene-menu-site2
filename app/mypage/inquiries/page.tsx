import Link from "next/link";
import { redirect } from "next/navigation";

import { createInquiryAction, deleteInquiryAction, updateInquiryAction } from "@/app/mypage/inquiries/actions";
import OfficialSiteNavbar from "@/components/layout/OfficialSiteNavbar";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type SearchParams = Promise<{
  error?: string;
  message?: string;
  inquiryPage?: string;
}>;

type Inquiry = Pick<
  Database["public"]["Tables"]["inquiries"]["Row"],
  "id" | "title" | "message" | "status" | "admin_reply" | "replied_at" | "created_at" | "updated_at"
>;

const inquiryPageSize = 10;

function normalizePage(value?: string) {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function getStatusLabel(status: Inquiry["status"]) {
  const labels: Record<Inquiry["status"], string> = {
    open: "접수됨",
    answered: "답변 완료",
    closed: "종료됨",
  };

  return labels[status];
}

function getStatusClassName(status: Inquiry["status"]) {
  const classes: Record<Inquiry["status"], string> = {
    open: "bg-zinc-100 text-zinc-600",
    answered: "bg-emerald-50 text-emerald-700",
    closed: "bg-amber-50 text-amber-700",
  };

  return classes[status];
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

function getNoticeMessage(message?: string) {
  if (message === "inquiry-created") {
    return "문의가 등록되었습니다.";
  }

  if (message === "inquiry-updated") {
    return "문의가 수정되었습니다.";
  }

  if (message === "inquiry-deleted") {
    return "문의가 삭제되었습니다.";
  }

  return null;
}

function getErrorMessage(error?: string) {
  return error ? decodeURIComponent(error) : null;
}

function getActionButtonClassName(tone: "primary" | "secondary" | "danger") {
  const base =
    "inline-flex min-h-11 items-center justify-center rounded-full px-5 py-3 text-sm font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2";

  if (tone === "primary") {
    return `${base} bg-zinc-950 text-white hover:bg-zinc-800 focus:ring-zinc-950`;
  }

  if (tone === "danger") {
    return `${base} border border-red-100 bg-red-50 text-red-700 hover:bg-red-100 focus:ring-red-200`;
  }

  return `${base} border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 focus:ring-zinc-200`;
}

export default async function InquiriesPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in?next=/mypage/inquiries");
  }

  const { error, message, inquiryPage } = await searchParams;
  const errorMessage = getErrorMessage(error);
  const noticeMessage = getNoticeMessage(message);
  const activeInquiryPage = normalizePage(inquiryPage);
  const inquiryFrom = (activeInquiryPage - 1) * inquiryPageSize;
  const inquiryTo = inquiryFrom + inquiryPageSize - 1;

  const { data: inquiriesData, error: inquiriesError, count: inquiryCount } = await supabase
    .from("inquiries")
    .select("id, title, message, status, admin_reply, replied_at, created_at, updated_at", { count: "exact" })
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range(inquiryFrom, inquiryTo);

  const inquiries = (inquiriesData ?? []) as Inquiry[];
  const inquiryTotalCount = inquiryCount ?? 0;
  const inquiryTotalPages = Math.max(1, Math.ceil(inquiryTotalCount / inquiryPageSize));

  return (
    <>
      <OfficialSiteNavbar />
      <main className="min-h-screen bg-zinc-50 px-6 py-16 text-zinc-950">
        <div className="mx-auto w-full max-w-5xl">
        <header className="mb-10 flex flex-col justify-between gap-6 border-b border-zinc-200 pb-8 md:flex-row md:items-end">
          <div>
            <Link href="/mypage" className="mb-6 inline-block text-sm font-bold text-zinc-400 hover:text-zinc-950">
              ← 마이페이지
            </Link>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-zinc-400">Support</p>
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">문의하기</h1>
            <p className="mt-4 break-keep text-base font-medium leading-relaxed text-zinc-500">
              메뉴판 운영, 결제, 기능 요청 등 테이블씬 운영팀에 남길 내용을 작성해주세요.
            </p>
          </div>
        </header>

        {noticeMessage && (
          <div className="mb-6 rounded-3xl border border-emerald-100 bg-emerald-50 p-5 text-sm font-bold text-emerald-700">
            {noticeMessage}
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 rounded-3xl border border-red-100 bg-red-50 p-5 text-sm font-bold text-red-700">
            {errorMessage}
          </div>
        )}

        {inquiriesError && (
          <div className="mb-6 rounded-3xl border border-red-100 bg-red-50 p-5 text-sm font-bold text-red-700">
            문의 목록을 불러오지 못했습니다: {inquiriesError.message}
          </div>
        )}

        <section className="mb-8 rounded-3xl bg-white p-7 shadow-sm">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-zinc-400">New Inquiry</p>
          <h2 className="text-3xl font-bold tracking-tight">새 문의 등록</h2>

          <form action={createInquiryAction} className="mt-7 space-y-5">
            <div>
              <label htmlFor="title" className="mb-2 block text-sm font-bold">
                제목
              </label>
              <input
                id="title"
                name="title"
                type="text"
                required
                maxLength={120}
                className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-base outline-none transition-colors focus:border-zinc-950"
                placeholder="예: 공개 메뉴판 주소 변경 문의"
              />
            </div>

            <div>
              <label htmlFor="message" className="mb-2 block text-sm font-bold">
                문의 내용
              </label>
              <textarea
                id="message"
                name="message"
                required
                rows={7}
                className="w-full resize-y rounded-2xl border border-zinc-200 px-4 py-3 text-base outline-none transition-colors focus:border-zinc-950"
                placeholder="문의하실 내용을 자세히 적어주세요."
              />
            </div>

            <button
              type="submit"
              className={`${getActionButtonClassName("primary")} w-full md:w-auto`}
            >
              문의 등록하기
            </button>
          </form>
        </section>

        <section>
          <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-end">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-zinc-400">My Inquiries</p>
              <h2 className="text-3xl font-bold tracking-tight">내 문의 목록</h2>
            </div>
            <p className="text-sm font-bold text-zinc-400">
              {activeInquiryPage}/{inquiryTotalPages} 페이지 · 총 {inquiryTotalCount.toLocaleString("ko-KR")}개
            </p>
          </div>

          {inquiries.length > 0 ? (
            <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
              <div className="hidden grid-cols-[56px_1fr_96px_144px_52px] gap-3 border-b border-zinc-100 bg-zinc-50 px-4 py-3 text-[11px] font-black uppercase tracking-[0.12em] text-zinc-400 md:grid">
                <p>번호</p>
                <p>제목</p>
                <p>상태</p>
                <p>작성 시간</p>
                <p className="text-right">보기</p>
              </div>
              <div className="divide-y divide-zinc-100">
                {inquiries.map((inquiry, index) => (
                  <details key={inquiry.id} className="group">
                    <summary className="grid cursor-pointer list-none gap-3 px-4 py-4 text-sm transition-colors hover:bg-zinc-50 focus:outline-none focus-visible:bg-zinc-50 md:grid-cols-[56px_1fr_96px_144px_52px] md:items-center">
                      <p className="text-xs font-black text-zinc-400">#{inquiryFrom + index + 1}</p>
                      <h3 className="line-clamp-1 break-keep text-sm font-bold tracking-tight text-zinc-900">{inquiry.title}</h3>
                      <span className={`w-fit rounded-full px-2.5 py-1 text-[11px] font-bold ${getStatusClassName(inquiry.status)}`}>
                        {getStatusLabel(inquiry.status)}
                      </span>
                      <p className="text-xs font-bold text-zinc-400">{formatDate(inquiry.created_at)}</p>
                      <div className="text-xs font-bold text-zinc-400 md:text-right">
                        <span className="group-open:hidden">열기</span>
                        <span className="hidden group-open:inline">닫기</span>
                      </div>
                    </summary>

                    <div className="border-t border-zinc-100 bg-zinc-50 p-4 md:p-5">
                      <div className="mb-3 grid gap-2 text-[11px] font-bold text-zinc-400 md:grid-cols-2">
                        <p>작성일 {formatDate(inquiry.created_at)}</p>
                        <p>수정일 {formatDate(inquiry.updated_at)}</p>
                      </div>

                      <div className="rounded-2xl bg-white p-4">
                        <p className="whitespace-pre-wrap break-keep text-sm font-medium leading-6 text-zinc-600">{inquiry.message}</p>
                      </div>

                      {inquiry.admin_reply && (
                        <div className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                          <div className="mb-2 flex flex-col justify-between gap-1 md:flex-row md:items-center">
                            <p className="text-xs font-bold text-emerald-800">관리자 답변</p>
                            <p className="text-xs font-medium text-emerald-700/70">답변일 {formatDate(inquiry.replied_at)}</p>
                          </div>
                          <p className="whitespace-pre-wrap break-keep text-sm font-medium leading-6 text-emerald-900">
                            {inquiry.admin_reply}
                          </p>
                        </div>
                      )}

                      <div className="mt-3 rounded-2xl border border-zinc-200 bg-white p-4">
                        <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-center">
                          <div>
                            <p className="text-sm font-bold text-zinc-900">문의 관리</p>
                            <p className="mt-1 text-xs font-medium text-zinc-400">수정하거나 더 이상 필요 없는 문의를 삭제할 수 있습니다.</p>
                          </div>
                          <form action={deleteInquiryAction}>
                            <input type="hidden" name="inquiryId" value={inquiry.id} />
                            <button type="submit" className={getActionButtonClassName("danger")}>
                              문의 삭제
                            </button>
                          </form>
                        </div>

                        <details>
                          <summary className={`${getActionButtonClassName("secondary")} w-fit cursor-pointer list-none`}>
                            문의 수정
                          </summary>
                          <form action={updateInquiryAction} className="mt-4 space-y-4">
                            <input type="hidden" name="inquiryId" value={inquiry.id} />
                            <div>
                              <label
                                htmlFor={`title-${inquiry.id}`}
                                className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-zinc-400"
                              >
                                title
                              </label>
                              <input
                                id={`title-${inquiry.id}`}
                                name="title"
                                type="text"
                                required
                                maxLength={120}
                                defaultValue={inquiry.title}
                                className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm font-semibold outline-none transition-colors focus:border-zinc-950"
                              />
                            </div>
                            <div>
                              <label
                                htmlFor={`message-${inquiry.id}`}
                                className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-zinc-400"
                              >
                                message
                              </label>
                              <textarea
                                id={`message-${inquiry.id}`}
                                name="message"
                                required
                                rows={5}
                                defaultValue={inquiry.message}
                                className="w-full resize-y rounded-2xl border border-zinc-200 px-4 py-3 text-sm font-semibold outline-none transition-colors focus:border-zinc-950"
                              />
                            </div>
                            <button type="submit" className={getActionButtonClassName("primary")}>
                              문의 수정 저장
                            </button>
                          </form>
                        </details>
                      </div>
                    </div>
                  </details>
                ))}
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-zinc-100 bg-zinc-50 p-4">
                {activeInquiryPage > 1 ? (
                  <Link href={`/mypage/inquiries?inquiryPage=${activeInquiryPage - 1}`} className={getActionButtonClassName("secondary")}>
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
                  <Link href={`/mypage/inquiries?inquiryPage=${activeInquiryPage + 1}`} className={getActionButtonClassName("secondary")}>
                    다음
                  </Link>
                ) : (
                  <span className="inline-flex min-h-11 items-center justify-center rounded-full border border-zinc-200 bg-zinc-100 px-5 py-3 text-sm font-bold text-zinc-400">
                    다음
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-zinc-200 bg-white p-10 text-center shadow-sm">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-zinc-400">Empty</p>
              <h3 className="text-2xl font-bold">아직 등록한 문의가 없습니다</h3>
              <p className="mx-auto mt-3 max-w-md break-keep text-sm font-medium leading-relaxed text-zinc-500">
                궁금한 점이나 요청사항을 남기면 이곳에서 답변 상태를 확인할 수 있습니다.
              </p>
            </div>
          )}
        </section>
        </div>
      </main>
    </>
  );
}
