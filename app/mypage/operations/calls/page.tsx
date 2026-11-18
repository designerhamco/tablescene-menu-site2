import type { Metadata } from "next";
import AllMenuOperationsPage from "@/components/mypage/AllMenuOperationsPage";

export const metadata: Metadata = { title: "전체 메뉴판 호출관리 | 아티메뉴", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export const revalidate = 0;
export default function Page() {
  return <AllMenuOperationsPage feature="calls"/>;
}
