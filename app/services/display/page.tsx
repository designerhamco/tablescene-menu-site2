import type { Metadata } from "next";

import {
  MarketingServicePage,
  MarketingShell,
} from "@/components/marketing/MarketingPages";

export const metadata: Metadata = {
  title: "디스플레이 | 매장의 큰 화면을 위한 메뉴판 · 아티메뉴",
  description:
    "화면별 페이지와 이미지·영상, 가격 옵션과 할인으로 구성하는 아티메뉴 디스플레이. 신규 신청은 준비 중입니다.",
};

export default function DisplayServiceRoutePage() {
  return (
    <MarketingShell>
      <MarketingServicePage service="display" />
    </MarketingShell>
  );
}
