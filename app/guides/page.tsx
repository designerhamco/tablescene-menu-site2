import type { Metadata } from "next";
import OfficialSiteNavbar from "@/components/layout/OfficialSiteNavbar";
import Footer from "@/app/components/layout/Footer";
import UsageGuidePage from "@/components/guides/UsageGuidePage";
import { normalizeGuidePlan } from "@/lib/usage-guides";

export const metadata: Metadata = {
  title: "사용가이드 | 아티메뉴",
  description:
    "베이직·다이닝·디스플레이의 화면 연결, 브라우저 전체 화면과 메뉴판 크기 조정 방법을 확인하세요.",
};
export default async function GuidesRoute({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string | string[] }>;
}) {
  const { plan } = await searchParams;
  return (
    <>
      <OfficialSiteNavbar />
      <main>
        <UsageGuidePage
          initialPlan={normalizeGuidePlan(
            typeof plan === "string" ? plan : undefined,
          )}
        />
      </main>
      <Footer />
    </>
  );
}
