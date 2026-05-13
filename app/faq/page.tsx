import type { Metadata } from "next";

import FAQ, { DETAILED_FAQ_DATA } from "@/app/components/common/FAQ";
import Footer from "@/app/components/layout/Footer";
import OfficialSiteNavbar from "@/components/layout/OfficialSiteNavbar";

export const metadata: Metadata = {
  title: "자주 묻는 질문 | TableScene",
  description: "테이블씬 이용 전 궁금할 수 있는 내용을 정리했습니다.",
};

export default function FAQPage() {
  return (
    <>
      <OfficialSiteNavbar />
      <main className="min-h-screen bg-white">
        <FAQ
          className="pt-16"
          data={DETAILED_FAQ_DATA}
          showSupport={false}
          showMoreLink={false}
          description="테이블씬 이용 전 궁금할 수 있는 내용을 정리했습니다. 서비스 이용 방식, 결제, AI 작성 도우미, 화면 연결 방법을 확인해보세요."
        />
      </main>
      <Footer />
    </>
  );
}
