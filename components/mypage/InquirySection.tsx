import Link from "next/link";

import { createInquiryAction, deleteInquiryAction, updateInquiryAction } from "@/app/mypage/inquiries/actions";
import { getInquiryCategoryLabel, inquiryCategoryOptions, normalizeInquiryCategory, type InquiryCategory } from "@/lib/inquiries";
import type { Database } from "@/lib/supabase/types";

export type InquirySectionInquiry = Pick<
  Database["public"]["Tables"]["inquiries"]["Row"],
  "id" | "title" | "message" | "status" | "admin_reply" | "replied_at" | "created_at" | "updated_at"
> & {
  category?: InquiryCategory | null;
};

export const inquiryPageSize = 10;

type InquirySectionProps = {
  inquiries: InquirySectionInquiry[];
  activeInquiryPage: number;
  inquiryTotalPages: number;
  inquiryTotalCount: number;
  inquiryFrom: number;
  noticeMessage: string | null;
  errorMessage: string | null;
  inquiriesErrorMessage?: string | null;
  paginationBasePath: string;
  returnToPath: string;
  showIntro?: boolean;
};

export function normalizeInquiryPage(value?: string | string[]) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const page = Number(rawValue);

  return Number.isInteger(page) && page > 0 ? page : 1;
}

export function getInquiryNoticeMessage(message?: string | string[]) {
  const value = Array.isArray(message) ? message[0] : message;

  if (value === "inquiry-created") {
    return "문의가 등록되었습니다.";
  }

  if (value === "inquiry-updated") {
    return "문의가 수정되었습니다.";
  }

  if (value === "inquiry-deleted") {
    return "문의가 삭제되었습니다.";
  }

  return null;
}

