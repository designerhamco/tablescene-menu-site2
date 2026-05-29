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
  type InquirySectionInquiry,
} from "@/components/mypage/InquirySection";
import { createClient } from "@/lib/supabase/server";

type SearchParams = Promise<{
  error?: string;
  message?: string;
  inquiryPage?: string;
}>;

export default async function InquiriesPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in?next=/mypage/inquiries");
  }

  const { error, message, inquiryPage } = await searchParams;
  const activeInquiryPage = normalizeInquiryPage(inquiryPage);
  const inquiryFrom = (activeInquiryPage - 1) * inquiryPageSize;
  const inquiryTo = inquiryFrom + inquiryPageSize - 1;

  let inquiriesResult = await supabase
    .from("inquiries")
    .select("id, title, message, status, category, admin_reply, replied_at, created_at, updated_at", { count: "exact" })
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range(inquiryFrom, inquiryTo);

  if (inquiriesResult.error?.code === "42703") {
    inquiriesResult = await supabase
      .from("inquiries")
      .select("id, title, message, status, admin_reply, replied_at, created_at, updated_at", { count: "exact" })
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(inquiryFrom, inquiryTo);
  }

  const inquiries = (inquiriesResult.data ?? []) as InquirySectionInquiry[];
  const inquiryTotalCount = inquiriesResult.count ?? 0;
  const inquiryTotalPages = Math.max(1, Math.ceil(inquiryTotalCount / inquiryPageSize));

  return (
    <>
      <OfficialSiteNavbar />
      <main className="min-h-screen bg-zinc-50 px-6 py-16 text-zinc-950">
        <div className="mx-auto w-full max-w-5xl">
          <header className="mb-10 flex flex-col justify-between gap-6 border-b border-zinc-200 pb-8 md:flex-row md:items-end">
            <div>
              <Link href="/mypage?tab=inquiries" className="mb-6 inline-block text-sm font-bold text-zinc-400 hover:text-zinc-950">
                ← 마이페이지 문의 내역
              </Link>
              <h1 className="text-4xl font-bold tracking-tight md:text-5xl">문의하기</h1>
              <p className="mt-4 break-keep text-base font-medium leading-relaxed text-zinc-500">
                메뉴판 운영, 결제, 기능 요청 등 메뉴링크 운영팀에 남길 내용을 작성해주세요.
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
            inquiriesErrorMessage={inquiriesResult.error?.message ?? null}
            paginationBasePath="/mypage/inquiries"
            returnToPath={`/mypage/inquiries${activeInquiryPage > 1 ? `?inquiryPage=${activeInquiryPage}` : ""}`}
            showIntro={false}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
