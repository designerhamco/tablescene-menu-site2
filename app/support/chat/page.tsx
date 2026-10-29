import SitePageHeader from "@/components/layout/SitePageHeader";
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
      <main className="site-gutter site-page-spacing-compact min-h-screen bg-white text-zinc-950">
        <div className="mx-auto w-full max-w-4xl">
          <SitePageHeader title="AI 상담" description="아티메뉴 이용 방법을 빠르게 확인하고, 사람의 확인이 필요하면 1:1 문의로 이어집니다."><Link href="/mypage/inquiries" className="site-button site-button-link">1:1 문의</Link></SitePageHeader>
          {enabled ? (
            <AiSupportChat />
          ) : (
            <section className="site-section px-6 py-16 text-center">
              <p className="site-body-title">AI 상담 준비 중</p>
              <p className="site-body-support mx-auto mt-3 max-w-lg text-zinc-500">
                안전성과 답변 품질을 확인한 뒤 열 예정입니다. 지금은 1:1 문의를 남겨 주세요.
              </p>
              <Link href="/mypage/inquiries" className="site-button site-button-primary mt-6 inline-flex">
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
