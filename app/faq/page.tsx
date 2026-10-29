import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Footer from "@/app/components/layout/Footer";
import OfficialSiteNavbar from "@/components/layout/OfficialSiteNavbar";
import SupportCenter from "@/components/support/SupportCenter";
import { isAiSupportChatEnabled } from "@/lib/ai-support-chat";
import { SupportChatIcon } from "@/app/components/ui/support-chat-icon";
import AiSupportChatOpenButton from "../support/chat/AiSupportChatOpenButton";

export const metadata: Metadata = {
  title: "자주 묻는 질문 | ArtiMenu 고객센터",
  description:
    "아티메뉴 이용에 필요한 자주 묻는 질문과 답변을 찾아보세요.",
};

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
          supportActions={
            <div className="mt-5 flex flex-wrap justify-center gap-2">
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
