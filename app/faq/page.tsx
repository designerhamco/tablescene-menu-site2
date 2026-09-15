import type { Metadata } from "next";
import { Bot, MessageSquareText } from "lucide-react";
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

            <div className="site-card-grid mt-12 md:max-w-3xl md:grid-cols-2">
              <AiSupportChatOpenButton className="site-card site-card-interactive group flex min-h-44 flex-col items-stretch justify-between p-6 text-left">
                <Bot className="h-6 w-6 text-zinc-950" aria-hidden="true" />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="site-body-title">AI 상담</p>
                    {!aiSupportEnabled ? <span className="type-caption rounded-full bg-zinc-100 px-2 py-1 text-zinc-500">준비 중</span> : null}
                  </div>
                  <p className="site-body-support mt-2 text-zinc-500">기능과 이용 방법을 바로 질문합니다.</p>
                </div>
              </AiSupportChatOpenButton>
              <Link href="/mypage/inquiries" className="site-card site-card-interactive group flex min-h-44 flex-col justify-between p-6">
                <MessageSquareText className="h-6 w-6 text-zinc-950" aria-hidden="true" />
                <div>
                  <p className="site-body-title">1:1 문의</p>
                  <p className="site-body-support mt-2 text-zinc-500">계정, 결제처럼 확인이 필요한 내용을 남깁니다.</p>
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
      </main>
      <Footer />
    </>
  );
}
