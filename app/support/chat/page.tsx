import type { Metadata } from "next";
import Link from "next/link";

import Footer from "@/app/components/layout/Footer";
import OfficialSiteNavbar from "@/components/layout/OfficialSiteNavbar";
import { isAiSupportChatEnabled } from "@/lib/ai-support-chat";

import AiSupportChat from "./AiSupportChat";

export const metadata: Metadata = {
  title: "AI 상담 | 아티메뉴",
  description: "아티메뉴 서비스 이용 방법을 AI로 빠르게 확인합니다.",
  robots: { index: false, follow: false },
};

export default function AiSupportChatPage() {
  const enabled = isAiSupportChatEnabled();
  return (
    <>
      <OfficialSiteNavbar />
      <main className="min-h-screen bg-zinc-50 px-5 py-12 text-zinc-950 md:py-16">
        <div className="mx-auto w-full max-w-4xl">
          <header className="mb-8 flex flex-col gap-5 border-b border-zinc-200 pb-8 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">AI SUPPORT</p>
              <h1 className="mt-2 text-4xl font-black tracking-tight md:text-5xl">AI 상담</h1>
              <p className="mt-4 break-keep text-base font-medium leading-relaxed text-zinc-500">
                아티메뉴 이용 방법을 빠르게 확인하고, 사람의 확인이 필요하면 1:1 문의로 이어집니다.
              </p>
            </div>
            <Link href="/mypage/inquiries" className="text-sm font-black text-zinc-600 underline decoration-zinc-300 underline-offset-4 hover:text-zinc-950">
              1:1 문의
            </Link>
          </header>
          {enabled ? (
            <AiSupportChat />
          ) : (
            <section className="rounded-[2rem] border border-zinc-200 bg-white px-6 py-16 text-center shadow-sm">
              <p className="text-2xl font-black tracking-tight">AI 상담 준비 중</p>
              <p className="mx-auto mt-3 max-w-lg break-keep text-sm font-medium leading-relaxed text-zinc-500">
                안전성과 답변 품질을 확인한 뒤 열 예정입니다. 지금은 1:1 문의를 남겨 주세요.
              </p>
              <Link href="/mypage/inquiries" className="mt-6 inline-flex rounded-full bg-zinc-950 px-5 py-3 text-sm font-black text-white">
                1:1 문의
              </Link>
            </section>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
