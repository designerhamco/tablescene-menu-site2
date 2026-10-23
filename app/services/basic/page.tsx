import type { Metadata } from "next";
import {
  MarketingServicePage,
  MarketingShell,
} from "@/components/marketing/MarketingPages";

export const metadata: Metadata = {
  title: "베이직 | 매장의 매력을 한 화면에 · 아티메뉴",
  description:
    "대표 상품과 메뉴, 가격 옵션과 기간 할인을 매장에 어울리는 한 장의 디지털 메뉴판으로 구성하세요.",
};

export default function BasicServiceRoutePage() {
  return (
    <MarketingShell>
      <MarketingServicePage service="basic" />
    </MarketingShell>
  );
}
