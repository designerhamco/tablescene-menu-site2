import Link from "next/link";
import { redirect } from "next/navigation";

import Footer from "@/app/components/layout/Footer";
import OfficialSiteNavbar from "@/components/layout/OfficialSiteNavbar";
import {
  getInquiryErrorMessage,
  getInquiryNoticeMessage,
  InquirySection,
  inquiryPageSize,
  normalizeInquiryPage,
  normalizeInquiryQuery,
  normalizeInquiryStatus,
  type InquirySectionInquiry,
} from "@/components/mypage/InquirySection";
import { createClient } from "@/lib/supabase/server";

type SearchParams = Promise<{
  error?: string;
  message?: string;
  inquiryPage?: string;
  inquiryQuery?: string;
  inquiryStatus?: string;
}>;

export default async function InquiriesPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in?next=/mypage/inquiries");
  }

  const { error, message, inquiryPage, inquiryQuery, inquiryStatus } = await searchParams;
  const activeInquiryPage = normalizeInquiryPage(inquiryPage);
  const activeInquiryQuery = normalizeInquiryQuery(inquiryQuery);
  const activeInquiryStatus = normalizeInquiryStatus(inquiryStatus);
  const inquiryFrom = (activeInquiryPage - 1) * inquiryPageSize;
  const inquiryTo = inquiryFrom + inquiryPageSize - 1;

  let inquiriesQueryBuilder = supabase
    .from("inquiries")
    .select("id, title, message, status, category, admin_reply, replied_at, created_at, updated_at", { count: "exact" })
    .eq("user_id", user.id);

  if (activeInquiryQuery) {
    inquiriesQueryBuilder = inquiriesQueryBuilder.ilike("title", `%${activeInquiryQuery}%`);
  }

  if (activeInquiryStatus !== "all") {
    inquiriesQueryBuilder = inquiriesQueryBuilder.eq("status", activeInquiryStatus);
  }

  const inquiriesResult = await inquiriesQueryBuilder
    .order("created_at", { ascending: false })
    .range(inquiryFrom, inquiryTo);

  let fallbackQueryBuilder = supabase
      .from("inquiries")
      .select("id, title, message, status, admin_reply, replied_at, created_at, updated_at", { count: "exact" })
      .eq("user_id", user.id);

  if (activeInquiryQuery) {
    fallbackQueryBuilder = fallbackQueryBuilder.ilike("title", `%${activeInquiryQuery}%`);
  }

  if (activeInquiryStatus !== "all") {
    fallbackQueryBuilder = fallbackQueryBuilder.eq("status", activeInquiryStatus);
  }

  const effectiveInquiriesResult = inquiriesResult.error?.code === "42703"
    ? await fallbackQueryBuilder
      .order("created_at", { ascending: false })
      .range(inquiryFrom, inquiryTo)
    : inquiriesResult;

  const inquiries = (effectiveInquiriesResult.data ?? []) as InquirySectionInquiry[];
  const inquiryTotalCount = effectiveInquiriesResult.count ?? 0;
  const inquiryTotalPages = Math.max(1, Math.ceil(inquiryTotalCount / inquiryPageSize));

  return (
    <>
      <OfficialSiteNavbar />
      <main className="site-gutter site-page-spacing-compact min-h-screen bg-zinc-50 text-zinc-950">
        <div className="mx-auto w-full max-w-5xl">
          <header className="mb-10 flex flex-col justify-between gap-6 border-b border-zinc-200 pb-8 md:flex-row md:items-end">
            <div>
              <Link href="/mypage?tab=inquiries" className="type-label mb-6 inline-block text-zinc-400 hover:text-zinc-950">
                ← 마이페이지 문의 내역
              </Link>
              <h1 className="type-page-title">문의하기</h1>
              <p className="type-body mt-4 break-keep text-zinc-500">
                메뉴판 운영, 결제, 기능 요청 등 아티메뉴 운영팀에 남길 내용을 작성해주세요.
              </p>
            </div>
          </header>

          <InquirySection
            inquiries={inquiries}
            activeInquiryPage={activeInquiryPage}
            inquiryTotalPages={inquiryTotalPages}
            inquiryTotalCount={inquiryTotalCount}
            inquiryFrom={inquiryFrom}
            noticeMessage={getInquiryNoticeMessage(message)}
            errorMessage={getInquiryErrorMessage(error)}
            inquiriesErrorMessage={effectiveInquiriesResult.error?.message ?? null}
            paginationBasePath="/mypage/inquiries"
            returnToPath={`/mypage/inquiries?${new URLSearchParams({
              ...(activeInquiryPage > 1 ? { inquiryPage: String(activeInquiryPage) } : {}),
              ...(activeInquiryQuery ? { inquiryQuery: activeInquiryQuery } : {}),
              ...(activeInquiryStatus !== "all" ? { inquiryStatus: activeInquiryStatus } : {}),
            }).toString()}`.replace(/\?$/, "")}
            showIntro={false}
            inquiryQuery={activeInquiryQuery}
            inquiryStatus={activeInquiryStatus}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
