import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing/MarketingPages";
import SiteComponentGallery from "@/components/design-system/SiteComponentGallery";

export const metadata: Metadata = {
  title: "컴포넌트 라이브러리 | 아티메뉴",
  robots: { index: false, follow: false },
};
export default function DesignSystemPage() {
  return <MarketingShell><SiteComponentGallery /></MarketingShell>;
}
