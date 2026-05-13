import type { Metadata } from "next";

import PaidApplyPage from "../_components/PaidApplyPage";

export const metadata: Metadata = {
  title: "테이블씬 디스플레이 신청 | TableScene",
  description: "매장 화면을 감각적인 디지털 메뉴보드로 운영하는 신청/결제 페이지입니다.",
};

export default function ApplyScreenPage() {
  return <PaidApplyPage serviceType="screen" />;
}
