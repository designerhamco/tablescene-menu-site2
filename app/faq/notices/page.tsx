import type { Metadata } from "next";
import Footer from "@/app/components/layout/Footer";
import OfficialSiteNavbar from "@/components/layout/OfficialSiteNavbar";
import SupportCenter from "@/components/support/SupportCenter";

export const metadata: Metadata = {
  title: "공지사항 | ArtiMenu 고객센터",
  description: "아티메뉴의 서비스 안내, 업데이트와 점검 소식을 확인하세요.",
};

export default function AnnouncementsPage() {
  return <>
    <OfficialSiteNavbar />
    <main className="min-h-screen bg-white text-zinc-950"><SupportCenter view="notices" /></main>
    <Footer />
  </>;
}
