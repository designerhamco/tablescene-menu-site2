import type { Metadata } from "next";
import SitePage from "@/components/layout/SitePage";
import AnnouncementBoard from "@/components/support/AnnouncementBoard";

export const metadata: Metadata = {
  title: "공지사항 | ArtiMenu 고객센터",
  description: "아티메뉴의 서비스 안내, 업데이트와 점검 소식을 확인하세요.",
};

export default function AnnouncementsPage() {
  return <SitePage title="공지사항" description="아티메뉴의 서비스 소식과 업데이트를 확인하세요."><AnnouncementBoard /></SitePage>;
}
