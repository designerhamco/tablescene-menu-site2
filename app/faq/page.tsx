import type { Metadata } from "next";
import { ArrowUpRight, Bot, MessageSquareText } from "lucide-react";
import Link from "next/link";

import FAQ, { DETAILED_FAQ_DATA } from "@/app/components/common/FAQ";
import Footer from "@/app/components/layout/Footer";
import OfficialSiteNavbar from "@/components/layout/OfficialSiteNavbar";
import { isAiSupportChatEnabled } from "@/lib/ai-support-chat";

import AiSupportChatOpenButton from "../support/chat/AiSupportChatOpenButton";

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
        <section className="site-page-spacing border-b border-zinc-200">
          <div className="site-container">
            <h1 className="type-page-title max-w-3xl">
              필요한 도움을<br className="hidden md:block" /> 빠르게 확인
            </h1>
            <p className="site-body mt-6 max-w-2xl text-zinc-500">
              자주 묻는 질문을 먼저 확인하고, 더 자세한 도움이 필요하면 AI 상담이나 1:1 문의를 이용해 주세요.
            </p>

            <div className="site-support-actions mt-10">
              <AiSupportChatOpenButton className="site-support-action">
                <Bot className="site-support-action-icon" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="site-body-title">AI 상담</p>
                    {!aiSupportEnabled ? <span className="type-caption rounded-full bg-zinc-100 px-2 py-1 text-zinc-500">준비 중</span> : null}
                  </div>
                  <p className="site-body-support mt-1 text-zinc-500">기능과 이용 방법을 바로 질문합니다.</p>
                </div>
                <ArrowUpRight className="h-5 w-5 shrink-0 text-zinc-500" aria-hidden="true" />
              </AiSupportChatOpenButton>
              <Link href="/mypage/inquiries" className="site-support-action">
                <MessageSquareText className="site-support-action-icon" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="site-body-title">1:1 문의</p>
                  <p className="site-body-support mt-1 text-zinc-500">계정, 결제처럼 확인이 필요한 내용을 남깁니다.</p>
                </div>
                <ArrowUpRight className="h-5 w-5 shrink-0 text-zinc-500" aria-hidden="true" />
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
      </main>
      <Footer />
    </>
  );
}