export function getInquiryErrorMessage(error?: string | string[]) {
  const value = Array.isArray(error) ? error[0] : error;

  if (!value) {
    return null;
  }

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function getStatusLabel(status: InquirySectionInquiry["status"]) {
  const labels: Record<InquirySectionInquiry["status"], string> = {
    open: "접수됨",
    answered: "답변 완료",
    closed: "종료됨",
  };

  return labels[status];
}

function getStatusClassName(status: InquirySectionInquiry["status"]) {
  const classes: Record<InquirySectionInquiry["status"], string> = {
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

function createHref(basePath: string, params: Record<string, string | number | null | undefined>) {
  const [pathname, queryString] = basePath.split("?");
  const searchParams = new URLSearchParams(queryString ?? "");

  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === "") {
      searchParams.delete(key);
    } else {
      searchParams.set(key, String(value));
    }
  }

  const query = searchParams.toString();

  return query ? `${pathname}?${query}` : pathname;
}

export function InquirySection({
  inquiries,
  activeInquiryPage,
  inquiryTotalPages,
  inquiryTotalCount,
  inquiryFrom,
  noticeMessage,
  errorMessage,
  inquiriesErrorMessage,
  paginationBasePath,
  returnToPath,
  showIntro = true,
}: InquirySectionProps) {
  return (
    <section className="space-y-8">
      {showIntro ? (
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">문의 및 답변</h2>
            <p className="mt-3 break-keep text-sm font-medium leading-relaxed text-zinc-500">
              고객지원 문의와 답변 내역을 확인하고 새 문의를 남길 수 있습니다.
            </p>
          </div>
        </div>
      ) : null}

      {noticeMessage && (
        <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5 text-sm font-bold text-emerald-700">
          {noticeMessage}
        </div>
      )}

      {errorMessage && (
        <div className="rounded-3xl border border-red-100 bg-red-50 p-5 text-sm font-bold text-red-700">
          {errorMessage}
        </div>
      )}

      {inquiriesErrorMessage && (
        <div className="rounded-3xl border border-red-100 bg-red-50 p-5 text-sm font-bold text-red-700">
          문의 목록을 불러오지 못했습니다: {inquiriesErrorMessage}
        </div>
      )}

      <section className="rounded-3xl bg-white p-7 shadow-sm">
        <h3 className="text-2xl font-bold tracking-tight md:text-3xl">새 문의 등록</h3>

        <form action={createInquiryAction} className="mt-7 space-y-5">
          <input type="hidden" name="returnTo" value={returnToPath} />
          <div>
            <label htmlFor="category" className="mb-2 block text-sm font-bold">
              문의 유형
            </label>
            <select
              id="category"
              name="category"
              required
              defaultValue="general"
              className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-base font-semibold outline-none transition-colors focus:border-zinc-950"
            >
              {inquiryCategoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
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

          <button type="submit" className={`${getActionButtonClassName("primary")} w-full md:w-auto`}>
            문의 등록하기
          </button>
        </form>
      </section>

      <section>
        <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <h3 className="text-2xl font-bold tracking-tight md:text-3xl">내 문의 목록</h3>
          </div>
          <p className="text-sm font-bold text-zinc-400">
            {activeInquiryPage}/{inquiryTotalPages} 페이지 · 총 {inquiryTotalCount.toLocaleString("ko-KR")}개
          </p>
        </div>

        {inquiries.length > 0 ? (
          <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
            <div className="hidden grid-cols-[56px_112px_1fr_96px_144px_52px] gap-3 border-b border-zinc-100 bg-zinc-50 px-4 py-3 text-[11px] font-black uppercase tracking-[0.12em] text-zinc-400 md:grid">
              <p>번호</p>
              <p>유형</p>
              <p>제목</p>
              <p>상태</p>
              <p>작성 시간</p>
              <p className="text-right">보기</p>
            </div>
            <div className="divide-y divide-zinc-100">
              {inquiries.map((inquiry, index) => (
                <details key={inquiry.id} className="group">
                  <summary className="grid cursor-pointer list-none gap-3 px-4 py-4 text-sm transition-colors hover:bg-zinc-50 focus:outline-none focus-visible:bg-zinc-50 md:grid-cols-[56px_112px_1fr_96px_144px_52px] md:items-center">
                    <p className="text-xs font-black text-zinc-400">#{inquiryFrom + index + 1}</p>
                    <span className="w-fit rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-bold text-zinc-600">
                      {getInquiryCategoryLabel(inquiry.category)}
                    </span>
                    <h4 className="line-clamp-1 break-keep text-sm font-bold tracking-tight text-zinc-900">{inquiry.title}</h4>
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
                    <div className="mb-3 grid gap-2 text-[11px] font-bold text-zinc-400 md:grid-cols-3">
                      <p>유형 {getInquiryCategoryLabel(inquiry.category)}</p>
                      <p>작성일 {formatDate(inquiry.created_at)}</p>
                      <p>수정일 {formatDate(inquiry.updated_at)}</p>
                    </div>

                    <div className="rounded-2xl bg-white p-4">
                      <p className="whitespace-pre-wrap break-keep text-sm font-medium leading-6 text-zinc-600">{inquiry.message}</p>
                    </div>

                    {inquiry.admin_reply ? (
                      <div className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                        <div className="mb-2 flex flex-col justify-between gap-1 md:flex-row md:items-center">
                          <p className="text-xs font-bold text-emerald-800">관리자 답변</p>
                          <p className="text-xs font-medium text-emerald-700/70">답변일 {formatDate(inquiry.replied_at)}</p>
                        </div>
                        <p className="whitespace-pre-wrap break-keep text-sm font-medium leading-6 text-emerald-900">
                          {inquiry.admin_reply}
                        </p>
                      </div>
                    ) : (
                      <div className="mt-3 rounded-2xl border border-zinc-200 bg-white p-4">
                        <p className="text-xs font-bold text-zinc-500">관리자 답변</p>
                        <p className="mt-2 break-keep text-sm font-medium leading-6 text-zinc-500">
                          아직 답변이 등록되지 않았습니다.
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
                          <input type="hidden" name="returnTo" value={returnToPath} />
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
                          <input type="hidden" name="returnTo" value={returnToPath} />
                          <input type="hidden" name="inquiryId" value={inquiry.id} />
                          <div>
                            <label
                              htmlFor={`category-${inquiry.id}`}
                              className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-zinc-400"
                            >
                              category
                            </label>
                            <select
                              id={`category-${inquiry.id}`}
                              name="category"
                              required
                              defaultValue={normalizeInquiryCategory(inquiry.category)}
                              className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition-colors focus:border-zinc-950"
                            >
                              {inquiryCategoryOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>
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
                <Link href={createHref(paginationBasePath, { inquiryPage: activeInquiryPage - 1 })} className={getActionButtonClassName("secondary")}>
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
                <Link href={createHref(paginationBasePath, { inquiryPage: activeInquiryPage + 1 })} className={getActionButtonClassName("secondary")}>
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
            <h3 className="text-2xl font-bold">아직 문의 내역이 없습니다</h3>
            <p className="mx-auto mt-3 max-w-md break-keep text-sm font-medium leading-relaxed text-zinc-500">
              궁금한 점이 있다면 새 문의를 남겨주세요. 답변 상태와 내용을 이곳에서 확인할 수 있습니다.
            </p>
          </div>
        )}
      </section>
    </section>
  );
}
