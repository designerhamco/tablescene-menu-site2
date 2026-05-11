import type { Metadata } from "next";

import PaidApplyPage from "../_components/PaidApplyPage";

export const metadata: Metadata = {
  title: "테이블씬 오더 1.0 신청 | TableScene",
  description: "QR로 주문하고 주방까지 바로 연결되는 오더 시스템 신청/결제 페이지입니다.",
};

export default function ApplyOrderPage() {
  return <PaidApplyPage serviceType="order" />;
}
