import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import LatestAnnouncements from "@/components/support/LatestAnnouncements";
import { getPublishedAnnouncements } from "@/lib/server/announcement-service";
import { BookOpen } from "lucide-react";
import Link from "next/link";
import Footer from "@/app/components/layout/Footer";
import OfficialSiteNavbar from "@/components/layout/OfficialSiteNavbar";
import SupportCenter from "@/components/support/SupportCenter";
import { isAiSupportChatEnabled } from "@/lib/ai-support-chat";
import { SupportChatIcon } from "@/app/components/ui/support-chat-icon";
import AiSupportChatOpenButton from "../support/chat/AiSupportChatOpenButton";

export const metadata: Metadata = {
  title: "고객센터 | ArtiMenu",
  description:
    "공지사항과 자주 묻는 질문을 검색하고, 아티메뉴 이용에 필요한 도움을 찾아보세요.",
};

async function RecentNotices() {
  const result = await getPublishedAnnouncements({ latest: true });
  return <LatestAnnouncements items={result.items} unavailable={result.unavailable} />;
}

export default async function FAQPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  if (tab === "notices") redirect("/faq/notices");
  const enabled = isAiSupportChatEnabled();
  return (
    <>
      <OfficialSiteNavbar />
      <main className="min-h-screen bg-white text-zinc-950">
        <SupportCenter
          latestNotices={<Suspense fallback={<LatestAnnouncements loading />}><RecentNotices /></Suspense>}
          supportActions={
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <Link href="/guides" className="site-button site-button-outline">
                <BookOpen size={18} aria-hidden="true" />
                사용가이드
              </Link>
              <AiSupportChatOpenButton className="site-button site-button-ai">
                <SupportChatIcon width={18} height={18} />
                AI 상담{!enabled ? " · 준비 중" : ""}
              </AiSupportChatOpenButton>
            </div>
          }
        />
      </main>
      <Footer />
    </>
  );
}
