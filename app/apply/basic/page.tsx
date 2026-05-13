import type { Metadata } from "next";

import PaidApplyPage from "../_components/PaidApplyPage";

export const metadata: Metadata = {
  title: "테이블씬 베이직 신청 | TableScene",
  description: "누구나 쉽고 빠르게 만드는 디지털 메뉴판 신청/결제 페이지입니다.",
};

export default function ApplyBasicPage() {
  return <PaidApplyPage serviceType="menu" />;
}
