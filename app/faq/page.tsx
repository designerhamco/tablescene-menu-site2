import type { Metadata } from "next";
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
      <main className="min-h-screen bg-white">
        <FAQ
          className="pt-16"
          data={DETAILED_FAQ_DATA}
          title="고객센터"
          description="아티메뉴 이용 전 궁금할 수 있는 내용을 정리했습니다. 서비스 이용 방식, 결제, AI 작성 도우미, 화면 연결 방법을 확인해보세요."
        />
        {aiSupportEnabled ? <section className="mx-auto w-full max-w-6xl px-6 pb-24">
          <div className="flex flex-col items-start justify-between gap-5 rounded-3xl bg-zinc-950 px-7 py-8 text-white md:flex-row md:items-center md:px-10">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-zinc-400">AI SUPPORT</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight">답을 찾지 못했다면 AI 상담</h2>
              <p className="mt-2 text-sm font-medium text-zinc-400">서비스 사용법을 빠르게 확인하고 필요한 경우 1:1 문의로 이어집니다.</p>
            </div>
            <Link href="/support/chat" className="rounded-full bg-white px-5 py-3 text-sm font-black text-zinc-950">AI 상담 시작</Link>
          </div>
        </section> : null}
      </main>
      <Footer />
    </>
  );
}
