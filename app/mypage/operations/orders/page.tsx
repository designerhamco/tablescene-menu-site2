import type { Metadata } from "next";
import AllMenuOperationsPage from "@/components/mypage/AllMenuOperationsPage";
import type { OrderHistorySearch } from "@/lib/order-history-query";

export const metadata: Metadata = { title: "전체 메뉴판 주문관리 | 아티메뉴", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export const revalidate = 0;
export default async function Page({ searchParams }: { searchParams: Promise<OrderHistorySearch> }) {
  return <AllMenuOperationsPage feature="orders" search={await searchParams}/>;
}
