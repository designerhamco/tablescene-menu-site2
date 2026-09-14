import type { Metadata } from "next";
import { Bot, CircleHelp, MessageSquareText } from "lucide-react";
import Link from "next/link";

import FAQ, { DETAILED_FAQ_DATA } from "@/app/components/common/FAQ";
import Footer from "@/app/components/layout/Footer";
import OfficialSiteNavbar from "@/components/layout/OfficialSiteNavbar";
import { isAiSupportChatEnabled } from "@/lib/ai-support-chat";

export const metadata: Metadata = {
  title: "고객센터 | ArtiMenu",
  description: "아티메뉴 이용과 관련해 자주 묻는 질문을 확인할 수 있습니다.",
};

export default function FAQPage() {
  const aiSupportEnabled = isAiSupportChatEnabled();
  return (
    <>
      <OfficialSiteNavbar />
      <main className="min-h-screen bg-white text-zinc-950">
        <section className="site-gutter border-b border-zinc-200 py-16 md:py-24">
          <div className="mx-auto max-w-[1280px]">
            <h1 className="max-w-3xl break-keep text-4xl font-black tracking-[-0.04em] md:text-[3.5rem]">
              필요한 도움을<br className="hidden md:block" /> 빠르게 확인
            </h1>
            <p className="mt-6 max-w-2xl break-keep text-base font-medium leading-relaxed text-zinc-500 md:text-lg">
              자주 묻는 질문을 먼저 확인하고, 더 자세한 도움이 필요하면 AI 상담이나 1:1 문의를 이용해 주세요.
            </p>

            <div className="mt-12 grid gap-3 md:grid-cols-3">
              <Link href="#frequently-asked" className="group flex min-h-44 flex-col justify-between rounded-3xl border border-zinc-200 bg-white p-6 transition-colors hover:border-zinc-950">
                <CircleHelp className="h-6 w-6 text-zinc-950" aria-hidden="true" />
                <div>
                  <p className="text-lg font-black">자주 묻는 질문</p>
                  <p className="mt-2 text-sm font-medium leading-relaxed text-zinc-500">서비스, 요금, 메뉴판 관리 기준을 확인합니다.</p>
                </div>
              </Link>
              <Link href="/support/chat" className="group flex min-h-44 flex-col justify-between rounded-3xl border border-zinc-200 bg-white p-6 transition-colors hover:border-zinc-950">
                <Bot className="h-6 w-6 text-zinc-950" aria-hidden="true" />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-black">AI 상담</p>
                    {!aiSupportEnabled ? <span className="rounded-full bg-zinc-100 px-2 py-1 text-[10px] font-black text-zinc-500">준비 중</span> : null}
                  </div>
                  <p className="mt-2 text-sm font-medium leading-relaxed text-zinc-500">기능과 이용 방법을 바로 질문합니다.</p>
                </div>
              </Link>
              <Link href="/mypage/inquiries" className="group flex min-h-44 flex-col justify-between rounded-3xl border border-zinc-200 bg-white p-6 transition-colors hover:border-zinc-950">
                <MessageSquareText className="h-6 w-6 text-zinc-950" aria-hidden="true" />
                <div>
                  <p className="text-lg font-black">1:1 문의</p>
                  <p className="mt-2 text-sm font-medium leading-relaxed text-zinc-500">계정, 결제처럼 확인이 필요한 내용을 남깁니다.</p>
                </div>
              </Link>
            </div>
          </div>
        </section>
        <FAQ
          id="frequently-asked"
          align="left"
          className="pt-20 md:pt-28"
          data={DETAILED_FAQ_DATA}
          title="자주 묻는 질문"
          description="궁금한 주제를 선택하면 필요한 답을 빠르게 확인할 수 있습니다."
        />
        {aiSupportEnabled ? <section className="site-container max-w-[1200px] pb-24">
          <div className="flex flex-col items-start justify-between gap-5 rounded-3xl bg-zinc-950 px-7 py-8 text-white md:flex-row md:items-center md:px-10">
            <div>
              <h2 className="text-2xl font-black tracking-tight">답을 찾지 못했다면 AI 상담</h2>
              <p className="mt-2 text-sm font-medium text-zinc-400">서비스 사용법을 빠르게 확인하고 필요한 경우 1:1 문의로 이어집니다.</p>
            </div>
            <Link href="/support/chat" className="rounded-full bg-white px-5 py-3 text-sm font-black text-zinc-950 transition-colors hover:bg-zinc-200">AI 상담 시작</Link>
          </div>
        </section> : null}
      </main>
      <Footer />
    </>
  );
}
