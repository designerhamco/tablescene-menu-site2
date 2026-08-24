import type { Metadata } from "next";

import Footer from "@/app/components/layout/Footer";
import OrderServiceReviewContent from "@/app/components/services/OrderServiceReviewContent";
import OfficialSiteNavbar from "@/components/layout/OfficialSiteNavbar";

export const metadata: Metadata = {
  title: "아티메뉴 오더 1.0 | 준비 중",
  description: "QR로 주문하고 주방까지 연결되는 오더 시스템은 준비 중입니다.",
};

export default function OrderServicePage() {
  return (
    <>
      <OfficialSiteNavbar />
      <OrderServiceReviewContent />
      <Footer />
    </>
  );
}
