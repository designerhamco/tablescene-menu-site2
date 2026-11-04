import type { Metadata } from "next";
import OrderPointManagementPage from "@/components/mypage/OrderPointManagementPage";
export const metadata: Metadata = { title: "키오스크 관리 | 아티메뉴", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export const revalidate = 0;
export default function Page({ params }: { params: Promise<{ menuId: string }> }) {
  return <OrderPointManagementPage params={params} kind="kiosk" />;
}
