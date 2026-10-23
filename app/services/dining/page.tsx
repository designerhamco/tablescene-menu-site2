import type { Metadata } from "next";
import {
  MarketingServicePage,
  MarketingShell,
} from "@/components/marketing/MarketingPages";
export const metadata: Metadata = {
  title: "스페셜 다이닝 플랜 | 아티메뉴",
  description:
    "사진과 코스, 상세 설명을 여러 페이지에 담는 다이닝 메뉴판입니다.",
};
export default function DiningPage() {
  return (
    <MarketingShell>
      <MarketingServicePage service="dining" />
    </MarketingShell>
  );
}
